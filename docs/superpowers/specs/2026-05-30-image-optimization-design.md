# Image Optimization — Design Spec

**Date:** 2026-05-30
**Status:** Approved (pending implementation plan)
**Author:** Sam + Claude

## Problem

User-uploaded images (round photos, avatars) are downloaded at **full resolution
everywhere**, even where rendered tiny:

- `RoundPhotoAlbum` loads full-res originals into 100×100px grid tiles.
- `HomeActivityHeroCard` loads full-res into a 46×46px thumbnail.
- `RoundPhotoBanner` loads full-res for cover carousels.
- `PlayerAvatar` loads full-res avatar files into 26–64px circles.
- `RoundPhotoViewer` (full screen) also loads full-res — correct there, but the
  full image is fetched as part of the album query rather than lazily on tap.

Only picker-level `quality: 0.6` compression exists; no resizing. Result: wasted
bandwidth, slower screens, carousel jank, and re-downloads when signed URLs expire.

## Goal

Show **reduced-size images for thumbnails/previews**, and only fetch the
**full-resolution image when a preview is tapped** in the round photos viewer.

## Approach

Use **Supabase on-the-fly image transforms** (no DB changes, no backfill — works
on all existing images immediately) plus **`expo-image`** for caching and smooth
placeholder→full transitions.

### Critical constraint (drives the design)

`@supabase/storage-js` 2.80.0 transform support is **not uniform**:

| Method | Used for | `transform` support |
|---|---|---|
| `getPublicUrl(path, { transform })` | avatars (public bucket) | ✅ |
| `createSignedUrl(path, ttl, { transform })` | single private file | ✅ |
| `createSignedUrls(paths, ttl)` (batch) | round photos (current code) | ❌ download-only |

Transforms are **baked into the signed URL's signature** — you cannot append
`?width=` to an already-signed URL. So private round-photo previews must be
signed **per-photo at the requested size** (singular `createSignedUrl`, run in
parallel), not via the existing batch call.

### Plan-level requirement

⚠️ **Supabase image transformations require the Pro plan** (paid add-on, billed
per *origin* image). The implementation must include a single
`TRANSFORMS_ENABLED` flag so the app falls back to plain (untransformed) URLs if
transforms are unavailable — keeping the app functional regardless of plan state.

## Components

### 1. `src/utils/imageTransform.ts` (new)
- `TRANSFORMS_ENABLED` flag (single source of truth; can be wired to env later).
- Size presets used app-wide, e.g.:
  - `AVATAR_SM` (≈64), `THUMB` (≈200), `COVER` (≈600), `FULL` (no transform).
- Default `quality` (e.g. 70) and `resize: 'cover'` for thumbs, `'contain'` for full.
- Helper(s) to build a `TransformOptions` object for a given preset, sized by
  `displaySize × pixelRatio` and capped at the preset max. When
  `TRANSFORMS_ENABLED` is false, returns `undefined` (→ plain URL).

### 2. `src/components/common/AppImage.tsx` (new)
- Thin wrapper over `expo-image`'s `Image`.
- Props: `uri`, `style`, `placeholder?`, `contentFit?`, `accessibilityLabel`,
  `recyclingKey?`, `transition?`.
- Disk + memory caching, fade-in transition, optional placeholder (thumbnail or
  blur) while loading.
- All image rendering in the affected surfaces routes through this.

### 3. Avatars — `PlayerAvatar` (edit)
- For remote URLs, build a transformed public URL via
  `getPublicUrl(path, { transform })` sized to `size × pixelRatio` (capped at
  `AVATAR_SM`). Public bucket → pure URL change, no signing, no backfill.
- Bundled SVG avatars unaffected.
- Note: `PlayerAvatar` currently receives a full `photoUrl` string; it will need
  the storage **path** (or logic to derive a transformed URL from the public URL)
  to apply transforms. The plan will resolve how the path reaches the component.

### 4. Round photo thumbnails — query layer (edit `src/hooks/activity/queries.ts`)
- Add a helper that signs **thumbnail-sized** URLs per photo using singular
  `createSignedUrl(path, ttl, { transform: THUMB|COVER })`, parallelized with
  `Promise.all`.
- `useRoundPhotos`: return photo metadata + **thumbnail** signed URLs (not full).
- `useHomeActivityPreview`: cover thumbnail signed at `COVER`/thumb size instead
  of the batch full-size signing.
- `RoundPhotoBanner` cover: thumbnail/`COVER` transform.

### 5. Round photo full view — lazy full-res (edit viewer + album)
- The album query no longer pre-fetches full-res URLs.
- When a thumbnail is tapped and `RoundPhotoViewer` opens, sign the **full-res**
  URL on demand (tapped photo + immediate neighbors), via `createSignedUrl`
  without transform (or `FULL`).
- `RoundPhotoViewer` displays the already-cached thumbnail as `placeholder` while
  the full image streams in, then swaps — tap feels instant, full-res downloads
  only when actually viewed.

## Data flow

```
Grid / feed / avatars → AppImage(thumbnail transform URL)   [small, cached]
        │ user taps a preview
        ▼
Viewer opens → sign FULL url on demand → AppImage(full)      [full download only here]
              (cached thumbnail shown as placeholder meanwhile)
```

## Out of scope

- **Capping uploaded originals** (e.g. `expo-image-manipulator` max ~2048px).
  Deferred to a later, independent follow-up. Noted because transforms are billed
  per origin image, so smaller originals reduce first-transform cost.
- No database migrations (sizes are URL-time params, not stored variants).

## Testing

- Unit: `imageTransform` helper (preset sizing, pixel-ratio scaling, caps,
  `TRANSFORMS_ENABLED=false` fallback to plain URL).
- Unit: per-photo thumbnail signing helper and lazy full-res signing.
- Manual device QA: grid/feed/avatar visual quality at reduced size; viewer
  placeholder→full swap; offline behavior; behavior with transforms
  disabled/Pro plan absent.

## Risks

- **Pro plan dependency** — verify Metis Labs is on Supabase Pro / transforms
  enabled. `TRANSFORMS_ENABLED` fallback mitigates a hard failure.
- More signing requests for round photos (per-photo vs one batch), offset by far
  smaller payloads and caching. Parallelize to limit latency.
- `PlayerAvatar` needs access to the storage path or a derivable public URL to
  transform — resolved in the implementation plan.
