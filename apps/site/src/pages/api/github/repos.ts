import type { APIRoute } from "astro";
import { getCachedRepos } from "@/lib/github";

export const GET: APIRoute = async () => {
  const { repos, fetchedAt } = await getCachedRepos();
  return new Response(
    JSON.stringify({
      repos,
      fetchedAt: new Date(fetchedAt).toISOString(),
    }),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
};
