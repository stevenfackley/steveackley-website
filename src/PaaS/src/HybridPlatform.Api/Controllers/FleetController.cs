using HybridPlatform.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HybridPlatform.Api.Controllers;

/// <summary>
/// Fleet Management API: Remote device control via poison pill pattern.
///
/// Endpoints:
///   POST /fleet/wipe/{deviceId}    - Issue remote wipe (admin only)
///   GET  /fleet/status/{deviceId}  - Poll for pending commands (device client)
///   POST /fleet/ack/{deviceId}     - Acknowledge command execution (device client)
///   GET  /fleet/commands           - List all active commands (admin only)
/// </summary>
[ApiController]
[Route("fleet")]
[Authorize]
public sealed class FleetController(
    FleetManagementService fleetService,
    ILogger<FleetController> logger) : ControllerBase
{
    /// <summary>
    /// Issues a remote wipe command for the specified device.
    /// Requires "admin" role in JWT claims.
    /// </summary>
    [HttpPost("wipe/{deviceId}")]
    [Authorize(Roles = "admin")]
    public IActionResult IssueWipe(string deviceId)
    {
        var issuedBy = User.Identity?.Name ?? "unknown";
        fleetService.IssueWipe(deviceId, issuedBy);

        logger.LogWarning(
            "Remote wipe issued: DeviceId={DeviceId}, IssuedBy={IssuedBy}, TenantId={TenantId}",
            deviceId,
            issuedBy,
            HttpContext.Items["TenantId"]);

        return Ok(new { message = "Wipe command issued", deviceId, issuedBy, issuedAt = DateTime.UtcNow });
    }

    /// <summary>
    /// Retrieves pending command for the requesting device.
    /// Called by device clients every 30s.
    /// </summary>
    [HttpGet("status/{deviceId}")]
    public IActionResult GetStatus(string deviceId)
    {
        var command = fleetService.GetPendingCommand(deviceId);

        if (command is null)
        {
            return Ok(new { status = "ok", command = (string?)null });
        }

        return Ok(new
        {
            status = "command_pending",
            command = new
            {
                action = command.Action.ToString().ToLowerInvariant(),
                issuedAt = command.IssuedAtUtc,
                expiresAt = command.ExpiresAtUtc,
                issuedBy = command.IssuedBy
            }
        });
    }

    /// <summary>
    /// Device acknowledges command execution.
    /// Removes command from pending queue.
    /// </summary>
    [HttpPost("ack/{deviceId}")]
    public IActionResult AcknowledgeCommand(string deviceId)
    {
        fleetService.AcknowledgeCommand(deviceId);
        logger.LogInformation("Device {DeviceId} acknowledged command", deviceId);
        return Ok(new { message = "Command acknowledged" });
    }

    /// <summary>
    /// Returns all active fleet commands (admin monitoring).
    /// </summary>
    [HttpGet("commands")]
    [Authorize(Roles = "admin")]
    public IActionResult GetAllCommands()
    {
        var commands = fleetService.GetAllActiveCommands();
        return Ok(commands);
    }
}
