import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Look up user by email
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          // Prevent timing oracle by still hashing
          await hash("dummy-to-prevent-timing-attack", 12);
          return null;
        }

        // Compare password against bcrypt hash
        const isValid = await compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        const u = user as typeof user & { role?: "ADMIN" | "CLIENT" };
        return {
          id: u.id,
          email: u.email,
          name: u.name ?? undefined,
          role: u.role ?? "CLIENT",
        };
      },
    }),
  ],
});
