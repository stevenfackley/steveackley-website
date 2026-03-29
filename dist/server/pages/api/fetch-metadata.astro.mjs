export { renderers } from '../../renderers.mjs';

const POST = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== "ADMIN") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  try {
    const { url } = await request.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), { status: 400 });
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }
    const html = await response.text();
    const title = html.match(/<title>(.*?)<\/title>/i)?.[1] || "";
    const description = html.match(/<meta name="description" content="(.*?)"/i)?.[1] || html.match(/<meta property="og:description" content="(.*?)"/i)?.[1] || "";
    const ogImage = html.match(/<meta property="og:image" content="(.*?)"/i)?.[1] || "";
    let favicon = html.match(/<link rel="shortcut icon" href="(.*?)"/i)?.[1] || html.match(/<link rel="icon" href="(.*?)"/i)?.[1] || "";
    if (favicon && !favicon.startsWith("http")) {
      const urlObj = new URL(url);
      favicon = new URL(favicon, urlObj.origin).toString();
    }
    return new Response(JSON.stringify({
      title,
      description,
      ogImage,
      favicon
    }), { status: 200 });
  } catch (error) {
    console.error("Fetch metadata error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch metadata" }), { status: 500 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
