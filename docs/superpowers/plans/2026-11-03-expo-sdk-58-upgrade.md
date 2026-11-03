# Plan: Expo SDK 54 → 58 Upgrade

## Overview

Move the app from Expo SDK 54 (RN 0.81.5, React 19.1) to Expo SDK 58 (RN 0.88, React 19.2),
including the hand-managed `ios/` project (phone + watchOS targets), the CNG-generated `android/`
project (with the injected Wear OS module), the JS dependency tree, the test toolchain, and the
EAS build/update pipeline. Ships as a new native release (new `runtimeVersion`), not an OTA.

Motivation: the remaining `pnpm audit` findings (230 → 30 after the same-major override batch
`cb62b275`; the rest need majors) sit in SDK 54-era Expo/Metro/RN CLI tooling and React Navigation 6
(see memory `node-cve-oct-2026-and-sdk58-upgrade`), SDK 54 is four releases behind, and apps
built with the iOS 27 SDK must use the UIKit scene life cycle (SDK 57 opt-in, SDK 58 default).

Out of scope: zod 3 → 4, Storybook major upgrade (unless forced), expo-router adoption,
feature work of any kind.

## Approach

- **Own worktree + branch off `main`**: `git worktree add ../the-nineteenth-sdk58 -b chore/expo-sdk-58 main`,
  then `pnpm install` inside it (never symlink `node_modules` — see memory
  `worktree-node-modules-symlink-gotcha`).
- **One SDK hop at a time (55 → 56 → 57 → 58)**, each hop a separate commit series that ends
  with `pnpm type-check`, the full Jest suite (diffed against the baseline — see memory
  `jest-baseline-noise`), an iOS simulator build, and an Android dev build. Expo's own guidance is
  per-SDK hops, and the bare `ios/` project must take the Native Upgrade Helper diff
  (`https://docs.expo.dev/bare/upgrade/?fromSdk=N&toSdk=N+1`) for each hop by hand.
- **Never run `expo prebuild` for iOS.** `ios/` is committed and holds the watch app +
  complication (memory `ios-bare-workflow-watch-target`). Note SDK 57+ `prebuild` cleans by default,
  which makes an accidental run even more destructive. Android stays CNG: delete the local
  `android/` and regenerate per hop.
- **No feature flag.** This is platform infrastructure; there is no `BrandFeatureFlags` /
  `docs/FEATURE_FLAGS.md` in this repo. Gating is by native release (runtimeVersion bump) and
  staged store rollout.
- **Ship only at 58.** Intermediate hops are never released; only the final branch goes to
  staging → TestFlight/Play internal → production.

### Version facts (from expo.dev/changelog, fetched 2026-11-03)

| SDK | Released | RN | Key breaking items that touch this repo |
|-----|----------|----|------------------------------------------|
| 55 | early 2026 | 0.83 | Legacy arch removed (`newArchEnabled` key gone); `expo-video` `allowsFullscreen` removed; `eas update` requires `--environment`; packages versioned `^55.0.0` |
| 56 | 2026-05-21 | 0.85 | Xcode 26.4 + iOS 16.4 minimum; `expo` no longer depends on `@expo/vector-icons`; `expo/fetch` becomes global `fetch`; `File.copy/move` async; TypeScript 6.0.3 pulled in by `--fix`; Hermes v1 default (memory regression with reanimated/worklets fixed in 57.0.9) |
| 57 | 2026-06-30 | 0.86 | Reanimated 4.5 / worklets 0.10 / RNGH 2.32; `prebuild` cleans by default; scene life cycle opt-in via `ios.enableSceneSupport` (`expo@57.0.23`) |
| 58 | 2026-10-15 | 0.88 | Scene life cycle default (SceneDelegate + `UIApplicationSceneManifest`); iOS 27 SDK; strict TS API (no `react-native/Libraries/*` deep imports); `File.write()` async; `NODE_ENV` forced by command; R8 on by default in release; foreground notifications shown by default; `Linking.parse` single-decode; `--tunnel` needs `expo login`; Node ≥22.13 / ≥24.3 (we pin 24.22.2 — OK) |

