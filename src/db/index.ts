import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  queryClient: ReturnType<typeof postgres> | undefined;
};

// Create the postgres client
const dbUrl = process.env.DATABASE_URL!;
try {
  const parsedUrl = new URL(dbUrl);
  console.log(`[Database] Initializing connection to ${parsedUrl.hostname}:${parsedUrl.port}/${parsedUrl.pathname.replace('/', '')}`);
} catch {
  console.log(`[Database] Initializing connection with custom URL format`);
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
