<!--
Admin form fields:
  Title:    SquareLog Mobile 1.8: on Play's production track, not on the App Store
  Slug:     squarelog-mobile-1-8 (auto-derived)
  Excerpt:  SquareLog Mobile 1.8.1 is the fourth production release on Google Play since 1.5.2 made the listing public on 2026-08-20. Apple rejected the iOS 1.8.1 resubmission, and a native 2.0.0 build has been waiting for App Review since 2026-10-01.
  Category: Release
  Tags:     squarelog, release, android, ios, dotnet-maui
  Cover:    (none)
  Body:     everything below this comment
-->

At 18:11 UTC on 2026-09-22 I sent SquareLog Mobile 1.8.1, versionCode 217, to the production track on Google Play. When I read the track at 04:01 UTC on 2026-10-07, 1.8.1 was still on the production track, United States only. Play's API listed 1.8.1 on the production track by 2026-09-24, but it shows a release there from the moment it is submitted, so that is not a go-live date. As of 2026-10-07 the App Store has no SquareLog app on it.

## What the app does

SquareLog is a documentation tool for parents in a custody or divorce matter, especially parents handling it without a lawyer. I wrote about why it exists in [SquareLog: Pro Se Family Court, Built Like Software](/blog/squarelog-pro-se-family-court). The mobile app is the companion to the web app at [squarelog.app](https://squarelog.app). You use it on the day something happens.

You write a dated entry, which the app calls a SitRep, and attach the photo, screenshot or receipt that goes with it. Entries line up on a timeline you can export as a PDF. Optional AI features draft a declaration or affidavit from your own entries, help you write a calm email, answer plain-language research questions with sources, and chart patterns across entries. The app locks behind your phone's biometrics every time you open it. The 1.x app is .NET 10 MAUI Blazor Hybrid.

Know the limits before you install it. It needs a connection: in June I made it an online-only client with no local database and no offline mode. It is US only. Declaration drafting and research cover 47 US jurisdictions, excluding Arkansas, Georgia, Mississippi and Tennessee, and outside Connecticut that content is automated and unverified. SquareLog is not a law firm and does not give legal advice. An AI draft is a starting point for you and your attorney to review.

The store listing says the app is free to download, and entries, attachments, the timeline and exports cost nothing. AI features draw on a prepaid credit balance, new accounts start with $5.00 of credit, and there is no subscription.

## Four production releases in five weeks

1.5.2 (versionCode 201) was the first production release, and the listing went public on 2026-08-20. Production moved to 1.7.0 (versionCode 213) on 2026-08-29, skipping the 1.6.x builds that only went to testing tracks. I promoted 1.8.0 (versionCode 215) on 2026-09-21 and 1.8.1 the next day.

1.7.0 lets you pick the day an entry is about. If you log something on Wednesday about Monday, the timeline and the PDF file it under Monday, and the entry still shows when you wrote it. The same release removed the dashboard's day-streak counter and gap warnings. An AI design review I ran on 2026-08-28 judged them a gift to cross-examination: picture a parent on the stand saying "the app told me to log daily."

1.8.0 rebuilt navigation. On a phone the app had stacked a slide-out drawer on top of a five-tab bar. Mobile PR #184, merged on 2026-09-19, removed the drawer on phones. The bottom bar became Home, Log, Insights, Chat and More, with Vault moving off the bar, and More is a full page listing everything else. The Log tab keeps its chips for SitReps, Timeline, Research and Declarations. Every screen below the top level shows its own title and a back arrow, controls got a minimum touch size, and tables turn into cards on narrow screens. Tablets keep a side drawer, and the chat box stays above the keyboard. I promoted 1.8.0 without seeing the new bottom bar on a signed-in phone. The launch check failed twice for reasons that weren't the app (a hung adb server on the build Mac, then a fresh emulator killing processes), and the signed-in screen pass depends on it, so that pass never ran.

1.8.0 also added an optional event time on an entry, which you can clear if you guessed. Cards show tags and an attachment count without opening the entry. An unsaved entry survives the phone closing the app and comes back in Compose for up to 14 days, with a *Start over* button. A saved precedent search reopens as it was when you saved it, so a citation you relied on stays put.

1.8.1 is three fixes (mobile #192, #195, #196). After an hour or more in the background, the app could come back showing your entries while every save failed with "your session expired"; it now renews the session when it needs one. Live updates had triggered enough reloads to hit the server's rate limit, and they now settle into one reload every few seconds. On phones set to light mode, the clock and battery icons had been invisible against the app's dark bar.

The Play listing's text and screenshots switched to the 2.0 app on 2026-10-01. The production track still carries 1.8.1.

## What Apple asked for

Apple rejected iOS 1.5.2 on 2026-08-27 under Guideline 4.3(a), the "similar to other apps" spam finding. I replied within hours that it was a false positive. Apple accepted the reply and raised a Guideline 4 (Design) finding instead, based on one iPad screenshot of Chat: the composer under the tab bar, a menu button beside the tab bar, and a chat bubble stretched across the screen. That screenshot was fair; #184 answers it.

The Mac mini that builds the iPhone app moved to Xcode 27 on 2026-09-19, and every iOS build lane died that day. PR #200 cleared six blockers in a chain, including an iPad launch crash that building against the new SDK introduced. At 00:29 ET on 2026-09-23 I resubmitted 1.8.1 (build 381827) with new iPhone and iPad screenshots.

Apple rejected 1.8.1 too. My notes record the rejection by 2026-10-01 but not Apple's reason, so I won't guess at it here.

## Where iOS stands on 2026-10-07

On 2026-09-22 I decided to replace the MAUI app with two native apps, SwiftUI on iOS and Jetpack Compose on Android. They keep the same bundle id and ship as 2.0.0 to the same store listings. The 1.x app now gets fixes only.

The App Store submission now carries 2.0.0, build 393132, sent on 2026-10-01 at 15:58 UTC. At 01:47 UTC on 2026-10-07 it was still waiting for review. That build crashes when you tap a notification. TestFlight build 402093 fixes it, and I haven't decided whether to pull 393132 and resubmit or ship the fix as 2.0.1. Until Apple approves something, iOS is a closed beta on TestFlight, and the App Store button on [squarelog.app/mobile](https://squarelog.app/mobile) asks you to request access.

On Android, 2.0.0 sits on the internal and closed testing tracks only. It replaces 1.8.1 in production after a complete parity checklist, the performance targets, and a seven-day soak with clean vitals. The soak clock restarted on 2026-10-07.

## What the web app gained since August

On 2026-08-05 square-log #352 turned on AI consent in production. Before a generative AI feature sends your entries to an AI provider, the web app asks first, with the same disclosure text the mobile app shows (#344). AI output got a report button the same day (#345). Late on 2026-08-19, US Eastern time, #389 fixed attachment uploads, which had broken after a storage SDK update.

On 2026-09-04 #429 added the perspective guard. Every chat, declaration and email request now carries a PERSPECTIVE AND BIAS block that tells the model to treat each entry as one parent's account and not to sharpen it into a finding ([the perspective guard](/blog/the-ai-perspective-guard)). The AI screens carry a standing notice: SquareLog only sees what you logged, and if it starts to feel like your only sounding board, talk to someone you trust. Nothing in it monitors what you write. Mobile shows the same notice on every AI screen as of 1.8.0 (#183).

On 2026-10-07 #456 merged and deployed. The web app had been shifting times the AI pulled out of your entries by your time zone offset, so an event "on the 8th" could read as 8:00 PM on the 7th. It now shows the time as stored. A full fix needs your time zone on the server.

Next on iOS is App Review's answer on 2.0.0, or a resubmission with the fixed build. Next on Android is the seventh clean day of the 2.0.0 soak.
