using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using HybridPlatform.Core.Data;
using HybridPlatform.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace HybridPlatform.Core.SyncEngine;

/// <summary>
/// Generic base class that provides a fully-working default implementation of
/// <see cref="ISyncEntityHandler"/> for a concrete entity type.
///
/// Usage — one class per entity, registered in DI at startup:
/// <code>
///   public sealed class PostSyncHandler()
///       : SyncEntityHandlerBase&lt;Post&gt;("Posts", AppJsonContext.Default.Post) { }
///
///   services.AddSingleton&lt;ISyncEntityHandler, PostSyncHandler&gt;();
/// </code>
///
/// The <paramref name="jsonTypeInfo"/> parameter MUST come from a
/// <c>[JsonSerializable]</c>-decorated partial <c>JsonSerializerContext</c> to
/// remain AOT-safe. Never pass <c>JsonSerializerOptions</c> directly.
/// </summary>
public abstract class SyncEntityHandlerBase<TEntity>(
    string entitySetName,
    JsonTypeInfo<TEntity> jsonTypeInfo) : ISyncEntityHandler
    where TEntity : BaseEntity
{
    public string EntitySetName { get; } = entitySetName;

    public async Task<IReadOnlyList<SyncItem>> CollectPendingAsync(
        HybridDbContext context,
        int limit,
        CancellationToken ct)
    {
        // Order by LastModifiedUtc ascending — oldest pending mutations dispatched first.
        // AsNoTracking keeps the scan cheap; we only need the snapshot for serialisation.
        var entities = await context.Set<TEntity>()
            .Where(e => e.SyncStatus == SyncStatus.Pending)
            .OrderBy(e => e.LastModifiedUtc)
            .Take(limit)
            .AsNoTracking()
            .ToListAsync(ct)
            .ConfigureAwait(false);

        return entities
            .Select(e => new SyncItem
            {
                Id              = e.Id,
                EntitySetName   = EntitySetName,
                LastModifiedUtc = e.LastModifiedUtc,
                SerializedJson  = JsonSerializer.Serialize(e, jsonTypeInfo),
            })
            .ToList();
    }

    public async Task ApplyServerStateAsync(
        HybridDbContext context,
        JsonElement serverRecord,
        CancellationToken ct)
    {
        var server = serverRecord.Deserialize(jsonTypeInfo)
            ?? throw new InvalidOperationException(
                $"[{EntitySetName}] Failed to deserialise server record.");

        // Look up the tracked entity if it exists locally.
        var local = await context.Set<TEntity>()
            .FindAsync([server.Id], ct)
            .ConfigureAwait(false);

        if (local is null)
        {
            // Entity arrived from the server that we don't have yet (created elsewhere).
            server.SyncStatus = SyncStatus.Synced;
            context.Set<TEntity>().Add(server);
        }
        else
        {
            // Overwrite every scalar with server values.
            // SetValues does a property-by-property copy — no reflection at runtime
            // because EF Core's compiled model already has the property accessors.
            context.Entry(local).CurrentValues.SetValues(server);
            local.SyncStatus = SyncStatus.Synced;
        }

        // SaveChanges is deferred to the SyncManager to batch all server-wins updates
        // together in a single round-trip to SQLite.
    }
}