### Codebase hotspots found during exploration

| Area | Finding | Hop |
|------|---------|-----|
| `src/screens/auth/WelcomeCarouselScreen/index.tsx:137` | `allowsFullscreen={false}` on `VideoView` → `fullscreenOptions={{ enable: false }}` | 55 |
| `android/gradle.properties` `newArchEnabled=true` | Already new arch; just drop any `newArchEnabled` config | 55 |
| `scripts/eas-update-prod.js:289` | `eas update` args lack `--environment production` | 55 |
| `src/screens/scoring/PlayerScorecardScreen/components/ScorecardPlayerHeader.tsx:11` | Only `@expo/vector-icons` import in the app | 56 |
| `ios/TheNineteenth.xcodeproj` | `IPHONEOS_DEPLOYMENT_TARGET = 15.1` (4 configs) → 16.4; `Podfile` default `'15.1'`; watch targets at watchOS 10.0 (fine) | 56 |
| `eas.json` | All profiles pin `macos-tahoe-26.4-xcode-26.4`; SDK 58 builds against iOS 27 SDK → needs Xcode 27 image | 56 / 58 |
| `src/hooks/player/dataExport.ts:11,37` | `expo-file-system/next` import path + sync `file.write(...)` → stable import + `await file.write()` (or `writeSync`) | 56 / 58 |
| Supabase client `fetch` | `expo/fetch` replaces global `fetch` — Supabase JS, GolfAPI proxy, uploads must be smoke-tested | 56 |
| `react-native-reanimated ~4.1.6` / `react-native-worklets 0.5.1` | Pulled to 4.5 / 0.10 by `--fix`; check `babel.config.js` plugin needs | 56–57 |
| `ios/TheNineteenth/AppDelegate.swift` | Creates `UIWindow` + `startReactNative(in: window)` in `didFinishLaunching`; overrides URL + universal-link handlers; Google Maps init block. No `UIApplicationSceneManifest` in `Info.plist` | 57 / 58 |
| `jest.setup.js:211,569`, `src/components/wolf/WolfResultsCard.test.tsx:16-18` | `react-native/Libraries/*` deep requires → strict-TS / export-map breakage | 58 |
| `src/services/notifications/channels.ts:28` | `setNotificationHandler` already returns explicit `shouldShowBanner/List` — confirm unchanged behaviour | 58 |
| `src/context/AuthContext.tsx:183` | `Linking.parse(url)` for auth/deep links — single-decode change could alter magic-link / reset tokens | 58 |
| `app.config.js` `require('dotenv').config()` + `.env` `NODE_ENV=development` | SDK 58 forces `NODE_ENV` per command; interacts with the OTA env-leak history (memory `eas-update-env-staging-gotcha`) | 58 |
| `plugins/withWearOs.js` `KOTLIN_VERSION = '2.0.21'` | Must match the Kotlin version the new `expo-root-project` resolves, each hop | every hop |
| `wear/build.gradle`, `modules/wear-bridge/android/build.gradle` | Inherit AGP/Kotlin from root; AGP 9 compatibility to verify | 57–58 |
| `patches/expo-constants@18.0.12.patch` + `pnpm-workspace.yaml` | Version-pinned patch; also `Podfile` post_install quoting fix. Likely obsolete — re-verify the "path with a space" build | 55 |
| `expo-background-fetch`, `expo-task-manager` | In `package.json` but not imported anywhere in `src/`/`App.tsx` → remove | 55 |
| `@types/react-native ^0.73` | Obsolete since RN ships types; conflicts with strict API → remove | 55 |
| `@react-navigation/* ^6` (192 files) | Standalone React Navigation 6 against `react-native-screens` 4.2x+ — compatibility must be confirmed; may force a v7 migration | 55–56 (decision) |
| `react-native-watch-connectivity ^2.0.0`, `react-native-maps 1.20.1`, `react-native-purchases ^9`, `react-native-paper ^5`, `react-native-gifted-charts`, `@storybook/react-native ^8` | Third-party native/RN libs to re-verify on RN 0.88 via `expo-doctor` + React Native Directory | every hop |

