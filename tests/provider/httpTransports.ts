import type { HocuspocusProvider } from "@hocuspocus/provider";
import test, { type ExecutionContext } from "ava";
import * as Y from "yjs";
import {
	newHocuspocus,
	newHocuspocusProvider,
	newHttpProxy,
	sleep,
	waitForSynced,
} from "../utils/index.ts";
import { retryableAssertion } from "../utils/retryableAssertion.ts";

// Sends a stateless message and waits until the server has it. After that no
// POST of the handshake is left in flight: the provider sends one at a time.
const settle = async (
	t: ExecutionContext,
	provider: HocuspocusProvider,
	received: string[],
) => {
	provider.sendStateless("settled");
	await retryableAssertion(t, (tt) => tt.deepEqual(received, ["settled"]));
};

for (const transport of ["sse", "polling"] as const) {
	test(`${transport}: syncs changes in both directions`, async (t) => {
		const hocuspocus = await newHocuspocus(t, { httpFallback: true });
		const provider = newHocuspocusProvider(
			t,
			hocuspocus,
			{},
			{ transports: [transport] },
		);
		await waitForSynced(provider);
		t.is(provider.configuration.websocketProvider.transport, transport);

		provider.document.getArray("client").push(["from client"]);
		await retryableAssertion(t, (tt) =>
			tt.deepEqual(
				hocuspocus.documents
					.get("hocuspocus-test")
					?.getArray("client")
					.toJSON(),
				["from client"],
			),
		);

		const direct = await hocuspocus.openDirectConnection("hocuspocus-test");
		t.teardown(() => direct.disconnect());
		await direct.transact((document) =>
			document.getArray("server").push(["from server"]),
		);
		await retryableAssertion(t, (tt) =>
			tt.deepEqual(provider.document.getArray("server").toJSON(), [
				"from server",
			]),
		);
	});

	test(`${transport}: an authentication timeout reaches the provider as 4408`, async (t) => {
		const hocuspocus = await newHocuspocus(t, {
			httpFallback: true,
			authenticationTimeout: 300,
			onAuthenticate: () => new Promise(() => {}),
		});
		const codes: number[] = [];
		newHocuspocusProvider(
			t,
			hocuspocus,
			{
				onClose: ({ event }) => {
					codes.push(event.code);
				},
			},
			{ transports: [transport] },
		);

		await retryableAssertion(t, (tt) => tt.true(codes.includes(4408)));
	});

	test(`${transport}: a session without traffic stays open`, async (t) => {
		const hocuspocus = await newHocuspocus(t, {
			httpFallback: true,
			timeout: 1000,
		});
		let closed = false;
		const provider = newHocuspocusProvider(
			t,
			hocuspocus,
			{
				awareness: null,
				onClose: () => {
					closed = true;
				},
			},
			{
				transports: [transport],
				// What the provider gives a WebSocket to deliver a message. Without
				// awareness the server sends none; heartbeats are no messages.
				messageReconnectTimeout: 1000,
			},
		);
		await waitForSynced(provider);

		// More than twice the idle timeout of the server and the time the
		// provider waits for a message.
		await sleep(2500);

		t.true(provider.isSynced);
		t.false(closed);
	});

	test(`${transport}: a session whose requests go unanswered closes with 1006`, async (t) => {
		const hocuspocus = await newHocuspocus(t, {
			httpFallback: true,
			timeout: 1000,
		});
		const proxy = await newHttpProxy(t, hocuspocus);
		const codes: number[] = [];
		const provider = newHocuspocusProvider(
			t,
			hocuspocus,
			{
				awareness: null,
				onClose: ({ event }) => {
					codes.push(event.code);
				},
			},
			{ url: proxy.webSocketURL, transports: [transport], connectTimeout: 500 },
		);
		await waitForSynced(provider);

		// The connection breaks, and no request gets through any more. Only the
		// deadlines of the socket's requests can tell: there are no messages
		// to miss.
		proxy.holdDownstreams();

		await retryableAssertion(t, (tt) => tt.true(codes.includes(1006)));
	});

	test(`${transport}: a downstream response that gets lost is sent again`, async (t) => {
		let disconnects = 0;
		const hocuspocus = await newHocuspocus(t, {
			httpFallback: true,
			async onDisconnect() {
				disconnects += 1;
			},
		});
		const proxy = await newHttpProxy(t, hocuspocus);
		const received: string[] = [];
		let closed = false;
		const provider = newHocuspocusProvider(
			t,
			hocuspocus,
			{
				onStateless: ({ payload }) => {
					received.push(payload);
				},
				onClose: () => {
					closed = true;
				},
			},
			{ url: proxy.webSocketURL, transports: [transport] },
		);
		await waitForSynced(provider);
		const document = hocuspocus.documents.get("hocuspocus-test")!;

		// The connection breaks. The server writes the messages into the response
		// to the next request, which never arrives.
		proxy.loseNextResponse("downstream");
		proxy.cutDownstreams();
		document.broadcastStateless("first");
		document.broadcastStateless("second");

		await retryableAssertion(t, (tt) => tt.true(received.includes("second")));
		t.deepEqual(received, ["first", "second"]);
		t.false(closed);
		t.is(disconnects, 0);
	});

	test(`${transport}: a batch whose response gets lost is delivered once`, async (t) => {
		const received: string[] = [];
		const hocuspocus = await newHocuspocus(t, {
			httpFallback: true,
			async onStateless({ payload }) {
				received.push(payload);
			},
		});
		const proxy = await newHttpProxy(t, hocuspocus);
		const provider = newHocuspocusProvider(
			t,
			hocuspocus,
			{ awareness: null },
			{ url: proxy.webSocketURL, transports: [transport] },
		);
		await waitForSynced(provider);
		await settle(t, provider, received);

		// The next batch carries these two messages.
		proxy.loseNextResponse("batch");
		provider.sendStateless("first");
		provider.sendStateless("second");
		await retryableAssertion(t, (tt) => tt.true(received.includes("second")));

		// The server had the batch at the first go. The provider sends it again,
		// in the same session and under the same sequence number, and the
		// numbers still line up after.
		await retryableAssertion(t, (tt) => {
			const batches = proxy.requests.flatMap((request) => {
				const { searchParams } = new URL(
					request.split(" ")[1],
					"http://localhost",
				);
				const sequence = searchParams.get("hp_seq");
				return sequence === null
					? []
					: `${searchParams.get("hp_sid")} ${sequence}`;
			});
			tt.true(batches.length > new Set(batches).size);
		});

		provider.sendStateless("third");
		await retryableAssertion(t, (tt) => tt.true(received.includes("third")));
		t.deepEqual(received, ["settled", "first", "second", "third"]);
	});

	test(`${transport}: messages arrive in order, batched while a POST is in flight`, async (t) => {
		const received: string[] = [];
		const hocuspocus = await newHocuspocus(t, {
			httpFallback: true,
			async onStateless({ payload }) {
				received.push(payload);
			},
		});
		const proxy = await newHttpProxy(t, hocuspocus);
		const provider = newHocuspocusProvider(
			t,
			hocuspocus,
			{ awareness: null },
			{ url: proxy.webSocketURL, transports: [transport] },
		);
		await waitForSynced(provider);
		await settle(t, provider, received);
		const batches = () =>
			proxy.requests.filter((request) => request.includes("hp_seq=")).length;
		const batchesBefore = batches();
		// From here on a POST takes longer than sending all the messages below.
		proxy.delayBatches(300);

		const groups = 5;
		for (let group = 0; group < groups; group += 1) {
			for (let index = 0; index < 4; index += 1) {
				provider.sendStateless(String(group * 4 + index));
			}
			await sleep(10);
		}

		const expected = Array.from({ length: 20 }, (_, index) => String(index));
		await retryableAssertion(t, (tt) => tt.true(received.includes("19")));
		t.deepEqual(received, ["settled", ...expected]);
		// The groups that had to wait for the first POST left together.
		t.true(batches() - batchesBefore < groups);
	});

	test(`${transport}: a POST that takes longer than the idle timeout does not cost the session`, async (t) => {
		const received: string[] = [];
		const hocuspocus = await newHocuspocus(t, {
			httpFallback: true,
			timeout: 1000,
			async onStateless({ payload }) {
				received.push(payload);
			},
		});
		const proxy = await newHttpProxy(t, hocuspocus);
		const codes: number[] = [];
		const provider = newHocuspocusProvider(
			t,
			hocuspocus,
			{
				awareness: null,
				onClose: ({ event }) => {
					codes.push(event.code);
				},
			},
			{ url: proxy.webSocketURL, transports: [transport] },
		);
		await waitForSynced(provider);
		await settle(t, provider, received);
		const document = hocuspocus.documents.get("hocuspocus-test")!;

		// As if the upload took two and a half idle timeouts.
		proxy.delayBatches(2500);
		provider.sendStateless("slow");

		// Meanwhile the client receives messages, which it has to acknowledge.
		for (let elapsed = 0; elapsed < 3500; elapsed += 250) {
			document.broadcastStateless("tick");
			await sleep(250);
		}

		t.deepEqual(received, ["settled", "slow"]);
		t.deepEqual(codes, []);
	});

	test(`${transport}: disconnect() ends the session on the server at once`, async (t) => {
		let disconnects = 0;
		const hocuspocus = await newHocuspocus(t, {
			httpFallback: true,
			async onDisconnect() {
				disconnects += 1;
			},
		});
		const proxy = await newHttpProxy(t, hocuspocus);
		const provider = newHocuspocusProvider(
			t,
			hocuspocus,
			{},
			{ url: proxy.webSocketURL, transports: [transport] },
		);
		await waitForSynced(provider);

		provider.configuration.websocketProvider.disconnect();

		// Left to itself, the server would only notice at its idle timeout.
		await retryableAssertion(t, (tt) => tt.is(disconnects, 1));
		// It was the provider that told it.
		t.true(proxy.requests.some((request) => request.includes("hp_close=1")));
	});
}

