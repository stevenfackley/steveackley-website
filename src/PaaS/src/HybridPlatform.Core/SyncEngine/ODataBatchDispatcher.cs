using System.Collections.Frozen;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace HybridPlatform.Core.SyncEngine;

/// <summary>
/// Handles all HTTP communication with the OData backend during a sync cycle:
///
///   1. <see cref="FetchServerTimestampsAsync"/>
///      Batch-GET <c>LastModifiedUtc</c> for all pending IDs in a single round-trip.
///      Uses OData <c>$filter=Id in (...)</c> + <c>$select=Id,LastModifiedUtc</c>.
///
///   2. <see cref="DispatchMutationsAsync"/>
///      POST an OData 4.01 JSON <c>$batch</c> containing PATCH (LocalWins) and
///      POST (New) operations. Returns the set of correlation IDs that succeeded.
///
///   3. <see cref="FetchFullRecordAsync"/>
///      GET a single entity by ID for ServerWins items so the full server state
///      can be applied locally.
///
/// All methods are stateless and safe to call concurrently for different entity sets.
/// </summary>
internal sealed class ODataBatchDispatcher(
    HttpClient http,
    ILogger<ODataBatchDispatcher> logger)
{
    // ── Phase B: fetch server timestamps ─────────────────────────────────────

    /// <summary>
    /// Returns a map of <c>id → serverLastModifiedUtc</c> for the given entity set.
    /// IDs absent from the map indicate records that do not yet exist on the server.
    /// </summary>
    public async Task<FrozenDictionary<Guid, DateTime>> FetchServerTimestampsAsync(
        string entitySetName,
        IReadOnlyList<Guid> ids,
        CancellationToken ct)
    {
        if (ids.Count == 0) return FrozenDictionary<Guid, DateTime>.Empty;

        // OData GUID literal format: no surrounding quotes, hyphenated.
        // $filter=Id in (guid1,guid2,...) — OData 4.01 IN operator.
        var inClause = string.Join(',', ids.Select(id => id.ToString("D")));
        var url = $"{entitySetName}?$filter=Id in ({inClause})&$select=Id,LastModifiedUtc&$top={ids.Count}";

        try
        {
            var response = await http
                .GetFromJsonAsync(url, SyncJsonContext.Default.ODataCollectionResponseEntityTimestamp, ct)
                .ConfigureAwait(false);

            if (response is null) return FrozenDictionary<Guid, DateTime>.Empty;

            return response.Value
                .ToFrozenDictionary(
                    e => e.Id,
                    e => DateTime.SpecifyKind(e.LastModifiedUtc, DateTimeKind.Utc));
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex,
                "Timestamp pre-fetch for {EntitySet} failed; all items will be treated as New.",
                entitySetName);

            // Degrade gracefully: treat everything as New. The server will reject
            // duplicates via its own conflict detection; the local record gets
            // re-classified on the next cycle.
            return FrozenDictionary<Guid, DateTime>.Empty;
        }
    }

    // ── Phase C: dispatch mutations ───────────────────────────────────────────

    /// <summary>
    /// Sends a single OData JSON <c>$batch</c> request containing all
    /// <see cref="SyncClassification.New"/> (POST) and
    /// <see cref="SyncClassification.LocalWins"/> (PATCH) items.
    ///
    /// Returns the set of <see cref="SyncItem.Id"/>s that were accepted by the server
    /// (HTTP 200/201/204). Failed items are left for the next cycle.
    /// </summary>
    public async Task<FrozenSet<Guid>> DispatchMutationsAsync(
        IReadOnlyList<SyncItem> uploadItems,
        CancellationToken ct)
    {
        if (uploadItems.Count == 0) return FrozenSet<Guid>.Empty;

        var batchRequests = uploadItems
            .Select(item => new ODataBatchRequestItem
            {
                Id     = item.Id.ToString("D"),
                Method = item.Classification == SyncClassification.New ? "POST" : "PATCH",
                Url    = item.Classification == SyncClassification.New
                    ? item.EntitySetName
                    : $"{item.EntitySetName}({item.Id:D})",
                Headers = new Dictionary<string, string>
                {
                    ["Content-Type"] = "application/json",
                    // If-Match: * — optimistic concurrency, server rejects if ETag changed.
                    // For PATCH only; POST doesn't need it.
                    // A 412 response here means the server has a newer version than what
                    // we had during our timestamp pre-check (race condition). The item
                    // stays Pending and gets re-classified next cycle.
                    ["If-Match"] = item.Classification == SyncClassification.LocalWins ? "*" : string.Empty,
                },
                // Parse the pre-serialised JSON string back into a JsonElement to embed
                // it as a structured body rather than an escaped string.
                Body = JsonDocument.Parse(item.SerializedJson).RootElement,
            })
            .ToList();

        var batchEnvelope = new ODataBatchRequest { Requests = batchRequests };

        HttpResponseMessage httpResponse;
        try
        {
            httpResponse = await http.PostAsJsonAsync(
                "$batch",
                batchEnvelope,
                SyncJsonContext.Default.ODataBatchRequest,
                ct).ConfigureAwait(false);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "OData $batch request failed; all items remain Pending.");
            return FrozenSet<Guid>.Empty;
        }

        if (!httpResponse.IsSuccessStatusCode)
        {
            logger.LogWarning(
                "OData $batch returned {StatusCode}; all items remain Pending.",
                httpResponse.StatusCode);
            return FrozenSet<Guid>.Empty;
        }

        var batchResponse = await httpResponse.Content
            .ReadFromJsonAsync(SyncJsonContext.Default.ODataBatchResponse, ct)
            .ConfigureAwait(false);

        if (batchResponse is null) return FrozenSet<Guid>.Empty;

        // Collect IDs of items the server accepted (2xx).
        var succeeded = new HashSet<Guid>();
        foreach (var r in batchResponse.Responses)
        {
            if (r.Status is >= 200 and < 300 && Guid.TryParse(r.Id, out var id))
            {
                succeeded.Add(id);
            }
            else if (r.Status == (int)HttpStatusCode.PreconditionFailed)
            {
                // 412: server version is newer than our pre-check snapshot (tight race).
                // Leave as Pending — the next cycle's LWW pre-check will re-classify it.
                logger.LogDebug(
                    "Item {Id} returned 412 PreconditionFailed; will re-classify next cycle.", r.Id);
            }
            else
            {
                logger.LogWarning(
                    "Item {Id} returned unexpected status {Status}.", r.Id, r.Status);
            }
        }

        return succeeded.ToFrozenSet();
    }

    // ── Phase C (ServerWins): fetch full server record ────────────────────────

    /// <summary>
    /// Retrieves the complete server representation of a single entity.
    /// Returns the raw <see cref="JsonElement"/> for the handler to deserialise
    /// into the concrete type.
    /// </summary>
    public async Task<JsonElement?> FetchFullRecordAsync(
        string entitySetName,
        Guid id,
        CancellationToken ct)
    {
        try
        {
            var response = await http
                .GetAsync($"{entitySetName}({id:D})", ct)
                .ConfigureAwait(false);

            if (response.StatusCode == HttpStatusCode.NotFound) return null;
            response.EnsureSuccessStatusCode();

            using var doc = await JsonDocument.ParseAsync(
                await response.Content.ReadAsStreamAsync(ct).ConfigureAwait(false), cancellationToken: ct);

            // Clone the root element so it survives the JsonDocument disposal.
            return doc.RootElement.Clone();
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex,
                "Failed to fetch full record {EntitySet}({Id}); ServerWins apply skipped.",
                entitySetName, id);
            return null;
        }
    }
}
