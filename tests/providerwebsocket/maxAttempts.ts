import {
	HocuspocusProviderWebsocket,
	type onMaxAttemptsFailedParameters,
} from "@hocuspocus/provider";
import test from "ava";
import { sleep } from "../utils/index.ts";

const exhaustedRetryOptions = {
	url: "ws://127.0.0.1:1",
	maxAttempts: 1,
	delay: 1,
	minDelay: 1,
	initialDelay: 0,
	jitter: false,
};

test("does not produce an unhandled rejection when maxAttempts are exhausted", async (t) => {
	const unhandled: unknown[] = [];
	const onUnhandledRejection = (reason: unknown) => {
		unhandled.push(reason);
	};
	process.on("unhandledRejection", onUnhandledRejection);
	t.teardown(() => {
		process.off("unhandledRejection", onUnhandledRejection);
	});

	const ws = new HocuspocusProviderWebsocket(exhaustedRetryOptions);
	t.teardown(() => ws.destroy());

	await sleep(300);
	await new Promise((resolve) => setImmediate(resolve));
	await new Promise((resolve) => setImmediate(resolve));

	t.is(unhandled.length, 0);
});

test("onMaxAttemptsFailed is executed when maxAttempts are exhausted", async (t) => {
	await new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			reject(new Error("onMaxAttemptsFailed was not called"));
		}, 2000);

		const ws = new HocuspocusProviderWebsocket({
			...exhaustedRetryOptions,
			onMaxAttemptsFailed({ error }) {
				clearTimeout(timeout);
				t.truthy(error);
				ws.destroy();
				resolve("done");
			},
		});
		t.teardown(() => ws.destroy());
	});
});

test("on('maxAttemptsFailed') is executed when maxAttempts are exhausted", async (t) => {
	await new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			reject(new Error("maxAttemptsFailed was not emitted"));
		}, 2000);

		const ws = new HocuspocusProviderWebsocket({
			...exhaustedRetryOptions,
			autoConnect: false,
		});
		t.teardown(() => ws.destroy());

		ws.on("maxAttemptsFailed", ({ error }: onMaxAttemptsFailedParameters) => {
			clearTimeout(timeout);
			t.truthy(error);
			ws.destroy();
			resolve("done");
		});

		ws.connect();
	});
});

// A server that accepts the upgrade and immediately closes the socket never
// makes the client emit an `error` event – only a `close` one.
class ClosingWebSocket {
	binaryType = "arraybuffer";
	identifier = 0;
	listeners: Record<string, ((payload: any) => void)[]> = {};

	constructor(_url: string) {
		setTimeout(() => {
			for (const handler of this.listeners.close ?? []) {
				handler({ code: 1006, reason: "" });
			}
		}, 0);
	}

	addEventListener(name: string, handler: (payload: any) => void) {
		this.listeners[name] = [...(this.listeners[name] ?? []), handler];
	}

	removeEventListener(name: string, handler: (payload: any) => void) {
		this.listeners[name] = (this.listeners[name] ?? []).filter(
			(listener) => listener !== handler,
		);
	}

	close() {}

	send() {}
}

test("emits maxAttemptsFailed when the socket closes without an error", async (t) => {
	await new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			reject(new Error("maxAttemptsFailed was not emitted"));
		}, 2000);

		const ws = new HocuspocusProviderWebsocket({
			...exhaustedRetryOptions,
			WebSocketPolyfill: ClosingWebSocket,
			onMaxAttemptsFailed({ error }) {
				clearTimeout(timeout);
				t.truthy(error);
				ws.destroy();
				resolve("done");
			},
		});
		t.teardown(() => ws.destroy());
	});
});

test("does not emit maxAttemptsFailed when the connection attempt is aborted", async (t) => {
	let failed = false;

	const ws = new HocuspocusProviderWebsocket({
		url: "ws://127.0.0.1:1",
		maxAttempts: 5,
		delay: 50,
		minDelay: 50,
		initialDelay: 0,
		jitter: false,
		onMaxAttemptsFailed() {
			failed = true;
		},
	});
	t.teardown(() => ws.destroy());

	// Give the first attempt a chance to fail, then stop retrying.
	await sleep(60);
	ws.disconnect();
	await sleep(400);

	t.false(failed);
});
