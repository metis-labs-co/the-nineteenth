# Activity Detail Engagement — Design

**Date:** 2026-06-21
**Status:** Approved (pending spec review)

## Summary

Three related improvements to the activity (social feed) experience, plus one
consolidated notification addition:

1. **Fix comment/like notification deep links** so they open the round's
   activity-detail screen (`RoundActivity`) instead of the round screen
   (`ViewRound`).
2. **Like a comment** — a heart toggle + count on each comment, mirroring the
   existing round-like pattern, including a new `comment_liked` notification.
3. **Tap a player's name** on the round card to open their profile
   (`PlayerDetail`). The course/club tap already exists.

**Deferred to follow-ups:** tagging/@mentions in comments; making
comment-*author* names (in the thread) tappable.

## Context / Current State

- The activity feed lists friends' completed rounds
  (`src/screens/activity/ActivityScreen.tsx`). Tapping a card opens
  `RoundActivity` (`src/screens/activity/RoundActivityScreen.tsx`), the social
  detail view: it renders the same `ActivityRoundCard` plus the comment thread
  (`RoundComments`) and a sticky composer (`RoundCommentComposer`).
- Round-level **likes** already exist: table `round_likes`, hooks
  `useLikeRound`/`useUnlikeRound`, and `like_count`/`viewer_has_liked` on the
  feed card. Comments exist: table `round_comments` (soft-delete), hooks
  `useRoundComments`/`useAddComment`/`useDeleteComment`.
- **Notifications**: `round_liked`, `round_commented`, `round_also_commented`
  already fire via DB triggers (`supabase/migrations/20260521000300_*` and
  `20260615010000_*`) and carry `roundId` in their push payload.
- **The deep-link bug**: the *live* in-app notification routing is in
  `src/context/NotificationContext.tsx`. Both the toast-tap
  (`handleNewNotification`, ~line 295) and the push/cold-start tap
  (`navigateToNotificationTarget`, ~line 148) route **any** notification that
  carries a `round_id`/`roundId` to `ViewRound`. There is a second mapping in
  `src/services/notifications/notificationHandler.ts` that already maps
  `round_liked`/`round_commented` → `RoundActivity`, **but that file is dead
  code** — it is only referenced by `src/utils/pushNotificationTest.ts` and the
  `src/services/notifications/index.ts` barrel, not by the live provider. So the
  fix must land in `NotificationContext.tsx`.
- `ActivityRoundCard` (`src/components/activity/ActivityRoundCard.tsx`) already
  deep-links the course row → `Course` screen (lines ~96–98). It is used on
  both the feed and the detail screen, so the course link already works on the
  detail screen. The headline player name is **not** yet tappable.

## Feature 1 — Notification deep-link fix

In `src/context/NotificationContext.tsx`, route social-engagement notification
types to `RoundActivity` instead of `ViewRound`. Affected types:

```
round_liked, round_commented, round_also_commented, comment_liked
```

- Add a small module-level helper, e.g.
  `const ACTIVITY_DETAIL_TYPES = new Set([...])` and
  `function isActivityDetailType(type?: string)`.
- In `navigateToNotificationTarget` (reads `data.type` / `data.roundId`): before
  the existing `else if (data.roundId)` branch, add
  `if (isActivityDetailType(data.type) && data.roundId)` →
  `nav.navigate('RoundActivity', { roundId: data.roundId })`.
- In `handleNewNotification` (reads `notification.type` / `notification.round_id`):
  add the same guarded branch before the `else if (notification.round_id)` branch
  → `nav.navigate('RoundActivity', { roundId: notification.round_id })`.
- All other types/behaviour unchanged. The `social_round_invitation` /
  `social_round_response` → `ScheduledRound` branch must still take precedence
  (it already comes first).

**Acceptance:** tapping a "commented"/"liked" toast or push opens `RoundActivity`
for that round; score/invite/result notifications still open their current
destinations.

## Feature 2 — Like a comment (heart + count) + `comment_liked` notification

### 2a. Database — new migration `supabase/migrations/<ts>_comment_likes.sql`

**Table `round_comment_likes`** (mirror `round_likes`):

```sql
CREATE TABLE round_comment_likes (
  comment_id UUID NOT NULL REFERENCES round_comments(id) ON DELETE CASCADE,
  player_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, player_id)
);
CREATE INDEX idx_round_comment_likes_comment ON round_comment_likes(comment_id);
ALTER TABLE round_comment_likes ENABLE ROW LEVEL SECURITY;
```

**RLS** — reuse the existing `can_see_round_social(round_id)` definer helper via
the comment's round:

- SELECT: visible when the comment's round is socially visible —
  `EXISTS (SELECT 1 FROM round_comments c WHERE c.id = comment_id AND can_see_round_social(c.round_id))`.
- INSERT: `player_id = auth.uid()` **and** the comment's round is socially
  visible (same `EXISTS`).
- DELETE: `player_id = auth.uid()`.
- `GRANT SELECT, INSERT, DELETE ON round_comment_likes TO authenticated;`
  `GRANT ALL ON round_comment_likes TO service_role;`

**Constraint update** — drop/recreate `notifications_type_check` with the full
current list (see `20260615010000`) **plus** `'comment_liked'`.

**Trigger `notify_comment_liked()`** (mirror `notify_round_liked`,
`AFTER INSERT ON round_comment_likes`, `SECURITY DEFINER`):

