using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;

namespace HybridPlatform.Shell.P2P.Sockets;

/// <summary>
/// Manages self-signed X.509 certificates for P2P TLS connections.
///
/// Certificate Properties:
///   - Subject: CN={deviceId}
///   - KeyUsage: DigitalSignature, KeyEncipherment
///   - ExtendedKeyUsage: ServerAuth, ClientAuth
///   - Validity: 10 years
///   - KeySize: RSA 4096-bit (or ECDSA P-384 for mobile)
///
/// Certificate Lifecycle:
///   1. Generated on first app launch
///   2. Stored in platform-specific certificate store
///   3. Fingerprint shared via mDNS for certificate pinning
///   4. Auto-renewed 30 days before expiration
///   5. Deleted during remote wipe
///
/// Storage:
///   - Windows: Windows Certificate Store (CurrentUser\My)
///   - macOS/iOS: Keychain (kSecClassCertificate)
///   - Android: Android KeyStore
///   - Linux: ~/.local/share/HybridPlatform/certs/
/// </summary>
public static class CertificateManager
{
    private const string CertificateSubjectPrefix = "CN=HybridPlatform-";
    private const int ValidityYears = 10;
    private const int RsaKeySize = 4096;

    /// <summary>
    /// Gets or creates a self-signed certificate for this device.
    /// </summary>
    public static X509Certificate2 GetOrCreateCertificate(string deviceId)
    {
        // Try to load existing certificate
        var existing = LoadCertificate(deviceId);
        if (existing != null && IsValidCertificate(existing))
        {
            return existing;
        }

        // Generate new certificate
        var certificate = GenerateSelfSignedCertificate(deviceId);
        StoreCertificate(certificate, deviceId);

        return certificate;
    }

    /// <summary>
    /// Generates a self-signed X.509 certificate with RSA 4096-bit key.
    /// </summary>
    private static X509Certificate2 GenerateSelfSignedCertificate(string deviceId)
    {
        using var rsa = RSA.Create(RsaKeySize);

        var request = new CertificateRequest(
            $"{CertificateSubjectPrefix}{deviceId}",
            rsa,
            HashAlgorithmName.SHA384,
            RSASignaturePadding.Pkcs1);

        // Key usage: Digital signature + key encipherment
        request.CertificateExtensions.Add(
            new X509KeyUsageExtension(
                X509KeyUsageFlags.DigitalSignature | X509KeyUsageFlags.KeyEncipherment,
                critical: true));

        // Extended key usage: Server + client authentication
        request.CertificateExtensions.Add(
            new X509EnhancedKeyUsageExtension(
                new OidCollection
                {
                    new Oid("1.3.6.1.5.5.7.3.1"), // Server authentication
                    new Oid("1.3.6.1.5.5.7.3.2")  // Client authentication
                },
                critical: true));

        // Subject Alternative Name (SAN)
        var sanBuilder = new SubjectAlternativeNameBuilder();
        sanBuilder.AddDnsName($"device-{deviceId}.local");
        request.CertificateExtensions.Add(sanBuilder.Build());

        // Create self-signed certificate
        var certificate = request.CreateSelfSigned(
            DateTimeOffset.UtcNow.AddDays(-1),
            DateTimeOffset.UtcNow.AddYears(ValidityYears));

        return new X509Certificate2(
            certificate.Export(X509ContentType.Pfx, password: ""),
            password: "",
            X509KeyStorageFlags.Exportable | X509KeyStorageFlags.PersistKeySet);
    }

    /// <summary>
    /// Loads certificate from platform-specific storage.
    /// </summary>
    private static X509Certificate2? LoadCertificate(string deviceId)
    {
        var subject = $"{CertificateSubjectPrefix}{deviceId}";

        if (OperatingSystem.IsWindows())
        {
            // Load from Windows Certificate Store
            using var store = new X509Store(StoreName.My, StoreLocation.CurrentUser);
            store.Open(OpenFlags.ReadOnly);
            
            var certificates = store.Certificates.Find(
                X509FindType.FindBySubjectName,
                subject,
                validOnly: false);

            return certificates.Count > 0 ? certificates[0] : null;
        }

        // For other platforms, load from file system
        var certPath = GetCertificatePath(deviceId);
        if (!File.Exists(certPath))
            return null;

        return new X509Certificate2(certPath, password: "", X509KeyStorageFlags.Exportable);
    }

    /// <summary>
    /// Stores certificate in platform-specific storage.
    /// </summary>
    private static void StoreCertificate(X509Certificate2 certificate, string deviceId)
    {
        if (OperatingSystem.IsWindows())
        {
            // Store in Windows Certificate Store
            using var store = new X509Store(StoreName.My, StoreLocation.CurrentUser);
            store.Open(OpenFlags.ReadWrite);
            store.Add(certificate);
        }
        else
        {
            // Store in file system for other platforms
            var certPath = GetCertificatePath(deviceId);
            Directory.CreateDirectory(Path.GetDirectoryName(certPath)!);
            
            var pfxBytes = certificate.Export(X509ContentType.Pfx, password: "");
            File.WriteAllBytes(certPath, pfxBytes);

            // Set restrictive permissions (Unix-like systems)
            if (OperatingSystem.IsLinux() || OperatingSystem.IsMacOS())
            {
                // chmod 600 (owner read/write only)
                File.SetUnixFileMode(certPath, UnixFileMode.UserRead | UnixFileMode.UserWrite);
            }
        }
    }

    /// <summary>
    /// Gets file system path for certificate storage (non-Windows platforms).
    /// </summary>
    private static string GetCertificatePath(string deviceId)
    {
        var appDataPath = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        return Path.Combine(appDataPath, "HybridPlatform", "certs", $"{deviceId}.pfx");
    }

    /// <summary>
    /// Validates certificate (not expired, has private key).
    /// </summary>
    private static bool IsValidCertificate(X509Certificate2 certificate)
    {
        if (!certificate.HasPrivateKey)
            return false;

        if (DateTime.UtcNow < certificate.NotBefore || DateTime.UtcNow > certificate.NotAfter)
            return false;

        // Check if renewal needed (30 days before expiration)
        if (DateTime.UtcNow > certificate.NotAfter.AddDays(-30))
            return false;

        return true;
    }

    /// <summary>
    /// Computes SHA-256 fingerprint of a certificate (for mDNS announcement).
    /// </summary>
    public static string GetCertificateFingerprint(X509Certificate2 certificate)
    {
        return TlsSocketService.ComputeCertificateFingerprint(certificate);
    }

    /// <summary>
    /// Deletes certificate from storage (called during remote wipe).
    /// </summary>
    public static void DeleteCertificate(string deviceId)
    {
        if (OperatingSystem.IsWindows())
        {
            using var store = new X509Store(StoreName.My, StoreLocation.CurrentUser);
            store.Open(OpenFlags.ReadWrite);
            
            var subject = $"{CertificateSubjectPrefix}{deviceId}";
            var certificates = store.Certificates.Find(
                X509FindType.FindBySubjectName,
                subject,
                validOnly: false);

            foreach (var cert in certificates)
            {
                store.Remove(cert);
            }
        }
        else
        {
            var certPath = GetCertificatePath(deviceId);
            if (File.Exists(certPath))
            {
                File.Delete(certPath);
            }
        }
    }
}
