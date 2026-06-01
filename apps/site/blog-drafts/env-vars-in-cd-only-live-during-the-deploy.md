<!--
Admin form fields:
  Title:    Env vars in CD only live during the deploy
  Slug:     env-vars-in-cd-only-live-during-the-deploy (auto-derived)
  Excerpt:  A bug class I keep rediscovering: state your deploy script needs after the deploy must be persisted to disk, not just exported into the shell. Plus the two-line fix.
  Cover:    (none)
  Body:     everything below this comment
-->

Here's a bug that bit me twice in two different projects this year. The shape is general; the fix is one line of `sed`.

## The setup

A typical container deploy on a single-host EC2 box looks like:

1. CI builds a new image, tags it with the commit SHA, pushes to a registry.
2. CI runs a remote command on the box that pulls the new tag and recreates the containers.

The remote command is the load-bearing bit. Mine looked like this:

```bash
aws ssm send-command \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters commands='[
    "set -euo pipefail",
    "cd /opt/synap",
    "export SYNAP_IMAGE_TAG=sha-1c82e93",
    "docker compose pull",
    "docker compose up -d"
  ]'
```

`docker compose.yml` references the tag like:

```yaml
synap-api:
  image: ghcr.io/me/myapp:${SYNAP_IMAGE_TAG:-latest}
```

This works. The first time. The deploy goes green. The container comes up on the new tag. Looks great.

## What's wrong

The `export` only lives inside the SSM shell session that runs that command. It is **not** written to `/opt/synap/.env` (the file `docker compose` consults when no var is set in the host environment).

So the moment anything *else* touches a container after the deploy — a manual `docker compose up -d --force-recreate` to roll a config change, a host reboot, a fresh shell starting a new deploy — `docker compose` reads `.env`, finds no `SYNAP_IMAGE_TAG`, falls back to the `latest` default the compose file declares.

The workflow never tags `latest`. Compose either errors out trying to pull a tag that doesn't exist, or — worse — reuses a cached `latest` image from initial host provisioning months ago. Your container silently rolls back to ancient code while the deploy job stays green.

I lost an evening to this when a "Stripe vars aren't reaching the container" report turned out to be: the API was on the right image, the env vars were in `.env`, the compose file just had no clue what tag to pull, so the operator's manual `--force-recreate` had re-installed the version from initial provisioning. Months of merges, none of them visible in prod, deploy job green every time.

## The fix is one line

Persist the tag to `.env` instead of just exporting it:

```bash
"cd /opt/synap",
"grep -q SYNAP_IMAGE_TAG .env && sed -i \"s/^SYNAP_IMAGE_TAG=.*/SYNAP_IMAGE_TAG=$NEW_TAG/\" .env || echo \"SYNAP_IMAGE_TAG=$NEW_TAG\" >> .env",
"docker compose pull",
"docker compose up -d --force-recreate"
```

The `grep -q ... && sed -i ... || echo ... >> .env` handles both cases: replace the line in-place if it exists, append if it doesn't. `--force-recreate` for the same reason — compose's "smart" reuse can keep an old container running if it thinks the spec is unchanged; for an image-tag bump that's almost always wrong.

## The class of bug

This is a specific instance of a more general pattern: **state your deploy script needs *after* the deploy must be persisted to disk, not just exported into the shell that ran the deploy.**

That sentence is the whole takeaway. Everything else is corollary.

The same pattern bites people in other forms:

- **Cron jobs that source `~/.bash_profile` and break when a deploy script exported a variable for just the deploy session.** The cron environment doesn't inherit your interactive shell's exports.
- **Systemd units that need a config value that lives in `~/.bashrc` instead of `/etc/default/<service>`.** Service environments are isolated; if you want a service to see a value, it has to be on disk where the service-manager will read it.
- **Containers whose `CMD` references an env var only set at `docker run` time, when a `docker compose up -d --force-recreate` weeks later won't pass the same flag.**
- **Scripts that work in `tmux` but fail in `cron` because the `tmux` env carried something the cron env doesn't.**

In every case, the principle is the same: **figure out what reads your state, and write the state where *that* thing will look for it.**

For Docker Compose on a single host, that's `.env`. For a systemd service, it's `/etc/default/<service>` or an `EnvironmentFile=` directive in the unit. For a cron job, it's `Environment=` in the crontab or sourcing an explicit file. For a container, it's `--env-file` or a `ConfigMap` or whatever your orchestrator surfaces.

## Verifying the fix

After the change, the test is: deploy, then do something a normal operator would do (restart a container, reboot the host, pull a different image). The container should come up on the *currently deployed* version, not roll back to a default.

```bash
# After deploy:
grep SYNAP_IMAGE_TAG /opt/synap/.env
# → SYNAP_IMAGE_TAG=sha-1c82e93   ← what the deploy just wrote

# Reboot the host. Containers restart. Same tag.
sudo reboot
# (wait)
docker inspect --format '{{.Config.Image}}' myapp-api
# → ghcr.io/me/myapp:sha-1c82e93   ← persisted across reboot

# Manually recreate. No tag drift.
docker compose -f /opt/synap/docker-compose.yml up -d --force-recreate
docker inspect --format '{{.Config.Image}}' myapp-api
# → ghcr.io/me/myapp:sha-1c82e93   ← still the same
```

If the third test silently regressed to `:latest`, your CD never wrote to `.env`.

## A related sibling bug

While we're naming bug classes: the deploy script also needs to *update the compose file itself* when service-block changes ship. A PR that adds `STRIPE_API_KEY: ${STRIPE_API_KEY:-}` to your API service's `environment:` section is a code change that has to reach the box's `docker-compose.yml`, not just the image. If your deploy script only refreshes the image and never the compose file, env vars sitting in `.env` will never reach the container — Compose only interpolates vars the service explicitly declares.

I fixed this by base64-encoding the workflow's checked-out `docker-compose.yml` and inlining it into the SSM command, then having the box-side script decode and overwrite. The compose file is small (~3 KB), well under SSM's parameter limit, and it avoids needing the box to authenticate against the private repo. The general principle, again: figure out what reads your state, and make sure your CD writes there.

## The meta-lesson

Container deploys feel like they live in the runtime, but the persistence layer is what makes them reproducible. **Your `.env`, your `docker-compose.yml`, the SSM command history — these are the durable state of your deployment.** Treat them as load-bearing. Write to them deliberately. Don't ride on transient shell variables for anything that needs to survive the next reboot, restart, or fresh shell.

Two lines of `sed`. Then never lose another evening to "the deploy was green and the box was stale."
