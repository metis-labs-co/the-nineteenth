/**
 * useAvatarUpload - upload a profile photo to the public `avatars` bucket.
 *
 * Uploads a locally-picked image to `avatars/{userId}/{uuid}.{ext}` and returns
 * its public URL. Best-effort deletes the user's previous uploaded avatar so we
 * don't orphan storage objects. Persisting `photo_url` stays with updateProfile.
 */

import { useMutation } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { createError } from '@/services/errors';

const AVATAR_BUCKET = 'avatars';
const PUBLIC_SEGMENT = `/object/public/${AVATAR_BUCKET}/`;

export interface UploadAvatarInput {
  /** Local file URI from expo-image-picker. */
  uri: string;
  /** File extension without the dot, e.g. 'jpg'. */
  ext: string;
  /** MIME type, e.g. 'image/jpeg'. */
  mimeType?: string;
  /** Current photo_url, used to clean up a previously uploaded avatar. */
  previousPhotoUrl?: string | null;
}

/**
 * Extract the in-bucket path from a public avatars URL, else null.
 *
 * Note: this is a substring match on `/object/public/avatars/`, not a strict
 * host check. It is only used for best-effort cleanup of a previous avatar,
 * always behind an owner-folder ownership guard in the caller, so a non-Supabase
 * URL that happens to contain the segment cannot cause a cross-user deletion.
 * @example avatarPathFromPublicUrl('https://x/storage/v1/object/public/avatars/u/a.jpg') => 'u/a.jpg'
 */
export function avatarPathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const idx = url.indexOf(PUBLIC_SEGMENT);
  if (idx === -1) return null;
  return url.slice(idx + PUBLIC_SEGMENT.length);
}

export function useAvatarUpload() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ uri, ext, mimeType, previousPhotoUrl }: UploadAvatarInput): Promise<string> => {
      if (!user?.id) throw createError('You must be signed in to upload a photo', 'AUTH');

      const extension = (ext || 'jpg').toLowerCase();
      const path = `${user.id}/${Crypto.randomUUID()}.${extension}`;

      // Expo: read the local file as an ArrayBuffer for upload. Wrap so a
      // missing/invalidated picker URI surfaces as a typed AppError.
      let arraybuffer: ArrayBuffer;
      try {
        arraybuffer = await fetch(uri).then((res) => res.arrayBuffer());
      } catch (err) {
        throw createError(
          `Failed to read photo file: ${err instanceof Error ? err.message : String(err)}`,
          'NETWORK'
        );
      }

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, arraybuffer, { contentType: mimeType ?? 'image/jpeg', upsert: false });
      if (uploadError) {
        throw createError(`Failed to upload photo: ${uploadError.message}`, 'DATABASE');
      }

      const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);

      // Best-effort cleanup of the previous uploaded avatar (own folder only).
      const previousPath = avatarPathFromPublicUrl(previousPhotoUrl);
      if (previousPath && previousPath.startsWith(`${user.id}/`)) {
        await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
      }

      return data.publicUrl;
    },
  });
}
