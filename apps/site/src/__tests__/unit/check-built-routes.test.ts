/**
 * Unit tests for scripts/check-built-routes.mjs: the guard that fails a build
 * in which a route's code was compiled away because it read a run-time secret
 * through import.meta.env.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkBuiltRoutes } from "../../../scripts/check-built-routes.mjs";

const REGION = "//#region src/pages/api/cron/publish-scheduled.ts";

// What `astro build` produced before the fix: the secret was `undefined` at
// build time, so only the 401 branch survived.
const COMPILED_AWAY = `${REGION}
var GET = async ({ request }) => {
	request.headers.get("authorization");
	return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
};
//#endregion
`;

const INTACT = `${REGION}
var GET = async ({ request }) => {
	const expectedToken = process.env.CRON_SECRET;
	if (!expectedToken) return new Response("{}", { status: 401 });
	return new Response(JSON.stringify({ message: "No posts to publish" }));
};
//#endregion
`;

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "built-routes-"));
  mkdirSync(join(dir, "chunks"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("checkBuiltRoutes", () => {
  it("passes when the route's code is in the build", () => {
    writeFileSync(join(dir, "chunks", "publish-scheduled_abc.mjs"), INTACT);

    expect(checkBuiltRoutes(dir)).toEqual([]);
  });

  it("fails when the route was compiled down to a bare 401", () => {
    writeFileSync(join(dir, "chunks", "publish-scheduled_abc.mjs"), COMPILED_AWAY);

    const problems = checkBuiltRoutes(dir);

    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain("/api/cron/publish-scheduled");
    expect(problems[0]).toContain("process.env.CRON_SECRET");
    expect(problems[1]).toContain("No posts to publish");
  });

  it("is not satisfied by the same text in another route's file", () => {
    writeFileSync(join(dir, "chunks", "publish-scheduled_abc.mjs"), COMPILED_AWAY);
    writeFileSync(
      join(dir, "chunks", "other_def.mjs"),
      '//#region src/pages/api/other.ts\nprocess.env.CRON_SECRET; "No posts to publish";\n//#endregion\n',
    );

    expect(checkBuiltRoutes(dir)).toHaveLength(2);
  });

  it("searches every built file when the build carries no region comments", () => {
    writeFileSync(join(dir, "entry.mjs"), 'const t=process.env.CRON_SECRET;const m="No posts to publish";');

    expect(checkBuiltRoutes(dir)).toEqual([]);
  });

  it("says to build first when there is no built server", () => {
    expect(checkBuiltRoutes(join(dir, "missing"))).toEqual([
      expect.stringContaining("Build the site first"),
    ]);
    expect(checkBuiltRoutes(join(dir, "chunks"))).toEqual([
      expect.stringContaining("Build the site first"),
    ]);
  });
});
