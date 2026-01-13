import { Logger } from "@hocuspocus/extension-logger";
import { Hocuspocus } from "@hocuspocus/server";
// @ts-nocheck
import type { IncomingMessage } from "node:http";
import Koa from "koa";
import websocket from "koa-easy-ws";

/**
 * Convert Node.js IncomingMessage to web Request
 */
function incomingMessageToRequest(req: IncomingMessage): Request {
	const protocol = (req.socket as any).encrypted ? "https" : "http";
	const host = req.headers.host || "localhost";
	const url = new URL(req.url || "/", `${protocol}://${host}`);

	const headers = new Headers();
	for (const [key, value] of Object.entries(req.headers)) {
		if (value) {
			headers.set(key, Array.isArray(value) ? value.join(", ") : value);
		}
	}

	return new Request(url, {
		method: req.method,
		headers,
	});
}

const hocuspocus = new Hocuspocus({
	extensions: [new Logger()],
});

const app = new Koa();

app.use(websocket());

app.use(async (ctx, next) => {
	const ws = await ctx.ws();

	hocuspocus.handleConnection(
		ws,
		incomingMessageToRequest(ctx.req),
		// additional data (optional)
		{
			user_id: 1234,
		},
	);
});

app.listen(1234);
