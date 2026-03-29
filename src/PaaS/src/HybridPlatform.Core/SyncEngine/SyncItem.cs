namespace HybridPlatform.Core.SyncEngine;

/// <summary>
/// Snapshot of a single pending local mutation, detached from the EF Core change
/// tracker so it can be handed off across async boundaries without a scoped context.
/// </summary>
internal sealed class SyncItem
{
    public required Guid Id { get; init; }
    public required string EntitySetName { get; init; }
    public required DateTime LastModifiedUtc { get; init; }

    /// <summary>
    /// Pre-serialised JSON body for the PATCH / POST request.
    /// Serialisation happens inside <see cref="ISyncEntityHandler"/> using
    /// source-generated metadata so it is AOT-safe.
    /// </summary>
    public required string SerializedJson { get; init; }

    /// <summary>Set by <see cref="LwwConflictResolver"/> after the server timestamp query.</summary>
    public SyncClassification Classification { get; set; } = SyncClassification.Unclassified;
}
