import { describe, it, expect } from "vitest";
import { adminLinks, clientLinks } from "@/lib/navigation";

describe("adminLinks", () => {
  it("contains required admin routes", () => {
    const hrefs = adminLinks.map((l) => l.href);
    expect(hrefs).toContain("/admin/dashboard");
    expect(hrefs).toContain("/admin/posts");
    expect(hrefs).toContain("/admin/users");
    expect(hrefs).toContain("/admin/settings");
  });

  it("every link has a non-empty label", () => {
    for (const link of adminLinks) {
      expect(link.label.length).toBeGreaterThan(0);
    }
  });

  it("every href starts with /admin/", () => {
    for (const link of adminLinks) {
      expect(link.href).toMatch(/^\/admin\//);
    }
  });
});

describe("clientLinks", () => {
  it("contains required client routes", () => {
    const hrefs = clientLinks.map((l) => l.href);
    expect(hrefs).toContain("/client/dashboard");
    expect(hrefs).toContain("/client/account");
    expect(hrefs).toContain("/client/messages");
  });

  it("every link has a non-empty label", () => {
    for (const link of clientLinks) {
      expect(link.label.length).toBeGreaterThan(0);
    }
  });

  it("every href starts with /client/", () => {
    for (const link of clientLinks) {
      expect(link.href).toMatch(/^\/client\//);
    }
  });
});
