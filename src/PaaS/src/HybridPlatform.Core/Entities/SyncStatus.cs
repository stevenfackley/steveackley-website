namespace HybridPlatform.Core.Entities;

/// <summary>
/// Tracks the sync state of a <see cref="BaseEntity"/> relative to the Tier-1 backend.
/// The SyncManager uses this as a cursor: only <see cref="Pending"/> rows are dispatched.
/// </summary>
public enum SyncStatus : byte
{
    /// <summary>Record is in sync with the server replica.</summary>
    Synced = 0,

    /// <summary>Record carries local mutations not yet flushed to the backend OData endpoint.</summary>
    Pending = 1,

    /// <summary>
    /// A Last-Write-Wins comparison detected that the server version is newer than
    /// <see cref="BaseEntity.LastModifiedUtc"/>. Requires application-layer resolution.
    /// </summary>
    Conflict = 2,
}
