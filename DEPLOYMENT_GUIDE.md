# 🚀 Deployment Guide: Fix Caddy TLS Certificate Issue

## Problem Summary
Caddy has no valid TLS certificate, causing HTTP→HTTPS 308 redirect loops when Cloudflare Full Strict SSL tries to connect on port 443. This guide walks through deploying the fix.

## ✅ Pre-Deployment Checklist
- [x] Code changes committed to main (commit 4112ea7)
- [x] server/Caddyfile has TLS directive
- [x] server/docker-compose.yml mounts certs directory
- [x] .gitignore excludes server/certs/

---

## 📋 Step-by-Step Deployment

### Step 1: Generate Cloudflare Origin Certificate

1. **Go to Cloudflare Dashboard**
   - Log in to Cloudflare
   - Select your domain: `steveackley.org`

2. **Navigate to Origin Server Certificates**
   - Go to: **SSL/TLS** → **Origin Server** tab
   - Click: **"Create Certificate"**

3. **Configure Certificate**
   - **Private key type**: RSA (default)
   - **Hostnames**: Add these two:
     - `aws.steveackley.org`
     - `*.steveackley.org` (optional, for future subdomains)
   - **Certificate Validity**: 15 years
   - Click: **"Create"**

4. **Save Certificate Files**
   - **Copy the "Origin Certificate"** (starts with `-----BEGIN CERTIFICATE-----`)
   - **Copy the "Private Key"** (starts with `-----BEGIN PRIVATE KEY-----`)
   - Keep this browser tab open until you've saved both files on the server

---

### Step 2: SSH to EC2 and Create Certificates

**Open PowerShell or Windows Terminal and run:**

```powershell
# SSH to EC2 (from Windows)
ssh -i C:\Users\steve\.ssh\aws-web-server1.pem ec2-user@3.230.237.0
```

**Or from WSL:**

```bash
# SSH to EC2 (from WSL)
ssh -i /mnt/c/Users/steve/.ssh/aws-web-server1.pem ec2-user@3.230.237.0
```

**Once connected to EC2:**

```bash
# Create the certs directory
mkdir -p ~/server/certs
cd ~/server/certs

# Create the certificate file
cat > origin.crt << 'EOF'
# Paste the "Origin Certificate" from Cloudflare here
# (including -----BEGIN CERTIFICATE----- and -----END CERTIFICATE-----)
EOF

# Create the private key file
cat > origin.key << 'EOF'
# Paste the "Private Key" from Cloudflare here
# (including -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----)
EOF

# Set restrictive permissions on the private key
chmod 600 origin.key
chmod 644 origin.crt

# Verify files were created
ls -la ~/server/certs/
```

**Expected output:**
```
-rw-r--r-- 1 ec2-user ec2-user [size] [date] origin.crt
-rw------- 1 ec2-user ec2-user [size] [date] origin.key
```

---

### Step 3: Copy Updated Configuration Files to EC2

**From your local machine (in WSL), run:**

```bash
# Navigate to your repo
cd /home/steve/projects/steveackleyorg

# Verify you're on the latest commit
git status
git log --oneline -1  # Should show commit 4112ea7

# Copy Caddyfile to EC2
scp -i /mnt/c/Users/steve/.ssh/aws-web-server1.pem \
  server/Caddyfile \
  ec2-user@3.230.237.0:~/server/Caddyfile

# Copy docker-compose.yml to EC2
scp -i /mnt/c/Users/steve/.ssh/aws-web-server1.pem \
  server/docker-compose.yml \
  ec2-user@3.230.237.0:~/server/docker-compose.yml
```

**Expected output for each:**
```
Caddyfile         100%  [size]    [speed]
docker-compose.yml 100% [size]    [speed]
```

---

### Step 4: Restart Caddy Container

**SSH back into EC2 (if not already connected):**

```bash
ssh -i /mnt/c/Users/steve/.ssh/aws-web-server1.pem ec2-user@3.230.237.0
```

**Restart Caddy:**

