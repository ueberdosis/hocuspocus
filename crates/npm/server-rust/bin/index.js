// Resolves the platform-specific `hocuspocus-server` binary installed via
// this package's optionalDependencies (the esbuild distribution pattern).
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** Whether this Linux runs musl instead of glibc (Alpine et al.). */
const isMusl = () => {
	// glibc dynamic linkers report themselves in the process report; when
	// the report is unavailable, assume glibc (the common case).
	try {
		const { header } = process.report.getReport();
		return header.glibcVersionRuntime === undefined;
	} catch {
		return false;
	}
};

/** npm package name carrying the binary for this platform, or null. */
export const platformPackage = () => {
	const { platform, arch } = process;
	if (platform === "linux" && arch === "x64") {
		return `@hocuspocus/server-rust-linux-x64-${isMusl() ? "musl" : "gnu"}`;
	}
	if (platform === "linux" && arch === "arm64") {
		return "@hocuspocus/server-rust-linux-arm64-gnu";
	}
	if (platform === "darwin" && (arch === "x64" || arch === "arm64")) {
		return `@hocuspocus/server-rust-darwin-${arch}`;
	}
	if (platform === "win32" && arch === "x64") {
		return "@hocuspocus/server-rust-win32-x64";
	}
	return null;
};

/**
 * Absolute path of the `hocuspocus-server` binary. Honors the
 * HOCUSPOCUS_RUST_BIN override (useful for local cargo builds and CI).
 * Throws with an actionable message when no binary is available.
 */
export const binaryPath = () => {
	if (process.env.HOCUSPOCUS_RUST_BIN) {
		return process.env.HOCUSPOCUS_RUST_BIN;
	}
	const name = platformPackage();
	if (!name) {
		throw new Error(
			`@hocuspocus/server-rust has no prebuilt binary for ${process.platform}-${process.arch}. ` +
				"Build one with `cargo build --release -p hocuspocus-server` and set HOCUSPOCUS_RUST_BIN.",
		);
	}
	const binary = process.platform === "win32" ? "hocuspocus-server.exe" : "hocuspocus-server";
	try {
		return require.resolve(`${name}/${binary}`);
	} catch {
		throw new Error(
			`Could not resolve ${name}. It should have been installed as an optional dependency of ` +
				"@hocuspocus/server-rust — check that optional dependencies are not disabled " +
				"(`npm install --no-optional` / `--omit=optional` breaks this package).",
		);
	}
};
