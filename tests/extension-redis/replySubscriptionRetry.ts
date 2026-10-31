import { Redis } from "@hocuspocus/extension-redis";
import test from "ava";
import { newHocuspocus, redisConnectionSettings } from "../utils/index.ts";

test("a failed reply-channel subscribe is retried on the next document load", async (t) => {
	const prefix = `extension-redis/replySubscriptionRetry-${crypto.randomUUID()}`;
	let failNextReplySubscribe = true;

	// Only used to get an ioredis client without depending on ioredis here.
	const template = new Redis({ ...redisConnectionSettings, prefix });
	t.teardown(() => {
		template.pub.disconnect();
		template.sub.disconnect();
	});

	const redis = new Redis({
		...redisConnectionSettings,
		prefix,
		identifier: `server${crypto.randomUUID()}`,
		createClient: () => {
			const client = template.pub.duplicate();
			const subscribe = client.subscribe.bind(client) as any;
			(client as any).subscribe = (channel: string, callback: any) => {
				if (failNextReplySubscribe && channel.startsWith(`${prefix}#reply:`)) {
					failNextReplySubscribe = false;
					queueMicrotask(() => callback(new Error("simulated outage")));
					return;
				}
				return subscribe(channel, callback);
			};
			return client;
		},
	});

	const server = await newHocuspocus(t, { extensions: [redis] });

	// The reply-channel subscribe made in the constructor was rejected. Without
	// a retry, every load rethrows that error even though Redis is reachable
	// (#1170).
	await t.notThrowsAsync(server.openDirectConnection("doc"));
});
