# Enterprise Multi-Tenant PaaS - Phase 4 & 5 Continuation Prompt

## Context Summary

You are continuing work as a Principal .NET 10 Architect on an Enterprise Multi-Tenant Platform-as-a-Service (PaaS). The system features Kubernetes orchestration, Zero-Trust Edge Security, Avalonia UI 11.x with Native AOT, and distributed CRDT synchronization.

### Completed Work (Phases 1-3)

**PHASE 1: Multi-Tenant Backend & CRDT Foundation** ✅
- Created complete Kubernetes Helm chart structure with CockroachDB 14.0.0 dependency
- Implemented EF Core 10 DbContext with JWT-based tenant schema routing (`SET LOCAL search_path TO tenant_{tid}`)
- Built base CRDT Entity classes with UUIDv7 primary keys and LWW logical clock conflict resolution
- Implemented Fleet Management API with poison pill pattern for remote device wipe
- Created multi-tenant database initialization scripts with zone configuration for Active-Active replication
- **Files**: 22 files including API project, Helm charts, database migrations, middleware, controllers, and services

**PHASE 2: Zero-Trust Avalonia Shell & OTA Updates** ✅
- Implemented cross-platform biometric key generation (Windows Hello, Touch ID, Face ID, BiometricPrompt, TPM 2.0)
- Configured SQLCipher with PBKDF2-HMAC-SHA512 (256K iterations) and DOD 5220.22-M 3-pass secure wipe
- Built OTA update service with 4-hour polling, SHA-256 verification, atomic extraction, and version rollback
- Implemented Fleet Command Poller (30-second intervals) with remote wipe executor (7-step procedure)
- **Files**: 7 files including security providers, OTA services, fleet management, and updated Shell project

**PHASE 3: Edge Computing & P2P Mesh** ✅
- Implemented mDNS discovery service broadcasting on 224.0.0.251:5353 (_hybridplatform._tcp.local)
- Built TLS 1.3 mutual authentication socket service with certificate pinning and length-prefixed protocol
- Created P2P sync engine with bidirectional delta synchronization (batch size 1000)
- Integrated ONNX Runtime with hardware acceleration (DirectML, CoreML, NNAPI)
- Implemented predictive caching engine with 50 behavioral features and 15-minute prediction cycles
- **Files**: 8 files including P2P discovery, TLS sockets, certificate management, sync engine, and ML services

**Repository Status**: All 64 files committed and pushed to GitHub (commit 148bd31, 8,745 insertions)

---

## PHASE 4: Dynamic CI/CD Orchestration

### Objective
Create a GitHub Actions workflow that dynamically builds tenant-specific mobile applications with customized branding, certificates, and OTA endpoint configurations based on workflow dispatch inputs.

### Implementation Requirements

#### 4.1 GitHub Actions Workflow (`workflow_dispatch` with TenantID)

Create `.github/workflows/tenant-build.yml` with the following capabilities:

**Workflow Triggers:**
- `workflow_dispatch` event with inputs:
  - `tenant_id` (required): Tenant identifier for schema routing
  - `tenant_name` (required): Display name for branding
  - `app_bundle_id` (required): iOS bundle ID / Android package name
  - `primary_color` (required): Hex color for theme
  - `logo_url` (required): URL to tenant logo asset
  - `ota_endpoint` (required): Custom OTA API endpoint
  - `platform` (required, choice): ['ios', 'android', 'windows', 'all']

**Job Structure:**
- Matrix build strategy for multiple platforms
- Conditional execution based on platform selection
- Parallel builds where possible (iOS/Android/Windows)
- Upload artifacts to GitHub Actions with retention policy

#### 4.2 Dynamic Asset Injection (AndroidManifest.xml & Info.plist)

**Android Manifest Rewriting (Bash/PowerShell):**
```bash
# Steps to implement:
1. Clone template AndroidManifest.xml from src/HybridPlatform.Shell/Platforms/Android/
2. Use sed/awk or PowerShell to replace:
   - Package name: ${APP_BUNDLE_ID}
   - Application label: ${TENANT_NAME}
   - Metadata entry for OTA endpoint: ${OTA_ENDPOINT}
   - Theme color resource reference: ${PRIMARY_COLOR}
3. Download logo from ${LOGO_URL} and place in res/drawable/
4. Update icon reference in manifest
5. Validate XML structure before build
```

**iOS Info.plist Rewriting (Bash/PowerShell):**
```bash
# Steps to implement:
1. Clone template Info.plist from src/HybridPlatform.Shell/Platforms/iOS/
2. Use plutil or PowerShell XML manipulation to set:
   - CFBundleIdentifier: ${APP_BUNDLE_ID}
   - CFBundleDisplayName: ${TENANT_NAME}
   - Custom OTA endpoint key: ${OTA_ENDPOINT}
   - UIUserInterfaceStyle accent color: ${PRIMARY_COLOR}
3. Download logo from ${LOGO_URL} and generate AppIcon.appiconset
4. Run iconutil to create asset catalog
5. Validate plist with plutil -lint
```

**Windows MSIX Rewriting:**
```powershell
# Steps to implement:
1. Clone template Package.appxmanifest
2. Update XML nodes:
   - Identity.Name: ${APP_BUNDLE_ID}
   - Properties.DisplayName: ${TENANT_NAME}
   - Application.VisualElements colors: ${PRIMARY_COLOR}
   - Logo paths to downloaded ${LOGO_URL}
3. Create MSIX package with MakeAppx
```

#### 4.3 Secure Certificate & Signing Credential Injection

**Azure Key Vault Integration:**
- Use `azure/login@v1` action with OIDC authentication
- Fetch certificates from Azure Key Vault:
  - iOS: Distribution certificate + provisioning profile
  - Android: Keystore file + keystore password
  - Windows: Code signing certificate (.pfx)

