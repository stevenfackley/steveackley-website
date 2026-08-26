<!--
Admin form fields:
  Title:    Qavren Auth 0.1: one sign-in convention, three package registries
  Slug:     qavren-auth-sdks-0-1 (auto-derived)
  Excerpt:  @qavren/auth-next on npm, qavren-auth on PyPI, Qavren.Auth on NuGet. Each is a thin wrapper that validates a Keycloak realm's tokens against JWKS and fails closed. Here is the convention they share, why audience is not validated, and what the 0.1.1 patch fixed.
  Category: Release
  Tags:     qavren, auth, keycloak, release, sdk
  Cover:    (none)
  Body:     everything below this comment
-->

Three packages went out on July 18: `Qavren.Auth` 0.1.0 on NuGet, `qavren-auth` 0.1.0 on PyPI, and `@qavren/auth-next` on npm. A patch followed on July 30 (`0.1.1` for .NET and Python, `0.1.2` for the Next.js package). They are the client half of Qavren Auth, the self-hosted identity platform every Qavren product signs in through.

This post is the release note I owed them.

## The problem they solve

Every new product needs login on day one. I have shipped enough of them to know the two failure modes. Build auth per product and you spend a weekend per product on the same code. Share one user pool across unrelated products and a data-access bug in a travel journal becomes a data-access bug in a legal-evidence app.

Qavren Auth is the middle path. Keycloak 26 is the engine. One realm per app, isolated user pools, no cross-app SSO by design. The `master` realm is admin-only. A TrailTold account is not a HaulCall account, and that is the feature.

The realm side is provisioning as code. One PowerShell command generates `realms/apps/<name>.yaml` from a template and applies it idempotently with keycloak-config-cli. The generated file gets committed and reviewed like any other code. Each realm gets one public PKCE client named `<name>-web`; an app that runs entirely server-side can opt into a second, secret-bearing client, on both ends, with the trade-off documented in the SDK README.

The SDKs are the other half: the smallest amount of code an app needs to trust a token from its realm.

## The convention

All three packages implement the same contract, and the contract fits on an index card.

- **Base URL** comes from `QAVREN_AUTH_URL`, defaulting to `https://auth.qavrensolutions.com`. Override per call if you need to.
- **Issuer** is `{base}/realms/{realm}`. **Client id** is `{realm}-web`.
- **Claims consumed:** `sub`, `email`, `realm_access.roles`. Nothing else.
- **Audience is not validated.** Keycloak defaults `aud` to `account`, so trust rests on the RS256 signature against the realm's JWKS, the issuer, and the expiry.
- **Fail closed.** An invalid, expired, or wrong-issuer token, or an unreachable JWKS with no cached keys, returns 401. A missing role returns 403. Never 500, never pass-through.

No custom cryptography anywhere. Auth.js does the verification in the Next.js package, the Microsoft JWT bearer handler in .NET, PyJWT in Python.

## Three call sites

Next.js, with Auth.js v5:

```ts
// auth.ts
import { createAuth } from "@qavren/auth-next";

export const { handlers, auth, signIn, signOut } = createAuth({
  realm: "squarelog",
});

// anywhere server-side
const session = await auth();
session?.user.roles; // string[] from realm_access.roles
```

ASP.NET Core:

```csharp
builder.Services.AddQavrenAuth("squarelog");

var app = builder.Build();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/admin", () => "secret")
   .RequireAuthorization(p => p.RequireRole("admin"));
```

`realm_access.roles` is flattened into standard role claims, so `[Authorize(Roles = "admin")]`, `RequireRole("admin")`, and `User.IsInRole("admin")` all work without the caller knowing Keycloak's claim shape.

FastAPI:

```python
from fastapi import Depends, FastAPI
from qavren_auth import require_user, require_roles, User

app = FastAPI()

@app.get("/me")
def me(user: User = Depends(require_user("squarelog"))):
    return {"sub": user.sub, "email": user.email, "roles": sorted(user.roles)}

@app.get("/admin")
def admin(user: User = Depends(require_roles("squarelog", "admin"))):
    return {"sub": user.sub}
```

Install is what you would expect: `npm install @qavren/auth-next next-auth@beta`, `pip install qavren-auth`, `dotnet add package Qavren.Auth`.

## What the tests prove

Each SDK's integration suite runs against a real `sdk-test` fixture realm, applied by the same provisioning tool that builds production realms. Every suite asserts realm isolation: a token minted for one realm is rejected by another realm's validator. That is the property the whole design depends on, so it is the property that gets verified on every CI run.

The release pipeline publishes NuGet through OIDC trusted publishing; there is no NuGet API key in the repo's secrets. Before the first publish I ran a preflight pass that found and fixed a handful of packaging issues, which is why the Next.js package's first public version is 0.1.1 rather than 0.1.0.

## What 0.1.1 fixed

The default auth host. All three 0.1.0 packages defaulted to `https://auth.qavren.com`, the hostname named in the July 6 design spec. Production shipped on `auth.qavrensolutions.com` and the SDKs never caught up, so any consumer relying on the default hit NXDOMAIN and failed closed with a 401. Failing closed was the right behavior; the wrong default was the bug. The patch corrects the constant in all three packages and adds the TrailTold realm in the same change.

## What runs on it today

Production Keycloak lives at `auth.qavrensolutions.com` on a dedicated EC2 box behind a Cloudflare tunnel, with nightly database backups to S3 and a restore drill on record. TrailTold signs in through it with Google and Apple. Talebound, Roast and Resolve, and HaulCall (a Chrome extension client plus a scan-to-pack mobile client) each have a realm. SquareLog uses a broker client so its existing Supabase sessions can federate through Keycloak.

Every realm's login page looks like its product. The base theme is a CSS-only child of Keycloak's `keycloak.v2` that exposes a small set of `--qv-*` tokens; each product ships a skin with its tokens, a logo, and a favicon. No forked templates, because forked templates rot on upgrade.

## What 0.1 does not do

Cross-realm SSO, on purpose. Audience validation, for the reason above. Token refresh in the .NET and Python packages, because those are resource servers and the client owns the refresh. If you need any of those, the packages are thin enough that you can see exactly where you would add them.

The three READMEs are the full reference: [sdks/next](https://github.com/stevenfackley/qavren-auth/tree/main/sdks/next), [sdks/dotnet](https://github.com/stevenfackley/qavren-auth/tree/main/sdks/dotnet), and [sdks/python](https://github.com/stevenfackley/qavren-auth/tree/main/sdks/python).
