import {
	HocuspocusProviderWebsocket,
	type HocuspocusProviderWebsocketConfiguration,
} from "@hocuspocus/provider";
import type { Hocuspocus } from "@hocuspocus/server";
import test, { type ExecutionContext } from "ava";
import {
	newHocuspocus,
	newHocuspocusProvider,
	newHttpProxy,
	sleep,
	waitForSynced,
} from "../utils/index.ts";
import { retryableAssertion } from "../utils/retryableAssertion.ts";

const chain = {
	transports: ["websocket", "sse", "polling"],
	connectTimeout: 1000,
} satisfies Partial<HocuspocusProviderWebsocketConfiguration>;

class FakeWebSocket {
	binaryType = "arraybuffer";
	identifier = 0;
	readyState = 0;
	listeners: Record<string, ((payload: any) => void)[]> = {};

	addEventListener(name: string, handler: (payload: any) => void) {
		this.listeners[name] = [...(this.listeners[name] ?? []), handler];
	}

	removeEventListener(name: string, handler: (payload: any) => void) {
		this.listeners[name] = (this.listeners[name] ?? []).filter(
			(listener) => listener !== handler,
		);
	}

	emit(name: string, payload: any) {
		for (const handler of this.listeners[name] ?? []) {
			handler(payload);
		}
	}

	close() {
		this.readyState = 3;
	}

	send() {}
}

// A WebSocket whose handshake never completes.
class NeverOpeningWebSocket extends FakeWebSocket {}

// A WebSocket the network closes at once, without an error event.
class ClosingWebSocket extends FakeWebSocket {
	constructor() {
		super();
		setTimeout(() => this.emit("close", { code: 1006, reason: "" }), 0);
	}
}

// A WebSocket whose handshake passes but whose frames are dropped.
class SwallowingWebSocket extends FakeWebSocket {
	constructor() {
		super();
		setTimeout(() => {
			this.readyState = 1;
			this.emit("open", {});
		}, 0);
	}
}

const connect = (
	t: ExecutionContext,
	hocuspocus: Hocuspocus,
	options: HocuspocusProviderWebsocketConfiguration,
) => {
	const websocketProvider = new HocuspocusProviderWebsocket(options);
	t.teardown(() => websocketProvider.destroy());
	const provider = newHocuspocusProvider(
		t,
		hocuspocus,
		{},
		{},
		websocketProvider,
	);
	return { provider, websocketProvider };
};

const proxyCases = [
	{ eventStreams: "pass", expected: "sse" },
	{ eventStreams: "buffer", expected: "polling" },
	{ eventStreams: "stall", expected: "polling" },
] as const;

for (const { eventStreams, expected } of proxyCases) {
	test(`blocked WebSockets, event streams ${eventStreams}: connects over ${expected}`, async (t) => {
		const hocuspocus = await newHocuspocus(t, { httpFallback: true });
		const proxy = await newHttpProxy(t, hocuspocus, { eventStreams });
		const { provider, websocketProvider } = connect(t, hocuspocus, {
			url: proxy.webSocketURL,
			...chain,
		});

		await waitForSynced(provider);
		t.is(websocketProvider.transport, expected);
	});
}

test("a WebSocket that never opens falls back to sse", async (t) => {
	const hocuspocus = await newHocuspocus(t, { httpFallback: true });
	const { provider, websocketProvider } = connect(t, hocuspocus, {
		url: hocuspocus.server!.webSocketURL,
		WebSocketPolyfill: NeverOpeningWebSocket,
		...chain,
	});

	await waitForSynced(provider);
	t.is(websocketProvider.transport, "sse");
});

test("falling back is part of one connection attempt", async (t) => {
	const hocuspocus = await newHocuspocus(t, { httpFallback: true });
	let maxAttemptsFailed = false;
	const { provider, websocketProvider } = connect(t, hocuspocus, {
		url: hocuspocus.server!.webSocketURL,
		WebSocketPolyfill: ClosingWebSocket,
		maxAttempts: 1,
		onMaxAttemptsFailed: () => {
			maxAttemptsFailed = true;
		},
		...chain,
		// With a single attempt nothing retries a slow first HTTP request, and
		// this test does not wait on the connect timeout.
		connectTimeout: 5000,
	});

	await waitForSynced(provider);
	t.is(websocketProvider.transport, "sse");
	t.false(maxAttemptsFailed);
});

test("disconnect() while the WebSocket is connecting stops the fallback", async (t) => {
	const hocuspocus = await newHocuspocus(t, { httpFallback: true });
	const proxy = await newHttpProxy(t, hocuspocus);
	const { websocketProvider } = connect(t, hocuspocus, {
		url: proxy.webSocketURL,
		WebSocketPolyfill: NeverOpeningWebSocket,
		...chain,
	});

	await sleep(10);
	websocketProvider.disconnect();
	await sleep(1500);

	t.deepEqual(proxy.requests, []);
});

test("a WebSocket closed by disconnect() while connecting is tried first again on connect()", async (t) => {
	const hocuspocus = await newHocuspocus(t, { httpFallback: true });
	let created = 0;
	// Closed while connecting, a WebSocket reports a failed handshake.
	class AbortedWebSocket extends FakeWebSocket {
		constructor() {
			super();
			created += 1;
		}

		close() {
			super.close();
			setTimeout(() => {
				this.emit("error", new Error("closed while connecting"));
				this.emit("close", { code: 1006, reason: "" });
			}, 0);
		}
	}
	const { websocketProvider } = connect(t, hocuspocus, {
		url: hocuspocus.server!.webSocketURL,
		WebSocketPolyfill: AbortedWebSocket,
		...chain,
	});

	await sleep(10);
	websocketProvider.disconnect();
	await sleep(50);
	websocketProvider.connect();
	await sleep(10);

	t.is(created, 2);
	t.is(websocketProvider.transport, "websocket");
});

test("a WebSocket that opens but delivers nothing falls back to sse", async (t) => {
	const hocuspocus = await newHocuspocus(t, { httpFallback: true });
	const { provider, websocketProvider } = connect(t, hocuspocus, {
		url: hocuspocus.server!.webSocketURL,
		WebSocketPolyfill: SwallowingWebSocket,
		messageReconnectTimeout: 500,
		...chain,
	});

	await waitForSynced(provider);
	t.is(websocketProvider.transport, "sse");
});

test("a WebSocket that opens but delivers nothing does not lock out HTTP transports that failed once", async (t) => {
	const hocuspocus = await newHocuspocus(t, { httpFallback: true });
	const proxy = await newHttpProxy(t, hocuspocus);
	// The HTTP transports fail at first, so every transport has failed once.
	proxy.holdDownstreams();
	const { provider, websocketProvider } = connect(t, hocuspocus, {
		url: proxy.webSocketURL,
		WebSocketPolyfill: SwallowingWebSocket,
		messageReconnectTimeout: 300,
		transports: ["websocket", "sse", "polling"],
		connectTimeout: 300,
		delay: 50,
		minDelay: 50,
		maxDelay: 100,
		jitter: false,
	});

	await retryableAssertion(t, (tt) =>
		tt.true(
			proxy.requests.some((request) =>
				request.includes("hp_transport=polling"),
			),
		),
	);
	await sleep(400);
	proxy.releaseDownstreams();

	await waitForSynced(provider);
	t.is(websocketProvider.transport, "sse");
});
