<!--
Admin form fields:
  Title:    Embedding a NativeAOT .NET 10 Engine in Native iOS & Android Apps
  Slug:     embedding-nativeaot-dotnet-in-native-mobile-apps (auto-derived)
  Excerpt:  A proof of concept that embeds one NativeAOT .NET 10 shared library directly inside native iOS and Android apps, reached three ways — in-process FFI, a loopback HTTP server, and an encrypted SQLCipher store — with their costs charted side by side. Here's what it does, and why the missing ASP.NET Core mobile runtime pack and SQLite's missing iOS native library dictated every design choice.
  Cover:    (none)
  Body:     everything below this comment
-->

If you write C# and you want to run it inside a native mobile app, the usual answer is "stand up a backend." Put your logic behind an API, deploy it somewhere, and have the Swift or Kotlin app call over the network. That works, but it drags in a server, a deploy pipeline, a network round-trip, and a cloud bill — for code that could have run six inches away, in the same process as the UI.

[dotnet-native-interop](https://github.com/stevenfackley/dotnet-native-interop) is a proof of concept that takes the other path. It compiles a single **.NET 10 engine with NativeAOT** into a native shared library — `dni.dylib` on iOS, `libdni.so` on Android — and loads it **directly into the UI process**. No separate backend, no network hop, no cloud. The Swift / Kotlin app calls into managed C# the way it would call into any C library.

The interesting part isn't that this works. It's that there's more than one way for the native UI to *reach* the embedded engine, each with a different cost, and the project builds all of them so you can see the difference.

## What I'm trying to accomplish

Three goals, in order of how much I cared about them:

1. **Prove the embed.** Show that a real .NET 10 engine can run on-device inside native iOS and Android shells via NativeAOT, with no managed runtime shipped alongside it and no backend process.
2. **Measure the boundary.** The native↔managed boundary is the whole ballgame in interop. There's more than one way to cross it, and the costs are not obvious. So the app reaches the *same* engine three ways and charts the round-trip time **side by side**.
3. **Keep the pipeline generic.** The payload streamed over every transport is a live C# 14 / .NET 10 language-feature showcase, but that's a stand-in. The engine talks to an `ILanguageModel` interface. Swap that one seam for a real backend — an on-device LLM via llama.cpp, say — and every transport and screen keeps working unchanged.

The showcase payload deserves a note: each "feature" is a real C# 14 / .NET 10 construct (collection expressions, the `field` keyword, extension blocks, generic math, list patterns, raw string literals) **executed live inside the NativeAOT library**, not a string describing it. So the POC doubles as a working demonstration that these language features survive AOT compilation on-device.

## One engine, three transports

All three transports are hosted by the **same** embedded library and drive the **same** `EngineHost.Orchestrator`. They differ only in how the bytes cross from .NET into Swift / Kotlin.

| Transport | Mechanism | How data crosses | Relative cost |
|-----------|-----------|------------------|:------:|
| **FFI** | in-process C ABI, zero IPC | JSON returned in-memory from a C export | ★ fastest |
| **HTTP** | raw `System.Net.Sockets` server on `127.0.0.1` | JSON over a loopback HTTP/1.1 + SSE request | ★★ |
| **SQLCipher** | encrypted on-disk SQLite (`PRAGMA key`) | written to and read back from a key-encrypted `.db` | ★★★ slowest |

The unified SwiftUI app has a transport **picker** and a **Compare** tab that runs every feature over all three transports and charts the client round-trip time as bars and totals. `FFI ≪ HTTP < SQLCipher` — and the size of that gap is the entire point of the exercise. Numbers make "in-process is faster than a loopback socket" stop being a hand-wave and start being a measurement you can defend.

A fourth transport, **gRPC over a Unix domain socket**, lives in the tree as a reference design but is excluded from the build. The reason why is the most instructive part of the whole project.

## Why ASP.NET Core won't run on mobile NativeAOT

Here's the wall I hit, and the one I suspect brought you to this post: **ASP.NET Core ships no NativeAOT runtime pack for mobile runtime identifiers.** You cannot `dotnet publish -r ios-arm64` a project that depends on Kestrel and get a working native library out the other side. The runtime pack that NativeAOT needs for `ios-arm64` / `linux-bionic-arm64` simply isn't published.

That single constraint dictated two design decisions:

- **gRPC is `<Compile Remove>`'d.** ASP.NET Core gRPC is built on Kestrel, so it inherits the same missing-runtime-pack problem. The `Grpc/` directory and `proto/dni.proto` stay in the repo as documentation of the intended design, but the shipped library exports no `dni_grpc_start`. Keeping non-compiling reference code in-tree is a deliberate choice — the contract is worth preserving even when the build can't honor it.
- **HTTP is a hand-rolled raw-socket server.** The HTTP transport isn't ASP.NET. It's a minimal HTTP/1.1 + Server-Sent Events server written directly against `System.Net.Sockets`, binding `127.0.0.1:0` and returning the OS-assigned port. It escapes JSON by hand because the reflection-based serializers aren't AOT-safe. Binding to loopback has a nice side effect on iOS: **no Local Network permission prompt**, because nothing leaves the device.

There's a sharp edge worth flagging: iOS kills the socket listener when the app suspends, so the host has to restart the HTTP server on foreground. That's the kind of detail you only learn by shipping to a physical device.

## Why SQLCipher, not e_sqlite3, on iOS

The second wall: **the default SQLite bundle for .NET ships no iOS native library.** If you add `Microsoft.Data.Sqlite` with the standard `e_sqlite3` SQLitePCLRaw bundle and try to publish for `ios-arm64`, there's no native `e_sqlite3` to statically link.

The only SQLitePCLRaw bundle that ships iOS device *and* simulator static libraries is `e_sqlcipher`. So the project links that into the NativeAOT image — and because `e_sqlcipher` is full SQLCipher, you get **AES encryption at rest for free** via `PRAGMA key`. A constraint became a feature: the SQLite transport is an encrypted broker by default, not by design ambition.

Mechanically, the SQLite transport is a WAL-mode broker. The host inserts a row into a `requests` table; a background broker polls for `status='pending'` (about every 50 ms), streams tokens into a `response_tokens` table, and marks the request `done`. The host polls back for new token rows. It's the slowest path — poll latency plus per-token row write-amplification — but it's the only one that's **durable**: the full transcript survives an app kill, and WAL lets the UI read while the broker writes. Different transport, different tradeoff, same engine.

## FFI vs HTTP vs SQLite: the cost

The fast path is FFI, and it's worth seeing the shape of it. The C ABI is frozen in `abi/dni.h` and exported with `[UnmanagedCallersOnly(EntryPoint = "...")]` — the AOT-friendly way to expose managed methods as C symbols with exact names:

```c
int32  dni_initialize(void);
int64  dni_session_start(const char* prompt, int32 max_tokens, float temperature,
                         void (*cb)(void* user_data, int32 index,
                                    const char* text_utf8, int32 is_final),
                         void* user_data);
int32  dni_session_cancel(int64 id);
int32  dni_session_free(int64 id);
void   dni_shutdown(void);
```

Tokens come back through a callback fired on a **.NET background thread**, with the `text` pointer valid only for the duration of the call — so the native side has to copy it immediately. No IPC, no serialization beyond an in-memory JSON string, no socket. That's why it wins by a wide margin.

The comparison is the deliverable. "In-process is faster" is intuitively obvious; *how much* faster, against a loopback socket versus an encrypted on-disk broker, on real hardware, is not. The Compare tab turns that into a chart you can point at.

## The architectural boundaries holding this together

A few invariants make the three-transport setup tractable rather than chaotic:

- **One frozen contract.** `docs/INTEROP_CONTRACT.md` plus `abi/dni.h` are the single source of truth. Every transport, every export name, every status code, every file path binds to that document. The managed API surface (`EngineHost`, `SessionRegistry`, `InferenceSession`, `InferenceToken`, `NativeStatus`) is treated as read-only by the transports that consume it.
- **A pure domain core with zero OS dependencies.** `DotnetNativeInterop.Engine` knows nothing about transports, iOS, or Android. It exposes `ILanguageModel`, an orchestrator, and a bounded-channel session. The NativeBridge library is the only thing that touches the C ABI and the transport hosts.
- **One swap-in seam.** The entire payload is reachable through `ILanguageModel.GenerateAsync`. The showcase model is one implementation; a real on-device model is another. The seam is the whole reason the POC is a POC and not a toy — it's structured so the demonstration payload can be replaced without touching the interop layer.
- **Backpressure over dropping.** The engine produces on a background `Task` into a bounded `System.Threading.Channels` channel. When the UI lags, the producer blocks rather than dropping tokens — correctness over throughput at the boundary.

The threading model is where the platform differences surface. On iOS the FFI callback is a non-capturing `@convention(c)` function and the Swift client hops to `@MainActor` to touch UI. On Android the JNI shim caches `JavaVM*` in `JNI_OnLoad`, calls `AttachCurrentThread` once per .NET worker thread (a thread-local destructor detaches on exit), then posts results back to a Kotlin `Handler`/`Looper`. Same engine, two genuinely different bridges — which is exactly the kind of thing this POC exists to pin down.

## Status, and swapping in a real model

Where it stands today:

- ✅ Engine + all three built transports (FFI, raw-HTTP, SQLCipher) compile and run on a physical iOS device.
- ✅ Unified SwiftUI app with the transport picker and side-by-side Compare tab, deployed to an iPad.
- 🚫 gRPC and legacy Kestrel HTTP are excluded from the build (no NativeAOT mobile runtime pack); source retained for reference.
- ⏳ The Android trio is the open follow-on — same shared contract, Compose UI. NativeAOT for Android is still experimental in .NET 10 (warning XA1040), which is its own set of sharp edges.

To run a real model instead of the showcase, the work is small and contained: implement `ILanguageModel.GenerateAsync` — for example, P/Invoke into llama.cpp for an on-device LLM — and wire it into `EngineHost.Initialize()`. Every transport, the app, and the streaming UI keep working unchanged. That's the payoff of putting the seam where I put it.

## The takeaway

You can ship a real .NET 10 engine inside a native iOS or Android app with NativeAOT, in-process, with no backend and no network. The catch is that the mobile NativeAOT toolchain has hard edges — no ASP.NET Core runtime pack, no `e_sqlite3` iOS native library, experimental Android support — and those edges, not aesthetic preference, are what shape a sane design. Raw sockets instead of Kestrel. SQLCipher instead of `e_sqlite3`. A frozen C ABI as the contract. A pure core with one swap-in seam.

The transports aren't the product; the *measured cost of each way across the boundary* is. If you're weighing how to get C# logic into a native mobile UI, the gap between in-process FFI and everything else is worth seeing with real numbers before you commit. The code is on [GitHub](https://github.com/stevenfackley/dotnet-native-interop) under MIT.
