import { __signThumbForTest } from './queries';

// Prefixed with `mock` so babel-plugin-jest-hoist allows the reference inside
// the hoisted jest.mock factory (repo convention, see useAvatarUpload.test.tsx).
const mockCreateSignedUrl = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({ createSignedUrl: (...a: unknown[]) => mockCreateSignedUrl(...a) }),
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
});
