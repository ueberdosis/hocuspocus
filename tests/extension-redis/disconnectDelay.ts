import { Redis } from "@hocuspocus/extension-redis";
import test from "ava";
import { newHocuspocus, redisConnectionSettings } from "../utils/index.ts";
import { retryableAssertion } from "../utils/retryableAssertion.ts";

// Long enough that waiting for it cannot be mistaken for ordinary latency.
const disconnectDelay = 3000;

const newRedisServer = (t: any, prefix: string) =>
	newHocuspocus(t, {
		extensions: [
			new Redis({
				...redisConnectionSettings,
				prefix,
				disconnectDelay,
			}),
		],
	});

test("does not delay a direct connection when no other instance has the document", async (t) => {
	const server = await newRedisServer(
		t,
		`extension-redis/disconnectDelay-solo-${crypto.randomUUID()}`,
	);

	const direct = await server.openDirectConnection("solo-doc");
	await direct.transact((doc) => {
		doc.getMap("config").set("foo", "bar");
	});

	const start = Date.now();
	await direct.disconnect();
	await retryableAssertion(t, (tt) => {
		tt.false(server.documents.has("solo-doc"));
	});

	t.true(
		Date.now() - start < disconnectDelay,
		"the store and the unload should not wait for absent peers",
	);
});

test("delays a direct connection until another instance that has the document syncs", async (t) => {
	const prefix = `extension-redis/disconnectDelay-peer-${crypto.randomUUID()}`;
	const server = await newRedisServer(t, prefix);
	const anotherServer = await newRedisServer(t, prefix);

	const held = await anotherServer.openDirectConnection("shared-doc");

	const direct = await server.openDirectConnection("shared-doc");
	await direct.transact((doc) => {
		doc.getMap("config").set("foo", "bar");
	});

	const start = Date.now();
	await direct.disconnect();

	t.true(Date.now() - start >= disconnectDelay);
	t.is(
		anotherServer.documents.get("shared-doc")?.getMap("config").get("foo"),
		"bar",
	);

	await held.disconnect();
});
