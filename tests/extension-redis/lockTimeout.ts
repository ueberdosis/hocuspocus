import { Redis } from "@hocuspocus/extension-redis";
import test from "ava";
import { createClient } from "redis";
import { newHocuspocus, redisConnectionSettings } from "../utils/index.ts";

// Holds the store lock of a document the way another instance storing it
// would, so the instance under test cannot acquire it.
const holdStoreLock = async (prefix: string, documentName: string) => {
	const client = createClient({
		url: `redis://${redisConnectionSettings.host}:${redisConnectionSettings.port}`,
	});
	await client.connect();
	await client.set(`${prefix}:${documentName}:lock`, "another-instance", {
		NX: true,
		PX: 10_000,
	});
	await client.quit();
};

const storeWhileLockIsHeld = async (t: any, options = {}) => {
	const prefix = `extension-redis/lockTimeout-${crypto.randomUUID()}`;
	const documentName = "locked-doc";
	let stores = 0;

	const server = await newHocuspocus(t, {
		extensions: [
			new Redis({
				...redisConnectionSettings,
				prefix,
				disconnectDelay: 0,
				...options,
			}),
			{
				async onStoreDocument() {
					stores += 1;
				},
			},
		],
	});

	await holdStoreLock(prefix, documentName);

	const direct = await server.openDirectConnection(documentName);
	await direct.transact((doc) => {
		doc.getMap("config").set("foo", "bar");
	});
	await direct.disconnect();

	return stores;
};

test("skips the store while another instance holds the lock", async (t) => {
	t.is(await storeWhileLockIsHeld(t), 0);
});

test("stores without taking the lock when lockTimeout is 0", async (t) => {
	t.is(await storeWhileLockIsHeld(t, { lockTimeout: 0 }), 1);
});
