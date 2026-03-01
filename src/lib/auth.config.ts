/**
 * Edge-compatible NextAuth configuration.
 * No Prisma, no Node.js-only imports — safe for use in middleware (Edge Runtime).
 * The full auth (with Credentials provider + Prisma) lives in ./auth.ts
 */
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  providers: [],

  pages: {
    signIn: "/admin/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: "ADMIN" | "CLIENT" }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "ADMIN" | "CLIENT") ?? "CLIENT";
      }
      return session;
    },
  },
};
