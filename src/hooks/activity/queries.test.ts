import { __signThumbForTest, signFullPhotos } from './queries';

// Prefixed with `mock` so babel-plugin-jest-hoist allows the reference inside
// the hoisted jest.mock factory (repo convention, see useAvatarUpload.test.tsx).
const mockCreateSignedUrl = jest.fn();
const mockCreateSignedUrls = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        createSignedUrl: (...a: unknown[]) => mockCreateSignedUrl(...a),
        createSignedUrls: (...a: unknown[]) => mockCreateSignedUrls(...a),
      }),
    },
  },
}));

describe('signThumb', () => {
  beforeEach(() => mockCreateSignedUrl.mockReset());

  it('signs each path and maps path -> signed url', async () => {
    mockCreateSignedUrl
      .mockResolvedValueOnce({ data: { signedUrl: 'https://s/1?thumb' }, error: null })
      .mockResolvedValueOnce({ data: { signedUrl: 'https://s/2?thumb' }, error: null });
    const map = await __signThumbForTest(['a/1.jpg', 'a/2.jpg'], 'THUMB');
    expect(map.get('a/1.jpg')).toBe('https://s/1?thumb');
    expect(map.get('a/2.jpg')).toBe('https://s/2?thumb');
    expect(mockCreateSignedUrl).toHaveBeenCalledTimes(2);
  });

  it('omits paths whose signing failed', async () => {
    mockCreateSignedUrl.mockResolvedValueOnce({ data: null, error: { message: 'x' } });
    const map = await __signThumbForTest(['a/1.jpg'], 'THUMB');
    expect(map.has('a/1.jpg')).toBe(false);
  });

  it('survives a single rejected signing without dropping the rest', async () => {
    mockCreateSignedUrl
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ data: { signedUrl: 'https://s/2?thumb' }, error: null });
    const map = await __signThumbForTest(['a/1.jpg', 'a/2.jpg'], 'THUMB');
    expect(map.has('a/1.jpg')).toBe(false);
    expect(map.get('a/2.jpg')).toBe('https://s/2?thumb');
  });
});

describe('signFullPhotos', () => {
  beforeEach(() => mockCreateSignedUrls.mockReset());

  it('batch-signs full-res urls into a path->url map', async () => {
    mockCreateSignedUrls.mockResolvedValueOnce({
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

  it('returns an empty map for no paths', async () => {
    const map = await signFullPhotos([]);
    expect(map.size).toBe(0);
    expect(mockCreateSignedUrls).not.toHaveBeenCalled();
  });
});
