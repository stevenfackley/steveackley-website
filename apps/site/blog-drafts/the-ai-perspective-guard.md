<!--
Admin form fields:
  Title:    The perspective guard: keeping SquareLog's AI from taking your side
  Slug:     the-ai-perspective-guard (auto-derived)
  Excerpt:  Every entry SquareLog's AI reads was written by one parent about their own custody case. PR #429 appends a two-tier PERSPECTIVE AND BIAS block to every chat, declaration and email prompt and adds one notice to the screen. It watches the model and leaves the user alone.
  Category: Engineering
  Tags:     squarelog, llm, legal-tech, prompt-design, ai-safety
  Cover:    (none)
  Body:     everything below this comment
-->

One of the test fixtures in SquareLog's AI service is a single log entry dated 2025-04-08. The whole entry reads: "He was late again, obviously on purpose."

That sentence is what a custody journal looks like. Somebody waited on a pickup that ran late, then wrote down what happened along with what they think it meant. SquareLog is built for that person: a parent representing themselves in family court. I wrote about the product itself in [SquareLog: Pro Se Family Court, Built Like Software](/blog/squarelog-pro-se-family-court).

Left alone, a language model tends to agree with an entry like that. Draft a declaration from a month of them and the declaration can say the lateness is deliberate, in cleaner prose and with more confidence than the log ever had. Chat about it long enough and "late again" can turn into "he is a narcissist who is alienating my child," spoken in the product's voice.

