import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	serverExternalPackages: ["yjs"],
	turbopack: {
		root: "../../",
	},
};

export default nextConfig;
