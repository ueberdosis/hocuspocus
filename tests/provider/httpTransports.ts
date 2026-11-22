import {
	type HocuspocusProviderConfiguration,
	HocuspocusProviderWebsocket,
} from "@hocuspocus/provider";
import type { Hocuspocus } from "@hocuspocus/server";
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

const transports = ["sse", "polling"] as const;

type Transport = (typeof transports)[number];

// A provider that connects through the given URL, e.g. a proxy's.
const newProviderVia = (
	t: ExecutionContext,
	hocuspocus: Hocuspocus,
	url: string,
	transport: Transport,
	options: Partial<HocuspocusProviderConfiguration> = {},
) => {
	const websocketProvider = new HocuspocusProviderWebsocket({
		url,
		transports: [transport],
	});
	t.teardown(() => websocketProvider.destroy());

	return newHocuspocusProvider(t, hocuspocus, options, {}, websocketProvider);
};

for (const transport of transports) {
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
				hocuspocus.documents.get("hocuspocus-test")?.getArray("client").toJSON(),
				["from client"],
			),
		);

		const direct = await hocuspocus.openDirectConnection("hocuspocus-test");
		await direct.transact((document) =>
			document.getArray("server").push(["from server"]),
		);
		await retryableAssertion(t, (tt) =>
			tt.deepEqual(provider.document.getArray("server").toJSON(), [
				"from server",
			]),
		);
		await direct.disconnect();
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
			timeout: 500,
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
			{ transports: [transport] },
		);
		await waitForSynced(provider);

		await sleep(1500);

		t.true(provider.isSynced);
		t.false(closed);
	});

	test(`${transport}: a cut downstream resumes without losing messages`, async (t) => {
		let disconnects = 0;
		const hocuspocus = await newHocuspocus(t, {
			httpFallback: true,
			async onDisconnect() {
				disconnects += 1;
			},
		});
		const proxy = await newHttpProxy(t, hocuspocus);
		let closed = false;
		const provider = newProviderVia(
			t,
			hocuspocus,
			proxy.webSocketURL,
			transport,
			{
				onClose: () => {
					closed = true;
				},
			},
		);
		await waitForSynced(provider);
		const direct = await hocuspocus.openDirectConnection("hocuspocus-test");

		proxy.holdDownstreams();
		await direct.transact((document) =>
			document.getArray("held").push(["change"]),
		);
		await sleep(300);
		proxy.releaseDownstreams();

		await retryableAssertion(t, (tt) =>
			tt.deepEqual(provider.document.getArray("held").toJSON(), ["change"]),
		);
		t.false(closed);
		t.is(disconnects, 0);
		await direct.disconnect();
	});

	test(`${transport}: messages arrive once and in order while POSTs are slow`, async (t) => {
		const received: string[] = [];
		const hocuspocus = await newHocuspocus(t, {
			httpFallback: true,
			async onStateless({ payload }) {
				received.push(payload);
			},
		});
		const proxy = await newHttpProxy(t, hocuspocus, { postDelay: 100 });
		const provider = newProviderVia(t, hocuspocus, proxy.webSocketURL, transport);
		await waitForSynced(provider);

		for (let group = 0; group < 5; group += 1) {
			for (let index = 0; index < 4; index += 1) {
				provider.sendStateless(String(group * 4 + index));
			}
			await sleep(30);
		}

		const expected = Array.from({ length: 20 }, (_, index) => String(index));
		await retryableAssertion(t, (tt) => tt.deepEqual(received, expected));
		await sleep(300);
		t.deepEqual(received, expected);
	});
}

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
	const provider = newHocuspocusProvider(t, hocuspocus, {}, { transports: ["sse"] });
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

	await direct.disconnect();
});

test("sse: a reconnect only transfers the difference", async (t) => {
	const hocuspocus = await newHocuspocus(t, { httpFallback: true });
	// Keeps the document loaded while the provider is away.
	const direct = await hocuspocus.openDirectConnection("hocuspocus-test");
	t.teardown(() => direct.disconnect());

	const provider = newHocuspocusProvider(t, hocuspocus, {}, { transports: ["sse"] });
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
