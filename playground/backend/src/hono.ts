// @ts-nocheck - Hono adapter types not installed
import { Hocuspocus } from "@hocuspocus/server";
import { Hono } from "hono";

import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";

const hocuspocus = new Hocuspocus({
	// …
});

const app = new Hono();

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.get(
	"/",
	upgradeWebSocket((c) => {
		let clientConnection;
		return {
			onOpen(_evt, ws) {
				ws.raw.binaryType = "arraybuffer";
				clientConnection = hocuspocus.handleConnection(ws.raw, c.req.raw, {});
			},
			onMessage(evt) {
				clientConnection?.handleMessage(new Uint8Array(evt.data));
			},
			onClose(_evt, ws) {
				clientConnection?.handleClose();
			},
		};
	}),
);

const server = serve(
	{
		fetch: app.fetch,
		port: 8000,
	},
	(info) => {
		hocuspocus.hooks("onListen", {
			instance: hocuspocus,
			configuration: hocuspocus.configuration,
			port: info.port,
		});
	},
);

injectWebSocket(server);

console.log("Hono server is running on ws://127.0.0.1:8000");
