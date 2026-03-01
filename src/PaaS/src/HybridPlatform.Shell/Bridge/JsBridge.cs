using System.Text.Json;
using Avalonia.Threading;
using Microsoft.Extensions.Logging;

namespace HybridPlatform.Shell.Bridge;

/// <summary>
/// Asynchronous JSON-RPC-style message bus between the Blazor WASM layer and native C# code.
///
/// ┌─────────────────────────────────────────────────────────────────────────────┐
/// │ Blazor WASM (JS)                         Avalonia Shell (C#)               │
/// │                                                                             │
/// │  window.hybridBridge.invoke(             JsBridge.HandleIncomingAsync()    │
/// │    "GetDeviceInfo", {})                    │                               │
/// │       │                                    ▼                               │
/// │       │ postMessage(JSON)          Dispatch to registered handler          │
/// │       │ ─────────────────────────►  handler(payload) → ValueTask<T>        │
/// │       │                                    │                               │
/// │       │ WebView executes JS        ExecuteScriptAsync(callbackJs)          │
/// │       │ ◄──────────────────────────        │                               │
/// │       ▼                                    │                               │
/// │  Promise.resolve(result)                   ▼                               │
/// └─────────────────────────────────────────────────────────────────────────────┘
///
/// Thread model:
///   Incoming messages arrive on the UI thread (WebView2 / WKWebView both guarantee this).
///   Handlers that need to do I/O should return a <see cref="ValueTask"/> and await
///   their work; the bridge re-marshals the response back to the UI thread before
///   dispatching to <c>ExecuteScriptAsync</c>.
///
/// Registration is open — handlers are added by feature modules during startup, not
/// hard-coded here. This keeps the bridge itself dependency-free.
/// </summary>
public sealed class JsBridge(ILogger<JsBridge> logger)
{
    // Delegate type for registered handlers.
    // Input:  raw JsonElement payload from the inbound message.
    // Output: a JsonElement to embed in the response, or throws on error.
    private delegate ValueTask<JsonElement> HandlerDelegate(
        JsonElement payload,
        CancellationToken cancellationToken);

    private readonly Dictionary<string, HandlerDelegate> _handlers = new(StringComparer.Ordinal);

    // Held so the bridge can call ExecuteScriptAsync to push responses back.
    // Set during WebView initialisation; must not be null when HandleIncomingAsync is called.
    private Func<string, Task>? _executeScript;

    // ── Registration ─────────────────────────────────────────────────────────

    /// <summary>
    /// Registers a strongly-typed handler for the given <paramref name="method"/> name.
    ///
    /// <example>
    /// <code>
    ///   bridge.Register("GetDeviceInfo",
    ///       (DeviceInfoRequest req, CancellationToken ct) =>
    ///           ValueTask.FromResult(deviceService.GetInfo()));
    /// </code>
    /// </example>
    ///
    /// <typeparamref name="TRequest"/> must be registered in
    /// <see cref="BridgeJsonContext"/> for AOT compatibility.
    /// </summary>
    public void Register<TRequest, TResponse>(
        string method,
        Func<TRequest, CancellationToken, ValueTask<TResponse>> handler,
        System.Text.Json.Serialization.Metadata.JsonTypeInfo<TRequest> requestMeta,
        System.Text.Json.Serialization.Metadata.JsonTypeInfo<TResponse> responseMeta)
    {
        ArgumentException.ThrowIfNullOrEmpty(method);

        _handlers[method] = async (payload, ct) =>
        {
            // Deserialise the raw JsonElement into TRequest using source-gen metadata.
            var request = payload.Deserialize(requestMeta)
                ?? throw new InvalidOperationException($"Null payload for method '{method}'.");

            var result = await handler(request, ct).ConfigureAwait(false);

            // Serialise the result back to a JsonElement for embedding in BridgeResponse.
            var json = JsonSerializer.Serialize(result, responseMeta);
            return JsonDocument.Parse(json).RootElement;
        };
    }

    // ── WebView wiring ────────────────────────────────────────────────────────

    /// <summary>
    /// Provides the delegate used to push responses back to the WebView.
    /// Call this during <c>CoreWebView2Initialized</c> / <c>WKWebViewCreated</c>.
    ///
    /// Also injects the JavaScript bridge bootstrap into every new page so Blazor
    /// can call <c>window.hybridBridge.invoke(method, payload)</c> as a Promise.
    /// </summary>
    public void Attach(Func<string, Task> executeScript)
    {
        _executeScript = executeScript;
    }

