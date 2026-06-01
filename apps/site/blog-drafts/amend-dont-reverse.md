<!--
Admin form fields:
  Title:    Amend, don't reverse: ADR discipline for fast-moving products
  Slug:     amend-dont-reverse (auto-derived)
  Excerpt:  When scope changes, your decisions log is at a fork: edit the original ADR, or add a new one that records what changed and why. Pick the right one and the log stays useful for the next reader.
  Cover:    (none)
  Body:     everything below this comment
-->

Two weeks ago I wrote an ADR that said web checkout was off the table. This past weekend I shipped Stripe-on-web and took a first dollar.

That's not a reversal. That's an amendment. The distinction matters more than the word count would suggest, and it's the difference between a decisions log that stays useful for a year and one that collapses into "see the most recent entry."

Here's the discipline I've landed on.

## What the original ADR actually said

The commerce ADR (May 30) chose **native store billing** — Google Play Billing on Android, App Store In-App Purchase on iOS — with server-side receipt validation. It explicitly rejected web checkout / Stripe.

The rejection had a real reason: both stores forbid third-party payment for digital goods sold *inside* the mobile apps. If I shipped a Stripe SDK in my iOS app to sell a subscription, Apple would reject the build. The premium subscription positioning lived inside the mobile apps; Stripe couldn't get there.

That ADR was correct. It's still correct. It answered the question "how do iOS/Android users pay for premium content from inside the app?" and the answer was, and is, "through the store, with server-side validation."

## What the new ADR actually says

Fast-forward two weeks. The mobile apps aren't on the stores yet (still building toward upload). Store approval is realistically 3-6 weeks for first-time IAP, longer if there's any back-and-forth. Meanwhile, the marketing website is live, the backend is healthy, and there's nothing for a user who lands on `getsynap.app` to actually buy.

The right move was to add Stripe Checkout on the website itself. Different surface, different question:

> Is the website allowed to sell a subscription, when the same subscription's entitlements get read by the mobile apps after they launch?

Answer: yes. Stores forbid third-party payment **inside** the apps. They don't forbid the website having a checkout — they can't, and they don't try. Subscriptions sold on `getsynap.app` get persisted with the same entitlement model as IAP-sold ones; when the mobile app eventually queries `/api/me/entitlements`, the user sees their access regardless of where they bought it. The mobile apps never see a Stripe SDK.

## Why this is an amendment, not a reversal

A reversal would have looked like:

> ~~Monetization = native store billing.~~ Actually, scrap that. Monetization = Stripe web checkout.

That would have invalidated everything the original ADR said. The next reader would arrive thinking "okay, so we use Stripe for everything," which would be wrong for the mobile path. They'd ship a Stripe SDK in the iOS app. They'd get rejected by App Review. They'd come back to the decisions log confused.

An amendment looks like:

> The May 30 commerce ADR stands: mobile in-app purchases continue to flow through Play Billing / App Store IAP with server-side receipt validation. **What this ADR permits is a parallel web-side checkout on `getsynap.app` itself.** The original ADR was answering "how do iOS/Android users pay inside the app?" — not "is the website allowed to sell anything?" — and this ADR records the difference explicitly so the next reader doesn't read the prior one as a total ban.

Both ADRs are now correct. The reader gets both pieces of context. The mobile path is unchanged; the web path is added. The decision space got *larger*, not different.

## The test I use

Before writing the new ADR, ask: **does the original ADR's rationale still apply to the cases it covered?**

If yes — if the original ADR was correct for the question it answered, and the new situation is a different question — you're amending. Write a new entry that explicitly preserves the original and records what's new.

If no — if the original ADR's rationale was wrong, or if circumstances changed in a way that makes the original answer wrong even for its original scope — you're reversing. Write a new entry that explicitly invalidates the original and records why.

The two cases get different headers:

```markdown
## 2026-06-01 — Commerce: web checkout (amends 2026-05-30)
```

versus

```markdown
## 2026-06-01 — Commerce: web checkout (reverses 2026-05-30)
```

A reader scanning the table of contents knows which they're in for. The word in parentheses is doing structural work; pick it carefully.

## Why this matters more for fast-moving products

In a stable codebase with quarterly architecture reviews, you can afford to be sloppy with ADR vocabulary. Decisions don't change often; when they do, "we changed our minds" is enough explanation.

In a product moving at the pace of a daily standup — where I might write an ADR on Monday and need to evolve the surface it described on Friday — the decisions log is the only thing standing between "context is fresh" and "what does this even mean now?" Without amendment discipline, the log decays in two failure modes:

**Ambiguity decay.** The reader can't tell which ADR is currently in force. The most recent one is usually right, but only "usually" — sometimes an older ADR is still the operative one for a sub-case. Without explicit relationship markers (`amends X`, `reverses X`, `supersedes X`), you have to read every entry in time order and reason about which still applies.

**Trust decay.** When ADRs contradict each other without acknowledging it, the next reader stops trusting the log to be a faithful record. They start ignoring it. They start writing new code without consulting it. The log becomes archaeology instead of guidance, and the team's design culture rots one ignored ADR at a time.

## The practical rules

**Always cite the prior ADR by date.** Not "the commerce ADR" — "the 2026-05-30 commerce ADR." Dates are unambiguous; titles drift as the product evolves and old titles get rewritten.

**Always state explicitly what changes and what doesn't.** "The May 30 ADR's stance on Y stays; this ADR adds X" is more useful than "this ADR is about X." A reader who hasn't read the prior one shouldn't need to to understand the relationship.

**Always include the rationale for the change.** Even if it's obvious to you today. The reader in six months won't have your context. "Why did the situation change?" is the most common question a future reader asks an ADR; answer it before they have to.

**Never silently delete an ADR.** If a decision is genuinely obsolete (the system it described doesn't exist anymore), mark it superseded. Don't erase the history of what you decided and when. The log's value is partly archaeological: it tells you what you knew at the time you decided, which lets you re-evaluate the decision later with the original context intact.

## A worked example

My amendment ADR for the Stripe-on-web decision starts like this:

```markdown
## 2026-05-31 — Commerce: web checkout for non-IAP entitlements (amends 2026-05-30)

- **Amends, does not reverse,** the 2026-05-30 commerce ADR. That ADR
  rejected web checkout *for in-app digital-goods sales* because Google
  Play and the App Store forbid third-party payment from inside the
  mobile apps. That rule stands — mobile in-app purchases continue to
  flow through Play Billing / App Store IAP with server-side receipt
  validation. **What this ADR permits is a parallel web-side checkout
  on `getsynap.app` itself**...
```

The header tells you it's an amendment. The first bullet restates what's preserved before introducing what's new. By the end of the first paragraph, a reader who's only ever seen the original ADR knows exactly how to integrate this new entry into their mental model.

That's the whole job.

## When in doubt

If you can't tell whether you're amending or reversing, the safer choice is to write it as an *amendment* and be more explicit about scope. Amendments are additive — they leave more in place. If you accidentally amend something that should have been reversed, the prior ADR is still in the log and the next reader can flag the contradiction. If you accidentally reverse something that should have been amended, you've thrown away context that's hard to get back.

In a year, the decisions log won't be perfect. It'll have entries that aged badly, decisions that turned out wrong, ADRs that should have been split into two. But if the discipline holds, every entry will at least be honest about its relationship to what came before. That's the floor.

Amend when you can. Reverse when you must. Cite the prior date either way. Future-you will thank present-you for the five extra sentences.
