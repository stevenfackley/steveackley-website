using System.Net;
using System.Text.Json.Serialization;

namespace HybridPlatform.Shell.P2P.Discovery;

/// <summary>
/// Metadata describing a discovered peer device on the local network.
///
/// Discovery Flow:
///   1. Device broadcasts mDNS service: _hybridplatform._tcp.local
///   2. Peers respond with TXT records containing PeerInfo JSON
///   3. Capabilities negotiation determines sync compatibility
///   4. TLS socket connection established on discovered port
///
/// Capabilities:
///   - SyncProtocol: "crdt-v1", "crdt-v2" (protocol version)
///   - Compression: "brotli", "gzip", "none"
///   - Encryption: "tls13", "tls12"
///   - DataTypes: ["posts", "comments", "media"] (entity types)
/// </summary>
public sealed record PeerInfo
{
    /// <summary>Unique device identifier (hardware UUID)</summary>
    [JsonPropertyName("deviceId")]
    required public string DeviceId { get; init; }

    /// <summary>Human-readable device name (e.g., "John's iPhone")</summary>
    [JsonPropertyName("deviceName")]
    required public string DeviceName { get; init; }

    /// <summary>IP address of the peer device</summary>
    [JsonPropertyName("ipAddress")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? IpAddress { get; init; }

    /// <summary>TLS socket port for P2P sync (default: 8765)</summary>
    [JsonPropertyName("port")]
    public int Port { get; init; } = 8765;

    /// <summary>Protocol capabilities (sync version, compression, encryption)</summary>
    [JsonPropertyName("capabilities")]
    required public PeerCapabilities Capabilities { get; init; }

    /// <summary>UTC timestamp when peer was last seen</summary>
    [JsonPropertyName("lastSeenUtc")]
    public DateTime LastSeenUtc { get; init; } = DateTime.UtcNow;

    /// <summary>SHA-256 fingerprint of peer's TLS certificate (for pinning)</summary>
    [JsonPropertyName("certificateFingerprint")]
    public string? CertificateFingerprint { get; init; }

    /// <summary>Tenant ID (peers from different tenants cannot sync)</summary>
    [JsonPropertyName("tenantId")]
    public string? TenantId { get; init; }

    /// <summary>App version (semantic versioning)</summary>
    [JsonPropertyName("appVersion")]
    public string? AppVersion { get; init; }

    /// <summary>Platform (iOS, Android, Windows, macOS, Linux)</summary>
    [JsonPropertyName("platform")]
    public string? Platform { get; init; }

    /// <summary>Indicates if peer is online and reachable</summary>
    [JsonIgnore]
    public bool IsOnline => DateTime.UtcNow - LastSeenUtc < TimeSpan.FromSeconds(60);

    /// <summary>
    /// Returns the full socket endpoint (IP:Port) for TLS connection.
    /// </summary>
    public IPEndPoint? GetEndPoint()
    {
        if (string.IsNullOrEmpty(IpAddress))
            return null;

        if (!IPAddress.TryParse(IpAddress, out var ip))
            return null;

        return new IPEndPoint(ip, Port);
    }
}

/// <summary>
/// Describes peer device capabilities for protocol negotiation.
/// </summary>
public sealed record PeerCapabilities
{
    /// <summary>Supported CRDT sync protocol versions</summary>
    [JsonPropertyName("syncProtocols")]
    required public string[] SyncProtocols { get; init; }

    /// <summary>Supported compression algorithms</summary>
    [JsonPropertyName("compression")]
    required public string[] Compression { get; init; }

    /// <summary>Supported TLS versions</summary>
    [JsonPropertyName("encryption")]
    required public string[] Encryption { get; init; }

    /// <summary>Entity types supported for sync</summary>
    [JsonPropertyName("dataTypes")]
    required public string[] DataTypes { get; init; }

    /// <summary>Maximum batch size for sync operations</summary>
    [JsonPropertyName("maxBatchSize")]
    public int MaxBatchSize { get; init; } = 1000;

    /// <summary>Supports delta sync (incremental updates)</summary>
    [JsonPropertyName("supportsDeltaSync")]
    public bool SupportsDeltaSync { get; init; } = true;

    /// <summary>
    /// Checks if this peer is compatible with another peer's capabilities.
    /// </summary>
    public bool IsCompatibleWith(PeerCapabilities other)
    {
        // Must have at least one protocol version in common
        var hasCommonProtocol = SyncProtocols.Intersect(other.SyncProtocols).Any();
        if (!hasCommonProtocol)
            return false;

        // Must have at least one encryption method in common
        var hasCommonEncryption = Encryption.Intersect(other.Encryption).Any();
        if (!hasCommonEncryption)
            return false;

        // Must have overlapping data types
        var hasCommonDataTypes = DataTypes.Intersect(other.DataTypes).Any();
        if (!hasCommonDataTypes)
            return false;

        return true;
    }

    /// <summary>
    /// Negotiates the best protocol settings with another peer.
    /// </summary>
    public NegotiatedProtocol NegotiateWith(PeerCapabilities other)
    {
        if (!IsCompatibleWith(other))
            throw new InvalidOperationException("Peers are not compatible");

        // Choose the highest common protocol version
        var protocol = SyncProtocols
            .Intersect(other.SyncProtocols)
            .OrderByDescending(p => p)
            .First();

        // Prefer TLS 1.3 over 1.2
        var encryption = Encryption
            .Intersect(other.Encryption)
            .OrderByDescending(e => e)
            .First();

        // Prefer Brotli > Gzip > None
        var compression = Compression
            .Intersect(other.Compression)
            .OrderByDescending(c => c switch
            {
                "brotli" => 3,
                "gzip" => 2,
                "none" => 1,
                _ => 0
            })
            .FirstOrDefault() ?? "none";

        // Sync only common data types
        var dataTypes = DataTypes.Intersect(other.DataTypes).ToArray();

        // Use the smaller batch size
        var batchSize = Math.Min(MaxBatchSize, other.MaxBatchSize);

        return new NegotiatedProtocol
        {
            SyncProtocol = protocol,
            Encryption = encryption,
            Compression = compression,
            DataTypes = dataTypes,
            BatchSize = batchSize,
            SupportsDeltaSync = SupportsDeltaSync && other.SupportsDeltaSync
        };
    }
}

/// <summary>
/// Result of capability negotiation between two peers.
/// </summary>
public sealed record NegotiatedProtocol
{
    required public string SyncProtocol { get; init; }
    required public string Encryption { get; init; }
    required public string Compression { get; init; }
    required public string[] DataTypes { get; init; }
    required public int BatchSize { get; init; }
    required public bool SupportsDeltaSync { get; init; }
}

/// <summary>
/// Event args for peer discovery events.
/// </summary>
public sealed class PeerDiscoveredEventArgs : EventArgs
{
    required public PeerInfo Peer { get; init; }
    public bool IsNew { get; init; }
}

/// <summary>
/// Event args for peer lost events.
/// </summary>
public sealed class PeerLostEventArgs : EventArgs
{
    required public string DeviceId { get; init; }
    required public DateTime LastSeenUtc { get; init; }
}
