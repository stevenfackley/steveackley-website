# 🚇 Cloudflare Tunnel Migration Guide

## 📊 Architecture Comparison

### Current Architecture (Caddy + Origin Certificates)
```
┌─────────────┐     HTTPS      ┌──────────────────────┐     HTTPS     ┌─────────────┐
│  Cloudflare │────443/80──────▶│   EC2 Public IP      │──────────────▶│    Caddy    │
│    Edge     │                 │  (3.230.237.0)       │               │  Reverse    │
└─────────────┘                 │                      │               │   Proxy     │
                                │  Security Group:     │               └──────┬──────┘
                                │  - Allow 443 (HTTPS) │                      │
                                │  - Allow 80 (HTTP)   │                      │ port 3000
                                │  - Allow 22 (SSH)    │                      ▼
                                └──────────────────────┘               ┌──────────────┐
                                                                       │   Next.js    │
                                ┌──────────────────────┐               │  Container   │
                                │  TLS Management      │               └──────┬───────┘
                                │  - Origin Cert       │                      │
                                │  - Private Key       │                      │
                                │  - 15-year validity  │                      ▼
                                │  - Manual setup      │               ┌──────────────┐
                                └──────────────────────┘               │  PostgreSQL  │
                                                                       │  Container   │
                                                                       └──────────────┘
```

**Pros:**
- ✅ Direct connection, slightly lower latency
- ✅ Full control over reverse proxy (Caddy)
- ✅ Standard web hosting pattern

**Cons:**
- ❌ Ports 80/443 must be publicly exposed
- ❌ Direct exposure to port scanning, DDoS attacks
- ❌ Requires TLS certificate management (Origin Certs)
- ❌ Must be in public subnet with public IP
- ❌ Security group must allow inbound traffic
- ❌ Additional complexity with Caddy configuration

---

### Recommended Architecture (Cloudflare Tunnel)
```
┌─────────────┐   Cloudflare    ┌──────────────────────┐   Outbound    ┌──────────────┐
│  Cloudflare │◀───Tunnel───────│   EC2 (Private)      │───Tunnel──────▶│ Cloudflare   │
│    Edge     │                 │  (No public IP req)  │   Connection  │   Network    │
└─────────────┘                 │                      │               └──────────────┘
                                │  Security Group:     │
      Users access              │  - NO 443 needed     │
      via Cloudflare            │  - NO 80 needed      │
      domain name               │  - Only 22 for SSH   │
                                │    (or SSM Session)  │
                                └──────────┬───────────┘
                                           │
                                           │ Local network
                                           │
                                    ┌──────▼──────┐
                                    │ cloudflared │
                                    │   daemon    │
                                    │ (container) │
                                    └──────┬──────┘
                                           │ port 3000
                                           ▼
                                    ┌──────────────┐
                                    │   Next.js    │
                                    │  Container   │
                                    └──────┬───────┘
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │  PostgreSQL  │
                                    │  Container   │
                                    └──────────────┘
```

**Pros:**
- ✅ **No ports 80/443 exposed** - significantly more secure
- ✅ **No TLS certificate management** - Cloudflare handles everything
- ✅ **DDoS protection** - Cloudflare absorbs attacks before they reach origin
- ✅ **Can use private subnet** - no public IP required
- ✅ **Zero-trust security** - only authenticated tunnel can access origin
- ✅ **Simpler architecture** - removes Caddy, removes cert management
- ✅ **Automatic failover** - can run multiple tunnels for redundancy
- ✅ **IP reputation protection** - origin IP never exposed
- ✅ **Free for small-scale use** - no additional cost

**Cons:**
- ⚠️ Adds one extra hop (minimal latency increase: ~5-20ms)
- ⚠️ Dependency on Cloudflare tunnel service uptime
- ⚠️ Requires cloudflared daemon running

---

## 🎯 Recommendation: Migrate to Cloudflare Tunnel

**For your use case, Cloudflare Tunnel is the superior choice because:**

1. **Security First**: Personal websites are frequent targets for automated attacks. Tunnel eliminates surface area.
2. **Simplicity**: No TLS certificate management, no reverse proxy configuration.
3. **Cost**: Same cost (free with Cloudflare), but reduces attack-related bandwidth costs.
4. **Future-proof**: Can easily add more applications on same EC2 with different subdomains.
5. **Modern Best Practice**: Zero-trust architecture is the industry standard for 2025+.

---

## 📋 Migration Plan