test("sse: messages are split over POSTs of at most maxPayload, a message over it closes with 1009", async (t) => {
	const received: string[] = [];
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: { maxPayload: 1000 },
		async onStateless({ payload }) {
			received.push(payload);
		},
	});
	const codes: number[] = [];
	const provider = newHocuspocusProvider(
		t,
		hocuspocus,
		{
			awareness: null,
			onClose: ({ event }) => {
				codes.push(event.code);
			},
		},
		{ transports: ["sse"] },
	);
	await waitForSynced(provider);

	// Ten messages of about 300 bytes each do not fit into one body.
	const messages = Array.from({ length: 10 }, (_, index) =>
		String(index).repeat(200),
	);
	for (const message of messages) {
		provider.sendStateless(message);
	}
	await retryableAssertion(t, (tt) => tt.deepEqual(received, messages));
	t.deepEqual(codes, []);

	provider.sendStateless("x".repeat(2000));
	await retryableAssertion(t, (tt) => tt.true(codes.includes(1009)));
});

test("sse: an event stream that arrives a few bytes at a time is put together", async (t) => {
	const hocuspocus = await newHocuspocus(t, { httpFallback: true });
	const proxy = await newHttpProxy(t, hocuspocus, { eventStreams: "trickle" });
	// About two thousand pieces, with every line and event split somewhere.
	const text = "The quick brown fox jumps over the lazy dog. ".repeat(40);
	const direct = await hocuspocus.openDirectConnection("hocuspocus-test");
	t.teardown(() => direct.disconnect());
	await direct.transact((document) => document.getText("text").insert(0, text));

	const provider = newHocuspocusProvider(
		t,
		hocuspocus,
		{},
		{ url: proxy.webSocketURL, transports: ["sse"] },
	);
	await waitForSynced(provider);

	t.is(provider.document.getText("text").toString(), text);
});

