import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
		exclude: ["node_modules", ".next", "dist"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			include: ["src/server/**/*.ts"],
			exclude: [
				"src/server/db/index.ts",
				"src/server/api/trpc.ts",
				"**/*.test.ts",
			],
		},
		setupFiles: ["./src/test/setup.ts"],
		testTimeout: 10000,
	},
	resolve: {
		alias: {
			"~": path.resolve(__dirname, "./src"),
		},
	},
});
