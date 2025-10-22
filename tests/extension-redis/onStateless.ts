import { Redis } from "@hocuspocus/extension-redis";
import test from "ava";
import {
	newHocuspocus,
	newHocuspocusProvider,
	redisConnectionSettings,
} from "../utils/index.ts";

test("syncs broadcast stateless message between servers and clients", async (t) => {
	const redisPrefix = crypto.randomUUID();

	await new Promise(async (resolve) => {
		const payloadToSend = "STATELESS-MESSAGE";
		const server = await newHocuspocus({
			extensions: [
				new Redis({
					...redisConnectionSettings,
					identifier: `server${crypto.randomUUID()}`,
					prefix: redisPrefix,
				}),
			],
		});

		const anotherServer = await newHocuspocus({
			extensions: [
				new Redis({
					...redisConnectionSettings,
					identifier: `anotherServer${crypto.randomUUID()}`,
					prefix: redisPrefix,
				}),
			],
		});

		// Once we’re setup make an edit on anotherProvider. To get to the provider it will need
		// to pass through Redis:
		// provider -> server -> Redis -> anotherServer -> anotherProvider

		// Wait for a stateless message to confirm whether another provider has the same payload.
		newHocuspocusProvider(anotherServer, {
			onStateless: ({ payload }) => {
				t.is(payload, payloadToSend);
				t.pass();
				resolve("done");
			},
			onSynced() {
				// Once the initial data is synced, send a stateless message
				newHocuspocusProvider(server, {
					onSynced() {
						server.documents
							.get("hocuspocus-test")
							?.broadcastStateless(payloadToSend);
					},
				});
			},
		});
	});
});

test("client stateless messages shouldnt propagate to other server", async (t) => {
	const redisPrefix = crypto.randomUUID();

	await new Promise(async (resolve) => {
		const payloadToSend = "STATELESS-MESSAGE";
		const server = await newHocuspocus({
			extensions: [
				new Redis({
					...redisConnectionSettings,
					identifier: `server${crypto.randomUUID()}`,
					prefix: redisPrefix,
				}),
			],
			async onStateless({ payload }) {
				t.is(payloadToSend, payload);
				t.pass();
				resolve("done");
			},
		});

		const anotherServer = await newHocuspocus({
			extensions: [
				new Redis({
					...redisConnectionSettings,
					identifier: `anotherServer${crypto.randomUUID()}`,
					prefix: redisPrefix,
				}),
			],
			async onStateless() {
				console.log("failed");
				t.fail();
			},
		});

		const provider = newHocuspocusProvider(server, {
			onSynced() {
				provider.sendStateless(payloadToSend);
			},
		});
	});
});

test("server client stateless messages shouldnt propagate to other client", async (t) => {
	await new Promise(async (resolve) => {
		const redisPrefix = crypto.randomUUID();

		const server = await newHocuspocus({
			extensions: [
				new Redis({
					...redisConnectionSettings,
					identifier: `server${crypto.randomUUID()}`,
					prefix: redisPrefix,
				}),
			],
			async onStateless({ connection, document }) {
				connection.sendStateless("test123");
			},
		});

		const anotherServer = await newHocuspocus({
			extensions: [
				new Redis({
					...redisConnectionSettings,
					identifier: `anotherServer${crypto.randomUUID()}`,
					prefix: redisPrefix,
				}),
			],
			async onStateless() {
				t.fail();
			},
		});

		const provider2 = newHocuspocusProvider(anotherServer, {
			onStateless() {
				t.fail();
			},
		});

		const provider = newHocuspocusProvider(server, {
			onSynced() {
				provider.sendStateless("ok");
			},
			onStateless() {
				t.pass();
			},
		});

		setTimeout(() => {
			resolve("done");
		}, 500);
	});
});
