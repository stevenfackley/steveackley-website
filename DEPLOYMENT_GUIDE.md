# Deployment Guide — steveackley.org

This guide documents the current production deployment architecture and CI/CD pipeline for steveackley.org.

---

## Architecture Overview

```
┌─────────┐  HTTPS   ┌──────────────────┐  Tunnel  ┌───────────────────────────────┐
│  Users  │─────────▶│   Cloudflare     │─────────▶│   EC2 (3.230.237.0)           │
└─────────┘          │   Edge + CDN     │          │                               │
                     └──────────────────┘          │  ┌──────────────────────────┐ │
                                                   │  │  cloudflared (systemd)   │ │
                                                   │  └──────────┬───────────────┘ │
                                                   │             │ :3000            │
                                                   │  ┌──────────▼───────────────┐ │
                                                   │  │  steveackley-web         │ │
                                                   │  │  (Docker — Next.js)      │ │
                                                   │  └──────────┬───────────────┘ │
                                                   │             │                  │
                                                   │  ┌──────────▼───────────────┐ │
                                                   │  │  steveackley-db          │ │
                                                   │  │  (Docker — PostgreSQL 16) │ │
                                                   │  └──────────────────────────┘ │
                                                   └───────────────────────────────┘
```

**Key points:**
- `cloudflared` runs as a **systemd service** (not a Docker container) and routes inbound Cloudflare Tunnel traffic to `localhost:3000`
- No ports 80 or 443 are exposed publicly — only port 22 (SSH) inbound
- The Docker `web` network is external and shared between containers
- `web.env` (not `.env`) holds app secrets to avoid Docker Compose `$` interpolation of bcrypt hashes
- PostgreSQL password is injected via Docker secrets (`secrets/postgres_password.txt`)

---

## CI/CD Pipeline (GitHub Actions)

**Workflow file:** [.github/workflows/deploy.yml](.github/workflows/deploy.yml)

**Trigger:** Push to `main` branch

### Job 1: Build & Push to GHCR

Runs on: `ubuntu-latest`

| Step | Action |
|------|--------|
| Checkout code | `actions/checkout@v4` |
| Log in to GHCR | `docker/login-action@v3` using `GITHUB_TOKEN` |
| Build & push image | `docker/build-push-action@v5` → `ghcr.io/stevenfackley/steveackley-web:latest` |

### Job 2: Deploy to EC2

Runs on: `ubuntu-latest`, depends on `build-and-push`

Uses `appleboy/ssh-action@v1.0.3` to SSH into the EC2 instance and execute:

```
1.  Log in to GHCR using GHCR_TOKEN
2.  git pull origin main  (updates compose files and configs)
3.  Remove any old .env file  (prevents $ interpolation bugs)
4.  Write web.env with DATABASE_URL, AUTH_SECRET, and ADMIN_PASSWORD_HASH
        — bcrypt $ characters are escaped as $$ for Docker Compose compatibility
5.  Write secrets/postgres_password.txt
6.  Set file permissions 600 on both secret files
7.  Verify file contents (keys only, values hidden)
8.  Create Docker network 'web' if missing
9.  docker compose pull web
10. docker compose up -d --remove-orphans
11. sleep 15 (wait for startup)
12. Print full container logs
13. curl health check — http://localhost:3000/
14. curl health check — http://localhost:3000/admin/login
15. docker image prune -f
```

### Job 2 (continued): Purge Cloudflare Cache

After the SSH step completes, the runner calls the Cloudflare API directly:

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

This ensures users immediately see the updated build — no manual cache purge needed.

---

## Required GitHub Secrets

Set in: **GitHub repo → Settings → Secrets and variables → Actions**

