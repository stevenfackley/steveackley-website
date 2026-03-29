#if IOS || MACCATALYST || MACOS
using Foundation;
using WebKit;

namespace HybridPlatform.Shell.Scheme;

/// <summary>
/// WKWebView implementation of the <c>pp://localhost</c> scheme handler.
///
/// Apple's WKURLSchemeHandler protocol requires two methods:
///   <see cref="StartUrlSchemeTask"/> — stream the response back to the WebView.
///   <see cref="StopUrlSchemeTask"/>  — abort an in-flight request (e.g. on navigation away).
///
/// Unlike WebView2, WKWebView drives the handler from a background thread,
/// so this class is intentionally lock-free and uses only stack-local state.
/// </summary>
internal sealed class WkEmbeddedSchemeHandler : NSObject, IWKUrlSchemeHandler
{
    [Export("webView:startURLSchemeTask:")]
    public void StartUrlSchemeTask(WKWebView webView, IWKUrlSchemeTask urlSchemeTask)
    {
        var path = urlSchemeTask.Request.Url?.Path ?? "/";
        var resolved = BrotliResourceResolver.Resolve(path);

        if (resolved is null)
        {
            var notFound = new NSHttpUrlResponse(
                urlSchemeTask.Request.Url!,
                statusCode: 404,
                httpVersion: "HTTP/1.1",
                headerFields: null);
            urlSchemeTask.DidReceiveResponse(notFound);
            urlSchemeTask.DidFinish();
            return;
        }

        var (stream, mimeType) = resolved;
        using (stream)
        {
            var headers = new NSDictionary<NSString, NSString>(
                [
                    (NSString)"Content-Type",
                    (NSString)"Access-Control-Allow-Origin",
                    (NSString)"Cross-Origin-Embedder-Policy",
                    (NSString)"Cross-Origin-Opener-Policy",
                    (NSString)"Cache-Control",
                ],
                [
                    (NSString)mimeType,
                    (NSString)"*",
                    (NSString)"require-corp",
                    (NSString)"same-origin",
                    (NSString)"no-cache",
                ]);

            var response = new NSHttpUrlResponse(
                urlSchemeTask.Request.Url!,
                statusCode: 200,
                httpVersion: "HTTP/1.1",
                headerFields: headers);

            urlSchemeTask.DidReceiveResponse(response);

            // Stream in 64 KB chunks to avoid loading large WASM blobs fully into memory.
            const int ChunkSize = 65_536;
            var buffer = new byte[ChunkSize];
            int read;
            while ((read = stream.Read(buffer, 0, ChunkSize)) > 0)
            {
                using var data = NSData.FromArray(buffer[..read]);
                urlSchemeTask.DidReceiveData(data);
            }

            urlSchemeTask.DidFinish();
        }
    }

    [Export("webView:stopURLSchemeTask:")]
    public void StopUrlSchemeTask(WKWebView webView, IWKUrlSchemeTask urlSchemeTask)
    {
        // Navigation was cancelled before we finished streaming.
        // The stream was already disposed inside the using block or will be GC'd.
        // No explicit cancellation is needed for synchronous stream reads.
    }
}

/// <summary>
/// Extension to register the scheme handler on the WKWebViewConfiguration
/// before the WKWebView instance is created. Call this in the Avalonia
/// platform initializer for iOS / macOS.
/// </summary>
public static partial class EmbeddedResourceSchemeHandler
{
    public static void RegisterForWkWebView(WKWebViewConfiguration config) =>
        config.SetUrlSchemeHandler(new WkEmbeddedSchemeHandler(), Scheme);
}
#endif
