import { Logger } from "@hocuspocus/extension-logger";
import { Hocuspocus } from "@hocuspocus/server";
// @ts-nocheck
import Koa from "koa";
import websocket from "koa-easy-ws";

const hocuspocus = new Hocuspocus({
	extensions: [new Logger()],
});

const app = new Koa();

app.use(websocket());

app.use(async (ctx, next) => {
	const ws = await ctx.ws();

	hocuspocus.handleConnection(
		ws,
		ctx.request,
		// additional data (optional)
		{
			user_id: 1234,
		},
	);
});

app.listen(1234);