    /// <summary>
    /// Returns the JavaScript that must be injected into every document before
    /// Blazor bootstraps. Inject this via:
    ///   - WebView2: <c>CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync()</c>
    ///   - WKWebView: <c>WKUserScript</c> with injection time <c>AtDocumentStart</c>
    /// </summary>
    public static string GetBootstrapScript() =>
        """
        (function () {
          'use strict';

          // Pending Promise resolvers, keyed by call ID.
          const _pending = new Map();

          // Receive responses posted back from C# via ExecuteScriptAsync.
          window.__hybridBridgeResponse = function (responseJson) {
            const resp = JSON.parse(responseJson);
            const resolver = _pending.get(resp.id);
            if (!resolver) return;
            _pending.delete(resp.id);
            if (resp.error) {
              resolver.reject(new Error(resp.error));
            } else {
              resolver.resolve(resp.result);
            }
          };

          window.hybridBridge = {
            /**
             * Invoke a native C# method.
             * @param {string} method  Registered method name (case-sensitive).
             * @param {object} payload Serialisable request payload.
             * @returns {Promise<any>} Resolves with the handler's return value.
             */
            invoke: function (method, payload) {
              return new Promise((resolve, reject) => {
                const id = crypto.randomUUID();
                _pending.set(id, { resolve, reject });
                const msg = JSON.stringify({ id, method, payload: payload ?? {} });

                // Platform dispatch — normalised by the platform-specific WebView wrapper.
                if (window.chrome?.webview) {
                  window.chrome.webview.postMessage(msg);       // WebView2
                } else if (window.webkit?.messageHandlers?.bridge) {
                  window.webkit.messageHandlers.bridge.postMessage(msg); // WKWebView
                } else {
                  reject(new Error('hybridBridge: no platform message channel available'));
                  _pending.delete(id);
                }
              });
            }
          };
        })();
        """;

    // ── Incoming message dispatch ─────────────────────────────────────────────

    /// <summary>
    /// Entry point for inbound messages from the WebView.
    /// Must be called on the UI thread (both WebView2 and WKWebView guarantee this).
    /// </summary>
    public async Task HandleIncomingAsync(string rawJson, CancellationToken cancellationToken = default)
    {
        BridgeMessage? message;
        try
        {
            message = JsonSerializer.Deserialize(rawJson, BridgeJsonContext.Default.BridgeMessage);
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "Bridge received malformed JSON; ignoring.");
            return;
        }

        if (message is null || string.IsNullOrEmpty(message.Id))
        {
            logger.LogWarning("Bridge received message with missing id; ignoring.");
            return;
        }

        if (!_handlers.TryGetValue(message.Method, out var handler))
        {
            logger.LogWarning("Bridge received unknown method '{Method}'.", message.Method);
            await PostResponseAsync(new BridgeResponse
            {
                Id = message.Id,
                Error = $"Unknown method: {message.Method}",
            }, cancellationToken).ConfigureAwait(false);
            return;
        }

        JsonElement result;
        string? error = null;
        try
        {
            result = await handler(message.Payload, cancellationToken).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Bridge handler '{Method}' threw an exception.", message.Method);
            error = ex.Message;
            result = default;
        }

        var response = error is null
            ? new BridgeResponse { Id = message.Id, Result = result }
            : new BridgeResponse { Id = message.Id, Error = error };

        await PostResponseAsync(response, cancellationToken).ConfigureAwait(false);
    }

    private async Task PostResponseAsync(BridgeResponse response, CancellationToken cancellationToken)
    {
        if (_executeScript is null)
        {
            logger.LogError("Bridge.PostResponseAsync called before Attach(); response dropped.");
            return;
        }

        var json = JsonSerializer.Serialize(response, BridgeJsonContext.Default.BridgeResponse);

        // Escape for embedding inside a JS string literal — the response JSON is passed
        // as a string argument to __hybridBridgeResponse so it can be JSON.parse'd by JS.
        var escaped = json.Replace("\\", "\\\\").Replace("'", "\\'");
        var script = $"window.__hybridBridgeResponse('{escaped}');";

        // Re-marshal to UI thread for ExecuteScriptAsync (required by WebView2).
        await Dispatcher.UIThread.InvokeAsync(
            () => _executeScript(script),
            DispatcherPriority.Normal);
    }
}