- Resolve the comment: `SELECT round_id, author_id, body INTO ... FROM round_comments WHERE id = NEW.comment_id`.
- Resolve actor name (`players.name` where id = `NEW.player_id`) and course name
  (via the round, as the other triggers do).
- Notify the **comment author** only, when `author_id <> NEW.player_id` AND
  liker/author are accepted friends (same `friendships … status='accepted'`
  check used by the other triggers).
- `create_notification(author_id, 'comment_liked', jsonb_build_object('actor_name', …, 'course_name', …, 'comment_preview', left(body,80)), NULL, round_id, NEW.player_id, NULL, NULL)`.
- `send_push_notification(author_id, 'comment_liked', 'New like', actor || ' liked your comment' || COALESCE(' on a round at ' || course, ''), jsonb_build_object('type','comment_liked','roundId', round_id, …))`.
- Like the other activity types, do **not** add `comment_liked` to
  `should_send_push()`'s category CASE (it falls through to the master toggle).

### 2b. Types — `src/hooks/activity/types.ts`

Add to `RoundComment`:

```ts
like_count: number;
viewer_has_liked: boolean;
```

Add a `LikeCommentInput` / reuse `{ commentId: string; roundId: string }`.

### 2c. Query — `src/hooks/activity/queries.ts` (`useRoundComments`)

Extend the PostgREST select to embed likes and derive the two fields in JS
(comment-like volumes are tiny here, so returning ids is acceptable and avoids a
new RPC):

```
.select('id, round_id, author_id, body, created_at, updated_at,
  author:players!round_comments_author_id_fkey(id, name, photo_url),
  likes:round_comment_likes(player_id)')
```

Map: `like_count = likes.length`,
`viewer_has_liked = likes.some(l => l.player_id === user?.id)`. Get the current
user id by importing `useAuth` into `queries.ts` (as `mutations.ts` already
does) and reading `user?.id` at the top of the hook, then closing over it in
`queryFn`. Add `user?.id` to the query key (or keep the key stable and only use
the id for the `viewer_has_liked` derivation) — prefer including it so a user
switch re-derives correctly. Empty/missing `likes` defaults to `0` / `false`.

### 2d. Mutations — `src/hooks/activity/mutations.ts`

Add `useLikeComment` / `useUnlikeComment`, mirroring `useLikeRound`/`useUnlikeRound`:

- `useLikeComment`: upsert `{ comment_id, player_id }` into `round_comment_likes`
  with `onConflict: 'comment_id,player_id', ignoreDuplicates: true`.
- `useUnlikeComment`: delete by `comment_id` + `player_id`.
- Optimistic update: patch the `activityKeys.comments(roundId)` cache — find the
  comment by id, toggle `viewer_has_liked` and adjust `like_count`
  (`Math.max(0, …)` on unlike). On error, invalidate
  `activityKeys.comments(roundId)`.

### 2e. UI — `src/components/activity/RoundComments.tsx`

Under each comment body, add a small heart toggle + count row:

- `Icon source={viewer_has_liked ? 'heart' : 'heart-outline'}`, color
  `colors.error` when liked else `colors.textSecondary`, size ~16.
- Count shown when `like_count > 0`.
- `TouchableOpacity` with `hitSlop`, min 44px touch target, accessibility label
  `"Like comment"` / `"Unlike comment"`.
- Wire to `useLikeComment`/`useUnlikeComment`. A user may like any visible
  comment including their own (matches round-like behaviour, which allows
  self-like). The trigger simply won't notify on a self-like.

### 2f. TS notification enum — `src/types/database/enums.ts`

Add `| 'comment_liked'` to the `NotificationType` union (after
`round_also_commented`).

## Feature 3 — Player name → profile

In `src/components/activity/ActivityRoundCard.tsx`, wrap the headline player's
avatar + name block (the `styles.playerRow` content, currently lines ~132–155)
in a `TouchableOpacity` that calls
`navigation.navigate('PlayerDetail', { id: headline.player_id })`.

- Keep it as a **nested** touchable inside the outer card `TouchableOpacity`;
  RN gives the inner press priority, so tapping the name → profile and tapping
  elsewhere on the card → round (feed) / no-op (detail).
- Disable/guard when `headline` is null.
- Accessibility: `accessibilityRole="button"`,
  `accessibilityLabel={`View ${headline.name}'s profile`}`.
- The existing score tap (`handleOpenScorecard`) and course tap
  (`handleOpenCourse`) are unchanged.

`PlayerDetail` route param is `{ id: string }` (confirmed in
`src/navigation/types.ts`).

## Out of Scope (follow-ups)

- @mention / tagging people in comments (autocomplete restricted to friends,
  persisted mentions, "tagged you" notification).
- Making comment-author names in the thread tappable to their profile.

## Testing

- **Unit**: `useLikeComment`/`useUnlikeComment` optimistic patch + rollback;
  `useRoundComments` mapping of `like_count`/`viewer_has_liked`; the
  `isActivityDetailType` routing helper.
- **DB**: RLS on `round_comment_likes` (insert only as self, select gated by
  round social visibility); `notify_comment_liked` notifies the comment author
  only when an accepted friend and not a self-like.
- **Manual**: tap a "commented"/"liked" notification → lands on `RoundActivity`;
  like/unlike a comment updates count; like someone's comment → they receive a
  `comment_liked` notification that deep-links to `RoundActivity`; tap a player
  name on a card → `PlayerDetail`.

## Deployment Notes

- New migration must be applied to staging/prod (per project convention,
  migrations are not auto-deployed).
- Pure additive schema change; no backfill required.