test("polling: a server that stops serving the transports is not flooded with requests", async (t) => {
	const hocuspocus = await newHocuspocus(t, { httpFallback: true });
	const proxy = await newHttpProxy(t, hocuspocus);
	const codes: number[] = [];
	const provider = newHocuspocusProvider(
		t,
		hocuspocus,
		{
			awareness: null,
			onClose: ({ event }) => {
				codes.push(event.code);
			},
		},
		{ url: proxy.webSocketURL, transports: ["polling"], connectTimeout: 500 },
	);
	await waitForSynced(provider);

	// As if a deployment without `httpFallback` had taken over: every poll is
	// answered at once, with a greeting instead of messages.
	proxy.stopServingTransports();
	const requestsBefore = proxy.requests.length;

	await retryableAssertion(t, (tt) => tt.true(codes.includes(1006)));
	t.true(proxy.requests.length - requestsBefore < 30);
});

test("polling: the largest connectTimeout does not overflow the deadlines of the requests", async (t) => {
	const received: string[] = [];
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: true,
		async onStateless({ payload }) {
			received.push(payload);
		},
	});
	const proxy = await newHttpProxy(t, hocuspocus);
	const provider = newHocuspocusProvider(
		t,
		hocuspocus,
		{ awareness: null },
		{
			url: proxy.webSocketURL,
			transports: ["polling"],
			// The hold of a poll and the time for an upload come on top of it.
			connectTimeout: 2_147_483_647,
		},
	);
	await waitForSynced(provider);
	await settle(t, provider, received);

	// The server holds a poll, and the provider leaves it alone.
	await sleep(300);
	const polls = () =>
		proxy.requests.filter((request) => request.includes("hp_transport=polling"))
			.length;
	const before = polls();
	await sleep(1200);
	t.is(polls(), before);
});

