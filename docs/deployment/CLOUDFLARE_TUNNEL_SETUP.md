# 🚇 Cloudflare Tunnel Setup Summary

## ✅ Current Setup (Working)

Your site is successfully deployed using **Cloudflare Tunnel** on AWS EC2 with automated deployments.

---

## Architecture

```
┌─────────┐
│  Users  │
└────┬────┘
     │ HTTPS
     ▼
┌──────────────────┐
│   Cloudflare     │
│   Edge + CDN     │
└────┬─────────────┘
     │ Tunnel
     │ (outbound from EC2)
     ▼
┌──────────────────┐
│   EC2 Server     │
│  3.230.237.0     │
│                  │
│ ┌──────────────┐ │
│ │ cloudflared  │ │ (systemd service)
│ │   daemon     │ │
│ └──────┬───────┘ │
│        │ :3000   │
│ ┌──────▼───────┐ │
│ │   Next.js    │ │ (Docker)
│ │  Container   │ │
│ └──────┬───────┘ │
│        │         │
│ ┌──────▼───────┐ │
│ │  PostgreSQL  │ │ (Docker)
│ └──────────────┘ │
└──────────────────┘
```

---

## Key Configuration Files

### 1. Tunnel Config: `/etc/cloudflared/config.yml`

```yaml
tunnel: 3663784b-7da3-4749-9687-ede2eec232c6
credentials-file: /home/ec2-user/.cloudflared/3663784b-7da3-4749-9687-ede2eec232c6.json
ingress:
  - hostname: aws.steveackley.org
    service: http://localhost:3000
  - service: http_status:404
```

**Critical:** Points to `localhost:3000` (your Next.js app), NOT port 80!

### 2. Tunnel Service: `/etc/systemd/system/cloudflared.service`

Running as a systemd service (not Docker):
```bash
# Check status
sudo systemctl status cloudflared

# Restart if needed
sudo systemctl restart cloudflared

# View logs
sudo journalctl -u cloudflared -f
```

### 3. Docker Compose: `~/steveackleyorg/docker-compose.yml`

Standard setup with:
- Next.js web container (port 3000)
- PostgreSQL database
- Persistent volumes for data and uploads

---

## Deployment Flow

### Automated via GitHub Actions

1. **Push to `main` branch** → triggers workflow
2. **Build Docker image** → push to GitHub Container Registry
3. **Deploy to EC2:**
   - Pull latest image
   - Update `.env` file
   - Restart containers with `docker compose up -d`
4. **Purge Cloudflare cache** → users see latest version immediately

### Manual Deployment (if needed)

```bash
# SSH to EC2
ssh -i ~/.ssh/aws-web-server1.pem ec2-user@3.230.237.0

# Navigate to project
cd ~/steveackleyorg

# Pull latest code
git pull origin main

# Pull latest Docker image
docker compose pull

# Restart
docker compose up -d

# Check logs
docker logs steveackley-web --tail 50
```

---

## Troubleshooting

### Site returns 502 Bad Gateway

```bash
# Check if tunnel is connected
sudo systemctl status cloudflared

# Check if web container is running
docker ps | grep steveackley-web

# Check tunnel logs
sudo journalctl -u cloudflared -f

# Verify tunnel config points to port 3000
cat /etc/cloudflared/config.yml
```

**Fix:** Ensure tunnel service points to `http://localhost:3000`

### Styles not loading (white page)

**Cause:** Cloudflare caching old build IDs

**Fix:** Cache is now auto-purged on deployment. For manual purge:
1. Cloudflare Dashboard → Caching → Purge Everything
2. Or use API: See `CLOUDFLARE_AUTO_CACHE_CLEAR.md`

### Container can't reach database

```bash
# Check if DB is healthy
docker ps | grep steveackley-db

# Check network
docker network ls

# View DB logs
docker logs steveackley-db
```

---

## Security

✅ **No exposed ports** (except SSH):
- No port 80 (HTTP)
- No port 443 (HTTPS)
- Only port 22 for SSH management

✅ **Zero-trust tunnel**:
- Only authenticated tunnel daemon can access origin
- Origin IP hidden from public

✅ **Security Group** (AWS):
```
Inbound:  22 (SSH only)
Outbound: 443 (for tunnel connection to Cloudflare)
```

---

## Monitoring

### Check Tunnel Health

```bash
# Via SSH
ssh -i ~/.ssh/aws-web-server1.pem ec2-user@3.230.237.0 'sudo systemctl status cloudflared'

# Expected: "active (running)"
# Should show 4 registered connections
```

### Check Site Availability

```bash
curl -I https://aws.steveackley.org

# Expected: HTTP/1.1 200 OK
```

### Cloudflare Dashboard

- **Zero Trust** → **Access** → **Tunnels**
- Shows: Connection status, traffic, health

---

## Required GitHub Secrets

For automated deployment and cache clearing:

| Secret | Purpose | How to Get |
|--------|---------|-----------|
| `EC2_HOST` | EC2 IP address | `3.230.237.0` |
| `EC2_USER` | SSH username | `ec2-user` |
| `EC2_SSH_PRIVATE_KEY` | SSH key | Contents of `aws-web-server1.pem` |
| `EC2_APP_DIR` | Project path | `/home/ec2-user/steveackleyorg` |
| `EC2_DOTENV` | Environment vars | Contents of `.env` file |
| `CLOUDFLARE_ZONE_ID` | Cloudflare zone | Dashboard → steveackley.org → Zone ID |
| `CLOUDFLARE_API_TOKEN` | API token | Dashboard → Profile → API Tokens |

---

## Maintenance

### Update Tunnel

If you need to recreate the tunnel:

```bash
# On EC2
cloudflared tunnel list
cloudflared tunnel delete <tunnel-name>
cloudflared tunnel create new-tunnel-name

# Update config.yml with new tunnel ID
sudo nano /etc/cloudflared/config.yml

# Restart service
sudo systemctl restart cloudflared
```

### Rotate Secrets

```bash
# Update EC2 .env file
ssh -i ~/.ssh/aws-web-server1.pem ec2-user@3.230.237.0
cd ~/steveackleyorg
nano .env

# Restart containers
docker compose down
docker compose up -d
```

---

## Documentation References

- [CLOUDFLARE_AUTO_CACHE_CLEAR.md](./CLOUDFLARE_AUTO_CACHE_CLEAR.md) - Automated cache purging setup
- [Cloudflare Tunnel Docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

## Quick Reference Commands

```bash
# Check everything is running
ssh -i ~/.ssh/aws-web-server1.pem ec2-user@3.230.237.0 'docker ps && sudo systemctl status cloudflared | head -10'

# Restart tunnel
ssh -i ~/.ssh/aws-web-server1.pem ec2-user@3.230.237.0 'sudo systemctl restart cloudflared'

# View container logs
ssh -i ~/.ssh/aws-web-server1.pem ec2-user@3.230.237.0 'docker logs steveackley-web --tail 50'

# Restart app only (not tunnel)
ssh -i ~/.ssh/aws-web-server1.pem ec2-user@3.230.237.0 'cd ~/steveackleyorg && docker compose restart web'
```

---

**Status:** ✅ Production ready and fully automated!
