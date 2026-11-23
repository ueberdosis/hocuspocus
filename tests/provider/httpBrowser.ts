import test from "ava";
import {
	newHocuspocus,
	newHocuspocusProvider,
	waitForSynced,
} from "../utils/index.ts";
import { retryableAssertion } from "../utils/retryableAssertion.ts";

// What the HTTP transports take from the runtime they run in. Here: the page
// a relative URL is relative to, which Deno makes every read of `location`
// throw for unless it runs with `--location`, and the credentials mode of
// `fetch`, which Node.js accepts but has no cookies to apply to. `location`
// and a `fetch` that keeps a record are set for the whole process, which is
// why these tests have a file of their own, and why the test with a
// `location` that throws runs on its own, before the others.

const sent: { port: string; credentials: RequestCredentials }[] = [];
const nativeFetch = globalThis.fetch;
const recordingFetch = (
	input: string | URL | Request,
	init?: RequestInit,
): Promise<Response> => {
	const request = new Request(input, init);
	sent.push({
		port: new URL(request.url).port,
		credentials: request.credentials,
	});
	return nativeFetch(input, init);
};
globalThis.fetch = recordingFetch as typeof fetch;

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
		const modes = sent
			.filter((request) => request.port === port)
			.map((request) => request.credentials);
		// The open, polls, batches and the close.
		t.true(modes.length >= 4);
		t.deepEqual(
			[...new Set(modes)],
			[withCredentials ? "include" : "same-origin"],
		);
	});
}