test("sse: a read-only session receives changes and sends stateless messages, but cannot write", async (t) => {
	const received: string[] = [];
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: true,
		async onAuthenticate({ connectionConfig }) {
			connectionConfig.readOnly = true;
		},
		async onStateless({ payload }) {
			received.push(payload);
		},
	});
	const direct = await hocuspocus.openDirectConnection("hocuspocus-test");
	t.teardown(() => direct.disconnect());
	const provider = newHocuspocusProvider(
		t,
		hocuspocus,
		{},
		{ transports: ["sse"] },
	);
	await waitForSynced(provider);

	await direct.transact((document) =>
		document.getArray("server").push(["from server"]),
	);
	await retryableAssertion(t, (tt) =>
		tt.deepEqual(provider.document.getArray("server").toJSON(), [
			"from server",
		]),
	);

	// The stateless message is handled after the update sent before it.
	provider.document.getArray("client").push(["from client"]);
	provider.sendStateless("after write");
	await retryableAssertion(t, (tt) => tt.deepEqual(received, ["after write"]));
	t.deepEqual(direct.document?.getArray("client").toJSON(), []);
});

test("sse: a reconnect only transfers the difference", async (t) => {
	const hocuspocus = await newHocuspocus(t, { httpFallback: true });
	// Keeps the document loaded while the provider is away.
	const direct = await hocuspocus.openDirectConnection("hocuspocus-test");
	t.teardown(() => direct.disconnect());

	const provider = newHocuspocusProvider(
		t,
		hocuspocus,
		{},
		{ transports: ["sse"] },
	);
	const websocketProvider = provider.configuration.websocketProvider;
	await waitForSynced(provider);

	provider.document.getText("text").insert(0, "x".repeat(150_000));
	await retryableAssertion(t, (tt) =>
		tt.is(direct.document?.getText("text").length, 150_000),
	);

	websocketProvider.disconnect();
	await retryableAssertion(t, (tt) => tt.false(provider.isSynced));
	await direct.transact((document) => document.getText("text").insert(0, "y"));

	let received = 0;
	websocketProvider.on("message", (event: MessageEvent) => {
		received += (event.data as ArrayBuffer).byteLength;
	});
	websocketProvider.connect();

	await retryableAssertion(t, (tt) =>
		tt.is(provider.document.getText("text").toString().slice(0, 2), "yx"),
	);
	await waitForSynced(provider);

	const fullState = Y.encodeStateAsUpdate(direct.document as Y.Doc).length;
	t.true(fullState >= 100_000);
	t.true(
		received < fullState / 10,
		`received ${received} bytes of ${fullState}`,
	);
});
