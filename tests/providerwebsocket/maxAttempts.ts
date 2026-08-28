import { HocuspocusProviderWebsocket } from "@hocuspocus/provider";
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

		ws.on("maxAttemptsFailed", ({ error }) => {
			clearTimeout(timeout);
			t.truthy(error);
			ws.destroy();
			resolve("done");
		});

		ws.connect();
	});
});
