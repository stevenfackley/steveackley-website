# Quick Deploy Reference

Essential commands for managing the production deployment of steveackley.org.

---

## Automated Deployment

Push to `main` → GitHub Actions builds, pushes to GHCR, deploys to EC2, and purges Cloudflare cache automatically.

```bash
git push origin main
# Watch progress at: https://github.com/stevenfackley/steveackleyorg/actions
```

---

## SSH to EC2

```bash
ssh -i ~/.ssh/aws-web-server1.pem ec2-user@3.230.237.0

# From WSL:
ssh -i /mnt/c/Users/steve/.ssh/aws-web-server1.pem ec2-user@3.230.237.0
```

---

## Container Management

```bash
# View running containers
docker ps

# Restart web container only
cd ~/steveackleyorg && docker compose restart web

# Restart all containers
cd ~/steveackleyorg && docker compose up -d

# Stop all containers
cd ~/steveackleyorg && docker compose down

# Pull latest image and restart (manual deploy)
cd ~/steveackleyorg && git pull origin main && docker compose pull web && docker compose up -d --remove-orphans
```

---

## Logs

```bash
# App logs (follow)
docker logs steveackley-web -f

# App logs (last 50 lines)
docker logs steveackley-web --tail 50

# Database logs
docker logs steveackley-db

# Cloudflare tunnel logs
sudo journalctl -u cloudflared -f
```

---

## Health Checks

```bash
# Check all containers are running
docker ps

# Check tunnel is connected
sudo systemctl status cloudflared

# Hit the app directly
curl -I http://localhost:3000/

# Check the admin login endpoint
curl -o /dev/null -w "%{http_code}" http://localhost:3000/admin/login
```

---

## Cloudflare Tunnel

```bash
# Check status
sudo systemctl status cloudflared

# Restart tunnel
sudo systemctl restart cloudflared

# View tunnel logs
sudo journalctl -u cloudflared --lines 50
```

---

## Manual Cache Purge

```bash
# Replace with actual values (or run from local machine with secrets)
curl -X POST "https://api.cloudflare.com/client/v4/zones/<ZONE_ID>/purge_cache" \
  -H "Authorization: Bearer <API_TOKEN>" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

---

## Database Access

```bash
# Connect to PostgreSQL inside the container
docker compose -f ~/steveackleyorg/docker-compose.yml exec db psql -U steveackley -d steveackleydb

# List tables
\dt

# Quit
\q
```

---

## Secret Files (written by CI/CD on each deploy)

```bash
# View keys in web.env (values are hidden)
awk -F= '{print $1}' ~/steveackleyorg/web.env

# Check postgres secret file size
wc -c ~/steveackleyorg/secrets/postgres_password.txt
```

---

## One-liners from Local Machine

```bash
# Check everything from local machine
ssh -i ~/.ssh/aws-web-server1.pem ec2-user@3.230.237.0 \
  'docker ps && sudo systemctl status cloudflared | head -5'

# Tail app logs remotely
ssh -i ~/.ssh/aws-web-server1.pem ec2-user@3.230.237.0 \
  'docker logs steveackley-web --tail 50'

# Restart web container remotely
ssh -i ~/.ssh/aws-web-server1.pem ec2-user@3.230.237.0 \
  'cd ~/steveackleyorg && docker compose restart web'
```

---

## Troubleshooting Quick Reference

| Symptom | First check |
|---------|-------------|
| 502 Bad Gateway | `sudo systemctl status cloudflared` and `docker ps` |
| White / unstyled page | Purge Cloudflare cache (auto-done on deploy) |
| Can't log in as admin | Check `ADMIN_EMAIL` in `web.env`, redeploy if wrong |
| Container not starting | `docker logs steveackley-web` — look for startup errors |
| DB connection errors | `docker logs steveackley-db` — check healthcheck status |

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed troubleshooting steps.
