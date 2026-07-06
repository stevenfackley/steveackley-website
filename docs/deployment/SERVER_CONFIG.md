# EC2 Server Configuration

Configuration and operational runbook for the AWS EC2 instance hosting steveackley.org. See [../DEPLOYMENT_ARCHITECTURE.md](../DEPLOYMENT_ARCHITECTURE.md) for the canonical architecture diagram and image/deploy pipeline.

---

## Instance Details

| Property | Value |
|----------|-------|
| Platform | Amazon Linux 2 |
| Public IP | `3.230.237.0` |
| SSH key | `~/.ssh/aws-web-server1.pem` |
| SSH user | `ec2-user` |

---

## SSH Access

```bash
# From WSL / Linux
ssh -i ~/.ssh/aws-web-server1.pem ec2-user@3.230.237.0

# From Windows (PowerShell)
ssh -i C:\Users\steve\.ssh\aws-web-server1.pem ec2-user@3.230.237.0
```

---

## AWS Security Group (Inbound Rules)

| Type | Protocol | Port | Source |
|------|----------|------|--------|
| SSH | TCP | 22 | Your IP |

No ports 80 or 443 are open. All web traffic enters through the Cloudflare Tunnel's outbound connection — no inbound web ports are required.

**Outbound rules:** Default (allow all) — required for the `tunnel` container to reach Cloudflare's edge on port 443.

---

## Installed Software

| Software | How installed | Purpose |
|----------|--------------|---------|
| Docker | Amazon Linux extras | Container runtime |
| Docker Compose v2 | Plugin via yum | Multi-container orchestration |
| git | yum | Repository management |

`cloudflared` is **not** installed on the host — it runs as the `tunnel` service in `docker-compose.yml` (image `cloudflare/cloudflared:latest`), pulled like any other container.

---

## Cloudflare Tunnel (Docker sidecar)

`cloudflared` runs as the `tunnel` service defined in `docker-compose.yml` — a sidecar container, not a systemd unit:

```yaml
tunnel:
  image: cloudflare/cloudflared:latest
  container_name: cloudflare-tunnel
  command: tunnel --no-autoupdate run --token ${CLOUDFLARE_TUNNEL_TOKEN}
  restart: unless-stopped
  networks:
    - web
    - internal
  depends_on:
    - web
```

