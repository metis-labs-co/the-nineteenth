# Launch Logo Video Splash — Design

**Date:** 2026-06-15
**Status:** Approved (design)
**Author:** Sam + Claude

## Goal

Play the branded logo video (`the-nineteenth-logo.mp4`, 6.06s, 1080×1920, h264 + aac)
on every cold app open, before the login screen or the loading of an already-logged-in
user. The video overlaps real startup work rather than adding to it.

## Requirements (confirmed)

- **Dismissal:** Always play the full 6s video on every cold open. Do **not** cut it
  short when the app finishes loading early.
- **When:** Cold start only (true process launch). Resuming from background / the app
  switcher goes straight into the app with no video.
- **Audio:** Play with sound.
- **Skip:** Tap anywhere to skip the intro and jump straight into the app.

## Approach

**Approach A — Launch-video gate at the app root.** Chosen over (B) adding
`expo-splash-screen` (rejected: adds a native dependency / new build for marginal
benefit) and (C) embedding the video in `RootNavigator`'s loading gate (rejected: the
loading gate only spans the auth-loading window, but "always full 6s" requires the
video to persist past load completion and sit over Home/Welcome too).

No new dependencies: `expo-video` (~3.0.16) is already installed and used by the
existing Welcome carousel.

## Architecture

### Asset

Copy the video into the repo alongside the existing one:

```
assets/videos/the-nineteenth-logo.mp4   (from /Users/samkay/Downloads/the-nineteenth-logo.mp4)
```

### New component: `src/components/common/LaunchVideoGate/`

```
LaunchVideoGate/
  index.tsx          # gate component
  index.test.tsx     # unit tests
```

Responsibilities:

- Always renders `children` (the rest of the app). The app mounts and runs its
  auth/player loading **underneath** the overlay, so the 6s overlaps startup.
- On cold start, renders a full-screen overlay above `children`:
  - Solid background `#2f3428` (matches `app.json` splash `backgroundColor`) so the
    first JS paint is seamless with the native `splash.png` — no flash before the
    video is ready.
  - `<VideoView contentFit="contain" nativeControls={false} />` playing the logo,
    sized to fill the screen.
  - A full-screen `Pressable` over the video for tap-to-skip.
- Video player (`useVideoPlayer`): autoplay on mount, **not** looping, **not** muted
  (sound on). On iOS, configure the audio session so audio plays even when the
  hardware silent switch is on; if that setup fails, fall back to muted-but-visible
  rather than blocking launch.
- **Always full 6s:** the default dismissal path waits for the player's
  end-of-playback event. App-readiness does **not** trigger early dismissal. Only a
  tap skips early.
- **Cold-start-only:** a module-level `let hasPlayed = false` flag. If `hasPlayed` is
  already `true` (warm resume within the same process), the gate renders `children`
  with no overlay. The flag is set `true` when the overlay first mounts. No
  AsyncStorage — persistence across launches would break the "every open" requirement;
  the module flag resets naturally on process kill (= cold start).
- **Dismiss animation:** `Animated` fade-out (~250ms), then unmount the overlay.

### Wiring

In `App.tsx`, wrap the app content with `<LaunchVideoGate>` so the overlay covers the
entire app (including `RootNavigator`'s own loading spinner and the Welcome carousel):

```tsx
<LaunchVideoGate>
  <RootNavigator theme={navigationTheme} />
</LaunchVideoGate>
```

(Exact insertion point: around the existing `<RootNavigator />` inside `AppContent`,
keeping the existing backdrop image, status bar, and toast display intact.)

## Data Flow

```
Cold launch
  native splash.png (instant, pre-JS)
   -> JS mounts; LaunchVideoGate paints solid #2f3428 overlay immediately (no flash)
   -> logo video plays full 6s (with sound)        [RootNavigator loads underneath:]
                                                      auth init, player fetch, welcome flag
   -> on video end (or tap-to-skip): fade out 250ms, unmount overlay
   -> reveal resolved app state:
        logged-in  -> Home (or biometric lock / onboarding as today)
        logged-out -> Welcome carousel (welcome.mp4) -> Login/Signup

Warm resume (process still alive)
   -> hasPlayed === true -> no overlay -> straight into app
```

## Unchanged

- Native `splash.png` stays as the instant pre-JS splash.
- The Welcome carousel (`welcome.mp4`) stays as onboarding for first-time logged-out
  users; it now appears *after* the logo intro.
- `RootNavigator` auth/loading/biometric logic is untouched — the gate sits above it.

## Error Handling / Edge Cases

- **Asset fails to load / player errors:** skip the overlay and go straight to the app.
  The video must never block launch.
- **Warm resume mid-process:** `hasPlayed` flag prevents replay; no special handling.
- **Theme re-render of `AppContent`:** gate's own state + module flag prevent any
  replay or restart.
- **iOS silent switch:** attempt audio-session config for playback with sound; on
  failure, play muted (still visible).

## Testing

Unit tests for `LaunchVideoGate` (mock `expo-video` per existing test patterns):

- Renders `children`.
- Shows the overlay on first mount (cold start).
- Plays once: a second mount (simulating warm resume) renders no overlay.
- Tap-to-skip dismisses the overlay.
- End-of-video event dismisses the overlay.
- Asset/player error path renders `children` without blocking.

## Out of Scope

- Adding `expo-splash-screen`.
- Changing the native `splash.png` or `app.json` splash config.
- Replaying the video on background resume.
- Persisting "seen" state across launches (intentionally cold-start-only).
