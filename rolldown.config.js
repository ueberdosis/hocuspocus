import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "rolldown";
import { dts } from "rolldown-plugin-dts";
import getPackages from "get-monorepo-packages";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getWorkspacePackages() {
	const packages = getPackages(__dirname);

	// Filter to only include packages with exports (buildable packages)
	return packages.filter((pkg) => {
		const pkgJson = pkg.package;
		return (
			pkgJson.exports &&
			!["@hocuspocus/docs", "@hocuspocus/demo"].includes(pkgJson.name)
		);
	});
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
	packages.map((pkg) => [
		pkg.package.name,
		path.join(pkg.location, "src"),
	]),
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
	const dtsConfig = defineConfig({
		input,
		external: [
			...external,
			/^node:/,
		],
		plugins: [dts()],
		output: {
			dir: path.join(basePath, "dist"),
			format: "esm",
		},
		resolve: {
			alias: aliases,
		},
	});

	return [bundleConfig, dtsConfig];
});

export default configs;
