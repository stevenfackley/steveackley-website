import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      // Match the @/* path alias from tsconfig.json
      "@": resolve(__dirname, "./src"),
    },
  },
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
    // Flip to jsdom only for React component tests
    environmentMatchGlobs: [["src/__tests__/unit/components/**", "jsdom"]],
    setupFiles: ["src/__tests__/setup.ts"],
    include: [
      "src/__tests__/**/*.test.ts",
      "src/__tests__/**/*.test.tsx",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/lib/**", "src/app/api/**"],
    },
  },
});
