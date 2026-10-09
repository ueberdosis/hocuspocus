import {
	HocuspocusProviderWebsocket,
	WebSocketStatus,
} from "@hocuspocus/provider";
import test from "ava";
import { sleep } from "../utils/index.ts";

class FakeSocket {
	static created: FakeSocket[] = [];

	readyState = 0;

	binaryType = "arraybuffer";

	listeners: Record<string, ((payload: any) => void)[]> = {};

	constructor(_url: string) {
		FakeSocket.created.push(this);
	}

	addEventListener(name: string, handler: (payload: any) => void) {
		this.listeners[name] = [...(this.listeners[name] ?? []), handler];
	}

	removeEventListener(name: string, handler: (payload: any) => void) {
		this.listeners[name] = (this.listeners[name] ?? []).filter(
			(listener) => listener !== handler,
		);
	}

	send() {}

	close() {
		this.readyState = 3;
	}

	emit(type: string, event: any) {
		for (const handler of this.listeners[type] ?? []) {
			handler(event);
		}
	}
}

test("connect() cancels the retry chain of a socket closed before its first message", async (t) => {
	FakeSocket.created = [];

	const ws = new HocuspocusProviderWebsocket({
		url: "ws://x",
		WebSocketPolyfill: FakeSocket,
		delay: 200,
		minDelay: 200,
		initialDelay: 0,
		jitter: false,
	});
	t.teardown(() => ws.destroy());

	await sleep(10);
	const first = FakeSocket.created[0];
	first.readyState = 1;
	first.emit("open", {});
	first.emit("close", { code: 4408, reason: "busy" });

	ws.connect();
	await sleep(10);
	const second = FakeSocket.created[1];
	second.readyState = 1;
	second.emit("open", {});
	second.emit("message", { data: new Uint8Array([9]).buffer });

	await sleep(400);

	t.is(FakeSocket.created.length, 2);
	t.not(second.readyState, 3);
	t.is(ws.status, WebSocketStatus.Connected);

	// An established socket that closes still reconnects.
	second.readyState = 3;
	second.emit("close", { code: 1006, reason: "" });
	await sleep(400);

	t.is(FakeSocket.created.length, 3);
	const third = FakeSocket.created[2];
	third.readyState = 1;
	third.emit("open", {});
	third.emit("message", { data: new Uint8Array([9]).buffer });
	t.is(ws.status, WebSocketStatus.Connected);
});
