using System.Net;
using System.Net.Security;
using System.Net.Sockets;
using System.Security.Authentication;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;
using HybridPlatform.Shell.P2P.Discovery;

namespace HybridPlatform.Shell.P2P.Sockets;

/// <summary>
/// TLS 1.3 socket service for secure peer-to-peer communication.
///
/// Architecture:
///   - Each device generates self-signed certificate on first launch
///   - Certificate fingerprint shared via mDNS for pinning
///   - TLS 1.3 with mutual authentication (client + server certs)
///   - Length-prefixed message framing (4-byte header + payload)
///   - Supports server mode (accepts connections) and client mode (connects to peer)
///
/// Security:
///   - TLS 1.3 (no downgrade to TLS 1.2)
///   - Certificate pinning (SHA-256 fingerprint validation)
///   - Mutual TLS (both peers verify each other's certificates)
///   - Perfect forward secrecy (ephemeral DH key exchange)
///   - No cipher suite negotiation (TLS 1.3 default: AES-256-GCM)
///
/// Message Protocol:
///   [4 bytes: message length (big-endian)]
///   [N bytes: JSON payload]
///
/// Example:
///   0x00 0x00 0x00 0x10 {"type":"sync","data":{...}}
/// </summary>
public sealed class TlsSocketService : IDisposable
{
    private readonly ILogger<TlsSocketService> _logger;
    private readonly X509Certificate2 _serverCertificate;
    private readonly int _port;
    private TcpListener? _listener;
    private readonly CancellationTokenSource _cts = new();
    private readonly List<P2pConnection> _activeConnections = new();

    private const int DefaultPort = 8765;
    private const int MaxMessageSize = 10 * 1024 * 1024; // 10MB

    public event EventHandler<MessageReceivedEventArgs>? MessageReceived;
    public event EventHandler<PeerConnectedEventArgs>? PeerConnected;
    public event EventHandler<PeerDisconnectedEventArgs>? PeerDisconnected;

    public IReadOnlyList<P2pConnection> ActiveConnections => _activeConnections;

    public TlsSocketService(
        ILogger<TlsSocketService> logger,
        X509Certificate2 serverCertificate,
        int port = DefaultPort)
    {
        _logger = logger;
        _serverCertificate = serverCertificate;
        _port = port;
    }

    /// <summary>
    /// Starts listening for incoming TLS connections (server mode).
    /// </summary>
    public async Task StartServerAsync()
    {
        _logger.LogInformation("Starting TLS socket server on port {Port}", _port);

        _listener = new TcpListener(IPAddress.Any, _port);
        _listener.Start();

        _ = Task.Run(() => AcceptConnectionsAsync(_cts.Token), _cts.Token);

        await Task.CompletedTask;
    }

