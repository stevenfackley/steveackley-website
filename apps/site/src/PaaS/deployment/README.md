# Hybrid Platform Deployment Guide

## Architecture Overview

**Tier 1: Global Infrastructure (K8s Mesh)**
- Multi-tenant API backend (.NET 10 Native AOT)
- CockroachDB distributed SQL database (Active-Active replication)
- Cloudflare Zero Trust ingress with JWT authentication
- Fleet Management API for remote device control

**Tier 2: Smart Shell (Avalonia UI 11.x)**
- Native cross-platform app (Windows, macOS, Linux, iOS, Android)
- OTA payload injection for web UI updates
- SQLCipher encrypted local storage
- Biometric authentication via Secure Enclave/TEE

**Tier 3: P2P Mesh (CRDT Sync)**
- mDNS/Wi-Fi Direct/BLE local discovery
- TLS-secured socket communication
- UUIDv7 primary keys with LWW conflict resolution

**Tier 4: CI/CD Orchestration**
- GitHub Actions matrix build (Ubuntu + macOS runners)
- Dynamic tenant asset injection
- Azure Key Vault certificate management

---

## Prerequisites

### Required Tools
```bash
# Kubernetes CLI
kubectl version --client

# Helm 3.x
helm version

# Docker
docker --version

# .NET 10 SDK
dotnet --version  # Should be 10.0.x

# CockroachDB CLI (optional, for manual administration)
cockroach version
```

### Cloud Services
- **Azure Key Vault**: Store JWT signing keys, database passwords, and code signing certificates
- **Cloudflare Account**: Configure Zero Trust tunnels and access policies
- **Container Registry**: GitHub Container Registry (GHCR) or Azure Container Registry (ACR)

---

## Phase 1 Deployment: Multi-Tenant Backend

### Step 1: Configure Secrets

Create Azure Key Vault secrets:
```bash
# JWT signing secret (minimum 32 characters)
az keyvault secret set --vault-name hybrid-platform-kv \
  --name jwt-secret \
  --value "$(openssl rand -base64 32)"

# CockroachDB password
az keyvault secret set --vault-name hybrid-platform-kv \
  --name cockroach-password \
  --value "$(openssl rand -base64 32)"

# Cloudflare Tunnel secret
az keyvault secret set --vault-name hybrid-platform-kv \
  --name cloudflare-tunnel-secret \
  --value "<your-cloudflare-tunnel-secret>"
```

### Step 2: Build and Push API Container

```bash
# From repository root
cd src/PaaS

# Build Native AOT container
docker build \
  -f src/HybridPlatform.Api/Dockerfile \
  -t ghcr.io/your-org/hybrid-platform-api:latest \
  .

# Push to registry
docker push ghcr.io/your-org/hybrid-platform-api:latest
```

### Step 3: Deploy Helm Chart

```bash
# Add CockroachDB Helm repository
helm repo add cockroachdb https://charts.cockroachdb.com/
helm repo update

# Install chart (first-time deployment)
helm install hybrid-platform ./helm/hybrid-platform \
  --namespace hybrid-platform \
  --create-namespace \
  --set image.repository=ghcr.io/your-org/hybrid-platform-api \
  --set image.tag=latest \
  --set externalSecrets.keyVault.name=hybrid-platform-kv \
  --set externalSecrets.keyVault.tenantId=$AZURE_TENANT_ID

# Upgrade existing deployment
helm upgrade hybrid-platform ./helm/hybrid-platform \
  --namespace hybrid-platform \
  --reuse-values
```

### Step 4: Initialize CockroachDB

```bash
# Wait for CockroachDB pods to be ready
kubectl wait --for=condition=ready pod \
  -l app=cockroachdb \
  -n hybrid-platform \
  --timeout=300s

# Execute initialization script
kubectl exec -it cockroachdb-0 -n hybrid-platform -- \
  cockroach sql --insecure < deployment/cockroachdb/init.sql
```

### Step 5: Verify Deployment

```bash
# Check API pod status
kubectl get pods -n hybrid-platform -l app.kubernetes.io/name=hybrid-platform

# View logs
kubectl logs -n hybrid-platform -l app.kubernetes.io/name=hybrid-platform --tail=100

# Test health endpoint
kubectl port-forward -n hybrid-platform svc/hybrid-platform 8080:80
curl http://localhost:8080/health

# Expected response:
# {"status":"healthy","timestamp":"2026-03-01T09:30:00Z"}
```

### Step 6: Configure Cloudflare Tunnel

```bash
# Create tunnel via CLI
cloudflare-tunnel create hybrid-platform-api

# Configure routing
cloudflare-tunnel route dns hybrid-platform-api api.hybridplatform.example.com

# Apply K8s ingress (tunnel daemon runs as sidecar)
kubectl apply -f deployment/cloudflare-tunnel.yaml
```

