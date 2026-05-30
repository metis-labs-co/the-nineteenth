# Image Optimization Implementation Plan

## Overview

Serve reduced-size images for thumbnails/previews and only download the
full-resolution image when a preview is tapped in the round photos viewer. Uses
Supabase on-the-fly image transforms (no DB changes, no backfill) and adopts
`expo-image` for caching and smooth placeholder→full transitions.

## Current State

- `expo-image-picker` (~17.0.10) compresses at `quality: 0.6` on pick — no resizing.
- All rendering uses RN `Image` / Paper `Avatar.Image` at full resolution:
  - `RoundPhotoAlbum` (100px grid), `RoundPhotoViewer` (full screen),
    `RoundPhotoBanner` (cover), `HomeActivityHeroCard` (46px), `PlayerAvatar` (26–64px).
- Round photos: private `round-photos` bucket, batch-signed full-size URLs via
  `createSignedUrls` in `useRoundPhotos` and `useHomeActivityPreview`.
- Avatars: public `avatars` bucket; `players.photo_url` stores the full public URL
  from `getPublicUrl`.

## Desired End State

- Thumbnails/previews/avatars load small transformed images.
- Full-res round photo loads only when its thumbnail is tapped (viewer), with the
  cached thumbnail shown as a placeholder during load.
- A single `TRANSFORMS_ENABLED` flag cleanly falls back to plain URLs if Supabase
  transforms are unavailable (non-Pro plan), keeping the app functional.

### Key Discoveries

- `@supabase/storage-js` 2.80.0: `createSignedUrl` (singular) and `getPublicUrl`
  support `{ transform }`; **`createSignedUrls` (batch) does NOT** — download-only
  (`.../dist/main/packages/StorageFileApi.d.ts:139,158,210`).
- `TransformOptions`: `width`, `height`, `resize: 'cover'|'contain'|'fill'`,
  `quality: 20–100`, `format: 'origin'` (`.../lib/types.d.ts:184`).
- Transforms are baked into the signed URL signature — cannot append `?width=` to
  an already-signed URL. Private previews must be signed per-photo at target size.
- Avatar public URLs can be transformed by string rewrite:
  `/storage/v1/object/public/` → `/storage/v1/render/image/public/` + query params.
  No storage path or client call needed (`src/hooks/auth/useAvatarUpload.ts:74`).
- Supabase image transform endpoint requires the **Pro plan** (billed per origin image).

## What We're NOT Doing

- Not capping uploaded originals (e.g. `expo-image-manipulator` max ~2048px) —
  deferred to a separate follow-up.
- No database migrations or stored thumbnail variants.
- Not changing the picker `quality: 0.6` behavior.
- Not migrating unrelated `Image` usages outside the listed surfaces.

## Implementation Approach

Build foundations first (transform helper + `AppImage`), then apply per surface
from simplest (avatars, public, no signing) to most involved (round photo
viewer lazy full-res). Each phase leaves the app working.

---

## Phase 1: Foundations — transform helper + AppImage

### Overview
Add `expo-image`, a transform-URL utility with presets and a kill-switch, and a
shared `AppImage` wrapper. No surfaces change behavior yet.

### Changes Required

#### 1. Add dependency
**Command**: `pnpm add expo-image` (use Expo SDK 54-compatible version via
`npx expo install expo-image`).

#### 2. Transform utility
**File**: `src/utils/imageTransform.ts` (new)
**Changes**: Presets, flag, and two builders.

