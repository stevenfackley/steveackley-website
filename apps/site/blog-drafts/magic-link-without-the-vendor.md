<!--
Admin form fields:
  Title:    Magic-link auth without the vendor lock-in
  Slug:     magic-link-without-the-vendor (auto-derived)
  Excerpt:  Supabase / Cognito / Auth0 will sell you passwordless email auth in an afternoon. Building it yourself takes a weekend, costs $0/MAU, and keeps your auth ADR honest. Here's the shape.
  Cover:    (none)
  Body:     everything below this comment
-->

Every early-stage product hits the same fork. You want passwordless email auth — user enters their address, gets a sign-in link, clicks it, ends up signed in. The polished answer is to install Supabase Auth, Auth0, or Clerk and have it done before lunch.

I went the other direction this weekend. Spent maybe four hours building the equivalent against my own JWT-issuing API. Zero vendor lock-in. Per-MAU pricing of zero forever. Auth ADR ("no vendor IdPs, ever") stays honest.

This is what the shape looks like, plus the one footgun in `System.IdentityModel.Tokens.Jwt` that cost me twenty minutes I wasn't planning to spend.

## Two endpoints. That's the whole thing.

The entire auth surface is two endpoints on the API:

```
POST /api/auth/magic-link/request   { email }                → 200 { sent: true }
POST /api/auth/magic-link/exchange  { token }                → 200 { token, expiresAt, email }
```

Plus a thin web-side redemption handler at `GET /auth/magic?token=…` that posts to the exchange endpoint server-side, takes the resulting JWT, sets it as a cookie, redirects to `/library`. The user clicks one link in their email and ends up signed in. Nothing more.

## The request endpoint

```csharp
app.MapPost("/api/auth/magic-link/request", async (
    MagicLinkRequest req,
    IUserProfileStore users,
    JwtTokenService tokens,
    IMagicLinkEmailService emails,
    CancellationToken ct) =>
{
    // Validate shape only. Whether the email exists is none of the caller's business.
    if (string.IsNullOrWhiteSpace(req.Email) || !req.Email.Contains('@'))
        return Results.BadRequest(new { error = "valid email is required." });

    var user = await users.FindByEmailAsync(req.Email.Trim(), ct);
    if (user is not null)
    {
        var token = tokens.MintMagicLinkToken(user.Id, user.Email);
        var url = $"https://yoursite.com/auth/magic?token={Uri.EscapeDataString(token)}";
        await emails.SendAsync(new MagicLinkEmail(user.Email, url), ct);
    }

    // Always return the same shape, whether or not the email exists. Don't let
    // the caller enumerate user emails via timing or response variation.
    return Results.Ok(new { sent = true });
});
```

The shape of the response is the same whether or not the email maps to a real user. The only response code that differs is `400` for malformed input. An attacker can't probe your user database by varying email addresses.

This is the **anti-enumeration discipline**, and it's the one thing every passwordless auth implementation has to get right. If your "we sent an email" response is fast for unknown emails and slow for known ones, an attacker walks every email in their breach corpus through your endpoint and gets a list of customers in twenty minutes. Same shape, same timing budget, same status code.

(The "same timing" part is harder than it looks — a `findByEmail` against a real row is faster than against nothing. Real production hardening would add a constant-time normalization step. For an early-stage product, the bigger win is the response-shape invariant; timing leaks come later.)

## The exchange endpoint

```csharp
app.MapPost("/api/auth/magic-link/exchange", async (
    MagicLinkExchangeRequest req,
    JwtTokenService tokens,
    IUserProfileStore users,
    CancellationToken ct) =>
{
    var claim = tokens.ValidateMagicLinkToken(req.Token);
    if (claim is null) return Results.Unauthorized();

    var user = await users.GetUserAsync(claim.UserId, ct);
    if (user is null) return Results.Unauthorized();

    var jwt = tokens.MintAccessToken(
        userId:   user.Id,
        email:    user.Email,
        lifetime: TimeSpan.FromDays(7));

    return Results.Ok(new {
        token     = jwt.Token,
        expiresAt = jwt.ExpiresAt,
        email     = user.Email
    });
});
```

This is what redeems the link. Same signing key as everything else (`SYNAP_JWT_KEY`), but the magic-link token carries a different audience and an explicit purpose claim — so the same handler that issued the link can verify it, but the resulting *session* token has the normal `synap-api` audience that your protected endpoints validate against.

```csharp
public string MintMagicLinkToken(Guid userId, string email)
{
    var claims = new[]
    {
        new Claim(JwtRegisteredClaimNames.Sub,   userId.ToString()),
        new Claim(JwtRegisteredClaimNames.Email, email),
        new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
        new Claim("purpose", "magic-link")   // ← belt and braces
    };

    var token = new JwtSecurityToken(
        issuer:   settings.Issuer,
        audience: "synap-magic-link",        // ← distinct from "synap-api"
        claims:   claims,
        expires:  DateTime.UtcNow.AddMinutes(15),
        signingCredentials: signingCredentials);

    return handler.WriteToken(token);
}
```

