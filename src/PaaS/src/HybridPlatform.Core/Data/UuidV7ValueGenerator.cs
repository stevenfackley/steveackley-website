using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.ValueGeneration;

namespace HybridPlatform.Core.Data;

/// <summary>
/// EF Core value generator that produces version-7 UUIDs for primary keys.
///
/// UUIDv7 encodes a millisecond-precision Unix timestamp in the high bits, giving:
///   - Monotonic ordering within a single node (no B-tree fragmentation).
///   - Offline-safe uniqueness across N client devices without coordination.
///   - Sortable IDs that make pagination cursor strategies trivial.
///
/// <see cref="Guid.CreateVersion7()"/> is available since .NET 9 and is cryptographically
/// random in the low 74 bits, so collision probability is negligible.
/// </summary>
internal sealed class UuidV7ValueGenerator : ValueGenerator<Guid>
{
    /// <summary>
    /// False — UUIDv7 values are permanent and do not need a server round-trip to resolve.
    /// Setting this to true would cause EF Core to treat the value as a placeholder.
    /// </summary>
    public override bool GeneratesTemporaryValues => false;

    public override Guid Next(EntityEntry entry) => Guid.CreateVersion7();
}
