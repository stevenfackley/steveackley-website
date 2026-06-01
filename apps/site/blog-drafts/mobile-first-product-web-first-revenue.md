<!--
Admin form fields:
  Title:    Mobile-first product, web-first revenue
  Slug:     mobile-first-product-web-first-revenue (auto-derived)
  Excerpt:  The product belongs on a phone. The store-approval timelines say revenue starts on the web. This is the shape of a release plan that respects both, and the architectural decisions that let them not be in conflict.
  Cover:    (none)
  Body:     everything below this comment
-->

For a long time I assumed "mobile-first" and "where do users pay first" were the same answer. Build the apps, list them in the stores, take store payments through the platform-native IAP rails. The web exists only for marketing.

I now think that's wrong for any product that wants its first dollar before its first month of operation. Mobile-first should describe *where the product lives long-term*. The first revenue path should be *whichever surface ships fastest with no third-party gatekeeper*. For most projects shipping in 2026, those two answers are different.

This is the case for treating the web as your billing surface even when the product is going to be a phone app.

## The asymmetry

Time-to-first-dollar by surface:

| Surface | First user can pay you | Gatekeeper |
|---|---|---|
| Web (Stripe Checkout) | Same day you finish the integration | None — Stripe approves you when you set up the account |
| Android (Google Play Billing) | 3–7 days from upload, longer for new developers | Play Console review |
| iOS (App Store IAP) | 1–3 weeks from upload, longer for new developers + IAP entitlement | App Review, IAP entitlement enabled by Apple |

These are not equivalent latencies. A web checkout integration is gated by your code shipping. A store-native checkout is gated by you *and* one or more reviews, and at least one of those reviews can come back and ask you to address something that takes another cycle. New developer accounts in particular sit on extra review queues.

If you accept this asymmetry, the question stops being "should I use Stripe or store IAP?" and becomes "what should pay come through *first*, given that store rails will be available later?"

## The answer is "both, but stripe first"

The architecture I landed on:

- **Web** — Stripe Checkout for subscriptions. Available immediately, paid users can authenticate via magic link, entitlements written to the backend.
- **Android** — Google Play Billing. Available the moment the build clears Play Console review. Validates receipts server-side, writes to the same entitlements table.
- **iOS** — App Store IAP. Available the moment the build clears App Review. Validates JWS server-side, writes to the same entitlements table.

The thing all three writers have in common: **they all write into one entitlements table**, and a user with any of them sees their entitlement on any surface they sign into. A user who pays via Stripe on the web, then later downloads the iOS app, signs in with the same email, and immediately sees their access. The iOS app didn't sell them anything; the iOS app reads from the backend.

This requires one architectural commitment up front: **the entitlement domain is shared, the platform-of-purchase is just metadata on the grant.** Concretely, the `EntitlementGrant` table has a `StorePlatform` column (Stripe / GooglePlay / AppleAppStore) and a `StoreTransactionId` column. The read path (`GET /api/me/entitlements`) doesn't filter by platform. The write paths are distinct — three different validators dispatching by platform — but they converge on one table and one read API.

The benefit is that "where the user paid" becomes invisible to the rest of the system. Lesson access, mark-complete, streak tracking, push notifications, analytics — none of it cares whether the user is a Stripe customer or a Google Play subscriber. The mobile apps don't grow a "did this user pay on the web?" code path; they just ask the backend "what does this user own?" and the backend's answer reflects whatever the most-recent platform-of-purchase wrote.

## The store-policy thing that actually matters

The reason this isn't already obvious to everyone is a real one: **the stores forbid third-party payment for digital goods sold inside the mobile apps.** If I shipped a Stripe SDK in my iOS app and let users buy a subscription from inside the app, Apple would reject the build. Same on Android for digital goods sold via the Play Store binary.

This is sometimes confused with "you can't sell digital goods via Stripe at all." That's not what the rule says. The rule is about *what's in the app binary*. The website is allowed to have a checkout; the *app* is not allowed to point users at it (Apple specifically — Google is more permissive in 2024+).

So the practical implementation:

- The **website** has Stripe Checkout, Customer Portal, the full billing surface. It sells subscriptions freely.
- The **mobile apps** have Google Play Billing / App Store IAP only. They don't link to the website's checkout, they don't have a "subscribe via web" button, they don't have any UI that an App Reviewer could interpret as "this app is steering users away from IAP."
- Both the website and the apps read entitlements from the same backend. A user who paid via the web is fully usable in the mobile app, because the mobile app sees them as "has all-access entitlement" without ever knowing it came from a Stripe webhook.

