<!--
Admin form fields:
  Title:    Two parallel coding agents and one git working tree
  Slug:     parallel-agents-one-working-tree (auto-derived)
  Excerpt:  If you're dispatching multiple autonomous coding agents in parallel, they probably share a working tree. Mine did. Here's the git mess that taught me to use worktree isolation by default.
  Cover:    (none)
  Body:     everything below this comment
-->

I lost twenty minutes of a sprint untangling a git situation that exists *only* because I was running two AI coding agents in parallel against the same working directory. Two agents, two branches, one filesystem. The branches don't isolate the files. The filesystem doesn't isolate the branches. Things you'd never do as a solo developer become normal hazards once a second process is editing alongside you.

This post is the lesson I'd write to past-me. If you're driving multiple agents at once, read this before you find out the hard way.

## The setup

I had two long-running tasks I wanted to run in parallel:

- **Agent A**: build a Stripe Customer Portal integration. Branch `feat/stripe-customer-portal`.
- **Agent B**: build a mark-complete / streak surface on the web. Branch `feat/web-mark-complete-and-streak`.

Both were touching the same repo. Different files mostly — Stripe Portal lives in `Synap.Infrastructure/Commerce/` and `MainLayout.razor`; mark-complete lives in `Library.razor` / `LibraryModule.razor` / a new endpoint. They could in principle land as two independent PRs.

I also wanted to do a small change myself in the meantime: add Markdig for real markdown rendering in the lesson reader. Three files. Five minutes. I'd just do it on a third branch (`feat/web-markdig`) while the agents ran.

You can see where this is going.

## What actually happened

I created `feat/web-markdig` from `main` and started editing.

Meanwhile, somewhere in the background, the mark-complete agent ran `git checkout feat/web-mark-complete-and-streak`. The HEAD of the working tree moved. **I didn't notice.** I was editing files in my IDE; the IDE doesn't show a banner when HEAD moves underneath it.

I finished my Markdig changes. I ran `git add web/Synap.Web/...`. The files staged. I ran `git commit -m "feat(web): Markdig..."`. The commit succeeded.

```
[feat/web-mark-complete-and-streak fdbc6c9] feat(web): Markdig for real markdown ...
```

That branch name is not my branch. My commit landed on the mark-complete agent's branch. The agent's working tree now has my Markdig commit at its tip; when the agent eventually commits its own work, it'll stack on top of mine — and the agent's PR will contain *two features*, only one of which the agent wrote.

Then I ran `git push -u origin feat/web-markdig`. Which doesn't push my commit. It pushes the *local branch named `feat/web-markdig`*, which was created off main and hasn't moved — so the remote `feat/web-markdig` ends up tracking a branch that contains *no* Markdig changes.

```
* [new branch]      feat/web-markdig -> feat/web-markdig
```

Everything reported success. Nothing was where I wanted it.

## What I did to recover

The recovery was uglier than it needed to be. The minimum was:

