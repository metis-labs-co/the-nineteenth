/**
 * Activity Feed - Query Hooks
 *
 * - useActivityFeed: infinite, keyset-paginated feed of friends' rounds
 * - useRoundFeedCard: single round card (detail / deep link)
 * - useRoundComments: flat comment thread for a round
 * - useRoundPhotos: round photo album resolved to signed URLs
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase/client';
import { activityKeys } from '@/hooks/queryKeys';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { createError } from '@/services/errors';
import { buildTransform, type ImagePreset } from '@/utils/imageTransform';
import { useAuth } from '@/hooks/useAuth';
import type {
  ActivityFeedCard,
  RoundComment,
  RoundPhoto,
  FeedPhoto,
} from './types';

// Activity-feed tables/RPCs are not yet in the generated Database types.
const sb = supabase as unknown as SupabaseClient;

/**
 * Reduce a comment's embedded like rows to a count + whether the viewer liked.
 */
export function deriveCommentLikes(
  likes: Array<{ player_id: string }> | null | undefined,
  viewerId: string | undefined
): { like_count: number; viewer_has_liked: boolean } {
  const rows = likes ?? [];
  return {
    like_count: rows.length,
    viewer_has_liked: !!viewerId && rows.some((l) => l.player_id === viewerId),
  };
}

/** Test-only export. */
export const __deriveCommentLikesForTest = deriveCommentLikes;

export const ACTIVITY_PAGE_SIZE = 20;
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

/** Sign each path at a transform preset size (parallel). path -> signed url. */
async function signThumb(
  paths: string[],
  preset: ImagePreset
): Promise<Map<string, string>> {
  const transform = buildTransform(preset);
  const results = await Promise.allSettled(
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
  for (const r of results) {
    if (r.status === 'fulfilled') {
      const [path, url] = r.value;
      if (url) map.set(path, url);
    }
  }
  return map;
}

/** Test-only export. */
export const __signThumbForTest = signThumb;

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

/**
 * Infinite activity feed. Cursor is the previous page's last `activity_at`.
 */
export function useActivityFeed() {
  return useInfiniteQuery({
    queryKey: activityKeys.feed(),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await sb.rpc('get_activity_feed', {
        p_limit: ACTIVITY_PAGE_SIZE,
        p_before: pageParam,
      });
      if (error) {
        throw createError(`Failed to load activity feed: ${error.message}`, 'DATABASE');
      }
      return (data ?? []) as ActivityFeedCard[];
    },
    getNextPageParam: (lastPage) =>
      lastPage.length === ACTIVITY_PAGE_SIZE
        ? lastPage[lastPage.length - 1]?.activity_at
        : undefined,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.STANDARD,
  });
}

/**
 * Single round card for the round-activity detail view / deep links.
 */
export function useRoundFeedCard(roundId: string | undefined) {
  return useQuery({
    queryKey: activityKeys.round(roundId ?? ''),
    enabled: !!roundId,
    queryFn: async () => {
      const { data, error } = await sb.rpc('get_round_feed_card', {
        p_round_id: roundId,
      });
      if (error) {
        throw createError(`Failed to load round: ${error.message}`, 'DATABASE');
      }
      const rows = (data ?? []) as ActivityFeedCard[];
      return rows[0] ?? null;
    },
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.STANDARD,
  });
}

/** Normalize a PostgREST embedded relation that may arrive as object or array. */
function firstOrSelf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * Flat comment thread for a round (oldest first), with author profiles.
 */
export function useRoundComments(roundId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: activityKeys.comments(roundId ?? ''),
    enabled: !!roundId,
    queryFn: async () => {
      const { data, error } = await sb
        .from('round_comments')
        .select(
          'id, round_id, author_id, body, created_at, updated_at, author:players!round_comments_author_id_fkey(id, name, photo_url), likes:round_comment_likes(player_id)'
        )
        .eq('round_id', roundId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      if (error) {
        throw createError(`Failed to load comments: ${error.message}`, 'DATABASE');
      }
      return (data ?? []).map((row): RoundComment => {
        const { like_count, viewer_has_liked } = deriveCommentLikes(row.likes, user?.id);
        return {
          id: row.id,
          round_id: row.round_id,
          author_id: row.author_id,
          body: row.body,
          created_at: row.created_at,
          updated_at: row.updated_at,
          like_count,
          viewer_has_liked,
          author: firstOrSelf(row.author),
        };
      });
    },
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.STANDARD,
  });
}

/**
 * Round photo album resolved to signed URLs (private bucket).
 */
export function useRoundPhotos(roundId: string | undefined) {
  return useQuery({
    queryKey: activityKeys.photos(roundId ?? ''),
    enabled: !!roundId,
    queryFn: async () => {
      const { data, error } = await sb
        .from('round_photos')
        .select('id, round_id, storage_path, width, height, uploader_id')
        .eq('round_id', roundId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      if (error) {
        throw createError(`Failed to load photos: ${error.message}`, 'DATABASE');
      }

      const rows = (data ?? []) as FeedPhoto[];
      if (rows.length === 0) return [] as RoundPhoto[];

      const urlByPath = await signThumb(
        rows.map((r) => r.storage_path),
        'THUMB'
      );

      return rows.map(
        (r): RoundPhoto => ({ ...r, url: urlByPath.get(r.storage_path) ?? null })
      );
    },
    staleTime: CACHE_TIMES.MODERATE,
    gcTime: GC_TIMES.STANDARD,
  });
}
