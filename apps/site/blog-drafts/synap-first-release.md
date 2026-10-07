<!--
Admin form fields:
  Title:    Synap's first tagged release: a free lesson on the web, the apps still internal
  Slug:     synap-first-release (auto-derived)
  Excerpt:  On 2026-10-07 I cut 20261007_synap_Release after a review found an iOS crash on any network error and lessons the server never locked. Here is what works at getsynap.app today, what is still internal, and what is left.
  Category: Release
  Tags:     synap, release, kotlin-multiplatform, ios, android, dotnet
  Cover:    (none)
  Body:     everything below this comment
-->

At 06:39 UTC on 2026-10-07 a self-hosted runner published the first GitHub Release Synap has ever had, `20261007_synap_Release`. The job took about twenty seconds and rebuilt nothing.

Thirteen non-Dependabot pull requests merged to `main` between 04:20 and 06:34 UTC that morning. About half were fixes for problems a code review turned up that night; the rest were refactors, CI and docs. The tag sits on the last one, #256. This is not a public launch. You can take a free lesson on the web today. You can't buy anything, and both mobile apps are internal builds.

## The product

Synap gives you one short professional lesson a day (the catalog times each at three to four minutes) and a streak to keep you coming back. The catalog has six modules and 28 lessons covering AI foundations, applied AI, agentic AI, fintech and ledgers, data analytics, and cybersecurity. A lesson mixes short text and code with interactive blocks: multiple choice, multi-select, ordering, fill-in-the-blank, and free response.

I have described Synap as AI-evaluated before. The shipped product is narrower. You check a free-response answer yourself against an expert rubric. On iOS 26 and later with Apple Intelligence, the app can grade it on the device; Android uses self-review. Server-side AI grading doesn't exist yet, and the website no longer says "Scored by AI."

The code is one monorepo: a .NET 10 API on Postgres, a Blazor web app, and Kotlin Multiplatform apps with Compose on Android and SwiftUI on iOS. The repo is private, so PR numbers below are bookkeeping.

## Using it today

Go to [getsynap.app](https://getsynap.app) and take the free starter lesson without an account.

Email sign-in only sends a link to an address the API already has on file. On the web, new accounts come from checkout or Google sign-in, and production has both switched off.

The [subscribe page](https://getsynap.app/subscribe) lists All-Access at $15 a month and two one-time packs, AI and FinTech, at $30 each. Above them it says purchasing isn't open yet and nothing can be charged today. Production still runs a Stripe test key. #238 added a gate for that case: while the key isn't live, checkout answers 503 `checkout_closed` and the availability endpoint returns `{"checkoutOpen":false}`, as it did when I checked on 2026-10-07. The same PR stopped email sign-in from claiming it had sent a link when production has no sender configured.

[Eighteen PRs to first dollar](/blog/eighteen-prs-to-first-dollar) opened with "Synap takes real money now." Its own last section said the first real dollar was a few days off, waiting on SES verification and live Stripe keys. SES got there; the keys never went in. A scripted customer walkthrough of production on 2026-08-27 landed in Stripe's test mode, and #238 came out of that audit. The web-first plan from [Mobile-first product, web-first revenue](/blog/mobile-first-product-web-first-revenue) stands.

## The review

Three review agents covered the backend, the clients and release readiness; implementer agents fixed what they found while I reviewed and merged. Four findings mattered to users.

The iOS app crashed on any network error. None of the Kotlin suspend functions that Swift calls carried `@Throws`, and without that annotation Kotlin/Native lets only `CancellationException` cross into Swift. Anything else, a dropped connection included, killed the app. #243 added `@Throws(Exception::class, CancellationException::class)` to each of them. I wrote up the mechanics in a separate post on [`@Throws` and the generated header](/blog/kotlin-native-throws-and-the-header-you-must-read).

The server never enforced entitlements. `/api/modules/{id}` returned every block of every lesson, quiz answers included, to anyone who asked, and the paywall lived only in the clients. #244 moved the rule into the API, which I cover in [server-side lesson locking](/blog/a-client-side-paywall-is-not-a-paywall). The first lesson of each module is free. The rest come back as `locked: true` with an empty block list unless you hold All-Access or that module's pack, and completing a locked lesson returns HTTP 402 with `lesson_locked`. Android (#243) and iOS (#253) send locked lessons to the paywall.

The mobile apps couldn't open a module at all. The API serialized enum values with a capital letter, as in `"tone":"Key"`, and the Kotlin client accepted only lowercase. #244 changed the casing on the server, and #243 made the Kotlin decoder case-insensitive as a second guard.

The paywall lacked copy the stores require. #242 (iOS) and #243 (Android) add Terms of Use and Privacy Policy links and a renewal disclosure. The iOS subscription reads "Renews monthly at <price> until cancelled," and packs say "One-time purchase." The same PRs moved session tokens into the iOS Keychain and into Keystore-backed encrypted storage on Android. #242 also limited every iOS dev-token path to debug builds; Android's already was. None of it has been submitted for store review.

The rest was hardening. #240 fixed a backend security bug; an integration test reproduced it before any code changed. #241 stopped mail scanners from spending single-use sign-in links by moving sign-in to a POST from a confirm page, and added CSRF protection. #245 added an HTTPS redirect, HSTS and security headers to the web app, and #256 added HSTS to the API.

## The tag

#239 added `release.yml`. You push a tag shaped `YYYYMMDD_synap_Release`, and the workflow stops unless the tag's commit is the head of the last successful deploy on `main`. Then it points the `synap-api` and `synap-web` images at the `prod-<sha>` builds already running in production and publishes a GitHub Release with generated notes. The first tag sits on `353cfee`, the squash commit of #256. The release has no downloadable files, and its notes list every PR since the repository started, mostly Dependabot bumps.

Five more PRs merged later on 2026-10-07 and missed the tag. #257 moved image builds and deploys onto self-hosted runners, #258 removed database access from the API project, and #259 through #261 gave every lesson block a stable id such as `text-1`, which the web, Android and iOS clients now key per-block state on. Production picked up #257 through #259 the same day.

## Where the apps are

Neither app is public. The getsynap.app home page shows "Coming soon" badges for the App Store and Google Play.

Android is on the Play internal testing track, which only invited testers can install. I published the first internal release, 0.1.0, by hand on 2026-08-27. Since 2026-08-29, when CI's first automated upload to the internal track passed, pushes to `main` that touch the Android or shared code send new builds there (#255 skips iOS-only changes). The upload passed again on 2026-10-07 after #260 merged, so the newest internal build includes #243. I haven't opened the Play Console to confirm what the track serves.

iOS is in TestFlight for an internal group. The last upload I can find is build 344281 (1.0.0), from 2026-08-28. The iOS workflow runs only on a manual dispatch or an `ios-v*` tag, so merging iOS code builds nothing, and none of the three dispatches after 344281 uploaded a build. That build predates every iOS fix above. The TestFlight copy of Synap still has the network-error crash.

## Before launch

1. Dispatch a TestFlight build from current `main` so iOS testers get the fixes above.
2. Smoke-test a signed release build on a real device on both platforms, from sign-in through Restore Purchases.
3. Fill in the legal pages. The live Terms still have placeholders for the legal entity name, effective date, governing state, contact email and minimum age.
4. Put live Stripe keys, prices and the webhook on the production box, and set a public business name. Checkout reopens on the next `docker compose up` with no code change.
5. Create the in-app purchase products in both stores, then the store listings and privacy forms.
6. Move the sign-in sender from a qavrensolutions.com address to getsynap.app, and give getsynap.app an MX record or a forwarder. It has neither today, so replies bounce.

I have no launch date for the apps.
