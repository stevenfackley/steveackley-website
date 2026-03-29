# 🔄 Automated Cloudflare Cache Clearing

## Overview

Your GitHub Actions workflow now automatically purges the Cloudflare cache after each deployment. This ensures users always see the latest version of your site with the correct static assets and styles.

---

## Required GitHub Secrets

You need to add two secrets to your GitHub repository:

### 1. CLOUDFLARE_ZONE_ID

**What it is:** The unique identifier for your domain in Cloudflare.

**How to get it:**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click on your domain: **steveackley.org**
3. Scroll down on the Overview page
4. Find **Zone ID** in the right sidebar (under API section)
5. Copy the ID (looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

### 2. CLOUDFLARE_API_TOKEN

**What it is:** An authentication token with permission to purge cache.

**How to create it:**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click on your profile icon (top right) → **My Profile**
3. Go to **API Tokens** tab
4. Click **Create Token**
5. Use the **"Edit zone DNS"** template OR create a custom token with these permissions:
   - **Zone** → **Cache Purge** → **Purge**
   - **Zone** → **Zone** → **Read** (needed to verify zone exists)
6. Under **Zone Resources**:
   - Include → Specific zone → **steveackley.org**
7. Click **Continue to summary** → **Create Token**
8. **IMPORTANT:** Copy the token immediately - you won't see it again!
   - It looks like: `abc123XYZ456def789GHI012jkl345MNO678pqr`

---

## Adding Secrets to GitHub

1. Go to your GitHub repository: [https://github.com/stevenfackley/steveackleyorg](https://github.com/stevenfackley/steveackleyorg)
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

**Add these two secrets:**

| Name | Value |
|------|-------|
| `CLOUDFLARE_ZONE_ID` | Your Zone ID from Cloudflare |
| `CLOUDFLARE_API_TOKEN` | Your API Token from Cloudflare |

---

## How It Works

```yaml
# After deploying to EC2, the workflow automatically:
- name: Purge Cloudflare Cache
  run: |
    curl -X POST "https://api.cloudflare.com/client/v4/zones/${{ secrets.CLOUDFLARE_ZONE_ID }}/purge_cache" \
      -H "Authorization: Bearer ${{ secrets.CLOUDFLARE_API_TOKEN }}" \
      -H "Content-Type: application/json" \
      --data '{"purge_everything":true}' \
      --fail-with-body
    echo "✓ Cloudflare cache purged"
```

This runs automatically on every push to `main` branch, after the Docker container is deployed.

---

## What This Fixes

**Before:**
- Push code → Deploy → Users see cached old version
- Styles don't load because HTML references old build IDs
- Need to manually purge cache in Cloudflare dashboard
- Need to hard-refresh browser

**After:**
- Push code → Deploy → Auto-purge cache → Users see new version immediately
- No manual intervention needed
- No cache issues

---

## Verification

After setting up the secrets, push a change to verify:

1. Make a small change (e.g., update text in `README.md`)
2. Commit and push to `main`
3. Watch the GitHub Actions workflow run
4. Check the "Purge Cloudflare Cache" step - should show: `✓ Cloudflare cache purged`
5. Visit your site - changes should be visible immediately (no hard refresh needed)

---

## Troubleshooting

### Error: "Invalid request"
- Check that `CLOUDFLARE_ZONE_ID` is correct
- Verify the Zone ID matches your domain

### Error: "Authentication error" or "Invalid API Token"
- Regenerate the API token in Cloudflare
- Make sure the token has **Cache Purge** permission
- Update the `CLOUDFLARE_API_TOKEN` secret in GitHub

### Cache still not clearing
- Check the GitHub Actions log for the "Purge Cloudflare Cache" step
- Verify the step completed successfully (green checkmark)
- If it failed, check the error message

---

## Security Notes

- API tokens are scoped to only your domain
- Tokens can only purge cache, not modify DNS or other settings
- Tokens can be revoked anytime in Cloudflare dashboard
- Never commit tokens to your repository - always use GitHub Secrets

---

## Optional: Test the API Token Locally

To verify your token works before adding to GitHub:

```bash
# Replace with your actual values
ZONE_ID="your-zone-id-here"
API_TOKEN="your-api-token-here"

curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

Expected response:
```json
{
  "success": true,
  "errors": [],
  "messages": [],
  "result": {
    "id": "..."
  }
}
```

---

**All set!** Your deployments will now automatically clear the Cloudflare cache. 🎉
