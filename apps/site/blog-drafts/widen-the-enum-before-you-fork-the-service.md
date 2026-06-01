<!--
Admin form fields:
  Title:    Widen the enum before you fork the service
  Slug:     widen-the-enum-before-you-fork-the-service (auto-derived)
  Excerpt:  Stripe didn't fit neatly into a commerce model designed around mobile-store receipts. The temptation was to fork the service. The right move was a one-line enum change — and the downstream code never had to know.
  Cover:    (none)
  Body:     everything below this comment
-->

My commerce subsystem was originally built around two payment platforms: Google Play and Apple App Store. The shape:

```csharp
public enum StorePlatform
{
    GooglePlay,
    AppleAppStore
}
```

A `Purchase` table with a unique index on `(Platform, StoreTransactionId)` made redemptions idempotent — replaying the same Play receipt collided on `(GooglePlay, GPA.123…)` instead of double-granting. An `IReceiptValidator` interface with a `CompositeReceiptValidator` dispatching by platform let me add platforms without changing call sites.

Then I needed to add Stripe.

This post is about the decision that took 30 seconds and the decision that would have taken three days, and why the 30-second one was correct.

## The temptation

Stripe doesn't fit the existing model cleanly. The differences are real:

- **Stripe's authoritative channel is the webhook**, not a client-handed receipt. Mobile clients send the receipt to the backend to validate; Stripe sends the event directly, signed by Stripe's webhook secret.
- **Stripe has the concept of `customer`** — a billing-side entity that survives across subscriptions — which Play and Apple don't surface the same way.
- **Stripe Subscriptions are stateful objects** with their own renewals, status transitions, and lifecycle events. Play and Apple use one-time receipts that get re-validated periodically.
- **Stripe's IDs look different.** `cs_test_…` for sessions, `sub_…` for subscriptions, `evt_…` for events. Not parallel in shape to Play's `GPA.…` or Apple's transaction IDs.

The temptation, when you have a service `IReceiptValidator` that's clearly built around the "client hands us a receipt, we validate against the issuer's API" model, is to fork. Build a parallel `IStripeBillingService` with its own webhook handler, its own ingress, its own entitlement-grant path. Two services, two surfaces, two test suites.

I built it the other way.

## The 30-second decision

```csharp
public enum StorePlatform
{
    GooglePlay,
    AppleAppStore,
    Stripe   // ← the entire schema change
}
```

One value added to an enum. That's the entire migration.

The `Purchase` table's unique index already enforces idempotency on `(Platform, StoreTransactionId)`. A Stripe webhook event's idempotency key is the event ID or the subscription ID — both fit cleanly as `StoreTransactionId` strings. A replayed `checkout.session.completed` collides on `(Stripe, evt_…)` the same way a replayed Play receipt collides on `(GooglePlay, GPA.…)`. The persistence layer didn't notice the new platform existed.

`IEntitlementService` already has the concept of granting an entitlement against a `(Platform, TransactionId)`. The shape of the *event* differs — Play sends a receipt the client validates; Stripe sends a webhook the server validates — but the *grant* call is the same shape from either side. I added one parallel method to the interface:

```csharp
public interface IEntitlementService
{
    // Existing: client-submitted receipt path, used by Play + Apple.
    Task<PurchaseValidationOutcome> ValidatePurchaseAsync(
        PurchaseValidationCommand command, CancellationToken ct);

    // New: server-authoritative grant path, used by Stripe webhooks.
    Task<PurchaseValidationOutcome> GrantPurchaseAsync(
        DirectGrantCommand command, CancellationToken ct);

    Task<UserEntitlements> GetEntitlementsAsync(Guid userId, CancellationToken ct);
}
```

`GrantPurchaseAsync` is the only new surface. It exists because Stripe's webhook *already verified* the event upstream (the `StripeBillingService` does the signature check); the entitlement service trusts that and writes the grant directly. The IAP path still goes through `ValidatePurchaseAsync` because the *backend* is what verifies the receipt against Apple/Google.

Different ingress, same persistence, same downstream read path.

## What this saved

