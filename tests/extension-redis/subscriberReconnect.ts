import net from "node:net";
import { Redis } from "@hocuspocus/extension-redis";
import type { ExecutionContext } from "ava";
import test from "ava";
import {
	newHocuspocus,
	newHocuspocusProvider,
	redisConnectionSettings,
	sleep,
} from "../utils/index.ts";

/**
 * TCP proxy in front of Redis that can drop every connection and refuse new
 * ones for a while, like a network partition or a Redis failover.
 */
const newRedisProxy = async (t: ExecutionContext) => {
	const sockets = new Set<net.Socket>();
	const server = net.createServer((client) => {
		const upstream = net.connect(
			redisConnectionSettings.port,
			redisConnectionSettings.host,
		);
		for (const socket of [client, upstream]) {
			sockets.add(socket);
			socket.on("close", () => sockets.delete(socket));
			socket.on("error", () => {});
		}
		client.pipe(upstream).pipe(client);
	});
	let port = 0;

	const listen = () =>
		new Promise<void>((resolve) => {
			server.listen(port, "127.0.0.1", () => {
				port = (server.address() as net.AddressInfo).port;
				resolve();
			});
		});

	// A closed server can listen again, on the same port.
	const cut = () =>
		new Promise<void>((resolve) => {
			server.close(() => resolve());
			for (const socket of sockets) socket.destroy();
		});

	await listen();
	t.teardown(cut);

	return {
		get port() {
			return port;
		},
		cut,
		restore: listen,
	};
};

const waitUntil = async (condition: () => boolean, timeout: number) => {
	const deadline = Date.now() + timeout;
	while (!condition() && Date.now() < deadline) {
		await sleep(50);
	}
	return condition();
};

/**
 * Server A talks to Redis directly, server B only through the proxy. Both have
 * the same document open and in sync.
 *
 * With `holdSubscribes`, every SUBSCRIBE B's subscriber sends after a
 * reconnect (including ioredis' automatic re-subscribe) is held back for that
 * many ms, so Redis confirms it late.
 */
const setup = async (t: ExecutionContext, holdSubscribes = 0) => {
	const prefix = `extension-redis/subscriberReconnect-${crypto.randomUUID()}`;
	const proxy = await newRedisProxy(t);

	const extensionA = new Redis({
		...redisConnectionSettings,
		prefix,
		identifier: `serverA-${crypto.randomUUID()}`,
	});

	// Only used to get an ioredis client without depending on ioredis here.
	const template = new Redis({ host: "127.0.0.1", port: proxy.port, prefix });
	t.teardown(() => {
		template.pub.disconnect();
		template.sub.disconnect();
	});

	const extensionB = new Redis({
		prefix,
		identifier: `serverB-${crypto.randomUUID()}`,
		createClient: () => {
			// Typed loosely, like the other tests, to avoid depending on ioredis.
			const client = template.pub.duplicate() as any;
			// The partition makes ioredis report connection errors, as expected.
			client.on("error", () => {});

			let reconnected = false;
			client.on("reconnecting", () => {
				reconnected = true;
			});

			const subscribe = client.subscribe.bind(client);
			client.subscribe = (...args: unknown[]) => {
				if (!holdSubscribes || !reconnected) {
					return subscribe(...args);
				}
				setTimeout(() => subscribe(...args), holdSubscribes);
			};

			return client;
		},
	});

	const serverA = await newHocuspocus(t, { extensions: [extensionA] });
	const serverB = await newHocuspocus(t, { extensions: [extensionB] });

	const directA = await serverA.openDirectConnection("doc");
	const directB = await serverB.openDirectConnection("doc");
	t.teardown(async () => {
		await directA.disconnect();
		await directB.disconnect();
	});

	const documentA = directA.document!;
	const documentB = directB.document!;
	const textA = () => documentA.getText("t").toString();
	const textB = () => documentB.getText("t").toString();

	const append = (connection: typeof directA, value: string) =>
		connection.transact((doc) => {
			doc.getText("t").insert(doc.getText("t").length, value);
		});

	await append(directA, "base;");
	t.true(await waitUntil(() => textB() === "base;", 2000), "B starts in sync");

	const reconnected = () =>
		waitUntil(
			() =>
				extensionB.pub.status === "ready" && extensionB.sub.status === "ready",
			10_000,
		);

	const converged = (...expected: string[]) =>
		waitUntil(
			() =>
				textA() === textB() &&
				expected.every((value) => textA().includes(value)),
			5000,
		);

	return {
		proxy,
		serverA,
		serverB,
		directA,
		directB,
		documentA,
		documentB,
		textA,
		textB,
		append,
		reconnected,
		converged,
	};
};

test("instances converge after the subscriber reconnects to Redis", async (t) => {
	const { proxy, directA, textA, textB, append, reconnected, converged } =
		await setup(t);

	// Pub/sub keeps no backlog: whatever A publishes now never reaches B.
	await proxy.cut();
	await append(directA, "A;");
	await sleep(500);

	await proxy.restore();
	t.true(await reconnected(), "B reconnects to Redis");

	// No further edits: B has nothing to publish, so only a resync on reconnect
	// can bring it up to date.
	const ok = await converged("A;");
	t.log("A:", JSON.stringify(textA()), "B:", JSON.stringify(textB()));
	t.true(ok, "B catches up without further edits");
});

test("awareness is exchanged again after the subscriber reconnects to Redis", async (t) => {
	const { proxy, serverA, serverB, reconnected } = await setup(t);

	const providerA = newHocuspocusProvider(t, serverA, { name: "doc" });
	const providerB = newHocuspocusProvider(t, serverB, { name: "doc" });
	t.true(
		await waitUntil(() => providerA.isSynced && providerB.isSynced, 5000),
		"providers are synced",
	);

	// Neither change can cross the partition.
	await proxy.cut();
	providerA.setAwarenessField("user", "a");
	providerB.setAwarenessField("user", "b");
	await sleep(500);

	await proxy.restore();
	t.true(await reconnected(), "B reconnects to Redis");

	const userOf = (seenBy: typeof providerA, of: typeof providerA) =>
		seenBy.awareness!.getStates().get(of.document.clientID)?.user;

	t.true(
		await waitUntil(
			() =>
				userOf(providerB, providerA) === "a" &&
				userOf(providerA, providerB) === "b",
			5000,
		),
		"each client sees the other's awareness state",
	);
});

test("replies sent before Redis confirms the re-subscribe are not lost", async (t) => {
	// Redis confirms B's re-subscribes only 1s after B is ready again. A resync
	// started on `ready` would get its replies before B listens again.
	const { proxy, directA, append, reconnected, converged } = await setup(
		t,
		1000,
	);

	await proxy.cut();
	await append(directA, "A;");
	await sleep(500);

	await proxy.restore();
	t.true(await reconnected(), "B reconnects to Redis");

	t.true(await converged("A;"), "B catches up once it listens again");
});

test("instances converge when the connection drops again during the resync", async (t) => {
	const { proxy, directA, append, reconnected, converged } = await setup(
		t,
		1000,
	);

	await proxy.cut();
	await append(directA, "A1;");
	await sleep(300);
	await proxy.restore();
	t.true(await reconnected(), "B reconnects to Redis");

	// Drop again while B's re-subscribes are still unconfirmed.
	await proxy.cut();
	await append(directA, "A2;");
	await sleep(300);
	await proxy.restore();
	t.true(await reconnected(), "B reconnects to Redis again");

	t.true(await converged("A1;", "A2;"), "B catches up");
});
