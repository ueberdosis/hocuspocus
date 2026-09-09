import { Redis } from "@hocuspocus/extension-redis";
import { IncomingMessage, MessageType } from "@hocuspocus/server";
import test from "ava";
import {
	newHocuspocus,
	redisConnectionSettings,
	sleep,
} from "../utils/index.ts";

const newRedisServer = async (t: any, prefix: string, identifier: string) => {
	const extension = new Redis({
		...redisConnectionSettings,
		identifier: `${identifier}-${crypto.randomUUID()}`,
		prefix,
		disconnectDelay: 100,
	});

	const server = await newHocuspocus(t, { extensions: [extension] });

	return { server, extension };
};

/** Simulate lost pub/sub delivery: stop feeding inbound messages to the extension. */
const silence = (extension: Redis) => {
	const sub = (extension as any).sub;
	const handler = (extension as any).handleIncomingMessage;
	sub.removeListener("messageBuffer", handler);

	return () => sub.on("messageBuffer", handler);
};

test("a SyncStep2 computed for another instance must not truncate a stale bystander", async (t) => {
	const prefix = `extension-redis/crossInstanceSyncStep2-${crypto.randomUUID()}`;
	const docName = "poison";

	const a = await newRedisServer(t, prefix, "serverA");
	const b = await newRedisServer(t, prefix, "serverB");
	const c = await newRedisServer(t, prefix, "serverC");

	const directA = await a.server.openDirectConnection(docName);
	const directB = await b.server.openDirectConnection(docName);
	const directC = await c.server.openDirectConnection(docName);

	// All three instances hold the document and agree on "OLD".
	await directA.transact((doc) => {
		doc.getText("t").insert(0, "OLD");
	});
	await sleep(500);

	t.is(directA.document!.getText("t").toString(), "OLD", "A starts at OLD");
	t.is(directB.document!.getText("t").toString(), "OLD", "B starts at OLD");
	t.is(directC.document!.getText("t").toString(), "OLD", "C starts at OLD");

	// A misses the rewrite (Redis pub/sub is fire-and-forget, so a dropped
	// message, a reconnect, or a busy process all produce this).
	const unsilence = silence(a.extension);

	await directB.transact((doc) => {
		const text = doc.getText("t");
		text.delete(0, text.length);
		text.insert(0, "NEW");
	});
	await sleep(500);

	t.is(directB.document!.getText("t").toString(), "NEW", "B rewrote to NEW");
	t.is(directC.document!.getText("t").toString(), "NEW", "C received NEW");
	t.is(directA.document!.getText("t").toString(), "OLD", "A is stale at OLD");

	unsilence();

	// Record every state A's document passes through from here on.
	const seen: string[] = [];
	directA.document!.on("update", () => {
		seen.push(directA.document!.getText("t").toString());
	});

	// Any change on C publishes a SyncStep1 with C's (up-to-date) state vector.
	// B answers it with SyncStep2 = encodeStateAsUpdate(B, C.sv) — zero structs
	// plus the full delete set — on the shared document channel, where A also
	// hears it.
	await directC.transact((doc) => {
		doc.getMap("noise").set("k", 1);
	});
	await sleep(500);

	t.log("states A passed through:", JSON.stringify(seen));
	t.log("A final:", JSON.stringify(directA.document!.getText("t").toString()));

	t.false(
		seen.includes(""),
		"A must never observe an empty document: it would broadcast that to its own clients and can persist it",
	);

	await directA.disconnect();
	await directB.disconnect();
	await directC.disconnect();
});

/** `messageYjsSyncStep2` from y-protocols/sync, which is not resolvable here. */
const SYNC_STEP_2 = 1;

test("sync replies are published to the requester's reply channel only", async (t) => {
	const prefix = `extension-redis/syncStep2Routing-channel-${crypto.randomUUID()}`;
	const docName = "routing";

	const identifierA = `serverA-${crypto.randomUUID()}`;
	const extensionA = new Redis({
		...redisConnectionSettings,
		identifier: identifierA,
		prefix,
		disconnectDelay: 100,
	});
	const serverA = await newHocuspocus(t, { extensions: [extensionA] });

	const b = await newRedisServer(t, prefix, "serverB");

	const published: Array<{ channel: string; syncType?: number }> = [];
	const publisher = (b.extension as any).pub;
	const original = publisher.publish.bind(publisher);

	publisher.publish = (channel: string, payload: Buffer) => {
		const [, messageBuffer] = (b.extension as any).decodeMessage(payload);
		const message = new IncomingMessage(messageBuffer);

		message.readVarString(); // document name

		const type = message.readVarUint();

		published.push({
			channel,
			syncType:
				type === MessageType.Sync || type === MessageType.SyncReply
					? message.readVarUint()
					: undefined,
		});

		return original(channel, payload);
	};

	// B holds the document with state that only lives in its memory.
	const directB = await b.server.openDirectConnection(docName);
	await directB.transact((doc) => {
		doc.getText("t").insert(0, "hello");
	});
	await sleep(300);
	published.length = 0;

	// A loads the same document, so B has to answer A's SyncStep1.
	const directA = await serverA.openDirectConnection(docName);
	await sleep(300);

	t.is(directA.document!.getText("t").toString(), "hello", "A synced from B");

	const replies = published.filter((entry) => entry.syncType === SYNC_STEP_2);

	t.true(replies.length > 0, "B answered with its state");

	for (const reply of replies) {
		t.is(reply.channel, `${prefix}#reply:${identifierA}`);
	}

	t.false(
		published.some(
			(entry) =>
				entry.channel === `${prefix}:${docName}` &&
				entry.syncType === SYNC_STEP_2,
		),
		"no state is published on the shared document channel",
	);

	await directA.disconnect();
	await directB.disconnect();
});
