import { randomUUID } from "node:crypto";
import net from "node:net";
import { writeAuthentication } from "@hocuspocus/common";
import { type Hocuspocus, HttpFallback } from "@hocuspocus/server";
import test from "ava";
import * as encoding from "lib0/encoding";
import {
	newHocuspocus,
	newHocuspocusProvider,
	sleep,
	waitForSynced,
} from "../utils/index.ts";
import { retryableAssertion } from "../utils/retryableAssertion.ts";

// Wire-level MessageType values (mirrors packages/server/src/types.ts).
const MessageType = {
	Auth: 2,
	Stateless: 5,
};

const authFrame = (documentName: string): Uint8Array => {
	const encoder = encoding.createEncoder();
	encoding.writeVarString(encoder, documentName);
	encoding.writeVarUint(encoder, MessageType.Auth);
	writeAuthentication(encoder, "token");
	return encoding.toUint8Array(encoder);
};

const statelessFrame = (documentName: string, payload: string): Uint8Array => {
	const encoder = encoding.createEncoder();
	encoding.writeVarString(encoder, documentName);
	encoding.writeVarUint(encoder, MessageType.Stateless);
	encoding.writeVarString(encoder, payload);
	return encoding.toUint8Array(encoder);
};

const base64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");

type Parameters = Record<string, string | number>;

interface RequestOptions {
	body?: string;
	headers?: Record<string, string>;
}

// Calls `HttpFallback.fetch` directly: it needs no HTTP server.
const call = (
	hocuspocus: Hocuspocus,
	method: string,
	parameters: Parameters,
	options: RequestOptions = {},
) => {
	const query = new URLSearchParams(
		Object.entries(parameters).map(([name, value]) => [name, String(value)]),
	);
	return hocuspocus.server!.httpFallback!.fetch(
		new Request(`http://hocuspocus.test/?${query}`, { method, ...options }),
	);
};

/**
 * Open a polling session and return what a test needs to drive it request
 * by request.
 */
const openSession = async (
	hocuspocus: Hocuspocus,
	open: { parameters?: Parameters; headers?: Record<string, string> } = {},
) => {
	const sessionId = randomUUID();
	const request = (
		method: string,
		parameters: Parameters,
		options?: RequestOptions,
	) => call(hocuspocus, method, { ...parameters, hp_sid: sessionId }, options);

	const response = await request(
		"GET",
		{ ...open.parameters, hp_transport: "polling" },
		{ headers: open.headers },
	);
	const text = await response.text();
	const openEvent = /event: hp-open\ndata: (.*)\n/.exec(text);
	if (!openEvent) {
		throw new Error(`No open event (${response.status}): ${text}`);
	}
	const key = JSON.parse(openEvent[1]).key as string;

	return {
		key,
		request,
		/** Deliver the batch with the given sequence number. */
		post: (sequence: number, messages: Uint8Array[]) =>
			request(
				"POST",
				{ hp_seq: sequence, hp_cursor: 0 },
				{ body: [key, ...messages.map(base64)].join("\n") },
			),
		/** Ask for the messages after `cursor`. */
		poll: (cursor: number) =>
			request(
				"POST",
				{ hp_transport: "polling", hp_cursor: cursor },
				{ body: key },
			),
		/** Acknowledge the messages up to `cursor`. */
		ping: (cursor: number) =>
			request("POST", { hp_cursor: cursor }, { body: key }),
	};
};

const messageIds = async (response: Response | Promise<Response>) =>
	[...(await (await response).text()).matchAll(/^id: (\d+)$/gm)].map((match) =>
		Number(match[1]),
	);

const statusOf = async (response: Promise<Response>) => (await response).status;

/**
 * Take what the handshake sends, until a poll ends with a mere heartbeat.
 * Returns the cursor after it.
 */
const settle = async (session: {
	poll: (cursor: number) => Promise<Response>;
}) => {
	let cursor = 0;
	while (true) {
		const ids = await messageIds(session.poll(cursor));
		if (ids.length === 0) {
			return cursor;
		}
		cursor = Math.max(...ids);
	}
};

