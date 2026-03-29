using System.Collections.Concurrent;

namespace HybridPlatform.Api.Services;

/// <summary>
/// Fleet Management: Remote device wipe via "poison pill" broadcast.
///
/// Architecture:
///   - Admin sends POST /fleet/wipe/{deviceId} → Stores wipe command in distributed cache
///   - Shell polls GET /fleet/status/{deviceId} every 30s → Receives wipe signal
///   - Shell executes local wipe: drops SQLite DB, clears keychain, exits process
///   - Zero-Trust: Only devices with valid JWTs matching tenant scope can poll
///
/// Scalability:
///   - In-memory ConcurrentDictionary for MVP (single-replica API)
///   - Production: Replace with Redis Pub/Sub or Valkey for multi-region broadcast
///   - CockroachDB table alternative: `fleet_commands` with TTL=5min for ephemeral commands
/// </summary>
public sealed class FleetManagementService
{
    private readonly ConcurrentDictionary<string, FleetCommand> _commands = new();
    private readonly ILogger<FleetManagementService> _logger;

    public FleetManagementService(ILogger<FleetManagementService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Issues a remote wipe command for the specified device.
    /// Commands expire after 24 hours (device must poll within this window).
    /// </summary>
    public void IssueWipe(string deviceId, string issuedBy)
    {
        var command = new FleetCommand
        {
            DeviceId = deviceId,
            Action = FleetAction.Wipe,
            IssuedAtUtc = DateTime.UtcNow,
            IssuedBy = issuedBy,
            ExpiresAtUtc = DateTime.UtcNow.AddHours(24)
        };

        _commands[deviceId] = command;
        _logger.LogWarning("REMOTE WIPE issued for device {DeviceId} by {IssuedBy}", deviceId, issuedBy);
    }

    /// <summary>
    /// Retrieves the pending command for a device, if any.
    /// Expired commands are automatically removed.
    /// </summary>
    public FleetCommand? GetPendingCommand(string deviceId)
    {
        if (!_commands.TryGetValue(deviceId, out var command))
            return null;

        // Auto-expire stale commands
        if (DateTime.UtcNow > command.ExpiresAtUtc)
        {
            _commands.TryRemove(deviceId, out _);
            _logger.LogInformation("Expired command removed for device {DeviceId}", deviceId);
            return null;
        }

        return command;
    }

    /// <summary>
    /// Acknowledges command execution by the device (removes from pending queue).
    /// </summary>
    public void AcknowledgeCommand(string deviceId)
    {
        if (_commands.TryRemove(deviceId, out var command))
        {
            _logger.LogInformation(
                "Device {DeviceId} acknowledged {Action} command (issued at {IssuedAt})",
                deviceId,
                command.Action,
                command.IssuedAtUtc);
        }
    }

    /// <summary>
    /// Returns all active commands for monitoring/auditing.
    /// </summary>
    public IReadOnlyCollection<FleetCommand> GetAllActiveCommands()
    {
        var now = DateTime.UtcNow;
        return _commands.Values
            .Where(c => c.ExpiresAtUtc > now)
            .ToList();
    }
}

public sealed record FleetCommand
{
    required public string DeviceId { get; init; }
    required public FleetAction Action { get; init; }
    required public DateTime IssuedAtUtc { get; init; }
    required public DateTime ExpiresAtUtc { get; init; }
    required public string IssuedBy { get; init; }
}

public enum FleetAction
{
    Wipe,
    Lock,
    UpdateConfig
}
