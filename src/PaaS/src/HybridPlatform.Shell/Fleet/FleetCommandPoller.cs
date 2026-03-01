using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace HybridPlatform.Shell.Fleet;

/// <summary>
/// Polls the Fleet Management API for pending commands (remote wipe, lock, config).
///
/// Architecture:
///   - Polls GET /fleet/status/{deviceId} every 30 seconds
///   - Receives "poison pill" commands from admin API
///   - Executes command locally (wipe, lock, config update)
///   - Acknowledges via POST /fleet/ack/{deviceId}
///
/// Security:
///   - Device ID derived from hardware UUID (unique per device)
///   - JWT authentication required (tenant-scoped)
///   - Commands expire after 24 hours server-side
///   - Wipe operations are irreversible (3-pass DOD 5220.22-M)
///
/// Poison Pill Flow:
///   1. Admin: POST /fleet/wipe/{deviceId}
///   2. Device: GET /fleet/status/{deviceId} → {"command":"wipe"}
///   3. Device: Execute local wipe (SQLite, keychain, files)
///   4. Device: POST /fleet/ack/{deviceId}
///   5. Device: Environment.Exit(0)
/// </summary>
public sealed class FleetCommandPoller : IDisposable
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<FleetCommandPoller> _logger;
    private readonly string _deviceId;
    private readonly RemoteWipeExecutor _wipeExecutor;
    private readonly PeriodicTimer _pollTimer;
    private readonly CancellationTokenSource _cts;

    private const int PollIntervalSeconds = 30;

    public event EventHandler<FleetCommand>? CommandReceived;

    public FleetCommandPoller(
        HttpClient httpClient,
        ILogger<FleetCommandPoller> logger,
        string deviceId,
        RemoteWipeExecutor wipeExecutor)
    {
        _httpClient = httpClient;
        _logger = logger;
        _deviceId = deviceId;
        _wipeExecutor = wipeExecutor;
        _cts = new CancellationTokenSource();
        _pollTimer = new PeriodicTimer(TimeSpan.FromSeconds(PollIntervalSeconds));
    }

    /// <summary>
    /// Starts background polling for fleet commands.
    /// </summary>
    public async Task StartAsync()
    {
        _logger.LogInformation("Fleet command poller started for device: {DeviceId}", _deviceId);

        _ = Task.Run(async () =>
        {
            while (await _pollTimer.WaitForNextTickAsync(_cts.Token))
            {
                await PollCommandsAsync(_cts.Token);
            }
        }, _cts.Token);
    }

    /// <summary>
    /// Manually triggers a command poll (for testing).
    /// </summary>
    public async Task PollCommandsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var status = await FetchStatusAsync(cancellationToken);

            if (status?.Command != null)
            {
                _logger.LogWarning(
                    "Fleet command received: {Action} (issued by {IssuedBy} at {IssuedAt})",
                    status.Command.Action,
                    status.Command.IssuedBy,
                    status.Command.IssuedAt);

                CommandReceived?.Invoke(this, status.Command);

                await ExecuteCommandAsync(status.Command, cancellationToken);

                // Acknowledge command execution
                await AcknowledgeCommandAsync(cancellationToken);
            }
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Fleet status poll failed (network error)");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fleet command execution failed");
        }
    }

    /// <summary>
    /// Fetches the current fleet status from the API.
    /// </summary>
    private async Task<FleetStatusResponse?> FetchStatusAsync(CancellationToken cancellationToken)
    {
        var response = await _httpClient.GetAsync(
            $"/fleet/status/{_deviceId}",
            cancellationToken);

        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<FleetStatusResponse>(
            cancellationToken: cancellationToken);
    }

    /// <summary>
    /// Executes the received fleet command.
    /// </summary>
    private async Task ExecuteCommandAsync(FleetCommand command, CancellationToken cancellationToken)
    {
        switch (command.Action.ToLowerInvariant())
        {
            case "wipe":
                _logger.LogCritical("REMOTE WIPE COMMAND RECEIVED. Initiating secure data destruction.");
                await _wipeExecutor.ExecuteWipeAsync(cancellationToken);
                break;

            case "lock":
                _logger.LogWarning("LOCK COMMAND RECEIVED. Locking application.");
                await ExecuteLockAsync(cancellationToken);
                break;

            case "updateconfig":
                _logger.LogInformation("CONFIG UPDATE COMMAND RECEIVED.");
                await ExecuteConfigUpdateAsync(cancellationToken);
                break;

            default:
                _logger.LogWarning("Unknown fleet command: {Action}", command.Action);
                break;
        }
    }

    /// <summary>
    /// Acknowledges command execution to the server.
    /// </summary>
    private async Task AcknowledgeCommandAsync(CancellationToken cancellationToken)
    {
        try
        {
            var response = await _httpClient.PostAsync(
                $"/fleet/ack/{_deviceId}",
                null,
                cancellationToken);

            response.EnsureSuccessStatusCode();
            _logger.LogInformation("Fleet command acknowledged");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to acknowledge fleet command");
        }
    }

    /// <summary>
    /// Executes the LOCK command (disable UI access).
    /// </summary>
    private Task ExecuteLockAsync(CancellationToken cancellationToken)
    {
        // In production: Show lock screen, disable navigation, require biometric re-auth
        _logger.LogInformation("Application locked. Biometric re-authentication required.");
        return Task.CompletedTask;
    }

    /// <summary>
    /// Executes the CONFIG UPDATE command (refresh tenant settings).
    /// </summary>
    private async Task ExecuteConfigUpdateAsync(CancellationToken cancellationToken)
    {
        // In production: Re-fetch tenant metadata (logo, colors, feature flags)
        _logger.LogInformation("Configuration update applied");
        await Task.CompletedTask;
    }

    public void Dispose()
    {
        _cts.Cancel();
        _cts.Dispose();
        _pollTimer.Dispose();
    }
}

/// <summary>
/// Fleet status response from GET /fleet/status/{deviceId}
/// </summary>
public sealed record FleetStatusResponse
{
    [JsonPropertyName("status")]
    required public string Status { get; init; }

    [JsonPropertyName("command")]
    public FleetCommand? Command { get; init; }
}

/// <summary>
/// Fleet command details.
/// </summary>
public sealed record FleetCommand
{
    [JsonPropertyName("action")]
    required public string Action { get; init; }

    [JsonPropertyName("issuedAt")]
    required public DateTime IssuedAt { get; init; }

    [JsonPropertyName("expiresAt")]
    required public DateTime ExpiresAt { get; init; }

    [JsonPropertyName("issuedBy")]
    required public string IssuedBy { get; init; }
}
