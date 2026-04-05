import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@shared/index": resolve(__dirname, "../../packages/shared/src/index.ts"),
      "@shared/db": resolve(__dirname, "../../packages/shared/src/db/index.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["src/__tests__/setup.ts"],
    include: ["src/__tests__/**/*.test.ts", "src/__tests__/**/*.test.tsx"],
  },
});