**GitHub Actions Steps:**
```yaml
- name: Fetch iOS Certificates
  uses: azure/get-keyvault-secrets@v1
  with:
    keyvault: "hybrid-platform-vault"
    secrets: |
      ios-dist-cert-${{ inputs.tenant_id }}
      ios-provisioning-profile-${{ inputs.tenant_id }}

- name: Install iOS Certificate
  run: |
    echo "${{ steps.fetch-certs.outputs.ios-dist-cert }}" | base64 -d > cert.p12
    security import cert.p12 -P "" -T /usr/bin/codesign
    security set-key-partition-list -S apple-tool:,apple: -s -k "" login.keychain

- name: Fetch Android Keystore
  uses: azure/get-keyvault-secrets@v1
  with:
    keyvault: "hybrid-platform-vault"
    secrets: |
      android-keystore-${{ inputs.tenant_id }}
      android-keystore-password-${{ inputs.tenant_id }}

- name: Sign Android APK
  run: |
    echo "${{ steps.fetch-keystore.outputs.android-keystore }}" | base64 -d > release.keystore
    jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
      -keystore release.keystore \
      -storepass "${{ steps.fetch-keystore.outputs.android-keystore-password }}" \
      app-release-unsigned.apk tenant-key
```

#### 4.4 Build & Publish Steps

**iOS Build (macOS runner):**
```yaml
- uses: actions/setup-dotnet@v3
  with:
    dotnet-version: '10.0.x'
- run: dotnet workload install ios
- run: dotnet publish -f net10.0-ios -c Release /p:ArchiveOnBuild=true
- run: xcrun altool --upload-app --file *.ipa --apiKey ${{ secrets.APP_STORE_CONNECT_KEY }}
```

**Android Build:**
```yaml
- uses: actions/setup-dotnet@v3
  with:
    dotnet-version: '10.0.x'
- run: dotnet workload install android
- run: dotnet publish -f net10.0-android -c Release
- run: zipalign -v 4 app-release.apk app-release-aligned.apk
```

**Windows Build:**
```yaml
- run: dotnet publish -f net10.0-windows10.0.19041.0 -c Release /p:PackageCertificateKeyFile=cert.pfx
- run: MakeAppx pack /d publish /p HybridPlatform.msix
```

#### 4.5 OTA Manifest Generation

After successful builds, generate OTA manifest JSON:

```json
{
  "version": "${GITHUB_RUN_NUMBER}",
  "buildNumber": "${GITHUB_SHA:0:8}",
  "tenantId": "${TENANT_ID}",
  "platforms": {
    "ios": {
      "payloadUrl": "https://cdn.example.com/ota/${TENANT_ID}/v${VERSION}/ios.zip",
      "sha256Checksum": "${IOS_SHA256}",
      "signature": "${IOS_SIGNATURE}",
      "minimumVersion": "11.0"
    },
    "android": {
      "payloadUrl": "https://cdn.example.com/ota/${TENANT_ID}/v${VERSION}/android.zip",
      "sha256Checksum": "${ANDROID_SHA256}",
      "signature": "${ANDROID_SIGNATURE}",
      "minimumVersion": "8.0"
    }
  },
  "releaseNotes": "Automated build from commit ${GITHUB_SHA}"
}
```

Upload manifest to S3/Azure Blob Storage with tenant-specific prefix.

---

## PHASE 5: Autonomous Operations & Extensibility

### Objective
Implement autonomous deployment controls, tenant extensibility via WASM sandboxing, and privacy-preserving telemetry aggregation.

### Implementation Requirements

#### 5.1 AIOps Canary Controller (Tier 1 Routing with Autonomous Rollback)

**Purpose**: Gradually roll out OTA updates to a subset of devices, monitor error rates, and automatically rollback if thresholds are breached.

**Implementation Details:**

**Kubernetes Custom Resource Definition (CRD):**
```yaml
apiVersion: hybridplatform.io/v1
kind: CanaryDeployment
metadata:
  name: ota-release-v1-2-0
spec:
  tenantId: "tenant-123"
  version: "1.2.0"
  payloadUrl: "https://cdn.example.com/ota/tenant-123/v1.2.0/android.zip"
  stages:
    - name: "tier1"
      percentage: 5
      durationMinutes: 60
      errorThreshold: 0.02  # 2% error rate triggers rollback
    - name: "tier2"
      percentage: 25
      durationMinutes: 120
      errorThreshold: 0.01
    - name: "tier3"
      percentage: 100
      durationMinutes: 0
      errorThreshold: 0.005
  rollbackVersion: "1.1.0"
```

**Canary Controller Service (`src/HybridPlatform.Api/AIOps/CanaryController.cs`):**
- Monitor `/fleet/telemetry` endpoint for crash reports and error rates
- Maintain in-memory state of current canary stage per tenant
- Calculate error rate = (error_count / total_requests) over last 15 minutes
- If `error_rate > stage.errorThreshold`:
  1. Log incident to audit_log table
  2. Update CanaryDeployment status to "ROLLED_BACK"
  3. Send rollback command to all tier1 devices
  4. Switch OTA manifest URL back to `rollbackVersion`
- If stage completes successfully, advance to next tier
- Expose Prometheus metrics: `canary_stage_duration`, `canary_error_rate`, `canary_rollback_count`

**UUID Selection Algorithm:**
```csharp
// Deterministic device selection for tier1 (5%)
public bool IsDeviceInTier1(Guid deviceUuid, string tenantId, string version)
{
    var hash = SHA256.HashData(Encoding.UTF8.GetBytes($"{deviceUuid}:{tenantId}:{version}"));
    var hashValue = BitConverter.ToUInt32(hash, 0);
    var percentage = (hashValue / (double)uint.MaxValue) * 100;
    return percentage < 5.0; // Tier 1 = first 5%
}
```

