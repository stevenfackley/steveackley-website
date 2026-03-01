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
      // Exclude infrastructure files that require external runtime dependencies
      // (database, bcrypt, NextAuth session machinery) and cannot be unit-tested
      // without a full integration environment.
      exclude: [
        // NextAuth + Prisma + bcrypt initialisation — requires live DB
        "src/lib/auth.ts",
        // Prisma singleton — requires DATABASE_URL and pg adapter
        "src/lib/prisma.ts",
        // NextAuth route re-export — just `export const { GET, POST } = handlers`
        "src/app/api/auth/**",
        // Standard vitest exclusions
        "**/*.d.ts",
        "**/node_modules/**",
      ],
    },
  },
});
