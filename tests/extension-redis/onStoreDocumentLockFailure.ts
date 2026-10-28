import { SkipFurtherHooksError } from "@hocuspocus/common";
import { Redis } from "@hocuspocus/extension-redis";
import type { onStoreDocumentPayload } from "@hocuspocus/server";
import test from "ava";
import { createClient } from "redis";
import sinon from "sinon";
import { newHocuspocus, redisConnectionSettings } from "../utils/index.ts";

async function setup(t: Parameters<typeof newHocuspocus>[0]) {
	const prefix = `extension-redis/onStoreDocumentLockFailure-${crypto.randomUUID()}`;
	const ran: string[] = [];
	const redis = new Redis({
		...redisConnectionSettings,
		prefix,
		disconnectDelay: 0,
	});
	t.teardown(() => {
		redis.pub.disconnect();
		redis.sub.disconnect();
	});
	const server = await newHocuspocus(t, {
		extensions: [redis],
		onStoreDocument: async () => {
			ran.push("db");
		},
	});
	const connection = await server.openDirectConnection("doc");
	if (!connection.document) {
		throw new Error("document not loaded");
	}
	const payload: onStoreDocumentPayload = {
		documentName: "doc",
		document: connection.document,
		instance: server,
		clientsCount: 1,
		lastContext: {},
		lastTransactionOrigin: undefined,
	};
	return { redis, server, prefix, ran, payload };
}

// Regression for #1167: a reachable Redis must still enforce the store lock.
test("a held store lock skips the remaining store hooks", async (t) => {
	const { server, prefix, ran, payload } = await setup(t);
	const client = createClient({
		url: `redis://${redisConnectionSettings.host}:${redisConnectionSettings.port}`,
	});
	await client.connect();
	t.teardown(() => client.disconnect());
	t.is(
		await client.set(`${prefix}:doc:lock`, "other-instance", {
			PX: 10_000,
			NX: true,
		}),
		"OK",
	);
	await t.throwsAsync(server.hooks("onStoreDocument", payload), {
		instanceOf: SkipFurtherHooksError,
	});
	t.deepEqual(ran, []);
});

test("unavailable Redis allows the remaining store hooks to run", async (t) => {
	const { redis, server, ran, payload } = await setup(t);
	redis.pub.disconnect();
	await server.hooks("onStoreDocument", payload);
	t.deepEqual(ran, ["db"]);
	t.is(redis.locks.size, 0);
});

test("an acquired store lock is kept until afterStoreDocument", async (t) => {
	const { redis, server, ran, payload } = await setup(t);
	await server.hooks("onStoreDocument", payload);
	t.deepEqual(ran, ["db"]);
	t.is(redis.locks.size, 1);
	await redis.afterStoreDocument(payload);
	t.is(redis.locks.size, 0);
});

test("Redis command errors do not bypass the store lock", async (t) => {
	const { redis, server, ran, payload } = await setup(t);
	const command = sinon
		.stub(redis.pub, "sendCommand")
		.rejects(new Error("NOPERM"));
	t.teardown(() => command.restore());
	await t.throwsAsync(server.hooks("onStoreDocument", payload), {
		name: "ExecutionError",
	});
	t.deepEqual(ran, []);
});

test("unexpected lock errors propagate without running later hooks", async (t) => {
	const { redis, server, ran, payload } = await setup(t);
	const error = new Error("unexpected lock error");
	const acquire = sinon.stub(redis.redlock, "acquire").rejects(error);
	t.teardown(() => acquire.restore());
	await t.throwsAsync(server.hooks("onStoreDocument", payload), {
		is: error,
	});
	t.deepEqual(ran, []);
});