It authenticates with `CLOUDFLARE_TUNNEL_TOKEN` (written into `.env` by CI on every deploy — see [Secret Files](#secret-files)), not a mounted `config.yml`/credentials JSON. Because it's token-based, the tunnel's public hostname → service mapping (ingress) is configured in the **Cloudflare Zero Trust dashboard** (Access → Tunnels → your tunnel → Public Hostname), not in a local file on the EC2 box.

**Management (container, not systemd):**

```bash
# Check status
docker ps | grep cloudflare-tunnel

# Restart
docker compose restart tunnel

# View live logs
docker logs cloudflare-tunnel -f

# View last 50 lines
docker logs cloudflare-tunnel --tail 50
```

**Expected healthy log output:**
```
INF Starting tunnel tunnelID=<tunnel-id>
INF Connection registered connIndex=0 connection=<UUID>
INF Connection registered connIndex=1 connection=<UUID>
```

---

## Cloudflare DNS

DNS for `steveackley.org` is managed in the Cloudflare dashboard. When a public hostname is added to the tunnel (Zero Trust → Tunnels → Public Hostname), Cloudflare creates/manages the corresponding proxied CNAME to `<TUNNEL-ID>.cfargotunnel.com` automatically — there's no DNS record to hand-maintain outside that dashboard flow.

---

## Docker Setup

### Docker network

`docker-compose.yml` declares `web` as an **external** network — it must already exist on the host before the first `docker compose up`, or Compose will fail. It is **not** created automatically by CI/CD:

```bash
docker network create web
```

### Application directory

```
/home/ec2-user/steveackleyorg/
├── .github/
│   └── workflows/deploy.yml
├── docker/
│   ├── entrypoint.sh
│   ├── seed-admin.cjs
│   └── password.cjs
├── docker-compose.yml         <- used in production (web + tunnel + db)
├── docker-compose.dev.yml     <- local dev (db only)
├── docker-compose.tunnel.yml  <- STALE, unused — superseded now that the tunnel
│                                  service lives directly in docker-compose.yml
├── Dockerfile
├── apps/site/                 <- Astro app (Drizzle ORM — no prisma/ directory)
├── packages/shared/
├── .env                        <- written by CI/CD (600 permissions)
└── secrets/
    └── postgres_password.txt  <- pre-existing static file, provisioned once
                                   manually; NOT written or rotated by CI/CD
```

### Container management

```bash
cd ~/steveackleyorg

# View running containers
docker ps

# Start / restart all
docker compose up -d

# Restart one service
docker compose restart web
docker compose restart tunnel

# Stop all
docker compose down

# Logs
docker logs steveackley-web --tail 50
docker logs steveackley-web -f
docker logs steveackley-db --tail 50
docker logs cloudflare-tunnel --tail 50
```

### Manual deploy of a pinned image

```bash
ssh -i ~/.ssh/aws-web-server1.pem ec2-user@3.230.237.0
cd ~/steveackleyorg
git pull origin main

export IMAGE_REF=ghcr.io/stevenfackley/steveackley-web:sha-<commit-sha>
# or, for the strongest immutability guarantee:
# export IMAGE_REF=ghcr.io/stevenfackley/steveackley-web@sha256:<digest>

IMAGE_REF="$IMAGE_REF" docker compose pull web
IMAGE_REF="$IMAGE_REF" docker compose up -d --remove-orphans

docker logs steveackley-web -f
```

> Manual deploys require `.env` and `secrets/postgres_password.txt` to already exist on the box (see [Secret Files](#secret-files)).

---

## Health Checks

- **Container-internal:** the Dockerfile's `HEALTHCHECK` hits `http://127.0.0.1:3000/api/health` inside the `web` container every 30s.
- **Deploy-time:** `.github/workflows/deploy.yml`'s deploy job polls `http://localhost:3000/` (root — not `/admin/login`) up to 30 times (2s apart) after `docker compose up`, and fails the deploy if it never sees a `200`/`301`/`302`.

```bash
docker ps                                  # all three containers should be "healthy"/"Up"
curl -I http://localhost:3000/             # what CI polls
curl -s http://localhost:3000/api/health   # what the container HEALTHCHECK polls
```

---

## Secret Files

Only `.env` is written by CI/CD, on every deploy, from GitHub Actions secrets (see `.github/workflows/deploy.yml`):

```
DATABASE_URL=...
AUTH_SECRET=...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://steveackley.org
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
ADMIN_PASSWORD_HASH=...
GH_API_TOKEN=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=...
R2_PUBLIC_URL=...
CLOUDFLARE_TUNNEL_TOKEN=...
```

`env_file` loads these verbatim into the container — Compose does **not** shell-interpolate `$` inside an `env_file`, so there's no bcrypt-style `$`-escaping concern (and the admin credential format here is scrypt `<saltHex>:<keyHex>` anyway — see [Admin login not working](#admin-login-not-working) — which contains no `$` at all).

**`~/steveackleyorg/secrets/postgres_password.txt`** — a Docker Compose secret mounted into the `db` container at `/run/secrets/postgres_password`. This file is **not** touched by CI/CD; it must be created once, manually, on the box (`chmod 600`).

```bash
# View env keys (not values)
awk -F= '{print $1}' ~/steveackleyorg/.env

# Check secret file is non-empty
wc -c ~/steveackleyorg/secrets/postgres_password.txt
```

---

## Secret Rotation

1. Generate the new secret value locally.
2. Update the corresponding GitHub Actions secret.
3. Push any commit to `main` — the deploy job rewrites `.env` on every run.

For immediate rotation without a code change:

```bash
ssh -i ~/.ssh/aws-web-server1.pem ec2-user@3.230.237.0
cd ~/steveackleyorg

nano .env               # edit the value directly
docker compose up -d web
```

`secrets/postgres_password.txt` is rotated manually the same way, followed by `docker compose up -d db`.

---

## Maintenance Tasks

### Update the tunnel image

```bash
cd ~/steveackleyorg
docker compose pull tunnel
docker compose up -d tunnel
```

### Prune unused Docker images

```bash
docker image prune -f
# Or remove all unused resources (images, build cache — never volumes):
docker system prune -af
```

### Check disk usage

```bash
df -h
docker system df
```

### View Docker volumes

```bash
docker volume ls
# steveackleyorg_postgres_data -- PostgreSQL data
```

---

## Troubleshooting

### Site returns 502 Bad Gateway

```bash
# Is the tunnel container up and connected?
docker ps | grep cloudflare-tunnel
docker logs cloudflare-tunnel --tail 50

# Is the web container running and healthy?
docker ps | grep steveackley-web
docker logs steveackley-web --tail 50
```

Common causes: `web` container not running, database not healthy, `tunnel` container stopped/restarting.

### Styles not loading (white / unstyled page)

Cause: Cloudflare served cached HTML referencing a previous build's hashed assets. There is currently no automated cache purge wired into `deploy.yml` (see [CLOUDFLARE_AUTO_CACHE_CLEAR.md](./CLOUDFLARE_AUTO_CACHE_CLEAR.md) for an optional, not-yet-wired-in setup). Manual purge: Cloudflare Dashboard → Caching → Purge Everything.

### Database connection error

```bash
docker ps | grep steveackley-db
docker logs steveackley-db --tail 50
docker compose exec db psql -U steveackley -d steveackleydb
```

### Admin login not working

Auth is Better Auth, credential hash is **scrypt** (`<saltHex>:<keyHex>`), **not bcrypt**. The seed accepts either:

1. `ADMIN_PASSWORD` (plaintext) — preferred, hashed at seed time, or
2. `ADMIN_PASSWORD_HASH` — must already be a valid scrypt hash in that format (generate locally with `npm run setup:admin` from `apps/site`).

```bash
# Confirm which admin vars are set (values hidden) in the entrypoint boot log
docker logs steveackley-web | grep -i admin

# Regenerate and redeploy if the hash format is wrong
docker logs steveackley-web --tail 100
```

### Container fails to start

```bash
docker logs steveackley-web

# Common causes:
# - Missing .env file
# - Database not healthy (check depends_on and db logs)
# - Invalid DATABASE_URL
# - Drizzle `db push` failure inside entrypoint.sh (check for schema errors in logs)
```

### Docker network missing

```bash
docker network create web
docker compose up -d
```
