<!--
Admin form fields:
  Title:    Qavren Swarm: disposable coding agents that hand back a diff
  Slug:     qavren-swarm-open-source (auto-derived)
  Excerpt:  Qavren Swarm is an MIT-licensed MCP server that runs a coding agent inside a hardened Docker container against a read-only copy of your repo and returns a git diff. Nothing touches your files until you call apply_diff. Here is how it works and what shipped since June.
  Category: Release
  Tags:     qavren, mcp, docker, agents, dotnet, open-source, release
  Cover:    (none)
  Body:     everything below this comment
-->

The useful version of an AI coding agent can run your tests. The dangerous version is the same agent, because now it can run anything. [Qavren Swarm](https://github.com/stevenfackley/Qavren-Swarm) is my answer to that: the agent never gets a writable mount of the real repo.

The repo has been public under MIT since June 11. It has picked up enough since then that it deserves a proper introduction.

## What it is

Swarm is a local Model Context Protocol server. Your IDE harness (Claude Code, OpenCode, Cline) talks JSON-RPC to it over stdio. When you ask for work, Swarm spawns a throwaway Linux container, bind-mounts your workspace into it read-only, and lets the agent edit a copy. The agent runs the tests it finds, prints a `git diff`, and exits. The container is removed. You review the diff. The only operation that writes to your working tree is `apply_diff`, which is `git apply` and nothing more.

It is a single .NET 10 process on the Windows host, talking to Docker Desktop's Linux engine over the named pipe with Docker.DotNet. The in-container agent is a Python script. I built it for one developer on one Windows 11 workstation with WSL2 Docker, and that is still the supported shape.

## Three model backends, chosen per task

The backend is a parameter on `spawn_sandbox`.

| Provider | Backend | Cost |
|---|---|---|
| `claude-code` | Your logged-in Claude Code CLI, via a host broker | flat-rate subscription |
| `openai` | Any OpenAI-compatible endpoint (Ollama, LM Studio, vLLM) | local |
| `anthropic` | The metered Anthropic API | per token |

The `claude-code` provider is the one I use most, and it is the one with the interesting trick. The container never knows it is talking to Claude Code. The host runs a small Kestrel broker that exposes `POST /v1/chat/completions`. The container's `OPENAI_BASE_URL` points at it. The broker translates each request into a `claude -p` invocation on the host, with tools disallowed, and returns the answer. The agent only ever speaks two dialects, Anthropic-native or OpenAI-compatible, and your subscription credentials never enter a container. The broker is gated by a per-session bearer token, compared in constant time, and the diff envelope the agent prints is framed with a per-job nonce the model never sees, so the host can tell a real result from a fabricated one.

## The request lifecycle

1. `spawn_sandbox` validates the input, creates a job, and returns a `jobId` at once. A background task runs the container under a per-job wall-clock timeout.
2. The lifecycle manager builds the agent image on first use from a tar embedded in the assembly (no separate `docker build`), then creates a hardened container with the workspace at `/workspace` read-only and the task parameters and nonce injected as environment variables.
3. `agent.py` copies `/workspace` to `/tmp/qavren-work`, runs `git init` for a baseline, gathers source into a budgeted prompt, asks the model for SEARCH/REPLACE edits, applies them while preserving each file's CRLF or LF, retries once for unmatched hunks, runs `npm test` or `pytest` if present, and prints the diff between nonce-stamped sentinels.
4. The host captures stdout, parses the envelope, removes the container, and stores the result.
5. `retrieve_diff` shows you the patch. `apply_diff` applies it.

## Hardening

The container runs as a non-root user with `--cap-drop ALL` and `no-new-privileges`. PIDs, memory, and CPU are capped (512, 2 GB, 2 cores by default). `npm install` runs with `--ignore-scripts`. Every install and test step has its own timeout. Set `QAVREN_NETWORK_MODE=none` and the container has no egress at all, which is the right setting for a local Ollama run. On the way back in, `git apply` refuses patches that target `.git/` or escape the tree with `..`.

None of that depends on the agent agreeing to behave. The isolation is a mount flag and a set of kernel limits.

## What shipped since June

The current server exposes eight tools: `spawn_sandbox`, `check_sandbox_status`, `list_jobs`, `cancel_job`, `resume_job`, `retrieve_diff`, `retrieve_logs`, and `apply_diff`. Most of the additions since the first commit came from using it every day.

**Jobs persist to disk** (one JSON file per job) so a server restart no longer loses a finished diff you had not applied yet.

**`retrieve_logs`** returns the agent's captured stderr tail for a failed run, because "status: Failed" on its own tells you nothing.

**Whitespace-tolerant SEARCH matching.** Models are sloppy about indentation in SEARCH blocks. The agent now tries an exact match, then a whitespace-normalized one, before giving up on a hunk.

**Per-call `baseUrl`** for the `openai` provider, so one task can go to Ollama and the next to LM Studio without restarting the server.

**Error recovery**, the most recent change. If your workspace moved on since the spawn and the diff no longer applies as a whole, `apply_diff` retries hunk by hunk. Every hunk that still fits is applied with `git apply`; the rejects come back in `rejectedDiff` as a unified patch you can apply by hand. Pass `allowPartial: false` for the old all-or-nothing behavior. A container that hangs past its timeout becomes a `Paused` job instead of a dead one: `resume_job` re-spawns it with the original parameters, and an untouched pause is reaped to `Failed` after a grace window.

The test surface is modest and honest about it: eight xUnit contract tests on the server, five pytest cases on `agent.py`. CodeQL runs on both languages and Dependabot keeps the NuGet, pip, and Actions groups current.

## Running it

You need Docker Desktop with the Linux engine, the .NET 10 SDK, and for the `claude-code` provider a logged-in `claude` CLI on the host.

```powershell
dotnet build -c Release
dotnet test tests/QavrenSwarm.Tests.csproj
claude mcp add qavren-swarm -- dotnet C:\path\to\Qavren-Swarm\bin\Release\net10.0\QavrenSwarm.dll
```

Then, from Claude Code: spawn a sandbox against a repo path with a task, check status, read the diff, apply it. The full tool table, the environment variables, and the security model are in the [README](https://github.com/stevenfackley/Qavren-Swarm#readme), with the PRD, SDD, and test plan under `docs/`.

## What it is not

It is not a multi-tenant service and it is not trying to be. There is no auth on the MCP side because stdio to your own IDE does not need any. It has not been tested on Linux or macOS hosts. If you run a Windows workstation with Docker Desktop and you want a second pair of hands that cannot hurt you, it is ready to use today. MIT, so take what is useful.
