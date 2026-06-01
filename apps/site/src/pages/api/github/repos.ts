import type { APIRoute } from "astro";
import { getPublicRepos, enrichRepos, type EnrichedRepo } from "@/lib/github";

const TTL_MS = 30_000;

let cache: { data: EnrichedRepo[]; fetchedAt: number } | null = null;
let inflight: Promise<EnrichedRepo[]> | null = null;

async function loadRepos(): Promise<EnrichedRepo[]> {
  if (inflight) return inflight;
  inflight = (async () => {
    const repos = await getPublicRepos();
    const enriched = await enrichRepos(repos);
    cache = { data: enriched, fetchedAt: Date.now() };
    return enriched;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export const GET: APIRoute = async () => {
  if (!cache || Date.now() - cache.fetchedAt > TTL_MS) {
    await loadRepos();
  }
  const body = JSON.stringify({
    repos: cache!.data,
    fetchedAt: new Date(cache!.fetchedAt).toISOString(),
  });
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
};
