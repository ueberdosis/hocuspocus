// @ts-nocheck - Deno types not installed
import { Hocuspocus } from "@hocuspocus/server";
const hocuspocus = new Hocuspocus({
	name: "collaboration",
});

// @ts-ignore
Deno.serve((req) => {
	if (req.headers.get("upgrade") !== "websocket") {
		return new Response(null, { status: 501 });
	}

	// @ts-ignore
	const { socket, response } = Deno.upgradeWebSocket(req);

	socket.binaryType = "arraybuffer";

	// @ts-ignore
	socket.addEventListener("open", (_event) => {
		hocuspocus.handleConnection(socket, req);
	});

	return response;
});
