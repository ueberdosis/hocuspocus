import {
	HocuspocusProvider,
	HocuspocusProviderWebsocket,
	WebSocketStatus,
} from "@hocuspocus/provider";
import test from "ava";
import { sleep } from "../utils/index.ts";

// A socket the test opens and silences by hand. It never emits a close frame,
// which is what a stalled network or a proxy dropping the connection looks
// like to the client.
class SilentWebSocket {
	static created: SilentWebSocket[] = [];

	binaryType = "arraybuffer";
	identifier = 0;
	readyState = 0;
	listeners: Record<string, ((payload: any) => void)[]> = {};

	constructor(_url: string) {
		SilentWebSocket.created.push(this);
	}

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

test.serial(
	"forced close behaves like a normal close for attached providers",
	async (t) => {
		SilentWebSocket.created = [];

		const websocket = new HocuspocusProviderWebsocket({
			url: "ws://127.0.0.1:1",
			WebSocketPolyfill: SilentWebSocket,
			messageReconnectTimeout: 1000,
			delay: 10000,
			minDelay: 10000,
			maxDelay: 10000,
		});
		t.teardown(() => websocket.destroy());

		const provider = new HocuspocusProvider({
			websocketProvider: websocket,
			name: "forced-close",
		});
		provider.attach();
		t.teardown(() => provider.destroy());

		// Establish the connection without ever receiving a message.
		await sleep(10);
		const socket = SilentWebSocket.created[0];
		socket.readyState = 1;
		socket.emit("open", {});
		t.is(websocket.status, WebSocketStatus.Connected);

		// In production checkConnection() only runs once a message has been
		// received, and the first message resolves the connection attempt.
		// Resolve it here too so the forced close happens with no pending
		// attempt, exactly as on a live connection.
		websocket.resolveConnectionAttempt();

		// Pretend the provider had authenticated and synced before the socket
		// went silent.
		provider.synced = true;
		provider.isAuthenticated = true;
		t.true(provider.synced);
		t.true(provider.isAuthenticated);

		let closeEvents = 0;
		provider.on("close", () => {
			closeEvents += 1;
		});

		// No message arrived for longer than messageReconnectTimeout; three
		// checks force the 4408 close.
		websocket.lastMessageReceived = Date.now() - 5000;
		t.is(closeEvents, 0, "close must not fire before the forced close");

		websocket.checkConnection();
		websocket.checkConnection();
		websocket.checkConnection();

		t.is(websocket.status, WebSocketStatus.Disconnected);
		t.is(closeEvents, 1, "the forced close must emit close");
		t.false(provider.synced, "the provider must reset synced");
		t.false(provider.isAuthenticated, "the provider must reset isAuthenticated");
		t.truthy(
			websocket.reconnectTimeout,
			"the forced close must schedule a reconnect like a normal close",
		);
	},
);
