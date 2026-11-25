import { Logger } from "@hocuspocus/extension-logger";
import { Server } from "@hocuspocus/server";

// Serves the SSE and long-polling transports next to WebSocket. Open the
// playground with `?transports=sse` or `?transports=polling` to use them.
const server = new Server({
	port: 8000,
	address: "127.0.0.1",
	name: "hocuspocus-http-fallback",
	httpFallback: true,
	extensions: [new Logger()],
});

server.listen();