1. Force-reset local `feat/web-mark-complete-and-streak` back to where the agent's branch should have been (to drop my Markdig commit). But the agent's working tree had uncommitted WIP modifications on top — a hard reset would have destroyed them. Soft reset preserved them but left the index dirty.
2. Delete the remote `feat/web-markdig` (it was at main, no actual content).
3. Create a fresh `feat/web-well-known-deep-links` branch off main, manually re-apply my changes from context, commit, push. Skip the polluted state entirely.
4. Let the agent finish. Accept that its PR would either include my Markdig commit (because the agent's branch still had it locally) or not (because the agent might rebase off main when it commits).

In the end the mark-complete agent did include my Markdig changes when it pushed, so PR #70 was effectively two features in one. The user squash-merged. It worked. But the cleanup took half an hour and a careful read of `git log --all --graph --oneline` to figure out what was where.

## Why this happens

Git's branch model is a *pointer* model. A branch is a name pointing at a commit. HEAD is *also* a pointer, usually at a branch. When you `git checkout`, you move HEAD; your working tree's files snap to match. When you `git commit`, the branch HEAD points to advances.

If two processes share a working tree, **only one can have HEAD at a given time.** The last one to call `git checkout` "wins" — but neither knows about the other. The first process's idea of "what branch am I on" is stale the moment the second process runs `git checkout`.

For interactive developers this never bites you, because you don't have a second you running `git checkout` in the background. For AI agents — which absolutely *do* run `git checkout` to set up their working state — it bites you the moment two of them are running at once.

The bug is also silent. Git doesn't warn you that HEAD moved. Your editor doesn't either. The `git status` you ran before editing is correct *at that moment*; the world has changed since.

## The fix

`git worktree`. Each parallel agent gets its own worktree directory pointed at its own branch. They share the same git object store (so no duplicate `.git/objects` overhead), but each has its own filesystem checkout and its own HEAD.

```bash
# In the main checkout (still on main, say):
git worktree add ../synap-customer-portal feat/stripe-customer-portal
git worktree add ../synap-mark-complete   feat/web-mark-complete-and-streak

# Now there are three working trees:
#   ./synap                        — HEAD on main, the original checkout
#   ../synap-customer-portal       — HEAD on feat/stripe-customer-portal
#   ../synap-mark-complete         — HEAD on feat/web-mark-complete-and-streak
```

The agents point at their respective worktree directories. They each have a stable HEAD. `git checkout` in one doesn't affect another. `git commit` lands on the right branch. `git push` pushes the right ref.

Cleanup when done:

```bash
git worktree remove ../synap-customer-portal
git worktree remove ../synap-mark-complete
```

The branches stay in the main repo. The transient working directories go away. Clean.

## When the agent harness already handles this

Some agent runtimes let you pass an `isolation: "worktree"` flag (or equivalent) when dispatching. The harness creates a worktree, runs the agent against it, and cleans up afterward. **Use it.** The cost is minimal; the failure mode it prevents is silent and expensive.

If your harness doesn't have this affordance, do it manually with `git worktree add` before dispatching the agent. The agent doesn't have to know it's in a worktree; it's just `cd`'d into a different directory with a normal `.git` from its perspective.

## When you must share a working tree

Sometimes you can't isolate — the agent is doing something that only works inside the main repo (running tools that resolve relative paths from project root, say). In that case:

- **Serialize.** Run one agent, wait for it to finish, then run the next. You give up parallelism but you regain sanity.
- **If you have to run in parallel anyway**, *don't touch git yourself in the meantime.* Don't `git checkout`, don't `git commit`, don't even `git status` if you're going to act on the result. Wait for the agents to push and report back. Inspect their branches from the remote; don't manipulate them locally.

The thing you most want to do — "let me just sneak this small change in real quick" — is exactly the operation that creates the mess I described above. The five-minute change becomes a thirty-minute untangle. Don't.

## What I'm changing going forward

Whenever I dispatch two or more background coding agents, I either:

1. **Use worktree isolation explicitly.** If the harness supports it, set the flag. If not, `git worktree add` manually before dispatch.
2. **Stay strictly hands-off on git** while they run. Read-only operations (`git log`, `git diff`, `git show`) are fine. Anything that mutates state — `checkout`, `commit`, `push`, `reset` — is off-limits until every agent has reported done and pushed its branch.

Both rules together are belt-and-braces. Either one alone would have prevented my afternoon's git mess. Both means I won't have to remember which one I picked.

## The meta-pattern

This is the same class of bug as "two cron jobs writing to the same file" or "two processes mutating the same global." Git's branch model wasn't designed with the assumption that multiple processes would be running `git checkout` against the same working directory in the same minute. It works fine when only humans use it because humans don't usually do that. Agents will, by default. Isolate them, or constrain yourself to not interleave manual work with theirs.

Twenty minutes of git untangle isn't the worst lesson I've ever paid for. But it's a tax I don't plan to pay twice.
