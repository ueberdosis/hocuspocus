import { Logger } from "@hocuspocus/extension-logger";
import { Hocuspocus } from "@hocuspocus/server";
import { createServer } from "node:http";
import crossws from "crossws/adapters/node";
import Koa from "koa";

const hocuspocus = new Hocuspocus({
	extensions: [new Logger()],
});

const app = new Koa();

app.use(async (ctx) => {
	ctx.body = "Hello World!";
});

const server = createServer(app.callback());

const ws = crossws({
	hooks: {
		open(peer) {
			peer.websocket.binaryType = "arraybuffer";
			hocuspocus.handleConnection(
				peer.websocket as WebSocket,
				peer.request as Request,
				{ user_id: 1234 },
			);
		},
		error(peer, error) {
			console.error("WebSocket error for peer:", peer.id);
			console.error(error);
		},
	},
});

server.on("upgrade", (request, socket, head) => {
	ws.handleUpgrade(request, socket, head);
});

server.listen(1234);
