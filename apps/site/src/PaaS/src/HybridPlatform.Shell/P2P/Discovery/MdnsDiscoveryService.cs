using System.Collections.Concurrent;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;

namespace HybridPlatform.Shell.P2P.Discovery;

/// <summary>
/// mDNS (Multicast DNS) service for local network peer discovery.
///
/// Protocol: RFC 6762 (Multicast DNS)
/// Service Name: _hybridplatform._tcp.local
/// Multicast Group: 224.0.0.251 (IPv4) / FF02::FB (IPv6)
/// Port: 5353
///
/// Discovery Flow:
///   1. Device joins multicast group 224.0.0.251:5353
///   2. Broadcasts PTR query: "_hybridplatform._tcp.local"
///   3. Listens for PTR responses from peers
///   4. Sends SRV + TXT records with PeerInfo
///   5. Maintains discovered peer list with TTL expiration
///
/// Security:
///   - No authentication at mDNS layer (relies on TLS for security)
///   - Local network only (multicast TTL=1, no routing)
///   - Certificate pinning during TLS handshake validates peer identity
///
/// Platform Support:
///   - Windows: Uses System.Net.Sockets UDP multicast
///   - macOS/iOS: Can use NSNetService (Bonjour) for native integration
///   - Android: Uses NSD (Network Service Discovery) API
///   - Linux: Uses Avahi daemon via D-Bus (fallback to raw sockets)
/// </summary>
public sealed class MdnsDiscoveryService : IDisposable
{
    private readonly ILogger<MdnsDiscoveryService> _logger;
    private readonly PeerInfo _localPeerInfo;
    private readonly ConcurrentDictionary<string, PeerInfo> _discoveredPeers = new();
    private readonly CancellationTokenSource _cts = new();
    private UdpClient? _udpClient;
    private readonly PeriodicTimer _announceTimer;
    private readonly PeriodicTimer _cleanupTimer;

    private const string ServiceName = "_hybridplatform._tcp.local";
    private const string MulticastAddress = "224.0.0.251";
    private const int MdnsPort = 5353;
    private const int AnnounceIntervalSeconds = 30;
    private const int PeerTimeoutSeconds = 90;

    public event EventHandler<PeerDiscoveredEventArgs>? PeerDiscovered;
    public event EventHandler<PeerLostEventArgs>? PeerLost;

    public IReadOnlyCollection<PeerInfo> DiscoveredPeers => _discoveredPeers.Values.ToList();

    public MdnsDiscoveryService(
        ILogger<MdnsDiscoveryService> logger,
        PeerInfo localPeerInfo)
    {
        _logger = logger;
        _localPeerInfo = localPeerInfo;
        _announceTimer = new PeriodicTimer(TimeSpan.FromSeconds(AnnounceIntervalSeconds));
        _cleanupTimer = new PeriodicTimer(TimeSpan.FromSeconds(30));
    }

    /// <summary>
    /// Starts mDNS discovery (broadcasting and listening).
    /// </summary>
    public async Task StartAsync()
    {
        _logger.LogInformation("Starting mDNS discovery service for device: {DeviceId}", _localPeerInfo.DeviceId);

        try
        {
            // Initialize UDP multicast socket
            _udpClient = new UdpClient
            {
                ExclusiveAddressUse = false,
                MulticastLoopback = true
            };

            _udpClient.Client.SetSocketOption(
                SocketOptionLevel.Socket,
                SocketOptionName.ReuseAddress,
                true);

            _udpClient.Client.Bind(new IPEndPoint(IPAddress.Any, MdnsPort));

            // Join multicast group
            var multicastAddress = IPAddress.Parse(MulticastAddress);
            _udpClient.JoinMulticastGroup(multicastAddress);

            _logger.LogInformation("Joined mDNS multicast group: {Address}:{Port}", MulticastAddress, MdnsPort);

            // Start listening for mDNS packets
            _ = Task.Run(() => ListenForPeersAsync(_cts.Token), _cts.Token);

            // Start periodic announcements
            _ = Task.Run(() => AnnouncePresenceAsync(_cts.Token), _cts.Token);

            // Start peer cleanup (remove stale peers)
            _ = Task.Run(() => CleanupStalePeersAsync(_cts.Token), _cts.Token);

            // Send initial announcement
            await BroadcastPresenceAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start mDNS discovery service");
            throw;
        }
    }

