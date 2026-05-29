# Launch Video Loader — Design

**Date:** 2026-05-29
**Status:** Approved (design); pending implementation plan

## Goal

Play a fullscreen `logo-wink.mp4` video as an animated loader on every cold start
of the app. While the video plays, authentication initializes in the background.
When the video ends, the app routes to wherever auth landed — the Welcome/Login
flow if logged out, or the main app if logged in.

## Behavior

- **Trigger:** Cold start only (every app process launch). Not replayed on
  foreground returns, nor on logout→login transitions within the same session.
- **Playback:** Plays through once, fullscreen, `contentFit="cover"`, muted, no
  native controls, no loop.
- **Gating:** "Always at launch, gate after." The video plays for every launch
  regardless of auth state; the routing decision happens when it finishes.
  - If the video finishes but auth is still resolving, the splash stays mounted
    showing the paused last frame until auth is ready ("hold briefly until ready").
  - If auth resolves before the video ends, the video still plays through to the
    end, then dismisses.

### Note on "if logged out"

The original request said the loader should show "if logged out", but the chosen
timing model ("always at launch, gate after") means logged-in users briefly see
the video on cold start too. This is the accepted trade-off for the simplest /
most reliable implementation. If this becomes undesirable, the alternative is to
wait for auth to resolve and only play the video when the user is confirmed
logged out (no added delay for logged-in users).

## Approach

Gate inside `src/navigation/RootNavigator.tsx`, which already owns the launch
loading gate (currently `LoadingSpinner` at ~lines 253-266) and already consumes
`useAuth`.

1. Add a `launchVideoDone` state to `RootNavigator`, initialized `false`. Because
   `RootNavigator` mounts once per app process, this state naturally scopes the
   video to cold start — it is never reset on logout→login transitions.
2. Replace the loading-gate render with:

   ```ts
   const authNotReady =
     isInitializing ||
     (isAuthenticated && isLoading) ||
     (!isAuthenticated && hasSeenWelcome === null);

   if (!launchVideoDone || authNotReady) {
     return <LaunchVideoSplash onFinish={() => setLaunchVideoDone(true)} />;
   }
   ```

   - `!launchVideoDone` keeps the splash up while the video is playing.
   - `authNotReady` keeps the splash up if the video finished first.
   - The splash is the same component instance across these states, so the
     `expo-video` player is not recreated mid-playback.

## New component: `LaunchVideoSplash`

**Location:** `src/components/common/LaunchVideoSplash.tsx`
**Exported from:** `src/components/common/index.ts`

**Props:**
- `onFinish: () => void` — called once when the video reaches its end (or the
  safety timeout fires).

**Implementation notes (mirrors the existing `WelcomeCarouselScreen` pattern):**
- `const player = useVideoPlayer(logoWinkSource, (p) => { p.loop = false; p.muted = true; p.play(); });`
- `<VideoView style={StyleSheet.absoluteFill} player={player} contentFit="cover" nativeControls={false} allowsFullscreen={false} allowsPictureInPicture={false} />`
- Rendered over a themed background `View` (`colors.background`) so any letterbox
  edges respect light/dark.
- Subscribe to the player's `playToEnd` event → call `onFinish` once (guard so it
  fires a single time).
- **Safety timeout (~6s):** if the video errors or never emits `playToEnd`, a
  timer forces `onFinish` so launch can never hang. Cleared on unmount and when
  `playToEnd` fires first.

## Asset

Copy the source video into the app bundle alongside the existing welcome video:

- Source: `/Users/samkay/Documents/Metis Co/Clients/The Nineteenth/Video/EXPORTS/logo-wink.mp4`
- Destination: `assets/videos/logo-wink.mp4`
- Referenced via `require('../../../assets/videos/logo-wink.mp4')` (path relative
  to the component file).

## Alternatives considered

- **Top-level overlay in `App.tsx`** — rejected. Would duplicate the
  auth-readiness logic that already lives in `RootNavigator`.
- **Native splash via `expo-splash-screen`** — rejected. Cannot play video and
  cannot gate dismissal on auth state.

## Testing

No automated tests planned. This is a presentational launch component whose
timing behavior is hard to unit-test meaningfully; verification will be by
running the app (cold start logged-out and logged-in, plus the safety-timeout
path). A unit test of the finish/timeout logic can be added on request.

## Files touched

- `assets/videos/logo-wink.mp4` (new asset)
- `src/components/common/LaunchVideoSplash.tsx` (new component)
- `src/components/common/index.ts` (export)
- `src/navigation/RootNavigator.tsx` (gate change)
