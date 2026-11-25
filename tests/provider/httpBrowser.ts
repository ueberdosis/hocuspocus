import test from "ava";
import {
	newHocuspocus,
	newHocuspocusProvider,
	newHttpProxy,
	waitForSynced,
} from "../utils/index.ts";
import { retryableAssertion } from "../utils/retryableAssertion.ts";

// What the HTTP transports take from the runtime they run in. Here: the page
// a relative URL is relative to, which Deno makes every read of `location`
// throw for unless it runs with `--location`; the credentials mode of
// `fetch`, which Node.js accepts but has no cookies to apply to; and the
// limit browsers set on the keepalive requests of a page, which Node.js does
// not. `location` and a `fetch` that keeps a record are set for the whole
// process, which is why these tests have a file of their own, and why the
// tests that depend on what else is going on run on their own, before the
// others.

const sent: { method: string; url: URL; credentials: RequestCredentials }[] =
	[];
// Bytes of keepalive bodies on their way, and the most there were at once.
let keepaliveBytes = 0;
let mostKeepaliveBytes = 0;
const nativeFetch = globalThis.fetch;
const recordingFetch = async (
	input: string | URL | Request,
	init?: RequestInit,
): Promise<Response> => {
	const request = new Request(input, init);
	sent.push({
		method: request.method,
		url: new URL(request.url),
		credentials: request.credentials,
	});
	const size = request.keepalive ? String(init?.body ?? "").length : 0;
	keepaliveBytes += size;
	mostKeepaliveBytes = Math.max(mostKeepaliveBytes, keepaliveBytes);
	try {
		return await nativeFetch(input, init);
	} finally {
		keepaliveBytes -= size;
	}
};
globalThis.fetch = recordingFetch as typeof fetch;

test.serial("polling: sockets share a page's keepalive limit", async (t) => {
	const received: string[] = [];
	const hocuspocus = await newHocuspocus(t, {
		httpFallback: true,
		async onStateless({ payload }) {
			received.push(payload.length > 100 ? "large" : payload);
		},
	});
	const proxy = await newHttpProxy(t, hocuspocus);
	// A socket each, as for two providers that do not share one.
	const providers = ["first", "second"].map((name) =>
		newHocuspocusProvider(
			t,
			hocuspocus,
			{ name, awareness: null },
			{ url: proxy.webSocketURL, transports: ["polling"] },
		),
	);
	for (const provider of providers) {
		await waitForSynced(provider);
		provider.sendStateless("settled");
	}
	await retryableAssertion(t, (tt) =>
		tt.deepEqual(received, ["settled", "settled"]),
	);

	// A batch of about 40 KB from each, both on their way at once: one fits
	// into the 64 KiB a page has for keepalive requests, both do not.
	proxy.delayBatches(300);
	mostKeepaliveBytes = keepaliveBytes;
	for (const provider of providers) {
		provider.sendStateless("x".repeat(30_000));
	}
	await retryableAssertion(t, (tt) => tt.is(received.length, 4));

	t.deepEqual(received.slice(2), ["large", "large"]);
	// One still goes with keepalive, so that it outlives the page.
	t.true(
		mostKeepaliveBytes >= 40_000 && mostKeepaliveBytes <= 64 * 1024,
		`${mostKeepaliveBytes} bytes`,
	);
});

test.serial("sse: an absolute URL works where location throws", async (t) => {
	const hocuspocus = await newHocuspocus(t, { httpFallback: true });
	// As in Deno, unless it runs with `--location`.
	Object.defineProperty(globalThis, "location", {
		configurable: true,
		get() {
			throw new ReferenceError(
				'Access to "location", run again with --location <href>.',
			);
		},
	});
	try {
		const provider = newHocuspocusProvider(
			t,
			hocuspocus,
			{},
			{ transports: ["sse"] },
		);

		await waitForSynced(provider);
		t.is(provider.configuration.websocketProvider.transport, "sse");
	} finally {
		Reflect.deleteProperty(globalThis, "location");
	}
});

test("sse: a relative URL is resolved against the page, as a WebSocket does", async (t) => {
	const hocuspocus = await newHocuspocus(t, { httpFallback: true });
	Object.assign(globalThis, {
		location: { href: `${hocuspocus.server!.httpURL}/editor/42?tab=1` },
	});
	const provider = newHocuspocusProvider(
		t,
		hocuspocus,
		{},
		{ url: "/collaboration", transports: ["sse"] },
	);

	await waitForSynced(provider);
	t.is(provider.configuration.websocketProvider.transport, "sse");
	// The server takes the requests of a session on any path, so it is the
	// URL of the requests that tells where the provider went.
	const port = String(hocuspocus.server!.address.port);
	const requests = sent.filter((request) => request.url.port === port);
	const opening = requests.find((request) => request.method === "GET");
	t.is(opening?.url.origin, hocuspocus.server!.httpURL);
	t.is(opening?.url.pathname, "/collaboration");
	t.deepEqual(
		[...new Set(requests.map((request) => request.url.pathname))],
		["/collaboration"],
	);
});

for (const withCredentials of [false, true]) {
	test(`polling: ${withCredentials ? "withCredentials sends" : "by default no request sends"} cookies to another origin`, async (t) => {
		let disconnects = 0;
		const hocuspocus = await newHocuspocus(t, {
			httpFallback: true,
			async onDisconnect() {
				disconnects += 1;
			},
		});
		const provider = newHocuspocusProvider(
			t,
			hocuspocus,
			{},
			{ transports: ["polling"], withCredentials },
		);
		await waitForSynced(provider);
		provider.configuration.websocketProvider.disconnect();
		// The request that closes the session is the last one.
		await retryableAssertion(t, (tt) => tt.is(disconnects, 1));

		const port = String(hocuspocus.server!.address.port);
		const requests = sent.filter((request) => request.url.port === port);
		// The provider closed the session, rather than the server timing it
		// out, and that request carries the mode too.
		t.is(
			requests.filter(
				(request) =>
					request.method === "POST" &&
					request.url.searchParams.get("hp_close") === "1",
			).length,
			1,
		);
		t.deepEqual(
			[...new Set(requests.map((request) => request.credentials))],
			[withCredentials ? "include" : "same-origin"],
		);
	});
}
