/**
 * Latency benchmark: does a storm of large-document initial syncs degrade
 * edit propagation on OTHER documents?
 *
 * This is the failure mode that motivated the Rust rewrite: on Node, every
 * initial sync of a large document encodes the full state on the single
 * main thread, stalling every other document. Per-document actors must not
 * exhibit this coupling.
 *
 * Method:
 *   1. Build a large document (~2 MB of text) on the server.
 *   2. Probe: writer + reader providers on a SEPARATE small document; the
 *      writer stamps Date.now() into a Y.Map every 50 ms, the reader
 *      records propagation latency (same-process clock).
 *   3. Phase A (baseline, 6 s): probe only.
 *      Phase B (loaded, 12 s): N child processes hammer the large document
 *      with fresh initial syncs while the probe keeps measuring.
 *
 * Usage:
 *   cargo build --release -p hocuspocus-server
 *   node --experimental-transform-types --conditions=source \
 *     tests/conformance/bench-latency.mts [rust|node|both]
 */

import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as Y from "yjs";
import { HocuspocusProvider } from "../../packages/provider/src/HocuspocusProvider.ts";
import { HocuspocusProviderWebsocket } from "../../packages/provider/src/HocuspocusProviderWebsocket.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const LOADER_PROCESSES = 4;
const BASELINE_MS = 6_000;
const LOADED_MS = 12_000;
const WRITE_INTERVAL_MS = 50;
const BIG_DOC_CHARS = Number(process.env.BENCH_BIG_DOC_CHARS ?? 2_000_000);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const percentile = (sorted: number[], p: number) =>
	sorted.length === 0 ? Number.NaN : sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];

const startServer = async (target: "rust" | "node"): Promise<{ port: number; child: ChildProcess }> => {
	const child =
		target === "rust"
			? spawn(path.join(repoRoot, "target/release/hocuspocus-server"), [], {
					env: { ...process.env, HOCUSPOCUS_SERVER__LISTEN: "127.0.0.1:0", HOCUSPOCUS_SERVER__QUIET: "true" },
					stdio: ["ignore", "pipe", "inherit"],
				})
			: spawn(
					process.execPath,
					["--experimental-transform-types", "--conditions=source", path.join(here, "bench-node-server.mts")],
					{ cwd: repoRoot, stdio: ["ignore", "pipe", "inherit"] },
				);
	const readyLine: string = await new Promise((resolve, reject) => {
		let buffer = "";
		child.stdout!.on("data", (data) => {
			buffer += String(data);
			const line = buffer.split("\n").find((candidate) => candidate.startsWith("{"));
			if (line) resolve(line);
		});
		child.once("exit", (code) => reject(new Error(`server exited early: ${code}`)));
	});
	return { port: JSON.parse(readyLine).port, child };
};

const newProvider = (port: number, name: string) => {
	const document = new Y.Doc();
	const socket = new HocuspocusProviderWebsocket({ url: `ws://127.0.0.1:${port}` });
	const provider = new HocuspocusProvider({ websocketProvider: socket, name, document });
	provider.attach();
	return { provider, document, socket };
};

interface PhaseStats {
	p50: number;
	p95: number;
	p99: number;
	max: number;
	samples: number;
	loads?: number;
}

const summarize = (latencies: number[], loads?: number): PhaseStats => {
	const sorted = [...latencies].sort((a, b) => a - b);
	return {
		p50: percentile(sorted, 50),
		p95: percentile(sorted, 95),
		p99: percentile(sorted, 99),
		max: sorted[sorted.length - 1] ?? Number.NaN,
		samples: sorted.length,
		loads,
	};
};

const benchTarget = async (target: "rust" | "node") => {
	console.log(`\n=== ${target} ===`);
	const { port, child } = await startServer(target);
	const children: ChildProcess[] = [child];

	try {
		// 1. Build the large document and hold it in memory.
		const holder = newProvider(port, "bench-big");
		await new Promise<void>((resolve) => holder.provider.on("synced", () => resolve()));
		const text = holder.document.getText("default");
		const chunk = "lorem ipsum dolor sit amet ".repeat(1_000); // 27 kB
		holder.document.transact(() => {
			while (text.length < BIG_DOC_CHARS) text.insert(text.length, chunk);
		});
		await sleep(500);
		console.log(`  big document ready (${(text.length / 1e6).toFixed(1)} M chars)`);

		// 2. Probe on a separate small document.
		const writer = newProvider(port, "bench-probe");
		const reader = newProvider(port, "bench-probe");
		await new Promise<void>((resolve) => reader.provider.on("synced", () => resolve()));
		const latencies: number[] = [];
		reader.document.getMap("probe").observe(() => {
			const sent = reader.document.getMap("probe").get("t") as number;
			latencies.push(Date.now() - sent);
		});
		const writeTimer = setInterval(() => {
			writer.document.getMap("probe").set("t", Date.now());
		}, WRITE_INTERVAL_MS);

		// Phase A: baseline.
		latencies.length = 0;
		await sleep(BASELINE_MS);
		const baseline = summarize(latencies);

		// Phase B: big-document sync storm.
		let loads = 0;
		for (let i = 0; i < LOADER_PROCESSES; i += 1) {
			const loader = spawn(
				process.execPath,
				[
					"--experimental-transform-types",
					"--conditions=source",
					path.join(here, "bench-loader.mts"),
					`ws://127.0.0.1:${port}`,
					"bench-big",
				],
				{ cwd: repoRoot, stdio: ["ignore", "pipe", "inherit"] },
			);
			loader.stdout!.on("data", (data) => {
				loads += String(data).split("\n").filter((line) => line === "load").length;
			});
			children.push(loader);
		}
		await sleep(2_000); // loader warm-up
		latencies.length = 0;
		loads = 0;
		await sleep(LOADED_MS);
		const loaded = summarize(latencies, loads);
		clearInterval(writeTimer);

		const format = (stats: PhaseStats) =>
			`p50=${stats.p50}ms p95=${stats.p95}ms p99=${stats.p99}ms max=${stats.max}ms (n=${stats.samples}${stats.loads !== undefined ? `, big-doc syncs=${stats.loads}` : ""})`;
		console.log(`  baseline: ${format(baseline)}`);
		console.log(`  loaded:   ${format(loaded)}`);
		return { baseline, loaded };
	} finally {
		for (const proc of children.reverse()) proc.kill("SIGKILL");
	}
};

const targets = (process.argv[2] ?? "both") === "both" ? (["node", "rust"] as const) : ([process.argv[2]] as const);
for (const target of targets) {
	await benchTarget(target as "rust" | "node");
}
process.exit(0);
