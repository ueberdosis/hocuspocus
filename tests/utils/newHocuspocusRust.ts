import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExecutionContext } from "ava";
import type { Hocuspocus, ServerConfiguration } from "@hocuspocus/server";

/**
 * Rust-target counterpart of newHocuspocus(): spawns the Rust server
 * binary (HOCUSPOCUS_RUST_BIN or target/debug/hocuspocus-server) and
 * returns a shim exposing the narrow slice of the Hocuspocus surface the
 * provider tests use.
 *
 * Server-side hook closures and extensions cannot run inside the Rust
 * binary; once the webhook hook transport lands (M3), they are served by a
 * per-test HTTP receiver instead. Until then, tests passing such options
 * fail fast with a descriptive error and live in the skip-map
 * (tests/conformance/rust-target.json).
 */
export const newHocuspocusRust = async (
	t: ExecutionContext,
	options?: Partial<ServerConfiguration>,
): Promise<Hocuspocus> => {
	const unsupported = Object.entries(options ?? {}).filter(
		([, value]) => typeof value === "function" || key_is_extensions(value),
	);
	if (unsupported.length > 0) {
		throw new Error(
			`HOCUSPOCUS_TEST_TARGET=rust does not support in-process hooks/extensions yet ` +
				`(${unsupported.map(([key]) => key).join(", ")}); waiting on the M3 webhook transport`,
		);
	}

	const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
	const binary =
		process.env.HOCUSPOCUS_RUST_BIN ??
		path.join(repoRoot, "target/debug/hocuspocus-server");

	const child = spawn(binary, [], {
		env: {
			...process.env,
			HOCUSPOCUS_SERVER_LISTEN: "127.0.0.1:0",
			HOCUSPOCUS_SERVER_QUIET: "true",
		},
		stdio: ["ignore", "pipe", "inherit"],
	});

	const readyLine: string = await new Promise((resolve, reject) => {
		child.stdout.once("data", (data) => resolve(String(data).split("\n")[0]));
		child.once("error", reject);
		child.once("exit", (code) => reject(new Error(`rust server exited early: ${code}`)));
	});
	const ready = JSON.parse(readyLine);
	const baseURL = `127.0.0.1:${ready.port}`;

	t.teardown(() => {
		child.kill("SIGKILL");
	});

	const controlStats = async () => {
		const response = await fetch(`http://${baseURL}/control/stats`);
		return (await response.json()) as { connections: number; documents: number };
	};

	// The shim: everything the Tier-1 tests and the provider utils touch.
	const shim = {
		server: {
			webSocketURL: `ws://${baseURL}`,
			URL: baseURL,
		},
		address: { address: "127.0.0.1", port: ready.port, family: "IPv4" },
		async closeConnections() {
			await fetch(`http://${baseURL}/control/close-connections`, { method: "POST" });
		},
		// Async variants for rust-aware tests; the sync TS-native
		// getConnectionsCount()/getDocumentsCount() cannot be shimmed.
		controlStats,
	};

	return shim as unknown as Hocuspocus;
};

const key_is_extensions = (value: unknown): boolean =>
	Array.isArray(value) && value.some((entry) => typeof entry === "object" && entry !== null);
