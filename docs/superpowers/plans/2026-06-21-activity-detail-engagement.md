# Activity Detail Engagement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make comment/like notifications open the round's activity-detail screen, let users like comments (with a `comment_liked` notification), and make the round card's player name link to that player's profile.

**Architecture:** Mirror the existing round-like/round-comment patterns. A new `round_comment_likes` table + RLS + DB trigger powers comment likes and the `comment_liked` notification. The activity-feed hooks gain comment-like read/derive/mutate support. Notification routing is fixed in the live provider (`NotificationContext.tsx`) via a small pure helper. UI changes are additive to `RoundComments` and `ActivityRoundCard`.

**Tech Stack:** React Native (Expo), TypeScript, TanStack Query, Supabase (PostgREST + Postgres RLS/triggers), Jest + @testing-library/react-native.

## Global Constraints

- Colors come from `useThemeColors()`; static tokens (`spacing`, `typography`, `borderRadius`, `shadows`) are imported directly. Never import colors from `theme.ts`.
- Use `TouchableOpacity` (not Paper `Button`); min 44px touch targets; include `accessibilityRole`/`accessibilityLabel`.
- Activity-feed tables/RPCs are not in the generated DB types — these hooks cast the client via `const sb = supabase as unknown as SupabaseClient;` (already present in `queries.ts`/`mutations.ts`).
- DB trigger functions are `SECURITY DEFINER`; `create_notification(recipient, type, data_jsonb, competition_id, round_id, player_id, friendship_id, league_id)` and `send_push_notification(recipient, type, title, body, data_jsonb)` signatures must be used exactly as in existing triggers.
- New activity notification types are NOT added to `should_send_push()`'s category CASE (they fall through to the master push toggle), matching `round_liked`/`round_commented`.
- Run tests with `pnpm test <path>`. There are ~243 pre-existing failures on `main`; only judge the files you touch.

---

## Task 1: Notification deep-link routing fix

Route social-engagement notifications to `RoundActivity` instead of `ViewRound`, in the live provider. Extract the type check into a tiny pure, testable helper.

**Files:**
- Create: `src/services/notifications/activityDeepLink.ts`
- Create: `src/services/notifications/activityDeepLink.test.ts`
- Modify: `src/context/NotificationContext.tsx` (`navigateToNotificationTarget` ~line 148, `handleNewNotification` ~line 295)
- Modify: `src/types/database/enums.ts:150` (add `comment_liked` to `NotificationType`)

**Interfaces:**
- Produces: `isActivityDetailNotificationType(type?: string | null): boolean` — true for `round_liked`, `round_commented`, `round_also_commented`, `comment_liked`.

- [ ] **Step 1: Write the failing test**

Create `src/services/notifications/activityDeepLink.test.ts`:

```ts
import { isActivityDetailNotificationType } from './activityDeepLink';

describe('isActivityDetailNotificationType', () => {
  it('is true for social engagement types', () => {
    for (const t of ['round_liked', 'round_commented', 'round_also_commented', 'comment_liked']) {
      expect(isActivityDetailNotificationType(t)).toBe(true);
    }
  });

  it('is false for other / missing types', () => {
    expect(isActivityDetailNotificationType('scorecard_submitted')).toBe(false);
    expect(isActivityDetailNotificationType('social_round_invitation')).toBe(false);
    expect(isActivityDetailNotificationType(undefined)).toBe(false);
    expect(isActivityDetailNotificationType(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/services/notifications/activityDeepLink.test.ts`
Expected: FAIL — cannot find module `./activityDeepLink`.

- [ ] **Step 3: Create the helper**

Create `src/services/notifications/activityDeepLink.ts`:

```ts
/**
 * Notification types whose deep link should open the round's activity-detail
 * screen (RoundActivity — likes + comments) rather than the round screen.
 */
const ACTIVITY_DETAIL_NOTIFICATION_TYPES = new Set<string>([
  'round_liked',
  'round_commented',
  'round_also_commented',
  'comment_liked',
]);

export function isActivityDetailNotificationType(type?: string | null): boolean {
  return !!type && ACTIVITY_DETAIL_NOTIFICATION_TYPES.has(type);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/services/notifications/activityDeepLink.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Add `comment_liked` to the TS notification enum**

In `src/types/database/enums.ts`, change line 150 from:

```ts
  | 'round_also_commented';
