<!--
Admin form fields:
  Title:    MapInboundClaims and the bug class of invisible defaults
  Slug:     mapinboundclaims-and-invisible-defaults (auto-derived)
  Excerpt:  A JWT containing a `sub` claim arrived at the API. The handler read `nameidentifier`. Both fields existed because Microsoft's JWT library silently rewrote the claim names on the way in. This is a story about one default, and the broader bug class it belongs to.
  Cover:    (none)
  Body:     everything below this comment
-->

Twenty minutes of debugging on a Sunday afternoon, all of it spent staring at this:

```csharp
var token = handler.ReadJwtToken(jwt);
Console.WriteLine(token.Claims.Single(c => c.Type == "sub").Value);
// Prints: a8b3c2…  ✓ correct user id, exactly what I issued
```

```csharp
// In the auth middleware, on the same JWT, in production:
var userId = User.FindFirstValue("sub");
// userId == null  ✗
```

Same token. Same library. Different reads. One returns the right value; the other returns nothing.

The answer is a single property buried in Microsoft's JWT handler:

```csharp
JwtSecurityTokenHandler.MapInboundClaims = true;  // ← the default
```

When `MapInboundClaims` is `true` — which it is, by default, without warning — the handler **silently rewrites JWT claim names** during validation. `sub` becomes `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier`. `name` becomes `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name`. `email` becomes `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress`. It's a back-compat hold-over from a decade ago when Microsoft's identity story revolved around WS-* and SOAP-era claim URIs, and someone made the call to keep the mapping default-on so old WS-Federation code wouldn't break when it migrated to JWT.

That decision is still costing me Sundays in 2026.

## The minimum reproduction

```csharp
var jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // contains "sub": "user-123"

var handler = new JwtSecurityTokenHandler();   // MapInboundClaims defaults to true
var principal = handler.ValidateToken(jwt, validationParameters, out _);

// What you wrote:
var userId = principal.FindFirstValue("sub");                 // null
// What you have to write:
var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);  // works
// Or what you should have done at startup:
JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();
// Or, per-handler:
handler.InboundClaimTypeMap.Clear();
// Or, more directly:
handler.MapInboundClaims = false;
```

The fix is one line at startup, before you register the JWT bearer middleware:

```csharp
JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();
```

Or, in the per-handler case:

```csharp
var handler = new JwtSecurityTokenHandler { MapInboundClaims = false };
```

After this, `principal.FindFirstValue("sub")` works the way you'd expect it to from reading the JWT spec.

## Why this bug class is interesting

The specific bug — a JWT library that secretly rewrites claim names — is bad enough on its own. But the broader pattern is what I want to name: **invisible defaults that change the semantics of a value as it crosses an API boundary.**

The shape:

1. Library accepts a value from the outside (parsing, deserializing, validating).
2. Library has a default setting that transforms the value as part of acceptance.
3. The setting is on by default and not surfaced in the most obvious code path.
4. The transformation is intended to be helpful for one historical audience.
5. For every other audience, the transformation is a silent footgun.

`MapInboundClaims = true` fits exactly. Other examples I've hit personally or seen in the wild:

- **`HttpClient.DefaultProxy` automatic detection.** A library you depend on starts intermittently routing through a corporate proxy because some environment variable on a CI runner suggested one existed. The proxy is at a different version of TLS than your endpoint expects. Your `HttpClient` calls fail half the time.

- **C#'s `string.Equals` cultural sensitivity.** On a Turkish-locale machine, `"i".Equals("I", StringComparison.CurrentCultureIgnoreCase)` returns `false` because Turkish has dotted/dotless variants. Your case-insensitive comparison stops being case-insensitive in production for users with Turkish locales.

- **PostgreSQL's default `client_encoding`.** The server's default is whatever it's configured for; the client may be sending UTF-8 bytes that get reinterpreted as Latin-1 because the client connection negotiated a different encoding than the server expected.

- **Node.js's automatic `JSON.parse` reviver for dates.** (Not in core, but in many ORMs / serializers.) Strings that match an ISO 8601 pattern get coerced to `Date` objects. Your "version string" field, which happens to look like a date, becomes a Date in transit and a string at rest.

Every one of these has the same shape: a value enters the system, a default setting changes it, the change is intended to be helpful, and the helpfulness is wrong for your case.

## The fingerprint of an invisible-default bug