test("a batch posted twice with the same hp_seq is processed once", async (t) => {
	const received: string[] = [];
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: true,
		async onStateless({ payload }) {
			received.push(payload);
		},
	});
	const session = await openSession(hocuspocus);
	const batch = [authFrame("batch-doc"), statelessFrame("batch-doc", "once")];

	t.is(await statusOf(session.post(1, batch)), 204);
	t.is(await statusOf(session.post(1, batch)), 204);
	// Messages are handled in order, so a second "once" would come before this.
	t.is(
		await statusOf(session.post(2, [statelessFrame("batch-doc", "after")])),
		204,
	);

	await retryableAssertion(t, (tt) =>
		tt.deepEqual(received, ["once", "after"]),
	);
});

test("messages are replayed until the client acknowledges them", async (t) => {
	const hocuspocus = await newHocuspocus(t, { httpFallback: true });
	const session = await openSession(hocuspocus);
	await session.post(1, [authFrame("replay-doc")]);

	const first = await messageIds(session.poll(0));
	t.true(first.length > 0);

	// As if that response got lost: the same request gets the messages again.
	const again = await messageIds(session.poll(0));
	t.deepEqual(again.slice(0, first.length), first);

	// Acknowledged messages are gone, so a late request for them is refused.
	t.is(await statusOf(session.ping(Math.max(...again))), 204);
	t.is(await statusOf(session.poll(0)), 409);
});

test("a session that stops sending requests times out with 4408", async (t) => {
	let disconnected = false;
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: true,
		timeout: 300,
		async onDisconnect() {
			disconnected = true;
		},
	});
	const session = await openSession(hocuspocus);
	await session.post(1, [authFrame("timeout-doc")]);

	await retryableAssertion(t, (tt) => tt.true(disconnected));

	const response = await session.poll(0);
	t.is(response.status, 410);
	t.is((await response.json()).code, 4408);
});

test("an event stream that is read but never answered times out with 4408", async (t) => {
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: true,
		timeout: 1000,
	});
	const sessionId = randomUUID();
	const reader = (
		await call(hocuspocus, "GET", { hp_transport: "sse", hp_sid: sessionId })
	).body!.getReader();
	const decoder = new TextDecoder();
	let text = decoder.decode((await reader.read()).value, { stream: true });
	const key = JSON.parse(/event: hp-open\ndata: (.*)\n/.exec(text)![1]).key;
	t.is(
		await statusOf(
			call(
				hocuspocus,
				"POST",
				{ hp_sid: sessionId, hp_seq: 1, hp_cursor: 0 },
				{ body: [key, base64(authFrame("silent-doc"))].join("\n") },
			),
		),
		204,
	);

	// Like a socket whose peer is gone: whatever is written is taken, nothing
	// is answered. Taking heartbeats does not keep the session alive.
	const deadline = Date.now() + 5000;
	while (!text.includes("event: hp-close") && Date.now() < deadline) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}
		text += decoder.decode(value, { stream: true });
	}
	t.regex(text, /event: hp-close\ndata: \{"code":4408,/);
});

test("a client that stays alive but acknowledges nothing is closed with 4408", async (t) => {
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: true,
		timeout: 1000,
	});
	const session = await openSession(hocuspocus);
	await session.post(1, [authFrame("unacknowledged-doc")]);
	// The messages of the handshake are written, and stay unacknowledged.
	t.true((await messageIds(session.poll(0))).length > 0);

	// Its requests keep the session alive for longer than a message may wait.
	for (let round = 0; round < 6; round += 1) {
		await sleep(250);
		t.is(await statusOf(session.ping(0)), 204);
	}

	// The next message finds the first ones still waiting.
	hocuspocus.documents
		.get("unacknowledged-doc")!
		.broadcastStateless("one more");

	const response = await session.ping(0);
	t.is(response.status, 410);
	t.is((await response.json()).code, 4408);
});

