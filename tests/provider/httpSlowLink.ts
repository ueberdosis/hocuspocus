import type { Hocuspocus } from "@hocuspocus/server";
import test from "ava";
import {
	newHocuspocus,
	newHocuspocusProvider,
	sleep,
	waitForSynced,
} from "../utils/index.ts";
import { retryableAssertion } from "../utils/retryableAssertion.ts";

// The provider reaches the server through `HttpFallback.fetch`, with no
// socket in between, and takes an event stream one chunk per 100 ms: the
// server writes the next slice only once the provider took the previous one,
// as on a slow link. This replaces the global `fetch` of the process, which
// is why the test has a file of its own.
let hocuspocus: Hocuspocus | undefined;

const slowly = (
	body: ReadableStream<Uint8Array>,
	signal: AbortSignal,
): ReadableStream<Uint8Array> => {
	const reader = body.getReader();
	signal.addEventListener("abort", () => {
		reader.cancel(signal.reason).catch(() => {});
	});
	return new ReadableStream<Uint8Array>(
		{
			async pull(controller) {
				const { done, value } = await reader.read();
				if (!done) {
					await sleep(100);
				}
				if (signal.aborted) {
					controller.error(signal.reason);
				} else if (done) {
					controller.close();
				} else {
					controller.enqueue(value);
				}
			},
			cancel: (reason) => reader.cancel(reason),
		},
		{ highWaterMark: 0 },
	);
};

const directFetch = async (
	input: string | URL | Request,
	init?: RequestInit,
): Promise<Response> => {
	const request = new Request(input, init);
	const response = await hocuspocus!.server!.httpFallback!.fetch(request);
	if (!response.headers.get("content-type")?.startsWith("text/event-stream")) {
		return response;
	}
	return new Response(slowly(response.body!, request.signal), {
		status: response.status,
		headers: response.headers,
	});
};
globalThis.fetch = directFetch as typeof fetch;

test("sse: a long message does not hold back the acknowledgements of the messages before it", async (t) => {
	const settled: string[] = [];
	hocuspocus = await newHocuspocus(t, {
		httpFallback: true,
		timeout: 1000,
		async onStateless({ payload }) {
			settled.push(payload);
		},
	});
	const received: string[] = [];
	const codes: number[] = [];
	const provider = newHocuspocusProvider(
		t,
		hocuspocus,
		{
			// Nothing else makes the provider send requests.
			awareness: null,
			onStateless: ({ payload }) => {
				received.push(
					payload.length > 100 ? `${payload.length} characters` : payload,
				);
			},
			onClose: ({ event }) => {
				codes.push(event.code);
			},
		},
		{ transports: ["sse"] },
	);
	await waitForSynced(provider);
	// Once the server has this, no POST of the handshake is left in flight.
	provider.sendStateless("settled");
	await retryableAssertion(t, (tt) => tt.deepEqual(settled, ["settled"]));
	const document = hocuspocus.documents.get("hocuspocus-test")!;

	// The provider acknowledges this message with its next ping. The session
	// has written it after one microtask, before a heartbeat could follow it.
	document.broadcastStateless("before");
	await Promise.resolve();
	// The next heartbeat waits behind this one: two seconds of download, twice
	// the timeout, while more messages arrive.
	document.broadcastStateless("x".repeat(1_000_000));
	for (let tick = 0; tick < 14; tick += 1) {
		await sleep(150);
		document.broadcastStateless(`tick ${tick}`);
	}

	await retryableAssertion(t, (tt) =>
		tt.true(received.at(-1) === "tick 13" || codes.length > 0),
	);
	t.deepEqual(codes, []);
	t.deepEqual(received, [
		"before",
		"1000000 characters",
		...Array.from({ length: 14 }, (_, tick) => `tick ${tick}`),
	]);
});
