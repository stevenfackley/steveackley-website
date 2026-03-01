using System.Text;
using HybridPlatform.Api.Middleware;
using HybridPlatform.Api.Services;
using HybridPlatform.Core.Data;
using HybridPlatform.Core.Data.Providers;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Npgsql;

var builder = WebApplication.CreateSlimBuilder(args);

// ──────────────────────────────────────────────────────────────────────────────
// Multi-Tenant Database (CockroachDB via Npgsql)
// ──────────────────────────────────────────────────────────────────────────────

var connectionString = builder.Configuration.GetConnectionString("CockroachDB")
    ?? throw new InvalidOperationException("CockroachDB connection string missing");

// NpgsqlDataSource: Connection pooling with multiplexing support (CockroachDB requirement)
var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
dataSourceBuilder.EnableDynamicJson(); // Required for JSONB column support
var dataSource = dataSourceBuilder.Build();

builder.Services.AddSingleton(dataSource);
builder.Services.AddHybridData(new PostgresDatabaseProvider(connectionString));

// ──────────────────────────────────────────────────────────────────────────────
// Zero-Trust JWT Authentication
// ──────────────────────────────────────────────────────────────────────────────

var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("JWT secret missing");
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "HybridPlatform.Api";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "HybridPlatform.Client";

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.Zero // Strict expiration validation
        };

        // Enable JWT via query string for WebSocket upgrade requests
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/sync"))
                {
                    context.Token = accessToken;
                }
                
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// ──────────────────────────────────────────────────────────────────────────────
// API Services
// ──────────────────────────────────────────────────────────────────────────────

builder.Services.AddSingleton<FleetManagementService>();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// ──────────────────────────────────────────────────────────────────────────────
// Build & Configure Pipeline
// ──────────────────────────────────────────────────────────────────────────────

var app = builder.Build();

// Zero-Trust: All routes require authentication by default
app.UseAuthentication();
app.UseAuthorization();

// Multi-tenant schema routing middleware (must run AFTER authentication)
app.UseMiddleware<TenantSchemaMiddleware>();

app.MapControllers();

// Health check endpoint (public, no auth required)
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
   .AllowAnonymous();

app.Run();
