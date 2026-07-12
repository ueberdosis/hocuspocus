#!/usr/bin/env node
// Thin launcher: executes the platform binary with this process's argv,
// stdio, and exit code (the esbuild distribution pattern).
import { spawn } from "node:child_process";
import { binaryPath } from "./index.js";

let binary;
try {
	binary = binaryPath();
} catch (error) {
	console.error(error.message);
	process.exit(1);
}

const child = spawn(binary, process.argv.slice(2), { stdio: "inherit" });
child.on("exit", (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal);
		return;
	}
	process.exit(code ?? 1);
});
for (const signal of ["SIGINT", "SIGTERM"]) {
	process.on(signal, () => child.kill(signal));
}
