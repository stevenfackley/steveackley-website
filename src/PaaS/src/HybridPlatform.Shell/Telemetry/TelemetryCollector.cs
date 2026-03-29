using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;

namespace HybridPlatform.Shell.Telemetry;

public class TelemetryEvent
{
    public string Type { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public Dictionary<string, object> Properties { get; set; } = new();
    public Guid DeviceId { get; set; }
}

public class TelemetryCollector
{
    private readonly ConcurrentBag<TelemetryEvent> _eventBuffer = new();
    private readonly Timer _flushTimer;
    private readonly Guid _deviceId;
    
    public TelemetryCollector()
    {
        _deviceId = Guid.NewGuid(); // Mock device ID
        // Flush every 15 minutes
        _flushTimer = new Timer(FlushEvents, null, TimeSpan.FromMinutes(15), TimeSpan.FromMinutes(15));
    }
    
    public void RecordEvent(string eventType, Dictionary<string, object> properties)
    {
        _eventBuffer.Add(new TelemetryEvent
        {
            Type = eventType,
            Timestamp = DateTime.UtcNow,
            Properties = properties,
            DeviceId = _deviceId
        });
    }
    
    private void FlushEvents(object? state)
    {
        if (_eventBuffer.IsEmpty) return;
        
        var events = _eventBuffer.ToArray();
        _eventBuffer.Clear();
        
        // Aggregate locally before applying noise
        var aggregates = AggregateEvents(events);
        
        // Apply Laplace noise (e-differential privacy)
        var noisyAggregates = ApplyDifferentialPrivacy(aggregates, epsilon: 0.1);
        
        // Transmit to backend
        // await _apiClient.PostTelemetryAsync(noisyAggregates);
        Console.WriteLine($"Transmitting {noisyAggregates.Count} noisy metrics to backend");
    }
    
    private Dictionary<string, double> AggregateEvents(TelemetryEvent[] events)
    {
        return new Dictionary<string, double>
        {
            ["total_sessions"] = events.Count(e => e.Type == "session_start"),
            ["avg_session_duration_sec"] = events
                .Where(e => e.Type == "session_end")
                .Average(e => e.Properties.ContainsKey("duration_sec") ? Convert.ToDouble(e.Properties["duration_sec"]) : 0.0),
            ["sync_count"] = events.Count(e => e.Type == "sync_completed"),
            ["crash_count"] = events.Count(e => e.Type == "crash"),
            ["p2p_connections"] = events
                .Where(e => e.Type == "p2p_connected")
                .Select(e => e.Properties.ContainsKey("peer_id") ? e.Properties["peer_id"]?.ToString() : null)
                .Where(id => id != null)
                .Distinct()
                .Count()
        };
    }
    
    private Dictionary<string, double> ApplyDifferentialPrivacy(
        Dictionary<string, double> aggregates, 
        double epsilon)
    {
        var noisy = new Dictionary<string, double>();
        var random = new Random();
        
        foreach (var kvp in aggregates)
        {
            // Laplace mechanism: sensitivity = 1, scale = 1/epsilon
            var scale = 1.0 / epsilon;
            var u = random.NextDouble() - 0.5;
            var noise = -scale * Math.Sign(u) * Math.Log(1 - 2 * Math.Abs(u));
            
            noisy[kvp.Key] = Math.Max(0, kvp.Value + noise); // Clamp to non-negative
        }
        
        return noisy;
    }
}