```typescript
import { PixelRatio } from 'react-native';
import type { TransformOptions } from '@supabase/storage-js';

// Single source of truth. Flip to false if Supabase transforms are unavailable.
export const TRANSFORMS_ENABLED = true;

// Max edge (logical px) per preset; actual request scales by pixel ratio, capped.
export const IMAGE_PRESETS = {
  AVATAR_SM: 64,
  THUMB: 200,
  COVER: 600,
} as const;

export type ImagePreset = keyof typeof IMAGE_PRESETS;

const DEFAULT_QUALITY = 70;

/** Build TransformOptions for a preset sized to a display size. */
export function buildTransform(
  preset: ImagePreset,
  opts?: { resize?: TransformOptions['resize']; quality?: number }
): TransformOptions | undefined {
  if (!TRANSFORMS_ENABLED) return undefined;
  const max = IMAGE_PRESETS[preset];
  const px = Math.min(Math.round(max * PixelRatio.get()), max * 3);
  return {
    width: px,
    height: px,
    resize: opts?.resize ?? 'cover',
    quality: opts?.quality ?? DEFAULT_QUALITY,
  };
}

/**
 * Rewrite a Supabase public object URL to a transformed render URL.
 * Returns the original URL unchanged if transforms are disabled or the URL is
 * not a recognized public object URL (e.g. bundled "avatar:" ids handled upstream).
 */
export function transformPublicUrl(url: string, preset: ImagePreset): string {
  if (!TRANSFORMS_ENABLED) return url;
  const marker = '/storage/v1/object/public/';
  if (!url.includes(marker)) return url;
  const t = buildTransform(preset);
  if (!t) return url;
  const base = url.replace(marker, '/storage/v1/render/image/public/');
  const params = new URLSearchParams();
  if (t.width) params.set('width', String(t.width));
  if (t.height) params.set('height', String(t.height));
  if (t.resize) params.set('resize', t.resize);
  if (t.quality) params.set('quality', String(t.quality));
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}${params.toString()}`;
}
```

#### 3. AppImage wrapper
**File**: `src/components/common/AppImage.tsx` (new)
**Changes**: Thin wrapper over `expo-image`'s `Image` with caching + transition.

```typescript
import React from 'react';
import { StyleProp, ImageStyle } from 'react-native';
import { Image, type ImageContentFit } from 'expo-image';

export interface AppImageProps {
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  placeholder?: string | null;
  recyclingKey?: string;
  transition?: number;
  accessibilityLabel?: string;
}

export function AppImage({
  uri, style, contentFit = 'cover', placeholder, recyclingKey,
  transition = 200, accessibilityLabel,
}: AppImageProps) {
  return (
    <Image
      source={uri ? { uri } : undefined}
      placeholder={placeholder ? { uri: placeholder } : undefined}
      style={style}
      contentFit={contentFit}
      transition={transition}
      recyclingKey={recyclingKey}
      cachePolicy="memory-disk"
      accessibilityLabel={accessibilityLabel}
    />
  );
}
```

**File**: `src/components/common/index.ts`
**Changes**: Export `AppImage`.

### Success Criteria

#### Automated Verification:
- [ ] Type check passes: `pnpm type-check`
- [ ] Lint passes: `pnpm lint`
- [ ] `expo-image` resolves at an SDK 54-compatible version: `pnpm why expo-image`

#### Manual Verification:
- [ ] App boots in Expo Go / dev build with no missing-module errors.

---

## Phase 2: Avatars (public bucket)

### Overview
Render avatars at display size via transformed public URLs. No signing, applies to
all existing avatars immediately.

### Changes Required

#### 1. PlayerAvatar uses transformed URL + AppImage
**File**: `src/components/common/PlayerAvatar.tsx`
**Changes**: For the remote-URL case (line ~74), replace Paper `Avatar.Image` with
`AppImage` and pass `transformPublicUrl(photoUrl, 'AVATAR_SM')`. Keep the circular
container; set `AppImage` style to fill and `contentFit="cover"`. Bundled `avatar:`
ids and null fallback paths unchanged.

```typescript
// Case 2: Remote URL
if (photoUrl) {
  return (
    <AppImage
      uri={transformPublicUrl(photoUrl, 'AVATAR_SM')}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      contentFit="cover"
      accessibilityLabel={accessibilityLabel}
    />
  );
}
```

### Success Criteria

#### Automated Verification:
- [ ] Type check passes: `pnpm type-check`
- [ ] Lint passes: `pnpm lint`
- [ ] Existing PlayerAvatar tests pass: `pnpm test PlayerAvatar`

#### Manual Verification:
- [ ] Avatars render correctly at 26px (feed), 32px (hero stack), 64px (profile).
- [ ] No visible quality loss; network shows render/image URLs, not full objects.
- [ ] With `TRANSFORMS_ENABLED = false`, avatars still load (plain URL).

---

## Phase 3: Round photo thumbnails (private bucket)

### Overview
Sign thumbnail-sized URLs per photo for grid/feed/banner; stop fetching full-res
in the album query. Add a reusable per-photo signing helper.

### Changes Required

#### 1. Per-photo thumbnail signing helper
**File**: `src/hooks/activity/queries.ts`
**Changes**: Add a helper that signs each path at a transform preset in parallel.

```typescript
import { buildTransform, type ImagePreset } from '@/utils/imageTransform';

