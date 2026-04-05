import { auth } from "@shared/index";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;
type PortalSession = NonNullable<AuthSession>;

export async function getSessionFromHeaders(requestHeaders: Headers): Promise<AuthSession> {
  return auth.api.getSession({
    headers: requestHeaders,
  });
}

async function requireRoleSession(role: "ADMIN" | "CLIENT"): Promise<PortalSession> {
  const session = await getSessionFromHeaders(await headers());

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== role) {
    redirect(session.user.role === "ADMIN" ? "/admin/dashboard" : "/client/dashboard");
  }

  return session;
}

export async function requireAdminSession(): Promise<PortalSession> {
  return requireRoleSession("ADMIN");
}

export async function requireClientSession(): Promise<PortalSession> {
  return requireRoleSession("CLIENT");
}
