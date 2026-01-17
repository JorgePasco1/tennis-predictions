/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
	// Increase the maximum allowed body size for API routes (for MHTML uploads)
	experimental: {
		proxyClientMaxBodySize: "50mb",
	},
};

export default config;
