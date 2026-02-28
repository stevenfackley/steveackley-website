/**
 * Integration tests for POST /api/fetch-metadata
 *
 * The route handler is imported directly and invoked with mock Request objects.
 * `global.fetch` is replaced with a Vitest spy so no real HTTP calls happen.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/fetch-metadata/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/fetch-metadata", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockFetchResponse(html: string, status = 200) {
  return vi.spyOn(global, "fetch").mockResolvedValueOnce(
    new Response(html, { status })
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("POST /api/fetch-metadata", () => {
  it("returns 400 when no url is provided", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/missing url/i);
  });

  it("parses title from HTML", async () => {
    mockFetchResponse("<html><head><title>My Site</title></head></html>");
    const res = await POST(makeRequest({ url: "https://example.com" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.title).toBe("My Site");
  });

  it("parses description meta tag", async () => {
    mockFetchResponse(
      `<html><head>
        <meta name="description" content="A great description" />
      </head></html>`
    );
    const res = await POST(makeRequest({ url: "https://example.com" }));
    const json = await res.json();
    expect(json.description).toBe("A great description");
  });

  it("parses og:image meta tag", async () => {
    mockFetchResponse(
      `<html><head>
        <meta property="og:image" content="https://example.com/og.png" />
      </head></html>`
    );
    const res = await POST(makeRequest({ url: "https://example.com" }));
    const json = await res.json();
    expect(json.ogImage).toBe("https://example.com/og.png");
  });

  it("parses favicon link tag", async () => {
    mockFetchResponse(
      `<html><head>
        <link rel="icon" href="/favicon.ico" />
      </head></html>`
    );
    const res = await POST(makeRequest({ url: "https://example.com" }));
    const json = await res.json();
    expect(json.favicon).toBe("/favicon.ico");
  });

  it("returns empty strings for metadata not found in HTML", async () => {
    mockFetchResponse("<html><head></head><body>Nothing</body></html>");
    const res = await POST(makeRequest({ url: "https://example.com" }));
    const json = await res.json();
    expect(json).toEqual({ title: "", description: "", ogImage: "", favicon: "" });
  });

  it("forwards the upstream HTTP status when the remote URL is not OK", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("Not Found", { status: 404 })
    );
    const res = await POST(makeRequest({ url: "https://example.com/missing" }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/404/);
  });

  it("returns 500 when fetch throws", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network error"));
    const res = await POST(makeRequest({ url: "https://example.com" }));
    expect(res.status).toBe(500);
  });

  it("parses all fields together from a realistic HTML page", async () => {
    const html = `
      <html>
        <head>
          <title>Steve Ackley – Software Engineer</title>
          <meta name="description" content="Portfolio of Steve Ackley" />
          <meta property="og:image" content="https://steveackley.org/og.png" />
          <link rel="icon" href="/favicon.ico" />
        </head>
        <body></body>
      </html>
    `;
    mockFetchResponse(html);
    const res = await POST(makeRequest({ url: "https://steveackley.org" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.title).toBe("Steve Ackley – Software Engineer");
    expect(json.description).toBe("Portfolio of Steve Ackley");
    expect(json.ogImage).toBe("https://steveackley.org/og.png");
    expect(json.favicon).toBe("/favicon.ico");
  });
});