```
to:
```ts
  | 'round_also_commented'
  | 'comment_liked';
```

- [ ] **Step 6: Wire the helper into `navigateToNotificationTarget`**

In `src/context/NotificationContext.tsx`, add the import near the other imports:

```ts
import { isActivityDetailNotificationType } from '@/services/notifications/activityDeepLink';
```

Then in `navigateToNotificationTarget`, insert a new branch **before** the existing `} else if (data.roundId) {` branch (keep the `social_round_invitation`/`social_round_response` branch first):

```ts
      } else if (isActivityDetailNotificationType(data.type) && data.roundId) {
        nav.navigate('RoundActivity', { roundId: data.roundId });
      } else if (data.roundId) {
```

- [ ] **Step 7: Wire the helper into `handleNewNotification`**

In the same file, inside `handleNewNotification`'s `showNotificationToast` callback, insert a new branch **before** the existing `} else if (notification.round_id) {` branch:

```ts
        } else if (isActivityDetailNotificationType(notification.type) && notification.round_id) {
          nav.navigate('RoundActivity', { roundId: notification.round_id });
        } else if (notification.round_id) {
```

- [ ] **Step 8: Type-check**

Run: `pnpm type-check`
Expected: no new errors in `NotificationContext.tsx`, `enums.ts`, `activityDeepLink.ts`.

- [ ] **Step 9: Commit**

```bash
git add src/services/notifications/activityDeepLink.ts src/services/notifications/activityDeepLink.test.ts src/context/NotificationContext.tsx src/types/database/enums.ts
git commit -m "fix(activity): route comment/like notifications to RoundActivity detail"
```

---

## Task 2: DB migration — comment likes table, RLS, `comment_liked` notification

**Files:**
- Create: `supabase/migrations/20260621000000_comment_likes.sql`

**Interfaces:**
- Produces: table `round_comment_likes (comment_id, player_id, created_at)`; trigger that emits `comment_liked` notifications; `notifications_type_check` extended with `comment_liked`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260621000000_comment_likes.sql`:

```sql
-- =====================================================
-- Comment likes + comment_liked notification
-- The Nineteenth - Golf Competition App
-- =====================================================
-- Adds round_comment_likes (one like per comment per player), its RLS, and a
-- trigger that notifies a comment's author when an accepted friend likes it.
-- Mirrors round_likes / notify_round_liked. comment_liked is NOT added to
-- should_send_push()'s category CASE, so it respects only the master push
-- toggle (identical to round_liked / round_commented).
-- =====================================================

-- -----------------------------------------------------
-- 1. TABLE + RLS
-- -----------------------------------------------------
CREATE TABLE round_comment_likes (
  comment_id UUID NOT NULL REFERENCES round_comments(id) ON DELETE CASCADE,
  player_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, player_id)
);

CREATE INDEX idx_round_comment_likes_comment ON round_comment_likes(comment_id);

ALTER TABLE round_comment_likes ENABLE ROW LEVEL SECURITY;

-- Visible when the comment's round is visible (reuses can_view_round, the same
-- definer helper round_likes / round_comments policies use).
CREATE POLICY round_comment_likes_select ON round_comment_likes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM round_comments c
    WHERE c.id = comment_id AND can_view_round(c.round_id)
  ));

CREATE POLICY round_comment_likes_insert ON round_comment_likes FOR INSERT
  WITH CHECK (player_id = auth.uid() AND EXISTS (
    SELECT 1 FROM round_comments c
    WHERE c.id = comment_id AND can_view_round(c.round_id)
  ));

CREATE POLICY round_comment_likes_delete ON round_comment_likes FOR DELETE
  USING (player_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON round_comment_likes TO authenticated;
GRANT ALL ON round_comment_likes TO service_role;

COMMENT ON TABLE round_comment_likes IS 'One like per (comment, player) for activity-feed comments.';

-- -----------------------------------------------------
-- 2. EXTEND notifications TYPE CHECK CONSTRAINT
-- -----------------------------------------------------
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  -- Competition types
  'competition_player_added',
  'competition_player_joined',
  'new_round_created',
  'competition_status_changed',
  'scorecard_submitted',
  -- Social types
  'friend_request_received',
  'friend_request_accepted',
  'social_round_invitation',
  'social_round_response',
  -- League types
  'league_player_joined',
  'league_player_left',
  'league_player_removed',
  'league_round_tagged',
  'league_leaderboard_changed',
  'round_completed',
  -- Partnership types
  'partnership_created',
  'partnership_round_tagged',
  -- Side-game & prize pool types
  'skins_game_completed',
  'skins_game_cancelled',
  'wolf_game_completed',
  'wolf_game_cancelled',
  'prize_pool_settled',
  -- Tee-time reminder
  'tee_time_reminder',
  -- Activity feed
  'round_liked',
  'round_commented',
  'round_also_commented',
  'comment_liked'
));

-- -----------------------------------------------------
-- 3. COMMENT-LIKE NOTIFICATION TRIGGER
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION notify_comment_liked()
RETURNS TRIGGER AS $$
DECLARE
  v_round_id    UUID;
  v_author_id   UUID;
  v_body        TEXT;
  v_actor_name  TEXT;
  v_course_name TEXT;
BEGIN
  SELECT rc.round_id, rc.author_id, rc.body
    INTO v_round_id, v_author_id, v_body
  FROM round_comments rc
  WHERE rc.id = NEW.comment_id;

  -- Comment gone, or a self-like: nothing to notify.
  IF v_author_id IS NULL OR v_author_id = NEW.player_id THEN
    RETURN NEW;
  END IF;

  -- Friend gate: only notify when liker and author are accepted friends
  -- (checked against NEW.player_id directly so it also works for seeded inserts).
  IF NOT EXISTS (
    SELECT 1 FROM friendships f
    WHERE f.status = 'accepted'
      AND ((f.requester_id = NEW.player_id AND f.addressee_id = v_author_id)
        OR (f.addressee_id = NEW.player_id AND f.requester_id = v_author_id))
  ) THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_actor_name FROM players WHERE id = NEW.player_id;

  SELECT c.name INTO v_course_name
  FROM rounds r
  JOIN courses c ON c.id = r.course_id
  WHERE r.id = v_round_id;

  PERFORM create_notification(
    v_author_id,
    'comment_liked',
    jsonb_build_object(
      'actor_name', v_actor_name,
      'course_name', v_course_name,
      'comment_preview', left(v_body, 80)
    ),
    NULL,           -- competition_id
    v_round_id,     -- round_id
    NEW.player_id,  -- player_id (actor)
    NULL,           -- friendship_id
    NULL            -- league_id
  );

  PERFORM send_push_notification(
    v_author_id,
    'comment_liked',
    'New like',
    v_actor_name || ' liked your comment' || COALESCE(' on a round at ' || v_course_name, ''),
    jsonb_build_object(
      'type', 'comment_liked',
      'roundId', v_round_id,
      'actor_name', v_actor_name,
      'course_name', v_course_name,
      'comment_preview', left(v_body, 80)
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_comment_liked IS 'Notifies a comment author when an accepted friend likes their comment.';

DROP TRIGGER IF EXISTS trigger_notify_comment_liked ON round_comment_likes;
CREATE TRIGGER trigger_notify_comment_liked
  AFTER INSERT ON round_comment_likes
  FOR EACH ROW EXECUTE FUNCTION notify_comment_liked();
```

- [ ] **Step 2: Validate the migration applies cleanly**

If a local Supabase is available:
Run: `supabase db reset`
Expected: completes without error; the new migration is listed as applied.

If no local stack is available, at minimum sanity-check the SQL parses (no automated DB test harness exists in this repo). Do NOT apply against staging/prod from here — deployment is a separate, manual step (see plan footer).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260621000000_comment_likes.sql
git commit -m "feat(db): round_comment_likes table, RLS, and comment_liked notification"
```

---

## Task 3: Types + query — read comment likes

Extend `RoundComment` with like fields and derive them in `useRoundComments`. Extract a pure derive helper for testing.

**Files:**
- Modify: `src/hooks/activity/types.ts` (`RoundComment`, add `LikeCommentInput`)
- Modify: `src/hooks/activity/queries.ts` (`useRoundComments` select + mapping; add `deriveCommentLikes` + test export)
- Modify: `src/hooks/activity/queries.test.ts` (add tests for `deriveCommentLikes`)

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `RoundComment` gains `like_count: number; viewer_has_liked: boolean`.
  - `LikeCommentInput = { commentId: string; roundId: string }`.
  - `deriveCommentLikes(likes: Array<{ player_id: string }> | null | undefined, viewerId: string | undefined): { like_count: number; viewer_has_liked: boolean }` (exported as `__deriveCommentLikesForTest`).

- [ ] **Step 1: Extend the `RoundComment` type and add the input type**

In `src/hooks/activity/types.ts`, update the `RoundComment` interface (currently lines 51–63) to add two fields after `updated_at`:

```ts
export interface RoundComment {
  id: string;
  round_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  like_count: number;
  viewer_has_liked: boolean;
  author: {
    id: string;
    name: string;
    photo_url: string | null;
  } | null;
}
```

And add near the other input types (after `AddCommentInput`):

```ts
export interface LikeCommentInput {
  commentId: string;
  roundId: string;
}
```

- [ ] **Step 2: Write the failing test for `deriveCommentLikes`**

In `src/hooks/activity/queries.test.ts`, add at the top with the other imports:

```ts
import { __deriveCommentLikesForTest } from './queries';
```

And append this describe block:

```ts
describe('deriveCommentLikes', () => {
  it('counts likes and flags the viewer when present', () => {
    const r = __deriveCommentLikesForTest(
      [{ player_id: 'a' }, { player_id: 'viewer-1' }],
      'viewer-1'
    );
    expect(r).toEqual({ like_count: 2, viewer_has_liked: true });
  });

  it('flags viewer false when absent and handles empty/missing', () => {
    expect(__deriveCommentLikesForTest([{ player_id: 'a' }], 'viewer-1')).toEqual({
      like_count: 1,
      viewer_has_liked: false,
    });
    expect(__deriveCommentLikesForTest([], 'viewer-1')).toEqual({
      like_count: 0,
      viewer_has_liked: false,
    });
    expect(__deriveCommentLikesForTest(null, 'viewer-1')).toEqual({
      like_count: 0,
      viewer_has_liked: false,
    });
    expect(__deriveCommentLikesForTest([{ player_id: 'a' }], undefined)).toEqual({
      like_count: 1,
      viewer_has_liked: false,
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test src/hooks/activity/queries.test.ts`
Expected: FAIL — `__deriveCommentLikesForTest` is not exported.

- [ ] **Step 4: Implement the helper, the select, and the mapping**

In `src/hooks/activity/queries.ts`:

(a) Add the `useAuth` import after the existing imports:

```ts
import { useAuth } from '@/hooks/useAuth';
```

(b) Add the helper near the top (after `const sb = ...`):

```ts
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
```

(c) In `useRoundComments`, read the user and embed likes. Replace the hook body's `const { data, error } = await sb.from('round_comments').select(...)` call and the mapping. The hook becomes:

```ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/hooks/activity/queries.test.ts`
Expected: PASS (existing tests + new `deriveCommentLikes` block).

- [ ] **Step 6: Type-check**

Run: `pnpm type-check`
Expected: no new errors. (Note: `row.likes` is loosely typed because `sb` is cast; the helper's param type narrows it.)

- [ ] **Step 7: Commit**

```bash
git add src/hooks/activity/types.ts src/hooks/activity/queries.ts src/hooks/activity/queries.test.ts
git commit -m "feat(activity): read comment like_count and viewer_has_liked"
```

---

## Task 4: Mutations — like / unlike a comment

**Files:**
- Modify: `src/hooks/activity/mutations.ts` (add `applyCommentLike`, `useLikeComment`, `useUnlikeComment`)
- Create: `src/hooks/activity/commentLikes.test.ts`
- Modify: `src/hooks/activity/index.ts` (export the new hooks, if hooks are re-exported there — verify)

**Interfaces:**
- Consumes: `RoundComment`, `LikeCommentInput` from `./types`; `activityKeys.comments(roundId)`.
- Produces:
  - `applyCommentLike(comments: RoundComment[] | undefined, commentId: string, liked: boolean): RoundComment[] | undefined` (exported as `__applyCommentLikeForTest`).
  - `useLikeComment()` / `useUnlikeComment()` — `mutate({ commentId, roundId })`.

- [ ] **Step 1: Write the failing test for the cache patch**

Create `src/hooks/activity/commentLikes.test.ts`:

```ts
import { __applyCommentLikeForTest as applyCommentLike } from './mutations';
import type { RoundComment } from './types';

function comment(over: Partial<RoundComment> = {}): RoundComment {
  return {
    id: 'c1',
    round_id: 'r1',
    author_id: 'a1',
    body: 'nice',
    created_at: '2026-06-21T00:00:00Z',
    updated_at: '2026-06-21T00:00:00Z',
    like_count: 0,
    viewer_has_liked: false,
    author: null,
    ...over,
  };
}

describe('applyCommentLike', () => {
  it('likes a not-yet-liked comment', () => {
    const out = applyCommentLike([comment()], 'c1', true);
    expect(out?.[0]).toMatchObject({ viewer_has_liked: true, like_count: 1 });
  });

  it('is idempotent when liking an already-liked comment', () => {
    const out = applyCommentLike([comment({ viewer_has_liked: true, like_count: 1 })], 'c1', true);
    expect(out?.[0]).toMatchObject({ viewer_has_liked: true, like_count: 1 });
  });

  it('unlikes a liked comment and never goes below zero', () => {
    const out = applyCommentLike([comment({ viewer_has_liked: true, like_count: 1 })], 'c1', false);
    expect(out?.[0]).toMatchObject({ viewer_has_liked: false, like_count: 0 });
    const out2 = applyCommentLike([comment({ viewer_has_liked: false, like_count: 0 })], 'c1', false);
    expect(out2?.[0]).toMatchObject({ viewer_has_liked: false, like_count: 0 });
  });

  it('leaves other comments and undefined caches untouched', () => {
    const other = comment({ id: 'c2' });
    const out = applyCommentLike([other], 'c1', true);
    expect(out?.[0]).toBe(other);
    expect(applyCommentLike(undefined, 'c1', true)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/hooks/activity/commentLikes.test.ts`
Expected: FAIL — `__applyCommentLikeForTest` is not exported.

- [ ] **Step 3: Implement the patch helper and the two hooks**

In `src/hooks/activity/mutations.ts`:

(a) Add `RoundComment` and `LikeCommentInput` to the type import from `./types`:

```ts
import type {
  ActivityFeedCard,
  AddCommentInput,
  DeleteCommentInput,
  UploadRoundPhotoInput,
  DeleteRoundPhotoInput,
  RoundComment,
  LikeCommentInput,
} from './types';
```

(b) Add the pure helper (place it near `patchFeedCaches`):

```ts
/**
 * Toggle a comment's like state in a cached RoundComment[] (pure, idempotent).
 */
export function applyCommentLike(
  comments: RoundComment[] | undefined,
  commentId: string,
  liked: boolean
): RoundComment[] | undefined {
  if (!comments) return comments;
  return comments.map((c) => {
    if (c.id !== commentId) return c;
    if (liked === c.viewer_has_liked) return c;
    return {
      ...c,
      viewer_has_liked: liked,
      like_count: liked ? c.like_count + 1 : Math.max(0, c.like_count - 1),
    };
  });
}

/** Test-only export. */
export const __applyCommentLikeForTest = applyCommentLike;
```

(c) Add the two hooks (after `useDeleteComment`):

```ts
export function useLikeComment() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ commentId }: LikeCommentInput) => {
      if (!user?.id) throw createError('You must be signed in to like a comment', 'AUTH');
      const { error } = await sb
        .from('round_comment_likes')
        .upsert(
          { comment_id: commentId, player_id: user.id },
          { onConflict: 'comment_id,player_id', ignoreDuplicates: true }
        );
      if (error) throw createError(`Failed to like comment: ${error.message}`, 'DATABASE');
    },
    onMutate: ({ commentId, roundId }: LikeCommentInput) => {
      qc.setQueryData<RoundComment[]>(activityKeys.comments(roundId), (old) =>
        applyCommentLike(old, commentId, true)
      );
    },
    onError: (_err, { roundId }) => {
      qc.invalidateQueries({ queryKey: activityKeys.comments(roundId) });
    },
  });
}

export function useUnlikeComment() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ commentId }: LikeCommentInput) => {
      if (!user?.id) throw createError('You must be signed in', 'AUTH');
      const { error } = await sb
        .from('round_comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('player_id', user.id);
      if (error) throw createError(`Failed to unlike comment: ${error.message}`, 'DATABASE');
    },
    onMutate: ({ commentId, roundId }: LikeCommentInput) => {
      qc.setQueryData<RoundComment[]>(activityKeys.comments(roundId), (old) =>
        applyCommentLike(old, commentId, false)
      );
    },
    onError: (_err, { roundId }) => {
      qc.invalidateQueries({ queryKey: activityKeys.comments(roundId) });
    },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/hooks/activity/commentLikes.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Verify the hooks are exported from the activity barrel**

Check `src/hooks/activity/index.ts`. If it re-exports mutation hooks (e.g. `export * from './mutations'` or a named list including `useLikeRound`), confirm `useLikeComment`/`useUnlikeComment` are now exported. If it uses an explicit named list, add `useLikeComment` and `useUnlikeComment` to it.

Run: `pnpm type-check`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/activity/mutations.ts src/hooks/activity/commentLikes.test.ts src/hooks/activity/index.ts
git commit -m "feat(activity): like/unlike comment mutations with optimistic patch"
```

---

## Task 5: UI — comment like button in `RoundComments`

**Files:**
- Modify: `src/components/activity/RoundComments.tsx`

**Interfaces:**
- Consumes: `useLikeComment`/`useUnlikeComment` from `@/hooks/activity`; `RoundComment.like_count` / `.viewer_has_liked`.

- [ ] **Step 1: Import the hooks and theme error color usage**

In `src/components/activity/RoundComments.tsx`, extend the activity import (currently `useRoundComments, useDeleteComment`):

```ts
import { useRoundComments, useDeleteComment, useLikeComment, useUnlikeComment } from '@/hooks/activity';
```

- [ ] **Step 2: Instantiate the mutations and a toggle handler**

Inside `RoundComments`, after `const deleteComment = useDeleteComment();`, add:

```ts
  const likeComment = useLikeComment();
  const unlikeComment = useUnlikeComment();

  const toggleLike = useCallback(
    (comment: RoundComment) => {
      if (comment.viewer_has_liked) {
        unlikeComment.mutate({ commentId: comment.id, roundId });
      } else {
        likeComment.mutate({ commentId: comment.id, roundId });
      }
    },
    [likeComment, unlikeComment, roundId]
  );
```

- [ ] **Step 3: Render the heart toggle under each comment body**

In the comment `map`, immediately after the `<Text ...>{comment.body}</Text>` line (inside `styles.commentBody`), add:

```tsx
                <TouchableOpacity
                  style={styles.likeRow}
                  onPress={() => toggleLike(comment)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={comment.viewer_has_liked ? 'Unlike comment' : 'Like comment'}
                >
                  <Icon
                    source={comment.viewer_has_liked ? 'heart' : 'heart-outline'}
                    size={16}
                    color={comment.viewer_has_liked ? colors.error : colors.textSecondary}
                  />
                  {comment.like_count > 0 ? (
                    <Text style={[styles.likeCount, { color: colors.textSecondary }]}>
                      {comment.like_count}
                    </Text>
                  ) : null}
                </TouchableOpacity>
```

- [ ] **Step 4: Add the styles**

In the `StyleSheet.create({...})` at the bottom, add:

```ts
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    minHeight: 44,
    alignSelf: 'flex-start',
  },
  likeCount: {
    ...typography.caption,
    fontWeight: '600',
  },
```

- [ ] **Step 5: Type-check and run the component's existing suite**

Run: `pnpm type-check`
Expected: no new errors.

Run: `pnpm test src/components/activity`
Expected: existing activity component tests still pass (no regressions from the import/render changes).

- [ ] **Step 6: Commit**

```bash
git add src/components/activity/RoundComments.tsx
git commit -m "feat(activity): heart toggle + count on each comment"
```

---

## Task 6: Player name → profile on the round card

**Files:**
- Modify: `src/components/activity/ActivityRoundCard.tsx`
- Modify: `src/components/activity/ActivityRoundCard.test.tsx`

**Interfaces:**
- Consumes: `navigation.navigate('PlayerDetail', { id })` (route param is `{ id: string }`, confirmed in `src/navigation/types.ts`).

- [ ] **Step 1: Write the failing test**

In `src/components/activity/ActivityRoundCard.test.tsx`, add a test inside the `describe('ActivityRoundCard', ...)` block:

```ts
  it('opens the headline player profile when their name is tapped', () => {
    render(<ActivityRoundCard card={makeCard()} onOpen={jest.fn()} />);
    fireEvent.press(screen.getByLabelText("View Sam Kay's profile"));
    expect(mockNavigate).toHaveBeenCalledWith('PlayerDetail', { id: 'viewer-1' });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/activity/ActivityRoundCard.test.tsx`
Expected: FAIL — no element labelled `View Sam Kay's profile`.

- [ ] **Step 3: Add the profile-navigation handler**

In `src/components/activity/ActivityRoundCard.tsx`, after `handleOpenScorecard` (around line 108), add:

```ts
  const handleOpenProfile = useCallback(() => {
    if (headlinePlayerId) {
      navigation.navigate('PlayerDetail', { id: headlinePlayerId });
    }
  }, [navigation, headlinePlayerId]);
```

- [ ] **Step 4: Wrap the avatar + name in a touchable**

Replace the avatar + `playerText` block inside `styles.playerRow` (currently lines ~134–155: the `<PlayerAvatar .../>` and the `<View style={styles.playerText}>...</View>`) with a touchable wrapper that keeps the same children:

```tsx
            <TouchableOpacity
              style={styles.playerTap}
              onPress={handleOpenProfile}
              accessibilityRole="button"
              accessibilityLabel={`View ${headline.name}'s profile`}
            >
              <PlayerAvatar photoUrl={headline.photo_url} name={headline.name} size={40} />
              <View style={styles.playerText}>
                <View style={styles.nameRow}>
                  <Text
                    style={[styles.playerName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {headline.name}
                  </Text>
                  {isViewer ? (
                    <View style={[styles.youPill, { borderColor: colors.primary }]}>
                      <Text style={[styles.youPillText, { color: colors.primary }]}>YOU</Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  style={[styles.subtitle, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  played a round · {formatTimeAgo(card.activity_at)}
                </Text>
              </View>
            </TouchableOpacity>
```

(The score `TouchableOpacity` remains a sibling after this block, inside `playerRow`.)

- [ ] **Step 5: Add the `playerTap` style**

In the `StyleSheet.create`, add a style that preserves the row layout the avatar+text previously had:

```ts
  playerTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test src/components/activity/ActivityRoundCard.test.tsx`
Expected: PASS, including the existing scorecard-tap and course-tap tests (nested touchables still resolve their own labels).

- [ ] **Step 7: Type-check**

Run: `pnpm type-check`
Expected: no new errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/activity/ActivityRoundCard.tsx src/components/activity/ActivityRoundCard.test.tsx
git commit -m "feat(activity): tap round card player name to open their profile"
```

---

## Final verification

- [ ] **Run the full set of touched test files**

Run: `pnpm test src/services/notifications/activityDeepLink.test.ts src/hooks/activity src/components/activity`
Expected: all green (allowing for the documented pre-existing baseline noise unrelated to these files).

- [ ] **Type-check the whole project**

Run: `pnpm type-check`
Expected: no new errors introduced by this work.

- [ ] **Manual smoke (on device / simulator)** — not automated:
  - Tap a "commented" / "liked" notification toast and push → lands on `RoundActivity`.
  - Like and unlike a comment → count updates immediately and persists after refetch.
  - Like a friend's comment → they receive a `comment_liked` notification that deep-links to `RoundActivity`.
  - Tap a player's name on a round card (feed and detail) → opens `PlayerDetail`; tapping the card elsewhere still opens the round; tapping the course still opens `Course`.

## Deployment Notes (separate, manual)

- Apply `supabase/migrations/20260621000000_comment_likes.sql` to staging then prod. It is additive (new table + trigger + widened CHECK constraint); no backfill.
- Per project memory, the Supabase CLI is linked to PROD and staging is reached via the aws-1 pooler — deploy deliberately, not from this plan's steps.
```
