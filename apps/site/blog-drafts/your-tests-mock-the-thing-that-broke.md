<!--
Admin form fields:
  Title:    Your tests mock the thing that broke: anthropic 1.0 and a green CI run
  Slug:     your-tests-mock-the-thing-that-broke (auto-derived)
  Excerpt:  Dependabot's anthropic 0.122.0 to 1.0.0 bump passed every check on SquareLog and would have failed every production model call with a TypeError. The suite never imported the SDK. The fix moved one keyword into extra_body; the test that would have caught it still doesn't exist.
  Category: Engineering
  Tags:     python, anthropic-sdk, dependabot, testing, squarelog
  Cover:    (none)
  Body:     everything below this comment
-->

On 2026-08-24 Dependabot opened square-log #401, a one-line change to `squarelog-ai/requirements.txt` that moved the `anthropic` Python SDK from 0.122.0 to 1.0.0. Every check on it went green. The `python` job installed the new SDK, compiled the service and ran the pytest suite in 40 seconds. The Docker build for the AI service took 58.

Merged as it stood, it would have turned every Anthropic call SquareLog makes in production into this:

```
TypeError: create() got an unexpected keyword argument 'temperature'
```

I caught it on 2026-08-29 (UTC) and shipped the fix as #410. It merged at 03:19 UTC. #401 merged four minutes later, on top of it.

## One module, one keyword

