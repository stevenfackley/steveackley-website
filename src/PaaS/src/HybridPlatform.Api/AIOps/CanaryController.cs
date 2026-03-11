using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace HybridPlatform.Api.AIOps;

[ApiController]
[Route("api/[controller]")]
[Authorize] // Would be [Authorize(Roles = "PlatformAdmin,TenantAdmin")] in a real system
public class CanaryController : ControllerBase
{
    private readonly CanaryService _canaryService;
    private readonly ILogger<CanaryController> _logger;

    public CanaryController(CanaryService canaryService, ILogger<CanaryController> logger)
    {
        _canaryService = canaryService;
        _logger = logger;
    }

    [HttpPost("deploy")]
    public async Task<IActionResult> StartDeployment([FromBody] CanaryDeployment deployment)
    {
        if (string.IsNullOrEmpty(deployment.TenantId))
        {
            var tidClaim = User.FindFirst("tid");
            if (tidClaim != null)
                deployment.TenantId = tidClaim.Value;
            else
                return BadRequest("TenantId is required");
        }

        await _canaryService.StartCanaryDeploymentAsync(deployment);
        return Ok(new { deployment.Id, deployment.Status });
    }

    [HttpPost("rollback/{tenantId}")]
    public async Task<IActionResult> RollbackDeployment(string tenantId)
    {
        var activeCanary = await _canaryService.GetActiveCanaryAsync(tenantId);
        if (activeCanary == null)
            return NotFound("No active canary deployment found for tenant.");

        await _canaryService.RollbackCanaryAsync(tenantId);
        return Ok(new { Message = $"Deployment {activeCanary.Version} rolled back." });
    }
    
    [HttpGet("status/{tenantId}")]
    public async Task<IActionResult> GetStatus(string tenantId)
    {
        var canary = await _canaryService.GetActiveCanaryAsync(tenantId);
        if (canary == null)
            return NotFound(new { Message = "No active deployment" });
            
        return Ok(canary);
    }
}