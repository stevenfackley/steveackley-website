<!--
Admin form fields:
  Title:    Synap's paywall lived in the apps, and the API gave the lessons away
  Slug:     a-client-side-paywall-is-not-a-paywall (auto-derived)
  Excerpt:  Until Synap PR #244 on 2026-10-07, an anonymous curl per module returned every paid lesson, answer keys included. The apps drew the paywall and the server never checked. Here is the rule that replaced it, the 402 the clients branch on, and the same check for your API.
  Category: Engineering
  Tags:     synap, entitlements, api-design, dotnet, mobile
  Cover:    (none)
  Body:     everything below this comment
-->

I merged Synap PR #244 at 06:10 UTC on 2026-10-07. Before that merge, a `curl` against `api.getsynap.app/api/modules/<id>` with no token returned every block of every lesson in that module, quiz answer keys included. One call per module got you the whole catalog. The apps had a paywall screen. The API never checked who had paid.

A review caught it. I had three Claude Opus review agents go over the codebase in the session that produced Synap's first tagged release, one each for the backend, web plus mobile, and release readiness. The review's findings list put it in one line: entitlements were never enforced server-side. I have not gone through access logs to see whether anyone found it before I did, so I can't tell you that nobody did.

## What the endpoint handed out

`GET /api/modules/{moduleId}` is anonymous on purpose. The public "try a free lesson" page on getsynap.app reads it without a session, and the catalog shows lesson titles to people who haven't signed in. So the route stayed open, and its response carried each lesson's full `blocks` array.

A block is the unit of lesson content: text, code, callouts, images, and the interactive kinds. The apps check the quiz kinds on the device, so the answers travel inside the block. A multiple-choice block carries `correctIndex`. A fill-blank block carries `answers`, where `answers[0]` is the canonical one. An ordering block carries its `items` already in the correct order, and the client shuffles them for display. Hand those to anyone who asks and you have published the lesson along with its answer key.

`POST /api/lessons/complete` had the matching gap on the write side. It required a signed-in user, then recorded a completion for any lesson that user named, paid or not.

The web app hid paid lessons too. The decision record for #244 calls its gating "cosmetic only." Each client did its own hiding, and the server, the one component that knew who had paid, gave the content to everyone.

## Where the rule lives now

The fix centers on a sixteen-line file in `Synap.Core`:

```csharp
public static class LessonAccessPolicy
{
    public static bool HasModuleAccess(UserEntitlements? entitlements, string moduleId) =>
        entitlements is not null
        && (entitlements.HasAllAccess || entitlements.EntitledModuleIds.Contains(moduleId));

    public static bool IsLocked(UserEntitlements? entitlements, string moduleId, int lessonIndex) =>
        lessonIndex > 0 && !HasModuleAccess(entitlements, moduleId);
}
```

Lesson index 0 in every module is free for everyone, including anonymous callers, who pass `null`. Every other lesson needs All Access or a pack that contains the module. The product catalog has two packs today: the AI Vertical Pack covers `agentic-core`, and the Fintech Vertical Pack covers `ledger-core`.

Three call sites use the policy. The module response mapping uses it to decide what to withhold. The completion endpoint uses it to refuse. `/api/me/today`, which picks the next lesson for a signed-in user, uses it to flag that lesson `locked` when the user can't open it. Keeping one function means those three answers can't drift apart when I add a product.

The mapping does the withholding:

```csharp
Lessons = module.Lessons.Select((lesson, index) =>
{
    var locked = LessonAccessPolicy.IsLocked(entitlements, module.Id, index);
    return new ModuleLessonResponse
    {
        Id = lesson.Id,
        Title = lesson.Title,
        DurationSeconds = lesson.DurationSeconds,
        Locked = locked,
        Blocks = locked ? [] : lesson.Blocks
    };
}).ToArray()
```

A locked lesson keeps its id, title and duration and loses its body. The paywall row needs the title to show what you'd be buying. I considered answering 403 for the whole module and rejected it in the decision record: it breaks catalog browsing, it breaks the free first lesson, and it throws away the titles the paywall needs.

The module route stays anonymous but honours an optional bearer token. As the handler reads on main after #254's refactor, it takes `AuthenticatedUser? caller`, declared nullable, and looks up entitlements only when there is a caller:

```csharp
var callerEntitlements = caller is not null
    ? await entitlements.GetEntitlementsAsync(caller.UserId, cancellationToken)
    : null;
return Results.Ok(module.ToResponse(callerEntitlements));
```

`GetEntitlementsAsync` loads the user's grants from the database on each request and keeps the ones that haven't expired. Synap's JWT also carries a plan claim, and the locking path ignores it. A token minted before a purchase, or before a subscription lapsed, would otherwise answer with whatever was true when it was minted.

## The table every store writes to

