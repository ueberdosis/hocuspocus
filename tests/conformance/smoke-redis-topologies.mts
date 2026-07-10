/**
 * Multi-node Redis smoke test in the two topologies that matter for
 * migration:
 *
 *   1. Rust ↔ Rust: two Rust server instances sharing one Redis
 *   2. Node ↔ Rust: a real @hocuspocus/server (with extension-redis) and a
 *      Rust instance sharing one Redis — the mixed-fleet migration path
 *
 * For each topology: providers connect to different instances, edits and
 * awareness must propagate across Redis.
 *
 * Usage:
 *   cargo build -p hocuspocus-server
 *   node --experimental-transform-types --conditions=source \
 *     tests/conformance/smoke-redis-topologies.mts
 *
 * Requires redis-server on 127.0.0.1:6399 (started by this script).
 */

import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import * as Y from "yjs";

import { Server } from "../../packages/server/src/index.ts";
import { Redis } from "../../packages/extension-redis/src/index.ts";
import { HocuspocusProvider } from "../../packages/provider/src/HocuspocusProvider.ts";
import { HocuspocusProviderWebsocket } from "../../packages/provider/src/HocuspocusProviderWebsocket.ts";

const REDIS_PORT = 6399;
const binary = process.argv[2] ?? "target/debug/hocuspocus-server";

const failures: string[] = [];
const assert = (condition: unknown, label: string) => {
	if (condition) console.log(`  ok: ${label}`);
	else {
		console.error(`FAIL: ${label}`);
		failures.push(label);
	}
};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const waitFor = async (predicate: () => boolean, label: string, timeoutMs = 8000) => {
	const start = Date.now();
	while (!predicate()) {
		if (Date.now() - start > timeoutMs) {
			assert(false, `${label} (timed out)`);
			return false;
		}
		await sleep(30);
	}
	assert(true, label);
	return true;
};

const children: ChildProcess[] = [];

const startRustServer = async (): Promise<number> => {
	const child = spawn(binary, [], {
		env: {
			...process.env,
			HOCUSPOCUS_SERVER__LISTEN: "127.0.0.1:0",
			HOCUSPOCUS_SERVER__QUIET: "true",
			HOCUSPOCUS_REDIS__URL: `redis://127.0.0.1:${REDIS_PORT}`,
		},
		stdio: ["ignore", "pipe", "inherit"],
	});
	children.push(child);
	const readyLine: string = await new Promise((resolve, reject) => {
		child.stdout!.once("data", (data) => resolve(String(data).split("\n")[0]));
		child.once("exit", (code) => reject(new Error(`rust server exited early: ${code}`)));
	});
	return JSON.parse(readyLine).port;
};

const newProvider = (port: number, documentName: string) => {
	const document = new Y.Doc();
	const socket = new HocuspocusProviderWebsocket({ url: `ws://127.0.0.1:${port}` });
	const provider = new HocuspocusProvider({
		websocketProvider: socket,
		name: documentName,
		document,
	});
	provider.attach();
	return { provider, document, socket };
};

const runTopology = async (label: string, portA: number, portB: number, docName: string) => {
	console.log(`\n=== ${label} ===`);
	const a = newProvider(portA, docName);
	const b = newProvider(portB, docName);

	await waitFor(() => a.provider.synced && b.provider.synced, `${label}: both providers synced`);

	a.document.getText("default").insert(0, "cross-instance hello");
	await waitFor(
		() => b.document.getText("default").toString() === "cross-instance hello",
		`${label}: edit propagated A→B across Redis`,
	);

	b.document.getText("default").insert(20, " and back");
	await waitFor(
		() => a.document.getText("default").toString() === "cross-instance hello and back",
		`${label}: edit propagated B→A across Redis`,
	);

	a.provider.setAwarenessField("user", { name: `alice-${label}` });
	await waitFor(() => {
		for (const [, state] of b.provider.awareness?.getStates() ?? []) {
			if (state?.user?.name === `alice-${label}`) return true;
		}
		return false;
	}, `${label}: awareness propagated across Redis`);

	// Late joiner on instance B must receive the full document (state
	// pulled from the peer instance through the SyncStep1 bootstrap).
	const c = newProvider(portB, docName);
	await waitFor(
		() => c.document.getText("default").toString() === "cross-instance hello and back",
		`${label}: late joiner on the other instance got full state`,
	);

	for (const peer of [a, b, c]) {
		peer.provider.detach();
		peer.socket.destroy();
	}
	await sleep(200);
};

// --- redis ------------------------------------------------------------------

const redisServer = spawn("redis-server", ["--port", String(REDIS_PORT), "--save", ""], {
	stdio: "ignore",
});
children.push(redisServer);
await sleep(400);

let nodeServer: Awaited<ReturnType<Server["listen"]>> | undefined;

try {
	// Topology 1: Rust ↔ Rust
	const rust1 = await startRustServer();
	const rust2 = await startRustServer();
	await runTopology("rust-rust", rust1, rust2, "topology-rr");

	// Topology 2: Node ↔ Rust (the mixed-fleet migration path)
	const node = new Server({
		port: 0,
		quiet: true,
		stopOnSignals: false,
		extensions: [
			new Redis({ host: "127.0.0.1", port: REDIS_PORT }),
		],
	});
	nodeServer = await node.listen();
	const nodePort = (nodeServer.server!.address as { port: number }).port;
	await runTopology("node-rust", nodePort, rust1, "topology-nr");
	await runTopology("rust-node", rust2, nodePort, "topology-rn");
} finally {
	if (nodeServer) {
		try {
			nodeServer.closeConnections();
			await (nodeServer.server as unknown as { destroy?: () => Promise<void> }).destroy?.();
		} catch {}
	}
	for (const child of children.reverse()) child.kill("SIGKILL");
	await Promise.allSettled(children.map((child) => once(child, "exit")));
}

if (failures.length > 0) {
	console.error(`\n${failures.length} failure(s)`);
	process.exit(1);
}
console.log("\nall redis topology checks passed");
process.exit(0);
