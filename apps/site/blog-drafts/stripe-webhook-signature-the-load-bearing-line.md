<!--
Admin form fields:
  Title:    The Stripe webhook signature: the one line standing between you and a free subscription forger
  Slug:     stripe-webhook-signature-the-load-bearing-line (auto-derived)
  Excerpt:  Skipping `EventUtility.ConstructEvent` because "the integration test passes" is a mistake. The signature check isn't validation in the data-shape sense; it's the only thing telling you the event is actually from Stripe.
  Cover:    (none)
  Body:     everything below this comment
-->

Every Stripe webhook integration I've reviewed in the last few years has the same structural opportunity to ship a security bug. It looks like this:

```csharp
app.MapPost("/api/billing/stripe/webhook", async (HttpRequest request) =>
{
    var json = await new StreamReader(request.Body).ReadToEndAsync();
    var stripeEvent = JsonSerializer.Deserialize<Event>(json);  // ← danger

    if (stripeEvent.Type == "checkout.session.completed")
    {
        var session = ((StripeEvent<Session>)stripeEvent).Data.Object;
        await GrantEntitlement(session.ClientReferenceId, session.LineItems);
    }

    return Results.Ok();
});
```

This code "works." Every webhook Stripe sends will be processed. The integration test passes. The product manager is happy.

It also lets anyone with a `curl` command grant themselves a free subscription.

```bash
curl -X POST https://yoursite.com/api/billing/stripe/webhook \
  -H 'content-type: application/json' \
  -d '{
    "id": "evt_forged",
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "id": "cs_forged",
        "client_reference_id": "any-user-id-you-want",
        "line_items": { "data": [{"price": {"id": "price_all_access_monthly"}}] }
      }
    }
  }'
```

The endpoint receives the request. It parses the JSON. It sees a `checkout.session.completed` event. It looks up the price, finds the all-access SKU, calls `GrantEntitlement` with whatever user ID the attacker chose. The attacker now has a free subscription.

This is the single most important line of code in your Stripe integration:

```csharp
var stripeEvent = EventUtility.ConstructEvent(json, signatureHeader, webhookSecret);
```

`ConstructEvent` does three things, in order:

1. **Verifies the `Stripe-Signature` header against the raw request body** using your webhook secret. If the signature doesn't match, throws `StripeException`. This is the load-bearing check.
2. **Checks the timestamp in the signature is within tolerance** (default 5 minutes from now). Prevents an attacker who captures a real Stripe webhook from replaying it later.
3. **Deserializes the JSON to `Event`** only after the first two pass.

Replace the unsafe code with:

```csharp
app.MapPost("/api/billing/stripe/webhook", async (HttpRequest request, IConfiguration config) =>
{
    var json      = await new StreamReader(request.Body).ReadToEndAsync();
    var signature = request.Headers["Stripe-Signature"].ToString();

    Event stripeEvent;
    try
    {
        stripeEvent = EventUtility.ConstructEvent(
            json,
            signature,
            config["STRIPE_WEBHOOK_SECRET"],
            tolerance: (long)TimeSpan.FromMinutes(5).TotalSeconds,
            throwOnApiVersionMismatch: false);
    }
    catch (StripeException)
    {
        return Results.BadRequest(new { error = "signature_invalid" });
    }

    // …route by stripeEvent.Type as before…
});
```

The `curl` forgery now fails. Stripe-Signature isn't present, or it's present but doesn't validate against the secret, or it does validate but the timestamp is out of window. Any of those throws. The endpoint returns 400. No grant.

## Why the integration test misses this

Your integration test almost certainly uses Stripe's CLI or test webhooks, which **send real signatures**. The unsafe code from the top of this post passes every test that hits Stripe-generated events. The signature check is only load-bearing for events the test framework didn't generate — which is exactly the case you don't have a test for.

The lesson: integration tests verify that *Stripe's* webhooks reach your endpoint. They do not verify that *non-Stripe* requests are rejected. You have to add that test yourself, and the simplest version is a one-liner:

```csharp
[Fact]
public async Task Webhook_RejectsRequestWithoutSignature()
{
    var response = await client.PostAsync(
        "/api/billing/stripe/webhook",
        new StringContent("""{"type":"checkout.session.completed"}""", Encoding.UTF8, "application/json"));

    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
}
```

If that test passes against your endpoint as written, you have the signature check. If it doesn't — if the endpoint returns 200, or 500 because it tried to read fields that aren't there — you don't have the signature check, and you have the bug.

## What about middleware that does it for you

A lot of Stripe SDKs in other languages have middleware that handles signature verification. Some frameworks (Express, Flask) have community packages that wrap the verification step in a route attribute. In .NET, you write it yourself.

I'd rather write it yourself anyway. Webhook signature verification is exactly the kind of one-line operation that should be visible at the route, not hidden behind framework magic. Future you reading the code six months later should see the check, see the secret being consulted, see the catch block that 400s on failure. If it's in middleware, future you assumes it's still there until someone refactors the middleware away.

## The replay-window gotcha

`EventUtility.ConstructEvent` has a `tolerance` parameter that defaults to 5 minutes. This is the maximum age of a Stripe-signed event you'll accept. If you set it longer (say, an hour), you're widening the window for replay attacks. If you set it shorter (say, 30 seconds), legitimate webhook deliveries that take longer than 30 seconds to reach you — which happens in production, especially during retries — will fail signature validation as "expired."

Five minutes is a good default. Don't change it without a reason.

The tradeoff is: shorter tolerance = harder for an attacker to replay a captured webhook + more legitimate deliveries fail. Longer tolerance = easier replay window + more deliveries succeed. The default is calibrated; trust it.

## A related but distinct gotcha

Stripe's idempotency model is event-id-based. Every webhook delivery has a unique `id` (`evt_…`). If Stripe retries (because you 5xx'd or didn't respond in time), the *same* event ID arrives at your endpoint again. Your handler has to be idempotent — receiving the same event twice should produce the same state, not double-grant.

The signature check doesn't help here, because the retry has a valid signature too. What helps is making your entitlement-grant operation idempotent on `(Platform, StoreTransactionId)`. For Stripe events:

```csharp
// Subscription events: use the subscription_id (sub_…). Renewals re-issue
// the same id with a new ExpiresAtUtc; we upsert in place rather than
// inserting a duplicate row.
//
// Checkout sessions (one-shot): use the session_id (cs_…). Replays collide
// on the unique index.
var storeTransactionId = subscription?.Id ?? session.Id;

await entitlements.GrantPurchaseAsync(new DirectGrantCommand
{
    UserId            = userId,
    ProductId         = product.Id,
    Platform          = StorePlatform.Stripe,
    StoreTransactionId = storeTransactionId,
    ExpiresAtUtc      = subscription?.CurrentPeriodEnd,
});
```

The `(Platform, StoreTransactionId)` unique index turns a double-grant into a no-op at the persistence layer. Combined with signature verification, this gives you the two security guarantees you need from a webhook endpoint:

1. The event is actually from Stripe (signature check).
2. Replaying a real Stripe event doesn't double-spend (DB unique index).

## The summary

Three lines to remember:

```csharp
// 1. Read raw body before any JSON parsing.
var json = await new StreamReader(request.Body).ReadToEndAsync();

// 2. Verify signature. This is non-negotiable.
var stripeEvent = EventUtility.ConstructEvent(json, signatureHeader, webhookSecret);

// 3. Grant entitlements with (Platform, TransactionId) idempotency.
await entitlements.GrantPurchaseAsync(new DirectGrantCommand { ... });
```

Skip the second line and you have a free-subscription forging endpoint. Skip the third and Stripe's retries double-grant your premium customers.

Both are testable in one-line unit tests. Both bite silently if you don't write the tests. Both are the difference between "ship it" and "ship it without paying for the lesson later."
