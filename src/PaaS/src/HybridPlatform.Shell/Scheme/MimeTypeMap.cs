using System.Collections.Frozen;

namespace HybridPlatform.Shell.Scheme;

/// <summary>
/// Static, allocation-free map from file extension → MIME type.
///
/// <see cref="FrozenDictionary{TKey,TValue}"/> is used over a regular dictionary because:
///   - It is created once at startup from a known-small set.
///   - Lookup is O(1) with lower constant cost than Dictionary due to the frozen hash table.
///   - It is safe to share across threads without locking.
///
/// Blazor WASM-specific entries (wasm, .br files returned decompressed) are included.
/// </summary>
internal static class MimeTypeMap
{
    private static readonly FrozenDictionary<string, string> _map =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            // Web fundamentals
            [".html"]  = "text/html; charset=utf-8",
            [".htm"]   = "text/html; charset=utf-8",
            [".css"]   = "text/css; charset=utf-8",
            [".js"]    = "application/javascript; charset=utf-8",
            [".mjs"]   = "application/javascript; charset=utf-8",
            [".json"]  = "application/json; charset=utf-8",
            [".map"]   = "application/json; charset=utf-8",
            [".xml"]   = "application/xml; charset=utf-8",
            [".txt"]   = "text/plain; charset=utf-8",
            [".svg"]   = "image/svg+xml",

            // Blazor / WASM
            [".wasm"]  = "application/wasm",
            [".dll"]   = "application/octet-stream",
            [".dat"]   = "application/octet-stream",
            [".blat"]  = "application/octet-stream",
            [".pdb"]   = "application/octet-stream",

            // Media
            [".ico"]   = "image/x-icon",
            [".png"]   = "image/png",
            [".jpg"]   = "image/jpeg",
            [".jpeg"]  = "image/jpeg",
            [".gif"]   = "image/gif",
            [".webp"]  = "image/webp",
            [".avif"]  = "image/avif",
            [".mp4"]   = "video/mp4",
            [".webm"]  = "video/webm",

            // Fonts
            [".woff"]  = "font/woff",
            [".woff2"] = "font/woff2",
            [".ttf"]   = "font/ttf",
            [".otf"]   = "font/otf",
        }.ToFrozenDictionary(StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// Returns the MIME type for the given <paramref name="filePath"/>, or
    /// <c>application/octet-stream</c> for unknown extensions.
    /// </summary>
    public static string Resolve(ReadOnlySpan<char> filePath)
    {
        // Path.GetExtension allocates; use manual span slicing to stay allocation-free
        // for the hot path (hundreds of Blazor asset requests on startup).
        var ext = ExtensionSpan(filePath);
        return ext.IsEmpty
            ? "application/octet-stream"
            : _map.GetValueOrDefault(ext.ToString(), "application/octet-stream");
    }

    private static ReadOnlySpan<char> ExtensionSpan(ReadOnlySpan<char> path)
    {
        int dot = path.LastIndexOf('.');
        return dot < 0 ? ReadOnlySpan<char>.Empty : path[dot..];
    }
}
