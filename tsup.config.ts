import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    naming: "src/naming/index.ts",
    mcp: "src/mcp.ts",
    http: "src/http.ts",
  },
  format: ["esm"],
  target: "node20",
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: true,
  treeshake: true,
});
