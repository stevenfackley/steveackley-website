using System;

namespace HybridPlatform.Api.Models;

public class TelemetryMetric
{
    public long Id { get; set; }
    public string TenantId { get; set; } = string.Empty;
    public Guid DeviceId { get; set; }
    public DateTime Timestamp { get; set; }
    
    public double TotalSessions { get; set; }
    public double AvgSessionDurationSec { get; set; }
    public double SyncCount { get; set; }
    public double CrashCount { get; set; }
    public double P2pConnections { get; set; }
}