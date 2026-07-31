<!--
Admin form fields:
  Title:    The geofence is not a PostGIS query
  Slug:     the-geofence-is-not-a-postgis-query (auto-derived)
  Excerpt:  TrailTold runs on Postgres with PostGIS, and there is no ST_DWithin anywhere in the backend. The "did the user enter this radius" decision is forty lines of pure Dart on the device. Here's why the spatial database doesn't do the spatial part.
  Cover:    (none)
  Body:     everything below this comment
-->

TrailTold is a GPS-triggered audio tour app. You walk a trail, you cross into the radius of a historical stop, narration starts. The backend runs Postgres 16 with PostGIS 3.4 and a proper spatial schema.

There is no `ST_DWithin` in it. No `ST_Distance` either. The database never once answers the question "is the user inside this radius."

That surprised the version of me that designed the schema, so it's worth writing down why it ended up that way.

## The trigger is forty lines of Dart

The whole runtime decision lives in a Flutter class called `TourEngine`. It has zero plugin imports. It takes GPS fixes in one at a time and emits `StopTriggered` events. That's the entire interface.

```dart
const double _earthRadiusM = 6371000;

double _haversineMeters(GeoPoint a, GeoPoint b) {
  final dLat = _toRad(b.lat - a.lat);
  final dLon = _toRad(b.lon - a.lon);
  final h = sin(dLat / 2) * sin(dLat / 2) +
      cos(_toRad(a.lat)) * cos(_toRad(b.lat)) * sin(dLon / 2) * sin(dLon / 2);
  return 2 * _earthRadiusM * asin(sqrt(h));
}
```

On each fix, the engine measures haversine distance to every stop in the loaded tour and picks a winner. Three rules make it behave:

**One shot per stop.** Once a stop fires, it never re-arms for that tour session. Without this you get narration restarting every time GPS jitters you back across the boundary, which happens constantly under tree cover on a ridge.

**Nearest wins on overlap.** Stops close together have overlapping radii. If a fix is inside two, the nearer one fires and the other stays armed. Firing both would stack two audio tracks; firing neither would strand you.

**Drop fixes with accuracy worse than 50 meters.** Cold-start GPS reports garbage with an honest accuracy value attached. A fix claiming ±800m can be a kilometer off and will fire a stop you haven't reached, and the user's only evidence is narration about a spot they can't see. Throwing those away costs a few seconds at tour start and removes the worst failure mode in the app.

A tour has tens of stops, not thousands. Measuring all of them per fix is cheaper than any structure I'd build to avoid measuring all of them.

## About that sphere

Haversine treats the earth as a sphere with radius 6,371,000 meters. The earth isn't one; it's an oblate spheroid, and the geodesic formulas that account for that exist and are available in Dart.

I use the sphere anyway, because of what the number is for. The question isn't "how far apart are these points," it's "is this distance under 30." At trail scale, spherical error is far below the error already in the GPS fix I'm measuring from. A consumer phone under tree cover on a ridge is the dominant error term by a wide margin, and no amount of formula precision improves an input that's already several meters off.

Picking the more accurate formula would have felt more rigorous and changed no trigger decision the app will ever make. Worth knowing which of your error terms dominates before you optimize one of the others.

## The test that made this decision worth it

Because the engine is a pure function from a list of fixes to a list of events, I can record a real walk and replay it.

Walk the tour with the app logging every fix. Save that track as a fixture. Now the trail is a file, and I can feed it to the engine on a laptop and assert exactly which stops fired and in what order, in milliseconds, with no device and no going outside.

That turns the expensive questions into cheap ones. Does widening this stop's radius to 45 meters make it fire from the wrong side of the switchback? Replay the fixture and look. Does the accuracy filter drop so many cold-start fixes that the first stop fires late? Replay it. Does a track where somebody stopped to take a photo inside a radius produce one event or six? Replay it.

None of those are answerable against OS-registered regions without walking the trail again, and a tuning loop that requires a two-mile walk per iteration is a tuning loop that runs about twice.

## Why not native OS geofencing

