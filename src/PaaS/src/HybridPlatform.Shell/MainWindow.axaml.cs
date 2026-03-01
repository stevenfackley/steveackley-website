using Avalonia.Controls;
using Avalonia.WebView;
using HybridPlatform.Shell.Bridge;
using HybridPlatform.Shell.Scheme;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Web.WebView2.Core;

namespace HybridPlatform.Shell;

/// <summary>
/// Host window. Owns the WebView lifecycle and wires the scheme handler + JS bridge.
///
/// Startup sequence (Windows / WebView2):
///   1. Window.Opened → WebViewControl.CoreWebView2Initialized fires asynchronously.
///   2. CoreWebView2Initialized: register pp:// scheme handler, inject bootstrap JS.
///   3. After scheme handler is live: navigate to pp://localhost/ (Blazor index.html).
///   4. Blazor bootstraps inside the WebView; calls window.hybridBridge.invoke().
///   5. WebView2.WebMessageReceived → JsBridge.HandleIncomingAsync() → handler → response.
///
/// For Apple platforms (macOS/iOS), the WKWebViewConfiguration must be configured
/// BEFORE WKWebView creation. Avalonia provides a platform hook for this — see the
/// TODO below.
/// </summary>
public partial class MainWindow : Window
{
    private readonly JsBridge _bridge = new(NullLogger<JsBridge>.Instance);

    public MainWindow()
    {
        InitializeComponent();
    }

    protected override async void OnOpened(EventArgs e)
    {
        base.OnOpened(e);

        var webView = this.FindControl<WebView>("WebViewControl")
            ?? throw new InvalidOperationException("WebViewControl not found in visual tree.");

        // ── WebView2 (Windows) ─────────────────────────────────────────────
        // Wait for the underlying CoreWebView2 to be ready before touching it.
        // Avalonia's WebView exposes this via the CoreWebView2Initialized event.
#if WINDOWS
        await InitialiseWebView2Async(webView);
#else
        // ── WKWebView (macOS / iOS) ────────────────────────────────────────
        // TODO: For Apple platforms, the scheme handler must be registered on
        // WKWebViewConfiguration *before* the WKWebView is instantiated.
        // Avalonia's platform hook is via IAvaloniaWebViewProvider.CreateConfiguration();
        // register WkEmbeddedSchemeHandler there and then call InitialiseWkWebView().
        await InitialiseWkWebViewAsync(webView);
#endif
    }

    // ── WebView2 initialisation (Windows) ─────────────────────────────────────

    private async Task InitialiseWebView2Async(WebView webView)
    {
        // Ensure CoreWebView2 is ready. This completes immediately if the WebView has
        // already initialised (e.g., the window opened slowly), or awaits its creation.
        await webView.EnsureCoreWebView2Async();

        var core = webView.CoreWebView2
            ?? throw new InvalidOperationException("CoreWebView2 unavailable after ensure.");

        // 1. Register pp:// scheme BEFORE navigating so no request is missed.
        EmbeddedResourceSchemeHandler.RegisterForWebView2(core);

        // 2. Inject the JS bridge bootstrap into every document, before any script runs.
        await core.AddScriptToExecuteOnDocumentCreatedAsync(JsBridge.GetBootstrapScript());

        // 3. Wire up inbound messages.
        core.WebMessageReceived += OnWebView2MessageReceived;

        // 4. Provide the bridge with the executor delegate for pushing responses back.
        _bridge.Attach(script => webView.ExecuteScriptAsync(script));

        // 5. Navigate — scheme handler is live, bootstrap JS is queued.
        webView.Source = new Uri(EmbeddedResourceSchemeHandler.BaseUrl);
    }

    private async void OnWebView2MessageReceived(
        object? sender,
        CoreWebView2WebMessageReceivedEventArgs e)
    {
        // WebMessageReceived fires on the UI thread; raw JSON string is in TryGetWebMessageAsString.
        if (e.TryGetWebMessageAsString() is { } json)
            await _bridge.HandleIncomingAsync(json);
    }

    // ── WKWebView initialisation (macOS / iOS) ─────────────────────────────────

    private Task InitialiseWkWebViewAsync(WebView webView)
    {
        // WKWebView message handler registration happens via the webkit.messageHandlers
        // mechanism. Avalonia's WKWebView wrapper exposes WKUserContentController
        // through the platform-specific initializer hook.
        //
        // Concrete steps (to be filled in once the Apple target is active):
        //   1. Add WKUserScript with JsBridge.GetBootstrapScript() at document start.
        //   2. Add message handler named "bridge" to WKUserContentController.
        //   3. Implement IWKScriptMessageHandler.DidReceiveScriptMessage → _bridge.HandleIncomingAsync().
        //   4. Navigate to EmbeddedResourceSchemeHandler.BaseUrl.

        webView.Source = new Uri(EmbeddedResourceSchemeHandler.BaseUrl);
        return Task.CompletedTask;
    }
}
