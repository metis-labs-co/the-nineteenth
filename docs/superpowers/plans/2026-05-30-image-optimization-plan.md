# Image Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve small transformed images for thumbnails/previews/avatars and download the full-resolution round photo only when its preview is tapped.

**Architecture:** Use Supabase on-the-fly image transforms (no DB changes, no backfill) sized per display surface, plus `expo-image` (via a shared `AppImage` wrapper) for caching and placeholder→full transitions. A single `TRANSFORMS_ENABLED` flag falls back to plain URLs if transforms are unavailable (non-Pro plan).

**Tech Stack:** React Native (Expo SDK 54), TypeScript, `expo-image`, `@supabase/storage-js` 2.80.0, TanStack Query, Jest.

---

## Background for the implementer

- **Round photos** live in the **private** `round-photos` bucket. URLs must be
  signed. The current code batch-signs full-size URLs in
  `src/hooks/activity/queries.ts` (`useRoundPhotos` lines 172–211,
  `useHomeActivityPreview` lines 62–103).
- **Avatars** live in the **public** `avatars` bucket. `players.photo_url` stores
  the full public URL produced by `getPublicUrl` (`src/hooks/auth/useAvatarUpload.ts:74`).
- **Critical storage-js constraint** (verified in
  `node_modules/.pnpm/@supabase+storage-js@2.80.0/node_modules/@supabase/storage-js/dist/main/packages/StorageFileApi.d.ts`):
  - `createSignedUrl(path, ttl, { transform })` — singular — **supports** transforms (line 139).
  - `createSignedUrls(paths, ttl, { download })` — batch — **does NOT** support transforms (line 158).
  - `getPublicUrl(path, { transform })` — supports transforms (line 210).
  - Transforms are baked into the signed URL's signature; you cannot append
    `?width=` to an already-signed URL. So private previews are signed **per-photo**
    at the target size with singular `createSignedUrl` (parallelized).
- `TransformOptions` fields: `width`, `height`, `resize: 'cover'|'contain'|'fill'`,
  `quality: 20–100`, `format: 'origin'`.
- **Test runner:** `pnpm test <pattern>`. Type check: `pnpm type-check`. Lint: `pnpm lint`.
- Existing avatar test: `src/hooks/auth/useAvatarUpload.test.tsx` (reference for mocking the storage client).

---

## File Structure

- Create: `src/utils/imageTransform.ts` — presets, `TRANSFORMS_ENABLED` flag, transform builders.
- Create: `src/utils/imageTransform.test.ts` — unit tests for the helpers.
- Create: `src/components/common/AppImage.tsx` — `expo-image` wrapper.
- Modify: `src/components/common/index.ts` — export `AppImage`.
- Modify: `src/components/common/PlayerAvatar.tsx` — transformed avatar URL + `AppImage`.
- Modify: `src/hooks/activity/queries.ts` — per-photo thumbnail signing + lazy full-res helper.
- Modify: `src/hooks/activity/queries.test.ts` (create if absent) — signing helper tests.
- Modify: `src/components/activity/RoundPhotoAlbum.tsx` — `AppImage`, pass storagePath/thumbUrl to viewer.
- Modify: `src/components/activity/RoundPhotoBanner.tsx` — `AppImage`, thread storagePath.
- Modify: `src/components/activity/RoundPhotoViewer.tsx` — lazy full-res, thumbnail placeholder.
- Modify: `src/screens/home/components/HomeActivityHeroCard.tsx` — `AppImage` for the 46px thumb.

---

## Task 1: Add expo-image dependency

**Files:**
- Modify: `package.json` (via installer)

- [ ] **Step 1: Install expo-image at an SDK-54-compatible version**

Run: `npx expo install expo-image`
Expected: `package.json` gains an `expo-image` entry; install completes without peer-dep errors.

- [ ] **Step 2: Verify resolution**

Run: `pnpm why expo-image`
Expected: a single resolved version listed.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add expo-image dependency"
```

---

## Task 2: imageTransform utility (TDD)

**Files:**
- Create: `src/utils/imageTransform.ts`
- Test: `src/utils/imageTransform.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/utils/imageTransform.test.ts
import { buildTransform, transformPublicUrl, IMAGE_PRESETS } from './imageTransform';

