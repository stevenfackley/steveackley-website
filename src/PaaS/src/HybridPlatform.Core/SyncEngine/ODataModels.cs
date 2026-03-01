using System.Text.Json;
using System.Text.Json.Serialization;

namespace HybridPlatform.Core.SyncEngine;

// ── OData 4.01 JSON Batch request ──────────────────────────────────────────────
// POST /odata/$batch
// Content-Type: application/json
//
// {
//   "requests": [
//     { "id": "1", "method": "PATCH", "url": "Posts(guid)", "headers": {...}, "body": {...} }
//   ]
// }

internal sealed class ODataBatchRequest
{
    [JsonPropertyName("requests")]
    public required IReadOnlyList<ODataBatchRequestItem> Requests { get; init; }
}

internal sealed class ODataBatchRequestItem
{
    /// <summary>
    /// Client-assigned correlation ID. Echoed back in the response so results
    /// can be matched to their originating <see cref="SyncItem"/> without
    /// relying on response ordering.
    /// </summary>
    [JsonPropertyName("id")]
    public required string Id { get; init; }

    [JsonPropertyName("method")]
    public required string Method { get; init; }   // "POST" | "PATCH" | "GET"

    /// <summary>Relative URL from the OData service root, e.g. <c>Posts(guid)</c>.</summary>
    [JsonPropertyName("url")]
    public required string Url { get; init; }

    [JsonPropertyName("headers")]
    public Dictionary<string, string>? Headers { get; init; }

    /// <summary>
    /// Raw JSON body. Stored as <see cref="JsonElement"/> to avoid double-serialisation —
    /// the entity was already serialised by the handler, so we parse it back to embed
    /// it as a literal JSON node in the batch envelope.
    /// </summary>
    [JsonPropertyName("body")]
    public JsonElement? Body { get; init; }
}

// ── OData 4.01 JSON Batch response ─────────────────────────────────────────────

internal sealed class ODataBatchResponse
{
    [JsonPropertyName("responses")]
    public IReadOnlyList<ODataBatchResponseItem> Responses { get; init; } = [];
}

internal sealed class ODataBatchResponseItem
{
    [JsonPropertyName("id")]
    public string Id { get; init; } = string.Empty;

    [JsonPropertyName("status")]
    public int Status { get; init; }

    [JsonPropertyName("body")]
    public JsonElement? Body { get; init; }
}

// ── OData timestamp projection (used by the LWW pre-check query) ───────────────
// GET /odata/Posts?$filter=Id in (guid,guid)&$select=Id,LastModifiedUtc
// →  { "value": [ { "id": "guid", "lastModifiedUtc": "..." }, ... ] }

internal sealed class ODataCollectionResponse<T>
{
    [JsonPropertyName("value")]
    public IReadOnlyList<T> Value { get; init; } = [];
}

internal sealed class EntityTimestamp
{
    [JsonPropertyName("id")]
    public Guid Id { get; init; }

    [JsonPropertyName("lastModifiedUtc")]
    public DateTime LastModifiedUtc { get; init; }
}

// ── Full server record response (used by the ServerWins fetch) ──────────────────
// GET /odata/Posts(guid)
// → { "id": "...", "lastModifiedUtc": "...", ... }
// Body is kept as raw JsonElement and passed to ISyncEntityHandler.ApplyServerStateAsync.
