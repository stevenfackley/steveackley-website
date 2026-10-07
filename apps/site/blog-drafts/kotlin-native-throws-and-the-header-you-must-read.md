<!--
Admin form fields:
  Title:    Kotlin/Native @Throws and the generated header you must read before writing Swift
  Slug:     kotlin-native-throws-and-the-header-you-must-read (auto-derived)
  Excerpt:  Synap's SwiftUI app sits on a Kotlin Multiplatform module. The first real Xcode build failed on four Kotlin/Native names the Swift had guessed wrong. Six weeks later a review found the Swift catch blocks could never see a network error. Both fixes started in SynapShared.h.
  Category: Engineering
  Tags:     kotlin-multiplatform, kotlin-native, swift, ios, synap
  Cover:    (none)
  Body:     everything below this comment
-->

At 00:22 Eastern on 2026-08-27 I merged PR #195 in the (private) Synap repo. Its title was "build the SwiftUI host against the KMP framework's real Swift surface," and its description says every edit was a name or a construct the Swift compiler had rejected. Until that night the iOS app had never compiled on a CI runner. No self-hosted runner had been attached to the repo since 2026-06-22, so every iOS job queued for a day and auto-cancelled.

[Synap](https://getsynap.app) delivers short professional lessons, three to four minutes each. The mobile apps share one Kotlin Multiplatform module, `mobile/shared`, which holds the lesson model, the API client and the repositories. Android calls it from Compose. iOS links it as a static framework called `SynapShared` and calls it from SwiftUI. That means the Swift in `mobile/iosApp` is written against an API that only exists after Kotlin/Native generates it, and I had been writing it against what I assumed the generator would produce.

## What the compiler rejected

The new runner on the Mac Mini ran Xcode 26.6. The first build stopped on a file that had never compiled anywhere: `FoundationModelsEvaluator.swift` sits behind `#if canImport(FoundationModels)`, so nothing older than Xcode 26 had ever looked at it.

Swift reaches Kotlin companion functions through `.companion`. The Kotlin side declares `AnswerEvaluation.selfReview()` inside a `companion object`, and Swift does not see it on the type.

```swift
// before
return AnswerEvaluation.selfReview()
// after
return AnswerEvaluation.companion.selfReview()
```

Enum entries come out lowercased. Kotlin's `EvaluationMode.OnDevice` is `.ondevice` in Swift. I had written `.onDevice`, which reads like the obvious Swift spelling and is wrong.

Nested enums are classes with static instances. I had treated `LessonBlock.Callout.Tone` like a sealed hierarchy and checked it with `is`. Kotlin/Native exports a Kotlin enum as a Swift class with one static instance per entry, and the nested type is spelled with a dot.

```swift
// before
if block.tone is LessonBlockCalloutToneWarn { return "Heads up" }
// after
if block.tone == LessonBlockCallout.Tone.warn { return "Heads up" }
```

The same fix applied to `LessonBlockFreeResponse.Evaluation.ai`.

Some factories never make it into the framework. `AppContainer.swift` built the token store with `TokenStore(settings: Settings())`. The framework exports the multiplatform-settings `Settings` interface but not its no-arg factory, so Swift had no way to construct one. The fix went on the Kotlin side, as a top-level function that Swift reaches through the file's `Kt` class:

```kotlin
fun defaultTokenStore(): TokenStore = TokenStore(Settings())
```

```swift
let store = TokenStoreKt.defaultTokenStore()
```

That function has since been replaced on iOS. PR #242 moved the token into the Keychain with a `keychainTokenStore()` in `iosMain`, called the same way through `KeychainTokenStoreKt`.

`Result { try await ... }` never compiled. The catalog view model fetched three things in parallel with `async let` (the account view model fetched two) and wrapped each await in `Result`:

```swift
let catalogResult = await Result { try await catalogTask }
```

`Result(catching:)` takes a synchronous closure, and an `async let` cannot be captured by a closure anyway. Both view models now await each task in its own `do`/`catch`. One more fix rode along: an `if/else` assignment inside a `VStack` builder was read as a view branch, and collapsing it to one `let` cleared the error.

I iterated by copying a single file into the runner's workspace over SSH and running `xcodebuild` there, which beats a full workflow dispatch per guess. The next workflow run went green end to end: the test step, framework link, xcodegen, simulator build, Release archive, and an unsigned IPA artifact.

## The header is the only spec

The four interop failures could have been avoided by opening one file first. Kotlin/Native writes an Objective-C header into the framework, `SynapShared.h`, and it carries `swift_name` attributes that give the name Swift will see. Those are the names Swift will accept. The Kotlin source tells you what exists. The header tells you what it is called on the other side, and the two disagree in ways you will not guess: lowercased enum entries, `.companion`, `.shared` for a Kotlin `object`, `<File>Kt` for top-level functions.

I wrote that down in the project notes that night as the lesson: read the generated header before writing Swift against a KMP framework, because it is the only source of truth for names.

## A catch block that never saw a network error

On 2026-10-07 I ran a review of the whole Synap codebase before cutting its [first tagged release](/blog/synap-first-release). One finding sat in the shared module: no suspend function in `mobile/shared` carried `@Throws`.

The generated header exposed every shared suspend function, 53 of them across the repositories and the API client by the count in PR #242, with a completion handler that takes an `NSError`. Swift imports that as `async throws`. So the Swift compiler let me write exactly the right code, and after PR #195 the catalog view model did:

```swift
do { catalogResult = .success(try await catalogTask) } catch { catalogResult = .failure(error) }
```

Without `@Throws` on the Kotlin side, Kotlin/Native converts only `CancellationException` into an `NSError`. Any other exception thrown inside the suspend function, a network failure or a serialization error, is not delivered to that `catch`. It terminates the process. The project's decision record from that day says any network or serialization exception "terminated the iOS process instead of reaching Swift's `catch`."

I found this in review, before the app had a public release. I can't point to a crash report from a user. The only iOS build uploaded by then, build 344281, had gone to an internal TestFlight group at 02:03 UTC on 2026-08-28.

PR #243, merged on 2026-10-07, put the annotation on every public suspend function Swift can see: the `SynapApi` interface, the repositories, and the evaluator seam.

```kotlin
interface SynapApi {

    @Throws(Exception::class, CancellationException::class)
    suspend fun getModules(): List<ModuleSummary>

    @Throws(Exception::class, CancellationException::class)
    suspend fun getModule(id: String): ModuleDetail?
    // abridged: twelve more, each annotated
}
```

`Exception` alone would satisfy the compiler, because `CancellationException` is a subclass of it. The code lists both so the cancellation path is written out. The evaluator seam matters for a different reason: `AnswerEvaluator` is a Kotlin `fun interface` that Swift implements, in `FoundationModelsEvaluator`, with `async throws`. The annotation goes on the interface method and on each Kotlin override.

PR #243 was written on Windows, where the iOS targets do not build, so its own description handed the header check to the iOS side. That check landed in PR #253 the same night: on the Mac Mini, the regenerated `SynapShared.h` showed the shared repositories' suspend functions carrying the note that they convert "instances of Exception, CancellationException to errors," for `completeLesson`, `catalog` and `completedLessonIds` among others. Both Debug and Release built for the generic iOS Simulator.

One of the alternatives the decision record rejects is returning `Result` types from every shared function instead of using `@Throws`. That would have broken every Swift call site to reach the same outcome.

## Getting the Kotlin exception back out

Once errors reach Swift, they arrive as `NSError`. The original Kotlin throwable rides along in `userInfo` under the `KotlinException` key, which lets iOS use the same user-facing messages as Android. This is `ErrorText.swift` in the app today:

```swift
private static func kotlinException(_ error: Error) -> KotlinThrowable? {
    (error as NSError).userInfo["KotlinException"] as? KotlinThrowable
}
```

From there, `kotlin.userMessage()` calls a shared Kotlin extension, `Throwable.userMessage()`, and `as? ApiException` gets the HTTP status, which is how the app tells a 402 `lesson_locked` from a network failure and shows the "Unlock with All Access" panel instead of an error message.

## The checklist

This is what I now do before writing Swift against `mobile/shared`, and before merging a change to its public surface.

1. Build the framework and open the header. The command PR #242 used on the Mac Mini was `./gradlew :shared:linkDebugFrameworkIosSimulatorArm64`. Look up each name in `SynapShared.h` by its `swift_name` before typing it in Swift.
2. Put `@Throws(Exception::class, CancellationException::class)` on every suspend function Swift can call, and on every method of an interface Swift implements. The decision record makes this a rule for new functions too.
3. After the build, confirm the header carries the "converts instances of Exception, CancellationException to errors" note on the functions you changed. Without it, your Swift `catch` compiles and never runs for anything but cancellation. Steps 1 and 3 still need a Mac: as of 2026-10-07, `mobile-ci-ios.yml` runs only on manual dispatch and `ios-v*` tags, and `iosApp` has no Swift test target, so the header check happens by hand on the Mac Mini, the way PR #253 did it.
