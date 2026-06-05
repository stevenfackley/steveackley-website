<!--
Admin form fields:
  Title:    ONNX Runtime Inside NativeAOT .NET: The Embedding Pipeline, Tensor Plumbing, and Linking Gauntlet
  Slug:     onnx-runtime-nativeaot-dotnet-embedding-pipeline (auto-derived)
  Excerpt:  A deep technical design for running ONNX Runtime on-device behind the dotnet-native-interop swap-in seam: the exact embedding pipeline (tokenize → int64 tensors → InferenceSession → mean-pool → L2-normalize → cosine search), OrtValue zero-copy vs DenseTensor, SessionOptions and execution providers on mobile, and the NativeAOT trimming/native-linking gauntlet that makes this the riskiest phase. Real Microsoft.ML.OnnxRuntime C#.
  Cover:    (none)
  Body:     everything below this comment
-->

This is the deep-dive companion to [the ONNX roadmap post](/blog/onnx-runtime-on-device-inference-nativeaot-dotnet). Same honesty caveat: in [dotnet-native-interop](https://github.com/stevenfackley/dotnet-native-interop) the [`ILanguageModel`](https://github.com/stevenfackley/dotnet-native-interop/blob/main/core/DotnetNativeInterop.Engine/ILanguageModel.cs) seam ships today; the ONNX Runtime backend is the [Phase-3 design](https://github.com/stevenfackley/dotnet-native-interop/blob/main/docs/superpowers/specs/2026-06-05-lab-visual-compute-benchmarks-design.md). The code below is the implementation design — API-accurate against `Microsoft.ML.OnnxRuntime`, not yet merged. If you're building on-device inference in .NET, this is the part with actual sharp edges.

## The goal, precisely

On-device **semantic search**: given a user query and a corpus already on the device, return the most similar items — without a network call. That decomposes into one model invocation (text → vector) plus a similarity scan. The model is a sentence-embedding transformer; `all-MiniLM-L6-v2` is the reference choice: 384-dimensional output, ~90 MB at FP32, ~23 MB quantized to INT8 — small enough to ship in an app bundle.

Embeddings, not chat, on purpose: the output is a deterministic `float[384]`. You can snapshot it in a unit test and assert byte-for-byte. Free-form generation has no such luxury, which is why it's a later track.

## Two ways to hand tensors to ONNX Runtime

ONNX Runtime's .NET binding has **two tensor namespaces that people constantly conflate** — and note neither is `System.Numerics.Tensors` (which the engine already references for its own math). Inputs go in one of two ways:

**1. `DenseTensor<T>` + `NamedOnnxValue` (the classic, allocating path):**

```csharp
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;

var inputIds = new DenseTensor<long>(idBuffer, new[] { 1, seqLen });   // [batch, seq]
var inputs = new List<NamedOnnxValue>
{
    NamedOnnxValue.CreateFromTensor("input_ids",      inputIds),
    NamedOnnxValue.CreateFromTensor("attention_mask", maskTensor),
    NamedOnnxValue.CreateFromTensor("token_type_ids", typeTensor),
};
using var results = session.Run(inputs);                 // IDisposableReadOnlyCollection
var hidden = results.First().AsTensor<float>();           // [1, seq, 384]
```

**2. `OrtValue` (the zero-copy, IDisposable path — prefer this on-device):**

```csharp
using var ids  = OrtValue.CreateTensorValueFromMemory(idBuffer,   new long[] { 1, seqLen });
using var mask = OrtValue.CreateTensorValueFromMemory(maskBuffer, new long[] { 1, seqLen });
using var types= OrtValue.CreateTensorValueFromMemory(typeBuffer, new long[] { 1, seqLen });

var inputs  = new Dictionary<string, OrtValue> {
    ["input_ids"] = ids, ["attention_mask"] = mask, ["token_type_ids"] = types,
};
using var outputs = session.Run(new RunOptions(), inputs, new[] { "last_hidden_state" });
ReadOnlySpan<float> hidden = outputs[0].GetTensorDataAsSpan<float>();
```

`OrtValue.CreateTensorValueFromMemory<T>` **pins your managed buffer** instead of copying it into native memory — meaningful when you're running inference in a tight loop on a phone. The catch is in the name of the interface: **everything is `IDisposable`**. Miss a `using` and you either leak native buffers or keep managed memory pinned, which on a memory-constrained device shows up as GC pressure and OOM, not a clean error.

## The pipeline, end to end

BERT-family encoders take three parallel `int64` tensors. The whole job is producing them, running the graph, and pooling the output.

```csharp
// 1. Tokenize (WordPiece). Microsoft.ML.Tokenizers ships a BertTokenizer; the
//    BERTTokenizers package is the other common choice.
var enc = tokenizer.Encode(text, maxTokens: 256);   // ids + attention mask
int seq = enc.Ids.Count;

long[] ids   = enc.Ids.Select(i => (long)i).ToArray();
long[] mask  = enc.AttentionMask.Select(m => (long)m).ToArray();
long[] types = new long[seq];                         // single sequence => all zeros

// 2. Run (see OrtValue block above) -> hidden is [1, seq, 384], row-major.

// 3. Mean-pool over real tokens, weighted by the attention mask. CLS-pooling is
//    the classic mistake here; sentence-transformers want masked mean pooling.
const int H = 384;
var vec = new float[H];
long live = 0;
for (int t = 0; t < seq; t++)
{
    if (mask[t] == 0) continue;
    live++;
    int baseIdx = t * H;
    for (int h = 0; h < H; h++) vec[h] += hidden[baseIdx + h];
}
for (int h = 0; h < H; h++) vec[h] /= Math.Max(live, 1);

// 4. L2-normalize so cosine similarity == dot product.
double norm = 0; foreach (var v in vec) norm += (double)v * v;
float inv = (float)(1.0 / Math.Sqrt(Math.Max(norm, 1e-12)));
for (int h = 0; h < H; h++) vec[h] *= inv;
```

Three quiet correctness traps live in that block: pooling **CLS** instead of masked-mean (wrong vectors that *look* plausible), forgetting to **mask padding** before pooling (padding tokens drag the centroid), and skipping **L2 normalization** (then your "cosine" similarity is just an unnormalized dot product and your ranking is wrong). None throw. All three produce a search that's subtly, confidently bad.

## Where the vectors live: the store already exists

The POC already ships an **encrypted SQLCipher store** as one of its three transports. That is the corpus index. Each row: an id, the source text, and the `float[384]` as a `BLOB` (1,536 bytes). Query time is a linear cosine scan — which is fine for thousands of rows on-device and avoids dragging in a vector-index dependency:

```csharp
// query vector is already L2-normalized, so cosine == dot product
float Score(ReadOnlySpan<float> q, ReadOnlySpan<float> doc)
{
    float s = 0;
    for (int i = 0; i < q.Length; i++) s += q[i] * doc[i];
    return s;
}
```

The encryption-at-rest you got "for free" from choosing SQLCipher over `e_sqlite3` (the original transport decision) now also encrypts the embedding index. The earlier constraint keeps paying off.

## Bridging a one-shot model into a streaming seam

Here's the friction: `ILanguageModel.GenerateAsync` returns `IAsyncEnumerable<string>` — built for token-by-token generation — but an embedding+search is **request/response**, not a stream. You don't fight the seam; you map onto it. Stream the *ranked results*, so the existing bounded-channel/SSE/FFI machinery and the UI render incrementally with zero changes:

```csharp
public async IAsyncEnumerable<string> GenerateAsync(
    InferenceRequest request,
    [EnumeratorCancellation] CancellationToken ct = default)
{
    float[] q = await Task.Run(() => Embed(request.Prompt), ct);   // CPU work off the channel
    foreach (var hit in _store.TopK(q, k: 5, ct))
        yield return $"{hit.Score:F3}  {hit.Title}\n";             // each hit = one "token"
}
```

`Task.Run` matters: ORT inference is synchronous CPU work, and the POC's producer runs on a background task feeding a **bounded** channel, so a slow device applies backpressure instead of dropping results or blowing the heap. The seam was designed for exactly this hand-off.

## SessionOptions on a phone

Defaults are tuned for servers. On-device you constrain them deliberately:

```csharp
var so = new SessionOptions
{
    GraphOptimizationLevel = GraphOptimizationLevel.ORT_ENABLE_ALL,
    IntraOpNumThreads = 2,           // don't fight the UI for the little-cores
    InterOpNumThreads = 1,
};
so.AppendExecutionProvider_CPU();
// iOS:    so.AppendExecutionProvider_CoreML();   // GPU/ANE — adds native deps + AOT surface
// Android: NNAPI / XNNPACK                        // same trade: speed vs build complexity
var session = new InferenceSession(modelBytes, so);   // load once, reuse for the app's life
```

Create one `InferenceSession` and keep it; construction parses and optimizes the graph and is far more expensive than a `Run`. The accelerator EPs (CoreML on iOS, NNAPI/XNNPACK on Android) are tempting for speed, but each one is **more native library and more AOT surface** — which lands us at the actual hard part.

## The NativeAOT linking gauntlet

This is why on-device AI is sequenced **last** in the POC, after the transports and telemetry are proven. ONNX Runtime is a native C++ library with managed bindings, and the combination of *NativeAOT + mobile RID + a native inference runtime* is the same class of fight as the original two walls (no Kestrel mobile runtime pack; no `e_sqlite3` iOS lib) — one layer deeper:

- **Native lib per RID.** `Microsoft.ML.OnnxRuntime` (managed) needs the matching native `onnxruntime` for `ios-arm64`, `iossimulator-arm64`, and `linux-bionic-arm64`, statically linked into the NativeAOT image. "Add the NuGet" is the desktop path; the mobile-RID + static-link path is exactly where things historically break.
- **No first-class ORT-on-NativeAOT story.** NativeAOT on iOS is real but **opt-in** (Mono is still the MAUI default), Android NativeAOT is **experimental** (the same `XA1040` territory the first post hit), and there's no blessed "ONNX Runtime supports NativeAOT" guarantee. Expect to discover trimming/AOT incompatibilities the analyzer flags — ORT touches reflection in places NativeAOT dislikes, so `[DynamicDependency]`/trimming roots or `rd.xml`-style hints may be required.
- **Model as a bundled asset.** Even the ~23 MB INT8 model has to ship in the app bundle, be found by an absolute on-device path, and load fast on a cold start.

The honest status: the seam is built to receive this, the tensor and streaming plumbing is in place, and the linking is the unknown that gets walked into on purpose, with everything else already nailed down.

## Find it

- **Repo:** [stevenfackley/dotnet-native-interop](https://github.com/stevenfackley/dotnet-native-interop)
- **Swap-in seam (real code):** [`ILanguageModel.cs`](https://github.com/stevenfackley/dotnet-native-interop/blob/main/core/DotnetNativeInterop.Engine/ILanguageModel.cs)
- **ONNX design (Phase 3 spec):** [`docs/superpowers/specs/2026-06-05-lab-visual-compute-benchmarks-design.md`](https://github.com/stevenfackley/dotnet-native-interop/blob/main/docs/superpowers/specs/2026-06-05-lab-visual-compute-benchmarks-design.md)
- **Reference for the .NET API:** the official ONNX Runtime [BERT-in-C# tutorial](https://onnxruntime.ai/docs/tutorials/csharp/bert-nlp-csharp-console-app.html).

## Takeaway

On-device semantic search in .NET is, mechanically, four honest steps: tokenize to three `int64` tensors, run one `InferenceSession`, masked-mean-pool and L2-normalize the hidden state, and cosine-scan an encrypted SQLite blob index. The .NET API is real and good (`OrtValue` zero-copy, `DenseTensor<T>`, reusable sessions). The genuinely hard, unproven part is none of that — it's getting ONNX Runtime's native library to link and run inside a NativeAOT image on `ios-arm64` and `linux-bionic-arm64`. The pipeline is solved on paper; the toolchain is the boss fight, and that's exactly why it's last.
