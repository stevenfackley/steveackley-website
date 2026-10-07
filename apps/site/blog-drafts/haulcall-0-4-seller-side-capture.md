<!--
Admin form fields:
  Title:    HaulCall extension 0.4: capture from the seller's own broadcast page
  Slug:     haulcall-0-4-seller-side-capture (auto-derived)
  Excerpt:  Extension 0.4.0, merged on 2026-09-11, dropped the second Whatnot account HaulCall needed to see a seller's sales. The Web Store now serves 0.4.5. What shipped around it, and where the phone apps stand.
  Category: Release
  Tags:     haulcall, release, chrome-extension, android, ios, flutter
  Cover:    (none)
  Body:     everything below this comment
-->

On 2026-08-28 a design partner ran a real Whatnot show with HaulCall attached, and her own account captured nothing. The sales came in only through a second account watching her stream. Whatnot sends a seller who broadcasts from her phone to a desktop page at `whatnot.com/dashboard/live/<id>`, and if she pastes the viewer link for her own show, Whatnot redirects her back to that dashboard. The extension captured only from viewer pages, so it ignored the page the seller had open.

Extension 0.4.0 reads sales from that dashboard page. I merged it on 2026-09-11 and the Chrome Web Store had published it by 2026-09-16. The store now serves 0.4.5, updated on 2026-10-05.

## Whatnot, and the part HaulCall handles

Whatnot is a live-shopping marketplace. A seller goes live on video and sells items one at a time through auctions, Buy It Now listings, giveaways and accepted offers. When the stream ends she has a list of sold items and buyer usernames, and she has to get each buyer's items into the right box with the right prepaid shipping label from Whatnot.

