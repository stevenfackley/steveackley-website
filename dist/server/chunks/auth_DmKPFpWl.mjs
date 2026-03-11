import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { d as db, v as verifications, a as accounts, s as sessions, u as users } from './index_BS2BhPuU.mjs';

const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications
    }
  }),
  emailAndPassword: {
    enabled: true
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "CLIENT"
      },
      companyName: {
        type: "string",
        required: false
      },
      contactFirstName: {
        type: "string",
        required: false
      },
      contactLastName: {
        type: "string",
        required: false
      },
      logo: {
        type: "string",
        required: false
      }
    }
  },
  // Ensure the cookie is secure in production
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60
      // 5 minutes
    }
  }
});

export { auth as a };
