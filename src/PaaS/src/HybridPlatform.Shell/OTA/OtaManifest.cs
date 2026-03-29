using System.Text.Json.Serialization;

namespace HybridPlatform.Shell.OTA;

/// <summary>
/// OTA update manifest containing payload metadata and cryptographic signatures.
///
/// Flow:
///   1. Shell polls GET /ota/manifest?currentVersion={version}
///   2. API returns manifest if update available
///   3. Shell downloads payload from PayloadUrl
///   4. Shell verifies SHA256 checksum
///   5. Shell extracts and updates app://localhost routing
/// </summary>
public sealed record OtaManifest
{
    /// <summary>Semantic version of this update (e.g., "2.1.0")</summary>
    [JsonPropertyName("version")]
    required public string Version { get; init; }

    /// <summary>Build number (monotonically increasing)</summary>
    [JsonPropertyName("buildNumber")]
    required public int BuildNumber { get; init; }

    /// <summary>UTC timestamp when update was published</summary>
    [JsonPropertyName("publishedAt")]
    required public DateTime PublishedAtUtc { get; init; }

    /// <summary>CDN or API endpoint hosting the encrypted .zip payload</summary>
    [JsonPropertyName("payloadUrl")]
    required public string PayloadUrl { get; init; }

    /// <summary>SHA-256 checksum of the encrypted .zip file (hex string)</summary>
    [JsonPropertyName("sha256")]
    required public string Sha256Checksum { get; init; }

    /// <summary>Compressed payload size in bytes</summary>
    [JsonPropertyName("payloadSizeBytes")]
    required public long PayloadSizeBytes { get; init; }

    /// <summary>Ed25519 signature of (version + buildNumber + sha256) by platform key</summary>
    [JsonPropertyName("signature")]
    public string? Signature { get; init; }

    /// <summary>Release notes (Markdown format)</summary>
    [JsonPropertyName("releaseNotes")]
    public string? ReleaseNotes { get; init; }

    /// <summary>Update criticality: "optional", "recommended", "critical"</summary>
    [JsonPropertyName("updateType")]
    public string UpdateType { get; init; } = "optional";

    /// <summary>Minimum shell version required to apply this update</summary>
    [JsonPropertyName("minimumShellVersion")]
    public string? MinimumShellVersion { get; init; }

    /// <summary>Tenant-specific customization metadata (logo, colors, etc.)</summary>
    [JsonPropertyName("tenantMetadata")]
    public Dictionary<string, string>? TenantMetadata { get; init; }
}

/// <summary>
/// Result of an OTA update operation.
/// </summary>
public sealed record OtaUpdateResult
{
    required public bool Success { get; init; }
    required public string Version { get; init; }
    public string? ErrorMessage { get; init; }
    public DateTime CompletedAtUtc { get; init; } = DateTime.UtcNow;
    public long BytesDownloaded { get; init; }
    public TimeSpan Duration { get; init; }
}

/// <summary>
/// Progress callback for OTA downloads.
/// </summary>
public sealed record OtaDownloadProgress
{
    required public long BytesReceived { get; init; }
    required public long TotalBytes { get; init; }
    public double PercentComplete => TotalBytes > 0 ? (double)BytesReceived / TotalBytes * 100 : 0;
    public TimeSpan Elapsed { get; init; }
    public double BytesPerSecond { get; init; }
}