The killer test for whether the abstraction held was `GetEntitlementsAsync` — the function that reads what the current user owns and returns it. After the Stripe addition, that function is **byte-for-byte identical** to what it was before. It reads from the same `EntitlementGrant` table, filters by user, computes the same `UserEntitlements` shape. It doesn't know whether the grants came from a Play receipt, an Apple JWS, or a Stripe webhook.

That's the test: **the consumer side of your abstraction can't tell the implementation expanded.** If `GetEntitlementsAsync` had needed a special case for "is this a Stripe entitlement?", the abstraction would have leaked. It didn't, because the entitlement domain (what does the user own?) is genuinely separate from the platform domain (where did the grant originate?). Widening the enum recognized that fact; forking the service would have obscured it.

The web shell and the mobile apps both consume `/api/me/entitlements`. Neither had to change. A user who paid via Stripe on the web sees their `all_access` entitlement light up in the mobile app the moment they sign in. The mobile app didn't grow a "check for Stripe purchases" code path; it queries the same endpoint it always did.

## When the abstraction wouldn't have held

The decision tree I run before widening an enum:

**Does the new value fit the existing model's invariants?**
- Same persistence shape? *Yes* — `(Platform, StoreTransactionId)` works for Stripe events too.
- Same ingress shape? *No* — Stripe is webhook-driven, IAP is client-submitted. But that's true *before* the entitlement service; the difference is contained in the validator/handler layer above the service interface.
- Same domain meaning of "grant"? *Yes* — a grant is "user X now owns module Y or has all-access until time Z," regardless of who told us so.

If any of those answers were *no* at the domain level, I'd have forked. The signal is whether the differences are about *what* the operation means or *how* the operation arrives. If meaning differs, you need a new abstraction. If only the arrival mechanism differs, you contain it in the layer that handles arrival, and the downstream layers stay unaware.

For Stripe, the arrival mechanism (webhook + signature verification) differs from IAP (receipt + Apple/Google API call). The *meaning* (record a grant of entitlement X to user Y) is the same. That's why widening worked.

## The other option, briefly

The forked-service path would have looked like:

- New table `StripePurchase` paralleling `Purchase`.
- New service `IStripeEntitlementService` paralleling `IEntitlementService`.
- New read path `/api/me/stripe-entitlements` paralleling `/api/me/entitlements`.
- All consumer code (web library, mobile catalog) needs to call both endpoints and merge results.
- `GetUserOwnedModules` becomes a join across two tables instead of one.

Three days of building, indefinite cost of carrying. Every new entitlement consumer has to know both paths exist. New developers ask "why are there two?" and have to be told the history.

The fork seems clean at the moment of decision because it lets you build the new system without touching the old. The cost shows up later, every time someone reads the data model and has to mentally compose two parallel halves.

## The pattern

I'll state the rule as I now run it:

> **When adding a new source for something the system already handles, prefer widening over forking. Test the abstraction: if downstream consumers don't need to know the new source exists, the abstraction held and you should widen. If they do, the abstraction was already leaking and you should fork — but recognize you're not making the system simpler, you're confessing that the original abstraction was wrong.**

The Stripe case widened cleanly. The web shell, mobile apps, and entitlement read path all stayed unchanged. The platform domain absorbed Stripe as a third value; the entitlement domain didn't know anything changed.

When I look at the diff for that PR, it's striking. The `StorePlatform.cs` change is genuinely one line. The new `Product.StripePriceId` column is one more line. The big visible work is in the *validator* layer — the `StripeBillingService` with its webhook handler, session-claim, customer portal — and that work would have existed in either approach. The decision about whether to widen or fork the *downstream* layer didn't change the size of the *upstream* work; it changed the size of every system that read the result.

## The takeaway

Look at the consumer side of your abstraction before you decide whether the new thing fits. If consumers can stay unchanged, widen the enum. If consumers need to know the new source exists, you're either forking the service or fixing a leak in the original abstraction. Either way, the decision belongs at the boundary between *what arrives* and *what we record*, and the test is whether the recording layer can stay ignorant.

One line of `enum`. The whole rest of the system never had to learn that Stripe existed. That's the win.