[HaulCall](https://haulcall.app) handles that part. A Chrome extension watches the seller's own logged-in Whatnot page and records each sale as it closes: the item, the price, the buyer. The web app groups sales into one bundle per buyer, prints buyer-numbered QR labels on a thermal printer through a small desktop print agent, matches each bundle to Whatnot's prepaid label, and lets the seller scan a box with a phone to confirm its contents before it ships. NotBot, the established tool, stops at printing the organization labels.

HaulCall has been live since 2026-07-12. The site says BETA on every page, and HaulCall is not affiliated with Whatnot. It costs $30 a month for a single tier, after a 7-day trial that needs no card ([pricing](https://haulcall.app/pricing)).

The extension reads the realtime feed the seller's browser already receives, and the rules for reading it live in a remote manifest I can change without waiting on Web Store review.

## 0.4.0: capture from the broadcast page

The seller-side capture design, written on 2026-08-28, hung on one question. Does the dashboard page receive the full sale message, with order id, buyer and price, or only a thinner activity feed? The first export could not say, because its buffer had rolled past the minutes when the sales happened.

A second live show on 2026-09-11 answered it. The seller's dashboard tab uploaded 1,327 redacted frames, the first recording ever taken from the host side, and the sale messages arrived at the same field paths the viewer rules already read. No manifest change was needed. PR #464 turned that page from an observer into a capture surface and set the version to 0.4.0. I merged it at 18:38 UTC that day and submitted it to the Web Store at 22:00 UTC.

The PR still said the code had not run a real show. A seller I had never met ran it. She found the extension on the Web Store and signed up on her own, and overnight from 2026-09-16 into 09-17 she captured dozens of sales from her own dashboard tab, with no second account anywhere.

Her account also showed the opposite problem: a viewer tab on another seller's show could write that seller's sale into the viewer's HaulCall account. Extension 0.4.3 (PR #480, 2026-09-18) made viewer-tab capture an explicit per-tab opt-in bound to one show. The dashboard needs no opt-in, because Whatnot only shows a seller her own broadcast console. 0.4.3 also reads show titles from Whatnot's show-update message. Until then, no show in HaulCall had a title, because nothing HaulCall ingested carried one.

## Accepted offers, and 0.4.5

0.4.1, 0.4.2 and 0.4.4 were fixes. The last one, PR #489 on 2026-09-25, removed a "Trial ended" banner that a CSS rule had painted on every install since July.

The 2026-10-02 round of design-partner feedback opened with a bad report: two shows in a row had lost their accepted offers. The diagnostic frames showed that an accepted offer closes as a different message type from every other sale, and no rule matched it. I published manifest wn-v8 (PR #537) on 2026-10-02 to add that rule, with no extension release. The site says HaulCall captures accepted offers. As of today I have no record of a real accepted offer captured since wn-v8 went out, so treat that support as shipped and not yet proven.

The offer gap stayed quiet because the dashboard lane did not count messages it failed to match. Extension 0.4.5 (PR #547) counts them. When a message that looks like a sale arrives and no rule captures it, the popup says how many sales may have been missed, and the API logs a warning on each heartbeat that reports one. I wrote up that change in [Make the next gap loud](/blog/make-the-next-gap-loud).

## The print agent

The print agent is a tray app that prints label jobs from the browser without a dialog. Three releases went out in September. 0.2.3 on 2026-09-18 (PR #479) set the paper size explicitly and kept pairing across restarts. 0.2.4 on 2026-09-26 (PR #491) prints on the driver's own label form, after a thermal printer put only the QR code on a 2x3 sticker. 0.2.5 on 2026-09-30 (PR #506) refuses to print to a stuck or offline printer and flags prints it could not confirm, after a printer's USB link hung on 2026-09-29 while the agent reported three labels as printed.

The public update feed at `agent.haulcall.app` serves 0.2.5 for Windows and for both Mac architectures. The Windows installer is unsigned, so the [downloads page](https://haulcall.app/downloads) tells you to click "More info," then "Run anyway." I have no note yet of a correct HaulCall label printing on thermal stock with 0.2.4 or 0.2.5.

## The phone app

The pack-station app is Flutter, for Android and iOS. Neither store lists it publicly.

On Android, I pushed 1.4.0 (build 21) to two invite-only closed testing tracks on 2026-10-03. Releases 1.1.0 through 1.3.0 added a live sales feed, printing from the phone through the desktop agent, and push notifications. 1.4.0 adds account settings and reads the new label QR codes. I have not confirmed that Google approved 1.4.0 for testers. Production requires 12 testers opted in for 14 days, and my last count, on 2026-09-06, was 3 of 12.

The same day, PR #552 made Play releases automatic. When a shipping change under `mobile/` merges to main and mobile CI passes, a workflow builds that exact commit, releases it to both closed tracks, and tags it `play/<versionCode>`. So far the only such tag is `play/21`, the hand-made 1.4.0 baseline.

On iOS, I resubmitted 1.0.4 (build 10) to App Review on 2026-09-04 after Apple asked for more information. Apple flagged it again on 2026-09-05 with no reason in the email, and I have no record of an outcome since. The latest TestFlight upload ran on 2026-09-26.

## The rest of the 2026-10-02 round

That feedback round produced 16 PRs. Three of the features have been in production since 2026-10-03.

The analytics page gained repeat buyers, giveaway ROI, and in-show sales pace (PR #541). Admins can mint promo codes, one at a time or in bulk as single-use codes, that extend the free trial for a seller who has never subscribed. Each seller redeems one, on the web (PR #542, with a Stripe contract test in #546). Whatnot does not allow digital goods, so the codes will go out on printed HaulCall stickers; that sticker phase is written down (PR #549) and not built. Labels HaulCall draws now carry a small `haulcall.app` line on the larger sizes, never on carrier postage or the small labels, with a per-seller switch that defaults to on (PR #544).

## Merged, not yet in your browser

Extension 0.5.0 (PR #555) merged on 2026-10-07. It adds an opt-in chat log for the seller's own show, for use in dispute packets. The Web Store still serves 0.4.5, so 0.5.0 counts as unreleased, for reasons I covered in [An open PR is not a shipped PR](/blog/an-open-pr-is-not-a-shipped-pr). Buyer QR landing pages (PR #545) are merged and switched off.

Next on the list is one real accepted offer showing up in a seller's sales.
