using System.Text.Json.Serialization;

namespace HybridPlatform.Core.SyncEngine;

/// <summary>
/// Source-generated JSON context for all internal sync engine types.
/// AOT-safe: no reflection required at runtime.
/// </summary>
[JsonSerializable(typeof(ODataBatchRequest))]
[JsonSerializable(typeof(ODataBatchResponse))]
[JsonSerializable(typeof(ODataCollectionResponse<EntityTimestamp>))]
[JsonSourceGenerationOptions(
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    WriteIndented = false)]
internal sealed partial class SyncJsonContext : JsonSerializerContext;
