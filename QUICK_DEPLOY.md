# ⚡ Quick Deploy Reference

## Essential Commands (Copy & Paste)

### 1️⃣ Generate Cloudflare Origin Certificate
- **Cloudflare Dashboard** → SSL/TLS → Origin Server → Create Certificate
- Hostnames: `aws.steveackley.org` + `*.steveackley.org`
- Validity: 15 years
- **Save both the certificate and private key** (you'll paste them in Step 2)

---

### 2️⃣ SSH to EC2 & Create Certificates

```bash
# SSH to EC2
ssh -i /mnt/c/Users/steve/.ssh/aws-web-server1.pem ec2-user@3.230.237.0

# Create certs directory
mkdir -p ~/server/certs && cd ~/server/certs

# Create certificate file (paste Cloudflare Origin Certificate)
nano origin.crt
# Paste the certificate, save (Ctrl+X, Y, Enter)

# Create private key file (paste Cloudflare Private Key)
nano origin.key
# Paste the key, save (Ctrl+X, Y, Enter)

# Set permissions
chmod 600 origin.key
chmod 644 origin.crt

# Verify
ls -la ~/server/certs/

# Exit SSH
exit
```

---

### 3️⃣ Deploy Config Files from Local Machine

```bash
# From WSL, in your project directory
cd /home/steve/projects/steveackleyorg

# Copy both files at once
scp -i /mnt/c/Users/steve/.ssh/aws-web-server1.pem \
  server/Caddyfile \
  server/docker-compose.yml \
  ec2-user@3.230.237.0:~/server/
```

---

### 4️⃣ Restart Caddy

```bash
# SSH back to EC2
ssh -i /mnt/c/Users/steve/.ssh/aws-web-server1.pem ec2-user@3.230.237.0

# Restart Caddy
cd ~/server
docker compose down
docker compose up -d

# Check logs
docker logs caddy

# Exit
exit
```

---

### 5️⃣ Test

```bash
# From local machine
curl -I https://aws.steveackley.org

# Expected: HTTP/2 200 (not 308 Permanent Redirect)

# Open in browser: https://aws.steveackley.org
# Expected: Fully styled site with Tailwind CSS
```

---

## 🚨 Troubleshooting One-Liner

```bash
ssh -i /mnt/c/Users/steve/.ssh/aws-web-server1.pem ec2-user@3.230.237.0 "docker logs caddy --tail 50"
```

---

## ✅ Success Check

Before: `308 Permanent Redirect` loops  
After: `200 OK` + fully styled Next.js site
