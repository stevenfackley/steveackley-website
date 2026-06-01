<!--
Admin form fields:
  Title:    IsConfigured + fail-soft: a pattern for shipping features before the secrets exist
  Slug:     isconfigured-and-fail-soft (auto-derived)
  Excerpt:  The pattern that lets you ship a feature on Friday and flip on the third-party integration Monday. One interface property, one degraded mode, four production integrations all wearing the same shape.
  Cover:    (none)
  Body:     everything below this comment
-->

You're about to add a third-party integration. Stripe, SendGrid, SES, OpenAI, Twilio — pick one. Two things are true:

1. You want the code shipped this week.
2. The operator-side setup (verified domain, signed agreement, API key in `.env` on the box) is going to take longer than the code.

The wrong answer is to gate the feature behind a flag, ship a half-built endpoint that returns 500 in production, or hold the PR for a week while someone hunts down API keys. The right answer is **`IsConfigured` + fail-soft**: ship the feature fully wired, ship a degraded mode that runs identically until the secrets land, flip one env var to switch from degraded to live with no redeploy.

It's the same shape every time. Here it is once.

## The shape

```csharp
public interface IThirdPartyService
{
    bool IsConfigured { get; }
    Task<TResult> DoTheThingAsync(...);
}

public sealed class TheRealImplementation : IThirdPartyService
{
    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(options.ApiKey)
        && !string.IsNullOrWhiteSpace(options.WhateverElseIsRequired);

    public async Task<TResult> DoTheThingAsync(...)
    {
        if (!IsConfigured)
        {
            // Degraded mode: log what would have happened, return success.
            logger.LogInformation("Would have done X but service is unconfigured.");
            return SuccessShapeButNoOp;
        }

        // Real path: actually do the thing.
        return await realClient.DoTheThing(...);
    }
}
```

That's the entire pattern. Two lines of behavioral difference between "configured" and "not configured": the `IsConfigured` check at the top, and what runs after.

## What it gives you

The endpoint that wraps this service **returns identically** in both modes. Same status code. Same response shape. Same audit-log line. The only thing that changes is whether the side effect actually crossed a network.

For a magic-link email endpoint, the request handler looks like:

```csharp
app.MapPost("/api/auth/magic-link/request", async (req, users, tokens, emails, ct) =>
{
    // ... validation, user lookup ...
    if (user is not null)
    {
        var token = tokens.MintMagicLinkToken(user.Id, user.Email);
        var url   = $"https://yoursite.com/auth/magic?token={token}";
        await emails.SendAsync(new MagicLinkEmail(user.Email, url), ct);
    }
    return Results.Ok(new { sent = true });   // ← always
});
```

This endpoint behaves the same way against a fully-configured production stack and against a fresh dev clone with no SES credentials. The fresh clone's logs show:

```
[Information] Magic-link email NOT sent (SES unconfigured). To: test@example.com, Url: https://yoursite.com/auth/magic?token=eyJ...
```

The operator can copy that URL from logs and verify the full magic-link redemption flow without ever having configured SES. When they're ready to flip SES live, they set `SES_FROM_ADDRESS` in `/opt/synap/.env` and restart the API container. No code change. No redeploy. The endpoint's response shape didn't change; only what happens between "request received" and "response returned" did.

## What it asks of you

The hard part is what the degraded mode *can't* do. It can't return data the real service would have returned. If your `getAccountBalance()` returns a real number when configured, what does it return when not?

The answer for *side effects* (sending email, charging a card, dispatching a webhook) is easy: log + no-op. The side effect doesn't happen; nothing observable to the caller differs.

The answer for *queries* (fetching from the third party, looking something up) is harder. You have three choices:

1. **Throw or return error.** The caller has to handle the "service not configured" case. Loses the "endpoint behaves identically" guarantee.
2. **Return a sentinel value.** Same problem. The caller has to know it's a sentinel.
3. **Confine the third-party touch to the side-effect path.** The query path uses your own database; the third party is only consulted when *initiating* the integration.

(3) is the cleanest and the only one I use in practice. For Stripe: my code doesn't query Stripe to look up a user's entitlements. The webhook *writes* the entitlement into my Postgres at grant time; queries read from Postgres only. Stripe's API is touched on outbound paths (create checkout session, validate session, mint portal session), never inbound. That confinement is what makes fail-soft viable.

If you find yourself wanting to fail-soft on a *read*, that's usually a sign your architecture is leaking the third party into places it doesn't need to be. Cache the value when it's first available; consult the cache thereafter.

## What "the secret exists" actually checks

`IsConfigured` is not "is the SDK installed" or "is the network reachable." It's specifically: **does the box have everything it needs to make a successful call?**

