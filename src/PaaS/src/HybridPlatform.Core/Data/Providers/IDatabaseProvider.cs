using Microsoft.EntityFrameworkCore;

namespace HybridPlatform.Core.Data.Providers;

/// <summary>
/// Strategy contract for EF Core provider configuration.
///
/// The DI container resolves the concrete implementation based on the deployment tier:
///   - Tier 1 (ASP.NET Core API)    → <see cref="PostgresDatabaseProvider"/>
///   - Tier 2 (Avalonia Shell)       → <see cref="SqliteDatabaseProvider"/>
///
/// <see cref="HybridDbContext"/> is therefore provider-agnostic: it never references
/// Npgsql or SQLite directly, ensuring the same migration baseline can be applied
/// against either engine.
/// </summary>
public interface IDatabaseProvider
{
    /// <summary>Identifies the underlying engine; used for provider-specific column type selection.</summary>
    DatabaseBackend Backend { get; }

    /// <summary>Configures <paramref name="builder"/> with the appropriate connection and options.</summary>
    void Configure(DbContextOptionsBuilder builder);
}

public enum DatabaseBackend { PostgreSQL, SQLite }