The billing layout is in [the web-first revenue post](/blog/mobile-first-product-web-first-revenue), and [the weekend that built Synap's paid-user loop](/blog/eighteen-prs-to-first-dollar) is where it started. In short: Google Play, the App Store and Stripe each validate their own receipts, and all three write grants into one entitlements table. Stripe stays on the website. A comment on the `StorePlatform` enum records that it is never used inside the mobile apps, because the stores forbid third-party payment for in-app digital goods.

That layout made the database the only component that knows who paid, whichever store took the money. `/api/me/entitlements` already read it, and the apps used that response to draw the paywall. The content endpoint never consulted it. PR #244 reads the same `IEntitlementService` data that `/api/me/entitlements` returns, so the lock icon on the phone and the empty `blocks` array on the wire now come from the same rows.

## Why 402 and a stable code

A completion on a locked lesson now gets this back and records nothing:

```
HTTP/1.1 402 Payment Required

{"error":"lesson_locked","message":"This lesson is part of a paid pack. Unlock it to continue."}
```

An unknown lesson id still gets a 400, as before. An anonymous call gets a 401, because the route requires authorization.

The other candidate statuses already meant something to the clients. The shared Kotlin client treats a 401 on a request that carried a bearer token as an expired session and calls its session-expired handler. A 403 says "you may not," which is the wrong message for someone one purchase away from access. 402 Payment Required is reserved in the HTTP spec with no defined semantics, so no other meaning is attached to it, and its name says what the client should do next.

The status is half of the contract. The `error` string is the half the clients match on. Since #254, merged the same day, every error body built through `ApiErrors` has one shape, `{ "error": "<snake_case code>", "message": "<sentence>" }`. The completion and purchase outcome records keep their own `errorCode` field. The comment above the `ApiErrors` record says clients branch on `error`, "a stable code - never reword one that a client matches." I can rewrite the message for tone whenever I like. `lesson_locked` stays as it is.

iOS accepts either signal:

```swift
static func isLessonLocked(_ error: Error) -> Bool {
    guard let api = kotlinException(error) as? ApiException else { return false }
    return api.status == 402 || api.errorCode == lessonLockedCode
}
```

## How the apps degrade

Android shipped in #243, merged at 05:43 UTC, and iOS in #253, merged at 06:14 UTC. The web change rode in #245 at the same minute as iOS. Both phone apps do the same two things.

A locked row in the module list shows a lock, and tapping it opens the paywall. On Android that is a `LessonTap` sealed interface with `Open` and `Paywall` cases. On iOS, the row's tap handler checks `lesson.locked` and calls `onOpenPaywall`.

If a locked lesson opens anyway, from a deep link or the "today" card, the lesson screen shows an "Unlock with All Access" panel with a paywall button in place of an empty lesson. iOS decides with one computed property:

```swift
var isLocked: Bool { lesson.locked || blocks.isEmpty || lockedBySubmit }
```

An empty `blocks` array counts as locked even without the flag. A 402 on submit sets `lockedBySubmit`, so the user lands on the All Access panel instead of an error string, and submit does nothing while the lesson is locked. The web lesson preview uses the same test, `Locked || Blocks.Count == 0`.

The shared Kotlin model added the field with a default:

```kotlin
/** True when the user is not entitled to this lesson; the API then returns empty [blocks]. */
val locked: Boolean = false,
```

Payloads from a server that predates the field still parse. The reverse case costs something, and the decision record says so: builds older than #243 ignore `locked` and show a locked lesson as an empty page. Synap is not in either public store yet, so the people holding a pre-#243 build are testers.

## The tests

#244 added `LessonLockingIntegrationTests`, 286 lines run against an in-process API. The cases read like the rule: anonymous gets the first lesson and nothing else, a free signed-in user sees the same thing, a user with the AI pack gets all of `agentic-core` and only the preview of `ledger-core`, an All Access user gets everything. One test checks that every lesson in the response carries a `locked` property, so a client never has to infer it. Another completes the free first lesson and confirms that "today" moves to lesson two and flags it locked. The 402 test asserts the status, the `lesson_locked` code, a non-empty message, and no completion row for that user. The PR reports 617 tests passing locally with zero warnings under `-warnaserror`.

## Audit your own API with no token

You can run this check on your own product in a few minutes. Sign out of everything. Find the endpoint your app calls to load paid content, either in the browser's network tab or in the mobile client's API class. Call it with no `Authorization` header and look at what comes back.

For Synap, after the deploy:

```bash
curl -s https://api.getsynap.app/api/modules/agentic-core \
  | jq -r '.lessons[] | "\(.id)  locked=\(.locked)  blocks=\(.blocks | length)"'
```

When I ran it on 2026-10-07 the API answered:

```
delegation-basics  locked=false  blocks=9
tool-use  locked=true  blocks=0
planning-orchestration  locked=true  blocks=0
evals  locked=true  blocks=0
guardrails  locked=true  blocks=0
```

The same POST to `/api/lessons/complete` with no token returned 401. With a free account's token against `tool-use`, the integration tests above expect 402 and no completion recorded.

When you look, start with the leaks that look like Synap's. Answer keys that ship for on-device grading are the first. List and detail endpoints that return full bodies while the UI shows only titles are the second. If a response contains anything the paywall sells, check entitlement on the server before you send it.

The first tagged release, `20261007_synap_Release`, went out later on 2026-10-07 from a SHA that includes #244. The TestFlight upload for the iOS build with the locked-lesson panel is the next item on my list.