**API Endpoint Modification (`/ota/manifest/{deviceId}`):**
```csharp
[HttpGet("manifest/{deviceId}")]
public async Task<IActionResult> GetOtaManifest(Guid deviceId)
{
    var tenantId = User.FindFirst("tid").Value;
    var canary = await _canaryService.GetActiveCanaryAsync(tenantId);
    
    if (canary != null && _canaryService.IsDeviceInCurrentTier(deviceId, canary))
    {
        return Ok(canary.CanaryManifest); // Return canary version
    }
    
    return Ok(_manifestService.GetStableManifest(tenantId)); // Return stable version
}
```

#### 5.2 WASM Plugin Sandbox (Tenant Extensibility)

**Purpose**: Allow tenants to upload WebAssembly modules that execute in a sandboxed environment with restricted access to the Avalonia shell's JS-to-C# bridge.

**Architecture:**
- Integrate Wasmtime .NET runtime into Avalonia shell
- Create WASI-compatible host functions for restricted bridge access
- Implement resource limits (CPU time, memory, syscalls)
- Store plugins in SQLCipher database with signature verification

**Plugin Host Service (`src/HybridPlatform.Shell/Plugins/WasmPluginHost.cs`):**

```csharp
using Wasmtime;

public class WasmPluginHost
{
    private readonly Engine _engine;
    private readonly Linker _linker;
    private readonly Dictionary<string, Store> _sandboxes = new();
    
    public async Task<string> LoadPluginAsync(byte[] wasmBytes, string pluginId)
    {
        // Verify signature with tenant's public key
        if (!await _cryptoService.VerifyPluginSignatureAsync(wasmBytes, pluginId))
            throw new SecurityException("Invalid plugin signature");
        
        var module = Module.FromBytes(_engine, wasmBytes);
        var store = new Store(_engine);
        
        // Set resource limits
        store.SetLimits(new StoreLimitsBuilder()
            .MemorySize(10_000_000) // 10MB max memory
            .TableElements(1000)
            .Instances(10)
            .Build());
        
        // Bind restricted host functions
        _linker.Define("bridge", "invoke", 
            Function.FromCallback(store, (Caller caller, int action, int dataPtr, int dataLen) => 
            {
                var memory = caller.GetMemory("memory");
                var data = memory.ReadBytes(dataPtr, dataLen);
                return InvokeRestrictedBridge(action, data);
            }));
        
        var instance = _linker.Instantiate(store, module);
        _sandboxes[pluginId] = store;
        
        return pluginId;
    }
    
    private int InvokeRestrictedBridge(int action, byte[] data)
    {
        // Whitelist of allowed bridge actions
        var allowedActions = new HashSet<int> { 
            BridgeAction.GetLocalData,      // Read-only local data access
            BridgeAction.DisplayNotification, // Show UI notification
            BridgeAction.LogEvent           // Write to local log
        };
        
        if (!allowedActions.Contains(action))
        {
            _logger.LogWarning("Plugin attempted restricted action: {Action}", action);
            return -1; // Deny
        }
        
        return _jsBridge.InvokeAction(action, data);
    }
}
```

**Plugin API Endpoint (`src/HybridPlatform.Api/Controllers/PluginsController.cs`):**
```csharp
[HttpPost("upload")]
[Authorize]
[RequestSizeLimit(5_000_000)] // 5MB max
public async Task<IActionResult> UploadPlugin(IFormFile wasmFile)
{
    var tenantId = User.FindFirst("tid").Value;
    var pluginId = Guid.NewGuid().ToString();
    
    // Store in blob storage with tenant prefix
    await _blobStorage.UploadAsync($"plugins/{tenantId}/{pluginId}.wasm", wasmFile.OpenReadStream());
    
    // Create plugin metadata record
    await _dbContext.Plugins.AddAsync(new Plugin
    {
        Id = pluginId,
        TenantId = tenantId,
        UploadedAt = DateTime.UtcNow,
        Sha256 = await ComputeSha256Async(wasmFile.OpenReadStream()),
        Status = PluginStatus.PendingReview
    });
    
    await _dbContext.SaveChangesAsync();
    
    return Ok(new { pluginId });
}
```

**Plugin Execution in Shell:**
```csharp
// Initialize plugin on shell startup
public async Task InitializePluginsAsync()
{
    var plugins = await _api.GetApprovedPluginsAsync(_tenantId);
    
    foreach (var plugin in plugins)
    {
        try
        {
            var wasmBytes = await _api.DownloadPluginAsync(plugin.Id);
            await _pluginHost.LoadPluginAsync(wasmBytes, plugin.Id);
            
            // Call plugin's init() export
            await _pluginHost.CallExportAsync(plugin.Id, "init");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load plugin {PluginId}", plugin.Id);
        }
    }
}
```

#### 5.3 Edge Telemetry with Differential Privacy

**Purpose**: Collect usage metrics locally, apply differential privacy noise, and transmit aggregated data to backend without exposing individual user behavior.

**Local Telemetry Collector (`src/HybridPlatform.Shell/Telemetry/TelemetryCollector.cs`):**

