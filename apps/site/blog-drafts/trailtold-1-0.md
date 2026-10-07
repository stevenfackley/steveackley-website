<!--
Admin form fields:
  Title:    TrailTold 1.0: on Google Play, in TestFlight, and a $4.99 Park Pass on the way
  Slug:     trailtold-1-0 (auto-derived)
  Excerpt:  TrailTold is on Google Play in the US and the iPhone build is in TestFlight. Build 1.0.0+15, in a 20% Android rollout, is the first to carry a $4.99 Park Pass. Nothing is for sale on iPhone yet.
  Category: Release
  Tags:     trailtold, release, android, ios, flutter, revenuecat
  Cover:    (none)
  Body:     everything below this comment
-->

At 19:04 UTC on 2026-10-05 one release run finished TrailTold 1.0.0+15 for both stores. The Android bundle went to the Google Play production track as a 20% staged rollout, submitted for Google's review. The iOS build went to TestFlight after Apple's validator printed `VERIFY SUCCEEDED`. It is the first build to carry a $4.99 Park Pass.

When I introduced TrailTold on 2026-07-31 in [The plaque problem](/blog/the-plaque-problem), I wrote that it was not available. Play's closed track had 1.0.0+3, TestFlight had 1.0.0+4, and one park had a tour: Kennesaw Mountain, three stops.

## Google Play

TrailTold is on Google Play in the United States as [Trailtold: Park Audio Tours](https://play.google.com/store/apps/details?id=com.qavren.trailtold). The first production build, 1.0.0+12, went to Google's review on 2026-08-26 as a full rollout. I shipped it with purchases switched off because the production RevenueCat webhook was not wired yet, and that webhook records who paid. A paywall in front of a missing webhook would have charged people and granted them nothing.

On 2026-10-04 I wired the webhook and released 1.0.0+13 with purchases on. 1.0.0+14 and 1.0.0+15 followed on 2026-10-05. All three went to the production track at a 20% staged rollout. When I checked the listing on 2026-10-07 it read "Updated on Oct 5, 2026" and showed "In-app purchases". My records don't tell me which build your phone gets today, or whether Google has finished reviewing +14 and +15. The listing's "What's new" text still describes the first public release, and its description doesn't mention the Park Pass yet.

## TestFlight, and no App Store yet

The iPhone build lives in TestFlight. The last App Store Connect state I have, read on 2026-10-06, shows version 1.0 in "Prepare for Submission" with build 15 attached and the Park Pass in-app purchase ready to submit. I have not sent it to App Review, so you can't buy anything on an iPhone.

Preparing it turned up one Apple rule. The App Store Connect API will not submit an app's first subscription; you attach it to the version by hand in the web UI. The API's answer is a bare 409 until you print its associated errors, and PR #221 makes my submit script print them. PR #222, still open, sets the version's copyright line.

## The API and the website

api.trailtold.com runs release `20261005_trailtold_Release`, deployed 2026-10-05, with the Park Pass server code from PR #216. The 2026-10-04 release needed a manual dispatch, because a Dependabot cost guard read the tagged commit's author and skipped the whole run. PR #207 dropped the guard from the production deploy; [Three deploys that stopped without a red run](/blog/three-ways-a-deploy-quietly-stops) tells that one in full.

Wiring the webhook also showed me that the production API had no object-storage settings at all. Every paid offline-pack download would have failed after the store had taken the money. I added a read-only storage credential, confirmed it from inside the production container, and only then turned purchases on.

[trailtold.com](https://trailtold.com) is an Astro site on Cloudflare Pages, redeployed on 2026-10-04 with a privacy policy dated October 3, 2026. Its home page still says "Coming soon to iOS" and "Coming soon to Android". The Android half is wrong. Use the Play link above until I fix it.

## What you get for free

You can browse all 474 National Park Service units and 15,899 places without an account. Five parks have guided tours, 41 stops between them: Martin Luther King, Jr. National Historical Park, Kennesaw Mountain National Battlefield Park, Fort Sumter and Fort Moultrie National Historical Park, Antietam National Battlefield, and Independence National Historical Park. I published the launch slate on 2026-08-24 through a new publish-tour workflow (PR #150). The other 469 units have place pages and no tour.

Pick the park's tour, start it with the app open, allow location while using the app, and put the phone in your pocket. Each stop's story starts when you get within its trigger radius, 30 m by default. At 30 m I found nine pairs of stops close enough that both fences fired and the engine couldn't tell them apart. The five launch tours use 25 m, and I cut the closer stop of every pair that still overlapped. PR #199 now refuses to publish a tour whose radii overlap, and [the geofence post](/blog/the-geofence-is-not-a-postgis-query) covers how the trigger decides. PR #213 fixed iOS tours that stopped tracking when the screen locked. Free narration uses the phone's own text-to-speech.

Only the five tour parks have a detailed basemap, served from TrailTold's own storage. Since PR #200, merged 2026-10-04, the other parks tell you there is no detailed map instead of showing a blank one.

You need an account only to add notes, review a tour, follow people, or buy. Sign-in is email and password, Sign in with Apple, or Sign in with Google. Notes go through moderation before anyone else sees them. Reviews appear right away, and every review can be reported or its author blocked. Reviews now page with "Show more reviews" (PR #198), and you can delete your account from the Profile screen.

## Pro and the Park Pass

TrailTold Pro is a monthly or yearly subscription sold through the App Store and Google Play, with RevenueCat tracking who has it. App Store Connect has it at $4.99 a month and $39.99 a year; I haven't checked the Play prices against those. Pro adds offline packs (a tour's audio and map, playable with no signal) and recorded narration, on every tour.

The Park Pass costs $4.99 once. You buy it on a park's tour and it opens that park's offline map and narration for good. A pass you bought and haven't spent stays on your account until you use it.

1.0.0+14 tried a separate store product for each tour park. On 2026-10-05 I replaced them with one consumable product and a credit ledger on the server, which I wrote up in [One Park Pass instead of a store product per park](/blog/sell-one-credit-not-one-product-per-park). A per-park product bought before the switch keeps working.

## Still gated

Nothing is for sale on iPhone until the App Store submission goes through. Before I submit, I owe Apple the App Privacy labels (they can only be set in the web console) and I have to attach the first subscription to the version by hand. I also owe myself a tour on a physical iPhone. Pro and the Park Pass go in with that first submission.

On Android, two steps remain: a sandbox purchase on a real phone against production, then raising the rollout from 20% to 100%. My notes also don't confirm that the Play one-time product for the Park Pass is active, so I'm not calling it buyable on Android yet.

Both store privacy forms have to declare Name, because Sign in with Apple and Google pass your name and email. I prepared a corrected Play Data safety file on 2026-10-05 and haven't confirmed the import.

## Privacy and sources

The [privacy policy](https://trailtold.com/privacy/) says the app contains no analytics, advertising, or crash-reporting SDK. Your coordinates stay on the phone, and TrailTold neither receives nor stores them. RevenueCat gets a random user ID and the store's purchase data.

The stories come from public-domain sources, chiefly the National Park Service. Claude drafts each script and a person approves it before it publishes. TrailTold is not affiliated with or endorsed by the National Park Service.

Next on the list: the device purchase on Android, the rollout to 100%, and the App Store submission. After those I replace the "Coming soon" buttons on trailtold.com with real store links.
