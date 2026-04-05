import type { APIRoute } from "astro";
import { logger } from "@/lib/logger";

export const POST: APIRoute = async ({ request, locals }) => {
  // Check auth - only admins should fetch metadata for client apps
  if (!locals.user || locals.user.role !== 'ADMIN') {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  let targetUrl = "";
  try {
    const { url } = await request.json();
    targetUrl = url;

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "URL is required" }), { status: 400 });
    }

    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Very simple regex-based metadata extraction for now
    // In a real app, use a proper HTML parser like node-html-parser or link-preview-js
    const title = html.match(/<title>(.*?)<\/title>/i)?.[1] || "";
    const description = html.match(/<meta name="description" content="(.*?)"/i)?.[1] || 
                       html.match(/<meta property="og:description" content="(.*?)"/i)?.[1] || "";
    const ogImage = html.match(/<meta property="og:image" content="(.*?)"/i)?.[1] || "";
    
    // Favicon and icon
    let favicon = html.match(/<link rel="shortcut icon" href="(.*?)"/i)?.[1] ||
                  html.match(/<link rel="icon" href="(.*?)"/i)?.[1] || "";
    
    if (favicon && !favicon.startsWith("http")) {
      const urlObj = new URL(targetUrl);
      favicon = new URL(favicon, urlObj.origin).toString();
    }

    return new Response(JSON.stringify({
      title,
      description,
      ogImage,
      favicon,
    }), { status: 200 });

  } catch (error) {
    logger.error(
      "Failed to fetch metadata",
      error instanceof Error ? error : new Error(String(error)),
      { url: targetUrl }
    );
    return new Response(JSON.stringify({ error: "Failed to fetch metadata" }), { status: 500 });
  }
};