### Phase 1: Preparation (No Downtime)
1. **Install cloudflared on EC2** (as Docker container)
2. **Create Cloudflare Tunnel** via dashboard or CLI
3. **Configure tunnel** to route traffic to `steveackley-web:3000`
4. **Test tunnel** on a different subdomain (e.g., `tunnel-test.steveackley.org`)

### Phase 2: Migration (Brief Downtime: ~2 minutes)
1. **Update DNS** in Cloudflare to point to tunnel
2. **Stop Caddy container** (`cd ~/server && docker compose down`)
3. **Remove Caddy from docker-compose.yml**
4. **Update security group** (remove ports 80/443, keep only SSH)
5. **Verify site works** via tunnel

### Phase 3: Cleanup
1. **Remove Caddy configuration files** (`server/Caddyfile`, `server/docker-compose.yml`)
2. **Remove Origin Certificates** (`server/certs/`)
3. **Update documentation**
4. **Monitor for 24 hours**

---

## 🛠️ Detailed Implementation Steps

### Step 1: Create Cloudflare Tunnel

**Option A: Via Cloudflare Dashboard (Recommended for first time)**

1. Go to **Cloudflare Dashboard** → **Zero Trust**
   - If you haven't set up Zero Trust yet:
     - Click "Get started"
     - Choose a team name (e.g., "steveackley")
     - Select the free plan

2. Navigate to **Access** → **Tunnels**

3. Click **"Create a tunnel"**

4. **Choose tunnel type**: Cloudflared

5. **Name your tunnel**: `steveackley-web-tunnel`

6. **Install connector**:
   - Don't use the provided installation commands yet
   - Instead, note down the **tunnel token** that looks like:
     ```
     eyJhIjoixxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...
     ```
   - This token will be used in your Docker setup

7. **Configure public hostname**:
   - **Subdomain**: `aws` (or leave blank for apex)
   - **Domain**: `steveackley.org`
   - **Type**: HTTP
   - **URL**: `steveackley-web:3000` (Docker container name)
   
8. Click **Save tunnel**

**Option B: Via CLI (Advanced)**

```bash
# Install cloudflared locally (for setup only)
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared

# Authenticate
./cloudflared tunnel login

# Create tunnel
./cloudflared tunnel create steveackley-web-tunnel

# This creates a credentials file: ~/.cloudflared/<TUNNEL-ID>.json
```

---

### Step 2: Add Cloudflared to Docker Compose

**Create new file: `docker-compose.tunnel.yml`**

```yaml
# =============================================================================
# steveackley.org — Production Docker Compose with Cloudflare Tunnel
# This replaces the need for Caddy reverse proxy and TLS certificates
# =============================================================================

services:
  tunnel:
    image: cloudflare/cloudflared:latest
    container_name: cloudflare-tunnel
    command: tunnel --no-autoupdate run --token ${CLOUDFLARE_TUNNEL_TOKEN}
    restart: unless-stopped
    networks:
      - internal
    depends_on:
      - web

  web:
    image: ghcr.io/stevenfackley/steveackley-web:latest
    container_name: steveackley-web
    # NO PORT MAPPING NEEDED - tunnel accesses via internal network
    env_file:
      - .env
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      AUTH_SECRET: ${AUTH_SECRET}
      AUTH_URL: ${AUTH_URL}
      ADMIN_EMAIL: ${ADMIN_EMAIL}
      NEXT_PUBLIC_LINKEDIN_URL: ${NEXT_PUBLIC_LINKEDIN_URL}
      NEXT_PUBLIC_EMAIL: ${NEXT_PUBLIC_EMAIL}
      NEXT_PUBLIC_P1_OPS_HUB_URL: ${NEXT_PUBLIC_P1_OPS_HUB_URL}
      UPLOAD_DIR: /app/uploads
      MAX_UPLOAD_SIZE_MB: "5"
      NODE_ENV: production
    volumes:
      - uploads_data:/app/uploads
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - internal

  db:
    image: postgres:16-alpine
    container_name: steveackley-db
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s
    restart: unless-stopped
    networks:
      - internal

volumes:
  postgres_data:
    driver: local
  uploads_data:
    driver: local

networks:
  internal:
    driver: bridge
```

---

### Step 3: Update Environment Variables

Add to your `.env` file:

```bash
# Cloudflare Tunnel Token (from Step 1)
CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoixxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...

# Update AUTH_URL to your final domain
AUTH_URL=https://aws.steveackley.org
```

---

### Step 4: Deploy Tunnel Configuration

**SSH to EC2:**

```bash
ssh -i /mnt/c/Users/steve/.ssh/aws-web-server1.pem ec2-user@3.230.237.0
```