---

## Multi-Tenant Operations

### Provision New Tenant

```sql
-- Execute via CockroachDB SQL client
INSERT INTO public.tenants (tenant_id, organization_name, schema_name, metadata)
VALUES ('acme-corp', 'Acme Corporation', 'tenant_acme-corp', '{"tier": "enterprise"}');

SELECT * FROM create_tenant_schema('acme-corp');
```

### Generate JWT for Tenant

```csharp
// Use JWT secret from Azure Key Vault
var claims = new[]
{
    new Claim("tid", "acme-corp"),         // Tenant ID
    new Claim("sub", "user@acme.com"),     // User ID
    new Claim("role", "admin"),            // Role
    new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
};

var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

var token = new JwtSecurityToken(
    issuer: "HybridPlatform.Api",
    audience: "HybridPlatform.Client",
    claims: claims,
    expires: DateTime.UtcNow.AddHours(1),
    signingCredentials: creds
);

var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
```

### Test Multi-Tenant API

```bash
# Acquire JWT (replace with actual token)
export JWT_TOKEN="eyJhbGc..."

# Call authenticated endpoint
curl -H "Authorization: Bearer $JWT_TOKEN" \
  https://api.hybridplatform.example.com/fleet/status/device-001
```

---

## Fleet Management

### Issue Remote Wipe

```bash
# Admin JWT required (role=admin claim)
curl -X POST \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  https://api.hybridplatform.example.com/fleet/wipe/device-001
```

### Device Polling (Client-Side)

```csharp
// Avalonia Shell implementation (Phase 2)
public async Task PollFleetCommandsAsync(CancellationToken cancellationToken)
{
    using var timer = new PeriodicTimer(TimeSpan.FromSeconds(30));
    
    while (await timer.WaitForNextTickAsync(cancellationToken))
    {
        var response = await _httpClient.GetFromJsonAsync<FleetStatusResponse>(
            $"/fleet/status/{_deviceId}",
            cancellationToken);
        
        if (response?.Command?.Action == "wipe")
        {
            await ExecuteWipeAsync();
            await _httpClient.PostAsync($"/fleet/ack/{_deviceId}", null, cancellationToken);
            Environment.Exit(0);
        }
    }
}
```

---

## Monitoring & Observability

### Prometheus Metrics

```bash
# Expose metrics endpoint
kubectl port-forward -n hybrid-platform svc/hybrid-platform 8080:80
curl http://localhost:8080/metrics
```

### CockroachDB Admin UI

```bash
# Forward DB admin console
kubectl port-forward -n hybrid-platform cockroachdb-0 8080:8080

# Open http://localhost:8080 in browser
```

### Structured Logging (JSON)

```bash
# Query logs via kubectl
kubectl logs -n hybrid-platform -l app.kubernetes.io/name=hybrid-platform \
  --since=1h | jq 'select(.Level == "Warning")'
```

---

## Troubleshooting

### Pod Won't Start

```bash
# Check events
kubectl describe pod -n hybrid-platform <pod-name>

# Common issues:
# - ImagePullBackOff: Verify container registry credentials
# - CrashLoopBackOff: Check logs for startup errors
# - Pending: Verify resource quotas and node capacity
```

### Database Connection Errors

```bash
# Test CockroachDB connectivity
kubectl exec -it cockroachdb-0 -n hybrid-platform -- \
  cockroach sql --insecure -e "SELECT version();"

# Check connection string in deployment
kubectl get deployment hybrid-platform -n hybrid-platform -o yaml | grep ConnectionStrings
```

### JWT Authentication Failures

```bash
# Verify JWT secret matches across services
kubectl get secret jwt-signing-key -n hybrid-platform -o jsonpath='{.data.jwt-secret}' | base64 -d

# Test JWT validation
curl -v -H "Authorization: Bearer $JWT_TOKEN" \
  https://api.hybridplatform.example.com/health
```

---

## Next Steps

✅ **Phase 1 Complete**: Multi-Tenant Backend & CRDT Foundation

**Phase 2**: Zero-Trust Avalonia Shell & OTA Updates
- Implement biometric key generation
- Build OTA payload injection service
- Add remote wipe listener

**Phase 3**: Edge Computing & P2P Mesh
- Implement mDNS discovery
- Build TLS socket negotiation
- Add ONNX Runtime integration

**Phase 4**: Dynamic CI/CD Orchestration
- Create GitHub Actions workflow
- Add tenant asset injection
- Configure matrix builds

---

## Support

For issues or questions, contact: platform-team@example.com