| Secret | Description | How to get |
|--------|-------------|-----------|
| `EC2_HOST` | EC2 instance public IP | AWS Console → EC2 → Instance details |
| `EC2_USER` | SSH username | `ec2-user` for Amazon Linux 2 |
| `EC2_SSH_PRIVATE_KEY` | Full contents of `.pem` file | AWS key pair created at instance launch |
| `EC2_APP_DIR` | Absolute path to project on EC2 | `/home/ec2-user/steveackleyorg` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://steveackley:<password>@db:5432/steveackleydb` |
| `AUTH_SECRET` | JWT signing secret (32+ bytes) | `openssl rand -base64 32` |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of admin password | `npm run setup:admin` |
| `POSTGRES_PASSWORD` | Database password | Strong random password |
| `CLOUDFLARE_ZONE_ID` | Cloudflare zone for steveackley.org | Cloudflare dashboard → domain overview → Zone ID |
| `CLOUDFLARE_API_TOKEN` | API token with Cache Purge permission | Cloudflare → Profile → API Tokens |

> `GHCR_TOKEN` is set automatically in the workflow env as `${{ secrets.GITHUB_TOKEN }}` — no manual secret needed.

---

## Docker Configuration

### docker-compose.yml (Production)

Two services: `web` and `db`, two volumes, two networks.

**web container:**
- Image: `ghcr.io/stevenfackley/steveackley-web:latest`
- Port: `3000:3000`
- Env file: `web.env` (secrets injected by CI/CD)
- Non-secret env vars baked directly into the compose file (safe to commit)
- Volume: `uploads_data:/app/uploads`
- Networks: `web` (external, shared with `cloudflared`), `internal`
- Depends on: `db` healthcheck

**db container:**
- Image: `postgres:16-alpine`
- Password via Docker secret: `./secrets/postgres_password.txt`
- Volume: `postgres_data:/var/lib/postgresql/data`
- Healthcheck: `pg_isready -U steveackley -d steveackleydb`
- Network: `internal` only (never exposed publicly)

### Why web.env instead of .env?

Docker Compose interpolates `$VARIABLE` syntax in `.env` files. bcrypt password hashes contain `$` characters (e.g., `$2b$12$...`), which causes Docker Compose to misparse them. The CI/CD script escapes all `$` as `$$` when writing `web.env` and uses that file instead.

### Dockerfile (Multi-stage)

**Stage 1 — deps (`node:20-alpine`):**
- Install system deps: `libc6-compat openssl`
- `npm ci --include=dev`
- `npx prisma generate`

**Stage 2 — builder (`node:20-alpine`):**
- Copy `node_modules` from deps stage
- `npm run build` (Next.js standalone output)

**Stage 3 — runner (`node:20-alpine`):**
- Non-root user: `nextjs` (UID 1001)
- Copies standalone build output, static files, prisma client
- Copies `docker/entrypoint.sh` and `docker/seed-admin.js`
- Creates `/app/uploads` directory (volume mount point)
- Exposes port 3000
- `ENTRYPOINT ["/app/docker/entrypoint.sh"]`
- `CMD ["node", "server.js"]`

### Container Startup (entrypoint.sh)

On every container start the entrypoint:
1. Logs which environment variables are set (values hidden)
2. Runs `prisma db push --skip-generate --accept-data-loss` (applies schema changes)
3. Runs `docker/seed-admin.js` (creates/updates admin user if `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` are set)
4. Executes `node server.js` (starts the Next.js server)

---

## EC2 Server Configuration

**Instance:** Amazon Linux 2, `3.230.237.0`
**SSH key:** `~/.ssh/aws-web-server1.pem`

### AWS Security Group (Inbound Rules)

| Type | Protocol | Port | Source |
|------|----------|------|--------|
| SSH | TCP | 22 | Your IP (or 0.0.0.0/0) |

No ports 80 or 443 are open. All web traffic enters through the Cloudflare Tunnel (outbound connection from `cloudflared`).

### Cloudflare Tunnel (systemd)

The `cloudflared` daemon runs as a systemd service on the EC2 host — outside of Docker.

**Config file:** `/etc/cloudflared/config.yml`

```yaml
tunnel: 3663784b-7da3-4749-9687-ede2eec232c6
credentials-file: /home/ec2-user/.cloudflared/3663784b-7da3-4749-9687-ede2eec232c6.json
ingress:
  - hostname: aws.steveackley.org
    service: http://localhost:3000
  - service: http_status:404
```

**Service management:**

```bash
# Check status
sudo systemctl status cloudflared

# Restart
sudo systemctl restart cloudflared

# View logs
sudo journalctl -u cloudflared -f
```

