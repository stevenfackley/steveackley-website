# EC2 Server Configuration

Configuration reference for the AWS EC2 instance hosting steveackley.org.

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

No ports 80 or 443 are open. All web traffic enters through the Cloudflare Tunnel outbound connection — no inbound web ports are required.

**Outbound rules:** Default (allow all) — required for the tunnel to connect to Cloudflare's network on port 443.

---

## Installed Software

| Software | How installed | Purpose |
|----------|--------------|---------|
| Docker | Amazon Linux extras | Container runtime |
| Docker Compose v2 | Plugin via yum | Multi-container orchestration |
| cloudflared | rpm from Cloudflare repo | Tunnel daemon |
| git | yum | Repository management |

---

## Cloudflare Tunnel (systemd)

`cloudflared` runs as a systemd service — outside of Docker.

**Config file:** `/etc/cloudflared/config.yml`

```yaml
tunnel: 3663784b-7da3-4749-9687-ede2eec232c6
credentials-file: /home/ec2-user/.cloudflared/3663784b-7da3-4749-9687-ede2eec232c6.json
ingress:
  - hostname: aws.steveackley.org
    service: http://localhost:3000
  - service: http_status:404
```

**Credentials file:** `/home/ec2-user/.cloudflared/3663784b-7da3-4749-9687-ede2eec232c6.json`

**Service management:**

```bash
# Check status
sudo systemctl status cloudflared

# Start / stop / restart
sudo systemctl start cloudflared
sudo systemctl stop cloudflared
sudo systemctl restart cloudflared

# Enable on boot (already configured)
sudo systemctl enable cloudflared

# View live logs
sudo journalctl -u cloudflared -f

# View last 50 lines
sudo journalctl -u cloudflared --lines 50
```

**Expected healthy log output:**
```
INF Starting tunnel tunnelID=3663784b-7da3-4749-9687-ede2eec232c6
INF Connection registered connIndex=0 connection=<UUID>
INF Connection registered connIndex=1 connection=<UUID>
INF Connection registered connIndex=2 connection=<UUID>
INF Connection registered connIndex=3 connection=<UUID>
```

---

## Docker Setup

### Docker Network

The `web` network is external and must exist before starting containers:

```bash
docker network create web
```

The GitHub Actions deploy script creates this automatically if missing.

### Application Directory

```
/home/ec2-user/steveackleyorg/
├── .github/
│   └── workflows/deploy.yml
├── docker/
│   ├── entrypoint.sh
│   └── seed-admin.js
├── docker-compose.yml         <- used in production
├── docker-compose.dev.yml
├── docker-compose.tunnel.yml  <- alternative (tunnel as Docker container)
├── Dockerfile
├── prisma/
├── scripts/
├── src/
├── web.env                    <- written by CI/CD (600 permissions)
└── secrets/
    └── postgres_password.txt  <- written by CI/CD (600 permissions)
```

### Container Management

```bash
cd ~/steveackleyorg

# View running containers
docker ps

# Start / restart all
docker compose up -d

# Restart web container only
docker compose restart web

# Stop all
docker compose down

# View logs
docker logs steveackley-web --tail 50
docker logs steveackley-db --tail 50

# Follow logs
docker logs steveackley-web -f
```

---

## Cloudflare DNS

The `aws` subdomain resolves via a CNAME to the tunnel:

```
Type:   CNAME
Name:   aws
Target: 3663784b-7da3-4749-9687-ede2eec232c6.cfargotunnel.com
Proxy:  Proxied (orange cloud)
```

This record is managed in the Cloudflare dashboard under steveackley.org -> DNS -> Records.

---

## Secret Files

Two files are written by the GitHub Actions deployment script on every deploy:

**`~/steveackleyorg/web.env`** — injected into the `web` container via `env_file`:
```
DATABASE_URL=...
AUTH_SECRET=...
ADMIN_PASSWORD_HASH=...   <- $ characters escaped as $$ for Docker Compose
```

**`~/steveackleyorg/secrets/postgres_password.txt`** — mounted as a Docker secret into the `db` container.

Both files have permissions `600` (owner-readable only).

To manually verify:

```bash
# View env keys (not values)
awk -F= '{print $1}' ~/steveackleyorg/web.env

# Check secret file is non-empty
wc -c ~/steveackleyorg/secrets/postgres_password.txt
```

---

## Maintenance Tasks

### Update cloudflared

```bash
sudo yum update cloudflared
sudo systemctl restart cloudflared
```

### Prune unused Docker images

```bash
docker image prune -f
# Or remove all unused resources:
docker system prune -f
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
# steveackleyorg_uploads_data  -- uploaded images
```

---

## If the Tunnel Needs to Be Recreated

1. Log in to Cloudflare Zero Trust -> Access -> Tunnels
2. Delete the old tunnel
3. Create a new tunnel named `steveackley-web-tunnel`
4. Download the new credentials JSON file to `/home/ec2-user/.cloudflared/<NEW-ID>.json`
5. Update `/etc/cloudflared/config.yml` with the new tunnel ID and credentials path
6. Configure the public hostname: `aws.steveackley.org` -> `http://localhost:3000`
7. Restart the service: `sudo systemctl restart cloudflared`
8. Update the CNAME in Cloudflare DNS to point to `<NEW-ID>.cfargotunnel.com`