---

## Phase 0: Preparation

### Step 0.1: Create worktree and capture baselines
**Status:** Pending
**Type:** Manual
**Command:** N/A

**Details:**
1. Push local `main` to origin first (D8) — includes 703ff586 Node 24.22.2 pin and cb62b275 audit override batch — so the branch starts from a published base and CI runs Node 24.22.2.
2. `git worktree add ../the-nineteenth-sdk58 -b chore/expo-sdk-58 main`; `pnpm install` in the worktree.
3. Record baselines: `pnpm type-check`, `pnpm lint:ci` warning count, full `pnpm test -- --runInBand --silent` pass/fail list, `pnpm audit --json | jq '.metadata'` counts, `npx expo-doctor`.
4. Record build-time baselines: iOS release archive size, Android AAB size, cold-start time on a reference device.

**Files to create/modify:** none (baseline notes kept in the PR description)

**Dependencies:** None

### Step 0.2: Pre-upgrade cleanups on SDK 54
**Status:** Pending
**Type:** Custom
**Command:** N/A

**Details:**
Do the cheap, SDK-independent fixes first so each hop's diff stays focused:
- Remove unused native deps deferred from the cb62b275 audit batch: `expo-background-fetch`, `expo-task-manager`, `@react-native-community/slider`, `react-native-purchases-ui` (re-verify each is unused first); plus `@types/react-native`.
- Replace the single `@expo/vector-icons` import in `ScorecardPlayerHeader.tsx` with Paper `Icon` (MaterialCommunityIcons names are what Paper uses) and drop the dependency (D5). Also migrate any remaining `react-native-vector-icons` usage off that package.
- Replace `react-native/Libraries/*` deep requires in `jest.setup.js` and `WolfResultsCard.test.tsx` with public `react-native` exports / `jest.requireActual('react-native')`.
- Add `--environment production` to `scripts/eas-update-prod.js` update args (harmless on SDK 54 CLI; mandatory from 55).
- Run gate; commit.

**Files to create/modify:**
- `package.json`, `pnpm-lock.yaml`
- `src/screens/scoring/PlayerScorecardScreen/components/ScorecardPlayerHeader.tsx`
- `jest.setup.js`, `src/components/wolf/WolfResultsCard.test.tsx`
- `scripts/eas-update-prod.js`

**Dependencies:** Step 0.1

---

## Phase 1: SDK 55 (RN 0.83)

### Step 1.1: Bump JS dependencies
**Status:** Pending
**Type:** Custom
**Command:** N/A

**Details:**
`npx expo install expo@^55.0.0 --fix`, then `npx expo-doctor@latest`. Expect all `expo-*` packages to move to `^55.0.0` versioning. Bump `jest-expo`, `babel-preset-expo`, `eslint-config-expo` to SDK 55. Update `@testing-library/react-native` if React 19.2 requires it. Drop or regenerate `patches/expo-constants@18.0.12.patch` (re-key in `pnpm-workspace.yaml` to the new version only if the bug still exists upstream). Confirm `expo-age-range` has an SDK 55-compatible release.