```csharp
public class TelemetryCollector
{
    private readonly ConcurrentBag<TelemetryEvent> _eventBuffer = new();
    private readonly Timer _flushTimer;
    
    public TelemetryCollector()
    {
        // Flush every 15 minutes
        _flushTimer = new Timer(FlushEvents, null, TimeSpan.FromMinutes(15), TimeSpan.FromMinutes(15));
    }
    
    public void RecordEvent(string eventType, Dictionary<string, object> properties)
    {
        _eventBuffer.Add(new TelemetryEvent
        {
            Type = eventType,
            Timestamp = DateTime.UtcNow,
            Properties = properties,
            DeviceId = _deviceInfo.Id
        });
    }
    
    private async void FlushEvents(object state)
    {
        if (_eventBuffer.IsEmpty) return;
        
        var events = _eventBuffer.ToArray();
        _eventBuffer.Clear();
        
        // Aggregate locally before applying noise
        var aggregates = AggregateEvents(events);
        
        // Apply Laplace noise (ε-differential privacy)
        var noisyAggregates = ApplyDifferentialPrivacy(aggregates, epsilon: 0.1);
        
        // Transmit to backend
        await _apiClient.PostTelemetryAsync(noisyAggregates);
    }
    
    private Dictionary<string, double> AggregateEvents(TelemetryEvent[] events)
    {
        return new Dictionary<string, double>
        {
            ["total_sessions"] = events.Count(e => e.Type == "session_start"),
            ["avg_session_duration_sec"] = events
                .Where(e => e.Type == "session_end")
                .Average(e => (double)e.Properties["duration_sec"]),
            ["sync_count"] = events.Count(e => e.Type == "sync_completed"),
            ["crash_count"] = events.Count(e => e.Type == "crash"),
            ["p2p_connections"] = events
                .Where(e => e.Type == "p2p_connected")
                .Select(e => e.Properties["peer_id"])
                .Distinct()
                .Count()
        };
    }
    
    private Dictionary<string, double> ApplyDifferentialPrivacy(
        Dictionary<string, double> aggregates, 
        double epsilon)
    {
        var noisy = new Dictionary<string, double>();
        var random = new Random();
        
        foreach (var (key, value) in aggregates)
        {
            // Laplace mechanism: sensitivity = 1, scale = 1/epsilon
            var scale = 1.0 / epsilon;
            var u = random.NextDouble() - 0.5;
            var noise = -scale * Math.Sign(u) * Math.Log(1 - 2 * Math.Abs(u));
            
            noisy[key] = Math.Max(0, value + noise); // Clamp to non-negative
        }
        
        return noisy;
    }
}
```

**Backend Telemetry Aggregation (`src/HybridPlatform.Api/Controllers/TelemetryController.cs`):**

```csharp
[HttpPost("submit")]
[Authorize]
public async Task<IActionResult> SubmitTelemetry([FromBody] Dictionary<string, double> metrics)
{
    var tenantId = User.FindFirst("tid").Value;
    var deviceId = Guid.Parse(User.FindFirst("device_id").Value);
    
    // Store in time-series database (TimescaleDB extension in PostgreSQL)
    await _dbContext.TelemetryMetrics.AddAsync(new TelemetryMetric
    {
        TenantId = tenantId,
        DeviceId = deviceId,
        Timestamp = DateTime.UtcNow,
        TotalSessions = metrics.GetValueOrDefault("total_sessions"),
        AvgSessionDurationSec = metrics.GetValueOrDefault("avg_session_duration_sec"),
        SyncCount = metrics.GetValueOrDefault("sync_count"),
        CrashCount = metrics.GetValueOrDefault("crash_count"),
        P2pConnections = metrics.GetValueOrDefault("p2p_connections")
    });
    
    await _dbContext.SaveChangesAsync();
    
    // Trigger alert if crash rate exceeds threshold
    if (metrics.GetValueOrDefault("crash_count") > 5)
    {
        await _alertService.SendHighCrashRateAlertAsync(tenantId, deviceId);
    }
    
    return Ok();
}

[HttpGet("dashboard/{tenantId}")]
[Authorize(Roles = "TenantAdmin")]
public async Task<IActionResult> GetTelemetryDashboard(string tenantId)
{
    // Aggregate across all devices for the tenant
    var last24Hours = DateTime.UtcNow.AddHours(-24);
    
    var dashboard = await _dbContext.TelemetryMetrics
        .Where(m => m.TenantId == tenantId && m.Timestamp >= last24Hours)
        .GroupBy(m => 1)
        .Select(g => new
        {
            TotalDevices = g.Select(m => m.DeviceId).Distinct().Count(),
            TotalSessions = g.Sum(m => m.TotalSessions),
            AvgSessionDuration = g.Average(m => m.AvgSessionDurationSec),
            TotalSyncs = g.Sum(m => m.SyncCount),
            TotalCrashes = g.Sum(m => m.CrashCount),
            AvgP2pConnections = g.Average(m => m.P2pConnections)
        })
        .FirstOrDefaultAsync();
    
    return Ok(dashboard);
}
```

**Privacy Considerations:**
- ε = 0.1 provides strong privacy guarantee (low epsilon = high privacy)
- Individual device behavior cannot be reconstructed from aggregates
- No raw event logs transmitted to backend
- Local events purged after aggregation
- Compliant with GDPR/CCPA privacy requirements

---

## PHASE 6: Ambient Computing & Quantum-Resistant Security

### Objective
Extend the platform with generative UI capabilities, spatial computing support, and quantum-resistant cryptographic protocols to future-proof the system against emerging threats and enable next-generation user experiences.

### Implementation Requirements

#### 6.1 Generative UI Engine (Dynamic ONNX-Driven Avalonia Rendering)

**Purpose**: Eliminate static web payloads by dynamically generating Avalonia UI/XAML controls from Intent JSON schemas sent by the backend API.

**Architecture:**
- Backend API sends Intent JSON Schema describing desired UI structure
- Client-side ONNX model interprets intent and generates XAML markup
- Avalonia AvaloniaXamlLoader dynamically instantiates controls at runtime
- No pre-compiled web payloads required for UI updates

**Intent JSON Schema Example:**
```json
{
  "intent": "DisplayProductList",
  "context": {
    "tenantId": "tenant-123",
    "userId": "user-456"
  },
  "layout": {
    "type": "StackPanel",
    "orientation": "Vertical",
    "children": [
      {
        "type": "TextBlock",
        "text": "Featured Products",
        "fontSize": 24,
        "fontWeight": "Bold"
      },
      {
        "type": "ListView",
        "dataSource": "products",
        "itemTemplate": {
          "type": "StackPanel",
          "orientation": "Horizontal",
          "children": [
            {
              "type": "Image",
              "binding": "{ImageUrl}",
              "width": 64,
              "height": 64
            },
            {
              "type": "TextBlock",
              "binding": "{Name}",
              "fontSize": 16
            },
            {
              "type": "Button",
              "text": "Add to Cart",
              "command": "AddToCart",
              "commandParameter": "{Id}"
            }
          ]
        }
      }
    ]
  }
}
```

