<!--
Admin form fields:
  Title:    Three deploys that stopped without a red run
  Slug:     three-ways-a-deploy-quietly-stops (auto-derived)
  Excerpt:  Between 2026-10-03 and 2026-10-07 I found three production deploys that had stopped moving with no red deploy run. A drift guard read "skipped" as "failed", a release guard read Dependabot's commit, and a green job shipped to a server the domain had left.
  Category: Engineering
  Tags:     github-actions, ci, dependabot, cloudflare-pages, deploys
  Cover:    (none)
  Body:     everything below this comment
-->

At 01:12 UTC on 2026-10-07, the drift guard on Synap's repo ran on schedule, finished green, and wrote this warning into its log:

```text
Latest deploy attempt https://github.com/stevenfackley/synap-ecosystem/actions/runs/34305926200 (skipped) already covered this tree and failed — not retrying hourly. Fix forward with a new commit, or dispatch deploy.yml by hand.
```

The warning reports a skipped run as a failure, and that mislabel is why Synap's production box was still serving an image built on 2026-09-04.

It was the third case in five days. On 2026-10-03 I found trailtold.com serving a build from 2026-07-18 while its deploy job had been green since July. On 2026-10-04 a TrailTold release tag deployed nothing and reported nothing. None of the three failures produced a red run, and nothing alerted. I want them written down together, because they share one cause and the fixes are small.

## Synap: the guard that read "skipped" as "failed"

Synap's `deploy-drift.yml` exists because of an earlier stall. Dependabot patch bumps on that repo merge themselves through the auto-merge workflow (the same idea as [patch-only Dependabot auto-merge](/blog/patch-only-dependabot-automerge)), and the squash lands on `main` under `GITHUB_TOKEN`. GitHub starts no workflow runs for events caused by that token. On 2026-08-24 four merged Dependabot PRs had produced zero deploy runs, and prod sat on a 2026-08-20 image until a manual dispatch on 2026-08-27. So I wrote a scheduled job that compares `main` against the head SHA of the last successful `deploy.yml` run and dispatches a deploy when anything under the deploy paths has changed.

It has a retry damper. If the most recent deploy attempt already covered the current tree and failed, re-dispatching on every tick would only stack up red runs and image pushes for the same failure, so the guard warns and waits for a new commit. The original damper only let `success` and `cancelled` through, plus an empty conclusion:

```diff
-            ""|success|cancelled) ;;   # nothing to damp
+            ""|success|cancelled|skipped) ;;   # nothing to damp
```

Then on 2026-09-04 I merged PR #226, part of a fleet-wide response to an August with about 10,200 Actions runs and roughly 27,000 billable hosted Linux minutes across my private repos. One line in it told `deploy.yml` to skip `build-push` when the push came from a Dependabot merge. The reasoning held: the bump was fully checked on its PR, and it would ship with the next human merge or a dispatch. The drift guard was supposed to be that dispatch.

On 2026-09-09 three Dependabot merges landed and each produced a deploy run with conclusion `skipped`. Those pushes started runs because I merged the PRs under my own account, not through the auto-merge token, and #226's guard then skipped `build-push` because the head commit's author was Dependabot. `skipped` was not in the damper's list, so it fell through to the failure branch. The guard saw a "failed" attempt that already covered the tree and stopped retrying. It kept running every six hours (#226 had also cut it from hourly, though its warning text still said hourly until #239). From the first skipped run on 2026-09-09 until prod moved on 2026-10-07 it ran 112 times; 103 finished green and none dispatched a deploy.

The image prod was running came from commit `28cdbee`, which is #226 itself, so the cost guard was the last thing that shipped for a month.

Prod moved again early on 2026-10-07, when a human merge that touched the deploy paths triggered a normal push deploy. PR #239 merged at 05:43 UTC the same morning and added `skipped` to the damper, which is the diff above. It also changed what a deploy is called. Push-to-main had been tagging `sha-<short>` images into a `test` environment, on a project whose only box is prod. It now always tags `prod-<full sha>` under environment `prod`. And it added `release.yml`: push a `YYYYMMDD_synap_Release` tag, and the workflow refuses unless the tag's SHA equals the head SHA of the last successful deploy on `main`, then retags the existing `prod-<sha>` images without rebuilding and creates the GitHub Release.

The fix got its first real test about an hour later. A batch of Dependabot merges landed at 06:40 UTC and produced another `skipped` run. The 06:50 UTC drift tick logged drift since `353cfee` and dispatched a deploy, which went green. The [first tagged release](/blog/synap-first-release), `20261007_synap_Release`, points at `353cfee`.

## TrailTold: a green deploy to a server nobody read

On 2026-10-03 I was auditing TrailTold's docs and opened the live privacy page at trailtold.com. It described the app as a closed beta, said maps came from MapLibre demo tiles, and mentioned an on-device location-history database. None of that was true of the 1.0.0+12 build on Google Play. ([The plaque problem](/blog/the-plaque-problem) is the post that introduced TrailTold, if you want the app itself.)

On 2026-07-23 I had moved the marketing site from Cloudflare Pages to a Caddy container on the EC2 test box, and `deploy-web` copied the build there. From that move through 2026-09-04 the workflow finished green 14 times. At some point after that the apex went back to Cloudflare Pages. I can't confirm from the records I have when or how that happened. What I can confirm is the result: the Pages project was still on its 2026-07-18 build, and every deploy since July updated a server the domain no longer pointed at.

