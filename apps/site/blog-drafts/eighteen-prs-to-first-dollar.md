<!--
Admin form fields:
  Title:    Eighteen PRs to first dollar: a weekend shipping Synap's paid-user loop
  Slug:     eighteen-prs-to-first-dollar (auto-derived)
  Excerpt:  How I went from "deployed marketing pages" to "paying users can actually use the product" in 48 hours — and the four bug classes I rediscovered along the way.
  Cover:    (none)
  Body:     everything below this comment
-->

Synap takes real money now. Two days ago it didn't.

Friday afternoon the site at `getsynap.app` was a marketing page for six learning tracks plus a deployed `.NET 10` API. Sunday night, a paying user can subscribe via Stripe, get auto-signed-in via a cookie set from the redirect, browse a library of modules they own, read lessons with real Markdown rendering, mark them complete, see a streak counter, and self-serve cancel through the Stripe Customer Portal. Eighteen PRs landed. The CD pipeline grew up. I rediscovered four bug classes worth naming so I don't lose another afternoon to them next year.

This is a post about what shipping in volume actually teaches — and the patterns that survive once the dust settles.

## The starting state

On Friday I had:

- A `.NET 10` modular backend on EC2 behind Cloudflare Tunnel, deploying via OIDC → SSM
- A Blazor SSR marketing site with six learning-track detail pages and SEO
- Two mobile shells (Compose for Android, SwiftUI for iOS) that compiled and rendered screens
- A `StripeBillingService` in code that... had no `/subscribe` page in front of it

What I *didn't* have:

- A way for a user on the marketing site to actually buy anything
- Any logged-in surface (no auth flow that touches a browser)
- Any rendered content (the JSON modules existed, no UI consumed them on the web)
- A way for a paid user to come back the next day on a different device

The gap between "deployable backend" and "usable product" is a real gap, and you don't close it with one big PR. You close it with a sequence of small ones, each carrying a defensible scope.

## Two ADR calls that defined the weekend

### 1. Amend the commerce ADR, don't reverse it

The original commerce ADR rejected web checkout for in-app digital-goods sales because Google Play and the App Store forbid third-party payment from inside mobile apps. I needed Stripe on the website to take a first dollar before stores approved anything.

The mistake would have been to reverse that ADR. The right move was to amend it — explicitly recording that the original rejection was about **in-app** payment, not about the website having a checkout. The website is a different surface. Stripe on `getsynap.app` for a subscription whose entitlements the mobile app reads via `/api/me/entitlements` doesn't violate either store's anti-steering rules. The mobile apps never see a Stripe SDK.

What this saved me: every subsequent reader of the decisions log gets both calls in context. The original ADR isn't wrong; it answered a different question. Reversing it would have made the new contributor wonder which answer is current.

### 2. Refuse to swap auth for Supabase even when it would be faster

Midway through the loop I hit the gap that returning users on a different device had no way to sign in. The cookie set after Stripe checkout works for that browser; magic-link email is what handles new devices. SES and a one-time-token flow was a clear path, but at the moment I had to write it, swapping to Supabase Auth for the email flow alone would have been faster.

The 2026-05-13 auth ADR explicitly rejected vendor IdPs — first-party JWT, no Supabase, no Cognito, no Auth0. The cost was a few hours of building magic-link mint/exchange endpoints. The benefit was the auth ADR staying honest, no per-MAU pricing pressure, and the same JWT shape working across web + mobile.

ADRs only earn their keep when you treat the decisions inside them as binding once made. Reversing on convenience without writing a new ADR is how repos accumulate competing answers to the same question.

## The Stripe-as-third-platform pattern

The architecturally interesting decision was how to wire Stripe into a commerce model that was already validated against Google Play + Apple App Store receipts.

```csharp
public enum StorePlatform
{
    GooglePlay,
    AppleAppStore,
    Stripe   // ← the entire schema change
}
```

The existing persistence layer has a `Purchase` table with a `(Platform, StoreTransactionId)` unique index. That index was added to make IAP receipts idempotent — Stripe replays naturally collide on `(Stripe, evt_…)` the same way Play replays collide on `(GooglePlay, GPA.…)`. No new schema. No new entitlement table.

`IReceiptValidator` already had a composite dispatcher (`CompositeReceiptValidator`) routing by `StorePlatform`. Stripe didn't fit cleanly because Stripe's authoritative channel is the webhook, not a client-handed receipt. So Stripe got a parallel `IEntitlementService.GrantPurchaseAsync` for the webhook path, while IAP keeps the existing `ValidatePurchaseAsync` for client-submitted receipts. Same persistence shape, different ingress.

The shape worth keeping: **widen an enum before you fork a service**. The downstream `GetEntitlementsAsync` blissfully doesn't know where the grant came from. That's the test for whether the abstraction held.

## The pattern: `IsConfigured` + fail-soft, repeated four times

Every external integration in the system follows the same pattern now:

```csharp
public interface IThing
{
    bool IsConfigured { get; }
    Task<TResult> DoThingAsync(...);
}

// Implementations check IsConfigured first; if false, log and return
// success-shape-but-no-op rather than crashing or throwing.
```