**ONNX Intent Interpreter (`src/HybridPlatform.Shell/GenerativeUI/IntentInterpreter.cs`):**

```csharp
public class IntentInterpreter
{
    private readonly OnnxRuntimeService _onnxService;
    private readonly Dictionary<string, Type> _controlRegistry;
    
    public IntentInterpreter(OnnxRuntimeService onnxService)
    {
        _onnxService = onnxService;
        _controlRegistry = RegisterAvaloniaControls();
    }
    
    public async Task<Control> RenderFromIntentAsync(IntentSchema intent)
    {
        // Convert Intent JSON to feature vector for ONNX model
        var features = ExtractIntentFeatures(intent);
        
        // Run ONNX inference to validate intent and optimize layout
        var optimizedLayout = await _onnxService.RunInferenceAsync("intent-optimizer.onnx", features);
        
        // Generate XAML markup from optimized layout
        var xaml = GenerateXamlFromIntent(intent, optimizedLayout);
        
        // Dynamically load XAML and instantiate Avalonia controls
        var control = AvaloniaRuntimeXamlLoader.Parse<Control>(xaml);
        
        // Bind data context
        control.DataContext = await FetchDataAsync(intent.Context);
        
        return control;
    }
    
    private string GenerateXamlFromIntent(IntentSchema intent, float[] layoutParams)
    {
        var sb = new StringBuilder();
        sb.AppendLine("<UserControl xmlns='https://github.com/avaloniaui'>");
        
        RenderLayoutNode(intent.Layout, sb, indent: 1);
        
        sb.AppendLine("</UserControl>");
        return sb.ToString();
    }
    
    private void RenderLayoutNode(LayoutNode node, StringBuilder sb, int indent)
    {
        var indentStr = new string(' ', indent * 2);
        
        sb.AppendLine($"{indentStr}<{node.Type}");
        
        // Add properties
        foreach (var prop in node.Properties)
        {
            sb.AppendLine($"{indentStr}  {prop.Key}=\"{prop.Value}\"");
        }
        
        if (node.Children?.Count > 0)
        {
            sb.AppendLine($"{indentStr}>");
            foreach (var child in node.Children)
            {
                RenderLayoutNode(child, sb, indent + 1);
            }
            sb.AppendLine($"{indentStr}</{node.Type}>");
        }
        else
        {
            sb.AppendLine($"{indentStr}/>");
        }
    }
}
```

**API Endpoint for Intent Delivery (`src/HybridPlatform.Api/Controllers/IntentController.cs`):**

```csharp
[HttpPost("generate")]
[Authorize]
public async Task<IActionResult> GenerateIntent([FromBody] IntentRequest request)
{
    var tenantId = User.FindFirst("tid").Value;
    
    // Fetch tenant-specific UI template
    var template = await _templateService.GetTemplateAsync(tenantId, request.Screen);
    
    // Personalize intent based on user context
    var intent = await _personalizationService.CustomizeIntentAsync(template, request.UserId);
    
    // Add security signature to prevent tampering
    intent.Signature = _cryptoService.SignIntent(intent, tenantId);
    
    return Ok(intent);
}
```

#### 6.2 Spatial Computing (OpenXR & visionOS Support)

**Purpose**: Enable mixed reality experiences on Apple Vision Pro, Meta Quest, and other OpenXR-compatible devices with hand tracking and spatial anchoring.

**Build Target Configuration:**

Update `src/HybridPlatform.Shell/HybridPlatform.Shell.csproj`:
```xml
<PropertyGroup>
  <TargetFrameworks>net10.0;net10.0-ios;net10.0-android;net10.0-windows10.0.19041.0;net10.0-visionos1.0</TargetFrameworks>
  <EnableOpenXR>true</EnableOpenXR>
  <UseMauiEssentials>true</UseMauiEssentials>
</PropertyGroup>

<ItemGroup Condition="'$(TargetFramework)' == 'net10.0-visionos1.0'">
  <PackageReference Include="Microsoft.MAUI.Graphics" Version="10.0.0" />
  <PackageReference Include="VisionOSBindings" Version="1.0.0" />
</ItemGroup>

<ItemGroup>
  <PackageReference Include="OpenXR.Net" Version="1.0.0" />
  <PackageReference Include="HandTracking.Native" Version="1.0.0" />
</ItemGroup>
```

**Spatial Service (`src/HybridPlatform.Shell/Spatial/SpatialComputingService.cs`):**

```csharp
using OpenXR;

public class SpatialComputingService
{
    private XrInstance _xrInstance;
    private XrSession _xrSession;
    private XrSpace _localSpace;
    
    public async Task InitializeAsync()
    {
        // Initialize OpenXR runtime
        _xrInstance = XrInstance.Create("HybridPlatform", 1);
        
        // Request hand tracking extension
        _xrSession = await _xrInstance.CreateSessionAsync(new[] {
            "XR_EXT_hand_tracking",
            "XR_MSFT_spatial_anchor"
        });
        
        _localSpace = _xrSession.CreateReferenceSpace(XrReferenceSpaceType.Local);
    }
    
    public async Task<HandTrackingData> GetHandPoseAsync()
    {
        var leftHand = await _xrSession.LocateHandJointsAsync(XrHandEXT.Left);
        var rightHand = await _xrSession.LocateHandJointsAsync(XrHandEXT.Right);
        
        return new HandTrackingData
        {
            LeftHand = ConvertToHandPose(leftHand),
            RightHand = ConvertToHandPose(rightHand),
            Timestamp = DateTime.UtcNow
        };
    }
    
    public async Task<SpatialAnchor> CreateAnchorAsync(Vector3 position, Quaternion rotation)
    {
        var pose = new XrPosef
        {
            Position = new XrVector3f { X = position.X, Y = position.Y, Z = position.Z },
            Orientation = new XrQuaternionf { X = rotation.X, Y = rotation.Y, Z = rotation.Z, W = rotation.W }
        };
        
        var anchor = await _xrSession.CreateSpatialAnchorAsync(pose);
        
        // Persist anchor to local database for cross-session retrieval
        await _dbContext.SpatialAnchors.AddAsync(new SpatialAnchorEntity
        {
            Id = Guid.NewGuid(),
            AnchorId = anchor.Id,
            Position = position,
            Rotation = rotation,
            CreatedAt = DateTime.UtcNow
        });
        
        await _dbContext.SaveChangesAsync();
        
        return new SpatialAnchor(anchor.Id, position, rotation);
    }
}
```

