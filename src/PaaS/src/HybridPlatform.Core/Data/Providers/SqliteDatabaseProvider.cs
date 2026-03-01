using Microsoft.EntityFrameworkCore;

namespace HybridPlatform.Core.Data.Providers;

/// <summary>
/// Configures EF Core for SQLite — the Tier-2 (Avalonia shell) local store.
///
/// WAL mode is critical for mobile/desktop: it allows concurrent reads during
/// background SyncManager writes without a table-level lock.
/// </summary>
public sealed class SqliteDatabaseProvider(string databasePath) : IDatabaseProvider
{
    public DatabaseBackend Backend => DatabaseBackend.SQLite;

    public void Configure(DbContextOptionsBuilder builder) =>
        builder.UseSqlite(BuildConnectionString(databasePath), sqlite =>
        {
            sqlite.MigrationsAssembly("HybridPlatform.Shell");
        });

    private static string BuildConnectionString(string path) =>
        // WAL journal mode + foreign key enforcement are applied via the connection string
        // so they activate on every connection, including those opened by EF Core's pool.
        $"Data Source={path};Mode=ReadWriteCreate;Cache=Shared;Foreign Keys=True;Journal Mode=WAL";
}
