import type { APIRoute } from "astro";
import { logger } from "@/lib/logger";

// Block requests to private / reserved IPv4 ranges so this server-side fetch
// can't be pivoted into the internal network or the cloud metadata endpoint.
function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true; // malformed → treat as unsafe
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true; // "this network", private, loopback
  if (a === 169 && b === 254) return true; // link-local (incl. 169.254.169.254 metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, ""); // strip IPv6 brackets
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }
  if (host.includes(":")) {
    // IPv6 literal: block loopback, link-local (fe80::/10) and unique-local (fc00::/7).
    if (host === "::1" || host === "::") return true;
    if (host.startsWith("fe8") || host.startsWith("fe9") || host.startsWith("fea") || host.startsWith("feb")) return true;
    if (host.startsWith("fc") || host.startsWith("fd")) return true;
    const tail = host.split(":").pop() ?? "";
    if (tail.includes(".")) return isPrivateIpv4(tail); // IPv4-mapped
    return false;
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return isPrivateIpv4(host);
  // Public hostname. NOTE: DNS-rebinding (a public name resolving to a private
  // IP) is not covered here; the endpoint is admin-only as a second layer.
  return false;
}

export const POST: APIRoute = async ({ request, locals }) => {
  // Check auth - only admins should fetch metadata for client apps
  if (!locals.user || locals.user.role !== 'ADMIN') {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  let targetUrl = "";
  try {
    const { url } = await request.json();
    targetUrl = typeof url === "string" ? url : "";

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "URL is required" }), { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), { status: 400 });
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return new Response(JSON.stringify({ error: "Invalid URL" }), { status: 400 });
    }
    if (isBlockedHost(parsed.hostname)) {
      return new Response(JSON.stringify({ error: "URL not allowed" }), { status: 400 });
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