**JS-to-C# Bridge Extension for Spatial APIs:**

Update `src/HybridPlatform.Shell/Bridge/JsBridge.cs`:
```csharp
[JSInvokable("GetHandTracking")]
public async Task<string> GetHandTrackingAsync()
{
    if (_spatialService == null)
        return JsonSerializer.Serialize(new { error = "Spatial computing not available" });
    
    var handData = await _spatialService.GetHandPoseAsync();
    return JsonSerializer.Serialize(handData);
}

[JSInvokable("CreateSpatialAnchor")]
public async Task<string> CreateSpatialAnchorAsync(float x, float y, float z, float qx, float qy, float qz, float qw)
{
    var position = new Vector3(x, y, z);
    var rotation = new Quaternion(qx, qy, qz, qw);
    
    var anchor = await _spatialService.CreateAnchorAsync(position, rotation);
    
    return JsonSerializer.Serialize(new { anchorId = anchor.Id });
}
```

**visionOS Platform Implementation (`src/HybridPlatform.Shell/Platforms/VisionOS/VisionOSApp.swift`):**

```swift
import SwiftUI
import RealityKit
import ARKit

@main
struct VisionOSApp: App {
    @State private var immersionState: ImmersionStyle = .mixed
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        
        ImmersiveSpace(id: "ImmersiveSpace") {
            RealityView { content in
                // Load 3D content from C# bridge
                let entity = try! await loadEntityFromCSharp()
                content.add(entity)
            }
        }
        .immersionStyle(selection: $immersionState, in: .mixed, .full)
    }
    
    func loadEntityFromCSharp() async throws -> Entity {
        // Call C# interop to get 3D scene data
        let sceneData = await CSharpBridge.shared.getSpatialScene()
        return try await Entity.load(from: sceneData)
    }
}
```

#### 6.3 Post-Quantum Cryptography (CRYSTALS-Kyber & FHE)

**Purpose**: Future-proof the system against quantum computing attacks by implementing NIST-standardized post-quantum key exchange and enabling encrypted computation on the server.

**CRYSTALS-Kyber Integration for P2P TLS:**

Update `src/HybridPlatform.Shell/P2P/Sockets/TlsSocketService.cs`:
```csharp
using Org.BouncyCastle.Pqc.Crypto.Crystals.Kyber;

public class QuantumResistantTlsService
{
    private KyberKeyPairGenerator _kyberKeyGen;
    
    public async Task<SslStream> EstablishQuantumSafeTlsAsync(TcpClient client)
    {
        var stream = client.GetStream();
        
        // Step 1: Perform CRYSTALS-Kyber key exchange
        var kyberPublicKey = await PerformKyberKeyExchangeAsync(stream);
        
        // Step 2: Derive shared secret using Kyber KEM
        var sharedSecret = DeriveSharedSecret(kyberPublicKey);
        
        // Step 3: Use shared secret as pre-shared key (PSK) for TLS 1.3
        var sslOptions = new SslClientAuthenticationOptions
        {
            TargetHost = client.Client.RemoteEndPoint.ToString(),
            EnabledSslProtocols = SslProtocols.Tls13,
            CipherSuitesPolicy = new CipherSuitesPolicy(new[]
            {
                TlsCipherSuite.TLS_AES_256_GCM_SHA384
            }),
            // Inject Kyber-derived PSK
            ClientCertificates = new X509CertificateCollection(),
            RemoteCertificateValidationCallback = ValidateCertificateWithPinning
        };
        
        var sslStream = new SslStream(stream, false, ValidateCertificateWithPinning);
        await sslStream.AuthenticateAsClientAsync(sslOptions);
        
        return sslStream;
    }
    
    private async Task<byte[]> PerformKyberKeyExchangeAsync(NetworkStream stream)
    {
        // Generate Kyber-1024 key pair (highest security level)
        var keyPairGenerator = new KyberKeyPairGenerator();
        keyPairGenerator.Init(new KyberKeyGenerationParameters(new SecureRandom(), KyberParameters.kyber1024));
        
        var keyPair = keyPairGenerator.GenerateKeyPair();
        var publicKey = ((KyberPublicKeyParameters)keyPair.Public).GetEncoded();
        
        // Send public key to peer
        await stream.WriteAsync(BitConverter.GetBytes(publicKey.Length));
        await stream.WriteAsync(publicKey);
        
        // Receive peer's public key
        var lengthBuffer = new byte[4];
        await stream.ReadAsync(lengthBuffer, 0, 4);
        var peerKeyLength = BitConverter.ToInt32(lengthBuffer);
        
        var peerPublicKey = new byte[peerKeyLength];
        await stream.ReadAsync(peerPublicKey, 0, peerKeyLength);
        
        return peerPublicKey;
    }
    
    private byte[] DeriveSharedSecret(byte[] peerPublicKeyBytes)
    {
        var peerPublicKey = new KyberPublicKeyParameters(KyberParameters.kyber1024, peerPublicKeyBytes);
        
        // Encapsulate to derive shared secret
        var kemGenerator = new KyberKemGenerator(new SecureRandom());
        var encapsulation = kemGenerator.GenerateEncapsulated(peerPublicKey);
        
        return encapsulation.GetSecret();
    }
}
```

