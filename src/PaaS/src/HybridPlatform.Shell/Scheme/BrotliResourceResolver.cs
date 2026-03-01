using System.IO.Compression;
using System.Reflection;

namespace HybridPlatform.Shell.Scheme;

/// <summary>
/// Resolves a <c>pp://localhost</c> URL path to an embedded manifest resource stream.
///
/// Blazor WASM publish output ships Brotli-compressed variants of every asset
/// (e.g., <c>blazor.webassembly.js.br</c> alongside <c>blazor.webassembly.js</c>).
/// Custom URL scheme handlers in WKWebView and WebView2 do NOT decompress
/// <c>Content-Encoding: br</c> responses from custom schemes — decompression must
/// happen on the C# side before the bytes reach the WebView rendering engine.
///
/// Resolution order for a request to <c>/_framework/blazor.webassembly.js</c>:
///   1. Try embedded resource <c>…wwwroot._framework.blazor.webassembly.js.br</c>
///      → wrap in <see cref="BrotliStream"/> (decompress on read, zero-copy streaming).
///   2. Try embedded resource <c>…wwwroot._framework.blazor.webassembly.js</c>
///      → return raw stream.
///   3. Return <see langword="null"/> → handler returns HTTP 404.
/// </summary>
internal static class BrotliResourceResolver
{
    private static readonly Assembly Assembly = typeof(BrotliResourceResolver).Assembly;

    // Cached to avoid repeated reflection calls on the hot path.
    private static readonly string ResourcePrefix =
        typeof(BrotliResourceResolver).Namespace!.Replace(".Scheme", "") + ".wwwroot.";

    /// <summary>
    /// Resolves the URL path to an open resource stream.
    /// The caller is responsible for disposing the returned stream.
    /// </summary>
    /// <param name="urlPath">
    /// The path component of the request URI, e.g. <c>/_framework/blazor.webassembly.js</c>.
    /// </param>
    /// <returns>
    /// An open <see cref="Stream"/> (possibly wrapping a <see cref="BrotliStream"/>) and
    /// the MIME type inferred from the logical (non-compressed) file name,
    /// or <see langword="null"/> if no matching resource was found.
    /// </returns>
    public static (Stream Stream, string MimeType)? Resolve(string urlPath)
    {
        // Normalise: strip query string and leading slash, map '/' → '.'
        var logical = ToResourceSuffix(urlPath.AsSpan());
        var resourceName = ResourcePrefix + logical;

        // 1. Brotli-compressed variant
        var brotliStream = Assembly.GetManifestResourceStream(resourceName + ".br");
        if (brotliStream is not null)
        {
            // BrotliStream wraps the manifest stream; both are disposed together
            // by the caller via the outer stream reference.
            return (
                new BrotliStream(brotliStream, CompressionMode.Decompress, leaveOpen: false),
                MimeTypeMap.Resolve(logical.AsSpan())
            );
        }

        // 2. Uncompressed variant
        var rawStream = Assembly.GetManifestResourceStream(resourceName);
        if (rawStream is not null)
            return (rawStream, MimeTypeMap.Resolve(logical.AsSpan()));

        return null;
    }

    /// <summary>
    /// Converts a URL path into a manifest resource suffix.
    ///
    /// <example>
    /// <c>/_framework/blazor.webassembly.js?v=1</c>
    /// → <c>_framework.blazor.webassembly.js</c>
    /// </example>
    /// </summary>
    private static string ToResourceSuffix(ReadOnlySpan<char> urlPath)
    {
        // Strip query string
        int q = urlPath.IndexOf('?');
        if (q >= 0) urlPath = urlPath[..q];

        // Strip leading slash
        urlPath = urlPath.TrimStart('/');

        // Default to index.html for bare root requests
        if (urlPath.IsEmpty) return "index.html";

        return urlPath.ToString().Replace('/', '.');
    }
}
