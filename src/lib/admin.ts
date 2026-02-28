export const DEFAULT_ADMIN_EMAIL = "stevenfackley@gmail.com";

export function isDefaultAdminEmail(email?: string | null): boolean {
  return (email ?? "").trim().toLowerCase() === DEFAULT_ADMIN_EMAIL;
}
