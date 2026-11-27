// Fails when a server route that depends on a run-time secret was compiled
// down to nothing.
//
// Astro replaces `import.meta.env.X` with a literal at build time. A secret
// that exists only on the server at run time is `undefined` then, so a
// fail-closed check such as `if (!secret) return 401` becomes the whole route
// and the bundler removes the rest. That happened to the scheduled-publish
// route: its tests passed (they stub the value) while the built route could
// only ever answer 401.
//
// Run after `astro build`, with the secret NOT set, as the image build does:
//   node scripts/check-built-routes.mjs [path to dist/server]
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Each source's built code must keep a string that only its real work has. */
const ROUTES = [
  {
    route: "/api/cron/publish-scheduled",
    source: "src/pages/api/cron/publish-scheduled.ts",
    mustContain: ["No posts to publish"],
  },
  {
    route: "the scheduler secret (lib/scheduler.ts)",
    source: "src/lib/scheduler.ts",
    mustContain: ["process.env.CRON_SECRET"],
  },
  {
    route: "the GitHub token (lib/github.ts)",
    source: "src/lib/github.ts",
    mustContain: ["process.env.GH_API_TOKEN"],
  },
];

function builtFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...builtFiles(path));
    else if (/\.(mjs|js)$/.test(name)) out.push(path);
  }
  return out;
}

/** The problems found in a built server folder; empty when every route is intact. */
export function checkBuiltRoutes(serverDir, routes = ROUTES) {
  let files;
  try {
    files = builtFiles(serverDir);
  } catch (error) {
    return [`cannot read the built server at ${serverDir}: ${error.message}. Build the site first.`];
  }
  if (files.length === 0) return [`no built files under ${serverDir}. Build the site first.`];

  const problems = [];
  for (const { route, source, mustContain } of routes) {
    const marker = `//#region ${source}`;
    const owners = files.filter((file) => readFileSync(file, "utf8").includes(marker));
    // Without region comments (a minified build) fall back to every built file.
    const haystack = (owners.length > 0 ? owners : files).map((file) => readFileSync(file, "utf8")).join("\n");
    for (const text of mustContain) {
      if (!haystack.includes(text)) {
        problems.push(
          `${route}: the built server does not contain ${JSON.stringify(text)}. ` +
            "The code was compiled away: read run-time secrets with process.env, not import.meta.env.",
        );
      }
    }
  }
  return problems;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const siteDir = dirname(dirname(fileURLToPath(import.meta.url)));
  const serverDir = resolve(process.argv[2] ?? join(siteDir, "dist", "server"));
  const problems = checkBuiltRoutes(serverDir);
  if (problems.length > 0) {
    for (const problem of problems) console.error(`::error::${problem}`);
    process.exit(1);
  }
  console.log(`Built routes are intact (${ROUTES.length} checked in ${serverDir}).`);
}
