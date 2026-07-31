<!--
Admin form fields:
  Title:    Thirty-eight lines: patch-only Dependabot auto-merge
  Slug:     patch-only-dependabot-automerge (auto-derived)
  Excerpt:  A Dependabot major broke main on one of my repos while I wasn't looking. The fix is one workflow file that approves and auto-merges semver patches and does nothing at all for minors and majors. No allowlists, no version parsing, no cron.
  Cover:    (none)
  Body:     everything below this comment
-->

A while back, a Dependabot PR bumped recharts a major version on remit-hq. It merged. Main broke. I found out later, from a red build on unrelated work, which is the worst way to find out.

The delay is the part that stung. A charting library major changes component props, and the failure surfaced somewhere well downstream of the line that caused it. So the sequence was: open a PR for something unrelated, watch it go red, read a stack trace pointing at rendering code I hadn't touched, spend a while assuming my own change was at fault, and only then go back through the log to find PR #105 sitting there with a version bump nobody read.

Every minute of that was avoidable, and none of it was Dependabot's fault. Dependabot did exactly what it advertises. I had automation merging things and no policy about which things.

The lesson isn't "don't automate dependency merges." Twenty-five repos generate more Dependabot PRs than I will ever review with real attention, and the honest outcome of refusing to automate is that they pile up unreviewed until I bulk-merge them in a fit of tidiness, which is the same failure with more steps and a worse audit trail.

The lesson is that **semver already tells you which ones are machine-mergeable.** So I wrote the smallest workflow that acts on that and nothing else. It started in synap-ecosystem, landed here as PR #198, and is rolling out fleet-wide as an identical file in every repo.

## The file

`.github/workflows/dependabot-auto-merge.yml`, 38 lines including the prerequisite comments:

```yaml
name: Dependabot auto-merge

on: pull_request_target

permissions:
  contents: write
  pull-requests: write

jobs:
  automerge:
    if: github.actor == 'dependabot[bot]'
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Fetch Dependabot metadata
        id: meta
        uses: dependabot/fetch-metadata@v3
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Approve and enable auto-merge (patch only)
        if: steps.meta.outputs.update-type == 'version-update:semver-patch'
        env:
          PR_URL: ${{ github.event.pull_request.html_url }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh pr review --approve "$PR_URL"
          gh pr merge --auto --squash "$PR_URL"
```

That's it. Two steps, one condition.

## What each line is defending against

**`on: pull_request_target`** runs the workflow in the context of the base branch with a token that can write. `pull_request` from a bot branch can't approve or merge, so this trigger is required rather than chosen. It's also the trigger with the well-known privilege-escalation shape, because a fork PR can propose code and this trigger hands the job write permissions. The next line is what makes it safe.

**`if: github.actor == 'dependabot[bot]'`** gates the entire job. It's on the job, not on a step, so nothing runs for anyone else. This is the load-bearing line in the file. Without it, `pull_request_target` plus `contents: write` is a hole. With it, the only actor that can reach the write-capable job is GitHub's own bot.

**`timeout-minutes: 5`** bounds a job whose worst case is two `gh` calls. If it's been running five minutes, something is wrong and I'd rather it fail than sit there.

**`dependabot/fetch-metadata@v3`** parses the PR that Dependabot opened and hands back structured facts, including `update-type`. This is why the file has no version parsing in it. Comparing version strings myself would mean handling prereleases, calendar versioning, and every package ecosystem's opinion about what a version is. Dependabot already knows; the action just asks.

**`update-type == 'version-update:semver-patch'`** is the whole policy. A patch release promises no interface change. When a patch breaks you, either the publisher mislabeled it or you were depending on something you shouldn't have been, and in both cases required status checks are the right place to catch it, not my eyes on a diff.

**`--auto --squash`** queues the merge behind branch protection instead of merging now. The PR sits until required checks pass. A patch that breaks the build never lands; it just sits there approved and unmerged, which is a fine state for it to be in.

## Two prerequisites, documented in the file

The workflow comments carry these because both are repo settings, invisible from the code, and each one produces a different confusing symptom.

**"Allow auto-merge" must be ON** in repo settings. Without it, `gh pr merge --auto` fails outright.

**Branch protection with required status checks must exist.** This is the subtle one. `--auto` only waits if there's something to wait for. On a repo with no required checks, "auto-merge" means "merge now," and you've built an unattended patch merger with no gate. The tests are the safety mechanism; the workflow is only the trigger.

## What it deliberately doesn't do

The interesting part of this file is the code that isn't in it.

**No allowlist.** I don't maintain a list of packages trusted for auto-merge. A list like that is wrong the day after you write it and nobody ever prunes it. Semver patch is the trust boundary, applied uniformly.

**No version parsing.** No regex against tag names, no comparison logic. `fetch-metadata` answers the one question I have.

**No cron sweep.** Nothing wakes up nightly to look for mergeable PRs. The workflow fires on the PR and then it's done. A scheduled job that merges things is a job that merges things while you're asleep and can't correlate them with anything.

**No handling for minor or major.** This is the part people expect to find and don't. There is no `else`. Minors and majors get no step at all, which means the PR sits open with no approval until a human looks at it. That's not a gap in the implementation, it's the implementation. Astro 6 to 7 sat open on this repo for weeks under exactly that rule, and when I finally did it by hand it broke the build in a way no CI gate would have told me to expect.

**No auto-approve without merge.** Approving alone would put a green checkmark on a PR nobody read and defeat branch protection for the next person who clicks merge.

## Rolling it out identically

The pattern started in synap-ecosystem, proved itself, and is now going into every repo in the workspace as the same file, byte for byte, through identical PRs.

Identical is the point. The tempting version of this is per-repo tuning: this repo also auto-merges minors because its test suite is good, that repo excludes a package that's burned me before, the other one uses a different timeout. Six months later there are eleven variants, no two repos behave the same way, and answering "does this repo auto-merge minors?" requires opening a file.

One file, one rule, twenty-five repos means I can answer that question from memory. When the rule needs to change, it changes in one place and gets copied out, and any repo that has drifted shows up immediately as a diff.

It's also short enough to actually re-read during a PR review, which is not true of most CI configuration and is a real property of a 38-line file.

## The result

Patch PRs approve themselves, wait for CI, and merge. I don't see them. Minor and major PRs accumulate until I sit down with them, which is the work I was always supposed to be doing and now actually get to spend the attention on.

Thirty-eight lines to draw one line: semver patch is machine-mergeable, and everything else is a person's problem.
