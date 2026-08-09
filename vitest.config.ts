import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30000, // Give it 30 seconds, as the memory server takes a moment to download on first run
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
  },
});
