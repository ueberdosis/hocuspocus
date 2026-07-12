// Smoke: @hocuspocus/provider-react against the Rust server binary.
//
// Mounts the real React components (HocuspocusProviderWebsocketComponent +
// HocuspocusRoom) in a jsdom DOM, edits the room's Y.Doc, and asserts a
// second plain @hocuspocus/provider connection observes the change — i.e.
// the React wrapper connects, authenticates, syncs and cleans up against
// the Rust implementation exactly like it does against Node.
//
//   cargo build -p hocuspocus-server
//   ./tests/node_modules/.bin/tsx --tsconfig packages/provider-react/tsconfig.json \
//     --conditions=source tests/conformance/smoke-provider-react.mts
//
// (tsx rather than node's type stripping: the provider-react sources are
// TSX, and the package tsconfig supplies the automatic JSX runtime.)

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

// provider-react touches window/document at module scope via React; give
// the process a DOM before importing anything React-flavored.
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
(globalThis as Record<string, unknown>).window = dom.window;
(globalThis as Record<string, unknown>).document = dom.window.document;
// Node ≥21 ships a read-only global navigator; jsdom's is only needed if absent.
if (!("navigator" in globalThis)) {
	(globalThis as Record<string, unknown>).navigator = dom.window.navigator;
}

const { default: React } = await import("react");
const { createRoot } = await import("react-dom/client");
const { HocuspocusProviderWebsocketComponent, HocuspocusRoom } = await import(
	"@hocuspocus/provider-react"
);
const { HocuspocusProvider, HocuspocusProviderWebsocket } = await import("@hocuspocus/provider");
const Y = await import("yjs");

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const binary = process.env.HOCUSPOCUS_RUST_BIN ?? path.join(repoRoot, "target/debug/hocuspocus-server");

const fail = (message: string): never => {
	console.error(`✗ ${message}`);
	process.exit(1);
};

const server = spawn(binary, [], {
	env: { ...process.env, HOCUSPOCUS_SERVER__LISTEN: "127.0.0.1:0", HOCUSPOCUS_SERVER__QUIET: "true" },
	stdio: ["ignore", "pipe", "ignore"],
});
const readyLine: string = await new Promise((resolve, reject) => {
	server.stdout.once("data", (data) => resolve(String(data).split("\n")[0]));
	server.once("error", reject);
	server.once("exit", (code) => reject(new Error(`server exited early: ${code}`)));
});
const { port } = JSON.parse(readyLine);
const url = `ws://127.0.0.1:${port}`;
console.log(`rust server ready on ${url}`);

const cleanup = () => server.kill("SIGKILL");
process.on("exit", cleanup);
setTimeout(() => fail("timed out after 30s"), 30_000).unref();

// 1. Mount the React tree: shared websocket + one room.
const roomDocument = new Y.Doc();
let syncedResolve: () => void;
const synced = new Promise<void>((resolve) => {
	syncedResolve = resolve;
});

const element = React.createElement(
	HocuspocusProviderWebsocketComponent,
	{ url },
	React.createElement(HocuspocusRoom, {
		name: "react-smoke",
		document: roomDocument,
		onSynced: () => syncedResolve(),
	}),
);
const root = createRoot(dom.window.document.body.appendChild(dom.window.document.createElement("div")));
root.render(element);

await synced;
console.log("✓ HocuspocusRoom mounted and synced");

// 2. Edit through the React-managed document.
roomDocument.getMap("smoke").set("from", "react");

// 3. A plain provider on the same document must observe the change.
const observerSocket = new HocuspocusProviderWebsocket({ url, WebSocketPolyfill: dom.window.WebSocket });
const observer = new HocuspocusProvider({
	websocketProvider: observerSocket,
	name: "react-smoke",
});
observer.attach();

await new Promise<void>((resolve) => {
	const check = () => {
		if (observer.document.getMap("smoke").get("from") === "react") {
			resolve();
			return;
		}
		setTimeout(check, 50);
	};
	observer.on("synced", check);
});
console.log("✓ plain provider observed the React-made change");

// 4. Unmount: the room must disconnect cleanly (server connection count 0).
observerSocket.destroy();
root.unmount();
await new Promise<void>((resolve) => {
	const deadline = Date.now() + 5_000;
	const poll = async () => {
		const stats = (await (await fetch(`http://127.0.0.1:${port}/control/stats`)).json()) as {
			connections: number;
		};
		if (stats.connections === 0) {
			resolve();
			return;
		}
		if (Date.now() > deadline) {
			fail(`connections still open after unmount: ${stats.connections}`);
		}
		setTimeout(poll, 100);
	};
	poll();
});
console.log("✓ unmount closed the connection");

console.log("provider-react smoke PASSED");
process.exit(0);
