using System.Text.Json;
using System.Text.Json.Serialization;

namespace HybridPlatform.Shell.Bridge;

/// <summary>
/// Inbound JSON envelope sent from Blazor WASM via <c>window.hybridBridge.invoke()</c>.
///
/// JavaScript contract:
/// <code>
///   const result = await window.hybridBridge.invoke("GetDeviceInfo", {});
/// </code>
///
/// Wire format:
/// <code>
///   { "id": "uuid-v4-call-id", "method": "GetDeviceInfo", "payload": {} }
/// </code>
///
/// The <see cref="Id"/> is a client-generated correlation ID that is echoed back in
/// <see cref="BridgeResponse.Id"/> so the JS Promise resolver can match the response.
/// </summary>
public sealed record BridgeMessage
{
    [JsonPropertyName("id")]
    public string Id { get; init; } = string.Empty;

    [JsonPropertyName("method")]
    public string Method { get; init; } = string.Empty;

    /// <summary>
    /// Raw JSON payload. Each registered handler deserialises this into its own
    /// strongly-typed request type using the source-generated context.
    /// Keeping it as <see cref="JsonElement"/> avoids a second full parse when
    /// the method is unknown (fast-path rejection without deserialisation).
    /// </summary>
    [JsonPropertyName("payload")]
    public JsonElement Payload { get; init; }
}

/// <summary>
/// Outbound JSON response posted back to the WebView via <c>ExecuteScriptAsync</c>.
///
/// Wire format (success): <c>{ "id": "...", "result": {...}, "error": null }</c>
/// Wire format (failure): <c>{ "id": "...", "result": null, "error": "message" }</c>
/// </summary>
public sealed record BridgeResponse
{
    [JsonPropertyName("id")]
    public string Id { get; init; } = string.Empty;

    /// <summary>
    /// Raw JSON result. Handlers return a pre-serialised JSON string to avoid
    /// a second allocation layer — the bridge wraps it as a literal JSON value.
    /// </summary>
    [JsonPropertyName("result")]
    public JsonElement? Result { get; init; }

    [JsonPropertyName("error")]
    public string? Error { get; init; }
}
