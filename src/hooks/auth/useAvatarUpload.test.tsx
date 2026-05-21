import { renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAvatarUpload, avatarPathFromPublicUrl } from './useAvatarUpload';

const PUBLIC_BASE = 'https://proj.supabase.co/storage/v1/object/public/avatars/';

const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();
const mockRemove = jest.fn();

jest.mock('@/services/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: (...a: unknown[]) => mockUpload(...a),
        getPublicUrl: (...a: unknown[]) => mockGetPublicUrl(...a),
        remove: (...a: unknown[]) => mockRemove(...a),
      }),
    },
  },
}));

let mockUser: { id: string } | null = { id: 'user-1' };
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock('expo-crypto', () => ({ randomUUID: () => 'uuid-123' }));

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('avatarPathFromPublicUrl', () => {
  it('extracts the in-bucket path from a public avatars URL', () => {
    expect(avatarPathFromPublicUrl(`${PUBLIC_BASE}user-1/old.jpg`)).toBe('user-1/old.jpg');
  });

  it('returns null for non-avatars URLs, avatar ids, and null', () => {
    expect(avatarPathFromPublicUrl('avatar:avatar-blue')).toBeNull();
    expect(avatarPathFromPublicUrl('https://example.com/x.png')).toBeNull();
    expect(avatarPathFromPublicUrl(null)).toBeNull();
  });
});

describe('useAvatarUpload', () => {
  beforeEach(() => {
    mockUpload.mockReset().mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReset().mockReturnValue({ data: { publicUrl: `${PUBLIC_BASE}user-1/uuid-123.jpg` } });
    mockRemove.mockReset().mockResolvedValue({ error: null });
    global.fetch = jest.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }) as unknown as typeof fetch;
    mockUser = { id: 'user-1' };
  });

  it('uploads to the user folder and returns the public URL', async () => {
    const { result } = renderHook(() => useAvatarUpload(), { wrapper: makeWrapper() });

    const url = await result.current.mutateAsync({ uri: 'file:///tmp/a.jpg', ext: 'jpg', mimeType: 'image/jpeg' });

    expect(mockUpload).toHaveBeenCalledWith(
      'user-1/uuid-123.jpg',
      expect.any(ArrayBuffer),
      { contentType: 'image/jpeg', upsert: false }
    );
    expect(url).toBe(`${PUBLIC_BASE}user-1/uuid-123.jpg`);
  });

  it('best-effort deletes a previous uploaded avatar in the user folder', async () => {
    const { result } = renderHook(() => useAvatarUpload(), { wrapper: makeWrapper() });

    await result.current.mutateAsync({
      uri: 'file:///tmp/a.jpg',
      ext: 'jpg',
      previousPhotoUrl: `${PUBLIC_BASE}user-1/old.jpg`,
    });

    expect(mockRemove).toHaveBeenCalledWith(['user-1/old.jpg']);
  });

  it('does not delete preset avatars or other users\' files', async () => {
    const { result } = renderHook(() => useAvatarUpload(), { wrapper: makeWrapper() });

    await result.current.mutateAsync({ uri: 'file:///tmp/a.jpg', ext: 'jpg', previousPhotoUrl: 'avatar:avatar-blue' });
    await result.current.mutateAsync({ uri: 'file:///tmp/a.jpg', ext: 'jpg', previousPhotoUrl: `${PUBLIC_BASE}user-2/x.jpg` });

    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('throws when the upload fails', async () => {
    mockUpload.mockResolvedValue({ error: { message: 'boom' } });
    const { result } = renderHook(() => useAvatarUpload(), { wrapper: makeWrapper() });

    await expect(
      result.current.mutateAsync({ uri: 'file:///tmp/a.jpg', ext: 'jpg' })
    ).rejects.toThrow(/Failed to upload photo/);
  });

  it('throws an AUTH error when no user is signed in', async () => {
    mockUser = null;
    const { result } = renderHook(() => useAvatarUpload(), { wrapper: makeWrapper() });

    await expect(
      result.current.mutateAsync({ uri: 'file:///tmp/a.jpg', ext: 'jpg' })
    ).rejects.toThrow(/signed in/i);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('throws a typed error when reading the local file fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('file gone'));
    const { result } = renderHook(() => useAvatarUpload(), { wrapper: makeWrapper() });

    await expect(
      result.current.mutateAsync({ uri: 'file:///tmp/a.jpg', ext: 'jpg' })
    ).rejects.toThrow(/Failed to read photo file/);
  });
});
