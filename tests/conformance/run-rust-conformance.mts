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
) as {
	run: string[];
	partial?: Record<string, { exclude: string[]; reason: string }>;
	skip: Record<string, string>;
};

const partial = Object.entries(config.partial ?? {});
console.log(
	`rust conformance: ${config.run.length} full file(s) + ${partial.length} partial file(s), ${Object.keys(config.skip).length} skip entries\n`,
);

let failed = false;

const full = spawnSync("npx", ["ava", ...config.run], {
	stdio: "inherit",
	env: { ...process.env, HOCUSPOCUS_TEST_TARGET: "rust" },
});
failed ||= full.status !== 0;

// Partial files run one ava invocation each, excluding the annotated
// in-process tests via negative --match patterns.
for (const [file, { exclude }] of partial) {
	console.log(`\npartial: ${file} (excluding ${exclude.length} in-process test(s))`);
	const matches = exclude.flatMap((pattern) => ["--match", `!${pattern}`]);
	const result = spawnSync("npx", ["ava", ...matches, file], {
		stdio: "inherit",
		env: { ...process.env, HOCUSPOCUS_TEST_TARGET: "rust" },
	});
	failed ||= result.status !== 0;
}

if (!failed) {
	console.log("\nrust conformance: all applicable tests passing");
}
process.exit(failed ? 1 : 0);
