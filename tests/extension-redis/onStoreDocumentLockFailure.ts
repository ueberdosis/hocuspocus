import { Redis } from "@hocuspocus/extension-redis";
import type { onStoreDocumentPayload } from "@hocuspocus/server";
import test from "ava";
import { createClient } from "redis";
import { newHocuspocus, redisConnectionSettings, sleep } from "../utils/index.ts";

// Regression test for #1167: when the Redlock acquisition fails with a quorum
// ExecutionError (another instance holds the store lock, or Redis itself is
// having trouble), the remaining onStoreDocument hooks must still run, so the
// instance's changes are persisted instead of the document being unloaded
// unsaved.
test("a held store lock does not skip the remaining onStoreDocument hooks", async (t) => {
	const prefix = `extension-redis/onStoreDocumentLockFailure-${crypto.randomUUID()}`;
	const ran: string[] = [];

	class CustomStorageExtension {
		async onStoreDocument(_payload: onStoreDocumentPayload) {
			ran.push("db");
		}
	}

	const server = await newHocuspocus(t, {
		extensions: [
			new Redis({
				...redisConnectionSettings,
				identifier: `server${crypto.randomUUID()}`,
				prefix,
				disconnectDelay: 100,
			}),
			new CustomStorageExtension(),
		],
	});

	const redisClient = createClient({
		url: `redis://${redisConnectionSettings.host}:${redisConnectionSettings.port}`,
	});
	await redisClient.connect();
	t.teardown(() => redisClient.disconnect());

	const connection = await server.openDirectConnection("doc");
	await connection.transact((document) => {
		document.getMap("m").set("k", "v");
	});

	// Simulate another instance holding the store lock.
	const locked = await redisClient.set(`${prefix}:doc:lock`, "other-instance", {
		PX: 10_000,
		NX: true,
	});
	t.is(locked, "OK");

	await connection.disconnect();

	// The last close executes the scheduled store immediately; give the hooks a
	// moment to finish before asserting.
	await sleep(500);
	t.deepEqual(ran, ["db"]);
});
