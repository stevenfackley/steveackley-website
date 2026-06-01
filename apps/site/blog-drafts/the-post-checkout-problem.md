<!--
Admin form fields:
  Title:    The post-checkout problem: bridging Stripe Checkout to your auth
  Slug:     the-post-checkout-problem (auto-derived)
  Excerpt:  Stripe Checkout completes. The user lands back on your site. Now what? The pattern almost nobody warns you about, and the 30-line endpoint that solves it.
  Cover:    (none)
  Body:     everything below this comment
-->

Stripe Checkout is the easiest part of taking a first dollar online. You create a session, redirect the user to a Stripe-hosted page, they pay, Stripe redirects them back. Done.

Except the redirect lands them on your `success_url` as an **unauthenticated visitor**. Whatever entitlement just got recorded via the webhook lives in your database under a user id that the browser sitting in front of you has no way to claim. Refresh the page; their browser has no idea who they are.

This is the gap nobody puts in the Stripe docs. It's a five-minute problem with a thirty-line solution once you've seen it. Here's the shape.

## What's wrong with the obvious approaches

**Option 1: ask them to sign in afterwards.** Now you need a sign-in flow. For an early-stage product, that's a whole auth subsystem you weren't planning on yet — password reset, email verification, all of it. You're adding a moat to the second step of a flow whose first step was supposed to be "click button, pay, use thing."

**Option 2: have them sign in *before* they pay.** The same auth subsystem, just shoved earlier in the funnel. You're now optimizing the wrong page for conversion.

**Option 3: just put their email in a cookie when they hit `/subscribe`.** Anyone who guesses an email gets to be that user. Don't.

The right answer is sitting in Stripe's success URL template syntax, and once you see it you'll wonder why nobody talks about it.

## `{CHECKOUT_SESSION_ID}` is your authorization code

When you create a Checkout Session, Stripe lets you template the success URL:

```csharp
var session = await new SessionService().CreateAsync(new SessionCreateOptions
{
    Mode = product.IsSubscription ? "subscription" : "payment",
    LineItems = [new SessionLineItemOptions { Price = stripePriceId, Quantity = 1 }],
    // The interesting bit:
    SuccessUrl = "https://yoursite.com/subscribed?session_id={CHECKOUT_SESSION_ID}",
    CancelUrl  = "https://yoursite.com/subscribe",
    ClientReferenceId = userId.ToString()
});
```

Stripe substitutes `{CHECKOUT_SESSION_ID}` with the real session ID (`cs_test_…` or `cs_live_…`) before redirecting. The user lands on `/subscribed?session_id=cs_test_a1sD09…`. That session ID is now in their browser's URL bar.

What's in it for you: that session ID is an **authorization code**. Same role as the `code` parameter in an OAuth authorization-code-grant redirect. You hand it to your backend, the backend verifies it against Stripe directly, and on success the backend issues your own session JWT.

```csharp
app.MapPost("/api/billing/session-claim", async (
    SessionClaimRequest request,
    IStripeBillingService stripe,
    JwtTokenService tokens,
    CancellationToken ct) =>
{
    var claim = await stripe.ResolveSessionAsync(request.SessionId, ct);
    if (claim is null)
        return Results.Json(new { error = "session_not_eligible" },
                            statusCode: StatusCodes.Status404NotFound);

    var jwt = tokens.MintAccessToken(
        userId:    claim.UserId,
        email:     claim.Email,
        plan:      claim.HasAllAccess ? Plan.AllAccess : Plan.Free,
        lifetime:  TimeSpan.FromDays(7));

    return Results.Ok(new { token = jwt.Token, expiresAt = jwt.ExpiresAt });
});
```

The web shell that owns the `/subscribed` page reads the `session_id` from the query string, posts it to `/api/billing/session-claim` server-side, gets back a JWT, and sets it as an `HttpOnly + Secure + Lax` cookie scoped to your domain. The user is now signed in. No password. No login form. No sign-up step before they pay.

## What `ResolveSessionAsync` actually does