test("a message that takes longer than the timeout to download does not cost the session", async (t) => {
	const hocuspocus = await newHocuspocus(t, {
		// What arrives during the download outgrows `maxPayload`, but not the
		// message on its way: the client does not fall behind.
		httpFallback: { maxPayload: 200 },
		timeout: 1000,
	});
	const session = await openSession(hocuspocus);
	await session.post(1, [authFrame("slow-doc")]);

	const cursor = await settle(session);
	const document = hocuspocus.documents.get("slow-doc")!;

	// About 2 MB of base64: 31 slices of 64 KiB.
	document.broadcastStateless("x".repeat(1_500_000));
	const response = await session.poll(cursor);
	t.is(response.status, 200);

	// Read it over about three seconds, while messages keep arriving.
	const reader = response.body!.getReader();
	const decoder = new TextDecoder();
	let text = "";
	let ticks = 0;
	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}
		text += decoder.decode(value, { stream: true });
		document.broadcastStateless(`tick ${ticks}`);
		ticks += 1;
		await sleep(100);
	}
	text += decoder.decode();

	const ids = [...text.matchAll(/^id: (\d+)$/gm)].map((match) =>
		Number(match[1]),
	);
	t.is(ids.length, 1);
	t.true(text.length > 1_500_000);
	// The slow download was not held against the session.
	t.is(await statusOf(session.ping(ids[0])), 204);
	// The messages that arrived meanwhile come with the next poll.
	t.is((await messageIds(session.poll(ids[0]))).length, ticks);
});

test("acknowledgements that lag behind steady traffic do not cost the session", async (t) => {
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: true,
		timeout: 1000,
	});
	const session = await openSession(hocuspocus);
	await session.post(1, [authFrame("lagging-doc")]);
	let cursor = await settle(session);
	const document = hocuspocus.documents.get("lagging-doc")!;

	// Every poll acknowledges all but the last message the previous one
	// carried. For longer than the timeout, a delivered message is always
	// waiting, but no single one for long.
	for (let round = 0; round < 25; round += 1) {
		document.broadcastStateless(`round ${round}`);
		const ids = await messageIds(session.poll(cursor));
		t.true(ids.length > 0, `round ${round}`);
		cursor = Math.max(...ids) - 1;
		await sleep(100);
	}

	t.is(await statusOf(session.ping(cursor + 1)), 204);
});

test("a client that stays alive but takes nothing while a message waits is closed with 4408", async (t) => {
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: true,
		timeout: 1000,
	});
	const session = await openSession(hocuspocus);
	await session.post(1, [authFrame("stalled-doc")]);
	const cursor = await settle(session);
	const document = hocuspocus.documents.get("stalled-doc")!;

	// A poll whose response the client does not read.
	document.broadcastStateless("never taken");
	t.is((await session.poll(cursor)).status, 200);

	// Its requests keep the session alive for longer than a message may wait.
	for (let round = 0; round < 6; round += 1) {
		await sleep(250);
		t.is(await statusOf(session.ping(cursor)), 204);
	}

	// The next message finds the first one still waiting to be taken.
	document.broadcastStateless("one more");

	const response = await session.ping(cursor);
	t.is(response.status, 410);
	t.is((await response.json()).code, 4408);
});

test("a client that reads slower than its document changes is closed with 4408", async (t) => {
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: { maxPayload: 1000 },
		timeout: 1000,
	});
	const session = await openSession(hocuspocus);
	await session.post(1, [authFrame("behind-doc")]);
	const cursor = await settle(session);
	const document = hocuspocus.documents.get("behind-doc")!;

	// Seven slices, one taken every 400 ms. Meanwhile the document produces
	// more than the client takes.
	document.broadcastStateless("x".repeat(300_000));
	const reader = (await session.poll(cursor)).body!.getReader();
	const decoder = new TextDecoder();
	let text = "";
	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}
		text += decoder.decode(value, { stream: true });
		document.broadcastStateless("y".repeat(100_000));
		// Alive, and acknowledging what it has: only the backlog grows.
		await session.ping(cursor);
		await sleep(400);
	}

	t.regex(text, /\n\nevent: hp-close\ndata: \{"code":4408,[^\n]*\n\n$/);
});

test("a session that closes while a long text is on its way sends the close event after it", async (t) => {
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: true,
		timeout: 1000,
	});
	const session = await openSession(hocuspocus);
	await session.post(1, [authFrame("closing-doc")]);
	const cursor = await settle(session);
	const payload = "x".repeat(1_000_000);
	hocuspocus.documents.get("closing-doc")!.broadcastStateless(payload);

	// The server shuts down after the client took the first slice.
	const reader = (await session.poll(cursor)).body!.getReader();
	const decoder = new TextDecoder();
	let text = decoder.decode((await reader.read()).value, { stream: true });
	hocuspocus.server!.httpFallback!.destroy();

	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}
		text += decoder.decode(value, { stream: true });
	}
	t.is(
		text,
		`id: ${cursor + 1}\ndata: ${base64(statelessFrame("closing-doc", payload))}\n\n` +
			`event: hp-close\ndata: {"code":1001,"reason":"Going Away"}\n\n`,
	);
});

