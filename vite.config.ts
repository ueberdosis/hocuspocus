import { defineConfig } from "vite-plus";

export default defineConfig({
	staged: {
		"*.{js,cjs,mjs,ts,cts,mts,tsx,jsx,json,jsonc}": "biome lint --fix",
	},
});
