import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	serverExternalPackages: ["yjs"],
	turbopack: {
		root: "../../",
		resolveAlias: {
			"@hocuspocus/provider": "../../packages/provider/src/index.ts",
			"@hocuspocus/common": "../../packages/common/src/index.ts",
			"@hocuspocus/transformer": "../../packages/transformer/src/index.ts",
		},
	},
	webpack: (config) => {
		return config;
	},
};

export default nextConfig;
