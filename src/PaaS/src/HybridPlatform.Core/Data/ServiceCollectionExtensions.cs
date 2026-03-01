using HybridPlatform.Core.Abstractions;
using HybridPlatform.Core.Data.Providers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace HybridPlatform.Core.Data;

public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers <see cref="HybridDbContext"/> and <see cref="IDataStore"/> with the
    /// supplied <paramref name="provider"/> strategy.
    ///
    /// Usage — Tier 1 (API):
    /// <code>
    ///   services.AddHybridData(new PostgresDatabaseProvider(connString));
    /// </code>
    ///
    /// Usage — Tier 2 (Avalonia Shell):
    /// <code>
    ///   services.AddHybridData(new SqliteDatabaseProvider(dbPath));
    /// </code>
    /// </summary>
    public static IServiceCollection AddHybridData(
        this IServiceCollection services,
        IDatabaseProvider provider)
    {
        services.AddSingleton(provider);

        services.AddDbContext<HybridDbContext>(
            options => provider.Configure(options),
            contextLifetime: ServiceLifetime.Scoped,
            optionsLifetime: ServiceLifetime.Singleton);

        // Expose the narrow IDataStore contract; callers don't need the full DbContext.
        services.AddScoped<IDataStore>(sp => sp.GetRequiredService<HybridDbContext>());

        return services;
    }
}
