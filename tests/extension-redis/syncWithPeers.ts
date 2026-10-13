import { Redis } from "@hocuspocus/extension-redis";
import { OutgoingMessage } from "@hocuspocus/server";
import test from "ava";
import * as Y from "yjs";
import {
	newHocuspocus,
	redisConnectionSettings,
	sleep,
} from "../utils/index.ts";

const newRedisServer = async (
	t: any,
	prefix: string,
	identifier: string,
	options = {},
) => {
	const extension = new Redis({
		...redisConnectionSettings,
		identifier: `${identifier}-${crypto.randomUUID()}`,
		prefix,
		disconnectDelay: 100,
		...options,
	});

	const server = await newHocuspocus(t, { extensions: [extension] });

	return { server, extension };
};

type RedisServer = Awaited<ReturnType<typeof newRedisServer>>;

/**
 * Hold back the messages `receiver` gets from each listed sender, as a slow or
 * busy instance would. Messages from anyone else are handled right away.
 */
const delayMessages = (
	receiver: RedisServer,
	delays: Array<[sender: RedisServer, ms: number]>,
) => {
	const sub = (receiver.extension as any).sub;
	const handler = (receiver.extension as any).handleIncomingMessage;
	const delayFor = new Map(
		delays.map(([sender, ms]) => [sender.extension.configuration.identifier, ms]),
	);

	sub.removeListener("messageBuffer", handler);
	sub.on("messageBuffer", (channel: Buffer, data: Buffer) => {
		const ms = delayFor.get(data.toString("utf-8", 1, data[0] + 1));
		if (ms === undefined) {
			handler(channel, data);
		} else {
			setTimeout(() => handler(channel, data), ms);
		}
	});
};

/** Stop feeding inbound messages to the extension at all. */
const silence = (server: RedisServer) => {
	const sub = (server.extension as any).sub;
	const handler = (server.extension as any).handleIncomingMessage;
	sub.removeListener("messageBuffer", handler);
};

const text = (direct: { document: Y.Doc | null }) =>
	direct.document!.getText("t").toString();

test("a load waits for every peer, not just the first to answer", async (t) => {
	const prefix = `extension-redis/syncWithPeers-all-${crypto.randomUUID()}`;
	const docName = "lagging-peer";

	const a = await newRedisServer(t, prefix, "writer");
	const c = await newRedisServer(t, prefix, "lagging");
	const b = await newRedisServer(t, prefix, "loader");

	const directA = await a.server.openDirectConnection(docName);
	const directC = await c.server.openDirectConnection(docName);
	await directA.transact((doc) => {
		doc.getText("t").insert(0, "OLD");
	});
	await sleep(300);
	t.is(text(directC), "OLD");

	// C hears about A's edit late, and answers B before A does, so the first
	// answer B gets is C's, which does not have the edit yet.
	delayMessages(c, [
		[a, 3000],
		[b, 100],
	]);
	delayMessages(a, [[b, 500]]);

	await directA.transact((doc) => {
		doc.getText("t").insert(3, " NEW");
	});

	const directB = await b.server.openDirectConnection(docName);

	t.is(text(directB), "OLD NEW");
});

test("a load is not released by a SyncStep2 that does not answer its SyncStep1", async (t) => {
	const prefix = `extension-redis/syncWithPeers-lone-${crypto.randomUUID()}`;
	const docName = "lone-sync-step-2";

	const a = await newRedisServer(t, prefix, "writer");
	const b = await newRedisServer(t, prefix, "loader");

	const directA = await a.server.openDirectConnection(docName);
	await directA.transact((doc) => {
		doc.getText("t").insert(0, "NEW");
	});

	delayMessages(a, [[b, 400]]);

	// A SyncStep2 from A that answers something else, e.g. a SyncReply B sent
	// while A was syncing. It was computed earlier and lacks the edit.
	const loneSyncStep2 = new OutgoingMessage(docName)
		.createSyncMessage()
		.writeUpdate(Y.encodeStateAsUpdate(new Y.Doc()))
		.toUint8Array();
	const identifier = Buffer.from(a.extension.configuration.identifier);
	const injected = sleep(100).then(() =>
		(a.extension as any).pub.publish(
			`${prefix}#reply:${b.extension.configuration.identifier}`,
			Buffer.concat([
				Buffer.from([identifier.length]),
				identifier,
				Buffer.from(loneSyncStep2),
			]),
		),
	);

	const directB = await b.server.openDirectConnection(docName);
	await injected;

	t.is(text(directB), "NEW");
});

test("syncWithPeers catches a loaded document up with an edit made elsewhere", async (t) => {
	const prefix = `extension-redis/syncWithPeers-warm-${crypto.randomUUID()}`;
	const docName = "warm";

	const a = await newRedisServer(t, prefix, "writer");
	const b = await newRedisServer(t, prefix, "reader");

	const directA = await a.server.openDirectConnection(docName);
	const directB = await b.server.openDirectConnection(docName);
	await directA.transact((doc) => {
		doc.getText("t").insert(0, "OLD");
	});
	await sleep(300);
	t.is(text(directB), "OLD");

	delayMessages(b, [[a, 500]]);

	await directA.transact((doc) => {
		doc.getText("t").insert(3, " NEW");
	});
	t.is(text(directB), "OLD", "B has not heard about the edit yet");

	await b.extension.syncWithPeers(docName, directB.document!);

	t.is(text(directB), "OLD NEW");
});

test("syncWithPeers returns right away when no other instance holds the document", async (t) => {
	const prefix = `extension-redis/syncWithPeers-solo-${crypto.randomUUID()}`;
	const b = await newRedisServer(t, prefix, "solo", {
		awaitInitialSyncTimeout: 5000,
	});

	const direct = await b.server.openDirectConnection("solo");

	const start = Date.now();
	await b.extension.syncWithPeers("solo", direct.document!);

	t.true(Date.now() - start < 1000, `took ${Date.now() - start}ms`);
});

test("concurrent syncWithPeers calls on one document do not hold each other up", async (t) => {
	const prefix = `extension-redis/syncWithPeers-concurrent-${crypto.randomUUID()}`;
	const docName = "concurrent";

	const a = await newRedisServer(t, prefix, "peer");
	const b = await newRedisServer(t, prefix, "reader", {
		awaitInitialSyncTimeout: 5000,
	});

	await a.server.openDirectConnection(docName);
	const direct = await b.server.openDirectConnection(docName);

	const start = Date.now();
	await Promise.all([
		b.extension.syncWithPeers(docName, direct.document!),
		b.extension.syncWithPeers(docName, direct.document!),
		b.extension.syncWithPeers(docName, direct.document!),
	]);

	t.true(Date.now() - start < 1000, `took ${Date.now() - start}ms`);
});

test("syncWithPeers gives up after awaitInitialSyncTimeout when a peer does not answer", async (t) => {
	const prefix = `extension-redis/syncWithPeers-timeout-${crypto.randomUUID()}`;
	const docName = "unresponsive";

	const a = await newRedisServer(t, prefix, "unresponsive");
	const b = await newRedisServer(t, prefix, "reader", {
		awaitInitialSyncTimeout: 300,
	});

	await a.server.openDirectConnection(docName);
	const direct = await b.server.openDirectConnection(docName);
	silence(a);

	const start = Date.now();
	await b.extension.syncWithPeers(docName, direct.document!);
	const elapsed = Date.now() - start;

	t.true(elapsed >= 250 && elapsed < 2000, `took ${elapsed}ms`);
});
