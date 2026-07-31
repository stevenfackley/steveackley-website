<!--
Admin form fields:
  Title:    The plaque problem: introducing TrailTold
  Slug:     the-plaque-problem (auto-derived)
  Excerpt:  Trail history today is a weathered cast-aluminum plaque, a shallow official app, or nothing. TrailTold plays narrated history at the spot it happened, triggered by GPS as you walk. Here's what it is, how it's built, and exactly how far along it is.
  Cover:    (none)
  Body:     everything below this comment
-->

At a trail junction on Kennesaw Mountain there's a cast-aluminum plaque bolted to a post. Two paragraphs of text, one of them gone where the paint failed. Something happened on that ridge in June 1864 and the plaque was never going to tell me what.

That's the state of trail history. You get a weathered plaque, an official app that lists hours and parking, or nothing. The research exists: historians wrote it, the Park Service published it, county historical societies scanned their archives. None of it reaches you at the moment you're standing on the ground it describes.

TrailTold is my answer to that. It plays narrated history at the spot the history happened, triggered by GPS while you walk. AllTrails crossed with a self-guided history tour.

## Why the existing apps don't cover this

I looked hard for a reason not to build it. The near-misses are all near-misses for the same reason: they optimize for a different body position.

**Autio and HearHere** are road-trip audio. You're doing 65 on a state highway and a story fires when you pass within a couple miles of something. That radius makes sense in a car and is useless on foot, where two miles is forty minutes of walking and the whole point is standing on the exact spot.

**VoiceMap** sells creator-authored city walks. Real audio, real GPS, but each tour is a one-off product from one author. There's no coverage model behind it, so a national park either has a tour because somebody made one or it doesn't.

**Clio** has the coverage and the scholarship, and it's text. You read it on a screen. Reading a screen while walking a ridge line is the behavior I'm trying to remove.

Nobody was doing on-foot, waypoint-granular, GPS-triggered narration across National Park Service units and local landmarks, with contributions from people who know a place better than I do. So I started building it under Qavren Solutions LLC.

## How a tour actually works

Pick a park. Download the tour before you lose signal. Put the phone in your pocket and start walking.

Each stop has a coordinate and a trigger radius, 30 meters by default. When you cross into the radius, the audio for that stop starts. You don't tap anything, you don't check the map, you don't decide whether you're "there yet." The interaction budget for the whole tour is: press play once at the trailhead.

That constraint drives most of the product decisions. If the trigger is unreliable, you stare at your phone to check whether it worked, and then it's Clio with extra steps. Getting the trigger right is the feature.

## Why the National Park Service first

Coverage had to start somewhere, and the NPS units are the best starting universe I could find for four reasons that all matter more than "parks are nice."

The set is **bounded and knowable**. There are 474 units. Not "roughly 500 and growing depending on how you count," but a specific list I can enumerate, seed, and check for gaps. Every open-ended data source I looked at had a long tail I'd never finish.

The data is **available through a real API** with stable natural keys per park and per place, which means my ingest can upsert instead of guess, and re-running it is safe.

The source material is **public domain**. The Park Service publishes federal work product. I can narrate it without a licensing conversation, and I can cite it.

And the **users are already walking**. Someone at a national battlefield has a phone, a trail, and an hour. The behavior I need already exists; I'm not trying to invent it.

Local landmarks come next, and eventually contributions from people who know a place better than I do. But the seeded NPS layer is the floor that makes the app worth opening in a park nobody's curated yet.

## Coverage

All 474 NPS units are seeded and 15,899 places ingested, pulled from the NPS Data API with per-record provenance so I can prove every fact came from a public-domain or CC-BY source.

Seeding is the floor, not the ceiling. A seeded unit means the park exists in the app with its places and geometry. A curated tour means somebody wrote the script, checked the sources, cut the audio, and walked the route with the trigger radii turned on.

Right now exactly one park has the ceiling: Kennesaw Mountain National Battlefield Park, three stops, built to a specific bar.

## "Good enough to demo to a stranger at the trailhead"

That's the bar I wrote down for the Kennesaw tour, and I picked it because it's falsifiable. Either I'd hand my phone to somebody in the parking lot or I wouldn't, and I know the difference in my gut before I know it in a metric.

It decomposes into four things that all have to be true at once:

**The script has to be worth an ear.** Not a Wikipedia summary read aloud. A specific thing that happened at this coordinate, told in the two minutes you're standing there.

**The audio has to sound like audio.** Outdoors, through cheap earbuds, with wind. Anything flat or clipped reads as amateur before the listener processes a word of it.

**The trigger has to fire when you arrive.** Not thirty seconds early while the spot is still up the trail, not after you've walked past. This is the requirement that ate the most engineering time, and it's the one nobody notices when it works.

**It has to work with the radio off.** Tour content and map tiles download at the trailhead. Kennesaw has decent signal; the parks I actually care about don't.

Missing any one of those and the stranger hands the phone back politely. That bar is why there's one curated tour instead of ten mediocre ones.

## Who writes the history

Claude drafts the narration. A human reads and approves every word before it publishes. Every ingested record carries a source ledger row saying where the underlying fact came from, restricted to public-domain and CC-BY material.

I'm stating that plainly because the alternative is a product that tells you a confident story about what happened to real people on real ground, generated by a system with no obligation to be right. Drafting is genuinely useful: it turns four sources and a set of coordinates into a script shaped like a script. Publishing without a person checking it is where useful becomes indefensible, and there's no volume of coverage that would make me trade it.

## The stack, honestly

The backend is Python 3.11 on FastAPI with SQLAlchemy 2 in async mode, Postgres 16 with PostGIS, migrations through Alembic. Background work runs on procrastinate, which uses Postgres as its queue, so there's no Redis in the deployment. The app is Flutter for iOS and Android, MapLibre for the map, `geolocator` for GPS, RevenueCat for purchases. The admin console is Next.js 15, the marketing site at trailtold.com is Astro on Cloudflare Pages, and auth is a self-hosted Keycloak. Narration is OpenAI TTS.

One swap worth recording: I started on `flutter_background_geolocation` and moved to `geolocator` on July 25 over Android licensing terms. The migration cost me less than a day, which is itself an argument for keeping the trigger logic out of the location plugin. More on that in a separate post.

## Pricing

Free tier is $0 and gives you two tour plays a month with on-device text-to-speech. Pro is $4.99/month for the good narration and unlimited plays. A single park pack is $4.99 once, for people who are going to Gettysburg exactly one time and don't want a subscription.

## Where this actually is

Plans 01 through 17 have landed, bootstrap through store release prep. The Play closed track has a published build at 1.0.0+3. iOS has its first TestFlight upload at 1.0.0+4.

It is not available now, and I'm not going to pretend otherwise. Production hardening is still open work: the production API domain, the R2 asset bucket, backup verification, and live RevenueCat keys. Those are the difference between "the app runs" and "I'd let a stranger depend on it in a place with no cell service."

Beta invitations go out when that list is empty. If you hike the Kennesaw Mountain trails and want to walk three stops with narration in your ears and tell me where the trigger fires late, that's the feedback I want most.
