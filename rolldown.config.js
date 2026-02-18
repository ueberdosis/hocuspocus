import { builtinModules } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "rolldown";
import { dts } from "rolldown-plugin-dts";

const nodeBuiltins = new Set(builtinModules);

function nodeProtocolPlugin() {
	return {
		name: "node-protocol",
		resolveId(source) {
			if (nodeBuiltins.has(source)) {
				return { id: `node:${source}`, external: true };
			}
		},
	};
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getWorkspacePackages() {
	const packagePaths = fs.globSync("packages/*/package.json", { cwd: __dirname });
	return packagePaths
		.map((pkgPath) => {
			const fullPath = path.join(__dirname, pkgPath);
			const pkgJson = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
			return { location: path.dirname(fullPath), package: pkgJson };
		})
		.filter((pkg) => pkg.package.exports && !["@hocuspocus/docs", "@hocuspocus/demo"].includes(pkg.package.name));
}

function getExternalDependencies(pkgJson) {
	return [
		...Object.keys(pkgJson.dependencies || {}),
		...Object.keys(pkgJson.peerDependencies || {}),
		...Object.keys(pkgJson.devDependencies || {}),
	];
}

const packages = getWorkspacePackages();

// Build aliases dynamically from all packages
const aliases = Object.fromEntries(
	packages.map((pkg) => [pkg.package.name, path.join(pkg.location, "src")]),
);

const configs = packages.flatMap((pkg) => {
	const basePath = pkg.location;
	const input = path.join(basePath, "src/index.ts");
	const { name, exports } = pkg.package;
	const external = getExternalDependencies(pkg.package);

	// Main bundle config (ESM + CJS)
	const bundleConfig = defineConfig({
		input,
		external: [
			...external,
			// Also externalize Node built-ins
			/^node:/,
		],
		plugins: [nodeProtocolPlugin()],
		output: [
			{
				file: path.join(basePath, exports.default.require),
				format: "cjs",
				sourcemap: true,
				exports: "auto",
			},
			{
				file: path.join(basePath, exports.default.import),
				format: "esm",
				sourcemap: true,
			},
		],
		resolve: {
			alias: aliases,
		},
	});

	// DTS config for type declarations
	// Don't use aliases here - we want to reference external package types, not inline them
	const dtsConfig = defineConfig({
		input,
		external: [...external, /^node:/],
		plugins: [nodeProtocolPlugin(), dts({ emitDtsOnly: true })],
		output: {
			dir: path.join(basePath, "dist"),
			format: "esm",
		},
	});

	return [bundleConfig, dtsConfig];
});

export default configs;
