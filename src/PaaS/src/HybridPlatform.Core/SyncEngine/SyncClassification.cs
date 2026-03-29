namespace HybridPlatform.Core.SyncEngine;

/// <summary>
/// LWW classification assigned to each pending mutation after comparing
/// local vs. server <c>LastModifiedUtc</c>.
/// </summary>
internal enum SyncClassification : byte
{
    /// <summary>Not yet compared against the server.</summary>
    Unclassified = 0,

    /// <summary>
    /// Entity does not exist on the server (no matching ID in the timestamp query).
    /// Action: POST to the entity set.
    /// </summary>
    New = 1,

    /// <summary>
    /// <c>local.LastModifiedUtc >= server.LastModifiedUtc</c>.
    /// Action: PATCH the server record.
    /// </summary>
    LocalWins = 2,

    /// <summary>
    /// <c>server.LastModifiedUtc > local.LastModifiedUtc</c>.
    /// Action: fetch full server record, overwrite local, mark <see cref="Entities.SyncStatus.Synced"/>.
    /// No upload is performed.
    /// </summary>
    ServerWins = 3,
}
