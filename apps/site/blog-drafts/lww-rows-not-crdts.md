<!--
Admin form fields:
  Title:    TaleBound, day one: last-write-wins rows instead of CRDTs
  Slug:     lww-rows-not-crdts (auto-derived)
  Excerpt:  I started an offline-first travel journal today. The interesting engineering bet is the sync layer: hand-rolled row sync with last-write-wins and visible conflict copies, not CRDTs. Here's the product, the design, and why the fancier option was the wrong one.
  Cover:    (none)
  Body:     everything below this comment
-->

I created the TaleBound repo this morning. There is no app yet. There is a server, a sync protocol, and a test suite that proves two simulated devices converge. That's the whole thing so far, and it's the part I want to write about while the decisions are still fresh enough to be honest about.

## The product

TaleBound is a private travel journal. You're standing somewhere, something happened, you open the app and capture it: text, photos, where you are. It works with the radio off, because the places worth journaling about are disproportionately the places with no signal. When you get back to connectivity, it syncs.

One user. Several devices. Phone in the field, tablet on the plane, and both of them right when you land. Not a shared journal, not a collaborative one, not a social one. If you want to co-author a trip log with three friends editing the same entry, TaleBound is the wrong product and I'm fine with that. "Personal-first but store-ready" is the phrase I keep coming back to: built for exactly one person's data, built well enough to sell.

That single-user scope is the constraint that makes the rest of the design interesting, because it takes the expensive answer off the table.

## The bet: rows and last-write-wins

The sync layer is hand-rolled row sync, WatermelonDB-shaped push/pull, with last-write-wins resolution and visible conflict copies when two devices genuinely disagree.

I considered CRDTs seriously for about an hour and then wrote them down as resume-driven engineering.

Here's the reasoning. CRDTs buy you automatic, correct merges of concurrent edits without a coordinator. That's a real and hard-won property, and the price is a per-field metadata model, a much larger client library, a debugging story that gets bad when it gets bad, and a data format you're married to. You pay that price to serve the case where two actors edit the same field at the same instant and both edits must survive.

In TaleBound that case is one person on two devices. Concurrent edits happen, but they look like "I wrote a paragraph on my phone in the airport and then opened the tablet on the plane," not like "two editors typing in the same sentence." Last-write-wins loses information in exactly one scenario: genuine simultaneous divergence on the same row. So I made that scenario visible instead of silent. The loser becomes a conflict copy the user can see and reconcile, the same way a filesystem sync tool leaves you `notes (conflicted copy).md`. You lose nothing; you get told.

I also looked at PowerSync, which does this properly as a product. I passed for control. Sync is the load-bearing wall of an offline-first app, and I want to be able to read every line of it at 11pm when a device won't converge.

## How it works

**One global version counter.** A single Postgres sequence, `server_version`, set by trigger on every write. Every synced row carries the version it was stamped with. That gives me a total order over all server-side changes with no clock trust and no per-table cursors to keep in step.

**Client-generated UUIDv7 for every ID.** The client never waits for the server to name a row. UUIDv7 sorts by creation time, so an ID is also a rough timestamp, which is a free index-friendly property when you're paging a journal.

**Push applies rows through a decision table.** Each incoming row lands in exactly one of four outcomes:

| Outcome | When | Effect |
|---|---|---|
| **insert** | The server has never seen this row ID | Write it |
| **apply** | Server has it, and the incoming write is newer than what the client last saw | Overwrite |
| **replay** | The server's copy already reflects this exact write | No-op, return current version |
| **conflict** | Both sides changed since the client's last-seen version | Winner by LWW, loser written as a visible conflict copy |

The distinction between **apply** and **conflict** is the whole design. Both are "the server already had this row and the client is sending a different one." The difference is whether the client had seen the server's current version when it made its edit. If it had, the edit is informed and simply supersedes. If it hadn't, two people (or two devices) independently edited from the same ancestor, and somebody's work is about to disappear unless I keep it.

