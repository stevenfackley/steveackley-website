using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HybridPlatform.Api.Models;
using HybridPlatform.Core.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HybridPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TelemetryController : ControllerBase
{
    private readonly HybridDbContext _dbContext;
    private readonly ILogger<TelemetryController> _logger;

    public TelemetryController(HybridDbContext dbContext, ILogger<TelemetryController> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    [HttpPost("submit")]
    [Authorize]
    public async Task<IActionResult> SubmitTelemetry([FromBody] Dictionary<string, double> metrics)
    {
        var tenantId = User.FindFirst("tid")?.Value;
        var deviceIdString = User.FindFirst("device_id")?.Value;
        
        if (string.IsNullOrEmpty(tenantId) || string.IsNullOrEmpty(deviceIdString) || !Guid.TryParse(deviceIdString, out var deviceId))
            return BadRequest("Missing tenant or device identification.");

        var metric = new TelemetryMetric
        {
            TenantId = tenantId,
            DeviceId = deviceId,
            Timestamp = DateTime.UtcNow,
            TotalSessions = metrics.GetValueOrDefault("total_sessions"),
            AvgSessionDurationSec = metrics.GetValueOrDefault("avg_session_duration_sec"),
            SyncCount = metrics.GetValueOrDefault("sync_count"),
            CrashCount = metrics.GetValueOrDefault("crash_count"),
            P2pConnections = metrics.GetValueOrDefault("p2p_connections")
        };

        // Note: For full TimescaleDB integration, ensure TelemetryMetrics is configured in DbContext
        await _dbContext.Set<TelemetryMetric>().AddAsync(metric);
        await _dbContext.SaveChangesAsync();

        if (metrics.GetValueOrDefault("crash_count") > 5)
        {
            _logger.LogWarning("High crash rate detected for device {DeviceId} in tenant {TenantId}", deviceId, tenantId);
        }

        return Ok();
    }

    [HttpGet("dashboard/{tenantId}")]
    [Authorize] // Roles = "TenantAdmin"
    public async Task<IActionResult> GetTelemetryDashboard(string tenantId)
    {
        var last24Hours = DateTime.UtcNow.AddHours(-24);
        
        var metricsQuery = _dbContext.Set<TelemetryMetric>().Where(m => m.TenantId == tenantId && m.Timestamp >= last24Hours);
        
        var metrics = await metricsQuery.ToListAsync();
        
        if (!metrics.Any())
            return Ok(new { Message = "No data for the last 24 hours" });

        var dashboard = new
        {
            TotalDevices = metrics.Select(m => m.DeviceId).Distinct().Count(),
            TotalSessions = metrics.Sum(m => m.TotalSessions),
            AvgSessionDuration = metrics.Average(m => m.AvgSessionDurationSec),
            TotalSyncs = metrics.Sum(m => m.SyncCount),
            TotalCrashes = metrics.Sum(m => m.CrashCount),
            AvgP2pConnections = metrics.Average(m => m.P2pConnections)
        };

        return Ok(dashboard);
    }
}