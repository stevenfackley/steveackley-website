using System.Text.Json;
using HybridPlatform.Core.Data;

namespace HybridPlatform.Core.SyncEngine;

/// <summary>
/// Non-generic handler contract. Registered in DI as a collection;
/// the SyncManager iterates all registered handlers each cycle.
/// </summary>
public interface ISyncEntityHandler
{
    /// <summary>OData entity-set name, e.g. <c>"Posts"</c>. Case-sensitive.</summary>
    string EntitySetName { get; }

    /// <summary>
    /// Queries the local SQLite store for <see cref="Entities.SyncStatus.Pending"/>
    /// records up to <paramref name="limit"/>, serialises each entity to JSON,
    /// and returns the detached snapshots.
    /// </summary>
    Task<IReadOnlyList<SyncItem>> CollectPendingAsync(
        HybridDbContext context,
        int limit,
        CancellationToken ct);

    /// <summary>
    /// Applies a server-authoritative record (full JSON) to the local store.
    /// Called for <see cref="SyncClassification.ServerWins"/> items.
    /// Sets <see cref="Entities.SyncStatus.Synced"/> on the local entity.
    /// Does NOT call SaveChanges — the SyncManager batches the saves.
    /// </summary>
    Task ApplyServerStateAsync(
        HybridDbContext context,
        JsonElement serverRecord,
        CancellationToken ct);
}
