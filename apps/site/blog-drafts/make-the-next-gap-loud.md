<!--
Admin form fields:
  Title:    Make the next gap loud: when a capture rule silently misses a sale
  Slug:     make-the-next-gap-loud (auto-derived)
  Excerpt:  HaulCall dropped accepted Whatnot offers in two shows in a row and nothing in the product noticed. The fix was one manifest rule. The follow-up was a counter for sale-shaped frames no rule reads, so the next gap shows up in the popup before a seller has to report it.
  Category: Engineering
  Tags:     haulcall, chrome-extension, observability, websockets
  Cover:    (none)
  Body:     everything below this comment
-->

On 2026-10-02, at 19:29 and 19:32 UTC, two offers were accepted in a HaulCall test show, and HaulCall captured neither. It had happened once before, on 2026-09-25. Nothing in the product flagged either one: the dashboard lane did not count unmatched frames, so no counter moved. The only report came from the people running the show, who said the offers never showed up.

The fix was one rule in a JSON file. Making the next miss visible took a new counter and a small schema change.

## How HaulCall reads a Whatnot show

[HaulCall](https://haulcall.app) is a backstage tool for Whatnot sellers: it records each sale as it happens during a live show, then drives labels and packing from that list. Whatnot has no API I can use for this. I asked in July and they declined. So the Chrome extension watches the seller's own browser session. While she broadcasts from her phone, her desktop browser sits on the Whatnot dashboard page for that show, and that page holds a Phoenix Channels WebSocket. Every frame on it is a five-element array: join ref, ref, topic, event, payload. Sales arrive on topics like `commerce:<show id>` and `auction:<show id>`.

A selector manifest decides which frames mean a sale. Each manifest is a JSON file, versioned `wn-v0` through `wn-v9` at the time, and each WebSocket rule names a topic prefix, an event, the field paths for buyer, item, price and order id, and optional guards like `product.status == SOLD`. The API serves the current manifest signed with ECDSA P-256, and the extension verifies the signature against a key it ships with before adopting it. A manifest also carries a `minExtensionVersion`, and every build has a bundled floor manifest compiled in for the case where the fetch fails.

I built it that way because Chrome Web Store review is slow and Whatnot is not mine. Extension 0.4.0 went to the store at 22:00 UTC on 2026-09-11 and was still pending review three hours later; I next saw it published on 2026-09-16. A manifest publish takes effect for any seller who opens a show tab with a cached copy older than 15 minutes. A Whatnot rename should ship as data the same evening.

## Rules written from frames I can't read

The rules came from real frames. Extension 0.3.7 added automatic diagnostics: the extension samples socket frames and posts them to `POST /v1/diag/frames`, with every leaf value redacted before it leaves the page. Keys, nesting and types survive, and arrays keep their length up to 100 elements. Every string becomes `"<str>"`, every number `"<int>"`. That is enough to write a field path and not enough to leak a buyer's name, an order id or an address.

On 2026-09-11 a seller's dashboard tab uploaded 1,327 redacted frames during a test show. That recording confirmed that the host page carries `product_sold` on `commerce:` and `giveaway_won` on `auction:` at the same paths the viewer rules already read. Extension 0.4.0 (PR #464) turned the seller's own dashboard tab into a capture surface on the strength of it.

The redaction has a cost I knew about and underpriced. A rule can say where `transactionType` lives, but no diagnostic can tell me what string Whatnot puts there for an offer, because every value arrives as `"<str>"`.

## Why the dashboard lane was quiet on purpose

The extension already had a drift counter. A frame on a topic some rule declares, carrying an event no rule declares, counts as drift, and the count goes up on the heartbeat. On viewer pages that works.

On the seller's dashboard it would drown. The host page streams a `seller_analytics_updated` ticker, and in the 2026-09-11 recording, 385 of 391 sampled frames would have counted as drift, and 316 of those were that one event (the sampler was capped at 25 frames a minute, so the real rate was higher). Counting drift there would put thousands of "unknown frames" in the popup under a green headline on a show capturing every sale. So the dashboard lane didn't count drift. It sent a sample of every event name it saw each minute to diagnostics instead, where an unknown event shows up by name.

I wrote the risk down before the show on 2026-09-25. The go/no-go note said that if Whatnot renamed an event, the host lane would count zero drift by design: popup green, deck green, heartbeat perfect, zero sales, and the first evidence would be the seller saying it didn't show up. The same note told the show to stick to Buy It Now, auctions and giveaways, because nobody had ever observed an offer on any surface. At that show, the first offer went missing.

## What an accepted offer looks like on the wire

The production diagnostic frames, read on 2026-10-02, showed what an accepted offer sends. An accepted offer never sends `product_sold`, never sends `product_updated` with a SOLD status, and never sends `payment_succeeded`. The sequence is an `auction:offer` frame when the buyer makes the offer, another when the seller accepts, and within about 100 milliseconds a `commerce:product_added` frame, plus a duplicate of it on `auction:`. That frame already carries `orderId`, `soldPrice`, `purchaserUser`, `status` and `transactionType`. Every order-bearing `product_added` on record since 2026-09-03 sat next to an offer accept.

wn-v7 had no rule for `product_added`. Manifest wn-v8 ([PR #537](https://github.com/stevenfackley/haulcall/pull/537), merged 2026-10-02) added one:

```json
{
  "topic": "commerce",
  "event": "product_added",
  "type": "offer",
  "when": [{ "path": "product.status", "equals": "SOLD" }],
  "fields": {
    "buyerUsername": { "path": "product.purchaserUser.username" },
    "itemTitle": { "path": "product.name" },
    "price": { "path": "product.soldPrice.amount", "unit": "cents" },
    "orderRef": { "path": "product.orderId" }
  }
}
```

The type is a static `offer` because I still don't know the raw `transactionType` string. The SOLD guard is unverified for the same reason. If it is wrong, the rule ignores the frame, which is what wn-v7 did, so it can't make things worse. Keying `orderRef` on the order id dedupes the `auction:` copy. `minExtensionVersion` stayed at 0.3.9, so the fix needed no extension release. I published and promoted it in the admin console the same day.

## A counter that fires before the seller notices

wn-v8 fixed one event name. The gap that let it hide was still open, so extension 0.4.5 ([PR #547](https://github.com/stevenfackley/haulcall/pull/547), merged 2026-10-03) adds a narrower counter that the analytics ticker can't trip. It counts sale-shaped drift: a frame on a rule topic that matches no rule and whose payload looks like a finished sale.

```ts
export function isSaleShaped(payload: unknown): boolean {
  const orderId = getPath(payload, 'product.orderId');
  const hasOrder = (typeof orderId === 'string' && orderId !== '') || typeof orderId === 'number';
  if (!hasOrder) return false;
  const buyer = getPath(payload, 'product.purchaserUser');
  return (buyer !== null && buyer !== undefined) || getPath(payload, 'product.status') === 'SOLD';
}
```

An order id plus either a buyer or a SOLD status. The check runs on the page against the real payload and looks at nothing beyond null and SOLD. Before merging, I swept the predicate over every frame in the 2026-09-11 host and viewer recordings. It stayed silent on every unmatched known-topic frame and fired on `product_sold`, the positive control.

The extension counts it on the viewer lane and the dashboard lane both, and skips the observe-only lane, where this install isn't capturing the show. The popup gets its own warning line: "N sales may not have been captured — HaulCall has been notified." The heartbeat carries two new optional fields, `saleShapedDriftFrames` and `saleShapedDriftEvents`. The second holds `topic:event` names only, never payload values. On the API side, a source-generated log message turns them into a CloudWatch warning:

```
Sale-shaped drift: seller {SellerId} show {ShowRef} has {Count} frame(s) that look like completed sales but matched no capture rule (events: {Events}). Likely uncaptured sales.
```

It adds no column and no migration. The API strips anything that doesn't look like a `topic:event` identifier before logging it, and caps the list at ten. The warning repeats on every heartbeat, about once a minute, while the count stays above zero. I left the repetition in so a metric filter can count it.

## The first cut would have cried wolf

The first version of the counter counted frames, and it would have warned on every offer HaulCall did capture. Whatnot sends each accepted offer's `product_added` on both `commerce:` and `auction:`. wn-v8's rule reads the `commerce:` copy. The `auction:` topic has a rule too, for `giveaway_won`, so the `auction:` copy of `product_added` lands on a known topic with an unmatched event, carrying an order id and a buyer. The counter saw that and counted it.

The version that shipped stores `[orderId, topic:event]` pairs per show, records the order ids that rules did capture, and reports the difference. This is an excerpt from `uncapturedSaleShaped(c)` in `extension/src/lib/sale-shaped.ts`:

```ts
const captured = new Set(c.saleShapedCapturedOrders ?? []);
const orders = new Set<string>();
const events = new Set<string>();
for (const [order, event] of c.saleShapedDriftEntries ?? []) {
  if (captured.has(order)) continue;
  orders.add(order);
  events.add(event);
}
return { count: orders.size, events: [...events].slice(0, 10) };
```

Distinct order ids, minus the captured ones, in either arrival order. A captured offer and its `auction:` sibling count as zero; an offer no rule read counts as one.

## The other half: a type nobody mapped

A known event with an unknown type slips past the counter. If Whatnot sends `product_sold` with a `transactionType` that isn't in the rule's map, the rule counts a miss and drops the sale. The miss shows up in telemetry, and the seller still loses the row.

wn-v9, which shipped in the same PR, adds an optional `fallback` to `typeFrom`. This is an excerpt of `resolveType` in `extension/src/lib/ws-capture.ts`, with one comment line left out:

```ts
function resolveType(rule: WsEventRule, payload: unknown): SaleType | undefined {
  if (rule.type) return rule.type;
  if (!rule.typeFrom) return undefined;
  const raw = getPath(payload, rule.typeFrom.path);
  if (typeof raw !== 'string') return rule.typeFrom.fallback;
  return Object.hasOwn(rule.typeFrom.map, raw) ? rule.typeFrom.map[raw] : rule.typeFrom.fallback;
}
```

wn-v9 sets `"fallback": "bin"` on the `product_sold`, `product_updated` and `payment_succeeded` rules. A SOLD frame with a type I have never seen becomes a Buy It Now row on the seller's list, which beats a miss counter next to an empty row. The key is additive. Older builds strip it during schema parsing and behave as they did before, so `minExtensionVersion` stayed at 0.3.9 and the manifest version went from 10 to 11. The weekly config-drift check on 2026-10-05 found production serving wn-v9, byte-identical to the repo file, with a signature that verified against the pinned key.

## Where it stands

The Chrome Web Store serves 0.4.5, updated on 2026-10-05. Manifest wn-v10 (PR #555, the 0.5.0 chat-log lane) has since been added, after this story. I have no record yet of the sale-shaped warning firing in production, and no record of a real accepted offer captured since wn-v8 went out, so the SOLD guard on `product_added` is still unverified. The next step is one real test offer on a seller account, then a look at the Sales row and the CloudWatch log for that show. A captured offer with no warning line passes.
