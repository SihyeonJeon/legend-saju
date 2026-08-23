import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Cross-system calculations intentionally exercise full deterministic tables.
    // Give slower CI runners room without weakening assertions.
    testTimeout: 20_000,
  },
});