When you're staring at the impossible — "I'm reading the same value two different ways and getting two different answers" — the diagnostic question is:

> **Between the place where I'm reading the value and the place where I'm comparing it, did anything ingest it, parse it, or normalize it?**

If yes, that thing has defaults, and at least one of those defaults is probably transforming the value. Read the docs for that thing with the lens of "what would silently change about my input?" — not "what features does this offer?"

For `MapInboundClaims` specifically, the giveaway clue was:

```csharp
// Token before validation:
{ "sub": "user-123", "aud": "synap-api", "iss": "..." }

// Token's claims after validation:
[
  { Type: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier", Value: "user-123" },
  { Type: "aud", Value: "synap-api" },
  { Type: "iss", Value: "..." }
]
```

Two of the three claims came through with their original names. **One didn't.** That asymmetry — one is mapped, others aren't — is the fingerprint. The mapping table is *finite*; only certain well-known names get rewritten. If you ever see "I asked for X by name and got nothing, but the JWT clearly contains X" with one specific claim, suspect a mapping.

## The cost of silent transformations

There's a real argument for `MapInboundClaims = true` in legacy contexts. Code written against `System.IdentityModel` in 2010 expected `ClaimTypes.NameIdentifier`. JWT was a newer arrival. The mapping made the transition gradual: existing code kept working without changes; new code could read either claim name and get the same value. Microsoft's identity team made a real call there, with real users in mind.

The cost twelve years later is that *every new JWT integration starts in a confused state*, and every developer who hasn't been bitten before will be. The "transition" the mapping was supposed to ease has long since happened; the affordance that helped during transition is now a trap for the population that arrived after.

This is the half-life problem for defaults. A helpful default at time T can become a harmful default at time T+10 *without anything about the default changing* — only the population using it changes. There's no event that triggers "we should turn this off." The library just keeps shipping the same value, and the cost slowly inverts.

## What to do about it in your own code

If you ship a library or framework and you have an "invisible default" that transforms inbound or outbound values:

**Make the transformation visible by default.** Log at startup when the transformation is active. Or document it in the first place a developer would look — in this case, the `JwtBearerOptions` description, not buried in the `JwtSecurityTokenHandler` source.

**Make the off-switch easy.** A single property (`MapInboundClaims`) is good. Making the user run `DefaultInboundClaimTypeMap.Clear()` is worse — it's a *side effect on a static collection*, which doesn't compose well with multiple test cases or multiple handlers.

**Treat your defaults as a continuously-decaying decision.** A default that helped your 2014 users may be hurting your 2026 users. Review them.

If you *use* libraries with invisible defaults — which is all of us — the discipline is:

**Read the configuration surface for every library that touches a value you care about.** Not the README. The actual options class, with the actual default values. If `JwtBearerOptions` looks fine but `JwtSecurityTokenHandler` has a static property that mutates parsing behavior, that's the place. Defaults at the layer below your config layer are where these bugs hide.

**Test claim shape end-to-end at least once.** A unit test that issues a JWT, validates it, and asserts `claims.Single(c => c.Type == "sub").Value == "user-123"` catches `MapInboundClaims` the first time you write the JWT code, not the first time it fails in production.

```csharp
[Fact]
public void IssuedJwt_RoundTrips_WithSubClaimIntact()
{
    var jwt = tokenService.MintAccessToken(userId: "user-123", ...);
    var principal = tokenService.ValidateAccessToken(jwt);

    Assert.Equal("user-123", principal.FindFirstValue("sub"));
}
```

This test fails on default Microsoft JWT settings. You find out at test time, not at "Sunday afternoon, customer can't sign in" time. Twelve seconds of test runtime saves twenty minutes of debugging.

## The takeaway

A default is a decision someone made about your code before you ever wrote it. Most of the time the decisions are right. Sometimes they're wrong for your case. The ones that bite hardest are the ones that *change the meaning of a value* — because the symptoms look like your code is wrong, when actually a layer below you is silently substituting one value for another.

For .NET JWTs specifically: set `MapInboundClaims = false`, or `Clear()` the static map, before you register the bearer middleware. For everything else: read the options class, write the round-trip test, and treat any unexpected null as a possible silent rewrite somewhere upstream.

Twenty minutes of debugging is a small tax for learning to look one layer deeper. The next time it happens, it's three minutes.