Both platforms ship circular-region monitoring. The OS wakes your app when the user crosses a boundary, using cell and wifi signals as well as GPS, and it's more battery-efficient than anything I can write. I didn't use it.

**iOS caps you at 20 monitored regions per app.** A tour with more stops than that requires juggling which twenty are registered, which means writing a windowing scheme that swaps regions in and out as the user moves. That scheme is now the thing most likely to break, and it breaks by silently not firing.

**Registered regions aren't testable.** A pure function from a list of fixes to a list of trigger events is testable on a laptop with no device, no location mocking, and no walking around a parking lot. I can replay a recorded track through `TourEngine` in a unit test and assert exactly which stops fired in which order. With OS regions, "did the geofence fire" is a question you answer by going outside.

**The two platforms don't behave identically.** Entry and exit semantics, minimum radii, and wake latency all differ between iOS and Android. Doing the math myself means one behavior, one bug list.

I gave up real battery savings for those three properties. On a two-mile walk with the screen off, that trade is affordable. On an app that tracked you all day it wouldn't be, which is the tell that this decision belongs to this product rather than to geofencing in general.

## The location source stays boring

GPS comes from `geolocator` at `LocationAccuracy.high` with a 5-meter distance filter. The subscription starts when a tour starts and is cancelled when the tour ends. Nothing in the app subscribes to location outside an active tour.

That scoping is the reason swapping location plugins was a one-day job. When I moved off `flutter_background_geolocation` over Android licensing terms, the engine didn't change, because the engine never knew where fixes came from. It consumes `GeoPoint` values. Keeping the trigger logic ignorant of its input source turned a plugin migration into an adapter rewrite.

## So what is PostGIS doing

Storage, authoring, and tiles. It holds the geometry:

```
unit.geom       POINT      4326
place.geom      POINT      4326
tour.path       LINESTRING 4326   + distance_m
tour_stop.trigger_radius_m  int   default 30
```

Modeled through GeoAlchemy2 on SQLAlchemy 2. That default trigger radius of 30 meters is a data value, not code. Any stop can override it, and the ones on tight switchbacks do, which is a thing you can only tune by walking the trail and watching where the narration starts.

The one active spatial query in the backend computes `ST_Extent` over a unit's places and tour paths, pads the result by 20%, and uses that bounding box to cut a per-unit PMTiles vector tile pack. That's the map you download before you leave signal. It's a batch job, it runs once per unit, and it's exactly the kind of work a spatial database is for: aggregate geometry across many rows into one answer.

The 20% padding is there because a bounding box that hugs the content exactly produces a map that ends at the edge of the screen the moment you pan. You want context past the last stop: the parking lot you came from, the road you'll walk out to, the ridge on the far side that the narration keeps mentioning. Twenty percent is a guess that has held up.

Cutting per-unit packs rather than one national tile set is what makes the download honest. A user going to one battlefield downloads one battlefield. Doing this well is the difference between an app people take into the backcountry and an app people uninstall after it asks for two gigabytes on hotel wifi.

Notice the shape of the split. Batch, many-rows, offline, tolerant of a second of latency goes to PostGIS. Per-fix, few-rows, must-work-with-the-radio-off, must-answer-in-milliseconds goes to the device. The runtime question has no network in its path by definition, because the whole product is for places with no network.

## Where the data comes from

The unit and place rows are ingested from the NPS Data API, `/parks` and `/places`, paged 50 records at a time, upserted on natural keys so re-running the ingest is safe. That gets 474 units and 15,899 places. Every record carries a `source_ledger` row recording where the fact came from, and only public-domain or CC-BY sources make it in. When a user hears a claim about what happened on a ridge, I can trace it.

## The general shape

I reached for PostGIS because the problem was spatial, and then discovered the spatial part of the problem was one arithmetic function on a device with no network. The database earned its place doing bulk geometry aggregation instead.

Worth asking on your own spatial feature: does the query need the database, or does it need a distance formula and the data already in memory? For anything a phone must answer while offline, it's usually the second one.
