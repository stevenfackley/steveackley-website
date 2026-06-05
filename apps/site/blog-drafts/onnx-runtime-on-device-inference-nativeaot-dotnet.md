<!--
Admin form fields:
  Title:    Putting ONNX Runtime Behind a NativeAOT .NET Engine: the On-Device AI Roadmap
  Slug:     onnx-runtime-on-device-inference-nativeaot-dotnet (auto-derived)
  Excerpt:  The dotnet-native-interop POC was built around one swap-in seam — an ILanguageModel interface that the whole app streams through. This is the plan for what goes behind it: ONNX Runtime for on-device inference in .NET 10, why ONNX fits the NativeAOT/no-cloud constraints, and the toolchain risks that make on-device AI the last and hardest phase. Honest roadmap, with links to the seam and the design spec.
  Cover:    (none)
  Body:     everything below this comment
-->

In the [last post about dotnet-native-interop](/blog/embedding-nativeaot-dotnet-in-native-mobile-apps) I made a claim and then mostly waved at it: the whole POC is built so the demonstration payload can be swapped for a real model "without touching the interop layer." This post is about cashing that check. The plan for the real model is **ONNX Runtime**, running on-device, in-process, with no cloud — and getting there honestly means talking about why it's the *last* thing on the roadmap, not the first.

Two things up front, so nobody is misled:

1. **The seam is real and exists today.** [`ILanguageModel.cs`](https://github.com/stevenfackley/dotnet-native-interop/blob/main/core/DotnetNativeInterop.Engine/ILanguageModel.cs) is in the repo. Everything streams through it.
2. **The ONNX integration is roadmap, not shipped.** It lives in the [design spec](https://github.com/stevenfackley/dotnet-native-interop/blob/main/docs/superpowers/specs/2026-06-05-lab-visual-compute-benchmarks-design.md) as **Phase 3 — "Onboard AI: .NET-driven ONNX semantic search."** This is the design and the reasoning behind it, not a "look what I shipped."

## The seam everything streams through

Here is the entire contract the app is built on:

```csharp
public interface ILanguageModel
{
    IAsyncEnumerable<string> GenerateAsync(
        InferenceRequest request,
        CancellationToken cancellationToken = default);
}
```

That's it. A `MockLanguageModel` ships in the repo so the full streaming path — engine → bounded channel → C ABI / loopback HTTP / SQLCipher → Swift/Kotlin UI — can be exercised with **no weights and no network**. The doc comment on the interface names the intent directly: *"a real backend (e.g. llama.cpp via P/Invoke) implements this same contract with no other changes."*

The reason the interface returns `IAsyncEnumerable<string>` and not `Task<string>` is the load-bearing design decision. Token-by-token streaming is the natural shape of language-model output, and it's the thing the rest of the POC was built to carry: the bounded `System.Threading.Channels` backpressure, the per-token callback over FFI, the SSE framing over loopback HTTP. Swap the *producer* and all of that machinery keeps working. So the question "what's the real model?" reduces to "what implements `GenerateAsync`?"

## Why ONNX Runtime, and not llama.cpp or a cloud call

The interface comment says llama.cpp. The roadmap says ONNX Runtime. That's not a contradiction — it's a decision that follows from the constraints the POC already committed to.

**The constraints are non-negotiable at this point:** on-device, in-process, NativeAOT, no separate backend, no network. Those were the whole point of the project. Any inference backend has to live inside those walls.

- **Cloud is out by definition.** The entire premise is that the engine runs six inches from the UI, not in a datacenter. A cloud call would betray the thesis.
- **llama.cpp is a fine fit for *generative chat*,** and the P/Invoke path is real. But it's a C++ dependency you vendor, build per-RID, and babysit — and the first thing I actually want on-device isn't open-ended chat.
- **ONNX Runtime is the natural fit for *the first AI feature I actually want*:** embeddings for on-device semantic search. It has a real .NET story (`Microsoft.ML.OnnxRuntime`), it runs small models (a sentence-embedding model is tens of MB, not gigabytes), and the output is a deterministic vector — far easier to test, cache, and reason about than free-form generation.

So Phase 3 isn't "bolt a chatbot on." It's **".NET-driven ONNX embeddings → on-device semantic search,"** with Apple Foundation Models chat as a separate, device-gated track. Embeddings first because they're the smaller, more useful, more testable lift.

## Why on-device AI is the *last* phase, not the first

The spec records the phase order as an explicit decision: **wow demos first, AI last — "the riskiest native lift."** That word *riskiest* is doing real work, and it's the same class of risk the first post was entirely about.

Recall the two walls that shaped the original three transports:

- ASP.NET Core ships **no NativeAOT runtime pack for mobile RIDs** → HTTP became a hand-rolled raw-socket server and gRPC was excluded.
- The default `e_sqlite3` SQLite bundle ships **no iOS native library** → the store became SQLCipher.

ONNX Runtime is the same kind of problem, one layer deeper. The open questions Phase 3 has to answer before a single embedding is computed:

- **Does ONNX Runtime link cleanly into a NativeAOT image for `ios-arm64` and `linux-bionic-arm64`?** ONNX Runtime is a native library with its own per-platform builds. "Add the NuGet package" is the easy path on desktop; the mobile-RID + NativeAOT + static-link combination is exactly where the first two walls lived.
- **Model packaging.** Even a small embedding model is a multi-MB asset that has to ship inside the app bundle and load fast on a cold start.
- **Threading and memory.** Inference is CPU-heavy and bursty; it has to live behind the same bounded-channel backpressure the showcase already uses, so a slow device blocks the producer instead of blowing the heap.

None of these are reasons not to do it. They're reasons to do it **after** the streaming path, the transports, and the telemetry are all proven — so that when ONNX inference misbehaves, every other variable is already nailed down. That's the whole point of sequencing the riskiest integration last.

## The groundwork that's already in place

The roadmap isn't starting from zero. Three things already in the repo are deliberately the foundation for ONNX:

- **`System.Numerics.Tensors`** is already a package reference in the engine. Tensors are the currency of ONNX I/O; having the tensor primitives in place means the embedding-vector plumbing isn't a future surprise.
- **The bounded-channel streaming + cancellation** is exactly what inference needs for backpressure and "stop generating," with no new infrastructure.
- **The frozen C ABI** (`dni.h`) doesn't change. An ONNX-backed `ILanguageModel` is still just an `ILanguageModel` — the native↔managed boundary, the transports, and the UI are all blind to what's producing the tokens. That's the seam paying off.

## What "swapping in ONNX" will actually look like

Concretely, the change is supposed to be small and contained — that's the test of whether the seam was designed right:

```csharp
// Phase 3 (planned): an ONNX-backed implementation of the same interface.
public sealed class OnnxEmbeddingModel : ILanguageModel
{
    // load a sentence-embedding .onnx model once, run InferenceSession per request,
    // stream results back through the same GenerateAsync contract.
    public async IAsyncEnumerable<string> GenerateAsync(
        InferenceRequest request,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        // tokenize -> InferenceSession.Run -> embedding -> nearest-neighbor search -> stream hits
    }
}
```

Wire that into `EngineHost.Initialize()` instead of the showcase model, and — if the seam holds — every transport, every screen, and the streaming UI work unchanged. If it *doesn't* hold, that's the most valuable bug the POC could surface, because it means the abstraction was lying.

## Where to find it

- **Repo:** [stevenfackley/dotnet-native-interop](https://github.com/stevenfackley/dotnet-native-interop)
- **The swap-in seam (real code today):** [`core/DotnetNativeInterop.Engine/ILanguageModel.cs`](https://github.com/stevenfackley/dotnet-native-interop/blob/main/core/DotnetNativeInterop.Engine/ILanguageModel.cs)
- **The ONNX plan (design spec, Phase 3):** [`docs/superpowers/specs/2026-06-05-lab-visual-compute-benchmarks-design.md`](https://github.com/stevenfackley/dotnet-native-interop/blob/main/docs/superpowers/specs/2026-06-05-lab-visual-compute-benchmarks-design.md)

If you're trying to run ONNX Runtime inside a NativeAOT .NET app on iOS or Android and hitting the runtime-pack / native-linking wall, that's the part I most want to compare notes on — it's the next hard thing, and it's the reason this is a roadmap post and not a victory lap.

## The takeaway

The interesting claim of dotnet-native-interop was never "C# can stream fake tokens." It was "the boundary is designed so a real on-device model drops in behind one interface." ONNX Runtime is how that gets tested for real: small embedding models, deterministic vectors, on-device semantic search — sequenced last precisely because NativeAOT + mobile + a native inference runtime is the same toolchain fight that defined the transports, only harder. The seam is in the repo today. The ONNX work is the next wall to walk into on purpose.
