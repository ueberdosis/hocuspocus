import { HocuspocusProviderWebsocket } from "@hocuspocus/provider";
import test from "ava";
import { sleep } from "../utils/index.ts";

// A socket the test opens, feeds and closes by hand.
class FakeWebSocket {
	static created: FakeWebSocket[] = [];

	binaryType = "arraybuffer";
	identifier = 0;
	readyState = 0;
	listeners: Record<string, ((payload: any) => void)[]> = {};

	constructor(_url: string) {
		FakeWebSocket.created.push(this);
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

for (const teardown of ["disconnect", "destroy"] as const) {
	test.serial(
		`${teardown}() cancels the reconnect scheduled by a close`,
		async (t) => {
			FakeWebSocket.created = [];

			const ws = new HocuspocusProviderWebsocket({
				url: "ws://127.0.0.1:1",
				WebSocketPolyfill: FakeWebSocket,
				delay: 100,
				minDelay: 100,
			});
			t.teardown(() => ws.destroy());

			// The first attempt opens a socket and resolves on its first message.
			await sleep(10);
			const first = FakeWebSocket.created[0];
			first.readyState = 1;
			first.emit("open", {});
			first.emit("message", { data: new Uint8Array([9]).buffer });

			// The server goes away, then the app tears down within `delay`.
			first.emit("close", { code: 1006, reason: "" });
			ws[teardown]();

			await sleep(200);

			t.is(FakeWebSocket.created.length, 1);
			t.false(ws.shouldConnect);
		},
	);
}
