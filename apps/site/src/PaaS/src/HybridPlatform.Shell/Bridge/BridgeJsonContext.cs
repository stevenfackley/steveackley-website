using System.Text.Json.Serialization;

namespace HybridPlatform.Shell.Bridge;

/// <summary>
/// Source-generated JSON serialization context for all bridge message types.
///
/// This is REQUIRED for Native AOT correctness. The default reflection-based
/// <c>JsonSerializer</c> is disabled in this project
/// (<c>JsonSerializerIsReflectionEnabledByDefault=false</c>) to prevent the
/// AOT linker from retaining type metadata for the entire object graph.
///
/// When adding new strongly-typed request/response pairs to bridge handlers,
/// add corresponding <c>[JsonSerializable]</c> attributes here.
/// </summary>
[JsonSerializable(typeof(BridgeMessage))]
[JsonSerializable(typeof(BridgeResponse))]
[JsonSourceGenerationOptions(
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    WriteIndented = false)]
internal sealed partial class BridgeJsonContext : JsonSerializerContext;
