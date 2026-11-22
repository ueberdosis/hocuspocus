import { randomUUID } from "node:crypto";
import net from "node:net";
import { writeAuthentication } from "@hocuspocus/common";
import { HttpFallback } from "@hocuspocus/server";
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

const buildAuthFrame = (documentName: string, token: string): Uint8Array => {
	const encoder = encoding.createEncoder();
	encoding.writeVarString(encoder, documentName);
	encoding.writeVarUint(encoder, MessageType.Auth);
	writeAuthentication(encoder, token);
	return encoding.toUint8Array(encoder);
};

const buildStatelessFrame = (
	documentName: string,
	payload: string,
): Uint8Array => {
	const encoder = encoding.createEncoder();
	encoding.writeVarString(encoder, documentName);
	encoding.writeVarUint(encoder, MessageType.Stateless);
	encoding.writeVarString(encoder, payload);
	return encoding.toUint8Array(encoder);
};

const base64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");

const call = (
	fallback: HttpFallback,
	method: "GET" | "POST",
	parameters: Record<string, string>,
	body?: string,
	headers?: Record<string, string>,
) =>
	fallback.fetch(
		new Request(`http://hocuspocus.test/?${new URLSearchParams(parameters)}`, {
			method,
			body,
			headers,
		}),
	);

const openPolling = async (
	fallback: HttpFallback,
	sessionId: string,
	parameters: Record<string, string> = {},
	headers?: Record<string, string>,
) => {
	const response = await call(
		fallback,
		"GET",
		{ ...parameters, hp_transport: "polling", hp_sid: sessionId },
		undefined,
		headers,
	);
	const text = await response.text();
	const open = /event: hp-open\ndata: (.*)\n/.exec(text);
	if (!open) {
		throw new Error(`No open event (${response.status}): ${text}`);
	}
	return JSON.parse(open[1]).key as string;
};

const postMessages = (
	fallback: HttpFallback,
	sessionId: string,
	key: string,
	sequence: number,
	messages: Uint8Array[],
) =>
	call(
		fallback,
		"POST",
		{ hp_sid: sessionId, hp_seq: String(sequence), hp_cursor: "0" },
		[key, ...messages.map(base64)].join("\n"),
	);

const poll = (
	fallback: HttpFallback,
	sessionId: string,
	key: string,
	cursor: number,
) =>
	call(
		fallback,
		"POST",
		{ hp_transport: "polling", hp_sid: sessionId, hp_cursor: String(cursor) },
		key,
	);

const messageIds = (text: string) =>
	[...text.matchAll(/^id: (\d+)$/gm)].map((match) => Number(match[1]));

test("a batch posted twice with the same hp_seq is processed once", async (t) => {
	let calls = 0;
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: true,
		async onStateless() {
			calls += 1;
		},
	});
	const fallback = hocuspocus.server!.httpFallback!;
	const sessionId = randomUUID();
	const key = await openPolling(fallback, sessionId);
	const batch = [
		buildAuthFrame("batch-doc", "token"),
		buildStatelessFrame("batch-doc", "hello"),
	];

	t.is((await postMessages(fallback, sessionId, key, 1, batch)).status, 204);
	t.is((await postMessages(fallback, sessionId, key, 1, batch)).status, 204);

	await retryableAssertion(t, (tt) => tt.is(calls, 1));
	await sleep(200);
	t.is(calls, 1);
});

test("a repeated poll replays unacknowledged messages, an acknowledged one does not", async (t) => {
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: { heartbeatInterval: 1000 },
	});
	const fallback = hocuspocus.server!.httpFallback!;
	const sessionId = randomUUID();
	const key = await openPolling(fallback, sessionId);
	await postMessages(fallback, sessionId, key, 1, [
		buildAuthFrame("replay-doc", "token"),
	]);

	const first = messageIds(await (await poll(fallback, sessionId, key, 0)).text());
	t.true(first.length > 0);

	const again = messageIds(await (await poll(fallback, sessionId, key, 0)).text());
	t.deepEqual(again.slice(0, first.length), first);

	const last = Math.max(...again);
	const after = messageIds(
		await (await poll(fallback, sessionId, key, last)).text(),
	);
	t.true(after.every((id) => id > last));
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
	const fallback = hocuspocus.server!.httpFallback!;
	const sessionId = randomUUID();
	const key = await openPolling(fallback, sessionId);
	await postMessages(fallback, sessionId, key, 1, [
		buildAuthFrame("timeout-doc", "token"),
	]);

	await retryableAssertion(t, (tt) => tt.true(disconnected));

	const response = await poll(fallback, sessionId, key, 0);
	t.is(response.status, 410);
	t.is((await response.json()).code, 4408);
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
	const fallback = hocuspocus.server!.httpFallback!;
	const sessionId = randomUUID();
	const key = await openPolling(
		fallback,
		sessionId,
		{ token: "abc" },
		{ cookie: "session=xyz" },
	);
	await postMessages(fallback, sessionId, key, 1, [
		buildAuthFrame("hook-doc", "token"),
	]);

	await retryableAssertion(t, (tt) => tt.truthy(parameters));
	t.is(parameters?.get("token"), "abc");
	t.deepEqual(
		[...(parameters?.keys() ?? [])].filter((name) => name.startsWith("hp_")),
		[],
	);
	t.is(cookie, "session=xyz");
});

test("a second open for a live session id gets 409 and leaves the session working", async (t) => {
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: { heartbeatInterval: 1000 },
	});
	const fallback = hocuspocus.server!.httpFallback!;
	const sessionId = randomUUID();
	const key = await openPolling(fallback, sessionId);

	const second = await call(fallback, "GET", {
		hp_transport: "polling",
		hp_sid: sessionId,
	});
	t.is(second.status, 409);

	await postMessages(fallback, sessionId, key, 1, [
		buildAuthFrame("conflict-doc", "token"),
	]);
	const response = await poll(fallback, sessionId, key, 0);
	t.is(response.status, 200);
	t.true(messageIds(await response.text()).length > 0);
});

