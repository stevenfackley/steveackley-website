using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace HybridPlatform.Api.AIOps;

public class CanaryDeployment
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TenantId { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string PayloadUrl { get; set; } = string.Empty;
    public string RollbackVersion { get; set; } = string.Empty;
    public List<CanaryStage> Stages { get; set; } = new();
    public int CurrentStageIndex { get; set; } = 0;
    public string Status { get; set; } = "IN_PROGRESS"; // IN_PROGRESS, COMPLETED, ROLLED_BACK
    
    public object CanaryManifest => new
    {
        version = Version,
        platforms = new { all = new { payloadUrl = PayloadUrl } }
    };
}

public class CanaryStage
{
    public string Name { get; set; } = string.Empty;
    public int Percentage { get; set; }
    public int DurationMinutes { get; set; }
    public double ErrorThreshold { get; set; }
}

public class CanaryService
{
    private readonly ILogger<CanaryService> _logger;
    private readonly Dictionary<string, CanaryDeployment> _activeDeployments = new();

    public CanaryService(ILogger<CanaryService> logger)
    {
        _logger = logger;
    }

    public Task<CanaryDeployment?> GetActiveCanaryAsync(string tenantId)
    {
        _activeDeployments.TryGetValue(tenantId, out var canary);
        return Task.FromResult(canary);
    }

    public bool IsDeviceInCurrentTier(Guid deviceId, CanaryDeployment canary)
    {
        if (canary.CurrentStageIndex >= canary.Stages.Count) return true;
        
        var currentStage = canary.Stages[canary.CurrentStageIndex];
        return IsDeviceInTier(deviceId, canary.TenantId, canary.Version, currentStage.Percentage);
    }

    private bool IsDeviceInTier(Guid deviceUuid, string tenantId, string version, int percentageThreshold)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes($"{deviceUuid}:{tenantId}:{version}"));
        var hashValue = BitConverter.ToUInt32(hash, 0);
        var percentage = (hashValue / (double)uint.MaxValue) * 100;
        return percentage < percentageThreshold;
    }

    public async Task StartCanaryDeploymentAsync(CanaryDeployment deployment)
    {
        _activeDeployments[deployment.TenantId] = deployment;
        _logger.LogInformation("Started canary deployment {Version} for tenant {TenantId}", deployment.Version, deployment.TenantId);
        await Task.CompletedTask;
    }

    public async Task RollbackCanaryAsync(string tenantId)
    {
        if (_activeDeployments.TryGetValue(tenantId, out var canary))
        {
            canary.Status = "ROLLED_BACK";
            _logger.LogWarning("Rolled back canary deployment {Version} for tenant {TenantId}", canary.Version, tenantId);
        }
        await Task.CompletedTask;
    }
}