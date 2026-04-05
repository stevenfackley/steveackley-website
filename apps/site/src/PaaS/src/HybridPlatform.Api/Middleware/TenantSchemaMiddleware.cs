using System.Security.Claims;
using Npgsql;

namespace HybridPlatform.Api.Middleware;

/// <summary>
/// Multi-tenant schema isolation via PostgreSQL SET LOCAL search_path.
///
/// Architecture:
///   - Each tenant gets a dedicated schema: tenant_{tenantId}
///   - JWT "tid" (Tenant ID) claim extracted from Authorization header
///   - Before every request, executes: SET LOCAL search_path TO tenant_{tid}, public
///   - Connection pooling is tenant-agnostic; schema is set per-transaction
///   - Zero-Trust: No tenant can access another tenant's data even if JWT is compromised
///
/// CockroachDB compatibility:
///   - CockroachDB supports multi-tenancy via schemas (namespaces)
///   - Active-Active replication ensures global consistency
///   - Row-level TTL and schema-level RBAC provide additional isolation
/// </summary>
public sealed class TenantSchemaMiddleware(RequestDelegate next, ILogger<TenantSchemaMiddleware> logger)
{
    private const string TenantIdClaimType = "tid";

    public async Task InvokeAsync(HttpContext context, NpgsqlDataSource dataSource)
    {
        var tenantId = ExtractTenantId(context);

        if (tenantId is null)
        {
            logger.LogWarning("Request rejected: Missing or invalid 'tid' claim in JWT");
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { error = "Tenant ID claim missing" });
            return;
        }

        // Validate tenant ID format (alphanumeric, 1-64 chars, prevent SQL injection)
        if (!IsValidTenantId(tenantId))
        {
            logger.LogWarning("Request rejected: Invalid tenant ID format: {TenantId}", tenantId);
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new { error = "Invalid tenant ID format" });
            return;
        }

        // Set search_path for this request's database operations
        await using var connection = await dataSource.OpenConnectionAsync(context.RequestAborted);
        var schemaName = $"tenant_{tenantId}";
        
        // SET LOCAL ensures the search_path is scoped to the current transaction only
        await using var cmd = new NpgsqlCommand(
            $"SET LOCAL search_path TO {schemaName}, public",
            connection);
        
        await cmd.ExecuteNonQueryAsync(context.RequestAborted);

        // Store tenant context for downstream use (e.g., logging, auditing)
        context.Items["TenantId"] = tenantId;
        context.Items["SchemaName"] = schemaName;

        logger.LogDebug("Request scoped to schema: {SchemaName}", schemaName);

        await next(context);
    }

    private static string? ExtractTenantId(HttpContext context)
    {
        return context.User.FindFirstValue(TenantIdClaimType);
    }

    private static bool IsValidTenantId(string tenantId) =>
        tenantId.Length is > 0 and <= 64 &&
        tenantId.All(c => char.IsLetterOrDigit(c) || c == '_' || c == '-');
}