The website doesn't need to *advertise* that the mobile apps will work with their web-purchased subscription, but it does need to handle the user who signs into the app and expects their stuff to be there. That handling is invisible — they sign in, they see content unlocked. No upgrade dance, no platform mismatch screen, no friction.

## The revenue ramp this enables

Without this split:

- Day 0 of project: ship the website with marketing copy. No revenue.
- Day 0-30: build mobile apps. No revenue.
- Day 30-60: store-approval cycles, eventually first paid users.

With this split:

- Day 0: ship the website with marketing copy. No revenue.
- Day 0-7: integrate Stripe Checkout on the web. First paid users.
- Day 7-37: build mobile apps. Existing paid users are testing the mobile experience.
- Day 37-60: store-approval cycles, mobile-native users join the existing paid base.

The first month gives you something the all-store path doesn't: **real subscribers using the product**, paying real money, generating real product feedback before the apps are even submitted. You learn what the value proposition actually is from people who actually paid. The mobile apps ship into a product that's already been validated, not into an empty room.

## Where this doesn't apply

A few cases where the all-store path is right and the split is wrong:

**Games.** Game players almost exclusively buy on the platform where they play. A web checkout for an iOS game is unconventional enough that it feels broken; new users will assume it's a scam. Stick with IAP, lean on the cleaner UX, accept the longer time-to-revenue. (Big games launch with both, but small/indie should single-track.)

**Highly platform-native products.** A keyboard app, a system tweak, a productivity utility that only makes sense on one OS — the user's entry path is the platform store, not the web. Web checkout has nowhere to fit.

**Strictly free or ad-supported products.** No checkout to ship. Not relevant.

**Products that have no reason to ship before stores approve.** If you have unlimited runway and no urgency to validate the product, the simpler architecture (IAP only) wins. The split is a complexity choice that buys you weeks of revenue at the cost of an additional code path and an additional payment processor relationship.

For everything else — subscription products, content products, services where the cost of waiting is "users who would have paid don't have a way to" — the split pays for itself before the first store approval lands.

## What you have to build to make it work

Three pieces, in this order:

1. **A unified entitlements domain.** Plain table, `(UserId, ProductId, ExpiresAtUtc, Platform, StoreTransactionId)`. Read path doesn't filter by platform. Write paths are platform-specific but converge here. Build this *first*, with no real payment integrations attached. Test that you can synthesize a grant manually and have the app surface it.

2. **Web Stripe Checkout.** Three endpoints: create checkout session (with the user's email and the price ID), webhook handler (`checkout.session.completed` + `customer.subscription.*` events, all signature-verified), session-claim (post-purchase redirect lands at `/subscribed?session_id={CHECKOUT_SESSION_ID}`, which mints a magic link if the user wasn't already signed in). One additional endpoint for Customer Portal so paid users can self-serve cancellation and update billing.

3. **Mobile IAP, later.** Both validators (Apple, Google) plug into the same entitlement-write surface as the Stripe webhook. They don't need a parallel domain, they don't need parallel read APIs. The IAP code only deals with platform-specific receipt validation — once validation succeeds, it calls the same `GrantPurchaseAsync` that the Stripe webhook calls.

If you build them in this order, every layer below the third one is exercised by real users before you ever submit to a store. The store apps ship into a stable backend. The risk of "the entitlement code paths have never been used by a real paying user" is gone.

## The discipline this requires

The temptation, once Stripe is up and the web is taking money, is to skip building the IAP integrations. Why bother — the web is working, paid users have an account, who cares about mobile-native billing?

A few months in, you find out who cares: every user who learns about the product through TikTok or Twitter or word-of-mouth and grabs the app first. Their flow is: install app → see "subscribe to unlock" → expect an in-app purchase. They've never seen your website. They will not install an app, abandon it to a browser, complete a Stripe checkout, then come back to the app and sign in. They will install the app, see no IAP, and uninstall.

So you have to build the IAP path *eventually*. The "mobile-first product, web-first revenue" plan is a sequencing decision, not an architectural cop-out. You ship Stripe first because you can. You ship IAP second because you must, once the apps are real.

## The summary

Mobile-first means the product lives on a phone, long-term. Web-first revenue means the first paying user happens on a browser, because that's the only surface that doesn't have a store between you and them. Both are true at the same time for any subscription product where you want users paying before the stores are ready.

The architectural cost is one unified entitlements domain. The architectural benefit is that "where you paid" stops mattering to any code below the validator layer. The business benefit is weeks of revenue you wouldn't otherwise have, plus a paying-user feedback loop while the mobile apps are still under construction.

Don't pick one of "web vs. mobile." Pick "web first, mobile second," and design so both write into the same place.
