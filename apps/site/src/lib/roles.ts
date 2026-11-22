import type { roleEnum } from "@/db/schema";

/**
 * A user's role, taken from the database enum so a misspelt role is a
 * compile error. Better Auth still types `user.role` as a plain string, so the
 * predicates below accept any string and compare it against these values.
 */
export type Role = (typeof roleEnum.enumValues)[number];

const ADMIN = "ADMIN" satisfies Role;
const CLIENT = "CLIENT" satisfies Role;

type MaybeUser = { role: string } | null | undefined;

/** True when the user is signed in with the ADMIN role. */
export function isAdmin(user: MaybeUser): boolean {
  return user?.role === ADMIN;
}

/**
 * True when the user may enter the client portal: CLIENT users, and ADMIN
 * users, who are allowed in for support.
 */
export function canUseClientPortal(user: MaybeUser): boolean {
  return user?.role === CLIENT || user?.role === ADMIN;
}
