import { Redis } from "@hocuspocus/extension-redis";
import test from "ava";
import { newHocuspocus, redisConnectionSettings, sleep } from "../utils/index.ts";

const newRedisServer = (t: any, prefix: string, identifier: string, options = {}) =>
	newHocuspocus(t, {
		extensions: [
			new Redis({
				...redisConnectionSettings,
				identifier: `${identifier}${crypto.randomUUID()}`,
				prefix,
				// Keep teardown quick — these delays are unrelated to load-time sync.
				disconnectDelay: 100,
				...options,
			}),
		],
	});

test("direct connection on a second instance sees edits that only live in another instance's memory", async (t) => {
	const prefix = `extension-redis/openDirectConnection-${crypto.randomUUID()}`;

	const serverA = await newRedisServer(t, prefix, "serverA");
	const serverB = await newRedisServer(t, prefix, "serverB");

	// Open + modify the document on server A and keep the connection open so the
	// document stays in memory on A and is never persisted to storage. The only
	// way server B can learn about this edit is via the Redis sync handshake.
	const directA = await serverA.openDirectConnection("sync-on-open");
	await directA.transact((doc) => {
		doc.getMap("config").set("foo", "bar");
	});

	// Open a direct connection on server B and read immediately. Without an
	// inbound-sync wait in afterLoadDocument, B only has the (empty) state it
	// loaded from storage, so this read sees `undefined`.
	const directB = await serverB.openDirectConnection("sync-on-open");

	let seenValue: unknown;
	await directB.transact((doc) => {
		seenValue = doc.getMap("config").get("foo");
	});

	t.is(seenValue, "bar");

	await directB.disconnect();
	await directA.disconnect();
});

test("openDirectConnection on a single instance does not stall waiting for absent peers", async (t) => {
	const prefix = `extension-redis/openDirectConnection-solo-${crypto.randomUUID()}`;

	// A generous sync timeout: if presence detection is broken and we wait for
	// peers that don't exist, this load would take ~5s instead of being instant.
	const server = await newRedisServer(t, prefix, "solo", {
		awaitInitialSyncTimeout: 5000,
	});

	const start = Date.now();
	const direct = await server.openDirectConnection("solo-doc");
	const elapsed = Date.now() - start;

	t.true(
		elapsed < 2000,
		`openDirectConnection should not block on absent peers (took ${elapsed}ms)`,
	);

	await direct.transact((doc) => {
		doc.getMap("config").set("foo", "bar");
	});
	t.is(direct.document?.getMap("config").get("foo"), "bar");

	await direct.disconnect();
	await sleep(50);
});
