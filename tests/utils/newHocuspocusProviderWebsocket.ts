import type { ExecutionContext } from "ava";
import type { HocuspocusProviderWebsocketConfiguration } from "@hocuspocus/provider";
import { HocuspocusProviderWebsocket } from "@hocuspocus/provider";
import type { Hocuspocus } from "@hocuspocus/server";

export const newHocuspocusProviderWebsocket = (
	t: ExecutionContext,
	hocuspocus: Hocuspocus,
	options: Partial<Omit<HocuspocusProviderWebsocketConfiguration, "url">> = {},
) => {
	const ws = new HocuspocusProviderWebsocket({
		// We don't need which port the server is running on, but
		// we can get the URL from the passed server instance.
		url: hocuspocus.server!.webSocketURL,
		// Node.js 22+ has native WebSocket support
		...options,
	});

	t.teardown(() => ws.destroy());

	return ws;
};
