import { Redis } from "@hocuspocus/extension-redis";
import type { onAwarenessChangeParameters } from "@hocuspocus/provider";
import test from "ava";
import {
	newHocuspocus,
	newHocuspocusProvider,
	redisConnectionSettings,
} from "../utils/index.ts";

test("syncs existing awareness state", async (t) => {
	const documentName = `test-${crypto.randomUUID()}`;

	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
			extensions: [
				new Redis({
					...redisConnectionSettings,
					identifier: `server${crypto.randomUUID()}`,
				}),
			],
		});

		const anotherServer = await newHocuspocus({
			extensions: [
				new Redis({
					...redisConnectionSettings,
					identifier: `anotherServer${crypto.randomUUID()}`,
				}),
			],
		});

		const provider = newHocuspocusProvider(server, {
			name: documentName,
			onSynced() {
				// Once we're set up, change the local Awareness state.
				// The updated state then needs to go through Redis:
				// provider -> server -> Redis -> anotherServer -> anotherProvider
				provider.setAwarenessField("name", "first");

				// Time to initialize a second provider, and connect to `anotherServer`
				// to check whether existing Awareness states are synced through Redis.
				newHocuspocusProvider(anotherServer, {
					name: documentName,
					onAwarenessChange({ states }: onAwarenessChangeParameters) {
						// Wait until we have exactly 2 states with the expected data
						const state = states.find(
							(state) => state.clientId === provider.document.clientID,
						);
						if (states.length === 2 && state?.name === "first") {
							t.pass();
							resolve("done");
						}
					},
				});
			},
		});
	});
});

test("syncs awareness between servers and clients", async (t) => {
	const documentName = `test-${crypto.randomUUID()}`;

	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
			extensions: [
				new Redis({
					...redisConnectionSettings,
					identifier: `server${crypto.randomUUID()}`,
				}),
			],
		});

		const anotherServer = await newHocuspocus({
			extensions: [
				new Redis({
					...redisConnectionSettings,
					identifier: `anotherServer${crypto.randomUUID()}`,
				}),
			],
		});

		const provider = newHocuspocusProvider(anotherServer, {
			name: documentName,
			onSynced() {
				// once we're setup change awareness on provider, to get to client it will
				// need to pass through the pubsub extension:
				// provider -> anotherServer -> pubsub -> server -> client
				provider.setAwarenessField("name", "second");
			},
		});

		newHocuspocusProvider(server, {
			name: documentName,
			onAwarenessChange: ({ states }: onAwarenessChangeParameters) => {
				// Wait until we have exactly 2 states with the expected data
				const state = states.find(
					(state) => state.clientId === provider.document.clientID,
				);
				if (states.length === 2 && state?.name === "second") {
					t.pass();
					resolve("done");
				}
			},
		});
	});
});
