import test from "ava";
import { Server } from "@hocuspocus/server";

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
