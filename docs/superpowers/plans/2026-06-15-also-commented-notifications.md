# "Also Commented" Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notify prior commenters on a round (who aren't round participants) when someone else adds a new comment, via a new `round_also_commented` notification type.

**Architecture:** Extend the existing `notify_round_commented()` Postgres trigger function (single function, so dedupe between the two recipient sets lives in one place) to emit a second notification type to prior commenters, plus three small client edits to render and deep-link it. No new tables, no schema columns, no payload fields.

**Tech Stack:** Supabase/Postgres (plpgsql trigger), TypeScript, React Native. Migrations applied via psql; verification via the repo's `supabase/tests/*_verify.sql` convention.

**Spec:** `docs/superpowers/specs/2026-06-15-also-commented-notifications-design.md`

---

## File Structure

- **Create:** `supabase/migrations/20260615010000_round_also_commented_notifications.sql` — extends the `notifications` type CHECK constraint and rewrites `notify_round_commented()`.
- **Create:** `supabase/tests/round_also_commented_verify.sql` — catalog + functional verification, mirroring `supabase/tests/activity_feed_verify.sql`.
- **Modify:** `src/types/database/enums.ts` — add `'round_also_commented'` to `NotificationType`.
- **Modify:** `src/components/notifications/NotificationItem.tsx` — add render config for the new type.
- **Modify:** `src/services/notifications/notificationHandler.ts` — add deep-link mapping.

---

## Task 1: Database migration — type + trigger function

**Files:**
- Create: `supabase/migrations/20260615010000_round_also_commented_notifications.sql`

The latest constraint definition lives in `supabase/migrations/20260612000000_scheduled_rounds.sql` and already includes `social_round_response`. The list below reproduces it verbatim and appends `round_also_commented` — do not drop `social_round_response`.

The existing `notify_round_commented()` is defined in `supabase/migrations/20260521000300_activity_notifications.sql`. `CREATE OR REPLACE FUNCTION` updates it in place; the `trigger_notify_round_commented` trigger stays bound to it, so the trigger itself is **not** recreated.

- [ ] **Step 1: Write the migration file**

```sql
-- =====================================================
-- "Also commented" activity notifications
-- The Nineteenth - Golf Competition App
-- =====================================================
-- Adds the 'round_also_commented' notification type and extends
-- notify_round_commented() so that prior commenters on a round who are NOT
-- round participants are notified when a new comment is added.
--
-- Recipients (round_also_commented): distinct prior commenters on the round
-- (deleted_at IS NULL), excluding the new comment, the actor, and anyone
-- already notified as a participant (round_commented) for this comment. No
-- friendship filter — they already share the comment thread.
--
-- One notification per person per comment: a participant-friend who also
-- commented earlier receives only the round_commented notification.
--
-- round_also_commented is not added to should_send_push()'s category CASE, so
-- pushes fall through to ELSE TRUE and respect only the master push_enabled
-- toggle, identical to round_commented / round_liked.
-- =====================================================

-- -----------------------------------------------------
-- 1. EXTEND notifications TYPE CHECK CONSTRAINT
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
  'round_also_commented'
));

-- -----------------------------------------------------
-- 2. REWRITE COMMENT NOTIFICATION TRIGGER FUNCTION
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION notify_round_commented()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_name             TEXT;
  v_course_name            TEXT;
  v_participant_recipients UUID[] := ARRAY[]::UUID[];
  rec                      RECORD;
BEGIN
  SELECT name INTO v_actor_name FROM players WHERE id = NEW.author_id;

  SELECT c.name INTO v_course_name
  FROM rounds r
  JOIN courses c ON c.id = r.course_id
  WHERE r.id = NEW.round_id;

  -- 2a. Participants who are accepted friends of the commenter (unchanged behaviour)
  FOR rec IN
    SELECT DISTINCT participants.pid
    FROM (
      SELECT sc.player_id AS pid FROM scorecards sc
        WHERE sc.round_id = NEW.round_id AND sc.deleted_at IS NULL
      UNION
      SELECT rp.player_id FROM round_players rp WHERE rp.round_id = NEW.round_id
      UNION
      SELECT r.user_id FROM rounds r WHERE r.id = NEW.round_id AND r.user_id IS NOT NULL
    ) participants
    WHERE participants.pid <> NEW.author_id
      AND EXISTS (
        SELECT 1 FROM friendships f
        WHERE f.status = 'accepted'
          AND ((f.requester_id = NEW.author_id AND f.addressee_id = participants.pid)
            OR (f.addressee_id = NEW.author_id AND f.requester_id = participants.pid))
      )
  LOOP
    v_participant_recipients := array_append(v_participant_recipients, rec.pid);

    PERFORM create_notification(
      rec.pid,
      'round_commented',
      jsonb_build_object(
        'actor_name', v_actor_name,
        'course_name', v_course_name,
        'comment_preview', left(NEW.body, 80)
      ),
      NULL,            -- competition_id
      NEW.round_id,    -- round_id
      NEW.author_id,   -- player_id (actor)
      NULL,            -- friendship_id
      NULL             -- league_id
    );

    PERFORM send_push_notification(
      rec.pid,
      'round_commented',
      'New comment',
      v_actor_name || ' commented on your round' || COALESCE(' at ' || v_course_name, ''),
      jsonb_build_object(
        'type', 'round_commented',
        'roundId', NEW.round_id,
        'actor_name', v_actor_name,
        'course_name', v_course_name,
        'comment_preview', left(NEW.body, 80)
      )
    );
  END LOOP;

  -- 2b. Prior commenters not already notified as participants
  FOR rec IN
    SELECT DISTINCT rc.author_id AS pid
    FROM round_comments rc
    WHERE rc.round_id = NEW.round_id
      AND rc.deleted_at IS NULL
      AND rc.id <> NEW.id
      AND rc.author_id <> NEW.author_id
      AND rc.author_id <> ALL(v_participant_recipients)
  LOOP
    PERFORM create_notification(
      rec.pid,
      'round_also_commented',
      jsonb_build_object(
        'actor_name', v_actor_name,
        'course_name', v_course_name,
        'comment_preview', left(NEW.body, 80)
      ),
      NULL,            -- competition_id
      NEW.round_id,    -- round_id
      NEW.author_id,   -- player_id (actor)
      NULL,            -- friendship_id
      NULL             -- league_id
    );

    PERFORM send_push_notification(
      rec.pid,
      'round_also_commented',
      'New comment',
      v_actor_name || ' also commented on a round' || COALESCE(' at ' || v_course_name, ''),
      jsonb_build_object(
        'type', 'round_also_commented',
        'roundId', NEW.round_id,
        'actor_name', v_actor_name,
        'course_name', v_course_name,
        'comment_preview', left(NEW.body, 80)
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_round_commented IS
  'Notifies participant-friends (round_commented) and prior commenters (round_also_commented) when a round is commented on. One notification per person per comment.';
```

