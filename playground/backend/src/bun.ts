import { Logger } from "@hocuspocus/extension-logger";
import { Hocuspocus } from "@hocuspocus/server";
import crossws from "crossws/adapters/bun";

const hocuspocus = new Hocuspocus({
	extensions: [new Logger()],
});

const ws = crossws({
	hooks: {
		open(peer) {
			peer.websocket.binaryType = "arraybuffer";
			hocuspocus.handleConnection(
				peer.websocket as WebSocket,
				peer.request as Request,
			);
		},
		error(peer, error) {
			console.error("WebSocket error for peer:", peer.id);
			console.error(error);
		},
	},
});

Bun.serve({
	port: 8000,
	websocket: ws.websocket,
	fetch(request, server) {
		if (request.headers.get("upgrade") === "websocket") {
			return ws.handleUpgrade(request, server);
		}

		return new Response("Welcome to Hocuspocus!");
	},
});

console.log("Listening on ws://127.0.0.1:8000");
