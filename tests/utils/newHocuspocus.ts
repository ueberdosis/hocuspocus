import type { ExecutionContext } from "ava";
import type { ServerConfiguration } from "@hocuspocus/server";
import { Server } from "@hocuspocus/server";

export const newHocuspocus = (
	t: ExecutionContext,
	options?: Partial<ServerConfiguration>,
) => {
	const server = new Server({
		// We don't need the logging in testing.
		quiet: true,
		// Binding something port 0 will end up on a random free port.
		// That's helpful to run tests concurrently.
		port: 0,
		// Ava 6+ considers process.exit() in workers an error.
		// Disable signal handlers to prevent that.
		stopOnSignals: false,
		// Add or overwrite settings, depending on the test case.
		...options,
	});

	t.teardown(() => {
		// Close WebSocket connections and shut down the HTTP server.
		// We avoid calling server.destroy() because it triggers lifecycle
		// hooks (onDestroy, afterUnloadDocument) which could run assertions
		// after the test has finished (Ava 6+ treats this as an error).
		// The _force-exit completion handler ensures the process exits
		// even if some handles remain open.
		server.hocuspocus.closeConnections();
		server.httpServer.closeAllConnections();
		server.httpServer.close();
	});

	return server.listen();
};
