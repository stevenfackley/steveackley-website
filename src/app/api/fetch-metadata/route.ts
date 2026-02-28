import { NextResponse } from "next/server";

export const runtime = "nodejs";

// POST /api/fetch-metadata
// Request body: { url: string }
// Response: { title, description, ogImage, favicon } or { error }
export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch URL: ${res.status}` }, { status: res.status });
    }

    const html = await res.text();
    // Extract metadata via regex
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i);
    const faviconMatch = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']*)["']/i);

    const metadata = {
      title: titleMatch?.[1] ?? "",
      description: descMatch?.[1] ?? "",
      ogImage: ogImageMatch?.[1] ?? "",
      favicon: faviconMatch?.[1] ?? ""
    };

    return NextResponse.json(metadata);
  } catch (err) {
    console.error("[fetch-metadata]", err);
    return NextResponse.json({ error: "Error fetching metadata" }, { status: 500 });
  }
}