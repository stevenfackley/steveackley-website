# CI/CD Setup Guide

## Overview

This guide explains how to configure the tenant-specific build pipeline using GitHub Actions, Azure Key Vault for secure certificate storage, and the dynamic asset injection scripts.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Azure Key Vault Setup](#azure-key-vault-setup)
- [GitHub Secrets Configuration](#github-secrets-configuration)
- [Tenant Onboarding Process](#tenant-onboarding-process)
- [Running the Workflow](#running-the-workflow)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before setting up the CI/CD pipeline, ensure you have:

1. **Azure Subscription** with permissions to create Key Vaults
2. **GitHub Repository** with Actions enabled
3. **Apple Developer Account** (for iOS builds)
4. **Google Play Console Account** (for Android builds)
5. **Microsoft Partner Center Account** (for Windows builds)
6. **Tenant certificates and signing credentials** ready

---

## Azure Key Vault Setup

### 1. Create Azure Key Vault

```bash
# Login to Azure
az login

# Create resource group
az group create --name hybrid-platform-rg --location eastus

# Create Key Vault
az keyvault create \
  --name hybrid-platform-vault \
  --resource-group hybrid-platform-rg \
  --location eastus \
  --enable-rbac-authorization false \
  --enabled-for-deployment true
```

### 2. Configure OIDC for GitHub Actions

```bash
# Create Azure AD App Registration for GitHub OIDC
az ad app create --display-name "HybridPlatform-GitHub-Actions"

# Get the Application (client) ID
APP_ID=$(az ad app list --display-name "HybridPlatform-GitHub-Actions" --query "[0].appId" -o tsv)

# Create service principal
az ad sp create --id $APP_ID

# Get the Service Principal Object ID
SP_OBJECT_ID=$(az ad sp list --display-name "HybridPlatform-GitHub-Actions" --query "[0].id" -o tsv)

# Assign Key Vault Secrets User role to service principal
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee $SP_OBJECT_ID \
  --scope /subscriptions/$(az account show --query id -o tsv)/resourceGroups/hybrid-platform-rg/providers/Microsoft.KeyVault/vaults/hybrid-platform-vault

# Configure federated credentials for GitHub
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "HybridPlatform-GitHub",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:YOUR_GITHUB_ORG/YOUR_REPO:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

### 3. Upload Tenant Certificates to Key Vault

#### iOS Certificates

```bash
# Convert iOS distribution certificate to base64
TENANT_ID="tenant-123"
IOS_CERT_BASE64=$(base64 -i ios-distribution-cert.p12)
IOS_PROFILE_BASE64=$(base64 -i ios-provisioning-profile.mobileprovision)

# Store in Key Vault
az keyvault secret set \
  --vault-name hybrid-platform-vault \
  --name "ios-dist-cert-$TENANT_ID" \
  --value "$IOS_CERT_BASE64"

az keyvault secret set \
  --vault-name hybrid-platform-vault \
  --name "ios-provisioning-profile-$TENANT_ID" \
  --value "$IOS_PROFILE_BASE64"

az keyvault secret set \
  --vault-name hybrid-platform-vault \
  --name "ios-cert-password-$TENANT_ID" \
  --value "YOUR_CERT_PASSWORD"
```

#### Android Keystore

```bash
# Generate Android keystore (if not already created)
keytool -genkey -v -keystore android-release.keystore \
  -alias tenant-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_KEYSTORE_PASSWORD

# Convert to base64
ANDROID_KEYSTORE_BASE64=$(base64 -i android-release.keystore)

# Store in Key Vault
az keyvault secret set \
  --vault-name hybrid-platform-vault \
  --name "android-keystore-$TENANT_ID" \
  --value "$ANDROID_KEYSTORE_BASE64"

az keyvault secret set \
  --vault-name hybrid-platform-vault \
  --name "android-keystore-password-$TENANT_ID" \
  --value "YOUR_KEYSTORE_PASSWORD"
```

#### Windows Code Signing Certificate

```bash
# Convert PFX to base64
WINDOWS_CERT_BASE64=$(base64 -i windows-signing-cert.pfx)

# Store in Key Vault
az keyvault secret set \
  --vault-name hybrid-platform-vault \
  --name "windows-cert-$TENANT_ID" \
  --value "$WINDOWS_CERT_BASE64"

az keyvault secret set \
  --vault-name hybrid-platform-vault \
  --name "windows-cert-password-$TENANT_ID" \
  --value "YOUR_CERT_PASSWORD"
```

---

## GitHub Secrets Configuration

### Required GitHub Secrets

Navigate to your GitHub repository → Settings → Secrets and variables → Actions, and add:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `AZURE_CLIENT_ID` | Azure AD App Client ID | `12345678-1234-1234-1234-123456789abc` |
| `AZURE_TENANT_ID` | Azure AD Tenant ID | `87654321-4321-4321-4321-cba987654321` |
| `AZURE_SUBSCRIPTION_ID` | Azure Subscription ID | `abcdef12-3456-7890-abcd-ef1234567890` |

### Get Azure IDs

```bash
# Get Client ID (Application ID)
az ad app list --display-name "HybridPlatform-GitHub-Actions" --query "[0].appId" -o tsv

# Get Tenant ID
az account show --query tenantId -o tsv

# Get Subscription ID
az account show --query id -o tsv
```

### Add Secrets via GitHub CLI

```bash
# Install GitHub CLI if needed
# https://cli.github.com/

# Login to GitHub
gh auth login

# Set secrets
gh secret set AZURE_CLIENT_ID --body "YOUR_CLIENT_ID"
gh secret set AZURE_TENANT_ID --body "YOUR_TENANT_ID"
gh secret set AZURE_SUBSCRIPTION_ID --body "YOUR_SUBSCRIPTION_ID"
```

---

## Tenant Onboarding Process

### Step 1: Generate Tenant Assets

For each new tenant, prepare:

1. **Tenant Logo** (PNG, recommended 1024x1024px)
2. **Primary Brand Color** (Hex format, e.g., `#FF5733`)
3. **Bundle ID** (e.g., `com.company.appname`)
4. **OTA Endpoint URL** (e.g., `https://api.company.com/ota`)

### Step 2: Create Signing Credentials

#### iOS

1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Create App ID with Bundle ID
3. Generate Distribution Certificate
4. Create Provisioning Profile
5. Export as `.p12` and `.mobileprovision`

#### Android

```bash
keytool -genkey -v -keystore tenant-123-release.keystore \
  -alias tenant-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

#### Windows

1. Obtain Code Signing Certificate from CA (DigiCert, GlobalSign, etc.)
2. Export as `.pfx` with private key

### Step 3: Upload to Azure Key Vault

Use the scripts from the [Azure Key Vault Setup](#azure-key-vault-setup) section to upload certificates.

### Step 4: Upload Tenant Logo

Upload the tenant logo to a publicly accessible URL or use a placeholder:

```bash
# Option 1: Upload to Azure Blob Storage
az storage blob upload \
  --account-name hybridplatformstorage \
  --container-name tenant-logos \
  --name tenant-123-logo.png \
  --file tenant-logo.png \
  --public-access blob

# Get URL
az storage blob url \
  --account-name hybridplatformstorage \
  --container-name tenant-logos \
  --name tenant-123-logo.png
```

---

## Running the Workflow

### Via GitHub UI

1. Go to repository → Actions tab
2. Select "Tenant-Specific Build & Deploy" workflow
3. Click "Run workflow"
4. Fill in the form:
   - **Tenant ID**: `tenant-123`
   - **Tenant Name**: `Acme Corporation`
   - **App Bundle ID**: `com.acme.mobile`
   - **Primary Color**: `#1E88E5`
   - **Logo URL**: `https://example.com/acme-logo.png`
   - **OTA Endpoint**: `https://api.acme.com/ota`
   - **Platform**: `all` (or specific platform)
5. Click "Run workflow"

### Via GitHub CLI

```bash
gh workflow run tenant-build.yml \
  -f tenant_id=tenant-123 \
  -f tenant_name="Acme Corporation" \
  -f app_bundle_id=com.acme.mobile \
  -f primary_color="#1E88E5" \
  -f logo_url="https://example.com/acme-logo.png" \
  -f ota_endpoint="https://api.acme.com/ota" \
  -f platform=all
```

### Via API

```bash
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/YOUR_ORG/YOUR_REPO/actions/workflows/tenant-build.yml/dispatches \
  -d '{
    "ref": "main",
    "inputs": {
      "tenant_id": "tenant-123",
      "tenant_name": "Acme Corporation",
      "app_bundle_id": "com.acme.mobile",
      "primary_color": "#1E88E5",
      "logo_url": "https://example.com/acme-logo.png",
      "ota_endpoint": "https://api.acme.com/ota",
      "platform": "all"
    }
  }'
```

---

## Workflow Outputs

### Artifacts

The workflow generates the following artifacts (accessible for 90 days):

- **android-apk-{tenant_id}**: Signed Android APK
- **android-ota-{tenant_id}**: OTA update package for Android
- **ios-ipa-{tenant_id}**: Signed iOS IPA
- **ios-ota-{tenant_id}**: OTA update package for iOS
- **windows-msix-{tenant_id}**: Signed Windows MSIX
- **windows-ota-{tenant_id}**: OTA update package for Windows
- **ota-manifest-{tenant_id}**: OTA manifest JSON (365 days retention)

### OTA Manifest Structure

```json
{
  "version": "42",
  "buildNumber": "148bd315",
  "tenantId": "tenant-123",
  "tenantName": "Acme Corporation",
  "bundleId": "com.acme.mobile",
  "releaseDate": "2026-03-01T10:53:00Z",
  "platforms": {
    "ios": {
      "payloadUrl": "https://cdn.example.com/ota/tenant-123/v42/ios.zip",
      "sha256Checksum": "abc123...",
      "minimumVersion": "11.0",
      "fileSize": 12345678
    },
    "android": {
      "payloadUrl": "https://cdn.example.com/ota/tenant-123/v42/android.zip",
      "sha256Checksum": "def456...",
      "minimumVersion": "8.0",
      "fileSize": 9876543
    },
    "windows": {
      "payloadUrl": "https://cdn.example.com/ota/tenant-123/v42/windows.zip",
      "sha256Checksum": "ghi789...",
      "minimumVersion": "10.0.19041.0",
      "fileSize": 15432109
    }
  },
  "releaseNotes": "Automated build from commit 148bd315",
  "requiredUpdate": false,
  "rollbackVersion": null
}
```

---

## Troubleshooting

### Common Issues

#### 1. Azure Authentication Fails

**Error**: `AADSTS700016: Application with identifier 'xxx' was not found`

**Solution**: Verify federated credentials are correctly configured:
```bash
az ad app federated-credential list --id $APP_ID
```

Ensure the `subject` matches: `repo:YOUR_ORG/YOUR_REPO:ref:refs/heads/main`

#### 2. Key Vault Secrets Not Found

**Error**: `Secret 'ios-dist-cert-tenant-123' not found`

**Solution**: 
- Verify secret exists: `az keyvault secret list --vault-name hybrid-platform-vault`
- Check secret naming convention matches tenant ID
- Ensure service principal has "Key Vault Secrets User" role

#### 3. iOS Build Fails - Certificate Import Error

**Error**: `security: SecKeychainItemImport: The authorization was denied`

**Solution**:
- Ensure certificate password is correct in Key Vault
- Verify `.p12` file is valid
- Check provisioning profile matches bundle ID

#### 4. Android Signing Fails

**Error**: `jarsigner: unable to sign jar`

**Solution**:
- Verify keystore password is correct
- Ensure keystore contains the `tenant-key` alias
- Check keystore file is not corrupted (re-encode base64)

#### 5. Logo Not Found

**Error**: `Warning: Logo file not found at assets/logos/tenant-logo.png`

**Solution**:
- Verify logo URL is publicly accessible
- Check network connectivity during workflow
- Ensure URL returns valid image file

#### 6. Workflow Permissions Denied

**Error**: `Resource not accessible by integration`

**Solution**:
- Go to Repository Settings → Actions → General
- Under "Workflow permissions", select "Read and write permissions"
- Enable "Allow GitHub Actions to create and approve pull requests"

### Debug Mode

Enable workflow debug logging:

```bash
# Set repository secrets
gh secret set ACTIONS_RUNNER_DEBUG --body "true"
gh secret set ACTIONS_STEP_DEBUG --body "true"
```

### Manual Script Testing

Test asset injection scripts locally:

```bash
# Android
./scripts/inject-android-manifest.sh \
  "com.test.app" \
  "Test App" \
  "https://api.test.com/ota" \
  "#FF5733" \
  "test-logo.png"

# iOS (macOS only)
./scripts/inject-ios-plist.sh \
  "com.test.app" \
  "Test App" \
  "https://api.test.com/ota" \
  "#FF5733" \
  "test-logo.png"

# Windows (PowerShell)
.\scripts\inject-windows-appx.ps1 `
  -BundleId "com.test.app" `
  -TenantName "Test App" `
  -OtaEndpoint "https://api.test.com/ota" `
  -PrimaryColor "#FF5733" `
  -LogoPath "test-logo.png"
```

---

## CDN Upload (Optional)

To automatically upload OTA packages to a CDN, uncomment and configure the CDN upload step in `.github/workflows/tenant-build.yml`.

### AWS S3 Example

```yaml
- name: Upload to S3
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    AWS_REGION: us-east-1
  run: |
    aws s3 cp ota-manifest.json \
      s3://hybrid-platform-cdn/ota/${{ inputs.tenant_id }}/v${{ needs.prepare.outputs.build_version }}/manifest.json \
      --acl public-read
    
    aws s3 cp artifacts/android-ota-${{ inputs.tenant_id }}/*.zip \
      s3://hybrid-platform-cdn/ota/${{ inputs.tenant_id }}/v${{ needs.prepare.outputs.build_version }}/android.zip \
      --acl public-read
```

### Azure Blob Storage Example

```yaml
- name: Upload to Azure Blob
  run: |
    az storage blob upload \
      --account-name hybridplatformcdn \
      --container-name ota \
      --name ${{ inputs.tenant_id }}/v${{ needs.prepare.outputs.build_version }}/manifest.json \
      --file ota-manifest.json \
      --auth-mode login
```

---

## Security Best Practices

1. **Rotate Certificates Annually**: Set calendar reminders to renew certificates before expiration
2. **Use Separate Key Vaults per Environment**: Maintain separate vaults for dev, staging, production
3. **Enable Key Vault Soft Delete**: Prevent accidental deletion of certificates
4. **Monitor Access Logs**: Enable Azure Monitor for Key Vault access auditing
5. **Limit Workflow Permissions**: Use minimal permissions for GitHub Actions
6. **Validate Logo URLs**: Ensure logo URLs use HTTPS and trusted domains
7. **Review Build Artifacts**: Inspect artifacts before distribution

---

## Next Steps

After successful builds:

1. Download artifacts from GitHub Actions
2. Test applications on physical devices
3. Upload to app stores (App Store Connect, Google Play, Microsoft Store)
4. Update OTA manifest URLs to point to CDN
5. Configure canary deployment for gradual rollout (Phase 5)

---

## Support

For issues or questions:
- Open a GitHub Issue
- Check workflow run logs for detailed error messages
- Review Azure Key Vault access logs
- Consult platform-specific documentation (Apple, Google, Microsoft)
