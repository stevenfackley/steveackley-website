using Avalonia;

namespace HybridPlatform.Shell;

/// <summary>
/// AOT entry point. The [STAThread] attribute is required on Windows for COM
/// (WebView2 uses COM under the hood). It is a no-op on non-Windows platforms.
/// </summary>
internal static class Program
{
    [STAThread]
    internal static int Main(string[] args)
        => BuildAvaloniaApp()
            .StartWithClassicDesktopLifetime(args);

    /// <summary>
    /// Called by the Avalonia designer. Must not have side effects.
    /// </summary>
    public static AppBuilder BuildAvaloniaApp()
        => AppBuilder.Configure<App>()
            .UsePlatformDetect()
            .UseWebView()          // Registers Avalonia.WebView platform services
            .WithInterFont()
            .LogToTrace();
}