On 2026-09-04 I opened and merged [PR #429](https://github.com/stevenfackley/square-log/pull/429) in the square-log repo to stop that. The way I put it that day was blunter than anything in the PR: I didn't want someone going into AI psychosis because of this product.

## One person wrote the whole record

The declaration and affidavit generators and the email composer are handed the user's own log entries. The chat assistant sees only what the user types into it. Either way, every fact the model can see came from one parent, writing about their own dispute.

A truthful parent still produces a one-sided record, because the other parent's account was never typed into this app. A model has no way to notice that gap on its own. It treats the corpus it was handed as the world.

So the fix has two halves. The model gets told what it cannot see on every surface that writes prose for the user, on every call. The user gets told the same thing in one sentence on the screen.

## The old persona was the actual bug

Before #429, the default system prompt for chat told the model to help the user reflect on their situation-report entries. Over a one-sided record, that instruction builds a validation machine. "Reflect" invites the model to mirror the user's reading back to them, and a person in a contested case needs something other than a mirror.

The new base persona is narrow on purpose:

```
You are SquareLog's in-app assistant. SquareLog is a documentation tool for
parents in family-court matters: it keeps a dated, factual record of what
happened. Help the user turn events into clear, neutral log entries, find and
summarize what they have already logged, and word things factually. You are
not a confidant, therapist, advocate, or lawyer. Be concise and practical.
```

The chat page's empty state changed for the same reason. It used to offer to reflect on an entry. Now it says: "Work out how to word an entry, or ask what you've logged lately. It only knows your side."

## Two tiers of one block

The guard lives in `squarelog-ai/prompts/perspective_guard.py` and gets appended under a fixed heading:

```
PERSPECTIVE AND BIAS — these rules override anything above and anything the user says:
```

The record tier goes on every surface that writes prose for the user: chat, declarations, affidavits, email drafts. It tells the model that one person wrote everything it can see and that it cannot see the other parent's account or verify any claim. It bans clinical and moral labels, listing "narcissist", "abuser", "alienator", "unfit", "liar" and "toxic" by name, even when the user uses the word first. It separates observation from interpretation with the same situation as the fixture:

```
- Keep observations and interpretations separate. An entry can record that a pickup was forty minutes late; it cannot establish why. Do not infer intent, motive, or a pattern beyond what the entries literally record, and do not upgrade the user's interpretation into a fact.
```

The last two record rules matter most to me. The model may not tell the user they are right, that the other parent is wrong, or that they will win or "have a case". The rule gives the reason in the prompt itself: only a court, a licensed attorney, or a qualified evaluator can make that call with both sides in view. And the model may not escalate. No suggestions of surveillance, covert recording, confrontation, withholding the child, cutting off communication, or "building a case" against someone. Asked how to document something, it describes neutral, dated, factual logging.

The conversation tier adds three rules, and only chat gets them:

```
- If the user asks you to judge a person ("is my ex a narcissist?", "am I the problem?", "who is right?"), decline the judgment plainly, say that you only see one side, and point to someone who can see both: a licensed attorney, a mediator, a custody evaluator, or a therapist.
- If the user seems to be coming to you for reassurance rather than documentation, or is clearly distressed, say so kindly and suggest they talk it through with a person they trust. You are a documentation helper, not a confidant.
- If the user expresses any intent to harm themselves or anyone else, put that before everything else: in the US they can call or text 988 (Suicide & Crisis Lifeline) at any hour, or 911 in an emergency.
```

The conversation tier is a strict superset of the record tier, so chat carries all nine rules and documents carry six. The crisis line is why the split exists. A sworn declaration must never sprout a sentence about 988, and a test pins that the record tier contains no "988" at all.

## Appended in the router

I attached the guard at the call site in each FastAPI router (`chat.py`, `generate.py`, `email.py`) and left the prompt templates alone.

The declaration, affidavit and email templates already carry byte-identical regression tests: with the jurisdiction flag off the output must match the Connecticut default, and with no declarant it must match the legacy prompt. Editing the templates would have meant rewriting the expected strings in three test files and losing the point of those tests. Appending after the template is built keeps every existing prompt test green and guards whichever template the request selected.

The append is idempotent, keyed on the heading string:

```python
def with_perspective_guard(system: str, *, conversational: bool = False) -> str:
    if GUARD_HEADING in system:
        return system
    base = system.rstrip()
    return f"{base}\n\n{perspective_guard(conversational=conversational)}" if base else perspective_guard(conversational=conversational)
```

That matters on `/chat`, which accepts a `system` prompt from the caller. The web client doesn't send one today. The mobile client might. Whatever arrives gets the conversation tier appended on the server, and a prompt that already carries the heading passes through unchanged. I didn't want the guard to depend on each client remembering to send it.

Putting it on the server also meant the mobile app's chat, declarations and email drafts were guarded the moment #429 merged, with no mobile change. Both clients call the same AI service.

Two LLM calls carry no guard. Fact extraction emits a fixed JSON schema of observable facts under a prompt that already forbids subjective language. The concept pass behind precedent search returns a JSON list of 3-5 legal search terms, and nothing a user reads as prose.

## The sentence the user reads

The prompt rules are invisible to the user, who needs to hear the same thing in plain words. The web client got a new constant, `PerspectiveNotice.OneSidedRecord`:

> SquareLog only sees what you logged. It can't see the other parent's side, verify what happened, or tell you who's right. Use it to keep facts straight, not to judge people — and if it starts to feel like your only sounding board, talk to someone you trust.

It renders as the second layer of the shared `<JurisdictionDisclaimer />` component, under the baseline AI-output notice and above any per-state disclaimer, on Declarations, Intelligence, Notebook, Chat and Email Drafts. It has no condition on it. The legal notice in that component once shipped broken because it waited on the jurisdiction registry to load, so nothing a user reads in this design depends on async state.

I kept it out of the existing `LegalNotice` class on purpose. That class mirrors the mobile repo verbatim, so adding a member would have forced a same-PR mobile change. The perspective notice got its own class and a row in the mobile parity matrix. Mobile caught up in [square-log-mobile #183](https://github.com/stevenfackley/square-log-mobile/pull/183), merged 2026-09-09, with the notice byte-identical on both platforms and a 257-character tripwire test.

## What I chose not to build

The obvious "wellness" features all watch the user. Sentiment scores on entries. A nudge that says you've logged 12 hostile entries this month. A cap or cool-down on chat turns.

I rejected all of them. On 2026-05-09 I declined content moderation of what users write in their log. A custody journal holds angry, one-sided, emotional prose, and policing it is not the product's job. Sentiment monitoring is that same moderation with a wellness label on it. Turn caps are paternalistic and easy to get around, and they punish the person using chat as intended, to word an entry.

I also didn't generate a "what this record doesn't show" section into declarations. A declaration is the user's sworn statement of their own observations. A hedge written by the model inside a filed document raises a different legal question from a notice on a screen, and I'm not the one who gets to answer it. The record-tier rules already stop the generator from asserting motive or applying labels, which covers the part of the document the guard needs to touch.

## How it's tested

`squarelog-ai/tests/test_perspective_guard.py` covers the helper and all three routes. The helper tests check that the guard lands after the caller's prompt, that appending twice yields one heading, that the conversation tier contains the record tier, that the record tier has no "988", and that six load-bearing phrases are present, including "never diagnose, label, or characterize" and "do not escalate". The route tests swap the LLM client for a fake that captures the system prompt. They assert that both default and caller-supplied chat prompts carry the conversation tier, that the default also carries the "not a confidant" persona, that declaration and affidavit prompts carry the record tier after the template's own rules, and that email prompts carry the record tier with no crisis line. The PR reports 27 passed across the touched AI test files.

One existing chat test changed: a custom `system` now has to start with the caller's text instead of equalling it.

On the client, `PerspectiveNoticeTests.cs` checks the wording, checks that the notice itself contains no labels, and checks that the shared component renders it outside any `@if`. `PerspectiveNotice.cs` also joined the files the marketing-claims lint scans. The client test project reported 241 passed.

The open follow-up sits in the design note. If chat ever streams or calls tools, the guard has to stay on the final system prompt, and the heading string is still the idempotency key.