**Fully Homomorphic Encryption (FHE) for SQLite:**

**FHE Service (`src/HybridPlatform.Shell/Crypto/FheService.cs`):**

```csharp
using Microsoft.Research.SEAL;

public class FheService
{
    private SEALContext _context;
    private KeyGenerator _keyGenerator;
    private PublicKey _publicKey;
    private SecretKey _secretKey;
    private RelinKeys _relinKeys;
    private Encryptor _encryptor;
    private Decryptor _decryptor;
    private Evaluator _evaluator;
    
    public void Initialize()
    {
        // Configure SEAL with BFV scheme for integer operations
        var parms = new EncryptionParameters(SchemeType.BFV);
        parms.PolyModulusDegree = 8192;
        parms.CoeffModulus = CoeffModulus.BFVDefault(8192);
        parms.PlainModulus = new Modulus(1024);
        
        _context = new SEALContext(parms);
        _keyGenerator = new KeyGenerator(_context);
        _secretKey = _keyGenerator.SecretKey;
        _keyGenerator.CreatePublicKey(out _publicKey);
        _keyGenerator.CreateRelinKeys(out _relinKeys);
        
        _encryptor = new Encryptor(_context, _publicKey);
        _decryptor = new Decryptor(_context, _secretKey);
        _evaluator = new Evaluator(_context);
    }
    
    public byte[] EncryptValue(long value)
    {
        using var plaintext = new Plaintext($"{value:X}");
        using var ciphertext = new Ciphertext();
        _encryptor.Encrypt(plaintext, ciphertext);
        
        using var ms = new MemoryStream();
        ciphertext.Save(ms);
        return ms.ToArray();
    }
    
    public long DecryptValue(byte[] encryptedData)
    {
        using var ms = new MemoryStream(encryptedData);
        using var ciphertext = new Ciphertext();
        ciphertext.Load(_context, ms);
        
        using var plaintext = new Plaintext();
        _decryptor.Decrypt(ciphertext, plaintext);
        
        return long.Parse(plaintext.ToString(), System.Globalization.NumberStyles.HexNumber);
    }
    
    public byte[] HomomorphicAdd(byte[] encrypted1, byte[] encrypted2)
    {
        using var ms1 = new MemoryStream(encrypted1);
        using var cipher1 = new Ciphertext();
        cipher1.Load(_context, ms1);
        
        using var ms2 = new MemoryStream(encrypted2);
        using var cipher2 = new Ciphertext();
        cipher2.Load(_context, ms2);
        
        using var result = new Ciphertext();
        _evaluator.Add(cipher1, cipher2, result);
        
        using var resultStream = new MemoryStream();
        result.Save(resultStream);
        return resultStream.ToArray();
    }
}
```

**EF Core Value Converter for FHE:**

```csharp
public class FheValueConverter : ValueConverter<long, byte[]>
{
    private static FheService _fheService = new();
    
    static FheValueConverter()
    {
        _fheService.Initialize();
    }
    
    public FheValueConverter()
        : base(
            plainValue => _fheService.EncryptValue(plainValue),
            encryptedValue => _fheService.DecryptValue(encryptedValue))
    {
    }
}
```

**Apply FHE to Sensitive Entity Fields:**

Update `src/HybridPlatform.Core/Data/HybridDbContext.cs`:
```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    base.OnModelCreating(modelBuilder);
    
    // Apply FHE to salary field (example)
    modelBuilder.Entity<Employee>()
        .Property(e => e.Salary)
        .HasConversion(new FheValueConverter())
        .HasColumnType("BLOB");
    
    // Apply FHE to credit card numbers
    modelBuilder.Entity<PaymentMethod>()
        .Property(p => p.CardNumber)
        .HasConversion(new FheValueConverter())
        .HasColumnType("BLOB");
}
```

**Server-Side Blind Query API (`src/HybridPlatform.Api/Controllers/FheQueryController.cs`):**

```csharp
[HttpPost("aggregate")]
[Authorize]
public async Task<IActionResult> AggregateEncryptedData([FromBody] FheAggregationRequest request)
{
    var tenantId = User.FindFirst("tid").Value;
    
    // Fetch encrypted salary data (server never sees plaintext)
    var encryptedSalaries = await _dbContext.Employees
        .Where(e => e.TenantId == tenantId && e.Department == request.Department)
        .Select(e => e.Salary) // This is FHE-encrypted blob
        .ToListAsync();
    
    // Perform homomorphic addition on encrypted values
    byte[] encryptedSum = encryptedSalaries[0];
    for (int i = 1; i < encryptedSalaries.Count; i++)
    {
        encryptedSum = _fheService.HomomorphicAdd(encryptedSum, encryptedSalaries[i]);
    }
    
    // Return encrypted result (client decrypts with secret key)
    return Ok(new { encryptedSum = Convert.ToBase64String(encryptedSum) });
}
```

**NuGet Package Updates:**

Add to `src/HybridPlatform.Shell/HybridPlatform.Shell.csproj`:
```xml
<ItemGroup>
  <PackageReference Include="BouncyCastle.Cryptography" Version="2.3.0" />
  <PackageReference Include="Microsoft.Research.SEAL" Version="4.1.0" />
  <PackageReference Include="OpenXR.Net" Version="1.0.0" />
</ItemGroup>
```

---

## Execution Instructions

### Phase 4 Deliverables:
1. `.github/workflows/tenant-build.yml` - Complete GitHub Actions workflow
2. `scripts/inject-android-manifest.sh` - Bash script for Android customization
3. `scripts/inject-ios-plist.sh` - Bash script for iOS customization
4. `scripts/inject-windows-appx.ps1` - PowerShell script for Windows customization
5. `docs/CICD-SETUP.md` - Documentation for Azure Key Vault configuration and tenant onboarding

