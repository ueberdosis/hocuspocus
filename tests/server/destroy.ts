import test from "ava";
import { Server } from "@hocuspocus/server";
import {
	newHocuspocusProvider,
	newHocuspocusProviderWebsocket,
	sleep,
} from "../utils/index.ts";

test("destroy only runs once when called multiple times", async (t) => {
	let destroyed = 0;

	const server = new Server({
		port: 0,
		quiet: true,
		stopOnSignals: false,
		async onDestroy() {
			destroyed += 1;
		},
	});

	t.teardown(() => server.httpServer.close());

	await server.listen();

	// Concurrent and subsequent calls (e.g. from repeated SIGINT signals)
	// must not re-run the shutdown, which would close already-closed
	// resources in extensions.
	await Promise.all([server.destroy(), server.destroy()]);
	await server.destroy();

	t.is(destroyed, 1);
});

test("destroy waits for documents that are still loading", async (t) => {
	let loadStarted: () => void = () => {};
	const started = new Promise<void>((resolve) => {
		loadStarted = resolve;
	});
	const events: string[] = [];

	const server = new Server({
		port: 0,
		quiet: true,
		stopOnSignals: false,
		async onLoadDocument() {
			loadStarted();
			await sleep(300);
			events.push("loaded");
		},
		async afterUnloadDocument() {
			events.push("unloaded");
		},
		async onDestroy() {
			events.push("destroyed");
		},
	});

	t.teardown(() => server.httpServer.close());

	const hocuspocus = await server.listen();

	const socket = newHocuspocusProviderWebsocket(t, hocuspocus, {
		onClose() {
			// Make sure it doesn’t reconnect.
			socket.disconnect();
		},
	});
	newHocuspocusProvider(t, hocuspocus, {
		name: "hocuspocus-test",
		websocketProvider: socket,
	});

	await started;
	await server.destroy();

	t.deepEqual(events, ["loaded", "unloaded", "destroyed"]);
	t.is(server.hocuspocus.getDocumentsCount(), 0);
});
