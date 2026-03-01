using System.Collections.Frozen;

namespace HybridPlatform.Core.SyncEngine;

/// <summary>
/// Classifies each pending <see cref="SyncItem"/> by comparing its
/// <see cref="SyncItem.LastModifiedUtc"/> against the server's current timestamp.
///
/// LWW Rule:
///   <code>
///   serverUtc > localUtc  → ServerWins (server has a newer write; discard local upload)
///   localUtc >= serverUtc → LocalWins  (local is same age or newer; PATCH server)
///   id not on server      → New        (entity was created offline; POST to server)
///   </code>
///
/// Equal timestamps are treated as LocalWins to ensure offline-created records
/// are never silently discarded when a server round-trip produces the same timestamp.
/// This is safe because UUIDv7 keys prevent identity collisions, so an equal timestamp
/// can only occur if the record was synced to the server and immediately synced back.
/// </summary>
internal static class LwwConflictResolver
{
    /// <summary>
    /// Mutates each item's <see cref="SyncItem.Classification"/> in place.
    ///
    /// <paramref name="serverTimestamps"/>: map of entity ID → server <c>LastModifiedUtc</c>
    /// obtained from the OData timestamp pre-check query.
    /// </summary>
    public static void Classify(
        IReadOnlyList<SyncItem> items,
        FrozenDictionary<Guid, DateTime> serverTimestamps)
    {
        foreach (var item in items)
        {
            if (!serverTimestamps.TryGetValue(item.Id, out var serverUtc))
            {
                item.Classification = SyncClassification.New;
                continue;
            }

            // Normalise both sides to UTC before comparing to guard against
            // accidental DateTimeKind.Local values leaking through serialisation.
            var localUtc  = DateTime.SpecifyKind(item.LastModifiedUtc, DateTimeKind.Utc);
            var remoteUtc = DateTime.SpecifyKind(serverUtc,            DateTimeKind.Utc);

            item.Classification = remoteUtc > localUtc
                ? SyncClassification.ServerWins
                : SyncClassification.LocalWins;
        }
    }
}
