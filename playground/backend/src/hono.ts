// @ts-nocheck - Hono adapter types not installed
import { Hocuspocus } from "@hocuspocus/server";
import { Hono } from "hono";

// Node.js specific
import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";

// Configure Hocuspocus
const hocuspocus = new Hocuspocus({
	// …
});

// Setup Hono server
const app = new Hono();

// Node.js specific
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// We mount HocusPocus in the Hono server
app.get(
	"/",
	upgradeWebSocket((c) => ({
		onOpen(_evt, ws) {
			// @ts-ignore
			hocuspocus.handleConnection(ws.raw, c.req.raw, {});
		},
	})),
);

// Start server
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

// Setup WebSocket support (Node.js specific)
injectWebSocket(server);

console.log("Hono server is running on ws://127.0.0.1:8787/hocuspocus");
