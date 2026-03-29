import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load .env.local first (local dev), falling back to .env
config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
