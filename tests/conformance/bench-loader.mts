/**
 * Benchmark helper: hammers a server with fresh initial syncs of a large
 * document. Every connect forces the server to encode the full document
 * state (SyncStep2) — the CPU-heavy operation that blocks the Node.js main
 * thread. Prints one line per completed sync.
 *
 * Usage: bench-loader.mts <ws-url> <doc-name>
 */

import * as Y from "yjs";
import { HocuspocusProvider } from "../../packages/provider/src/HocuspocusProvider.ts";
import { HocuspocusProviderWebsocket } from "../../packages/provider/src/HocuspocusProviderWebsocket.ts";

const [url, docName] = process.argv.slice(2);

const loadOnce = () =>
	new Promise<void>((resolve) => {
		const document = new Y.Doc();
		const socket = new HocuspocusProviderWebsocket({ url });
		const provider = new HocuspocusProvider({
			websocketProvider: socket,
			name: docName,
			document,
		});
		provider.attach();
		provider.on("synced", () => {
			console.log("load");
			provider.detach();
			socket.destroy();
			document.destroy();
			resolve();
		});
	});

// Two overlapping load loops per process.
await Promise.all(
	[0, 1].map(async () => {
		// eslint-disable-next-line no-constant-condition
		while (true) {
			await loadOnce();
		}
	}),
);
