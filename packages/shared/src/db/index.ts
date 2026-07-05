import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "../lib/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../../../");
const currentAppRoot = process.cwd();

for (const envPath of [
  path.join(currentAppRoot, ".env.local"),
  path.join(currentAppRoot, ".env"),
  path.join(repoRoot, ".env.local"),
  path.join(repoRoot, ".env"),
]) {
  config({ path: envPath, override: false });
}

const globalForDb = globalThis as unknown as {
  queryClient: ReturnType<typeof postgres> | undefined;
};

// Create the postgres client
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}
try {
  const parsedUrl = new URL(dbUrl);
  logger.info(`Initializing database connection to ${parsedUrl.hostname}:${parsedUrl.port}/${parsedUrl.pathname.replace('/', '')}`);
} catch {
  logger.info("Initializing database connection with custom URL format");
}

export const queryClient =
  globalForDb.queryClient ??
  postgres(dbUrl, {
    max: process.env.NODE_ENV === "production" ? 10 : 1,
    prepare: false, // Required for query batching
    connect_timeout: 15, // Fail faster if the DB is unreachable (e.g., in CI)
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.queryClient = queryClient;
}

// Create the Drizzle database instance
export const db = drizzle(queryClient, { schema });

// Export schema for easy access
export * from "./schema";