The tell was a stopped box. The test API was answering with a Cloudflare 530, so the box was off, and trailtold.com still returned 200 with content byte-identical to the Pages project's own `pages.dev` address.

The privacy page wasn't the only problem. The copy in the repo was also wrong: it never disclosed that Sign in with Apple and Sign in with Google send a name and email, and it named AWS as the database host when the database is on Supabase. PR #194 fixed the copy. PR #195 fixed the pipeline: build, stamp `build.txt` with the commit SHA, `wrangler pages deploy` to the Pages project, then fail unless the canonical domain serves that SHA. Here is the stamp and the check from `deploy-web.yml`, with the error message shortened:

```yaml
      - name: Stamp the build
        run: echo "${GITHUB_SHA}" > web/dist/build.txt

      # ... wrangler pages deploy ...

      - name: Verify trailtold.com serves this build
        run: |
          set -euo pipefail
          served=""
          for attempt in $(seq 1 18); do
            served=$(curl -fsS --max-time 15 "https://trailtold.com/build.txt?ts=$(date +%s)" || true)
            [ "$served" = "$GITHUB_SHA" ] && break
            sleep 10
          done
          if [ "$served" != "$GITHUB_SHA" ]; then
            echo "::error::trailtold.com/build.txt is '${served:-<none>}', expected $GITHUB_SHA."
            exit 1
          fi
```

After that the same step requests the five URLs the app links to and both store consoles reference (home, privacy, terms, support, account deletion) and fails on anything other than a 200.

The PR waited on a token. The Cloudflare token from July was read-only for Pages, and the upload died with auth error 10000. I minted a token with Pages edit rights on 2026-10-04, #195 merged at 04:02 UTC that day, and the first deploy passed its own `build.txt` check. The privacy page has shown the 2026-10-03 copy since.

The check fetches from the domain on purpose, because "upload succeeded" and "the URL returns 200" both pass against the wrong origin. Only asking the domain your users type which commit it is serving can fail.

## TrailTold: a release tag that read Dependabot's commit

The next afternoon I tagged `20261004_trailtold_Release`. TrailTold's production API had been on 2026-08-24 code, and this release was meant to move it. The tag push started `deploy-prod.yml` at 17:54 UTC, and every job in the run came back `skipped`. I dispatched the same workflow by hand 38 seconds later and it went green.

The cause was a copy-paste. `deploy-prod` had inherited the cost guard from `deploy-web`:

```yaml
if: ${{ github.event_name != 'push' || (github.event.head_commit.author.username != 'dependabot[bot]' && github.actor != 'dependabot[bot]') }}
```

On a branch push, `head_commit` is the commit you just pushed, and the guard does what it says. On a tag push, `head_commit` is the commit the tag points at. I had tagged `main` while its HEAD was `1e4f6ba`, a Dependabot bump of vitest from 4.1.11 to 5.0.3 (#187). The guard read Dependabot as the author and skipped the release.

Dependabot can't push tags. A release tag on that workflow always means I decided to release. PR #207, merged 2026-10-04, dropped the guard from `deploy-prod` and left a comment explaining why. `deploy-web` and the test deploy keep theirs, because they run on branch pushes where the guard reads the right commit. The next tag, `20261005_trailtold_Release`, deployed from its push on 2026-10-05 with no dispatch, though on a human-authored commit, so it didn't exercise the old failure.

If a workflow has to run on both branches and tags, my CI notes from that day suggest the narrower fix: apply the Dependabot check only when `github.ref_type == 'branch'`. I haven't shipped that variant anywhere yet.

## What the three have in common

In two of the three, a guard decided not to do the work and reported that decision in a form that looked like completion. Synap's deploy reported `skipped`, which the drift guard misfiled as a failure and then went quiet about in a green run. TrailTold's release reported `skipped` on a tag nobody expected to skip. TrailTold's web deploy didn't skip at all. It did real work against a host that no longer mattered, and that run looked the most finished of the three.

Proof of a deploy has to come from the place your users reach. Synap's release workflow gets part of the way there by refusing to name a release after anything but the last successful deploy run. The drift guard and the release check both still ask GitHub what deployed. Neither one asks the box.

A skip needs to be treated as unfinished work. For a drift guard or anything else that reads run conclusions, list what is allowed to stop a retry instead of what is allowed to continue one. Only a real failure should damp:

```bash
case "$latest_conclusion" in
  failure|timed_out) damp ;;
  *) dispatch ;;
esac
```

That's a sketch, not code from either repo. Synap's shipped fix was the one-word diff above.

I ran a read-only sweep across my repos on 2026-10-07 for tag-triggered workflows that still carry the `head_commit` Dependabot guard. It found four, SquareLog's CI among them. Each one will skip a release the next time someone tags a commit Dependabot wrote, but they don't all need #207's fix. Only lodge-donation-tracker's `deploy-prod.yml` is tag-only and can drop the guard the way #207 did. The other three (qavren-books, qavren and square-log) also run on branch pushes, so deleting the guard would turn deploys back on for every Dependabot merge. They need the guard limited to `github.ref_type == 'branch'`.
