# Design: "Also commented" notifications

**Date:** 2026-06-15
**Status:** Approved, ready for planning

## Problem

When someone comments on a round, the round's *participants* who are accepted
friends of the commenter already get a `round_commented` notification (in-app +
push). But people who previously commented on that round and are **not**
participants get nothing — they don't find out the conversation they joined has
continued. This is the gap this feature fills.

Likes are out of scope: prior commenters are **not** notified on likes (decided
during brainstorming — likes are low-signal and would be noisy on popular
rounds). Only new comments trigger the fellow-commenter notification.

## Scope

- **New notification type:** `round_also_commented`.
- **Recipients:** distinct prior commenters on the round, excluding the actor and
  excluding anyone already notified as a participant for this same comment.
- **No friendship filter** for "also commented" recipients — they're already in
  the comment thread together, so sharing the thread is the relationship.
- **One notification per person per comment.** A person who is both a participant
  (friend of actor) and a prior commenter receives only the participant
  `round_commented` notification, never both.

## Existing behaviour being extended

`supabase/migrations/20260521000300_activity_notifications.sql` defines
`notify_round_commented()`, an `AFTER INSERT` trigger on `round_comments`. It
loops over round participants (scorecard submitters + `round_players` + round
owner) who are accepted friends of `NEW.author_id`, excluding the author, and for
each sends a `round_commented` in-app notification + push.

`round_comments` is a flat table (no parent/reply column) with soft delete via
`deleted_at`. "Prior commenters" therefore means: distinct `author_id` from
`round_comments` where `round_id = NEW.round_id`, `deleted_at IS NULL`, and
`id <> NEW.id`.

## Database changes (one new migration)

A single new migration file, following the existing pattern. No second trigger —
the logic extends the existing `notify_round_commented()` function so dedupe
between the two recipient sets lives in one place.

1. **Extend the type CHECK constraint** on `notifications` to add
   `'round_also_commented'` (re-state the full `IN (...)` list as the existing
   migrations do).

2. **Rewrite `notify_round_commented()`** so it:
   1. Builds the participant-friend recipient set (as today) and sends each a
      `round_commented` notification + push. Collect these recipient ids into an
      array `v_participant_recipients` as it goes.
   2. Then loops over distinct prior commenters:
      ```sql
      SELECT DISTINCT rc.author_id AS pid
      FROM round_comments rc
      WHERE rc.round_id = NEW.round_id
        AND rc.deleted_at IS NULL
        AND rc.id <> NEW.id
        AND rc.author_id <> NEW.author_id
        AND rc.author_id <> ALL(v_participant_recipients)
      ```
      and for each sends a `round_also_commented` notification + push.

3. **Payload** reuses the existing fields — `actor_name`, `course_name`,
   `comment_preview` (`left(NEW.body, 80)`) — and the same contextual references
   (`round_id = NEW.round_id`, `player_id = NEW.author_id`). No new payload
   fields, so `NotificationData` needs no new properties.

4. **Push copy:**
   - title: `"New comment"`
   - body: `v_actor_name || ' also commented on a round' || COALESCE(' at ' || v_course_name, '')`
   - data: `{ type: 'round_also_commented', roundId, actor_name, course_name, comment_preview }`

   Push respects the global `push_enabled` toggle only — `round_also_commented`
   is not added to `should_send_push()`'s category CASE, so it falls through to
   `ELSE TRUE`, identical to `round_commented` / `round_liked`.

## Client changes (three small edits)

1. **`src/types/database/enums.ts`** — add `'round_also_commented'` to the
   `NotificationType` union.

2. **`src/components/notifications/NotificationItem.tsx`** — add a config entry:
   ```ts
   round_also_commented: {
     icon: 'comment-outline',
     getTitle: (_data) => 'New comment',
     getMessage: (data) =>
       `${data.actor_name || 'Someone'} also commented on a round you commented on${
         data.comment_preview ? `: "${data.comment_preview}"` : ''
       }`,
   },
   ```

3. **`src/services/notifications/notificationHandler.ts`** — map
   `round_also_commented: 'RoundActivity'` in `NOTIFICATION_SCREEN_MAP`
   (same deep link as `round_commented`).

## Edge cases

- **Same person comments twice** → each new comment fires the trigger once; the
  `rc.id <> NEW.id` and `author_id <> NEW.author_id` filters mean a person never
  gets notified about their own comment, and never gets two notifications for one
  comment.
- **Deleted prior comments** → `deleted_at IS NULL` excludes authors whose only
  comments were deleted.
- **Participant who also commented earlier** → notified once, as a participant
  (`round_commented`), via the `<> ALL(v_participant_recipients)` exclusion.
- **First comment on a round** → no prior commenters, so no `round_also_commented`
  notifications; participant logic unchanged.

## Out of scope (pre-existing follow-up, unchanged)

- Dedicated "social activity" push preference toggle (currently only the global
  `push_enabled` applies to all activity notifications).

## Verification

1. Apply the migration locally.
2. Seed a round with three players: owner, commenter A, commenter B, where the
   actor of the final comment is a friend of some but not all.
3. Insert comments in sequence and assert the resulting `notifications` rows:
   prior commenters who aren't participants get `round_also_commented`;
   participant-friends get `round_commented`; nobody gets both; the actor gets
   nothing.
4. `pnpm type-check` and `pnpm lint` for the client edits.
