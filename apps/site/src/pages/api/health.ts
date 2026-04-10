import type { APIRoute } from "astro";

export const GET: APIRoute = ({ request }) => {
  const requestId = request.headers.get("x-request-id");

  return new Response(
    JSON.stringify({
      status: "ok",
      service: "steveackleyorg-site",
      timestamp: new Date().toISOString(),
      requestId,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
};
