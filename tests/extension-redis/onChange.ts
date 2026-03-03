import { Redis } from "@hocuspocus/extension-redis";
import test from "ava";
import {
	newHocuspocus,
	newHocuspocusProvider,
	redisConnectionSettings,
} from "../utils/index.ts";

test("syncs updates between servers and clients", async (t) => {
	await new Promise(async (resolve) => {
		let resolved = false;

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

		// Once we’re setup make an edit on anotherProvider. To get to the provider it will need
		// to pass through Redis:
		// provider -> server -> Redis -> anotherServer -> anotherProvider
		const provider = newHocuspocusProvider(t, server, {
			onSynced() {
				provider.document.getArray("foo").insert(0, ["bar"]);
			},
		});

		// Once the initial data is synced, wait for an additional update to check
		// if both documents have the same content.
		const anotherProvider = newHocuspocusProvider(t, anotherServer, {
			onSynced() {
				provider.on("message", () => {
					if (resolved) return;
					resolved = true;

					setTimeout(() => {
						t.is(
							provider.document.getArray("foo").get(0),
							anotherProvider.document.getArray("foo").get(0),
						);

						resolve("done");
					}, 200);
				});
			},
		});
	});
});