Why a distinct audience? Because if a magic-link token *could* be replayed as a session token, the user has effectively a 15-minute permanent login on whatever device intercepted the email. The audience check is what your API's JwtBearer pipeline uses to reject anything that wasn't minted *for* the API. The magic-link token has the wrong audience for that pipeline; it can't be used as a session bearer.

The `purpose: magic-link` claim is defense in depth. The validation code checks both.

## The footgun

Here's the twenty-minute bug I promised. The validation code looks like this:

```csharp
public MagicLinkClaim? ValidateMagicLinkToken(string token)
{
    var parameters = new TokenValidationParameters
    {
        ValidIssuer       = settings.Issuer,
        ValidAudience     = "synap-magic-link",
        IssuerSigningKey  = new SymmetricSecurityKey(
                              Encoding.UTF8.GetBytes(settings.SigningKey)),
        ValidateLifetime  = true,
        // ...
    };

    var principal = handler.ValidateToken(token, parameters, out _);
    var sub       = principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
    var purpose   = principal.FindFirst("purpose")?.Value;
    // ...
}
```

Looks fine. **Returns null every time.**

Reason: `JwtSecurityTokenHandler` defaults to `MapInboundClaims = true`, which silently rewrites short JWT claim names to long XML-schema URIs on validation. Your `sub` claim becomes `"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"` in the resulting `ClaimsPrincipal`. `principal.FindFirst("sub")` returns null. Your code thinks the token is malformed.

The fix is one line:

```csharp
private readonly JwtSecurityTokenHandler handler = new()
{
    MapInboundClaims = false   // ← set this on every handler you construct
};
```

There's no global config flag. You set this on every `JwtSecurityTokenHandler` instance you construct. The ASP.NET JwtBearer middleware sets it for you (search your `Program.cs` for `MapInboundClaims = false`); anything you build manually, you have to set it yourself.

The bug is silent because the mint path uses the short name (`Sub` = `"sub"`), the validation path uses the same short name to look it up, and the default-true setting moves it *between* mint and read. Both sides of the code look correct in isolation. It only breaks when you actually round-trip a token.

I lost twenty minutes staring at logs before searching for "JwtSecurityTokenHandler sub claim null" and finding the answer in someone else's StackOverflow post. Now you don't have to.

## The email side, fail-soft

```csharp
public sealed class SesMagicLinkEmailService : IMagicLinkEmailService
{
    public bool IsConfigured => !string.IsNullOrWhiteSpace(options.FromAddress);

    public async Task SendAsync(MagicLinkEmail message, CancellationToken ct)
    {
        if (!IsConfigured)
        {
            // No SES configured? Log the link and return success.
            logger.LogInformation(
                "Magic-link email NOT sent (SES unconfigured). To: {Email}, Url: {Url}",
                message.ToAddress, message.SignInUrl);
            return;
        }

        // Build the SES request and send.
        await sesClient.SendEmailAsync(/* ... */, ct);
    }
}
```

This pattern is the same one I use for Stripe, Apple App Store validation, and Google Play receipt validation. **Every external integration has an `IsConfigured` check. Absence of config doesn't crash boot or break the calling endpoint — it logs and degrades.** The endpoint that requested the magic link still returns `200 { sent: true }`. The link is visible in the server logs for the operator to grab if needed. Real email goes out the moment `SYNAP_SES_FROM_ADDRESS` is set in the box's env.

Why this matters: it means I can ship the magic-link feature *before* I finish SES domain verification. The auth endpoint works end-to-end. The flow works end-to-end. The only thing the operator has to do later is flip one env var, and emails start going out. No code change. No redeploy.

## What you give up

Auth0, Cognito, Supabase Auth, Clerk all sell you nice things on top of "send a sign-in link":

- **Pre-built UIs.** I wrote my own `/sign-in` form. It took fifteen minutes.
- **Multi-factor.** I don't need this yet. When I do, TOTP-via-authenticator-app is another ~50 lines.
- **Social login.** Same. Add when there's a user asking.
- **Audit logs.** ASP.NET's logging plus my normal app logs cover this — every magic-link request and exchange is already logged.
- **Account recovery flows.** Magic-link *is* the recovery flow.
- **Compliance certifications.** This matters when an enterprise buyer audits your auth. For an early-stage consumer product, it doesn't.

The honest cost is twofold. **One**: you're responsible for the auth code's correctness — the `MapInboundClaims` bug above is the kind of thing a vendor would have eaten for you. **Two**: when you grow into enterprise sales, you may end up re-platforming onto something with SOC 2 / SSO / SCIM, and that migration is its own project.

But for the first several thousand users — for the period where every dollar matters and the founder is doing the auth implementation themselves — first-party JWT + magic-link is the right shape. It composes with everything you'll add later (Stripe session-claim, OAuth, password sign-in if you ever want it), it has no recurring cost, and your auth ADR doesn't have to compromise to ship.

## Recap

Two endpoints. One handler-level config (`MapInboundClaims = false`). A distinct audience for magic-link vs session tokens. An anti-enumeration response shape. A fail-soft email service that degrades to log-only when SES isn't yet configured.

The whole thing fits in maybe 300 lines of C#, including the email template. The vendor sells you the same feature for $25/MAU once you hit 25,000 users.

Build it yourself. Keep the optionality.