// PixelRatio.get() defaults to 1 (or 2) under jest-expo; assert on ratios, not absolutes.
describe('buildTransform', () => {
  it('returns width/height/quality/resize for a preset', () => {
    const t = buildTransform('THUMB');
    expect(t).toBeDefined();
    expect(t!.resize).toBe('cover');
    expect(t!.quality).toBeGreaterThanOrEqual(20);
    expect(t!.quality).toBeLessThanOrEqual(100);
    expect(t!.width).toBeGreaterThan(0);
    expect(t!.width).toBeLessThanOrEqual(IMAGE_PRESETS.THUMB * 3);
  });

  it('honours resize/quality overrides', () => {
    const t = buildTransform('COVER', { resize: 'contain', quality: 50 });
    expect(t!.resize).toBe('contain');
    expect(t!.quality).toBe(50);
  });
});

describe('transformPublicUrl', () => {
  const publicUrl =
    'https://proj.supabase.co/storage/v1/object/public/avatars/u1/abc.jpg';

  it('rewrites object URL to render URL with params', () => {
    const out = transformPublicUrl(publicUrl, 'AVATAR_SM');
    expect(out).toContain('/storage/v1/render/image/public/avatars/u1/abc.jpg');
    expect(out).toContain('width=');
    expect(out).toContain('quality=');
  });

  it('leaves unrecognized URLs unchanged', () => {
    expect(transformPublicUrl('avatar:avatar-blue', 'AVATAR_SM')).toBe('avatar:avatar-blue');
    expect(transformPublicUrl('https://x.test/y.png', 'AVATAR_SM')).toBe('https://x.test/y.png');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test imageTransform`
Expected: FAIL — `Cannot find module './imageTransform'`.

- [ ] **Step 3: Write the implementation**

```typescript
// src/utils/imageTransform.ts
import { PixelRatio } from 'react-native';
import type { TransformOptions } from '@supabase/storage-js';

/**
 * Single source of truth for image transforms. Supabase image transformations
 * require the Pro plan; set to false to fall back to plain (untransformed) URLs.
 */
export const TRANSFORMS_ENABLED = true;

/** Max edge in logical px per preset. Requests scale by pixel ratio, capped at 3x. */
export const IMAGE_PRESETS = {
  AVATAR_SM: 64,
  THUMB: 200,
  COVER: 600,
} as const;

export type ImagePreset = keyof typeof IMAGE_PRESETS;

const DEFAULT_QUALITY = 70;

/** Build TransformOptions for a preset, sized for the current pixel ratio. */
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
 * Returns the input unchanged when transforms are disabled or the URL is not a
 * recognized public object URL (e.g. bundled "avatar:" ids).
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

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test imageTransform`
Expected: PASS.

- [ ] **Step 5: Type check + commit**

```bash
pnpm type-check
git add src/utils/imageTransform.ts src/utils/imageTransform.test.ts
git commit -m "feat: image transform url helper with presets and kill switch"
```

---

## Task 3: AppImage wrapper

**Files:**
- Create: `src/components/common/AppImage.tsx`
- Modify: `src/components/common/index.ts`

- [ ] **Step 1: Write AppImage**

```typescript
// src/components/common/AppImage.tsx
import React from 'react';
import { StyleProp, ImageStyle } from 'react-native';
import { Image, type ImageContentFit } from 'expo-image';

export interface AppImageProps {
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  /** Low-res placeholder URI shown while the main image loads. */
  placeholder?: string | null;
  recyclingKey?: string;
  transition?: number;
  accessibilityLabel?: string;
}

/** Shared image renderer: disk+memory cache and fade-in via expo-image. */
export function AppImage({
  uri,
  style,
  contentFit = 'cover',
  placeholder,
  recyclingKey,
  transition = 200,
  accessibilityLabel,
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

- [ ] **Step 2: Export from the common barrel**

In `src/components/common/index.ts`, add:

```typescript
export { AppImage } from './AppImage';
export type { AppImageProps } from './AppImage';
```

- [ ] **Step 3: Type check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/common/AppImage.tsx src/components/common/index.ts
git commit -m "feat: AppImage wrapper over expo-image"
```

---

## Task 4: Avatars use transformed URLs (TDD)

**Files:**
- Modify: `src/components/common/PlayerAvatar.tsx`
- Test: `src/components/common/PlayerAvatar.test.tsx` (extend existing if present, else create)

- [ ] **Step 1: Write/extend the failing test**

```typescript
// src/components/common/PlayerAvatar.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { PlayerAvatar } from './PlayerAvatar';

jest.mock('./AppImage', () => ({
  AppImage: ({ uri, accessibilityLabel }: { uri?: string; accessibilityLabel?: string }) => {
    const { Text } = require('react-native');
    return <Text accessibilityLabel={accessibilityLabel}>{uri}</Text>;
  },
}));

describe('PlayerAvatar remote photo', () => {
  it('renders a transformed render URL for a public avatar', () => {
    const url = 'https://proj.supabase.co/storage/v1/object/public/avatars/u1/a.jpg';
    const { getByText } = render(<PlayerAvatar photoUrl={url} name="Sam" size={28} />);
    // transformed URL contains the render path
    getByText(/render\/image\/public\/avatars\/u1\/a\.jpg/);
  });

  it('renders bundled avatar without an image', () => {
    const { queryByText } = render(<PlayerAvatar photoUrl="avatar:avatar-blue" size={28} />);
    expect(queryByText(/render\/image/)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test PlayerAvatar`
Expected: FAIL — still rendering Paper `Avatar.Image`, no render URL text.

- [ ] **Step 3: Update PlayerAvatar**

Replace the imports and the "Case 2: Remote URL" branch.

Add imports near the top:

```typescript
import { AppImage } from './AppImage';
import { transformPublicUrl } from '@/utils/imageTransform';
```

Remove the `Avatar` import from `react-native-paper` if no longer used. Replace the
remote-URL branch (currently lines ~74–83) with:

```typescript
    // Case 2: Remote URL
    if (photoUrl) {
      return (
        <AppImage
          uri={transformPublicUrl(photoUrl, 'AVATAR_SM')}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
          accessibilityLabel={accessibilityLabel}
          testID="avatar-image"
        />
      );
    }
```

If `testID` is not part of `AppImageProps`, drop it here (the existing test that
referenced `avatar-image` may need updating to query by the rendered URL instead).
Keep the surrounding circular container `View` unchanged.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test PlayerAvatar`
Expected: PASS.

- [ ] **Step 5: Type check + commit**

```bash
pnpm type-check
git add src/components/common/PlayerAvatar.tsx src/components/common/PlayerAvatar.test.tsx
git commit -m "feat: render avatars at display size via transformed urls"
```

---

## Task 5: Per-photo thumbnail signing helper (TDD)

**Files:**
- Modify: `src/hooks/activity/queries.ts`
- Test: `src/hooks/activity/queries.test.ts` (create if absent)

- [ ] **Step 1: Write the failing test**

```typescript
// src/hooks/activity/queries.test.ts
import { __signThumbForTest } from './queries';

const createSignedUrl = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    storage: { from: () => ({ createSignedUrl: (...a: unknown[]) => createSignedUrl(...a) }) },
  },
}));

describe('signThumb', () => {
  beforeEach(() => createSignedUrl.mockReset());

  it('signs each path and maps path -> signed url', async () => {
    createSignedUrl
      .mockResolvedValueOnce({ data: { signedUrl: 'https://s/1?thumb' }, error: null })
      .mockResolvedValueOnce({ data: { signedUrl: 'https://s/2?thumb' }, error: null });
    const map = await __signThumbForTest(['a/1.jpg', 'a/2.jpg'], 'THUMB');
    expect(map.get('a/1.jpg')).toBe('https://s/1?thumb');
    expect(map.get('a/2.jpg')).toBe('https://s/2?thumb');
    expect(createSignedUrl).toHaveBeenCalledTimes(2);
  });

  it('omits paths whose signing failed', async () => {
    createSignedUrl.mockResolvedValueOnce({ data: null, error: { message: 'x' } });
    const map = await __signThumbForTest(['a/1.jpg'], 'THUMB');
    expect(map.has('a/1.jpg')).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test activity/queries`
Expected: FAIL — `__signThumbForTest` not exported.

- [ ] **Step 3: Implement the helper**

In `src/hooks/activity/queries.ts`, add the import and helper (near the top, after
existing imports):

```typescript
import { buildTransform, type ImagePreset } from '@/utils/imageTransform';

/** Sign each path at a transform preset size (parallel). path -> signed url. */
async function signThumb(
  paths: string[],
  preset: ImagePreset
): Promise<Map<string, string>> {
  const transform = buildTransform(preset);
  const entries = await Promise.all(
    paths.map(async (path) => {
      const { data } = await sb.storage
        .from('round-photos')
        .createSignedUrl(
          path,
          SIGNED_URL_TTL_SECONDS,
          transform ? { transform } : undefined
        );
      return [path, data?.signedUrl ?? null] as const;
    })
  );
  const map = new Map<string, string>();
  for (const [p, u] of entries) if (u) map.set(p, u);
  return map;
}

/** Test-only export. */
export const __signThumbForTest = signThumb;
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test activity/queries`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/activity/queries.ts src/hooks/activity/queries.test.ts
git commit -m "feat: per-photo thumbnail signing helper for round photos"
```

---

## Task 6: useRoundPhotos + useHomeActivityPreview serve thumbnails

**Files:**
- Modify: `src/hooks/activity/queries.ts`

- [ ] **Step 1: Update useRoundPhotos to sign thumbnails**

Replace the batch signing block (lines ~190–202) with:

```typescript
      const urlByPath = await signThumb(
        rows.map((r) => r.storage_path),
        'THUMB'
      );

      return rows.map(
        (r): RoundPhoto => ({ ...r, url: urlByPath.get(r.storage_path) ?? null })
      );
```

Remove the now-unused `createSignedUrls` call and its `signError` handling in this
function.

- [ ] **Step 2: Update useHomeActivityPreview cover signing**

Replace the cover-signing block (lines ~81–90) with:

```typescript
      const urlByPath =
        coverPaths.length > 0 ? await signThumb(coverPaths, 'COVER') : new Map<string, string>();
```

Leave the subsequent `cards.map(...)` that reads `urlByPath.get(coverPath)` intact.

- [ ] **Step 3: Type check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 4: Run activity tests**

Run: `pnpm test activity`
Expected: PASS (existing + new).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/activity/queries.ts
git commit -m "feat: serve thumbnail-sized urls for round photo album and home preview"
```

---

## Task 7: Render thumbnails via AppImage (grid, banner, hero)

**Files:**
- Modify: `src/components/activity/RoundPhotoAlbum.tsx`
- Modify: `src/components/activity/RoundPhotoBanner.tsx`
- Modify: `src/screens/home/components/HomeActivityHeroCard.tsx`

- [ ] **Step 1: RoundPhotoAlbum grid uses AppImage**

In `src/components/activity/RoundPhotoAlbum.tsx`:
- Remove `Image` from the `react-native` import (line 10).
- Add `import { AppImage } from '@/components/common';` (merge with existing
  `@/components/common` import on line 15).
- Replace the thumbnail render (line 122):

```typescript
                {photo.url ? (
                  <AppImage uri={photo.url} style={styles.thumbImage} contentFit="cover" />
                ) : (
                  <Icon source="image-off-outline" size={24} color={colors.textSecondary} />
                )}
```

- [ ] **Step 2: RoundPhotoBanner uses AppImage**

In `src/components/activity/RoundPhotoBanner.tsx`:
- Remove `Image` from the `react-native` import (line 16).
- Add `AppImage` to the existing import (or `import { AppImage } from '@/components/common';`).
- Replace both `Image` usages (lines 90 and 114) with:

```typescript
            <AppImage uri={items[0].url} style={styles.image} contentFit="cover" />
```

and

```typescript
                <AppImage uri={item.url} style={styles.image} contentFit="cover" />
```

- [ ] **Step 3: HomeActivityHeroCard uses AppImage**

In `src/screens/home/components/HomeActivityHeroCard.tsx`:
- Remove `Image` from the `react-native` import (line 8).
- Add `AppImage` to the existing `@/components/common` import (line 12).
- Replace the cover thumbnail (lines 128–134):

```typescript
        {card.coverPhotoUrl ? (
          <AppImage
            uri={card.coverPhotoUrl}
            style={[styles.thumb, { backgroundColor: colors.surfaceVariant }]}
            contentFit="cover"
            accessibilityLabel="Round photo"
          />
        ) : null}
```

- [ ] **Step 4: Type check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/activity/RoundPhotoAlbum.tsx src/components/activity/RoundPhotoBanner.tsx src/screens/home/components/HomeActivityHeroCard.tsx
git commit -m "feat: render round photo thumbnails through AppImage"
```

---

## Task 8: Lazy full-res signing helper (TDD)

**Files:**
- Modify: `src/hooks/activity/queries.ts`
- Test: `src/hooks/activity/queries.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// add to src/hooks/activity/queries.test.ts
import { signFullPhotos } from './queries';

const createSignedUrls = jest.fn();
// extend the existing mock's `from()` to also expose createSignedUrls:
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        createSignedUrl: (...a: unknown[]) => createSignedUrl(...a),
        createSignedUrls: (...a: unknown[]) => createSignedUrls(...a),
      }),
    },
  },
}));

describe('signFullPhotos', () => {
  beforeEach(() => createSignedUrls.mockReset());

  it('batch-signs full-res urls into a path->url map', async () => {
    createSignedUrls.mockResolvedValueOnce({
      data: [
        { path: 'a/1.jpg', signedUrl: 'https://s/1?full', error: null },
        { path: 'a/2.jpg', signedUrl: 'https://s/2?full', error: null },
      ],
      error: null,
    });
    const map = await signFullPhotos(['a/1.jpg', 'a/2.jpg']);
    expect(map.get('a/1.jpg')).toBe('https://s/1?full');
    expect(map.get('a/2.jpg')).toBe('https://s/2?full');
  });
});
```

Note: the mock declaration must replace the earlier `jest.mock` for the same
module — keep a single mock factory in the file exposing both methods.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test activity/queries`
Expected: FAIL — `signFullPhotos` not exported.

- [ ] **Step 3: Implement signFullPhotos**

In `src/hooks/activity/queries.ts`, add:

```typescript
/** Batch-sign full-resolution urls (no transform). path -> signed url. */
export async function signFullPhotos(paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const { data } = await sb.storage
    .from('round-photos')
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  const map = new Map<string, string>();
  for (const s of data ?? []) if (s.path && s.signedUrl) map.set(s.path, s.signedUrl);
  return map;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test activity/queries`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/activity/queries.ts src/hooks/activity/queries.test.ts
git commit -m "feat: on-demand full-res signing for round photo viewer"
```

---

## Task 9: Viewer loads full-res lazily with thumbnail placeholder

**Files:**
- Modify: `src/components/activity/RoundPhotoViewer.tsx`
- Modify: `src/components/activity/RoundPhotoAlbum.tsx`
- Modify: `src/components/activity/RoundPhotoBanner.tsx`

- [ ] **Step 1: Update RoundPhotoViewer's photo type and rendering**

In `src/components/activity/RoundPhotoViewer.tsx`:

Replace the `RoundPhotoViewerPhoto` interface (lines 24–27) with:

```typescript
export interface RoundPhotoViewerPhoto {
  id: string;
  /** Storage path used to sign the full-resolution url on demand. */
  storagePath: string;
  /** Cached thumbnail url, shown as a placeholder while full-res loads. */
  thumbUrl: string | null;
}
```

Add imports:

```typescript
import { useEffect, useState } from 'react';
import { AppImage, SystemModalTheme } from '@/components/common';
import { signFullPhotos } from '@/hooks/activity';
```

(Remove the standalone `SystemModalTheme` import and the RN `Image` import.)

Inside the component, after computing `visible`, add on-demand signing of the
current photo plus immediate neighbors:

```typescript
  const [fullByPath, setFullByPath] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (index === null) return;
    const want = [index - 1, index, index + 1]
      .filter((i) => i >= 0 && i < photos.length)
      .map((i) => photos[i].storagePath)
      .filter((p) => !fullByPath.has(p));
    if (want.length === 0) return;
    let cancelled = false;
    signFullPhotos(want).then((signed) => {
      if (cancelled) return;
      setFullByPath((prev) => {
        const next = new Map(prev);
        for (const [k, v] of signed) next.set(k, v);
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [index, photos, fullByPath]);
```

Replace the `renderItem` image (line 66) with:

```typescript
                <AppImage
                  uri={fullByPath.get(item.storagePath) ?? item.thumbUrl}
                  placeholder={item.thumbUrl}
                  style={{ width, height }}
                  contentFit="contain"
                  accessibilityLabel="Round photo"
                />
```

- [ ] **Step 2: Update RoundPhotoAlbum's viewable mapping**

In `src/components/activity/RoundPhotoAlbum.tsx`, replace the `viewable` mapping
(lines 86–88) with:

```typescript
  const viewable = items
    .filter((p) => !!p.url)
    .map((p) => ({ id: p.id, storagePath: p.storage_path, thumbUrl: p.url }));
```

The `RoundPhotoViewer` usage already passes `photos={viewable}` and a numeric
`index`; no further change there.

- [ ] **Step 3: Update RoundPhotoBanner's viewer photos**

In `src/components/activity/RoundPhotoBanner.tsx`, the viewer is rendered with
`photos={items}` (line 137). Map items to the new shape:

```typescript
      <RoundPhotoViewer
        photos={items.map((p) => ({ id: p.id, storagePath: p.storage_path, thumbUrl: p.url }))}
        index={viewerIndex}
        onClose={() => setViewerIndex(null)}
      />
```

- [ ] **Step 4: Type check**

Run: `pnpm type-check`
Expected: PASS (viewer consumers now match the new `RoundPhotoViewerPhoto`).

- [ ] **Step 5: Run activity tests**

Run: `pnpm test activity`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/activity/RoundPhotoViewer.tsx src/components/activity/RoundPhotoAlbum.tsx src/components/activity/RoundPhotoBanner.tsx
git commit -m "feat: lazy full-res in round photo viewer with thumbnail placeholder"
```

---

## Task 10: Final verification & cleanup

**Files:**
- Review only (no required edits).

- [ ] **Step 1: Confirm no full-res Image leaks in target surfaces**

Run: `grep -nE "from 'react-native'|<Image" src/components/activity/RoundPhotoAlbum.tsx src/components/activity/RoundPhotoBanner.tsx src/components/activity/RoundPhotoViewer.tsx src/screens/home/components/HomeActivityHeroCard.tsx src/components/common/PlayerAvatar.tsx`
Expected: no `<Image` (RN) usages remain in these files.

- [ ] **Step 2: Full type check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: PASS (no unused `Image`/`Avatar` imports left behind).

- [ ] **Step 4: Full test run**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Manual device QA (checklist)**

- [ ] Avatars render crisply at 26/32/64px; network shows `render/image` URLs.
- [ ] Round photo grid, home hero thumb, feed banner load small payloads.
- [ ] Tapping a thumbnail shows it instantly, then sharpens to full-res.
- [ ] Network confirms full-res fetched only on viewer open, only for viewed photos.
- [ ] Set `TRANSFORMS_ENABLED = false` and confirm every surface still loads (plain URLs); revert.

- [ ] **Step 6: Commit any cleanup**

```bash
git add -A
git commit -m "chore: image optimization cleanup and verification"
```

---

## Pre-requisite / deployment note

Before flipping `TRANSFORMS_ENABLED = true` in production, confirm both Supabase
projects (dev `uoqofjwtdgdzhpwfzklo`, prod `bvnxfhuvocxyilhlenka`) are on the
**Pro plan** with image transformations enabled. If not, ship with
`TRANSFORMS_ENABLED = false` (still gains `expo-image` caching) and flip on once
Pro is active.

## References

- Design spec: `docs/superpowers/specs/2026-05-30-image-optimization-design.md`
- storage-js types: `node_modules/.pnpm/@supabase+storage-js@2.80.0/node_modules/@supabase/storage-js/dist/main/packages/StorageFileApi.d.ts`
