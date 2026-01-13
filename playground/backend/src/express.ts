import { Logger } from "@hocuspocus/extension-logger";
import { Hocuspocus } from "@hocuspocus/server";
import type { IncomingMessage } from "node:http";
import express from "express";
import expressWebsockets from "express-ws";

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

const { app } = expressWebsockets(express());

app.get("/", (request, response) => {
	response.send("Hello World!");
});

app.ws("/", (websocket, request: any) => {
	const context = { user_id: 1234 };
	hocuspocus.handleConnection(
		websocket as unknown as WebSocket,
		incomingMessageToRequest(request),
		context,
	);
});

app.listen(1234, () => console.log("Listening on http://127.0.0.1:1234…"));
