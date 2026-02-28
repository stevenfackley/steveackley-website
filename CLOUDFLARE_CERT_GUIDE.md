# 🔐 Cloudflare Origin Certificate - Detailed Instructions

## What is a Cloudflare Origin Certificate?

A **Cloudflare Origin Certificate** is a free SSL/TLS certificate that:
- Is issued by Cloudflare's Certificate Authority (CA)
- Is **only trusted by Cloudflare** (not by web browsers)
- Allows Cloudflare to make secure HTTPS connections to your origin server
- Is required when using **Full (strict)** SSL/TLS mode
- Valid for up to 15 years

---

## 📋 Step-by-Step: Generate Cloudflare Origin Certificate

### Step 1: Log in to Cloudflare Dashboard

1. Go to: **https://dash.cloudflare.com/**
2. Log in with your Cloudflare account
3. You'll see a list of your domains

---

### Step 2: Select Your Domain

1. Click on: **steveackley.org** (your domain)
2. This will take you to the domain overview page

---

### Step 3: Navigate to SSL/TLS Settings

1. In the left sidebar, click: **SSL/TLS**
2. You'll see the SSL/TLS overview page
3. Look for the tabs at the top: Overview, Edge Certificates, **Origin Server**, Custom Hostnames
4. Click the **"Origin Server"** tab

---

### Step 4: Create Origin Certificate

1. On the Origin Server page, you'll see a section titled **"Origin Certificates"**
2. Click the blue button: **"Create Certificate"**
3. A modal/popup will appear titled **"Create origin certificate"**

---

### Step 5: Configure Certificate Settings

You'll see several options in the modal:

#### **Option 1: Private key type**
- Options: RSA (2048), RSA (3072), RSA (4096), ECDSA
- **Select**: `RSA (2048)` ← This is the default and recommended

#### **Option 2: Certificate Signing Request (CSR)**
- Options: "Let Cloudflare generate a private key and a CSR" or "Use my private key and CSR"
- **Select**: `Let Cloudflare generate a private key and a CSR` ← The default option

#### **Option 3: Hostnames**
You'll see a text area where you can add hostnames. It might be pre-filled with:
```
steveackley.org
*.steveackley.org
```

**What to enter:**
```
aws.steveackley.org
*.steveackley.org
```

**Explanation:**
- `aws.steveackley.org` - Your specific subdomain
- `*.steveackley.org` - Wildcard for any future subdomains (optional but recommended)

You can also add these individually if needed:
- Type: `aws.steveackley.org`
- Press Enter or click the "+" button
- Type: `*.steveackley.org`
- Press Enter or click the "+" button

#### **Option 4: Certificate Validity**
- Options: 7 days, 30 days, 90 days, 1 year, 2 years, 3 years, 5 years, 10 years, **15 years**
- **Select**: `15 years` ← Maximum validity, recommended

---

### Step 6: Create Certificate

1. Review your selections:
   - Private key type: RSA (2048)
   - Hostnames: `aws.steveackley.org`, `*.steveackley.org`
   - Validity: 15 years

2. Click the blue button at the bottom: **"Create"**

3. Wait a few seconds while Cloudflare generates the certificate

---

### Step 7: Save Certificate and Private Key

After clicking Create, you'll see a page with two text boxes:

#### **Box 1: Origin Certificate**
```
-----BEGIN CERTIFICATE-----
MIIEpTCCAo2gAwIBAgIUbVZxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
... (many more lines) ...
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
-----END CERTIFICATE-----
```

**What to do:**
1. Click the **"Copy"** button (or manually select all text and copy)
2. Keep this copied or paste it into a temporary text file
3. **Label it**: "Origin Certificate" or "origin.crt"

#### **Box 2: Private Key**
```
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
... (many more lines) ...
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
-----END PRIVATE KEY-----
```

**What to do:**
1. Click the **"Copy"** button (or manually select all text and copy)
2. Paste it into a separate temporary text file
3. **Label it**: "Private Key" or "origin.key"

---

