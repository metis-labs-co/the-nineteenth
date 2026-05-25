/**
 * Activity Feed - Mutation Hooks
 *
 * - useLikeRound / useUnlikeRound: optimistic like toggle
 * - useAddComment / useDeleteComment: flat comments (soft delete)
 * - useUploadRoundPhoto / useDeleteRoundPhoto: shared photo album
 */

import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase/client';
import { activityKeys } from '@/hooks/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { createError } from '@/services/errors';
import type {
  ActivityFeedCard,
  AddCommentInput,
  DeleteCommentInput,
  UploadRoundPhotoInput,
  DeleteRoundPhotoInput,
} from './types';

// Activity-feed tables/RPCs are not yet in the generated Database types.
const sb = supabase as unknown as SupabaseClient;
const PHOTO_BUCKET = 'round-photos';

/**
 * Apply an update to a round's card across every cache that holds it:
 * the infinite feed, the Home preview, and the single-round card.
 */
function patchFeedCaches(
  qc: QueryClient,
  roundId: string,
  update: (card: ActivityFeedCard) => ActivityFeedCard
): void {
  qc.setQueryData<InfiniteData<ActivityFeedCard[]>>(activityKeys.feed(), (old) =>
    old
      ? {
          ...old,
          pages: old.pages.map((page) =>
            page.map((c) => (c.round_id === roundId ? update(c) : c))
          ),
        }
      : old
  );

  qc.setQueryData<ActivityFeedCard[]>(activityKeys.preview(), (old) =>
    old ? old.map((c) => (c.round_id === roundId ? update(c) : c)) : old
  );

  qc.setQueryData<ActivityFeedCard | null>(activityKeys.round(roundId), (old) =>
    old ? update(old) : old
  );
}

function resyncRound(qc: QueryClient, roundId: string): void {
  qc.invalidateQueries({ queryKey: activityKeys.round(roundId) });
  qc.invalidateQueries({ queryKey: activityKeys.feed() });
  qc.invalidateQueries({ queryKey: activityKeys.preview() });
}

export function useLikeRound() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (roundId: string) => {
      if (!user?.id) throw createError('You must be signed in to like a round', 'AUTH');
      const { error } = await sb
        .from('round_likes')
        .upsert(
          { round_id: roundId, player_id: user.id },
          { onConflict: 'round_id,player_id', ignoreDuplicates: true }
        );
      if (error) throw createError(`Failed to like round: ${error.message}`, 'DATABASE');
    },
    onMutate: (roundId: string) => {
      patchFeedCaches(qc, roundId, (c) =>
        c.viewer_has_liked
          ? c
          : { ...c, viewer_has_liked: true, like_count: c.like_count + 1 }
      );
    },
    onError: (_err, roundId) => resyncRound(qc, roundId),
  });
}

export function useUnlikeRound() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (roundId: string) => {
      if (!user?.id) throw createError('You must be signed in', 'AUTH');
      const { error } = await sb
        .from('round_likes')
        .delete()
        .eq('round_id', roundId)
        .eq('player_id', user.id);
      if (error) throw createError(`Failed to unlike round: ${error.message}`, 'DATABASE');
    },
    onMutate: (roundId: string) => {
      patchFeedCaches(qc, roundId, (c) =>
        c.viewer_has_liked
          ? { ...c, viewer_has_liked: false, like_count: Math.max(0, c.like_count - 1) }
          : c
      );
    },
    onError: (_err, roundId) => resyncRound(qc, roundId),
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ roundId, body }: AddCommentInput) => {
      if (!user?.id) throw createError('You must be signed in to comment', 'AUTH');
      const trimmed = body.trim();
      if (!trimmed) throw createError('Comment cannot be empty', 'VALIDATION');
      const { error } = await sb
        .from('round_comments')
        .insert({ round_id: roundId, author_id: user.id, body: trimmed });
      if (error) throw createError(`Failed to add comment: ${error.message}`, 'DATABASE');
    },
    onSuccess: (_data, { roundId }) => {
      qc.invalidateQueries({ queryKey: activityKeys.comments(roundId) });
      patchFeedCaches(qc, roundId, (c) => ({ ...c, comment_count: c.comment_count + 1 }));
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ commentId }: DeleteCommentInput) => {
      if (!user?.id) throw createError('You must be signed in', 'AUTH');
      const { error } = await sb
        .from('round_comments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', commentId)
        .eq('author_id', user.id);
      if (error) throw createError(`Failed to delete comment: ${error.message}`, 'DATABASE');
    },
    onSuccess: (_data, { roundId }) => {
      qc.invalidateQueries({ queryKey: activityKeys.comments(roundId) });
      patchFeedCaches(qc, roundId, (c) => ({
        ...c,
        comment_count: Math.max(0, c.comment_count - 1),
      }));
    },
  });
}

export function useUploadRoundPhoto() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      roundId,
      uri,
      width,
      height,
      ext,
      mimeType,
    }: UploadRoundPhotoInput) => {
      if (!user?.id) throw createError('You must be signed in to add photos', 'AUTH');

      const extension = (ext ?? 'jpg').toLowerCase();
      const path = `rounds/${roundId}/${user.id}/${Crypto.randomUUID()}.${extension}`;

      // Expo: read the local file as an ArrayBuffer for upload.
      const arraybuffer = await fetch(uri).then((res) => res.arrayBuffer());

      const { error: uploadError } = await sb.storage
        .from(PHOTO_BUCKET)
        .upload(path, arraybuffer, {
          contentType: mimeType ?? 'image/jpeg',
          upsert: false,
        });
      if (uploadError) {
        throw createError(`Failed to upload photo: ${uploadError.message}`, 'DATABASE');
      }

      const { error: rowError } = await sb.from('round_photos').insert({
        round_id: roundId,
        uploader_id: user.id,
        storage_path: path,
        width: width ?? null,
        height: height ?? null,
      });
      if (rowError) {
        // Best-effort cleanup so we don't orphan the uploaded object.
        await sb.storage.from(PHOTO_BUCKET).remove([path]);
        throw createError(`Failed to save photo: ${rowError.message}`, 'DATABASE');
      }

      return path;
    },
    onSuccess: (_data, { roundId }) => {
      qc.invalidateQueries({ queryKey: activityKeys.photos(roundId) });
      resyncRound(qc, roundId);
    },
  });
}

export function useDeleteRoundPhoto() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ photoId, storagePath }: DeleteRoundPhotoInput): Promise<number> => {
      if (!user?.id) throw createError('You must be signed in', 'AUTH');
      // Soft-delete via a SECURITY DEFINER RPC. A direct table UPDATE is rejected
      // by the round_photos SELECT RLS policy (deleted_at IS NULL) the moment the
      // row is marked deleted ("new row violates row-level security policy"). The
      // RPC runs as definer and enforces ownership internally (uploader_id =
      // auth.uid()); it returns TRUE only when a row was actually soft-deleted.
      const { data, error } = await sb.rpc('delete_round_photo', { p_photo_id: photoId });
      if (error) throw createError(`Failed to delete photo: ${error.message}`, 'DATABASE');

      const removed = data === true;
      // Only remove the object when a row was actually soft-deleted, so a no-op
      // (already deleted / not the uploader) never orphans the row by deleting its file.
      if (removed && storagePath) {
        await sb.storage.from(PHOTO_BUCKET).remove([storagePath]);
      }
      return removed ? 1 : 0;
    },
    onSuccess: (_count, { roundId }) => {
      qc.invalidateQueries({ queryKey: activityKeys.photos(roundId) });
      resyncRound(qc, roundId);
    },
  });
}