[SquareLog](https://squarelog.app) has a Python service, `squarelog-ai`, that does the model work: fact extraction from daily SitRep entries, declaration and email drafts, a chat endpoint used by the web and mobile apps, and a RAG concept pass. All of it goes through `services/llm_client.py`, which picks Anthropic, OpenAI, or a self-hosted OpenAI-compatible server from the `LLM_BACKEND` environment variable. Production runs `anthropic`: `CHAT_MODEL` (`claude-sonnet-4-6`) for extraction and drafts, `CHAT_CONCEPT_MODEL` (`claude-haiku-4-5-20251001`) for chat and the RAG concept pass.

Before #410, `chat_messages` handed `temperature` straight to `client.messages.create` on every Anthropic request. Extraction relies on the wrapper's default of `temperature=0`, and the email and declaration routes pass 0 explicitly, because the same SitRep entry should produce nearly the same facts on Tuesday as it did on Monday. Temperature 0 is there to minimize variation. The chat route passes 0.7.

The 1.0.0 release notes, dated 2026-08-20, list a single breaking change: "upgrade to httpx2 and some minor breaking changes. See MIGRATION.md for details." One of those minor changes removes `temperature`, `top_p` and `top_k` from the typed signature of `messages.create`. Pass one and the SDK raises a `TypeError` before it builds a request. The API kept them. Whether a given model honors them is now a question about the model, and the SDK stopped asking it on your behalf.

## Four green checks, zero SDK calls

Four things in CI touched the AI service on #401. None of them reached `messages.create`.

`pip install -r squarelog-ai/requirements.txt` succeeded because 1.0.0 resolves cleanly. The new SDK depends on `httpx2`, which installs alongside the `httpx>=0.28.1,<0.29.0` pin the service already carries, so there was no conflict to trip on.

`python -m compileall squarelog-ai` succeeded because `compileall` only checks syntax. It never looks at what a call passes to a library.

`pytest` succeeded because no test imported either SDK. The route tests set `os.environ["LLM_BACKEND"] = "none"` before anything imports `llm_client`, then monkeypatch `chat_completion` (or `chat_messages`, for the chat route) on the router module with a fake that returns canned text. That pattern fits what those tests check: prompt assembly, the guard text appended to system prompts, the shape of the response. It also means the Anthropic branch of `chat_messages`, the only code that calls `messages.create`, never ran in CI. That branch was the one place 1.0.0 could break anything.

The `docker-pr` job for `squarelog-ai` built the image, which runs the same `pip install` inside a container.

The PR description I wrote for #410 says the Docker build was the only job touching `squarelog-ai` on a dependency PR. The workflow file says otherwise: the `python` job had no path filter and ran on every PR, including this one. The conclusion holds either way, since that job also never called the SDK. I'm correcting it here so the record matches the YAML.

One more check ran and correctly did nothing: `auto-merge`. SquareLog's Dependabot workflow only approves and merges `version-update:semver-patch` bumps, the rule from [Thirty-eight lines](/blog/patch-only-dependabot-automerge). A major version bump falls outside it, which is why #401 sat open for five days waiting for me instead of merging itself.

## The fix is one dict key

The API still accepts `temperature` on both `claude-sonnet-4-6` and Haiku 4.5. Only the SDK's signature dropped it. The SDK offers `extra_body` for this case: whatever you put there is merged into the request JSON as-is. Here is the Anthropic branch after #410:

```python
kwargs = {
    "model": chosen_model,
    "max_tokens": max_tokens,
    "messages": messages,
    # anthropic 1.x removed temperature/top_p from messages.create's
    # typed signature — passing it directly is a TypeError. The Messages
    # API still ACCEPTS temperature on claude-sonnet-4-6 (the CHAT_MODEL
    # default), so extra_body puts it back on the wire and extraction
    # stays deterministic. Verified against anthropic 1.0.0: the request
    # body carries "temperature": 0.
    #
    # The Claude 5 family (Opus 5 / Sonnet 5 / Fable 5) and Opus 4.7/4.8
    # REJECT sampling parameters with a 400 — they replaced them with
    # output_config.effort. If CHAT_MODEL moves to one of those, delete
    # this and set effort instead; leaving it will fail every call.
    "extra_body": {"temperature": temperature},
}
if system_prompt:
    kwargs["system"] = system_prompt
response = client.messages.create(**kwargs)
```

Before merging I ran the real SDK against a mock HTTP transport, on 0.122.0 and on 1.0.0, and read the outgoing request body. Both carried `"temperature": 0`. On 1.0.0 the `system` field survived and the response's `content` and `usage` still parsed into the attributes `llm_client` reads. The request extraction sends is the same on both versions.

The OpenAI branch kept `temperature` as a plain keyword. I checked `openai` separately for the companion bump in #402, 2.51.0 to 3.3.1, and all four call sites the service uses survived it. Only Anthropic moved the parameter.

## The comment that matters more than the line

`extra_body` routes around the SDK's check. That check is what produced a loud, early `TypeError`. With the parameter tucked into `extra_body`, the next failure arrives later and comes from the server.

The Anthropic API rejects sampling parameters on newer models. On Opus 4.7 and later and on the Claude 5 family, a request carrying `temperature: 0` comes back as a 400. Those models have no sampling controls; `output_config.effort` is the setting left to tune. If someone moves `CHAT_MODEL` to one of them, extraction and every declaration and email draft fail. Chat and the RAG concept pass run on a separate `CHAT_CONCEPT_MODEL` (Haiku 4.5 today), and the same thing happens to them if that variable moves. Nothing in CI notices, for the same reason nothing noticed #401.

So the comment at the call site carries the instruction: moving `CHAT_MODEL` to one of those models means deleting the `extra_body` line and setting effort. It only names `CHAT_MODEL`; it should name both variables. I'd rather have the warning sitting on the exact line someone has to touch than in a runbook nobody opens during a model swap.

## Tests that pin the fix

#410 also added `tests/test_llm_client_sampling.py`, 120 lines. It swaps `_get_anthropic` and `_get_openai` for fakes that record whatever keyword arguments they receive. Both getters import the SDK lazily, so the file never imports either SDK and runs in the existing suite with no network and no keys.

```python
def test_temperature_rides_in_extra_body_not_as_a_keyword(monkeypatch):
    sent: dict = {}
    monkeypatch.setattr(llm, "_BACKEND", "anthropic")
    monkeypatch.setattr(llm, "_get_anthropic", lambda: _FakeAnthropic(sent))

    llm.chat_messages(None, [{"role": "user", "content": "hi"}], temperature=0)

    assert "temperature" not in sent, (
        "anthropic 1.x rejects temperature as a keyword argument to messages.create"
    )
    assert sent["extra_body"] == {"temperature": 0}
```

The other tests check that `system` stays a first-class parameter, that the result reads `content[0].text` and the two `usage` token counts, and, parametrized over `openai` and `self_hosted`, that the OpenAI-compatible branch still passes `temperature` directly with no `extra_body`.

A fake `create(**kwargs)` accepts any keyword. Had a test like this existed before 1.0.0, it would have asserted `sent["temperature"] == 0`, and it would have kept passing on #401 right alongside everything else. The fakes pin the shape `llm_client` hands to the SDK, which guards the fix against someone tidying `extra_body` back into a keyword. They can't see the SDK change underneath them, because the SDK is the thing they replaced.

## One contract test per SDK

The check that tells you something on a dependency PR is the one I ran by hand: real SDK installed, network faked at the HTTP transport (`httpx2.MockTransport` for the anthropic test, since 1.x runs on `httpx2`; `httpx.MockTransport` for openai), assertion on the request body that leaves the process. It exercises the SDK's own signature and serialization, which is the code a version bump changes. It still needs no key and no network, so it can run on every Dependabot PR in the job that already installs the requirements.

For `squarelog-ai` that means two tests. One calls `chat_messages` through a real `anthropic` client and asserts the body has `model`, `max_tokens`, `messages`, `system` and `"temperature": 0`. The other does the same through a real `openai` client. A breaking bump then fails in the `python` job, on the PR, where Dependabot's own checks can show it.

Those tests don't exist yet. The suite on `main` has the fakes from #410 and no transport-level test, while `requirements.txt` has since moved to `anthropic==1.3.0` and `openai==3.6.0` through grouped minor-and-patch bumps. The two contract tests are the next change to `squarelog-ai/tests/`, and they need to land before the next major version of either SDK shows up in a Dependabot PR.
