import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  queryClient: ReturnType<typeof postgres> | undefined;
};

// Create the postgres client
export const queryClient =
  globalForDb.queryClient ??
  postgres(process.env.DATABASE_URL!, {
    max: process.env.NODE_ENV === "production" ? 10 : 1,
    prepare: false, // Required for query batching
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.queryClient = queryClient;
}

// Create the Drizzle database instance
export const db = drizzle(queryClient, { schema });

// Export schema for easy access
export * from "./schema";