**On EC2:**

```bash
# Navigate to project directory
cd ~/steveackleyorg  # or wherever your project is

# Stop current Caddy setup
cd ~/server
docker compose down

# Go back to project directory
cd ~/steveackleyorg

# Pull latest changes (if you've pushed the new docker-compose.tunnel.yml)
git pull

# Or manually copy docker-compose.tunnel.yml from local to EC2
# (from local machine):
# scp -i /mnt/c/Users/steve/.ssh/aws-web-server1.pem \
#   docker-compose.tunnel.yml \
#   ec2-user@3.230.237.0:~/steveackleyorg/

# Create/update .env file with CLOUDFLARE_TUNNEL_TOKEN
nano .env
# Add: CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoi...

# Start with tunnel
docker compose -f docker-compose.tunnel.yml down
docker compose -f docker-compose.tunnel.yml up -d

# Check logs
docker logs cloudflare-tunnel
docker logs steveackley-web

# Verify tunnel is connected
docker logs cloudflare-tunnel 2>&1 | grep -i "registered"
# Should see: "Connection <UUID> registered"
```

---

### Step 5: Update DNS in Cloudflare

This should already be done if you configured the tunnel in the dashboard, but verify:

1. Go to **Cloudflare Dashboard** → **DNS** → **Records**

2. You should see a CNAME record:
   ```
   Type: CNAME
   Name: aws
   Content: <TUNNEL-ID>.cfargotunnel.com
   Proxy status: Proxied (orange cloud)
   ```

3. If not, add it manually:
   - Type: CNAME
   - Name: `aws` (or `@` for apex domain)
   - Target: Your tunnel ID from the tunnel dashboard
   - Proxy status: **Proxied** (orange cloud icon)

---

### Step 6: Update AWS Security Group

**Remove unnecessary ports:**

1. Go to **AWS Console** → **EC2** → **Security Groups**

2. Select your instance's security group

3. **Edit Inbound Rules**:
   - **Remove**: Port 80 (HTTP)
   - **Remove**: Port 443 (HTTPS)
   - **Keep**: Port 22 (SSH) - for management access
   
   Final inbound rules should be:
   ```
   Type: SSH
   Protocol: TCP
   Port: 22
   Source: Your-IP/32 (or 0.0.0.0/0 if you need access from anywhere)
   ```

4. **Outbound Rules**: Keep default (allow all) - tunnel needs outbound HTTPS

---

### Step 7: Test and Verify

```bash
# From local machine
curl -I https://aws.steveackley.org

# Expected: HTTP/2 200

# Test in browser
# Open: https://aws.steveackley.org
# Expected: Fully functional site

# Check tunnel status
ssh -i /mnt/c/Users/steve/.ssh/aws-web-server1.pem ec2-user@3.230.237.0
docker logs cloudflare-tunnel --tail 50
```

**Expected log output:**
```
INF Starting tunnel tunnelID=<UUID>
INF Connection registered connIndex=0 connection=<UUID>
INF Connection registered connIndex=1 connection=<UUID>
INF Connection registered connIndex=2 connection=<UUID>
INF Connection registered connIndex=3 connection=<UUID>
```

---

### Step 8: Cleanup Old Configuration

**Once everything is working:**

```bash
# SSH to EC2
ssh -i /mnt/c/Users/steve/.ssh/aws-web-server1.pem ec2-user@3.230.237.0

# Remove Caddy files (backup first)
cd ~/server
tar -czf caddy-backup-$(date +%Y%m%d).tar.gz Caddyfile docker-compose.yml certs/
mv caddy-backup-*.tar.gz ~/backups/
rm -rf ~/server

# Remove old docker network (if no longer needed)
docker network rm web 2>/dev/null || true

# Clean up docker images
docker image prune -a -f
```

---

## 🔄 Rollback Plan

If something goes wrong, you can quickly rollback:

```bash
# SSH to EC2
ssh -i /mnt/c/Users/steve/.ssh/aws-web-server1.pem ec2-user@3.230.237.0

# Stop tunnel setup
cd ~/steveackleyorg
docker compose -f docker-compose.tunnel.yml down

# Restore Caddy
cd ~/server
docker compose up -d

# Revert DNS in Cloudflare dashboard to point back to EC2 IP
# (or keep the CNAME but remove tunnel and let it fail over to A record)
```

---

## 🎛️ Advanced Configuration

### Multiple Domains/Subdomains

Edit tunnel configuration to handle multiple routes:

```yaml
# In Cloudflare Dashboard under Tunnels → Configure → Public Hostnames
# Add multiple routes:

1. aws.steveackley.org → http://steveackley-web:3000
2. steveackley.org → http://steveackley-web:3000
3. www.steveackley.org → http://steveackley-web:3000
```

### Custom Tunnel Configuration File

For more control, use a config file instead of token:

```bash
# On EC2: ~/steveackleyorg/tunnel-config.yml
tunnel: <TUNNEL-ID>
credentials-file: /etc/cloudflared/credentials.json

ingress:
  - hostname: aws.steveackley.org
    service: http://steveackley-web:3000
  - hostname: steveackley.org
    service: http://steveackley-web:3000
  - service: http_status:404
```

Then update docker-compose:

```yaml
tunnel:
  image: cloudflare/cloudflared:latest
  command: tunnel --config /etc/cloudflared/config.yml run
  volumes:
    - ./tunnel-config.yml:/etc/cloudflared/config.yml:ro
    - ./tunnel-credentials.json:/etc/cloudflared/credentials.json:ro
```

---

## 📊 Monitoring

### Check Tunnel Health

```bash
# View tunnel logs
docker logs cloudflare-tunnel -f

# Check connection status
docker logs cloudflare-tunnel 2>&1 | grep "registered\|disconnected\|error"
```

### Cloudflare Dashboard

- **Zero Trust** → **Access** → **Tunnels** → View your tunnel
- Shows: Status, connections, traffic metrics

### Tunnel Metrics

Cloudflare automatically provides:
- Request count
- Response codes
- Bandwidth usage
- Connection status

---

## 🔒 Security Benefits

### Before (Caddy + Origin Certs)
- Public IP exposed to internet
- Ports 80/443 open and scannable
- Direct attacks possible (even if Cloudflare is in front)
- Must manage TLS certificates
- Origin server visible in DNS (IP can be found)

### After (Cloudflare Tunnel)
- No public IP required
- Zero open inbound ports (except SSH)
- Origin IP never exposed
- Impossible to bypass Cloudflare
- No certificate management
- Authenticated tunnel connection only

---

## 💰 Cost Analysis

**Current Setup:**
- EC2 instance: ~$10-30/month (depending on size)
- Cloudflare: Free
- Total: ~$10-30/month

**With Cloudflare Tunnel:**
- EC2 instance: ~$10-30/month (same)
- Cloudflare: Free (tunnels included in free plan)
- Total: ~$10-30/month

**Additional Benefits:**
- No cost increase
- Reduced bandwidth from blocked attacks
- No origin certificate renewal concerns

---

## 📚 Additional Resources

- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Cloudflare Zero Trust](https://developers.cloudflare.com/cloudflare-one/)
- [Tunnel Configuration Reference](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/)

---

## ✅ Migration Checklist

- [ ] Create Cloudflare Tunnel in dashboard
- [ ] Save tunnel token
- [ ] Create `docker-compose.tunnel.yml`
- [ ] Add `CLOUDFLARE_TUNNEL_TOKEN` to `.env`
- [ ] Copy files to EC2
- [ ] Stop Caddy (`cd ~/server && docker compose down`)
- [ ] Start tunnel setup (`docker compose -f docker-compose.tunnel.yml up -d`)
- [ ] Verify tunnel connection (`docker logs cloudflare-tunnel`)
- [ ] Update DNS in Cloudflare (should be automatic)
- [ ] Test site: `curl -I https://aws.steveackley.org`
- [ ] Test in browser
- [ ] Update security group (remove ports 80/443)
- [ ] Monitor for 24 hours
- [ ] Cleanup Caddy files
- [ ] Update project documentation
- [ ] Celebrate! 🎉

---

## 🚨 Troubleshooting

### Tunnel shows "disconnected"

```bash
# Check tunnel logs
docker logs cloudflare-tunnel

# Common issues:
# 1. Invalid token → regenerate in dashboard
# 2. Network connectivity → check EC2 outbound rules
# 3. Service not reachable → verify steveackley-web container is running
```

### Site returns 502 Bad Gateway

```bash
# Check if web container is running
docker ps | grep steveackley-web

# Check web container logs
docker logs steveackley-web

# Verify tunnel can reach web container
docker exec cloudflare-tunnel ping steveackley-web
```

### Tunnel connects but site times out

```bash
# Check tunnel ingress configuration
# In Cloudflare dashboard → Tunnels → Configure
# Verify: Type = HTTP, URL = steveackley-web:3000
```

---

**Questions?** Check tunnel logs first: `docker logs cloudflare-tunnel --tail 100`