Note: `x <> ALL(ARRAY[]::uuid[])` is vacuously TRUE, so when there are no participant recipients every prior commenter still qualifies — correct.

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260615010000_round_also_commented_notifications.sql
git commit -m "feat(notifications): add round_also_commented trigger for prior commenters"
```

---

## Task 2: Verification script + apply migration

**Files:**
- Create: `supabase/tests/round_also_commented_verify.sql`

This mirrors `supabase/tests/activity_feed_verify.sql`: Part 1 is catalog checks (safe anywhere); Part 2 is a functional template run inside a `BEGIN; ... ROLLBACK;` transaction against a test/staging DB with real ids. Per repo memory, the Supabase CLI is linked to PROD — run these against a **local or staging** Postgres only (e.g. `psql "$TEST_DATABASE_URL" -f ...`), never prod.

- [ ] **Step 1: Write the verification script**

```sql
-- =====================================================
-- "Also commented" notifications - verification script
-- =====================================================
-- Run AFTER applying:
--   20260615010000_round_also_commented_notifications.sql
--
-- Part 1 (catalog checks) is safe to run anywhere — metadata only.
-- Part 2 (functional checks) is a commented template: fill in real ids on a
-- test/staging DB and run inside a transaction you ROLLBACK.
-- =====================================================

-- -----------------------------------------------------
-- PART 1: object existence (expect every row to say 'OK')
-- -----------------------------------------------------

SELECT 'notif_type_added' AS check,
  CASE WHEN pg_get_constraintdef(oid) LIKE '%round_also_commented%'
       THEN 'OK' ELSE 'CONSTRAINT MISSING round_also_commented' END AS result
FROM pg_constraint WHERE conname = 'notifications_type_check';

SELECT 'notif_type_preserved' AS check,
  CASE WHEN pg_get_constraintdef(oid) LIKE '%social_round_response%'
        AND pg_get_constraintdef(oid) LIKE '%round_commented%'
        AND pg_get_constraintdef(oid) LIKE '%round_liked%'
       THEN 'OK' ELSE 'CONSTRAINT DROPPED EXISTING TYPES' END AS result
FROM pg_constraint WHERE conname = 'notifications_type_check';

SELECT 'function_exists' AS check,
  CASE WHEN COUNT(*) = 1 THEN 'OK' ELSE 'MISSING' END AS result
FROM pg_proc WHERE proname = 'notify_round_commented';

SELECT 'trigger_bound' AS check,
  CASE WHEN COUNT(*) = 1 THEN 'OK' ELSE 'MISSING' END AS result
FROM pg_trigger WHERE tgname = 'trigger_notify_round_commented';