Applies to:

- `GooglePlayReceiptValidator` — env vars + service-account JSON unset → composite falls through to `FailClosedReceiptValidator`
- `AppleAppStoreReceiptValidator` — `.p8` key unset → same composite fallback
- `StripeBillingService` — `STRIPE_API_KEY` unset → checkout/portal endpoints return 503 with a clear error code
- `SesMagicLinkEmailService` — `SYNAP_SES_FROM_ADDRESS` unset → logs the magic link at `Information` level and returns success

The payoff: the feature ships fully wired. The operator flips one env var when SES is verified or Stripe is live, and the surface lights up — no redeploy, no behavior change at the code seam. New environments (a fresh dev clone, a staging box, a re-provisioned production instance) work without all dependencies satisfied; the surfaces that need them silently degrade until they're configured.

This is the same posture as `FailClosedReceiptValidator`: when in doubt, refuse — but refuse in a way that surfaces the gap clearly in logs without crashing the boot. Visible degradation beats silent breakage.

## Four bug classes worth naming

### `JwtSecurityTokenHandler.MapInboundClaims` defaults to `true`

This one cost me 20 minutes of staring at a working mint path and a 401-returning validate path on the same JWT.

```csharp
var handler = new JwtSecurityTokenHandler();
// handler.MapInboundClaims is true by default
// On ValidateToken, this silently rewrites:
//   "sub"   → "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
//   "email" → "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
// principal.FindFirst("sub") returns null. Your code thinks the token is malformed.
```

The fix is `new JwtSecurityTokenHandler() { MapInboundClaims = false }` — set on **every** instance you construct. The JwtBearer middleware in `Program.cs` already does this for the API's session-validation pipeline, but anywhere you build a handler manually (in my case, for magic-link token validation) you have to set it again. There's no global config flag.

This is the kind of footgun you can only learn by hitting. It's not in the API surface; it's a default value on a class you instantiate. The session-validation path never hit it because JwtBearer handles its own validation internally. Magic-link exchange was the first place I built a `JwtSecurityTokenHandler` myself, so it was the first place the silent claim-name rewrite mattered.

### Env vars in CD only live during the deploy

The original deploy script `export`ed an image tag inside an SSM `RunShellScript` session and ran `docker compose up`. The container came up on the new tag. The deploy job went green.

Then anything else that touched a container — a manual `docker compose up -d --force-recreate` to roll a config change, a host reboot, the *next* deploy starting from a fresh shell — would re-read `/opt/synap/.env` (where `SYNAP_IMAGE_TAG` was never written) and silently fall back to whatever default the compose file declared. The default was `latest`, which the workflow never tags.

The fix is one `sed -i || echo >>` against `.env` so the tag is *persisted*, not just *exported*. The class of bug is general: **make `.env` the source of truth for everything compose reads, and have CD write to it**. Don't ride on the deploy shell's process environment for state that other operations need.

### CD compose-file drift

A related but distinct bug. The deploy script updated `.env` but never updated `docker-compose.yml` on the box. So when a PR added new env-var *declarations* to a service block (the `STRIPE_*` lines, for instance), the env file had the values but the box-side compose file didn't list them — and `${VAR}` interpolation only happens for vars the compose service declares.

Result: a paying user's Stripe checkout returned 503 with "Stripe not configured" while `/opt/synap/.env` had the keys sitting right there. Cleanest fix turned out to be base64-encoding `docker-compose.yml` from the workflow's checkout and inlining it into the SSM command. The compose file is small (~3 KB), well under SSM's 64 KB SendCommand parameter limit, and avoids needing to authenticate from the box to a private repo.

### Parallel background agents sharing one git working tree

This was the dumbest bug, and the most expensive. Two background tasks editing the same working directory will eventually step on each other's `git checkout` / `git commit` / `git push`. One commit landed on the wrong branch. Another commit got pushed to a remote ref that pointed at the wrong tip. I spent twenty minutes untangling instead of writing.

The fix going forward is to use isolated worktrees (`git worktree add`) for any parallel work that touches the filesystem. The same lesson applies to dispatching multiple tasks in any tool that shares state.

## What shipping in volume teaches

Velocity isn't the point. The point is that velocity *exposes* the patterns and bugs that a slower pace lets you avoid noticing. If you only ship one PR a week, you can paper over `IsConfigured` checks with hand-rolled `try/catch`. If you only deploy once a month, you can forget to persist `SYNAP_IMAGE_TAG`. If you only build one auth flow, you can ignore that `MapInboundClaims` defaults to `true`.

Eighteen PRs in a weekend isn't a brag. It's a stress test. The system either holds up under load and surfaces its rough edges, or it folds. Synap held up; its rough edges are now in a decisions log with dates next to them. Next year when I'm wondering why the SSM script has a base64 blob in it, the commit message will remind me.

The product takes its first real dollar in a few days, once SES is verified and live Stripe keys swap in. The engineering is the easy part. Charging confidently for something is the hard part — and a system that fails soft and surfaces its gaps clearly is the only one I'd want to try it with.
