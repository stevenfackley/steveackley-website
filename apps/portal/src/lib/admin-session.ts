import { auth } from "@shared/index";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export async function getSessionFromHeaders(requestHeaders: Headers): Promise<AuthSession> {
  return auth.api.getSession({
    headers: requestHeaders,
  });
}

export async function requireAdminSession(): Promise<NonNullable<AuthSession>> {
  const session = await getSessionFromHeaders(await headers());

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return session;
}
