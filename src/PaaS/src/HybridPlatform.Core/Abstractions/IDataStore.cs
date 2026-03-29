using HybridPlatform.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace HybridPlatform.Core.Abstractions;

/// <summary>
/// Minimal surface for persisting and querying <see cref="BaseEntity"/> subtypes.
///
/// Keeping this narrow (no UoW, no repo-per-entity) allows:
///   - <see cref="HybridDbContext"/> to implement it directly.
///   - In-memory fakes to implement it cheaply in tests without a full EF Core stack.
///
/// Do NOT expose <c>Database</c>, <c>ChangeTracker</c>, or provider-specific APIs here;
/// those belong in the concrete <see cref="HybridDbContext"/> used inside migrations
/// and the SyncManager.
/// </summary>
public interface IDataStore
{
    /// <summary>Returns the tracked <see cref="DbSet{T}"/> for the given entity type.</summary>
    DbSet<T> Set<T>() where T : BaseEntity;

    /// <summary>
    /// Gives access to the <see cref="EntityEntry{T}"/> for state inspection and
    /// explicit state transitions — needed by the SyncManager to flip
    /// <see cref="SyncStatus.Pending"/> → <see cref="SyncStatus.Synced"/> without
    /// triggering the auto-stamp interceptor.
    /// </summary>
    EntityEntry<T> Entry<T>(T entity) where T : class;

    /// <summary>Persists all tracked changes. Auto-stamps <see cref="BaseEntity.LastModifiedUtc"/>.</summary>
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