**Files to create/modify:** `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `patches/`

**Dependencies:** Phase 0

### Step 1.2: Code changes for SDK 55 breaking items
**Status:** Pending
**Type:** Custom
**Command:** N/A

**Details:**
- `WelcomeCarouselScreen`: `allowsFullscreen={false}` → `fullscreenOptions={{ enable: false }}`.
- Remove any `newArchEnabled` / `edgeToEdgeEnabled` / top-level `notification` keys from `app.json` (none present today — verify after `--fix`).
- Fix type errors from the RN 0.83 types.

**Files to create/modify:** `src/screens/auth/WelcomeCarouselScreen/index.tsx`, `app.json`

**Dependencies:** Step 1.1

### Step 1.3: iOS native upgrade (bare)
**Status:** Pending
**Type:** Manual
**Command:** N/A

**Details:**
Apply the Native Upgrade Helper diff 54→55 to `ios/` by hand (AppDelegate, Podfile, `.xcode.env`, pbxproj build settings). Keep: watch target, complication, "Embed Watch Content" phase (`scripts/embed_watch_app.rb` is idempotent — re-run to confirm), Google Maps `@generated` blocks and `__GMS_KEY__` placeholder, Podfile space-in-path post_install fix. `cd ios && pod install`. Build phone + watch scheme in the simulator.

**Files to create/modify:** `ios/Podfile`, `ios/Podfile.lock`, `ios/TheNineteenth/AppDelegate.swift`, `ios/TheNineteenth.xcodeproj/project.pbxproj`

**Dependencies:** Step 1.1

### Step 1.4: Android regenerate + Wear OS
**Status:** Pending
**Type:** Custom
**Command:** N/A

**Details:**
`rm -rf android && npx expo prebuild --platform android` (Android ONLY — never `--platform ios` or bare `prebuild`). Read the resolved Kotlin version from the generated root build and update `KOTLIN_VERSION` in `plugins/withWearOs.js`. Build the phone app and `:wear` module; install wear APK via adb.

**Files to create/modify:** `plugins/withWearOs.js` (if Kotlin changed), possibly `wear/build.gradle`, `modules/wear-bridge/android/build.gradle`

**Dependencies:** Step 1.1

### Step 1.5: Hop gate
**Status:** Pending
**Type:** Manual
**Command:** N/A

**Details:** `pnpm verify:gate`, full Jest vs baseline, simulator smoke (launch, log in, open a round, enter a score offline). Commit "chore(sdk): Expo SDK 55".

**Dependencies:** Steps 1.2–1.4

---

## Phase 2: SDK 56 (RN 0.85)

### Step 2.1: Bump JS dependencies
**Status:** Pending
**Type:** Custom
**Command:** N/A

**Details:**
`npx expo install expo@^56.0.0 --fix`; `expo-doctor`. TypeScript 6.0.3 arrives unless excluded (decision D6). Reanimated/worklets bump — confirm `babel-preset-expo` handles the worklets plugin (no manual plugin in `babel.config.js` today). Hermes v1 becomes default; the reanimated memory regression is only fixed in `expo@57.0.9`, which is fine because 56 is never shipped.

**Files to create/modify:** `package.json`, `pnpm-lock.yaml`, `tsconfig.json` (if TS 6 needs changes)

**Dependencies:** Phase 1

### Step 2.2: Code changes for SDK 56 breaking items
**Status:** Pending
**Type:** Custom
**Command:** N/A

**Details:**
- `dataExport.ts`: import from `expo-file-system` (stable `File`/`Paths`), not `expo-file-system/next`.
- `expo/fetch` as global `fetch`: smoke-test Supabase auth refresh, PostgREST, storage uploads (avatar + round photos), edge-function calls, GolfAPI proxy. Opt-out `EXPO_PUBLIC_USE_RN_FETCH=1` only if something breaks — record why.
- Fix TS 6 errors.

**Files to create/modify:** `src/hooks/player/dataExport.ts`, any fetch-related fixes

**Dependencies:** Step 2.1

### Step 2.3: iOS native upgrade incl. iOS 16.4 minimum
**Status:** Pending
**Type:** Manual
**Command:** N/A

**Details:**
Native Upgrade Helper 55→56. Set `IPHONEOS_DEPLOYMENT_TARGET = 16.4` on all phone configs in the pbxproj and `ios.deploymentTarget` in `Podfile.properties.json` (or Podfile default). Watch targets stay watchOS 10.0. Bump `modules/wear-bridge` podspec target only if it gains an iOS podspec (Android-only today). Requires local Xcode ≥ 26.4. Drops iPhone 6s/7/SE1 — confirm acceptable (decision D3).

**Files to create/modify:** `ios/` files as in 1.3, `ios/Podfile.properties.json`

**Dependencies:** Step 2.1

### Step 2.4: Android regenerate + Wear OS; hop gate
**Status:** Pending
**Type:** Custom
**Command:** N/A

**Details:** Repeat Step 1.4 and Step 1.5. Commit "chore(sdk): Expo SDK 56".

**Dependencies:** Steps 2.2–2.3

### Step 2.5: React Navigation compatibility checkpoint
**Status:** Pending
**Type:** Custom
**Command:** N/A

**Details:**
`react-native-screens` / `react-native-safe-area-context` versions now well past what React Navigation 6 was built against. Run every stack/tab/modal path on device; check peer-dep warnings. If v6 is broken or unsupported, execute decision D2 (migrate to React Navigation 7: `navigate` semantics, nested-navigator `screen` params, `NavigationContainer` linking config, type changes across ~192 files) as its own commit series before continuing.

**Files to create/modify:** `src/navigation/**`, screens using navigation

**Dependencies:** Step 2.4

---

## Phase 3: SDK 57 (RN 0.86) + scene life cycle

### Step 3.1: Bump JS dependencies
**Status:** Pending
**Type:** Custom
**Command:** N/A

**Details:** `npx expo install expo@^57.0.0 --fix` (ensure ≥ 57.0.23 for scene opt-in, ≥ 57.0.17 for dev-startup fix); `expo-doctor`. Reanimated 4.5 / worklets 0.10 / RNGH 2.32.

**Dependencies:** Phase 2

### Step 3.2: iOS native upgrade + SceneDelegate migration
**Status:** Pending
**Type:** Manual
**Command:** N/A

**Details:**
Native Upgrade Helper 56→57, then follow `expo.fyi/ios-scene-lifecycle` while still on 57 (isolates the riskiest native change from the RN 0.88 jump):
- Add `SceneDelegate.swift` to the phone target (not the watch target) and a `UIApplicationSceneManifest` to `ios/TheNineteenth/Info.plist`.
- Move `UIWindow` creation + `factory.startReactNative(...)` out of `didFinishLaunching` into the scene delegate, per the Expo template.
- Move URL-open and universal-link (`continue userActivity`) handling to the scene path / rely on Expo forwarding to `ExpoAppDelegate` subscribers; confirm `RCTLinkingManager` still receives cold-start and warm links.
- Keep Google Maps `GMSServices.provideAPIKey("__GMS_KEY__")` in `didFinishLaunching` (and `scripts/inject-maps-key.js` still finds it).
- Verify: cold/warm deep links (`thenineteenth://`, `https://thenineteenth.golf/...`), magic-link + password-reset, push-notification tap deep links, Apple Sign-In, `WCSession` watch messaging, RevenueCat paywall presentation, `<SystemModalTheme>` modals.

**Files to create/modify:** `ios/TheNineteenth/AppDelegate.swift`, `ios/TheNineteenth/SceneDelegate.swift` (new), `ios/TheNineteenth/Info.plist`, `ios/TheNineteenth.xcodeproj/project.pbxproj`, `scripts/inject-maps-key.js` (only if the placeholder moves)

**Dependencies:** Step 3.1

### Step 3.3: Android regenerate + Wear OS; hop gate
**Status:** Pending
**Type:** Custom
**Command:** N/A

**Details:** Repeat Step 1.4 and Step 1.5, plus the Step 3.2 iOS verification list on a physical iPhone + paired Apple Watch. Commit "chore(sdk): Expo SDK 57 + iOS scene life cycle".

**Dependencies:** Step 3.2

---

## Phase 4: SDK 58 (RN 0.88)

### Step 4.1: Bump JS dependencies
**Status:** Pending
**Type:** Custom
**Command:** N/A

**Details:** `npx expo install expo@^58.0.0 --fix`; `npx expo install react-native-safe-area-context` (called out in the SDK 58 post); `expo-doctor`. Bump `jest-expo` ~58.

**Dependencies:** Phase 3

### Step 4.2: Code changes for SDK 58 breaking items
**Status:** Pending
**Type:** Custom
**Command:** N/A

**Details:**
- Strict TS API: fix ref types (`ViewInstance`, `TextInputInstance`, etc.) and any remaining deep imports. Use the `react-native-legacy-deep-imports` `customConditions` escape hatch only temporarily, with a follow-up task (it is removed after RN 0.89).
- `dataExport.ts`: `file.write(...)` → `await file.write(...)` (or `writeSync`).
- Removed RN APIs: confirm no `InteractionManager`, `Touchable` root export, `Modal animated`, `StatusBar backgroundColor/translucent` (none found in exploration — re-grep after bump).
- `AuthContext.tsx` `Linking.parse`: test magic-link, password-reset and invite-code URLs with encoded params (single-decode change).
- `channels.ts` notification handler: confirm foreground behaviour matches today (it already returns explicit flags).
- `expo-localization` RTL change: no RTL locales targeted; verify layout unchanged.

**Files to create/modify:** `src/hooks/player/dataExport.ts`, `src/context/AuthContext.tsx` (if needed), typed-ref call sites, `tsconfig.json`

**Dependencies:** Step 4.1

### Step 4.3: Env / NODE_ENV and OTA pipeline
**Status:** Pending
**Type:** Custom
**Command:** N/A

**Details:**
SDK 58 forces `NODE_ENV` by command (`expo export`/`eas update` → production, `expo start` → development), overriding `.env`'s `NODE_ENV=development`. Remove `NODE_ENV` from `.env` / `.env.example`, re-check `app.config.js` `dotenv` loading, and re-verify `scripts/eas-update-prod.js` still produces a prod-only bundle (`strings` grep: prod ref `bvnxfhuvocxyilhlenka` ≥1, staging ref `uoqofjwtdgdzhpwfzklo` = 0). Do a dry-run export, no publish.

**Files to create/modify:** `.env.example`, `app.config.js` (if needed), `scripts/eas-update-prod.js` (if needed)

**Dependencies:** Step 4.1

### Step 4.4: iOS native upgrade + Xcode 27
**Status:** Pending
**Type:** Manual
**Command:** N/A

**Details:**
Native Upgrade Helper 57→58 (scene life cycle should already be done; reconcile with the template diff). Replace `RCT_METRO_PORT` usage, if any, with the `RCTMetroPort` Info.plist key. iOS 27 apps are resizable and `requireFullScreen` no longer opts out — test portrait-only layouts on iPad-sized windows is N/A (`supportsTablet: false`) but verify iPhone behaviour. Update `eas.json` `ios.image` in every profile to the Xcode 27 image (decision D4).

**Files to create/modify:** `ios/**`, `eas.json`

**Dependencies:** Step 4.1

### Step 4.5: Android regenerate, R8, Wear OS
**Status:** Pending
**Type:** Custom
**Command:** N/A

**Details:**
Regenerate `android/`; sync `KOTLIN_VERSION`; confirm AGP 9 works for `:wear` and `wear-bridge`. R8 is now on in release (decision D7): build a release AAB, test RevenueCat, Supabase, maps, notifications, Wear bridge; add keep rules via `expo-build-properties` if anything uses reflection.

**Files to create/modify:** `plugins/withWearOs.js`, `app.json` (`expo-build-properties` plugin if needed), `wear/build.gradle`

**Dependencies:** Step 4.1

### Step 4.6: Hop gate + audit check
**Status:** Pending
**Type:** Manual
**Command:** N/A

**Details:** `pnpm verify:gate`, full Jest vs baseline, scoring subset from CLAUDE.md, `pnpm audit` counts vs Step 0.1 baseline, `expo-doctor` clean. Prune `pnpm.overrides` from cb62b275 that SDK 58's own versions make redundant (remove each, reinstall, confirm audit count doesn't rise). Commit "chore(sdk): Expo SDK 58".

**Dependencies:** Steps 4.2–4.5

---

## Phase 5: Release

### Step 5.1: Version + runtimeVersion bump
**Status:** Pending
**Type:** Custom
**Command:** N/A

**Details:** Add `expo-updates` code signing (`updates.codeSigningCertificate` + `codeSigningMetadata`; private key kept out of git, used by `scripts/eas-update-prod.js`) — OTAs are currently unsigned and the new runtime is the clean point to start signing, since signed-only binaries reject unsigned updates. Bump `app.json` `version` and the literal `runtimeVersion` (bare workflow — no policy) to the next native version so SDK 54 OTAs never reach SDK 58 binaries. Update the "Expo (SDK 54)" references in `CLAUDE.md`, `docs/PROJECT_SETUP.md`, `docs/tech-stack.md`.

**Dependencies:** Phase 4

### Step 5.2: Device QA matrix
**Status:** Pending
**Type:** Manual
**Command:** N/A

**Details:**
Staging builds (`eas build --profile staging`) on: physical iPhone (iOS 26 + iOS 27 if available) with paired Apple Watch; Android phone with Wear OS watch; one low-end Android. Cover: auth (email, magic link, Apple, Google), deep links cold/warm, push notifications + tap routing, offline score entry + sync (airplane mode), all scorecard variants, watch scoring round-trip, Wear OS bridge, maps/GPS, camera + photo upload, data export, RevenueCat purchase/restore (sandbox), force-update gate, OTA fetch on the new runtime.

**Dependencies:** Step 5.1

### Step 5.3: Merge, ship, clean up
**Status:** Pending
**Type:** Manual
**Command:** N/A

**Details:** Merge to `main`; production builds; staged rollout (Play staged %, App Store phased release). Watch Sentry for native crashes for 72h before 100%. Offer worktree cleanup per global rules.

**Dependencies:** Step 5.2

---

## Decisions (resolved 2026-11-03)

- **D1 Hop strategy**: sequential 55→56→57→58, each hop gated; only 58 ships.
- **D2 React Navigation**: stay on v6; checkpoint at Step 2.5, migrate to v7 only if broken.
- **D3 iOS 16.4 minimum**: accepted (drops iPhone 6s/7/SE1).
- **D4 Xcode 27**: move EAS images to Xcode 27 in Step 4.4.
- **D5 `@expo/vector-icons`**: migrate the one call site to Paper `Icon`, drop the dep.
- **D6 TypeScript 6**: accept with SDK 56.
- **D7 Android R8**: accept default minify; add keep rules as needed.
- **D8 Node pin**: push local `main` (703ff586 + cb62b275) to origin before branching.

---

## Verification

- [ ] `expo-doctor` clean on SDK 58
- [ ] `pnpm type-check`, `pnpm lint:ci`, full Jest at or better than baseline; scoring subset green
- [ ] `pnpm audit` transitive findings materially reduced vs baseline
- [ ] iOS archive includes `Payload/*.app/Watch/` and watch scoring works on device
- [ ] Wear OS module builds and bridges data
- [ ] Deep links, magic links, push taps work cold and warm under the scene life cycle
- [ ] Offline score entry + sync verified in airplane mode
- [ ] OTA export bundle contains prod Supabase ref only
- [ ] OTA updates signed; unsigned update rejected by a staging build
- [ ] New `runtimeVersion` set; SDK 54 OTAs cannot reach SDK 58 binaries
- [ ] Docs referencing SDK 54 updated
