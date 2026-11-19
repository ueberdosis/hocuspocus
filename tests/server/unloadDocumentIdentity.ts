import test from "ava";
import * as Y from "yjs";
import type { HocuspocusProvider } from "@hocuspocus/provider";
import { Hocuspocus } from "@hocuspocus/server";
import {
	newHocuspocus,
	newHocuspocusProvider,
	newHocuspocusProviderWebsocket,
	sleep,
} from "../utils/index.ts";

const synced = (provider: HocuspocusProvider) =>
	new Promise<void>((resolve) => provider.on("synced", () => resolve()));

test("a late unload of a direct connection's document leaves the reloaded instance registered", async (t) => {
	const stored = new Map<string, Uint8Array>();
	let afterUnloadCalls = 0;

	const hocuspocus = new Hocuspocus({
		quiet: true,
		async onLoadDocument({ documentName, document }) {
			const state = stored.get(documentName);
			if (state) Y.applyUpdate(document, state);
			return document;
		},
		async onStoreDocument({ documentName, document }) {
			stored.set(documentName, Y.encodeStateAsUpdate(document));
		},
		async afterUnloadDocument() {
			afterUnloadCalls++;
		},
	});

	// disconnect() stores and unloads at once, and the store also queues a
	// 0 ms unload for the same instance
	const seed = await hocuspocus.openDirectConnection("hocuspocus-test", {});
	const first = seed.document;
	await seed.transact((doc) => doc.getMap("data").set("seed", true));
	await seed.disconnect();
	t.false(hocuspocus.documents.has("hocuspocus-test"));

	// load the document again before the queued unload runs
	const second = await hocuspocus.createDocument(
		"hocuspocus-test",
		new Request("http://example.test"),
		"listener",
		{ isAuthenticated: true, readOnly: false },
		{},
	);
	t.not(second, first);
	second.addConnection({ messageAddress: "hocuspocus-test", send() {} } as any);

	await sleep(20);

	t.is(hocuspocus.documents.get("hocuspocus-test"), second);
	t.false(second.isDestroyed);
	t.is(afterUnloadCalls, 1);
});

test("a late close callback of a slow onDisconnect leaves the reloaded instance registered", async (t) => {
	let afterUnloadCalls = 0;

	const server = await newHocuspocus(t, {
		async onDisconnect({ requestParameters }) {
			if (requestParameters.get("slow")) await sleep(300);
		},
		async afterUnloadDocument() {
			afterUnloadCalls++;
		},
	});

	const slowSocket = newHocuspocusProviderWebsocket(t, server, {
		url: `${server.server!.webSocketURL}?slow=1`,
	} as any);
	const slow = newHocuspocusProvider(t, server, {}, {}, slowSocket);
	const fast = newHocuspocusProvider(t, server);
	await Promise.all([synced(slow), synced(fast)]);
	const first = server.documents.get("hocuspocus-test");

	// the slow client leaves first, its onDisconnect is still running when the
	// fast client leaves and unloads the document
	slow.configuration.websocketProvider.destroy();
	await sleep(50);
	fast.configuration.websocketProvider.destroy();
	await sleep(50);
	t.false(server.documents.has("hocuspocus-test"));

	const reconnected = newHocuspocusProvider(t, server);
	await synced(reconnected);
	const second = server.documents.get("hocuspocus-test");
	t.truthy(second);
	t.not(second, first);

	// the slow onDisconnect finishes and its close callback unloads `first`
	await sleep(350);

	t.is(server.documents.get("hocuspocus-test"), second);
	t.is(second!.getConnectionsCount(), 1);
	t.is(afterUnloadCalls, 1);
});

test("destroys the instance without unloading the name when it was replaced during beforeUnloadDocument", async (t) => {
	let afterUnloadCalls = 0;
	let replacement: any;

	const hocuspocus = new Hocuspocus({
		quiet: true,
		async beforeUnloadDocument({ instance, documentName }) {
			replacement = new Y.Doc();
			instance.documents.set(documentName, replacement);
		},
		async afterUnloadDocument() {
			afterUnloadCalls++;
		},
	});

	const connection = await hocuspocus.openDirectConnection("hocuspocus-test", {});
	const document = connection.document!;
	await connection.disconnect();
	await sleep(20);

	t.true(document.isDestroyed);
	t.is(hocuspocus.documents.get("hocuspocus-test"), replacement);
	t.is(afterUnloadCalls, 0);
});
