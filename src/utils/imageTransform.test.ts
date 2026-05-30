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
