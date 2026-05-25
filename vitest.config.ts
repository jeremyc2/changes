import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["src/**/*.test.ts", "test/**/*.test.ts"],
		exclude: ["reference_repositories/**", "node_modules/**"],
	},
});