test("a long message reaches a reader that waits for it whole", async (t) => {
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: true,
		timeout: 1000,
	});
	const session = await openSession(hocuspocus);
	await session.post(1, [authFrame("whole-doc")]);
	const cursor = await settle(session);

	// The poll is held and its reader waits, so every slice is taken as soon
	// as it is written.
	const body = session.poll(cursor).then((response) => response.text());
	await sleep(100);
	const payload = "x".repeat(200_000);
	hocuspocus.documents.get("whole-doc")!.broadcastStateless(payload);

	t.is(
		await body,
		`id: ${cursor + 1}\ndata: ${base64(statelessFrame("whole-doc", payload))}\n\n`,
	);
});

test("hooks see the open request's parameters and cookies, without transport parameters", async (t) => {
	let parameters: URLSearchParams | undefined;
	let cookie: string | null | undefined;
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: true,
		async onConnect({ requestParameters, requestHeaders }) {
			parameters = requestParameters;
			cookie = requestHeaders.get("cookie");
		},
	});
	const session = await openSession(hocuspocus, {
		parameters: { token: "abc" },
		headers: { cookie: "session=xyz" },
	});
	await session.post(1, [authFrame("hook-doc")]);

	await retryableAssertion(t, (tt) => tt.truthy(parameters));
	t.deepEqual([...(parameters?.entries() ?? [])], [["token", "abc"]]);
	t.is(cookie, "session=xyz");
});

test("a second open for a live session id gets 409 and leaves the session working", async (t) => {
	const hocuspocus = await newHocuspocus(t, { httpFallback: true });
	const session = await openSession(hocuspocus);

	t.is(
		await statusOf(session.request("GET", { hp_transport: "polling" })),
		409,
	);

	await session.post(1, [authFrame("conflict-doc")]);
	t.true((await messageIds(session.poll(0))).length > 0);
});

test("origins outside allowedOrigins are refused before a session is created", async (t) => {
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: { allowedOrigins: ["https://app.example"] },
	});
	const open = { hp_transport: "polling", hp_sid: randomUUID() };

	const foreign = await call(hocuspocus, "GET", open, {
		headers: { origin: "https://evil.example" },
	});
	t.is(foreign.status, 403);
	t.is(foreign.headers.get("access-control-allow-origin"), null);

	// A cross-site navigation or no-cors request: cookies, but no Origin.
	const crossSite = await call(hocuspocus, "GET", open, {
		headers: { "sec-fetch-site": "cross-site" },
	});
	t.is(crossSite.status, 403);

	// The session id is still free.
	const allowed = await call(hocuspocus, "GET", open, {
		headers: { origin: "https://app.example" },
	});
	t.is(allowed.status, 200);
	t.is(
		allowed.headers.get("access-control-allow-origin"),
		"https://app.example",
	);
	await allowed.text();
});

test("an invalid configuration is rejected", async (t) => {
	const hocuspocus = await newHocuspocus(t, { httpFallback: true });

	const invalid: [object, RegExp][] = [
		[{ allowCredentials: true }, /allowCredentials/],
		// A string would turn the origin check into a substring match.
		[{ allowedOrigins: "https://app.example" }, /allowedOrigins/],
		[{ allowedOrigins: [] }, /allowedOrigins/],
		[{ allowedOrigins: ["https://app.example/"] }, /allowedOrigins/],
		[{ heartbeatInterval: 10 }, /heartbeatInterval/],
		[{ maxPayload: 0 }, /maxPayload/],
		[{ maxSessions: 1.5 }, /maxSessions/],
	];
	for (const [configuration, message] of invalid) {
		t.throws(() => new HttpFallback(hocuspocus, configuration), { message });
	}
});