The most useful definition is the strictest one: every required credential is non-empty AND the credential file (if any) exists AND parses. For my Apple App Store validator:

```csharp
private static void AddAppleAppStoreValidator(IServiceCollection services)
{
    var keyPath  = Environment.GetEnvironmentVariable("APPLE_IAP_KEY_PATH");
    var keyId    = Environment.GetEnvironmentVariable("APPLE_IAP_KEY_ID");
    var issuerId = Environment.GetEnvironmentVariable("APPLE_IAP_ISSUER_ID");
    var bundleId = Environment.GetEnvironmentVariable("APPLE_IAP_BUNDLE_ID") ?? "app.synap.ios";

    if (string.IsNullOrWhiteSpace(keyPath)
        || string.IsNullOrWhiteSpace(keyId)
        || string.IsNullOrWhiteSpace(issuerId))
    {
        return;  // Don't register the validator. Composite falls through to fail-closed default.
    }

    // The .p8 file must exist AND parse as a valid private key. Anything less is config rot.
    try
    {
        var client = new AppleAppStoreClient(new AppleValidatorOptions(keyId, issuerId, bundleId, keyPath, sandbox));
        services.AddSingleton<IAppleAppStoreClient>(client);
        services.AddSingleton<AppleAppStoreReceiptValidator>();
    }
    catch { /* malformed key file — treat as unconfigured */ }
}
```

The probe at startup is load-bearing. A `.p8` key that's missing, empty, or malformed should fail *at boot* (visible in startup logs, easy to fix), not on the first paid request three hours later (visible as a 500 to a user who's tapped "buy"). I check `IsConfigured` at runtime per-call, but the *registration* step already filtered out the obvious config rot before the service ever entered the DI container.

## Why this matters more than it looks

Most teams I've seen that *don't* use this pattern build one of two things instead:

**Hard-fail mode:** the feature returns 500 if config is missing. The frontend never gets a 200 it can work with, and the bug surface is enormous — you need to verify that the missing-config path is handled at every call site that touches the feature.

**Feature-flag mode:** there's a `feature.magicLinkEnabled` flag that gates the entire feature off when config is incomplete. Now your frontend has to check the flag too. The flag has a separate lifecycle from the config. You eventually have stale flags pointing at features that have been working in production for months.

`IsConfigured` + fail-soft splits the difference. There's no flag — the *existence of the configuration* is the flag. The feature is always on at the code level. Whether the side effect actually happens depends on real state (does the box have the API key?), not on a separate switch you have to remember to flip.

The composability is the killer feature. When I added Stripe, Apple, Play, and SES to my system, each one followed the same shape, and the composition handled itself. The receipt validators sit behind a `CompositeReceiptValidator` that dispatches by platform; each individual validator is either configured or it's not; the composite doesn't need to know. When the operator gets a Google service-account JSON onto the box, Google Play validation lights up. When they get Apple's `.p8` key on, Apple lights up. When they don't have either yet, both fall through to a `FailClosedReceiptValidator` that rejects everything — also the right behavior.

## The four times I've used this so far

In one project this past month:

- **Google Play receipt validator** — service-account JSON unset → composite falls through to fail-closed; configured → real Google Play Developer API calls.
- **Apple App Store receipt validator** — same shape, `.p8` key.
- **Stripe billing service** — `STRIPE_API_KEY` + `STRIPE_WEBHOOK_SECRET` both required; absence → checkout/portal endpoints return 503 with a clear error code so the UI shows "unavailable" instead of crashing.
- **SES magic-link email** — `SES_FROM_ADDRESS` unset → log the link instead of sending; configured → real `SendEmail` API call.

Four integrations, one pattern, zero feature flags. The operator-side setup gets done on their schedule. The code-side feature ships on Friday and the integration goes live the day the operator finishes their part.

## When not to use it

Fail-soft is wrong when the absence of the side effect is itself a security or correctness problem. Don't fail-soft a payment authorization. Don't fail-soft a 2FA verification. Don't fail-soft anything where "didn't happen" is worse than "errored loudly."

For payments specifically, the equivalent shape is **fail-closed**: when the receipt validator isn't configured, *reject* every purchase rather than logging and granting. The "what to return when not configured" decision is the same question — log + no-op vs return error — but the answer depends on the cost of getting it wrong. Email a sign-in link that didn't actually send: user retries, no loss. Grant an entitlement to a user who didn't actually pay: real loss.

## The takeaway

For most outbound third-party integrations — email, push notifications, observability events, audit-log forwarding — `IsConfigured` + log-then-no-op is the right default. Build the feature fully wired. Make the secret-not-set path return success-shaped silence. Ship it before the operator has the credentials in hand. Light it up the day they do.

Two lines of interface. One degraded mode. Four integrations wearing the same shape. That's the pattern.