test("origins outside allowedOrigins are refused before a session is created", async (t) => {
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: { allowedOrigins: ["https://app.example"] },
	});
	const fallback = hocuspocus.server!.httpFallback!;
	const sessionId = randomUUID();
	const open = { hp_transport: "polling", hp_sid: sessionId };

	const foreign = await call(fallback, "GET", open, undefined, {
		origin: "https://evil.example",
	});
	t.is(foreign.status, 403);
	t.is(foreign.headers.get("access-control-allow-origin"), null);

	const crossSite = await call(fallback, "GET", open, undefined, {
		"sec-fetch-site": "cross-site",
	});
	t.is(crossSite.status, 403);

	const allowed = await call(fallback, "GET", open, undefined, {
		origin: "https://app.example",
	});
	t.is(allowed.status, 200);
	t.is(
		allowed.headers.get("access-control-allow-origin"),
		"https://app.example",
	);
	await allowed.text();

	t.throws(() => new HttpFallback(hocuspocus, { allowCredentials: true }), {
		message: /allowCredentials/,
	});
	t.throws(
		() =>
			new HttpFallback(hocuspocus, {
				allowedOrigins: "https://app.example" as unknown as string[],
			}),
		{ message: /allowedOrigins/ },
	);
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
	const fallback = hocuspocus.server!.httpFallback!;
	const sessionId = randomUUID();
	const key = await openPolling(fallback, sessionId);
	await postMessages(fallback, sessionId, key, 1, [
		buildAuthFrame("key-doc", "token"),
	]);
	await retryableAssertion(t, (tt) => tt.is(authentications, 1));

	for (let round = 0; round < 8; round += 1) {
		const wrongKey = await postMessages(
			fallback,
			sessionId,
			"0".repeat(key.length),
			2,
			[buildAuthFrame("other-doc", "token")],
		);
		t.is(wrongKey.status, 404);

		const missingKey = await call(fallback, "POST", {
			hp_sid: sessionId,
			hp_cursor: "0",
		});
		t.is(missingKey.status, 404);

		await sleep(100);
	}

	t.is(authentications, 1);
	const response = await poll(fallback, sessionId, key, 0);
	t.is(response.status, 410);
	t.is((await response.json()).code, 4408);
});

test("at maxSessions a new session replaces the oldest unauthenticated one, else gets 503", async (t) => {
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: { maxSessions: 2, heartbeatInterval: 1000 },
	});
	const fallback = hocuspocus.server!.httpFallback!;
	const [first, second, third] = [randomUUID(), randomUUID(), randomUUID()];

	const firstKey = await openPolling(fallback, first);
	await openPolling(fallback, second);
	await openPolling(fallback, third);

	const evicted = await call(
		fallback,
		"POST",
		{ hp_sid: first, hp_cursor: "0" },
		firstKey,
	);
	t.is(evicted.status, 410);
	t.is((await evicted.json()).code, 4205);

	const full = await newHocuspocus(t, {
		httpFallback: { maxSessions: 2, heartbeatInterval: 1000 },
	});
	const fullFallback = full.server!.httpFallback!;
	for (const sessionId of [randomUUID(), randomUUID()]) {
		const key = await openPolling(fullFallback, sessionId);
		await postMessages(fullFallback, sessionId, key, 1, [
			buildAuthFrame("full-doc", "token"),
		]);
		// The authenticated message is sent once the session has authenticated.
		const response = await poll(fullFallback, sessionId, key, 0);
		t.true(messageIds(await response.text()).length > 0);
	}

	const refused = await call(fullFallback, "GET", {
		hp_transport: "polling",
		hp_sid: randomUUID(),
	});
	t.is(refused.status, 503);
});

const rawRequest = (port: number, text: string) =>
	new Promise<string>((resolve, reject) => {
		const socket = net.connect(port, "127.0.0.1", () => socket.write(text));
		let response = "";
		socket.setEncoding("utf8");
		socket.on("data", (chunk) => {
			response += chunk;
		});
		socket.on("end", () => resolve(response));
		socket.on("error", reject);
	});

test("the server survives malformed requests and leaves other requests alone", async (t) => {
	const hocuspocus = await newHocuspocus(t, { httpFallback: true });
	const { port } = hocuspocus.server!.address;
	const base = `http://127.0.0.1:${port}`;

	const redirect = await fetch(`${base}/?next=https://example.com`);
	t.is(await redirect.text(), "Welcome to Hocuspocus!");

	const malformed = await rawRequest(
		port,
		`GET /?hp_transport=sse&hp_sid=${randomUUID()} HTTP/1.1\r\nHost: a b\r\nConnection: close\r\n\r\n`,
	);
	t.regex(malformed, /^HTTP\/1\.1 400/);

	t.is(await (await fetch(`${base}/`)).text(), "Welcome to Hocuspocus!");
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
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: true,
		async onRequest({ response }) {
			response.writeHead(403);
			response.end();
			return Promise.reject();
		},
	});
	const base = `http://127.0.0.1:${hocuspocus.server!.address.port}`;
	const sessionId = randomUUID();

	const open = await fetch(`${base}/?hp_transport=sse&hp_sid=${sessionId}`);
	t.is(open.status, 403);
	await open.text();

	const post = await fetch(`${base}/?hp_sid=${sessionId}&hp_cursor=0`, {
		method: "POST",
		body: "0".repeat(36),
	});
	t.is(post.status, 404);
});