**Replay** deserves its own row because it's the common case in a flaky-network app and the one that goes wrong quietly. A client pushes, the response never arrives, the client retries the same batch. Without an explicit replay outcome that write either gets applied twice or gets classified as a conflict against itself, and a sync engine that generates conflict copies of your own retries is worse than useless.

The whole decision is a pure function of two row versions and two timestamps. No database access, no clock, no network. That's deliberate, because it means the hard part of the system is a table of cases I can enumerate in a unit test, and I have.

**Pull streams changes since a cursor.** The client asks for everything after its last-seen `server_version` and gets an ordered stream.

Two details are doing more work than they look like they are.

The client writes the new cursor **inside the same SQLite transaction** that writes the rows. If the process dies mid-pull, either both landed or neither did. Advancing the cursor in a separate write is how you build a sync engine that silently skips a page and then denies it for three days.

Idempotency keys off **row identity, not request identity**. The pair `(origin_device_id, updated_at)` tells me whether I've already applied this exact write. Request-level idempotency keys break the moment a client retries with a regenerated key or a proxy replays a body; row identity survives all of it, because the question "have I seen this write" is a property of the write.

## How I know it works

The unit tests cover the decision table. They're cheap and they're not the interesting ones.

The test I actually trust drives two simulated devices against a real Postgres through Testcontainers. Device A and Device B each get their own cursor and their own row store. The test scripts an interleaving of writes and syncs, runs both devices to quiescence, and asserts that A and B end up holding identical data.

Convergence is the property worth asserting because it's the property users experience. Nobody notices which write won; everybody notices when the phone and the tablet disagree and stay that way.

Running against real Postgres rather than a fake matters here more than usual, because the version counter is a database sequence and its behavior under concurrent transactions is the thing being tested. An in-memory stub would model my belief about how sequences behave, and my belief is what I'm trying to check.

That harness has already caught one ordering bug I would have shipped, on day one, with a sync layer I'd written that morning. It'll catch more.

## The rest of the shape

The client is Flutter with drift over SQLite as the local source of truth, plus FTS5 for search that works with the radio off. The server is a .NET 10 minimal API organized in feature folders, EF Core and Npgsql over Postgres, with pgvector and an HNSW index for embeddings. Media goes to Cloudflare R2 through presigned URLs so the API never proxies bytes; upload and download go client-to-R2 directly. Auth is ASP.NET Core Identity with bearer and refresh tokens. The whole thing runs on Docker Compose behind a cloudflared tunnel.

Search is two engines wearing one hat. Offline you get FTS5 over what's on the device. Online you get Postgres full-text and pgvector cosine similarity over OpenAI `text-embedding-3-small` at 1536 dimensions, fused by reciprocal rank so neither engine dominates. Ranking fusion beats tuning a weighted blend, mostly because you can't tune a weighted blend against a corpus that doesn't exist yet.

Location has exactly two modes and neither one is continuous tracking. Creating an entry takes a single high-accuracy fix with a 10-second timeout, and that's it. Separately, significant-change events feed a travel detector: haversine distance against your last anchor, roughly a 200-mile threshold, capped at one local notification per day. Crossing that threshold gets you a nudge to write something. No push infrastructure, no background trace, nothing that would make me uncomfortable reading my own journal's location history.

## Where it is

Day one. The repo was created today. Plan 01, the server foundation, is in active development: auth, sync wire models, the LWW decision function, and the push and pull endpoints are implemented and tested. Tests run against real Postgres through Testcontainers, including a two-simulated-device convergence test that's already caught one ordering bug I'd have shipped.

No Flutter code exists. Plan 02 is media and R2, 03 is search and embeddings, 04 is geocoding, 05 is the Flutter app and the client sync engine, 06 is location triggers.

This isn't a launch. It's a marker so that when the sync engine has a bad week in October, I can come back here and see what I claimed on the first day.
