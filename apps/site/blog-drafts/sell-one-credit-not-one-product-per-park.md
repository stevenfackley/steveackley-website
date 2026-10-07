<!--
Admin form fields:
  Title:    One Park Pass instead of a store product per park
  Slug:     sell-one-credit-not-one-product-per-park (auto-derived)
  Excerpt:  TrailTold 1.0.0+14 offered each park as its own in-app product. Five parks came to 20 console objects. The same day I replaced them with one $4.99 consumable and a server-side credit ledger that decides which park a pass opens.
  Category: Engineering
  Tags:     trailtold, in-app-purchase, revenuecat, flutter, product-design
  Cover:    (none)
  Body:     everything below this comment
-->

Just after 1 a.m. Eastern on 2026-10-05 I merged the version bump for TrailTold 1.0.0+14 (PR #215). That build offered parks the obvious way: one non-consumable in-app purchase per park, with a product id of `park_<code>`, for the five launch parks. By late morning I had merged its replacement. The replacement is a single consumable called `park_pass`, priced at $4.99, and the server decides which park it opens. The server half is TrailTold PR #216, merged at 10:19. The app half is PR #217, merged an hour after it, at 11:21.

[TrailTold](/blog/the-plaque-problem) plays GPS-triggered narration on trails in national parks. Pro is a subscription that opens every park. A park purchase opens one park and keeps it open.

## Five parks, twenty console objects

I count the cost of a per-park product in consoles, and the code is the cheap part. Each park needed a product in Google Play Console and another in App Store Connect. Each store has its own RevenueCat app, so each park also needed a RevenueCat product in both of those. Each store product carries its own listing, price and review screenshot, and Apple puts each IAP through App Review. The RevenueCat products have to match them by hand.

Five parks came to 20 objects. Each new park would add four more. The catalog behind the app holds 474 park units from the NPS Data API, so selling all of them would have meant 1,896 console objects to create and keep in sync by hand.

The objects carry a quieter cost too. The app and the webhook agree on a naming convention, `park_<code>`, but each id is typed by hand into four consoles and nothing checks a console against the convention. The webhook learns the park code by parsing whatever an operator typed. The parser already carried a scar from that:

```python
def _park_code_from_product(product_id: str | None) -> str | None:
    """The park code a product id names, or None when it is not a park pack.

    Normalised before matching: `Park_KEMO` used to fall straight through to
    the unhandled branch, log at INFO, answer 200, and grant nothing. ...
    """
    normalized = (product_id or "").strip().lower()
    if not normalized.startswith(_PARK_PRODUCT_PREFIX):
        return None
    return normalized.removeprefix(_PARK_PRODUCT_PREFIX) or None
```

Four hand-typed ids per park, and a typo in any of them grants nothing behind an HTTP 200. I called the setup unsustainable on the day it shipped and replaced it the same day.

## The store sells a pass and the server picks the park

After the change, the store knows one fact: somebody bought a pass. The server keeps a `park_pass` table (Alembic migration `0012`) with one row per store transaction. A row starts as an unspent credit. Spending it stamps `park_code` and `redeemed_at`. A refund stamps `revoked_at`.

Two constraints hold the lifecycle together:

```python
sa.CheckConstraint(
    "(park_code IS NULL) = (redeemed_at IS NULL)", name="park_pass_redeemed_together"
),
...
op.create_index(
    "uq_park_pass_live_park",
    "park_pass",
    ["user_sub", "park_code"],
    unique=True,
    postgresql_where=sa.text("park_code IS NOT NULL AND revoked_at IS NULL"),
)
```

The check constraint stops a row from claiming a park without a redemption time. The partial unique index allows one live pass per park per account, and it ends up doing most of the concurrency work further down.

Adding a park now takes zero console work. A pass can be spent on any park row in the catalog.

## Minting a credit

RevenueCat reports a consumable purchase as a `NON_RENEWING_PURCHASE` event. When the product is `park_pass`, the webhook inserts one unspent row:

```python
await session.execute(
    pg_insert(ParkPass)
    .values(user_sub=event.app_user_id, transaction_id=event.transaction_id or event.id)
    .on_conflict_do_nothing(index_elements=["transaction_id"])
)
```

The store's `transaction_id` is the key, with the RevenueCat event id as a fallback when a payload has none. RevenueCat redelivers webhooks, and the handler already had a dedupe ledger for event ids. That ledger can't catch a resend of the same purchase under a new event id. The unique `transaction_id` can, so one purchase pays for exactly one pass however many times RevenueCat reports it. If the account behind the purchase has been deleted, the webhook writes nothing and records the event as suppressed.

## Check park_pass before park_

The old per-park branch is still in the webhook, because any pack bought under 1.0.0+14 has to keep working and stay refundable. That creates a trap: `park_pass` starts with `park_`. Run it through the prefix parser and you get a park whose code is `pass`. The grant path checks parsed codes against the unit table, finds no park called `pass`, and records the event as unmatched. The customer would pay and get nothing.

So the pass check runs first, everywhere the webhook parses the `park_` prefix:

```python
if event.type == "NON_RENEWING_PURCHASE" and _is_park_pass(event):
    return await _credit_park_pass(session, event)
if event.type == "NON_RENEWING_PURCHASE":
    park_code = _park_code_from_product(event.product_id)
    ...
```

The refund branch has the same ordering, with a comment saying why. If you namespace product ids by prefix and later add a generic product, give that product its own match ahead of the prefix parse.

## Spending it

The app spends a pass with `POST /api/v1/units/{code}/park-pass`. It answers 404 for an unknown park and 409 when the account has no unspent pass. If the account already owns the park outright, through a spent pass or a legacy per-park purchase, it answers 200 with `spent: false` and keeps the pass. Pro doesn't count as owning the park. Pro lapses, and a Pro user who buys a pass is buying that park for keeps.

The redeem picks up a credit with `SKIP LOCKED`:

```python
credit = (
    await session.execute(
        select(ParkPass)
        .where(
            ParkPass.user_sub == user.sub,
            ParkPass.park_code.is_(None),
            ParkPass.revoked_at.is_(None),
        )
        .order_by(ParkPass.created_at, ParkPass.id)
        .limit(1)
        .with_for_update(skip_locked=True)
    )
).scalar_one_or_none()
```

Two races need handling. Take two redeems for different parks with one credit between them. The second one skips the locked row, finds no free credit, and answers 409 instead of blocking. Now take two redeems for the same park on an account with two credits. Both can lock a credit, and `uq_park_pass_live_park` fails the loser at commit. Its transaction rolls back, it spends nothing, and it answers `spent: false`.

`GET /api/v1/me/park-passes` returns `{unused, parks}`, and `has_access` treats a live, spent pass the same as a park entitlement.

## The app waits for the webhook

A store purchase returns as soon as the store has charged. The webhook that mints the credit arrives on its own schedule, so a redeem sent right after the purchase can reach the server before the credit exists. The app reads 409 as "not yet":

```dart
for (var attempt = 0; attempt < attempts; attempt++) {
  if (attempt > 0) {
    await Future<void>.delayed(widget.redeemBackoff * attempt);
  }
  ...
  try {
    await api.redeemParkPass(widget.unitCode!, bearer: token);
    return;
  } on ApiException catch (e) {
    if (e.status != 409) rethrow;
  }
}
```

With a 2-second base and six attempts, the waits run 0, 2, 4, 6, 8 and 10 seconds, about thirty seconds in total. TourScreen gives a Pro purchase the same budget. Any status other than 409 rethrows at once.

After the store has taken the money, the paywall never shows the result as a failed purchase. If the pass hasn't landed in time, the screen says:

> Purchase received — your Park Pass is on its way. Give it a minute, then come back here and tap "Use pass".

When an account already holds an unspent pass, the paywall shows a "Use a Park Pass" card that spends it without calling the store.

## Refunds go by transaction

A refund arrives as `CANCELLATION` with `cancel_reason` `CUSTOMER_SUPPORT`. The webhook finds the pass by `transaction_id` alone, without the account id, so a purchase that RevenueCat later moved to another app user id can still be refunded. It stamps `revoked_at`. That takes back the credit if unspent, or the park if spent, because `has_access` ignores revoked passes.

A refund that matches no pass gets logged as an error and recorded as unmatched, because a refund that revokes nothing may leave the customer with the money back and the park. One example is a purchase credited under its event id while the refund carries a transaction id.

`REFUND_REVERSED` exists only on the App Store. It means Apple took the refund back, and the pass returns as it was. One edge case: the account may have opened the same park with another pass in the meantime. Then the restored pass comes back as an unspent credit, because the unique index allows one live pass per park.

## A consumable has nothing to restore

A non-consumable lives in the store's records, and a "Restore purchases" button can bring it back on a new phone. A consumable leaves no such record, so ownership moves into my database. I key it to the account: the app ties RevenueCat's app user id to the signed-in user's id at sign-in. A pass survives a reinstall and follows the sign-in to a new device. Deleting the account forfeits it, as with every other purchase.

Two console settings follow from that. In both RevenueCat apps the product is typed Consumable, because the Android SDK consumes one-time products unless told otherwise, and a consumable needs exactly that. It is also attached to no entitlement. The server opens the park, and a RevenueCat entitlement has no way to say "one park, chosen after purchase."

## Cleaning up the consoles

On 2026-10-05 a sync script (PR #219) deleted the five App Store Connect `park_<code>` IAPs. They had never been submitted, and App Store Connect only lets you delete an IAP before submission. On Play I deactivated the per-park purchase options, and I deleted the RevenueCat `park_*` products. The legacy webhook branch stays.

The plan for a Pro-only 1.0.0+14 submission didn't last the day. PR #220 moved the pending App Store submission to build 15, which carries `park_pass`.

## Products per entity don't scale

If your store catalog has a product for each thing a customer can buy access to, such as a park or a course, your catalog ends up modeled inside the store, where you can't query it or test it.

Sell a generic credit instead, and decide on your own server what it opens. The store takes the money and reports the transaction. You own the ledger: idempotent minting, refunds, the redeem races, and restore. In TrailTold that came to a 153-line route module and 111 added lines in the webhook handler.

## Where it stands

PR #216 shipped with 23 tests in `tests/test_park_pass.py`, covering credits, idempotency, refunds, reversals and the redeem races. The related webhook, entitlement, account-deletion, public API and migration suites passed locally too, 136 tests against PostGIS 16. PR #217 passed `flutter test` with 380 tests. The production deploy carrying #216 ran from commit `d128187` on 2026-10-05 and succeeded. The same commit is tagged `app-v1.0.0+15`, the first app build with the Park Pass paywall.

My notes don't confirm whether `park_pass` has cleared Play or App Store review. As of 2026-10-05 the App Store submission was waiting on a review contact phone number, the App Privacy labels and my go-ahead.
