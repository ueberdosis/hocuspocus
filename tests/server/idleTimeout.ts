import test from "ava";
// @ts-expect-error -- ws ships no type declarations; used only as the client polyfill.
import WebSocket from "ws";
import {
	newHocuspocus,
	newHocuspocusProvider,
	newHocuspocusProviderWebsocket,
	sleep,
} from "../utils/index.ts";

// Regression test for #1171: since 4.0.0 (crossws), only messages counted as
// activity, so a healthy client that sends nothing (e.g. awareness disabled)
// was closed with 4408 even though it kept answering pings.
test("idle timeout does not close a connection that keeps sending pongs", async (t) => {
	const server = await newHocuspocus(t, { timeout: 500 });

	const websocketProvider = newHocuspocusProviderWebsocket(t, server, {
		WebSocketPolyfill: WebSocket,
	});
	const provider = newHocuspocusProvider(
		t,
		server,
		{ awareness: null },
		{},
		websocketProvider,
	);

	let closeCode: number | undefined;
	websocketProvider.on("close", ({ event }: { event: { code: number } }) => {
		closeCode = event.code;
	});

	await new Promise<void>((resolve) => provider.on("synced", resolve));

	// Send nothing but (unsolicited) pongs. Without counting pongs as
	// activity the connection is closed with 4408 at the second check,
	// once the initial handshake messages age past the timeout.
	await sleep(400);
	(websocketProvider.webSocket as unknown as { pong: () => void }).pong();
	await sleep(400);
	(websocketProvider.webSocket as unknown as { pong: () => void }).pong();
	await sleep(400);

	t.is(closeCode, undefined);
	t.true(provider.isSynced);
});

test("idle timeout still closes a connection that sends nothing", async (t) => {
	const server = await newHocuspocus(t, { timeout: 300 });

	const websocketProvider = newHocuspocusProviderWebsocket(t, server, {
		WebSocketPolyfill: WebSocket,
	});
	newHocuspocusProvider(t, server, { awareness: null }, {}, websocketProvider);

	const closeCode: number | undefined = await new Promise((resolve) => {
		websocketProvider.on("close", ({ event }: { event: { code: number } }) =>
			resolve(event.code),
		);
	});

	t.is(closeCode, 4408);
});
