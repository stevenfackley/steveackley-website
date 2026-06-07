import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@shared": resolve(__dirname, "../../packages/shared/src"),
    },
  },
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["src/__tests__/setup.ts"],
    include: [
      "src/__tests__/**/*.test.ts",
      "src/__tests__/**/*.test.tsx",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/lib/**", "src/pages/api/**"],
      // Exclude infrastructure files that require external runtime dependencies
      // (database, bcrypt, Better-Auth session machinery) and cannot be unit-tested
      // without a full integration environment.
      exclude: [
        // Better-Auth + Drizzle initialisation — requires live DB
        "src/lib/auth.ts",
        // Re-export of DB instance
        "src/lib/db.ts",
        // Auth route handler — just `return auth.handler(context.request)`
        "src/pages/api/auth/**",
        // Cron route is excluded - requires DB operations
        "src/pages/api/cron/**",
        // Standard vitest exclusions
        "**/*.d.ts",
        "**/node_modules/**",
      ],
      // Regression ratchet: set a few points below current coverage so normal
      // churn passes but a real drop fails CI. Raise as coverage improves.
      thresholds: {
        statements: 65,
        branches: 50,
        functions: 45,
        lines: 65,
      },
    },
  },
});