The whole security model lives in the five things this method checks:

```csharp
public async Task<StripeSessionClaim?> ResolveSessionAsync(
    string sessionId, CancellationToken ct = default)
{
    // 1. Refuse to call Stripe if we're not configured.
    if (!IsConfigured) return null;

    // 2. Cheap sanity check on the shape. Real Stripe IDs start with "cs_".
    //    Saves a Stripe API round-trip on garbage input.
    if (!sessionId.StartsWith("cs_", StringComparison.Ordinal)) return null;

    Session session;
    try {
        session = await new SessionService().GetAsync(
            sessionId,
            new SessionGetOptions { Expand = ["customer_details"] },
            new RequestOptions { ApiKey = options.ApiKey },
            ct);
    } catch (StripeException) {
        return null;  // Bad ID, network issue, anything — closed door.
    }

    // 3. The session must be paid for. Both fields, both values.
    var paid = session.Status == "complete"
            && (session.PaymentStatus == "paid"
             || session.PaymentStatus == "no_payment_required");
    if (!paid) return null;

    // 4. ClientReferenceId must parse as the user id we set at checkout-create
    //    time. A forged session won't have one; a session for a different
    //    user won't be claimable as this user.
    if (!Guid.TryParse(session.ClientReferenceId, out var userId)) return null;

    // 5. Freshness. Stripe sessions don't expire from the API's perspective
    //    once "complete" — a six-month-old leaked URL would still log
    //    someone in. 2 hours covers slow card-confirmation flows and
    //    tab-close-and-reopen without leaving the door open forever.
    if (timeProvider.GetUtcNow() - session.Created > TimeSpan.FromHours(2))
        return null;

    return new StripeSessionClaim(userId, session.CustomerDetails?.Email ?? "");
}
```

The blast radius of a leaked `session_id` is the same as a leaked OAuth authorization code: someone who intercepts the URL can log in as the user who actually paid, until the freshness window closes. That's it. They can't grant themselves entitlements they didn't pay for, can't enumerate other users, can't escalate beyond the user-id baked into the original session.

## Why this beats every alternative

It composes with the rest of your auth. The JWT minted from `session-claim` is the same JWT you'd mint after any other login event. Your protected endpoints don't need to know how the user got their token; they validate it the same way. When you eventually add password sign-in, OAuth, or magic-link, every code path is already wired to consume the same JWT shape.

It's stateless. No "pending purchases waiting for the user to come back" table. No "we'll figure out who they are next session" cookie. The session ID *is* the bearer. If they never come back, no garbage to clean up.

It's standards-adjacent. OAuth implementations have been doing redirect-with-code since 2012. Stripe's `{CHECKOUT_SESSION_ID}` template gives you the same primitive without making Stripe a full IdP. You don't get the user's password; you don't even get their email except as part of the resolved claim. Stripe is a billing back-end with a side door for auth, not an identity provider.

## The honest caveat

The `session_id` is in the URL. URLs end up in browser history, in referrer headers, in screen recordings, in shoulder-surfed photos. The freshness window is your defense-in-depth against any of those exfiltration vectors. Two hours is generous enough that legitimate users don't get bounced; tight enough that a stale link doesn't sit around as a permanent backdoor.

If you wanted to go further, you could mark the session as "claimed" in your own DB after first redemption and reject subsequent claims — single-use. I haven't bothered. The 2-hour window catches every realistic case, and the database table for tracking redemptions costs more than it saves.

## When you eventually need email recovery

The `session-claim` flow gets a user signed in *on the browser they paid from*. It doesn't help when they come back tomorrow on their phone, or after their cookie expires. For that you'll want magic-link email — same pattern, different ingress: the user enters their email, your backend mints a signed token, you email them a link, the link's redemption endpoint hands them a JWT back.

But the magic-link infrastructure isn't the first thing you build. The first thing you build is the bridge from Stripe's success_url back to your auth. The thirty lines above are it. Build them on day one; ship the email recovery the day a customer asks for it.
