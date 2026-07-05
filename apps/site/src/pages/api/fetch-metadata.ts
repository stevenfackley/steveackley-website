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

// Cap how much of a remote response body we'll buffer into memory. A
// malicious or misbehaving upstream could otherwise stream an unbounded
// response and exhaust server memory.
const MAX_METADATA_BYTES = 2 * 1024 * 1024; // 2 MB

// Reads a response body up to `maxBytes`, checking the Content-Length header
// up front (when present) and also enforcing the cap while streaming, since
// Content-Length can be absent or wrong (e.g. chunked transfer encoding).
async function readBodyWithLimit(response: Response, maxBytes: number): Promise<string> {
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new Error("Response body too large");
  }

  if (!response.body) {
    return response.text();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new Error("Response body too large");
    }
    chunks.push(value);
  }

  const combined = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8").decode(combined);
}

// Follows redirects manually so every hop's hostname is re-validated against
// isBlockedHost — plain fetch() follows redirects transparently, which would
// let a public URL 302 to an internal/metadata address and bypass the check
// above. Also bounds request time to avoid a slow/hanging upstream tying up
// the server.
async function safeFetch(startUrl: string, maxRedirects = 5): Promise<Response> {
  let currentUrl = startUrl;
  for (let i = 0; i <= maxRedirects; i++) {
    const res = await fetch(currentUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error("Redirect without Location header");
      const nextUrl = new URL(location, currentUrl);
      if (nextUrl.protocol !== "http:" && nextUrl.protocol !== "https:") {
        throw new Error("Invalid redirect target");
      }
      if (isBlockedHost(nextUrl.hostname)) {
        throw new Error("Redirect target not allowed");
      }
      currentUrl = nextUrl.toString();
      continue;
    }
    return res;
  }
  throw new Error("Too many redirects");
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

    const response = await safeFetch(targetUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const html = await readBodyWithLimit(response, MAX_METADATA_BYTES);
    
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
