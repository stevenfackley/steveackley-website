import { describe, it, expect } from "vitest";
import { isAdmin, canUseClientPortal } from "@/lib/roles";

type TestUser = { role: string } | null | undefined;

// [label, user, isAdmin, canUseClientPortal]
const table: Array<[string, TestUser, boolean, boolean]> = [
  ["null", null, false, false],
  ["undefined", undefined, false, false],
  ["ADMIN", { role: "ADMIN" }, true, true],
  ["CLIENT", { role: "CLIENT" }, false, true],
  ["lowercase admin", { role: "admin" }, false, false],
  ["lowercase client", { role: "client" }, false, false],
  ["empty role", { role: "" }, false, false],
  ["unknown role", { role: "EDITOR" }, false, false],
];

describe("role predicates", () => {
  it.each(table)("%s", (_label, user, admin, clientPortal) => {
    expect(isAdmin(user)).toBe(admin);
    expect(canUseClientPortal(user)).toBe(clientPortal);
  });
});
