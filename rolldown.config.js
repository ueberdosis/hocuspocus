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

function defineVersionPlugin(version) {
	const replacement = JSON.stringify(version);
	return {
		name: "define-version",
		transform(code, id) {
			if (code.includes("__HOCUSPOCUS_VERSION__")) {
				return { code: code.replaceAll("__HOCUSPOCUS_VERSION__", replacement) };
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

// Match a package name or any of its sub-paths (e.g. `react` and `react/jsx-runtime`).
function isExternal(id, packages) {
	return packages.some((pkg) => id === pkg || id.startsWith(`${pkg}/`));
}

// Per-package list of dependencies to bundle into the CJS output instead of leaving
// external. Use this for ESM-only dependencies whose `require()` would fail under
// CJS-only module loaders (e.g. Jest 29, ts-node default). They remain external in
// the ESM build so consumers can still tree-shake / dedupe via node_modules.
const cjsInlineDeps = {
	"@hocuspocus/server": ["crossws"],
};

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
	const inlineInCjs = cjsInlineDeps[name] ?? [];
	const cjsExternal = external.filter((dep) => !inlineInCjs.includes(dep));

	// ESM bundle: all deps external.
	const esmConfig = defineConfig({
		input,
		external: (id) => id.startsWith("node:") || isExternal(id, external),
		plugins: [nodeProtocolPlugin(), defineVersionPlugin(pkg.package.version)],
		output: {
			file: path.join(basePath, exports.default.import),
			format: "esm",
			sourcemap: true,
		},
		resolve: {
			alias: aliases,
		},
	});

	// CJS bundle: same as ESM, but inline any ESM-only deps listed in
	// `cjsInlineDeps` so consumers on CJS-only module loaders (Jest 29, ts-node
	// default) don't have to require() native ESM.
	const cjsConfig = defineConfig({
		input,
		external: (id) => id.startsWith("node:") || isExternal(id, cjsExternal),
		plugins: [nodeProtocolPlugin(), defineVersionPlugin(pkg.package.version)],
		output: {
			file: path.join(basePath, exports.default.require),
			format: "cjs",
			sourcemap: true,
			exports: "auto",
		},
		resolve: {
			alias: aliases,
		},
	});

	// DTS config for type declarations
	// Don't use aliases here - we want to reference external package types, not inline them
	const dtsConfig = defineConfig({
		input,
		external: (id) => id.startsWith("node:") || isExternal(id, external),
		plugins: [nodeProtocolPlugin(), dts({ emitDtsOnly: true })],
		output: {
			dir: path.join(basePath, "dist"),
			format: "esm",
		},
	});

	return [esmConfig, cjsConfig, dtsConfig];
});

export default configs;
