using Microsoft.EntityFrameworkCore;

namespace HybridPlatform.Core.Data.Providers;

/// <summary>
/// Configures EF Core for PostgreSQL 17 via Npgsql.
///
/// Retry policy (5 attempts) covers transient network blips in the Docker Compose network.
/// Migrations are scoped to <c>HybridPlatform.Api</c> so the Core library stays provider-agnostic.
/// </summary>
public sealed class PostgresDatabaseProvider(string connectionString) : IDatabaseProvider
{
    public DatabaseBackend Backend => DatabaseBackend.PostgreSQL;

    public void Configure(DbContextOptionsBuilder builder) =>
        builder.UseNpgsql(connectionString, npgsql =>
        {
            // Aggressive retry: PostgreSQL in Docker can be slow to accept connections on cold start.
            npgsql.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(10),
                errorCodesToAdd: null);

            // Keep migrations out of Core to avoid a provider dependency in the shared library.
            npgsql.MigrationsAssembly("HybridPlatform.Api");

            // Use Npgsql's native UUID support — maps Guid ↔ uuid column directly.
            // Combined with UUIDv7 value generation this produces index-friendly monotonic UUIDs.
        })
        .UseSnakeCaseNamingConvention();   // PostgreSQL convention: snake_case column names.
}
