import { describe, expect, it } from "vitest";
import { GET } from "@/pages/api/health";

describe("GET /api/health", () => {
  it("returns the expected health payload", async () => {
    const response = await GET({
      request: new Request("https://example.com/api/health"),
    } as never);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/json");

    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.service).toBe("steveackleyorg-site");
    expect(new Date(body.timestamp).toString()).not.toBe("Invalid Date");
    expect(body.requestId).toBeNull();
  });

  it("echoes the incoming request ID when present", async () => {
    const response = await GET({
      request: new Request("https://example.com/api/health", {
        headers: { "x-request-id": "req-123" },
      }),
    } as never);

    const body = await response.json();
    expect(body.requestId).toBe("req-123");
  });
});