### Phase 5 Deliverables:
1. `helm/hybrid-platform/templates/canary-crd.yaml` - Kubernetes CRD definition
2. `src/HybridPlatform.Api/AIOps/CanaryController.cs` - Canary deployment controller
3. `src/HybridPlatform.Api/AIOps/CanaryService.cs` - Canary business logic
4. `src/HybridPlatform.Api/Controllers/PluginsController.cs` - Plugin upload/management API
5. `src/HybridPlatform.Shell/Plugins/WasmPluginHost.cs` - Wasmtime integration
6. `src/HybridPlatform.Shell/Telemetry/TelemetryCollector.cs` - Local telemetry with differential privacy
7. `src/HybridPlatform.Api/Controllers/TelemetryController.cs` - Backend telemetry aggregation
8. `src/HybridPlatform.Api/Models/TelemetryMetric.cs` - Telemetry data model
9. Update `src/HybridPlatform.Shell/HybridPlatform.Shell.csproj` - Add Wasmtime NuGet package
10. `deployment/cockroachdb/telemetry-schema.sql` - TimescaleDB extension setup for metrics

### Phase 6 Deliverables:
1. `src/HybridPlatform.Shell/GenerativeUI/IntentInterpreter.cs` - ONNX-driven UI generation engine
2. `src/HybridPlatform.Shell/GenerativeUI/IntentSchema.cs` - Intent JSON schema data models
3. `src/HybridPlatform.Api/Controllers/IntentController.cs` - Intent generation API
4. `src/HybridPlatform.Shell/Spatial/SpatialComputingService.cs` - OpenXR integration service
5. `src/HybridPlatform.Shell/Spatial/HandTrackingData.cs` - Hand tracking data models
6. `src/HybridPlatform.Shell/Spatial/SpatialAnchor.cs` - Spatial anchor management
7. `src/HybridPlatform.Shell/Platforms/VisionOS/VisionOSApp.swift` - Apple Vision Pro platform support
8. Update `src/HybridPlatform.Shell/Bridge/JsBridge.cs` - Add spatial computing bridge methods
9. `src/HybridPlatform.Shell/P2P/Sockets/QuantumResistantTlsService.cs` - CRYSTALS-Kyber TLS implementation
10. `src/HybridPlatform.Shell/Crypto/FheService.cs` - Microsoft SEAL FHE service
11. `src/HybridPlatform.Shell/Crypto/FheValueConverter.cs` - EF Core FHE value converter
12. `src/HybridPlatform.Api/Controllers/FheQueryController.cs` - Server-side blind query API
13. Update `src/HybridPlatform.Core/Data/HybridDbContext.cs` - Apply FHE to sensitive fields
14. Update `src/HybridPlatform.Shell/HybridPlatform.Shell.csproj` - Add BouncyCastle, SEAL, OpenXR packages
15. `src/HybridPlatform.Core/Entities/SpatialAnchorEntity.cs` - Spatial anchor persistence entity

### Commit Strategy:
- Phase 4: Single commit with all CI/CD workflow files and scripts
- Phase 5: Single commit with all AIOps, plugin, and telemetry files
- Phase 6: Single commit with all generative UI, spatial computing, and quantum-resistant crypto files

### Testing Checklist:
**Phase 4:**
- [ ] Trigger workflow with test tenant credentials
- [ ] Verify Android APK contains correct package name and branding
- [ ] Verify iOS IPA contains correct bundle ID and provisioning profile
- [ ] Confirm OTA manifest generated and uploaded to CDN
- [ ] Validate certificate injection from Azure Key Vault

**Phase 5:**
- [ ] Deploy CanaryDeployment CRD to test cluster
- [ ] Simulate error threshold breach and verify automatic rollback
- [ ] Upload test WASM plugin and confirm sandbox restrictions
- [ ] Verify telemetry aggregation with differential privacy noise
- [ ] Confirm Prometheus metrics exposed for canary stages

---

## Technical Stack Reference

**Phase 4 Technologies:**
- GitHub Actions (workflow automation)
- Azure Key Vault (certificate storage)
- Bash/PowerShell (asset manipulation)
- sed/awk/plutil (XML/plist editing)
- .NET 10 workloads (ios, android, windows)
- MakeAppx (MSIX packaging)
- jarsigner (APK signing)
- xcrun altool (iOS distribution)

**Phase 5 Technologies:**
- Kubernetes Custom Resources (CRD)
- Wasmtime .NET (WASM runtime)
- WASI (WebAssembly System Interface)
- Laplace Mechanism (differential privacy)
- TimescaleDB (PostgreSQL extension for time-series)
- Prometheus (metrics exposition)

**Phase 6 Technologies:**
- ONNX Runtime (intent interpretation & layout optimization)
- Avalonia AvaloniaXamlLoader (dynamic XAML parsing)
- OpenXR (cross-platform XR runtime)
- visionOS SDK (Apple Vision Pro native integration)
- CRYSTALS-Kyber (NIST post-quantum KEM)
- Microsoft SEAL (fully homomorphic encryption library)
- BouncyCastle.Cryptography (post-quantum crypto primitives)
- Hand tracking APIs (OpenXR extensions)
- Spatial anchors (persistent 3D positioning)

---

## Next Steps

After reviewing this prompt:
1. Confirm your understanding of Phase 4, Phase 5, and Phase 6 requirements
2. Request toggle to **ACT MODE** to begin implementation
3. Begin with Phase 4 (CI/CD Orchestration) first
4. Upon completion, proceed to Phase 5 (Autonomous Operations)
5. Finally, implement Phase 6 (Ambient Computing & Quantum-Resistant Security)
6. Commit and push all phases to GitHub repository

**Ready to begin? Type "go" to start Phase 4 implementation.**