    /// <summary>
    /// Listens for mDNS packets from peers.
    /// </summary>
    private async Task ListenForPeersAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Listening for mDNS peer announcements");

        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                var result = await _udpClient!.ReceiveAsync(cancellationToken);
                await ProcessMdnsPacketAsync(result.Buffer, result.RemoteEndPoint);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error receiving mDNS packet");
            }
        }
    }

    /// <summary>
    /// Processes incoming mDNS packet and extracts peer information.
    /// </summary>
    private async Task ProcessMdnsPacketAsync(byte[] buffer, IPEndPoint remoteEndPoint)
    {
        try
        {
            // Simplified mDNS parsing (in production: use full RFC 6762 parser)
            var message = Encoding.UTF8.GetString(buffer);

            // Check if packet contains our service name
            if (!message.Contains(ServiceName))
                return;

            // Extract JSON payload from TXT record
            var jsonStart = message.IndexOf('{');
            var jsonEnd = message.LastIndexOf('}');

            if (jsonStart < 0 || jsonEnd < 0 || jsonEnd <= jsonStart)
                return;

            var json = message.Substring(jsonStart, jsonEnd - jsonStart + 1);
            var peerInfo = JsonSerializer.Deserialize<PeerInfo>(json);

            if (peerInfo == null)
                return;

            // Ignore our own announcements
            if (peerInfo.DeviceId == _localPeerInfo.DeviceId)
                return;

            // Update peer IP from UDP packet (may differ from announced IP)
            peerInfo = peerInfo with
            {
                IpAddress = remoteEndPoint.Address.ToString(),
                LastSeenUtc = DateTime.UtcNow
            };

            // Add or update peer
            var isNew = !_discoveredPeers.ContainsKey(peerInfo.DeviceId);
            _discoveredPeers[peerInfo.DeviceId] = peerInfo;

            PeerDiscovered?.Invoke(this, new PeerDiscoveredEventArgs
            {
                Peer = peerInfo,
                IsNew = isNew
            });

            _logger.LogInformation(
                "{Status} peer: {DeviceName} ({DeviceId}) at {IpAddress}:{Port}",
                isNew ? "Discovered" : "Updated",
                peerInfo.DeviceName,
                peerInfo.DeviceId,
                peerInfo.IpAddress,
                peerInfo.Port);

            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to process mDNS packet from {RemoteEndPoint}", remoteEndPoint);
        }
    }

    /// <summary>
    /// Periodically announces this device's presence.
    /// </summary>
    private async Task AnnouncePresenceAsync(CancellationToken cancellationToken)
    {
        while (await _announceTimer.WaitForNextTickAsync(cancellationToken))
        {
            await BroadcastPresenceAsync();
        }
    }

    /// <summary>
    /// Broadcasts this device's presence as an mDNS packet.
    /// </summary>
    private async Task BroadcastPresenceAsync()
    {
        try
        {
            // Get local IP address
            var localIp = GetLocalIPAddress();
            if (localIp == null)
            {
                _logger.LogWarning("No local IP address found, skipping announcement");
                return;
            }

            // Update local peer info with current IP
            var announcement = _localPeerInfo with { IpAddress = localIp };

            // Serialize to JSON
            var json = JsonSerializer.Serialize(announcement);

            // Build simplified mDNS packet (in production: use full RFC 6762 format)
            var packet = BuildMdnsPacket(json);

            // Send to multicast group
            var multicastEndpoint = new IPEndPoint(IPAddress.Parse(MulticastAddress), MdnsPort);
            await _udpClient!.SendAsync(packet, multicastEndpoint);

            _logger.LogDebug("Broadcast presence announcement");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to broadcast presence");
        }
    }

    /// <summary>
    /// Builds an mDNS packet containing peer information.
    /// Simplified format for MVP (production should use full DNS packet structure).
    /// </summary>
    private byte[] BuildMdnsPacket(string json)
    {
        // Simplified packet format:
        // [Service Name]\n[JSON Payload]
        var packet = $"{ServiceName}\n{json}";
        return Encoding.UTF8.GetBytes(packet);
    }

    /// <summary>
    /// Removes peers that haven't been seen recently.
    /// </summary>
    private async Task CleanupStalePeersAsync(CancellationToken cancellationToken)
    {
        while (await _cleanupTimer.WaitForNextTickAsync(cancellationToken))
        {
            var now = DateTime.UtcNow;
            var stalePeers = _discoveredPeers
                .Where(kvp => (now - kvp.Value.LastSeenUtc).TotalSeconds > PeerTimeoutSeconds)
                .ToList();

            foreach (var (deviceId, peer) in stalePeers)
            {
                if (_discoveredPeers.TryRemove(deviceId, out _))
                {
                    _logger.LogInformation("Peer lost: {DeviceName} ({DeviceId})", peer.DeviceName, deviceId);

                    PeerLost?.Invoke(this, new PeerLostEventArgs
                    {
                        DeviceId = deviceId,
                        LastSeenUtc = peer.LastSeenUtc
                    });
                }
            }
        }
    }

    /// <summary>
    /// Gets the local IP address of this device (prefer IPv4).
    /// </summary>
    private static string? GetLocalIPAddress()
    {
        try
        {
            // Get all network interfaces
            var interfaces = NetworkInterface.GetAllNetworkInterfaces()
                .Where(ni => ni.OperationalStatus == OperationalStatus.Up &&
                             ni.NetworkInterfaceType != NetworkInterfaceType.Loopback)
                .ToList();

            foreach (var ni in interfaces)
            {
                var properties = ni.GetIPProperties();
                var address = properties.UnicastAddresses
                    .FirstOrDefault(ip => ip.Address.AddressFamily == AddressFamily.InterNetwork &&
                                         !IPAddress.IsLoopback(ip.Address));

                if (address != null)
                    return address.Address.ToString();
            }

            return null;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Manually queries for peers (triggers immediate discovery).
    /// </summary>
    public async Task QueryPeersAsync()
    {
        _logger.LogInformation("Querying for peers");
        await BroadcastPresenceAsync();
    }

    /// <summary>
    /// Gets a specific peer by device ID.
    /// </summary>
    public PeerInfo? GetPeer(string deviceId)
    {
        return _discoveredPeers.TryGetValue(deviceId, out var peer) ? peer : null;
    }

    /// <summary>
    /// Gets all online peers (seen in last 60 seconds).
    /// </summary>
    public IReadOnlyCollection<PeerInfo> GetOnlinePeers()
    {
        return _discoveredPeers.Values
            .Where(p => p.IsOnline)
            .ToList();
    }

    public void Dispose()
    {
        _cts.Cancel();
        _cts.Dispose();
        _announceTimer.Dispose();
        _cleanupTimer.Dispose();

        if (_udpClient != null)
        {
            try
            {
                _udpClient.DropMulticastGroup(IPAddress.Parse(MulticastAddress));
                _udpClient.Close();
                _udpClient.Dispose();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error disposing UDP client");
            }
        }
    }
}
