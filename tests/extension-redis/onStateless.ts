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
		const server = await newHocuspocus(t, {
			extensions: [
				new Redis({
					...redisConnectionSettings,
					identifier: `server${crypto.randomUUID()}`,
					prefix: redisPrefix,
				}),
			],
		});

		const anotherServer = await newHocuspocus(t, {
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
		newHocuspocusProvider(t, anotherServer, {
			onStateless: ({ payload }) => {
				t.is(payload, payloadToSend);
				t.pass();
				resolve("done");
			},
			onSynced() {
				// Once the initial data is synced, send a stateless message
				newHocuspocusProvider(t, server, {
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
		const server = await newHocuspocus(t, {
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

		const anotherServer = await newHocuspocus(t, {
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

		const provider = newHocuspocusProvider(t, server, {
			onSynced() {
				provider.sendStateless(payloadToSend);
			},
		});
	});
});

test("server client stateless messages shouldnt propagate to other client", async (t) => {
	const redisPrefix = crypto.randomUUID();
	const response = "test123";
	const barrier = "redis-barrier";
	const remotePayloads: string[] = [];

	let resolveResponse: () => void;
	const responseReceived = new Promise<void>((resolve) => {
		resolveResponse = resolve;
	});
	let resolveRemoteSynced: () => void;
	const remoteSynced = new Promise<void>((resolve) => {
		resolveRemoteSynced = resolve;
	});
	let resolveRemoteBarrier: () => void;
	const remoteBarrierReceived = new Promise<void>((resolve) => {
		resolveRemoteBarrier = resolve;
	});
	let resolveSenderSynced: () => void;
	const senderSynced = new Promise<void>((resolve) => {
		resolveSenderSynced = resolve;
	});

	const server = await newHocuspocus(t, {
		extensions: [
			new Redis({
				...redisConnectionSettings,
				identifier: `server${crypto.randomUUID()}`,
				prefix: redisPrefix,
			}),
		],
		async onStateless({ connection }) {
			connection.sendStateless(response);
		},
	});

	const anotherServer = await newHocuspocus(t, {
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

	newHocuspocusProvider(t, anotherServer, {
		onSynced() {
			resolveRemoteSynced();
		},
		onStateless({ payload }) {
			if (payload === barrier) {
				resolveRemoteBarrier();
				return;
			}
			remotePayloads.push(payload);
		},
	});

	const provider = newHocuspocusProvider(t, server, {
		onSynced() {
			resolveSenderSynced();
		},
		onStateless({ payload }) {
			if (payload === response) {
				resolveResponse();
			}
		},
	});

	await Promise.all([remoteSynced, senderSynced]);
	provider.sendStateless("ok");
	await responseReceived;

	const document = server.documents.get("hocuspocus-test");
	if (!document) {
		throw new Error("Expected the document to be loaded");
	}
	// Redis preserves publish order, so receiving this broadcast proves any
	// accidental propagation of the earlier response has already arrived.
	document.broadcastStateless(barrier);
	await remoteBarrierReceived;

	t.deepEqual(remotePayloads, []);
});
