/**
 * Conformance dashboard: runs the applicable AVA test files against the
 * Rust server binary and prints "N applicable, M passing".
 *
 * Usage (from the repo root):
 *   cargo build -p hocuspocus-server
 *   pnpm test:rust
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const config = JSON.parse(
	readFileSync(new URL("./rust-target.json", import.meta.url), "utf-8"),
) as { run: string[]; skip: Record<string, string> };

console.log(
	`rust conformance: ${config.run.length} file(s) applicable, ${Object.keys(config.skip).length} skip entries\n`,
);

const result = spawnSync("npx", ["ava", ...config.run], {
	stdio: "inherit",
	env: { ...process.env, HOCUSPOCUS_TEST_TARGET: "rust" },
});

if (result.status === 0) {
	console.log("\nrust conformance: all applicable tests passing");
}
process.exit(result.status ?? 1);
