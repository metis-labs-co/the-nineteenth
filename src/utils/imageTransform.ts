import { PixelRatio } from 'react-native';

/**
 * Subset of @supabase/storage-js `TransformOptions` used here. We declare it
 * locally because storage-js is only a transitive dependency (via
 * @supabase/supabase-js) and is not hoisted under pnpm, so a bare
 * `@supabase/storage-js` / `@supabase/supabase-js` import does not resolve the
 * type from app code. Mirrors the upstream fields we rely on.
 */
type TransformOptions = {
  width?: number;
  height?: number;
  resize?: 'cover' | 'contain' | 'fill';
  quality?: number;
};

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
