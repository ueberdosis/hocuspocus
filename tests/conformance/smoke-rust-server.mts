/**
 * End-to-end smoke test: real @hocuspocus/provider clients against the Rust
 * server binary. Exercises the full wire protocol: auth handshake, initial
 * sync (Step1/Step2/SyncReply), incremental updates, broadcast, sync-status
 * acks, awareness propagation, and reconnect-fresh-sync.
 *
 * Usage:
 *   cargo build -p hocuspocus-server
 *   node --experimental-transform-types --conditions=source \
 *     tests/conformance/smoke-rust-server.mts [path-to-binary]
 *
 * Exits 0 on success, 1 with a failure summary otherwise.
 */

import { spawn } from "node:child_process";
import { once } from "node:events";
import * as Y from "yjs";
import WebSocket from "ws";

import { HocuspocusProvider } from "../../packages/provider/src/HocuspocusProvider.ts";
import { HocuspocusProviderWebsocket } from "../../packages/provider/src/HocuspocusProviderWebsocket.ts";

const binary = process.argv[2] ?? "target/debug/hocuspocus-server";

const failures: string[] = [];
const assert = (condition: unknown, label: string) => {
	if (condition) {
		console.log(`  ok: ${label}`);
	} else {
		console.error(`FAIL: ${label}`);
		failures.push(label);
	}
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (predicate: () => boolean, label: string, timeoutMs = 5000) => {
	const start = Date.now();
	while (!predicate()) {
		if (Date.now() - start > timeoutMs) {
			assert(false, `${label} (timed out)`);
			return false;
		}
		await sleep(25);
	}
	assert(true, label);
	return true;
};

// --- start the server ------------------------------------------------------

const server = spawn(binary, [], {
	env: { ...process.env, HOCUSPOCUS_SERVER__LISTEN: "127.0.0.1:0" },
	stdio: ["ignore", "pipe", "inherit"],
});
const readyLine: string = await new Promise((resolve, reject) => {
	server.stdout.once("data", (data) => resolve(String(data).split("\n")[0]));
	server.once("exit", (code) => reject(new Error(`server exited early: ${code}`)));
});
const { port } = JSON.parse(readyLine);
const url = `ws://127.0.0.1:${port}`;
console.log(`server ready on ${url}`);

const newProvider = (documentName: string) => {
	const document = new Y.Doc();
	const socket = new HocuspocusProviderWebsocket({
		url,
		WebSocketPolyfill: WebSocket as never,
	});
	const provider = new HocuspocusProvider({
		websocketProvider: socket,
		name: documentName,
		document,
	});
	provider.attach();
	return { provider, document, socket };
};

try {
	// --- 1. two providers, bidirectional sync -------------------------------
	console.log("1. bidirectional sync");
	const a = newProvider("smoke-doc");
	const b = newProvider("smoke-doc");

	await waitFor(() => a.provider.synced, "provider A synced");
	await waitFor(() => b.provider.synced, "provider B synced");
	assert(a.provider.isAuthenticated, "provider A authenticated");

	a.document.getText("default").insert(0, "hello from A");
	await waitFor(
		() => b.document.getText("default").toString() === "hello from A",
		"A→B text propagated",
	);

	b.document.getText("default").insert(12, " and B");
	await waitFor(
		() => a.document.getText("default").toString() === "hello from A and B",
		"B→A text propagated",
	);

	await waitFor(() => !a.provider.hasUnsyncedChanges, "A has no unsynced changes (SyncStatus ack)");

	// --- 2. awareness --------------------------------------------------------
	console.log("2. awareness");
	a.provider.setAwarenessField("user", { name: "alice" });
	await waitFor(() => {
		const states = b.provider.awareness?.getStates();
		for (const [, state] of states ?? []) {
			if (state?.user?.name === "alice") return true;
		}
		return false;
	}, "awareness A→B propagated");

	// --- 3. late joiner gets full state --------------------------------------
	console.log("3. late joiner");
	const c = newProvider("smoke-doc");
	await waitFor(
		() => c.document.getText("default").toString() === "hello from A and B",
		"late joiner received full document",
	);

	// --- 4. fresh doc on another name is independent -------------------------
	console.log("4. document isolation");
	const d = newProvider("other-doc");
	await waitFor(() => d.provider.synced, "provider on other-doc synced");
	assert(d.document.getText("default").toString() === "", "other-doc is empty");

	// --- 5. server-side stats -------------------------------------------------
	console.log("5. control API");
	const stats = await (await fetch(`http://127.0.0.1:${port}/control/stats`)).json();
	assert(stats.connections >= 4, `stats.connections=${stats.connections} >= 4`);
	assert(stats.documents === 2, `stats.documents=${stats.documents} === 2`);

	// --- 6. disconnect cleans up ----------------------------------------------
	console.log("6. disconnect and awareness cleanup");
	a.provider.detach();
	a.socket.destroy();
	await waitFor(() => {
		const states = b.provider.awareness?.getStates();
		for (const [, state] of states ?? []) {
			if (state?.user?.name === "alice") return false;
		}
		return true;
	}, "alice's awareness removed after disconnect");

	// --- 7. persistence across unload (in-memory storage) ---------------------
	console.log("7. unload/reload via storage");
	b.provider.detach();
	b.socket.destroy();
	c.provider.detach();
	c.socket.destroy();
	await sleep(300); // let the server unload smoke-doc
	const e = newProvider("smoke-doc");
	await waitFor(
		() => e.document.getText("default").toString() === "hello from A and B",
		"document restored from storage after unload",
	);
	e.provider.detach();
	e.socket.destroy();
	d.provider.detach();
	d.socket.destroy();
} finally {
	server.kill("SIGTERM");
	await once(server, "exit").catch(() => {});
}

if (failures.length > 0) {
	console.error(`\n${failures.length} failure(s)`);
	process.exit(1);
}
console.log("\nall smoke checks passed");
process.exit(0);
