using System;
using System.IO;
using System.Security.Cryptography;
using System.Threading.Tasks;
using HybridPlatform.Core.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace HybridPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PluginsController : ControllerBase
{
    private readonly HybridDbContext _dbContext;
    private readonly ILogger<PluginsController> _logger;

    public PluginsController(HybridDbContext dbContext, ILogger<PluginsController> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    [HttpPost("upload")]
    [Authorize]
    [RequestSizeLimit(5_000_000)] // 5MB max
    public async Task<IActionResult> UploadPlugin(IFormFile wasmFile)
    {
        var tenantId = User.FindFirst("tid")?.Value;
        if (string.IsNullOrEmpty(tenantId))
            return BadRequest("Missing tenant identification.");

        var pluginId = Guid.NewGuid().ToString();
        
        // In a real implementation, upload to Blob Storage here
        // await _blobStorage.UploadAsync($"plugins/{tenantId}/{pluginId}.wasm", wasmFile.OpenReadStream());
        
        var sha256 = await ComputeSha256Async(wasmFile.OpenReadStream());

        _logger.LogInformation("Plugin {PluginId} uploaded for tenant {TenantId}. Hash: {Hash}", pluginId, tenantId, sha256);
        
        return Ok(new { pluginId, status = "PendingReview", sha256 });
    }

    private static async Task<string> ComputeSha256Async(Stream stream)
    {
        using var sha256 = SHA256.Create();
        var bytes = await sha256.ComputeHashAsync(stream);
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}