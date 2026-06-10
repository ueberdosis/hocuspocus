import { Logger } from "@hocuspocus/extension-logger";
import { Hocuspocus } from "@hocuspocus/server";
import crossws from "crossws/adapters/bun";

const hocuspocus = new Hocuspocus({
	extensions: [new Logger()],
});

const ws = crossws({
	hooks: {
		open(peer) {
			// Use peer methods instead of peer.websocket to avoid
			// Bun's Proxy `this` binding issue with ServerWebSocket
			const wsLike = {
				get readyState() {
					return peer.websocket.readyState ?? 3; // 3 = CLOSED
				},
				send(data: any) {
					peer.send(data);
				},
				close(code?: number, reason?: string) {
					peer.close(code, reason);
				},
			};
			const clientConnection = hocuspocus.handleConnection(
				wsLike,
				peer.request as Request,
			);
			(peer as any)._hocuspocus = clientConnection;
		},
		message(peer, message) {
			(peer as any)._hocuspocus?.handleMessage(message.uint8Array());
		},
		close(peer, event) {
			(peer as any)._hocuspocus?.handleClose({
				code: event.code,
				reason: event.reason,
			});
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