async function signThumb(
  paths: string[],
  preset: ImagePreset
): Promise<Map<string, string>> {
  const transform = buildTransform(preset);
  const entries = await Promise.all(
    paths.map(async (path) => {
      const { data } = await sb.storage
        .from('round-photos')
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, transform ? { transform } : undefined);
      return [path, data?.signedUrl ?? null] as const;
    })
  );
  const map = new Map<string, string>();
  for (const [p, u] of entries) if (u) map.set(p, u);
  return map;
}
```

#### 2. useRoundPhotos returns thumbnail URLs
**File**: `src/hooks/activity/queries.ts` (`useRoundPhotos`, lines 172–211)
**Changes**: Replace the batch `createSignedUrls` call with `signThumb(paths, 'THUMB')`.
`RoundPhoto.url` now holds the thumbnail URL. (Full-res signed lazily in Phase 4.)

#### 3. useHomeActivityPreview cover thumbnails
**File**: `src/hooks/activity/queries.ts` (`useHomeActivityPreview`, lines 62–103)
**Changes**: Replace batch `createSignedUrls` for cover paths with
`signThumb(coverPaths, 'COVER')`.

#### 4. Banner + hero + album render via AppImage
**Files**:
- `src/components/activity/RoundPhotoBanner.tsx` (RN `Image` line ~43 → `AppImage`,
  `contentFit="cover"`).
- `src/components/activity/RoundPhotoAlbum.tsx` (RN `Image` line 122 → `AppImage`).
- `src/screens/home/components/HomeActivityHeroCard.tsx` (thumbnail RN `Image` →
  `AppImage`).
**Changes**: Swap component; thumbnails now point at thumbnail-sized URLs from the
hooks above.

### Success Criteria

#### Automated Verification:
- [ ] Type check passes: `pnpm type-check`
- [ ] Lint passes: `pnpm lint`
- [ ] Activity query tests pass: `pnpm test activity`

#### Manual Verification:
- [ ] Round photos grid, home hero thumbnail, and feed banner load small images
      (network payloads in tens of KB, not MB).
- [ ] Images render sharply at their display sizes.
- [ ] With `TRANSFORMS_ENABLED = false`, all thumbnails still load (full URL).

---

## Phase 4: Lazy full-res in the viewer

### Overview
Generate full-res signed URLs only when a thumbnail is tapped; show the cached
thumbnail as a placeholder while the full image streams in.

### Changes Required

#### 1. On-demand full-res signing
**File**: `src/hooks/activity/queries.ts`
**Changes**: Export a helper to sign full-res (no transform) for given paths.

```typescript
export async function signFullPhotos(paths: string[]): Promise<Map<string, string>> {
  const { data } = await sb.storage
    .from('round-photos')
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS); // full-size, batch OK here
  const map = new Map<string, string>();
  for (const s of data ?? []) if (s.path && s.signedUrl) map.set(s.path, s.signedUrl);
  return map;
}
```

#### 2. Viewer signs full-res on open, thumbnail as placeholder
**File**: `src/components/activity/RoundPhotoViewer.tsx`
**Changes**: Extend `RoundPhotoViewerPhoto` to carry `storagePath` and `thumbUrl`.
On open / index change, sign the current photo + immediate neighbors via
`signFullPhotos` (cache in component state by path). Render `AppImage` with
`contentFit="contain"`, `uri = fullUrl ?? thumbUrl`, `placeholder = thumbUrl`.

```typescript
export interface RoundPhotoViewerPhoto {
  id: string;
  storagePath: string;
  thumbUrl: string | null;
}
```

#### 3. Update callers to pass storagePath + thumbUrl
**Files**:
- `src/components/activity/RoundPhotoAlbum.tsx` (build `viewable` from
  `{ id, storagePath: photo.storage_path, thumbUrl: photo.url }`).
- `src/components/activity/RoundPhotoBanner.tsx` (thread `storagePath` through
  `RoundPhotoBannerPhoto`; its callers supply it from `FeedPhoto.storage_path`).

### Success Criteria

#### Automated Verification:
- [ ] Type check passes: `pnpm type-check`
- [ ] Lint passes: `pnpm lint`
- [ ] Tests pass: `pnpm test activity`

#### Manual Verification:
- [ ] Tapping a thumbnail shows it instantly (placeholder), then sharpens to full-res.
- [ ] Network confirms full-res is fetched only on viewer open, only for viewed photos.
- [ ] Swiping signs/loads neighbors without a full re-fetch of the album.
- [ ] Viewer works offline for already-cached photos; degrades gracefully otherwise.

---

## Phase 5: Cleanup & verification

### Overview
Remove now-dead code and confirm no full-res leaks remain.

### Changes Required
- Remove unused full-size batch signing left in `useRoundPhotos`/preview if any.
- Grep for remaining RN `Image`/`Avatar.Image` in the five target surfaces; ensure
  they route through `AppImage`.
- Confirm `cover_photo_url`/`url` fields still type-check across `types.ts` usages.

### Success Criteria

#### Automated Verification:
- [ ] `pnpm type-check`, `pnpm lint`, `pnpm test` all pass.
- [ ] No RN `Image` import remains in the five target files:
      `grep -rl "from 'react-native'" <files>` reviewed for `Image` usage.

#### Manual Verification:
- [ ] Full app smoke: home, feed, round detail, album, viewer, profile — all images load.

---

## Testing Strategy

### Unit Tests
- `imageTransform`: preset sizing scales by pixel ratio and respects caps;
  `transformPublicUrl` rewrites object→render URLs and appends params; both return
  plain URL when `TRANSFORMS_ENABLED = false` or URL unrecognized.
- `signThumb` / `signFullPhotos`: map building, null handling (mock storage client).

### Integration Tests
- `useRoundPhotos` / `useHomeActivityPreview` return thumbnail URLs (mock storage).

### Manual Testing Steps
1. Pro plan ON: verify thumbnails small, viewer full-res on tap, placeholder swap.
2. Set `TRANSFORMS_ENABLED = false`: verify all surfaces still load (plain URLs).
3. Throttle network: confirm thumbnails load fast, viewer placeholder→full visible.
4. Offline: cached images render; uncached degrade gracefully.

## Performance Considerations

- Per-photo signing replaces one batch call (more requests) but payloads shrink
  from MBs to tens of KB; parallelized with `Promise.all`.
- `expo-image` memory-disk cache avoids re-downloads across re-signs and navigation.

## Migration Notes

- No data migration. Works on all existing images via URL-time transforms.
- **Pre-req:** confirm Supabase Pro plan / image transforms enabled for both
  projects. If not, ship with `TRANSFORMS_ENABLED = false` (still adopts AppImage
  caching) and flip on once Pro is active.

## References

- Design spec: `docs/superpowers/specs/2026-05-30-image-optimization-design.md`
- storage-js types: `node_modules/.pnpm/@supabase+storage-js@2.80.0/.../StorageFileApi.d.ts`
