using Avalonia.Controls;
using Microsoft.Web.WebView2.Core;

namespace HybridPlatform.Shell.Scheme;

/// <summary>
/// Intercepts <c>pp://localhost/*</c> requests from the WebView and serves
/// Blazor WASM assets embedded in the assembly manifest.
///
/// Platform wiring is split into two static factory methods:
///   <see cref="RegisterForWebView2"/>  — Windows / WebView2
///   <see cref="RegisterForWkWebView"/> — macOS / iOS (see Apple-platform partial)
///
/// Architecture:
///   WebView request → CoreWebView2.WebResourceRequested event
///     → BrotliResourceResolver.Resolve(path)
///       → BrotliStream(manifestStream) [if .br exists]  OR  manifestStream
///         → CoreWebView2Environment.CreateWebResourceResponse(stream, headers)
///           → event args.Response = response   [WebView2]
///
/// The handler is deliberately stateless (static) so it imposes no GC pressure
/// from repeated event subscriptions. All per-request state lives on the stack
/// or in the local scope of the event handler lambda.
///
/// IMPORTANT: WebView2's WebResourceRequested fires on the UI thread. The
/// GetManifestResourceStream call is synchronous and cheap (memory-mapped by the
/// CLR), so blocking the UI thread here is acceptable. Do NOT make this async —
/// the CoreWebView2WebResourceRequestedEventArgs deferral must be explicitly managed
/// and introduces complexity with no benefit for in-process resource serving.
/// </summary>
public static class EmbeddedResourceSchemeHandler
{
    public const string Scheme = "pp";
    public const string BaseUrl = "pp://localhost/";

    // ── WebView2 (Windows) ──────────────────────────────────────────────────

    /// <summary>
    /// Registers the embedded-resource handler on the supplied <paramref name="core"/>
    /// WebView2 instance. Call this inside the <c>CoreWebView2Initialized</c> event.
    /// </summary>
    public static void RegisterForWebView2(CoreWebView2 core)
    {
        // Filter is added before the event subscription so no requests are missed
        // between initialization and the first page navigation.
        core.AddWebResourceRequestedFilter(
            $"{Scheme}://*/*",
            CoreWebView2WebResourceContext.All);

        core.WebResourceRequested += HandleWebView2Request;
    }

    private static void HandleWebView2Request(
        object? sender,
        CoreWebView2WebResourceRequestedEventArgs e)
    {
        if (sender is not CoreWebView2 core) return;

        var uri = new Uri(e.Request.Uri);
        if (!uri.Scheme.Equals(Scheme, StringComparison.OrdinalIgnoreCase)) return;

        var resolved = BrotliResourceResolver.Resolve(uri.AbsolutePath);

        if (resolved is null)
        {
            // 404 — return an empty response with the correct status so Blazor
            // can handle missing optional assets gracefully instead of hanging.
            e.Response = core.Environment.CreateWebResourceResponse(
                content: null,
                statusCode: 404,
                reasonPhrase: "Not Found",
                headers: string.Empty);
            return;
        }

        var (stream, mimeType) = resolved;
        e.Response = core.Environment.CreateWebResourceResponse(
            content: stream,
            statusCode: 200,
            reasonPhrase: "OK",
            headers: BuildResponseHeaders(mimeType));
    }

    /// <summary>
    /// Builds a minimal header block for the WebView2 response.
    /// Content-Encoding is intentionally omitted — we decompress on the C# side
    /// so the WebView receives raw bytes with the correct Content-Type.
    /// Cross-Origin headers are required because Blazor WASM uses <c>fetch()</c>
    /// with CORS semantics even for same-origin custom scheme resources.
    /// </summary>
    private static string BuildResponseHeaders(string mimeType) =>
        $"""
         Content-Type: {mimeType}
         Access-Control-Allow-Origin: *
         Cross-Origin-Embedder-Policy: require-corp
         Cross-Origin-Opener-Policy: same-origin
         Cache-Control: no-cache
         """;

    // ── WKWebView (macOS / iOS) — see Scheme/EmbeddedResourceSchemeHandler.Apple.cs ──
    //
    // Apple platforms require implementing the IWKURLSchemeHandler protocol and
    // registering it on the WKWebViewConfiguration before the WKWebView is created:
    //
    //   config.SetUrlSchemeHandler(new WkEmbeddedSchemeHandler(), Scheme);
    //
    // The WkEmbeddedSchemeHandler class follows the same BrotliResourceResolver
    // lookup pattern; the only difference is the platform response type.
}
