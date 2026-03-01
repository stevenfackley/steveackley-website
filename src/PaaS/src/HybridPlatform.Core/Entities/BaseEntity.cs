namespace HybridPlatform.Core.Entities;

/// <summary>
/// Root aggregate base for every persisted entity in the system.
///
/// Key design decisions:
///   - <see cref="Id"/> uses UUIDv7 (<see cref="Guid.CreateVersion7()"/>) for monotonic,
///     offline-safe primary keys that sort correctly in B-tree indexes without a network
///     round-trip. UUID ordering eliminates page-split hotspots in PostgreSQL.
///   - <see cref="LastModifiedUtc"/> is the Last-Write-Wins (LWW) discriminator. The
///     <see cref="HybridDbContext"/> auto-stamps this on every SaveChanges call.
///   - <see cref="SyncStatus"/> acts as the SyncManager cursor: any value of
///     <see cref="SyncStatus.Pending"/> marks the row for dispatch.
/// </summary>
public abstract class BaseEntity
{
    /// <summary>UUIDv7 primary key. Generated client-side; safe against offline concurrency.</summary>
    public Guid Id { get; init; } = Guid.CreateVersion7();

    /// <summary>
    /// UTC wall-clock time of the last local mutation.
    /// Auto-updated by <c>HybridDbContext.StampModifiedEntities()</c>.
    /// Never compare with local time — always UTC.
    /// </summary>
    public DateTime LastModifiedUtc { get; set; } = DateTime.UtcNow;

    /// <summary>Offline sync state. Reset to <see cref="SyncStatus.Pending"/> on every local write.</summary>
    public SyncStatus SyncStatus { get; set; } = SyncStatus.Pending;
}
