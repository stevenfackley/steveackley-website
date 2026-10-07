<!--
Admin form fields:
  Title:    An open PR is not a shipped PR
  Slug:     an-open-pr-is-not-a-shipped-pr (auto-derived)
  Excerpt:  HaulCall PR #381 sat green and unmerged from 2026-08-24 to 2026-08-28 while my notes called the bug fixed. Merging it then turned main red against a PR merged three hours earlier. The gh and git checks I run now.
  Category: Engineering
  Tags:     haulcall, git, ci, process, github-actions
  Cover:    (none)
  Body:     everything below this comment
-->

At 21:19 Eastern on 2026-08-28 I merged HaulCall PR #381. I had opened it just after midnight on 2026-08-24, every required check had passed within five minutes, and GitHub had shown it as mergeable ever since. For those four days my notes and an end-of-session summary both listed the bug it fixed as repaired. The bug sat in production the whole time.

About five minutes after the merge, main went red, and the deploy pipeline refused to ship the fix I had kept waiting for four days. I made two mistakes, one over four days and one in seven seconds that evening. Both have cheap checks, and I run them now.

## What #381 fixed

HaulCall has an admin "view as seller" mode for support: a platform admin picks a seller and sees the portal the way that seller does, read-only. The feature shipped in July (PR #71, 2026-07-16). An audit in August found the server half sound and the web client leaking across tenants. View-as state lived in a cookie that one module, `web/lib/api.ts`, knew how to read, and three other paths from the web app to the API ignored it. In the worst case, an account-level action taken while viewing as a seller ran against the admin's own account. In another, the live page could print a label on the admin's own label stock.

#381 made one function the only reader of view-as state and pointed every consumer at it. The PR body records 607 API tests and 372 web tests passing, plus an end-to-end tenant-isolation scenario run against a real stack. It reached production at 01:49 UTC on 2026-08-29. Both leaks needed a platform admin in view-as to trigger, and nothing in my notes records that happening during the four days.

## How a green PR passed for a fix

I opened the PR, CI went green, and the session that wrote the code ended with a summary saying the leaks were repaired. My notes copied the summary. Anyone reading either one, me included, would conclude the work was done. I never pressed merge.

A green check rollup next to "This branch has no conflicts with the base branch" looks like a finished thing. Both lines describe the branch. Production runs main, and main had none of it.

A note that says "fixed" should answer whether the change is on main. These are the checks I run before I write that word:

```bash
# Merged at all? mergedAt stays null until it is.
gh pr view 381 --json state,mergedAt,mergeCommit \
  --jq '{state, mergedAt, sha: .mergeCommit.oid}'

# Is the file on main? ls-tree prints nothing if the path is absent.
git fetch origin main
git ls-tree origin/main web/lib/view-as.ts

# For a fix that only edits existing files, ask about the squash commit.
git merge-base --is-ancestor <merge commit sha> origin/main && echo "on main"
```

`git ls-tree` proves only that a path exists, so it works when the fix adds a file, as #381 added `web/lib/view-as.ts`. When the fix edits files that were already there, check ancestry of the merge commit. With squash merges the PR's head commit will never be an ancestor of main, because the squash commit gets a new SHA.

On HaulCall, being on main still leaves one step. The deploy workflow triggers on `workflow_run` from CI and proceeds only when CI concluded `success`, then goes staging, staging smoke test, production. So the last check is the first successful `deploy-prod` run whose head commit has the merge commit as an ancestor:

```bash
gh run list -w deploy --branch main --json databaseId,headSha,conclusion,createdAt
gh run view <id> --json jobs --jq '.jobs[] | [.name, .conclusion] | @tsv'
git merge-base --is-ancestor <merge sha> <deployed headSha> && echo "shipped by that run"
```

The merge commit's own deploy run is not the one to look for. For #381's merge commit, every deploy run concluded `skipped`, and the fix reached production through the deploy run for #393's commit, a later descendant. A burst of merges, a docs-only tip commit or a Dependabot-authored head commit (the workflow skips those) can each leave a commit shipped by a later commit's deploy.

## Green alone, red together

Four PRs landed in under three minutes that night. #382 was a grouped npm minor-and-patch bump. #383 and #384 moved the `hashicorp/aws` Terraform provider from 6.60.0 to 6.61.0 in `/infra` and `/infra/staging`. All three came from Dependabot; I covered auto-merging its patch bumps separately in [Thirty-eight lines](/blog/patch-only-dependabot-automerge). Each one had green checks. GitHub Actions auto-merged #382 on a branch re-run a couple of minutes earlier, and I then merged #383, #384 and #381, in that order, inside seven seconds. A merge made with `GITHUB_TOKEN` triggers no push workflows, so #382's merge commit never got a CI run on main at all.

#381's checks had run against main as it stood on 2026-08-24. By the time I merged it, eleven other commits had landed on main, all on 2026-08-28. One was #388, which added show archiving and merged at 18:09 Eastern, about three hours earlier. #388 brought tests in `web/lib/__tests__/api.test.ts` for the new archive calls, and those calls go through `request()` in `web/lib/api.ts`.

#381 changed `request()` to look up view-as state on every call. The lookup costs one cookie read for an ordinary seller:

```ts
export async function getViewAs(): Promise<ViewAs | null> {
  const jar = await cookies();
  const sellerId = jar.get(ACT_AS_COOKIE)?.value;
  if (!sellerId) return null;
  if (!hasRole(await auth(), "platform-admin")) return null;
  return { sellerId, name: jar.get(ACT_AS_NAME_COOKIE)?.value ?? "seller" };
}
```

`cookies()` comes from `next/headers`, and Next throws when you call it outside a request. #388's tests were written against a main that did not yet have #381, so they never mocked `next/headers`, because nothing they exercised touched it. On the merge commit the `web` job reported 4 failed and 409 passed out of 413, each failure on the same line:

```
Error: `cookies` was called outside a request scope.
```

The flake-rerun workflow retried the job and got the same result. `deploy.yml` skipped every job because CI had not concluded `success`, so no image was built and the fix for a live tenant leak stayed out of production. #393 merged at 01:35 UTC with a seven-line change to that test file, four of them comments:

```ts
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));
```

An empty cookie jar makes `getViewAs()` return null, so `request()` sends no act-as header, which is the correct default for tests that assert URLs and methods. CI went green on that commit, and its deploy run cleared staging, the staging smoke test and production by 01:49 UTC. Thirty-five minutes after #393, #394 disabled the archive buttons for an admin in view-as mode. The same two features met a second time, in the UI this time.

The break was test-only, and no runtime code was wrong. A runtime collision that no test exercised would have passed this same gate and shipped, because a merge to main deploys with nobody pressing anything.

## Why per-PR green proved nothing

One setting let this through, and a second hid where it came from. Both still describe HaulCall's main as of 2026-10-07, and the ruleset's last change was 2026-07-23, so the same rules applied in August.

The main ruleset requires the `extension`, `api`, `web` and `show-sim` checks, with `strict_required_status_checks_policy` set to `false`. That is GitHub's "require branches to be up to date before merging" switch. With it off, a check result from 2026-08-24 still counts on 2026-08-28 against a main eleven commits further along.

CI also uses a per-ref concurrency group that cancels older runs:

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

On a pull request that saves runner time. On main, three merges in seven seconds meant each new push cancelled the run for the one before it. The CI runs for #383's and #384's merge commits both show `cancelled`. Main got tested once, at the tip, so CI alone couldn't tell me which merge broke it. The cancellation let nothing through. It only hid the culprit. I worked it out only because the error named `cookies()` and #381 was the one PR of the four that touched it.

## What I do with a batch of green PRs now

I do one of two things. The first is to merge serially, with main's CI as the gate between merges. If a branch's checks are older than the last merge to main, bring it up to date first: `gh pr update-branch 381` merges main into the branch, and the new head commit gets a fresh CI run. Then:

```bash
gh pr merge 381 --squash
sha=$(gh pr view 381 --json mergeCommit --jq .mergeCommit.oid)
sleep 15   # give the push event time to create the CI run
gh run watch "$(gh run list -w CI --commit "$sha" --json databaseId --jq '.[0].databaseId')" --exit-status
```

`--exit-status` makes `gh run watch` exit non-zero on a red run, so the next merge in a script never starts.

The second is to trial-merge the whole set locally and run the suites on the union before merging any of it:

```bash
git fetch origin
git switch --detach origin/main
for n in 381 382 383 384; do
  git fetch -q origin "pull/$n/head" && git merge --no-edit FETCH_HEAD \
    || { git merge --abort; echo "conflict on #$n"; exit 1; }
done
npm ci
npm -w web run test
```

Run any time after #388 merged at 18:09 Eastern on 2026-08-28, that loop would have hit the same four failures, because the union is the tree that went red on main.

For the note-taking half, I write "fixed" once `mergedAt` is non-null and a `deploy-prod / deploy` run has succeeded on a commit that has the merge commit as an ancestor.
