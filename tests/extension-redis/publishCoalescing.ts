import { Redis } from "@hocuspocus/extension-redis";
import test from "ava";
import {
	newHocuspocus,
	newHocuspocusProvider,
	redisConnectionSettings,
	sleep,
} from "../utils/index.ts";
import { retryableAssertion } from "../utils/retryableAssertion.ts";

/**
 * Counts what actually reaches Redis by wrapping the extension's publisher.
 */
const countingRedis = () => {
	const extension = new Redis({
		...redisConnectionSettings,
		identifier: `server${crypto.randomUUID()}`,
	});

	const publisher = (extension as any).pub;
	const original = publisher.publish.bind(publisher);
	let published = 0;

	publisher.publish = (...args: any[]) => {
		published += 1;

		return original(...args);
	};

	return { extension, publishCount: () => published, reset: () => (published = 0) };
};

test("coalesces a burst of changes into a single publish", async (t) => {
	const redis = countingRedis();
	const server = await newHocuspocus(t, { extensions: [redis.extension] });

	const provider = newHocuspocusProvider(t, server, {
		name: "redis-coalescing",
		awareness: null,
	});

	await new Promise((resolve) => provider.on("synced", () => resolve("done")));
	await sleep(300);
	redis.reset();

	const map = provider.document.getMap("test");
	for (let i = 0; i < 20; i += 1) {
		map.set(`key-${i}`, i);
	}

	await sleep(500);

	// Without coalescing this is exactly one SyncStep1 publish per change, so 20.
	// With it the whole burst collapses to 1; the bound allows 2 in case the
	// provider's frames land across two poll phases under load.
	t.true(
		redis.publishCount() <= 2,
		`expected the burst to collapse, got ${redis.publishCount()} publishes`,
	);
});

test("a failing sync publish does not swallow the awareness publish", async (t) => {
	const extension = new Redis({
		...redisConnectionSettings,
		identifier: `server${crypto.randomUUID()}`,
	});

	const server = await newHocuspocus(t, { extensions: [extension] });
	const provider = newHocuspocusProvider(t, server, {
		name: "redis-publish-failure",
	});

	await new Promise((resolve) => provider.on("synced", () => resolve("done")));
	await sleep(300);

	// Fail only the sync step; the awareness publish that shares the same turn
	// has to go out regardless.
	const publisher = (extension as any).pub;
	const original = publisher.publish.bind(publisher);
	const published: Uint8Array[] = [];

	publisher.publish = (key: string, payload: any) => {
		published.push(payload);

		if (published.length === 1) {
			return Promise.reject(new Error("redis is down"));
		}

		return original(key, payload);
	};

	provider.document.getMap("test").set("a", 1);
	provider.setAwarenessField("user", "jan");

	await sleep(500);

	t.is(published.length, 2);
});

test("a coalesced burst still reaches another instance", async (t) => {
	const server = await newHocuspocus(t, {
		extensions: [
			new Redis({
				...redisConnectionSettings,
				identifier: `server${crypto.randomUUID()}`,
			}),
		],
	});

	const anotherServer = await newHocuspocus(t, {
		extensions: [
			new Redis({
				...redisConnectionSettings,
				identifier: `anotherServer${crypto.randomUUID()}`,
			}),
		],
	});

	const provider = newHocuspocusProvider(t, server, {
		name: "redis-coalescing-sync",
		awareness: null,
	});
	const anotherProvider = newHocuspocusProvider(t, anotherServer, {
		name: "redis-coalescing-sync",
		awareness: null,
	});

	await new Promise((resolve) =>
		anotherProvider.on("synced", () => resolve("done")),
	);

	const map = provider.document.getMap("test");
	for (let i = 0; i < 20; i += 1) {
		map.set(`key-${i}`, i);
	}

	// Every change of the collapsed burst has to arrive, not just the last one.
	await retryableAssertion(t, (tt) => {
		const received = anotherProvider.document.getMap("test");

		for (let i = 0; i < 20; i += 1) {
			tt.is(received.get(`key-${i}`), i);
		}
	});
});
