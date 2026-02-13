import { Redis } from "@hocuspocus/extension-redis";
import test from "ava";
import {
	newHocuspocus,
	newHocuspocusProvider,
	redisConnectionSettings,
} from "../utils/index.ts";

test("syncs broadcast event between servers and clients", async (t) => {
	const redisPrefix = crypto.randomUUID();

	await new Promise(async (resolve) => {
		const eventType = "test-event";
		const eventPayload = { message: "hello" };
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

		// Once we're setup make an edit on anotherProvider. To get to the provider it will need
		// to pass through Redis:
		// provider -> server -> Redis -> anotherServer -> anotherProvider

		// Wait for an event to confirm whether another provider has the same payload.
		newHocuspocusProvider(anotherServer, {
			onEvent: ({ type, payload }) => {
				t.is(type, eventType);
				t.deepEqual(payload, eventPayload);
				t.pass();
				resolve("done");
			},
			onSynced() {
				// Once the initial data is synced, send an event
				newHocuspocusProvider(server, {
					onSynced() {
						server.documents
							.get("hocuspocus-test")
							?.broadcastEvent(eventType, eventPayload);
					},
				});
			},
		});
	});
});

test("client command messages shouldnt propagate to other server", async (t) => {
	const redisPrefix = crypto.randomUUID();

	await new Promise(async (resolve) => {
		const commandType = "test-command";
		const commandPayload = { data: "test" };
		const server = await newHocuspocus({
			extensions: [
				new Redis({
					...redisConnectionSettings,
					identifier: `server${crypto.randomUUID()}`,
					prefix: redisPrefix,
				}),
			],
			async onCommand({ type, payload }) {
				t.is(commandType, type);
				t.deepEqual(commandPayload, payload);
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
			async onCommand() {
				console.log("failed");
				t.fail();
			},
		});

		const provider = newHocuspocusProvider(server, {
			onSynced() {
				provider.sendCommand(commandType, commandPayload);
			},
		});
	});
});

test("server client event messages shouldnt propagate to other client", async (t) => {
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
			async onCommand({ connection, document }) {
				connection.sendEvent("response", { text: "test123" });
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
			async onCommand() {
				t.fail();
			},
		});

		const provider2 = newHocuspocusProvider(anotherServer, {
			onEvent() {
				t.fail();
			},
		});

		const provider = newHocuspocusProvider(server, {
			onSynced() {
				provider.sendCommand("request", { data: "ok" });
			},
			onEvent() {
				t.pass();
			},
		});

		setTimeout(() => {
			resolve("done");
		}, 500);
	});
});
