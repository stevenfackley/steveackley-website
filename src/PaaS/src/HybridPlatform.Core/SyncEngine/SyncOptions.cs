namespace HybridPlatform.Core.SyncEngine;

/// <summary>
/// Bound from configuration section <c>"Sync"</c> on both tiers.
///
/// Shell (Avalonia) example appsettings.json:
/// <code>
///   "Sync": {
///     "ODataBaseUrl": "https://tunnel.example.com/odata",
///     "SyncInterval": "00:00:30",
///     "BatchSize": 50
///   }
/// </code>
/// </summary>
public sealed class SyncOptions
{
    public const string Section = "Sync";

    /// <summary>Grace period after app start before the first cycle fires.</summary>
    public TimeSpan StartupDelay { get; init; } = TimeSpan.FromSeconds(8);

    /// <summary>Idle interval between automatic sync cycles.</summary>
    public TimeSpan SyncInterval { get; init; } = TimeSpan.FromSeconds(30);

    /// <summary>OData service root. No trailing slash.</summary>
    public required string ODataBaseUrl { get; init; }

    /// <summary>Maximum entities per entity-set per batch dispatch.</summary>
    public int BatchSize { get; init; } = 50;

    /// <summary>HTTP timeout per batch request.</summary>
    public TimeSpan RequestTimeout { get; init; } = TimeSpan.FromSeconds(30);

    /// <summary>
    /// Named <see cref="System.Net.Http.HttpClient"/> registered in DI.
    /// Lets the host configure authentication (Bearer / API key) separately
    /// from the sync logic.
    /// </summary>
    public string HttpClientName { get; init; } = "SyncClient";
}