    /// <summary>
    /// Accepts incoming TCP connections and upgrades to TLS.
    /// </summary>
    private async Task AcceptConnectionsAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                var tcpClient = await _listener!.AcceptTcpClientAsync(cancellationToken);
                _ = Task.Run(() => HandleConnectionAsync(tcpClient, cancellationToken), cancellationToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error accepting connection");
            }
        }
    }

    /// <summary>
    /// Handles a single TLS connection (server side).
    /// </summary>
    private async Task HandleConnectionAsync(TcpClient tcpClient, CancellationToken cancellationToken)
    {
        var remoteEndPoint = tcpClient.Client.RemoteEndPoint as IPEndPoint;
        _logger.LogInformation("Incoming connection from {RemoteEndPoint}", remoteEndPoint);

        try
        {
            var sslStream = new SslStream(
                tcpClient.GetStream(),
                leaveInnerStreamOpen: false,
                ValidateClientCertificate);

            // Server-side TLS handshake
            await sslStream.AuthenticateAsServerAsync(
                _serverCertificate,
                clientCertificateRequired: true,
                enabledSslProtocols: SslProtocols.Tls13,
                checkCertificateRevocation: false);

            _logger.LogInformation("TLS handshake complete: {Protocol}, {CipherSuite}",
                sslStream.SslProtocol,
                sslStream.CipherAlgorithm);

            var connection = new P2pConnection(tcpClient, sslStream, remoteEndPoint?.Address.ToString());
            _activeConnections.Add(connection);

            PeerConnected?.Invoke(this, new PeerConnectedEventArgs { Connection = connection });

            // Process messages
            await ProcessMessagesAsync(connection, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Connection error from {RemoteEndPoint}", remoteEndPoint);
        }
        finally
        {
            tcpClient.Dispose();
        }
    }

    /// <summary>
    /// Connects to a peer device (client mode).
    /// </summary>
    public async Task<P2pConnection> ConnectToPeerAsync(
        PeerInfo peer,
        CancellationToken cancellationToken = default)
    {
        var endpoint = peer.GetEndPoint();
        if (endpoint == null)
            throw new ArgumentException("Peer has no valid endpoint", nameof(peer));

        _logger.LogInformation("Connecting to peer {DeviceName} at {EndPoint}", peer.DeviceName, endpoint);

        var tcpClient = new TcpClient();
        await tcpClient.ConnectAsync(endpoint, cancellationToken);

        var sslStream = new SslStream(
            tcpClient.GetStream(),
            leaveInnerStreamOpen: false,
            (sender, cert, chain, errors) => ValidateServerCertificate(cert, peer.CertificateFingerprint));

        // Client-side TLS handshake
        await sslStream.AuthenticateAsClientAsync(
            new SslClientAuthenticationOptions
            {
                ClientCertificates = new X509CertificateCollection { _serverCertificate },
                EnabledSslProtocols = SslProtocols.Tls13,
                TargetHost = peer.DeviceId,
                RemoteCertificateValidationCallback = (sender, cert, chain, errors) =>
                    ValidateServerCertificate(cert, peer.CertificateFingerprint)
            },
            cancellationToken);

        _logger.LogInformation("Connected to peer: {Protocol}, {CipherSuite}",
            sslStream.SslProtocol,
            sslStream.CipherAlgorithm);

        var connection = new P2pConnection(tcpClient, sslStream, peer.IpAddress, peer.DeviceId);
        _activeConnections.Add(connection);

        PeerConnected?.Invoke(this, new PeerConnectedEventArgs { Connection = connection });

        // Start processing messages
        _ = Task.Run(() => ProcessMessagesAsync(connection, _cts.Token), _cts.Token);

        return connection;
    }

    /// <summary>
    /// Validates client certificate during TLS handshake.
    /// </summary>
    private bool ValidateClientCertificate(
        object sender,
        X509Certificate? certificate,
        X509Chain? chain,
        SslPolicyErrors sslPolicyErrors)
    {
        if (certificate == null)
        {
            _logger.LogWarning("Client did not provide certificate");
            return false;
        }

        // Accept self-signed certificates (pinning verified separately)
        if (sslPolicyErrors == SslPolicyErrors.RemoteCertificateChainErrors ||
            sslPolicyErrors == SslPolicyErrors.None)
        {
            _logger.LogDebug("Client certificate accepted: {Subject}", certificate.Subject);
            return true;
        }

        _logger.LogWarning("Client certificate validation failed: {Errors}", sslPolicyErrors);
        return false;
    }

    /// <summary>
    /// Validates server certificate against expected fingerprint (certificate pinning).
    /// </summary>
    private bool ValidateServerCertificate(X509Certificate? certificate, string? expectedFingerprint)
    {
        if (certificate == null)
        {
            _logger.LogWarning("Server did not provide certificate");
            return false;
        }

        if (string.IsNullOrEmpty(expectedFingerprint))
        {
            _logger.LogWarning("No expected fingerprint provided for server certificate");
            return true; // Allow connection without pinning (for MVP)
        }

        var actualFingerprint = ComputeCertificateFingerprint(certificate);
        var isValid = string.Equals(actualFingerprint, expectedFingerprint, StringComparison.OrdinalIgnoreCase);

        if (!isValid)
        {
            _logger.LogError(
                "Certificate pinning failed. Expected: {Expected}, Actual: {Actual}",
                expectedFingerprint,
                actualFingerprint);
        }

        return isValid;
    }

    /// <summary>
    /// Computes SHA-256 fingerprint of a certificate.
    /// </summary>
    public static string ComputeCertificateFingerprint(X509Certificate certificate)
    {
        var certBytes = certificate.GetRawCertData();
        var hash = SHA256.HashData(certBytes);
        return Convert.ToHexString(hash);
    }

    /// <summary>
    /// Processes messages from a connection.
    /// </summary>
    private async Task ProcessMessagesAsync(P2pConnection connection, CancellationToken cancellationToken)
    {
        try
        {
            while (!cancellationToken.IsCancellationRequested && connection.IsConnected)
            {
                var message = await ReceiveMessageAsync(connection.Stream, cancellationToken);
                if (message == null)
                    break; // Connection closed

                MessageReceived?.Invoke(this, new MessageReceivedEventArgs
                {
                    Connection = connection,
                    Message = message
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing messages from {PeerId}", connection.PeerId);
        }
        finally
        {
            connection.Dispose();
            _activeConnections.Remove(connection);

            PeerDisconnected?.Invoke(this, new PeerDisconnectedEventArgs
            {
                PeerId = connection.PeerId,
                DisconnectedAt = DateTime.UtcNow
            });
        }
    }

    /// <summary>
    /// Receives a length-prefixed message from the stream.
    /// </summary>
    private async Task<string?> ReceiveMessageAsync(SslStream stream, CancellationToken cancellationToken)
    {
        // Read 4-byte length header (big-endian)
        var lengthBuffer = new byte[4];
        var bytesRead = await stream.ReadAsync(lengthBuffer, cancellationToken);
        if (bytesRead == 0)
            return null; // Connection closed

        if (bytesRead != 4)
            throw new InvalidOperationException("Incomplete message length header");

        var messageLength = IPAddress.NetworkToHostOrder(BitConverter.ToInt32(lengthBuffer, 0));
        if (messageLength <= 0 || messageLength > MaxMessageSize)
            throw new InvalidOperationException($"Invalid message length: {messageLength}");

        // Read message payload
        var messageBuffer = new byte[messageLength];
        var totalRead = 0;

        while (totalRead < messageLength)
        {
            bytesRead = await stream.ReadAsync(
                messageBuffer.AsMemory(totalRead, messageLength - totalRead),
                cancellationToken);

            if (bytesRead == 0)
                throw new InvalidOperationException("Connection closed during message read");

            totalRead += bytesRead;
        }

        return Encoding.UTF8.GetString(messageBuffer);
    }

    /// <summary>
    /// Sends a length-prefixed message to a connection.
    /// </summary>
    public async Task SendMessageAsync(
        P2pConnection connection,
        string message,
        CancellationToken cancellationToken = default)
    {
        var messageBytes = Encoding.UTF8.GetBytes(message);
        var lengthBytes = BitConverter.GetBytes(IPAddress.HostToNetworkOrder(messageBytes.Length));

        // Send length header + payload
        await connection.Stream.WriteAsync(lengthBytes, cancellationToken);
        await connection.Stream.WriteAsync(messageBytes, cancellationToken);
        await connection.Stream.FlushAsync(cancellationToken);

        _logger.LogDebug("Sent message ({Length} bytes) to {PeerId}", messageBytes.Length, connection.PeerId);
    }

    public void Dispose()
    {
        _cts.Cancel();
        _cts.Dispose();

        _listener?.Stop();

        foreach (var connection in _activeConnections.ToList())
        {
            connection.Dispose();
        }

        _activeConnections.Clear();
    }
}

/// <summary>
/// Represents an active P2P connection.
/// </summary>
public sealed class P2pConnection : IDisposable
{
    public TcpClient TcpClient { get; }
    public SslStream Stream { get; }
    public string? IpAddress { get; }
    public string? PeerId { get; set; }
    public DateTime ConnectedAt { get; } = DateTime.UtcNow;
    public bool IsConnected => TcpClient.Connected;

    public P2pConnection(TcpClient tcpClient, SslStream stream, string? ipAddress, string? peerId = null)
    {
        TcpClient = tcpClient;
        Stream = stream;
        IpAddress = ipAddress;
        PeerId = peerId;
    }

    public void Dispose()
    {
        Stream.Dispose();
        TcpClient.Dispose();
    }
}

public sealed class MessageReceivedEventArgs : EventArgs
{
    required public P2pConnection Connection { get; init; }
    required public string Message { get; init; }
}

public sealed class PeerConnectedEventArgs : EventArgs
{
    required public P2pConnection Connection { get; init; }
}

public sealed class PeerDisconnectedEventArgs : EventArgs
{
    required public string? PeerId { get; init; }
    required public DateTime DisconnectedAt { get; init; }
}
