import type { DefaultSession, DefaultJWT } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "CLIENT";
    } & DefaultSession["user"];
  }

  interface User {
    role?: "ADMIN" | "CLIENT";
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: "ADMIN" | "CLIENT";
  }
}