test("a POST without the session key gets 404 and neither authenticates nor keeps the session alive", async (t) => {
	let authentications = 0;
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: true,
		timeout: 300,
		async onAuthenticate() {
			authentications += 1;
		},
	});
	const session = await openSession(hocuspocus);
	await session.post(1, [authFrame("key-doc")]);
	await retryableAssertion(t, (tt) => tt.is(authentications, 1));

	// Same length as the key, so the comparison itself decides.
	const wrongKey = "0".repeat(session.key.length);
	for (let round = 0; round < 8; round += 1) {
		t.is(
			await statusOf(
				session.request(
					"POST",
					{ hp_seq: 2, hp_cursor: 0 },
					{ body: `${wrongKey}\n${base64(authFrame("other-doc"))}` },
				),
			),
			404,
		);
		t.is(await statusOf(session.request("POST", { hp_cursor: 0 })), 404);

		await sleep(100);
	}

	t.is(authentications, 1);
	const response = await session.poll(0);
	t.is(response.status, 410);
	t.is((await response.json()).code, 4408);
});

test("at maxSessions a new session replaces the oldest one that has not authenticated", async (t) => {
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: { maxSessions: 2 },
	});
	const first = await openSession(hocuspocus);
	const second = await openSession(hocuspocus);
	const third = await openSession(hocuspocus);

	const evicted = await first.ping(0);
	t.is(evicted.status, 410);
	t.is((await evicted.json()).code, 4205);

	t.is(await statusOf(second.ping(0)), 204);
	t.is(await statusOf(third.ping(0)), 204);
});

test("at maxSessions a new session is refused when every session has authenticated", async (t) => {
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: { maxSessions: 2 },
	});
	for (const documentName of ["full-doc-1", "full-doc-2"]) {
		const session = await openSession(hocuspocus);
		await session.post(1, [authFrame(documentName)]);
		// The first message a session receives says that it has authenticated.
		t.true((await messageIds(session.poll(0))).length > 0);
	}

	t.is(
		await statusOf(
			call(hocuspocus, "GET", {
				hp_transport: "polling",
				hp_sid: randomUUID(),
			}),
		),
		503,
	);
});

test("requests that break the protocol are refused and nothing of them is processed", async (t) => {
	const received: string[] = [];
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: { maxPayload: 1000 },
		async onStateless({ payload }) {
			received.push(payload);
		},
	});
	const session = await openSession(hocuspocus);
	const { key } = session;
	await session.post(1, [authFrame("rules-doc")]);
	const message = base64(statelessFrame("rules-doc", "refused"));

	const refused: [string, Promise<Response>, number][] = [
		["a method other than GET and POST", session.request("PUT", {}), 405],
		[
			"a malformed session id",
			call(hocuspocus, "POST", { hp_sid: "short" }, { body: key }),
			400,
		],
		[
			"an unknown session",
			call(hocuspocus, "POST", { hp_sid: randomUUID() }, { body: key }),
			404,
		],
		[
			"an open that carries a cursor",
			call(hocuspocus, "GET", {
				hp_transport: "polling",
				hp_sid: randomUUID(),
				hp_cursor: 0,
			}),
			400,
		],
		[
			"an open for an unknown transport",
			call(hocuspocus, "GET", {
				hp_transport: "websocket",
				hp_sid: randomUUID(),
			}),
			400,
		],
		["a cursor the session has not reached", session.ping(999), 400],
		[
			"a cursor that is not an integer",
			session.request("POST", { hp_cursor: "1e3" }, { body: key }),
			400,
		],
		[
			"a batch after a missing one",
			session.request(
				"POST",
				{ hp_seq: 3, hp_cursor: 0 },
				{ body: `${key}\n${message}` },
			),
			400,
		],
		[
			"a batch with the sequence number 0",
			session.request(
				"POST",
				{ hp_seq: 0, hp_cursor: 0 },
				{ body: `${key}\n${message}` },
			),
			400,
		],
		[
			"messages without a sequence number",
			session.request("POST", { hp_cursor: 0 }, { body: `${key}\n${message}` }),
			400,
		],
		[
			"a batch with a message that is not base64",
			session.request(
				"POST",
				{ hp_seq: 2, hp_cursor: 0 },
				{ body: `${key}\n${message}\nnot base64!` },
			),
			400,
		],
		[
			"a body over maxPayload",
			session.request(
				"POST",
				{ hp_seq: 2, hp_cursor: 0 },
				{ body: `${key}\n${"A".repeat(1000)}` },
			),
			413,
		],
		[
			"a downstream request that carries messages",
			session.request(
				"POST",
				{ hp_transport: "polling", hp_cursor: 0 },
				{ body: `${key}\n${message}` },
			),
			400,
		],
		[
			"a downstream request without a cursor",
			session.request("POST", { hp_transport: "polling" }, { body: key }),
			400,
		],
	];
	for (const [title, response, status] of refused) {
		t.is((await response).status, status, title);
	}

	// The sequence number 2 is still free, and nothing above was processed.
	t.is(
		await statusOf(session.post(2, [statelessFrame("rules-doc", "accepted")])),
		204,
	);
	await retryableAssertion(t, (tt) => tt.deepEqual(received, ["accepted"]));
});

