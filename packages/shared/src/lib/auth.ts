import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index";
import * as schema from "../db/schema";

const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

// Build trusted origins: always trust both localhost and 127.0.0.1 variants
// so the dev server works regardless of how the browser resolves the hostname.
function buildTrustedOrigins(base: string): string[] {
  const origins = new Set<string>([base]);
  try {
    const url = new URL(base);
    // Add the 127.0.0.1 variant if the base uses localhost, and vice-versa
    if (url.hostname === "localhost") {
      origins.add(`${url.protocol}//127.0.0.1:${url.port}`);
    } else if (url.hostname === "127.0.0.1") {
      origins.add(`${url.protocol}//localhost:${url.port}`);
    }
  } catch {
    // invalid URL, just use as-is
  }
  return Array.from(origins);
}

export const auth = betterAuth({
  baseURL: baseUrl,
  trustedOrigins: buildTrustedOrigins(baseUrl),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    }
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "CLIENT",
      },
      companyName: {
        type: "string",
        required: false,
      },
      contactFirstName: {
        type: "string",
        required: false,
      },
      contactLastName: {
        type: "string",
        required: false,
      },
      logo: {
        type: "string",
        required: false,
      },
    }
  },
  // Ensure the cookie is secure in production
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    }
  }
});