### Cloudflare DNS

The `aws` subdomain points to the tunnel via a CNAME record:

```
Type:   CNAME
Name:   aws
Target: <TUNNEL-ID>.cfargotunnel.com
Proxy:  Proxied (orange cloud)
```

### Project Directory on EC2

```
/home/ec2-user/steveackleyorg/   ← git repository (docker-compose.yml, source, etc.)
├── docker-compose.yml
├── web.env                       ← written by CI/CD (600 permissions)
├── secrets/
│   └── postgres_password.txt     ← written by CI/CD (600 permissions)
└── ...
```

---

## Manual Deployment

If you need to deploy without triggering CI/CD:

```bash
# SSH to EC2
ssh -i ~/.ssh/aws-web-server1.pem ec2-user@3.230.237.0

cd ~/steveackleyorg

# Pull latest compose files / configs
git pull origin main

# Pull latest image from GHCR
docker compose pull web

# Restart containers
docker compose up -d --remove-orphans

# Watch logs
docker logs steveackley-web -f
```

> Note: manual deploys require `web.env` and `secrets/postgres_password.txt` to already be present from a previous CI/CD run. If they are missing, create them manually before starting containers.

---

## Secret Rotation

1. Generate the new secret value locally
2. Update the corresponding GitHub Actions secret
3. Push any commit to `main` to trigger a deployment (the CI/CD script recreates `web.env` and `secrets/postgres_password.txt` on each run)

For immediate rotation without a code change:

```bash
ssh -i ~/.ssh/aws-web-server1.pem ec2-user@3.230.237.0
cd ~/steveackleyorg

# Edit web.env manually
nano web.env

# Restart to pick up new values
docker compose up -d web
```

---

## Troubleshooting

### Site returns 502 Bad Gateway

```bash
# Check if tunnel is connected
sudo systemctl status cloudflared

# Check if web container is running
docker ps | grep steveackley-web

# View tunnel logs
sudo journalctl -u cloudflared --lines 50

# View app logs
docker logs steveackley-web --tail 50
```

Common causes: web container not running, database not healthy, tunnel service stopped.

### Styles not loading (white / unstyled page)

Cause: Cloudflare cached the previous build's HTML but served a fresh build's hashed assets (or vice versa).

Fix: Cache is auto-purged by CI/CD after each deployment. For a manual purge:

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/<ZONE_ID>/purge_cache" \
  -H "Authorization: Bearer <API_TOKEN>" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

Or use the Cloudflare Dashboard → Caching → Purge Everything.

### Database connection error

```bash
# Check if DB container is healthy
docker ps | grep steveackley-db

# Check DB logs
docker logs steveackley-db

# Inspect inside the DB container
docker compose exec db psql -U steveackley -d steveackleydb
```

### Admin login not working

1. Verify `ADMIN_EMAIL` in `web.env` matches the email you are logging in with
2. Regenerate the hash: `npm run setup:admin` (locally), update `ADMIN_PASSWORD_HASH` secret, redeploy
3. Check container logs for auth errors: `docker logs steveackley-web`

### Container fails to start

```bash
# View startup logs
docker logs steveackley-web

# Common causes:
# - Missing web.env file
# - Database not healthy (check depends_on and db logs)
# - Invalid DATABASE_URL
# - Prisma db push failure (check for schema errors in logs)
```

### Docker network missing

```bash
docker network create web
docker compose up -d
```

---

## Additional Documentation

| Document | Description |
|----------|-------------|
| [docs/deployment/CLOUDFLARE_TUNNEL_SETUP.md](docs/deployment/CLOUDFLARE_TUNNEL_SETUP.md) | Cloudflare Tunnel configuration reference |
| [docs/deployment/CLOUDFLARE_AUTO_CACHE_CLEAR.md](docs/deployment/CLOUDFLARE_AUTO_CACHE_CLEAR.md) | Cloudflare cache purge setup |
| [docs/deployment/SERVER_CONFIG.md](docs/deployment/SERVER_CONFIG.md) | EC2 server configuration details |
| [docs/SECURITY.md](docs/SECURITY.md) | Security implementation |