test("a session the client closes is gone at once", async (t) => {
	let disconnects = 0;
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: true,
		async onDisconnect() {
			disconnects += 1;
		},
	});
	const session = await openSession(hocuspocus);
	await session.post(1, [authFrame("close-doc")]);
	t.true((await messageIds(session.poll(0))).length > 0);

	t.is(
		await statusOf(
			session.request("POST", { hp_close: 1 }, { body: session.key }),
		),
		204,
	);

	await retryableAssertion(t, (tt) => tt.is(disconnects, 1));
	t.is(await statusOf(session.poll(0)), 404);
});

test("destroy() ends event streams with 1001 and refuses further requests", async (t) => {
	const hocuspocus = await newHocuspocus(t, { httpFallback: true });
	const open = () =>
		call(hocuspocus, "GET", { hp_transport: "sse", hp_sid: randomUUID() });
	const decoder = new TextDecoder();

	const reader = (await open()).body!.getReader();
	t.regex(decoder.decode((await reader.read()).value), /event: hp-open\n/);

	hocuspocus.server!.httpFallback!.destroy();

	t.regex(
		decoder.decode((await reader.read()).value),
		/event: hp-close\ndata: \{"code":1001,"reason":"Going Away"\}\n\n$/,
	);
	t.true((await reader.read()).done);
	t.is(await statusOf(open()), 503);
});

test("a request without hp_sid is left to the server, whatever its URL", async (t) => {
	const hocuspocus = await newHocuspocus(t, { httpFallback: true });

	// A path-only URL that contains "://" must not be mistaken for a full URL.
	const response = await fetch(
		`${hocuspocus.server!.httpURL}/?next=https://example.com`,
	);
	t.is(await response.text(), "Welcome to Hocuspocus!");
});

test("a transport request with a malformed Host header gets 400", async (t) => {
	const hocuspocus = await newHocuspocus(t, { httpFallback: true });
	const { port } = hocuspocus.server!.address;

	const response = await new Promise<string>((resolve, reject) => {
		const socket = net.connect(port, "127.0.0.1", () =>
			socket.write(
				`GET /?hp_transport=sse&hp_sid=${randomUUID()} HTTP/1.1\r\nHost: a b\r\nConnection: close\r\n\r\n`,
			),
		);
		let text = "";
		socket.setEncoding("utf8");
		socket.setTimeout(5000, () => socket.destroy(new Error("No response")));
		socket.on("data", (chunk) => {
			text += chunk;
		});
		socket.on("end", () => resolve(text));
		socket.on("error", reject);
	});
	t.regex(response, /^HTTP\/1\.1 400/);

	// The server is still there.
	const next = await fetch(`http://127.0.0.1:${port}/`);
	t.is(await next.text(), "Welcome to Hocuspocus!");
});

test("onRequest runs for the request that opens a session, not for its POSTs", async (t) => {
	const requests: string[] = [];
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: true,
		async onRequest({ request }) {
			requests.push(`${request.method} ${request.url}`);
		},
	});

	const provider = newHocuspocusProvider(
		t,
		hocuspocus,
		{},
		{ transports: ["sse"] },
	);
	await waitForSynced(provider);

	t.is(requests.length, 1);
	t.regex(requests[0], /^GET .*hp_transport=sse/);
});

test("an onRequest hook that rejects leaves no session", async (t) => {
	let refuse = true;
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: true,
		async onRequest({ response }) {
			if (!refuse) {
				return;
			}
			refuse = false;
			response.writeHead(403);
			response.end();
			return Promise.reject();
		},
	});
	const url = `${hocuspocus.server!.httpURL}/?hp_transport=polling&hp_sid=${randomUUID()}`;

	const refused = await fetch(url);
	t.is(refused.status, 403);
	await refused.text();

	// Had the refused request opened a session, its id would be taken (409).
	const opened = await fetch(url);
	t.is(opened.status, 200);
	await opened.text();
});
