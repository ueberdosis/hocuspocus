import {
	type HocuspocusProviderWebsocketConfiguration,
	WebSocketStatus,
} from "@hocuspocus/provider";
import test from "ava";
import {
	newHocuspocusProvider,
	newHocuspocusProviderWebsocket,
	newHocuspocusWithHttpFallback,
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

// A WebSocket that, like a real one, reports a failed handshake when it is
// closed while connecting.
class AbortedWebSocket extends FakeWebSocket {
	reported = false;

	close() {
		super.close();
		setTimeout(() => {
			this.emit("error", new Error("closed while connecting"));
			this.emit("close", { code: 1006, reason: "" });
			this.reported = true;
		}, 0);
	}
}

// A WebSocketPolyfill that counts the sockets it creates.
const counting = (Polyfill: typeof FakeWebSocket) => {
	const sockets = {
		created: 0,
		Polyfill: class extends Polyfill {
			constructor() {
				super();
				sockets.created += 1;
			}
		},
	};
	return sockets;
};

const proxyCases = [
	{ eventStreams: "pass", expected: "sse" },
	{ eventStreams: "buffer", expected: "polling" },
	{ eventStreams: "stall", expected: "polling" },
] as const;

for (const { eventStreams, expected } of proxyCases) {
	test(`blocked WebSockets, event streams ${eventStreams}: connects over ${expected}`, async (t) => {
		const hocuspocus = await newHocuspocusWithHttpFallback(t);
		const proxy = await newHttpProxy(t, hocuspocus, { eventStreams });
		const provider = newHocuspocusProvider(
			t,
			hocuspocus,
			{},
			{ url: proxy.webSocketURL, ...chain },
		);

		await waitForSynced(provider);
		t.is(provider.configuration.websocketProvider.transport, expected);
	});
}

test("a WebSocket that works stays the transport", async (t) => {
	const hocuspocus = await newHocuspocusWithHttpFallback(t);
	let closed = false;
	const provider = newHocuspocusProvider(
		t,
		hocuspocus,
		{
			onClose: () => {
				closed = true;
			},
		},
		{ ...chain, connectTimeout: 300, messageReconnectTimeout: 2000 },
	);
	await waitForSynced(provider);

	// Longer than both timeouts. The messages keep the connection from
	// counting as dead.
	const document = hocuspocus.documents.get("hocuspocus-test")!;
	for (let tick = 0; tick < 25; tick += 1) {
		document.broadcastStateless("tick");
		await sleep(100);
	}

	t.is(provider.configuration.websocketProvider.transport, "websocket");
	t.false(closed);
});

test("a WebSocket nothing is sent through is not taken for a broken one", async (t) => {
	const hocuspocus = await newHocuspocusWithHttpFallback(t);
	let closed = false;
	// Without a provider attached, neither side has anything to say.
	const websocketProvider = newHocuspocusProviderWebsocket(t, hocuspocus, {
		...chain,
		connectTimeout: 300,
		messageReconnectTimeout: 300,
		onClose: () => {
			closed = true;
		},
	});
	await retryableAssertion(t, (tt) =>
		tt.is(websocketProvider.status, WebSocketStatus.Connected),
	);

	await sleep(900);

	t.is(websocketProvider.status, WebSocketStatus.Connected);
	t.is(websocketProvider.transport, "websocket");
	t.false(closed);
});

test("a WebSocket that never opens falls back to sse", async (t) => {
	const hocuspocus = await newHocuspocusWithHttpFallback(t);
	const provider = newHocuspocusProvider(
		t,
		hocuspocus,
		{},
		{ WebSocketPolyfill: NeverOpeningWebSocket, ...chain },
	);

	await waitForSynced(provider);
	t.is(provider.configuration.websocketProvider.transport, "sse");
});

test("falling back is part of one connection attempt", async (t) => {
	const hocuspocus = await newHocuspocusWithHttpFallback(t);
	const sockets = counting(ClosingWebSocket);
	let maxAttemptsFailed = false;
	const provider = newHocuspocusProvider(
		t,
		hocuspocus,
		{},
		{
			WebSocketPolyfill: sockets.Polyfill,
			transports: chain.transports,
			maxAttempts: 1,
			onMaxAttemptsFailed: () => {
				maxAttemptsFailed = true;
			},
		},
	);

	await waitForSynced(provider);
	t.is(sockets.created, 1);
	t.is(provider.configuration.websocketProvider.transport, "sse");
	t.false(maxAttemptsFailed);
});

test("a transport that failed is not tried again when the connection drops", async (t) => {
	const hocuspocus = await newHocuspocusWithHttpFallback(t);
	const sockets = counting(NeverOpeningWebSocket);
	const provider = newHocuspocusProvider(
		t,
		hocuspocus,
		{},
		{
			WebSocketPolyfill: sockets.Polyfill,
			...chain,
			connectTimeout: 300,
			// The provider waits this long before it connects again.
			delay: 50,
			minDelay: 50,
		},
	);
	const websocketProvider = provider.configuration.websocketProvider;
	await waitForSynced(provider);

	// The provider connects again by itself, and does not wait for the
	// WebSocket a second time.
	let reopened = false;
	websocketProvider.on("open", () => {
		reopened = true;
	});
	websocketProvider.webSocket?.close();
	await retryableAssertion(t, (tt) => tt.true(reopened));
	await waitForSynced(provider);

	t.is(sockets.created, 1);
	t.is(websocketProvider.transport, "sse");
});

test("disconnect() while the WebSocket is connecting stops the fallback", async (t) => {
	const hocuspocus = await newHocuspocusWithHttpFallback(t);
	const proxy = await newHttpProxy(t, hocuspocus);
	const sockets = counting(NeverOpeningWebSocket);
	const provider = newHocuspocusProvider(
		t,
		hocuspocus,
		{},
		{
			url: proxy.webSocketURL,
			WebSocketPolyfill: sockets.Polyfill,
			...chain,
			connectTimeout: 200,
		},
	);

	await retryableAssertion(t, (tt) => tt.is(sockets.created, 1));
	provider.configuration.websocketProvider.disconnect();
	// Three times as long as the WebSocket had to open.
	await sleep(600);

	t.deepEqual(proxy.requests, []);
});

test("a WebSocket closed by disconnect() while connecting is tried first again on connect()", async (t) => {
	const hocuspocus = await newHocuspocusWithHttpFallback(t);
	const sockets = counting(AbortedWebSocket);
	const { websocketProvider } = newHocuspocusProvider(
		t,
		hocuspocus,
		{},
		{ WebSocketPolyfill: sockets.Polyfill, ...chain },
	).configuration;

	await retryableAssertion(t, (tt) => tt.is(sockets.created, 1));
	const socket = websocketProvider.webSocket as unknown as AbortedWebSocket;
	websocketProvider.disconnect();
	await retryableAssertion(t, (tt) => tt.true(socket.reported));
	websocketProvider.connect();

	await retryableAssertion(t, (tt) => tt.is(sockets.created, 2));
	t.is(websocketProvider.transport, "websocket");
});

test("a WebSocket that opens but delivers nothing falls back to sse", async (t) => {
	const hocuspocus = await newHocuspocusWithHttpFallback(t);
	const provider = newHocuspocusProvider(
		t,
		hocuspocus,
		{},
		{
			WebSocketPolyfill: SwallowingWebSocket,
			messageReconnectTimeout: 500,
			...chain,
		},
	);

	await waitForSynced(provider);
	t.is(provider.configuration.websocketProvider.transport, "sse");
});

test("a WebSocket that opens but delivers nothing does not lock out HTTP transports that failed once", async (t) => {
	const hocuspocus = await newHocuspocusWithHttpFallback(t);
	const proxy = await newHttpProxy(t, hocuspocus);
	const sockets = counting(SwallowingWebSocket);
	// The HTTP transports do not get through either, at first.
	proxy.holdDownstreams();
	const provider = newHocuspocusProvider(
		t,
		hocuspocus,
		{},
		{
			url: proxy.webSocketURL,
			WebSocketPolyfill: sockets.Polyfill,
			transports: chain.transports,
			connectTimeout: 300,
			messageReconnectTimeout: 300,
			delay: 50,
			minDelay: 50,
			maxDelay: 100,
			jitter: false,
		},
	);

	// The WebSocket gets its second turn once every transport has failed.
	await retryableAssertion(t, (tt) => tt.true(sockets.created >= 2));
	proxy.releaseDownstreams();

	await waitForSynced(provider);
	t.not(provider.configuration.websocketProvider.transport, "websocket");
});
