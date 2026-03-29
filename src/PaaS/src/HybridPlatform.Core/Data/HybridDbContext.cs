using HybridPlatform.Core.Abstractions;
using HybridPlatform.Core.Data.Providers;
using HybridPlatform.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace HybridPlatform.Core.Data;

/// <summary>
/// Single EF Core context shared across Tier-1 (PostgreSQL) and Tier-2 (SQLite).
///
/// Provider selection is handled entirely by the injected <see cref="IDatabaseProvider"/>;
/// no provider-specific code exists in this class. The same migration baseline can be
/// seeded from either engine.
///
/// Auto-stamp behaviour (see <see cref="StampModifiedEntities"/>):
///   On every SaveChanges call, Added and Modified <see cref="BaseEntity"/> rows receive
///   an updated <see cref="BaseEntity.LastModifiedUtc"/> (UTC). Modified rows are also
///   marked <see cref="SyncStatus.Pending"/> so the SyncManager picks them up.
///   This hook is intentionally bypassed when the SyncManager flips a row to
///   <see cref="SyncStatus.Synced"/> — it achieves this by modifying the column value
///   directly via <see cref="IDataStore.Entry{T}"/> and calling
///   <see cref="EntityEntry.Property"/> to mark only that scalar as modified.
/// </summary>
public sealed class HybridDbContext(IDatabaseProvider provider) : DbContext, IDataStore
{
    // ── DbSet<T> declarations go here as domain entities are added ──────────────
    // public DbSet<Post> Posts => Set<Post>();

    // ── EF Core configuration ────────────────────────────────────────────────────

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
            provider.Configure(optionsBuilder);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        ApplyBaseEntityConventions(modelBuilder);
    }

    /// <summary>
    /// Applies UUIDv7 value generation, timestamp column types, and the
    /// <see cref="SyncStatus"/> index to every <see cref="BaseEntity"/> subtype
    /// discovered by EF Core's model scan.
    ///
    /// Column type selection is provider-aware:
    ///   - PostgreSQL: <c>uuid</c> for Id, <c>timestamptz</c> for LastModifiedUtc.
    ///   - SQLite:     <c>TEXT</c> for Id (stored as hyphenated UUID string),
    ///                 <c>TEXT</c> for LastModifiedUtc (ISO-8601, round-trips via converter).
    /// </summary>
    private void ApplyBaseEntityConventions(ModelBuilder modelBuilder)
    {
        bool isPostgres = provider.Backend == DatabaseBackend.PostgreSQL;

        foreach (var entityType in modelBuilder.Model.GetEntityTypes()
            .Where(et => et.ClrType.IsAssignableTo(typeof(BaseEntity))))
        {
            var entity = modelBuilder.Entity(entityType.ClrType);

            // ── Primary key: UUIDv7, client-generated ──────────────────────────
            entity.Property(nameof(BaseEntity.Id))
                  .HasValueGenerator<UuidV7ValueGenerator>()
                  .ValueGeneratedOnAdd();

            // ── LastModifiedUtc: UTC-aware column type ─────────────────────────
            // PostgreSQL `timestamptz` stores in UTC and returns DateTimeKind.Utc natively.
            // SQLite TEXT requires an explicit converter to preserve DateTimeKind.
            if (isPostgres)
            {
                entity.Property(nameof(BaseEntity.LastModifiedUtc))
                      .HasColumnType("timestamptz");
            }
            else
            {
                entity.Property(nameof(BaseEntity.LastModifiedUtc))
                      .HasColumnType("TEXT")
                      .HasConversion(
                          v => v.ToUniversalTime().ToString("O"),        // write: ISO-8601 UTC
                          v => DateTime.Parse(v,                          // read: restore Kind=Utc
                                   null,
                                   System.Globalization.DateTimeStyles.RoundtripKind));
            }

            // ── SyncStatus index: the SyncManager scans this column on every cycle ──
            entity.HasIndex(nameof(BaseEntity.SyncStatus))
                  .HasDatabaseName($"ix_{entityType.GetTableName()}_sync_status");
        }
    }

    // ── SaveChanges intercept ────────────────────────────────────────────────────

    /// <inheritdoc cref="StampModifiedEntities"/>
    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        StampModifiedEntities();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override ValueTask<int> SaveChangesAsync(
        bool acceptAllChangesOnSuccess,
        CancellationToken cancellationToken = default)
    {
        StampModifiedEntities();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    /// <summary>
    /// Auto-stamps <see cref="BaseEntity.LastModifiedUtc"/> and flips
    /// <see cref="SyncStatus"/> to <see cref="SyncStatus.Pending"/> for every
    /// dirty <see cref="BaseEntity"/> in the current unit of work.
    ///
    /// Single timestamp captured once per SaveChanges call (not per-row) to keep
    /// the LWW discriminator consistent within a batch.
    /// </summary>
    private void StampModifiedEntities()
    {
        var now = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries<BaseEntity>()
            .Where(e => e.State is EntityState.Added or EntityState.Modified))
        {
            entry.Entity.LastModifiedUtc = now;

            if (entry.State == EntityState.Modified)
                entry.Entity.SyncStatus = SyncStatus.Pending;
        }
    }

    // ── IDataStore explicit implementation ──────────────────────────────────────

    Task<int> IDataStore.SaveChangesAsync(CancellationToken cancellationToken) =>
        SaveChangesAsync(cancellationToken);

    EntityEntry<T> IDataStore.Entry<T>(T entity) => Entry(entity);
}