-- -----------------------------------------------------
-- PART 2: functional checks (TEMPLATE — fill in ids, run in a tx)
-- -----------------------------------------------------
-- Setup: one round with three players where
--   :owner    owns/participates in the round
--   :prior    has commented on the round earlier and is NOT a participant
--   :actor    posts a new comment; friend of :owner but not a participant-link to :prior
--
-- BEGIN;
--   -- :prior leaves an earlier comment (no friendship needed for also-commented).
--   INSERT INTO round_comments (round_id, author_id, body)
--     VALUES ('<ROUND_UUID>', '<PRIOR_UUID>', 'nice round');
--
--   -- :actor posts the triggering comment.
--   INSERT INTO round_comments (round_id, author_id, body)
--     VALUES ('<ROUND_UUID>', '<ACTOR_UUID>', 'thanks!');
--
--   -- Expect: :owner (participant-friend of actor) got 'round_commented';
--   --         :prior got 'round_also_commented'; :actor got nothing.
--   SELECT user_id, type FROM notifications
--   WHERE round_id = '<ROUND_UUID>'
--     AND type IN ('round_commented', 'round_also_commented')
--   ORDER BY type;
--
--   -- Dedupe check: if :prior is ALSO a participant-friend, they should appear
--   -- once, as 'round_commented' only (never 'round_also_commented').
-- ROLLBACK;
```

- [ ] **Step 2: Apply the migration to the test/staging DB**

Run (against a non-prod connection string):

```bash
psql "$TEST_DATABASE_URL" -f supabase/migrations/20260615010000_round_also_commented_notifications.sql
```

Expected: `ALTER TABLE`, `ALTER TABLE`, `CREATE FUNCTION`, `COMMENT` with no errors.

- [ ] **Step 3: Run Part 1 of the verification script**

```bash
psql "$TEST_DATABASE_URL" -f supabase/tests/round_also_commented_verify.sql
```

Expected: every `check` row reads `OK`.

- [ ] **Step 4: Run the Part 2 functional template**

Uncomment Part 2, substitute real ids for a round with the three roles described, run it inside the `BEGIN; ... ROLLBACK;` block, and confirm: `:owner` → `round_commented`, `:prior` → `round_also_commented`, `:actor` → no row.

- [ ] **Step 5: Commit**

```bash
git add supabase/tests/round_also_commented_verify.sql
git commit -m "test(notifications): verification script for round_also_commented"
```

---

## Task 3: Client — notification type enum

**Files:**
- Modify: `src/types/database/enums.ts` (end of the `NotificationType` union, currently ends `| 'round_commented';`)

- [ ] **Step 1: Add the new union member**

Change the tail of the `NotificationType` union from:

```ts
  | 'round_liked'
  | 'round_commented';
```

to:

```ts
  | 'round_liked'
  | 'round_commented'
  | 'round_also_commented';
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS (no new errors). `NotificationItem.tsx` and `notificationHandler.ts` may now report `round_also_commented` as missing in their maps — that is expected and is fixed in Tasks 4–5. If those files key on the union exhaustively, complete Tasks 4–5 before re-running.

- [ ] **Step 3: Commit**

```bash
git add src/types/database/enums.ts
git commit -m "feat(notifications): add round_also_commented to NotificationType"
```

---

## Task 4: Client — NotificationItem render config

**Files:**
- Modify: `src/components/notifications/NotificationItem.tsx` (config map, immediately after the `round_commented` entry)

- [ ] **Step 1: Add the config entry**

After the existing `round_commented` block:

```ts
  round_commented: {
    icon: 'comment-outline',
    getTitle: (_data) => 'New comment',
    getMessage: (data) =>
      `${data.actor_name || 'Someone'} commented on your round${data.comment_preview ? `: "${data.comment_preview}"` : ''}`,
  },
```

add:

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

- [ ] **Step 2: Type-check + lint**

Run: `pnpm type-check && pnpm lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/notifications/NotificationItem.tsx
git commit -m "feat(notifications): render round_also_commented items"
```

---

## Task 5: Client — deep-link mapping

**Files:**
- Modify: `src/services/notifications/notificationHandler.ts` (`NOTIFICATION_SCREEN_MAP`, after the `round_commented` line)

- [ ] **Step 1: Add the mapping**

Change:

```ts
  round_liked: 'RoundActivity',
  round_commented: 'RoundActivity',
```

to:

```ts
  round_liked: 'RoundActivity',
  round_commented: 'RoundActivity',
  round_also_commented: 'RoundActivity',
```

- [ ] **Step 2: Type-check + lint**

Run: `pnpm type-check && pnpm lint`
Expected: PASS — the `NotificationType` map is now exhaustive again.

- [ ] **Step 3: Commit**

```bash
git add src/services/notifications/notificationHandler.ts
git commit -m "feat(notifications): deep-link round_also_commented to RoundActivity"
```

---

## Final verification

- [ ] `pnpm type-check` — PASS
- [ ] `pnpm lint` — PASS
- [ ] Part 1 of `round_also_commented_verify.sql` — all `OK`
- [ ] Part 2 functional template confirms: prior non-participant commenter gets `round_also_commented`, participant-friend gets `round_commented`, nobody gets both, actor gets nothing.
