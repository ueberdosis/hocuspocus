import test from "ava";
import { newHocuspocus, newHocuspocusProvider, sleep } from "../utils/index.ts";

test.serial("logs the error of a failing hook with its stack", async (t) => {
	const logged: unknown[][] = [];
	const originalConsoleError = console.error;
	console.error = (...data: unknown[]) => {
		logged.push(data);
	};
	t.teardown(() => {
		console.error = originalConsoleError;
	});

	const failure = new Error("storage is unavailable");
	const server = await newHocuspocus(t, {
		async onLoadDocument() {
			throw failure;
		},
	});

	newHocuspocusProvider(t, server, { name: `test-${crypto.randomUUID()}` });

	const isHookLog = (entry: unknown[]) => entry[0] === "[onLoadDocument]";
	const deadline = Date.now() + 5000;
	while (Date.now() < deadline && !logged.some(isHookLog)) {
		await sleep(50);
	}

	t.deepEqual(logged.find(isHookLog), ["[onLoadDocument]", failure]);
});