### ⚠️ IMPORTANT WARNINGS

**This is your ONLY chance to see the private key!**

- Cloudflare will **NEVER** show you the private key again
- If you lose it, you must generate a new certificate
- The private key is **extremely sensitive** - treat it like a password
- Store it securely until you've saved it on your EC2 server
- **DO NOT** share it with anyone
- **DO NOT** commit it to git
- **DO NOT** paste it in public places (Slack, Discord, forums, etc.)

---

### Step 8: Confirm Certificate Created

After clicking "OK" or closing the modal, you should see your new certificate listed in the "Origin Certificates" section:

```
┌─────────────────────────────────────────────────────────────────┐
│ Origin Certificates                                              │
├─────────────────────────────────────────────────────────────────┤
│ Certificate ID: xxxxxxxxxxxxxxxxxxxxxxxxxxx                      │
│ Hostnames: aws.steveackley.org, *.steveackley.org              │
│ Type: Origin Certificate                                         │
│ Status: Active                                                   │
│ Expires: [Date 15 years from now]                              │
│ [View] [Revoke]                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💾 What to Do with the Certificate Files

### Option A: Save to a Temporary File (Recommended)

**On your local Windows machine:**

1. Open Notepad (not Word or fancy editors)
2. Create a new file
3. Paste the **Origin Certificate**
4. Save as: `origin.crt` (in a temporary location like Desktop)
5. Create another new file in Notepad
6. Paste the **Private Key**
7. Save as: `origin.key` (same location)

**Then** follow the deployment guide to SSH to EC2 and create the files there.

### Option B: Save Directly on EC2 (Advanced)

If you're comfortable with SSH and terminal editors:
1. SSH to EC2
2. Use `nano` or `vi` to create the files directly
3. Paste the certificate contents
4. Save with proper permissions

---

## 🔍 Verify Your Certificate

Once the certificate is created in Cloudflare, you can verify:

**In Cloudflare Dashboard:**
- Go back to: SSL/TLS → Origin Server
- Your certificate should be listed under "Origin Certificates"
- Status should show: **Active**
- Expiration date should be ~15 years in the future

---

## 🎯 Next Steps

After you have saved both files (origin.crt and origin.key):

1. **Go to QUICK_DEPLOY.md** - Follow Step 2 to SSH and create the cert files on EC2
2. **Or go to DEPLOYMENT_GUIDE.md** - For detailed step-by-step instructions

---

## ❓ FAQ

**Q: Can I use the same certificate for multiple subdomains?**  
A: Yes! If you included `*.steveackley.org` in the hostnames, it covers all subdomains.

**Q: What if I lost the private key?**  
A: You must generate a new certificate. Go to SSL/TLS → Origin Server → Create Certificate again.

**Q: Do I need to renew this certificate?**  
A: Not for 15 years! Mark your calendar for 2041 😄

**Q: Can browsers trust this certificate?**  
A: No! This certificate is only trusted by Cloudflare. Browsers will see Cloudflare's certificate, not yours.

**Q: What if I see "SSL handshake failed" in Caddy logs?**  
A: Check that:
- Certificate files exist at `/etc/caddy/certs/origin.crt` and `origin.key`
- File permissions are correct (600 for .key, 644 for .crt)
- Files contain the complete certificate/key (including BEGIN/END lines)

---

## 📸 Visual Guide Summary

```
1. Cloudflare Dashboard
   └─→ Select domain: steveackley.org
       └─→ SSL/TLS (left sidebar)
           └─→ Origin Server (tab)
               └─→ Create Certificate (button)
                   ├─→ Private key type: RSA (2048)
                   ├─→ Hostnames: aws.steveackley.org, *.steveackley.org
                   ├─→ Validity: 15 years
                   └─→ Create (button)
                       ├─→ Copy "Origin Certificate" → save as origin.crt
                       └─→ Copy "Private Key" → save as origin.key
```

---

**Ready to proceed?** Once you have both files saved, continue with **QUICK_DEPLOY.md Step 2** 🚀