```bash
# Navigate to server directory
cd ~/server

# Verify all files are present
ls -la
# Should see: Caddyfile, docker-compose.yml, certs/ directory

ls -la certs/
# Should see: origin.crt, origin.key

# Stop Caddy
docker compose down

# Start Caddy with new configuration
docker compose up -d

# Check if Caddy is running
docker ps

# Check Caddy logs for any errors
docker logs caddy

# Verify Caddy loaded the TLS certificate
docker logs caddy 2>&1 | grep -i tls
```

**Expected log output:**
- No errors about missing certificates
- Should see: "certificate loaded" or similar

---

### Step 5: Verify AWS Security Group

**Check that TCP port 443 is open:**

1. Go to AWS Console → EC2 → Instances
2. Select your instance (3.230.237.0)
3. Click the **Security** tab
4. Check **Security groups** → click on the security group
5. Click **Inbound rules**
6. Verify you have:
   - **Type**: HTTPS
   - **Protocol**: TCP
   - **Port Range**: 443
   - **Source**: 0.0.0.0/0 (or ::/0 for IPv6)

**If port 443 is not open:**
- Click **Edit inbound rules**
- Click **Add rule**
- Type: HTTPS
- Source: Anywhere-IPv4 (0.0.0.0/0)
- Save rules

---

### Step 6: Test the Fix

**From your local machine, test the connection:**

```bash
# Test 1: Check if redirect loop is gone
curl -I https://aws.steveackley.org

# Expected: 200 OK (not 308 Permanent Redirect)

# Test 2: Check if static assets load
curl -I https://aws.steveackley.org/_next/static/chunks/main.js

# Expected: 200 OK (not redirect)

# Test 3: Visit in browser
# Open: https://aws.steveackley.org
# Expected: Site loads with styles applied
```

**If you still see 308 redirects:**
- Check Caddy logs: `docker logs caddy`
- Verify certificate files exist and have correct permissions
- Verify Cloudflare SSL/TLS mode is set to **Full (strict)**

---

## 🔍 Troubleshooting

### Issue: Caddy logs show "no certificate available"
**Solution:**
- Verify certificate files exist: `ls -la ~/server/certs/`
- Verify docker-compose.yml mounts the certs directory
- Restart Caddy: `cd ~/server && docker compose restart`

### Issue: Still getting redirect loops
**Solution:**
- Verify Cloudflare SSL/TLS mode:
  - Go to Cloudflare → SSL/TLS → Overview
  - Should be set to **"Full (strict)"**
- Check if certificate is valid:
  ```bash
  openssl x509 -in ~/server/certs/origin.crt -text -noout | grep -A2 "Validity"
  ```

### Issue: Browser shows certificate error
**Solution:**
- This is expected if you visit the EC2 IP directly (https://3.230.237.0)
- Always access via domain: https://aws.steveackley.org
- Cloudflare Origin Certificates only work behind Cloudflare's proxy

---

## 📝 Post-Deployment Verification

- [ ] Site loads at https://aws.steveackley.org
- [ ] CSS/Tailwind styles are applied correctly
- [ ] No redirect loops on /_next/static/ assets
- [ ] Browser DevTools Network tab shows 200 OK for all assets
- [ ] Caddy logs show no TLS errors

---

## 🎉 Success Criteria

✅ **Before:** `curl -I https://aws.steveackley.org` → 308 redirect loop  
✅ **After:** `curl -I https://aws.steveackley.org` → 200 OK

✅ **Before:** Styles don't load, white unstyled page  
✅ **After:** Fully styled Next.js site with Tailwind CSS

---

## 🔒 Security Notes

- Origin Certificate is trusted **only by Cloudflare**, not by browsers
- **Never** commit `origin.crt` or `origin.key` to git
- **Never** share the private key (`origin.key`)
- Certificate is valid for 15 years
- If you need to regenerate, repeat Step 1 and Step 2

---

## 📚 Additional Resources

- [Cloudflare Origin CA](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/)
- [Caddy TLS Documentation](https://caddyserver.com/docs/caddyfile/directives/tls)
- [Next.js Static Assets](https://nextjs.org/docs/app/building-your-application/optimizing/static-assets)

---

**Questions or Issues?** Check the Caddy logs first: `docker logs caddy --tail 100`
