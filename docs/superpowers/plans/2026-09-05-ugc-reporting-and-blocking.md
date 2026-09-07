# UGC Reporting and Blocking Implementation Plan (Part B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every user a way to report content and block people, and give the operator a way to act on reports, satisfying App Review Guideline 1.2 for a UGC-bearing app.

**Architecture:** Two new tables (`content_reports`, `user_blocks`) plus an `is_blocked_pair()` SQL helper, applied to the same RLS policies Part A already gates. Reporting hides content from the reporter immediately via policy, not local state. Blocking is symmetric and deletes any existing friendship. A word-list filter rejects objectionable comment bodies client-side with a database trigger as the backstop. Reports are actioned from the Supabase dashboard, alerted by an edge function.

**Tech Stack:** Supabase (PostgreSQL + RLS + Edge Functions/Deno + Resend), React Native 0.81.5, TypeScript, TanStack Query, Jest.

**Spec:** `docs/superpowers/specs/2026-09-04-social-media-compliance-design.md` (Part B, §12)

## Status — 2026-09-07

**Tasks 1–10 implemented** (11 including Task 2b). Full suite green (411 suites, 9330 passed,
0 failed), `pnpm verify:gate` PASSED.

Age-gate survival verified per policy after Task 2 recreated them:
`round_comments_select`, `round_photos_select`, `round_likes_select`,
`round_comment_likes_select` each carry `social_enabled` once; `search_players` twice;
the feed RPCs twice, with 6 `is_blocked_pair` and 4 `is_reported_by_viewer`.

Deferred — each needs a human or a database:

| Item | Why it is still open |
|---|---|
| **Run the five migrations** | Authored, NOT applied. Order in the Deployment section. All idempotent. |
| **Populate the word list** | Ships with `slur_example` only, in BOTH `src/utils/contentFilter.ts` and `20260905000200`. The filter does nothing until both are filled in, and they must match. |
| **Deploy `notify-content-report`** | `supabase functions deploy notify-content-report`, `RESEND_API_KEY` already set for `send-support-email`. The Terms' 24-hour promise depends on it. |
| **SQL verification** | The policy-level checks cannot run under jest — see the SQL verification section, run as two real accounts after applying. |
| **End-to-end moderation loop** | Report from a second account, confirm it hides for the reporter and stays visible to others, confirm the email lands, action it from the dashboard. |

## Global Constraints

- **Part A is already implemented on this branch.** Tasks here MUST extend Part A's policies, never replace them. `round_comments_select`, `round_photos_select`, `round_likes_select`, `round_comment_likes_select` and `search_players()` already carry `social_enabled()`. Dropping and recreating one without re-adding that predicate silently removes the under-13 gate.
- **Migrations are authored, not applied.** Sam runs them by hand in the Supabase SQL editor. Every migration must be idempotent and safe to re-run.
- **`friendships.status` already allows `'blocked'`** and `src/hooks/friends/mutations.ts:52` reads it. That is legacy with no UI behind it. `user_blocks` is the sole source of truth for blocking; do NOT repurpose the status value, and do not remove the existing check.
- **No count-based auto-takedown.** Reporting hides content from the reporter only. Global removal is an operator decision. Inside friend groups a threshold auto-hide is trivially abusable as a censorship button.
- **Blocking deletes the friendship.** Without this the blocked user keeps round visibility through `is_friend()` and keeps appearing in the activity feed.
- **Do NOT put `is_blocked_pair()` inside `can_view_round()`** — same rule as Part A's `social_enabled()`. That helper is shared with round-visibility logic.
- Import shared components from their module path, not the `@/components/common` barrel. Several suites partially mock that barrel, which makes un-stubbed exports `undefined` and throws at render. (This cost four suites in Part A.)
- Verification commands: `pnpm type-check`, `pnpm lint`, `pnpm test`, `pnpm verify:gate`. Never pipe them through `tail` before `&&` — the pipe returns tail's exit code and masks failures.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/20260905000000_ugc_moderation_schema.sql` | `content_reports`, `user_blocks`, `is_blocked_pair()`, RLS on the new tables |
| `supabase/migrations/20260905000100_ugc_moderation_policies.sql` | Extends Part A's policies with report/block predicates; `search_players` update |
| `supabase/migrations/20260905000150_ugc_moderation_feed.sql` | Filters blocked/reported rows inside the SECURITY DEFINER feed RPCs, which bypass RLS |
| `supabase/migrations/20260905000200_ugc_content_filter.sql` | `contains_blocked_terms()` + `round_comments` insert trigger |
| `supabase/migrations/20260905000300_ugc_moderation_ops.sql` | `pending_reports` view, `moderate_content()` RPC |
| `src/utils/contentFilter.ts` | Shared word-list check, used client-side and mirrored in SQL |
| `src/hooks/moderation/useReportContent.ts` | Report mutation + cache invalidation |
| `src/hooks/moderation/useBlockUser.ts` | Block/unblock mutations, friendship deletion |
| `src/hooks/moderation/useBlockedUsers.ts` | Blocked list for the management screen |
| `src/components/moderation/ReportSheet.tsx` | Reason picker + optional note |
| `src/components/moderation/ReportAction.tsx` | Reusable overflow trigger for a reportable item |
| `src/screens/profile/BlockedUsersScreen.tsx` | Review and undo blocks |
| `supabase/functions/notify-content-report/index.ts` | Emails the operator on each new report |

---

### Task 1: Moderation schema

**Files:**
- Create: `supabase/migrations/20260905000000_ugc_moderation_schema.sql`

**Interfaces:**
- Consumes: nothing
- Produces (relied on by every later task):
  - `content_reports(id, reporter_id, content_type, content_id, author_id, reason, note, status, created_at, resolved_at)`
  - `user_blocks(blocker_id, blocked_id, created_at)`
  - `is_blocked_pair(a UUID, b UUID) RETURNS BOOLEAN`
  - `is_reported_by_viewer(p_type TEXT, p_id UUID) RETURNS BOOLEAN`
  - `block_user(p_blocked UUID) RETURNS VOID` — inserts the block and deletes any friendship
  - `report_content(p_content_type TEXT, p_content_id UUID, p_author UUID, p_reason TEXT, p_note TEXT) RETURNS VOID`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260905000000_ugc_moderation_schema.sql
-- UGC moderation: reports and blocks (App Review Guideline 1.2).
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS content_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('round_comment', 'round_photo', 'player')),
  content_id   UUID NOT NULL,
  -- Denormalised so a takedown decision survives the author deleting their account.
  author_id    UUID REFERENCES players(id) ON DELETE SET NULL,
  reason       TEXT NOT NULL CHECK (reason IN ('offensive', 'harassment', 'spam', 'nudity', 'other')),
  note         TEXT CHECK (note IS NULL OR char_length(note) <= 500),
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'actioned', 'dismissed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ,
  -- Makes reporting idempotent: a user cannot inflate a count by tapping twice.
  CONSTRAINT content_reports_once_per_reporter UNIQUE (reporter_id, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_content_reports_open
  ON content_reports (created_at DESC) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_content_reports_by_reporter
  ON content_reports (reporter_id, content_type, content_id);

CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT user_blocks_no_self CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks (blocked_id);

ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks     ENABLE ROW LEVEL SECURITY;

-- Reporters see and create only their own reports. Nobody reads anyone else's:
-- the operator works through the dashboard with the service role.
DROP POLICY IF EXISTS content_reports_select_own ON content_reports;
CREATE POLICY content_reports_select_own ON content_reports FOR SELECT
  TO authenticated USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS content_reports_insert_own ON content_reports;
CREATE POLICY content_reports_insert_own ON content_reports FOR INSERT
  TO authenticated WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS user_blocks_select_own ON user_blocks;
CREATE POLICY user_blocks_select_own ON user_blocks FOR SELECT
  TO authenticated USING (blocker_id = auth.uid());

DROP POLICY IF EXISTS user_blocks_delete_own ON user_blocks;
CREATE POLICY user_blocks_delete_own ON user_blocks FOR DELETE
  TO authenticated USING (blocker_id = auth.uid());

-- Blocking is symmetric in effect: neither party sees the other.
CREATE OR REPLACE FUNCTION is_blocked_pair(a UUID, b UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = a AND blocked_id = b)
       OR (blocker_id = b AND blocked_id = a)
  );
$$;

-- Reporting hides content from the reporter. This is a SECURITY DEFINER helper
-- rather than an inline NOT EXISTS in each policy, matching can_view_round(),
-- social_enabled() and is_blocked_pair(). That is not stylistic: nesting RLS
-- evaluation of one table inside another table's policy is how this repo got
-- its rounds <-> scorecards recursion bug (see 20250111000000_fix_rls_recursion
-- and the warning in 20260521000000).
CREATE OR REPLACE FUNCTION is_reported_by_viewer(p_type TEXT, p_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM content_reports
    WHERE reporter_id = auth.uid()
      AND content_type = p_type
      AND content_id = p_id
  );
$$;

COMMENT ON FUNCTION is_blocked_pair IS
  'True when either user has blocked the other. Applied per policy.
   NEVER call this from can_view_round() - that helper is shared with round
   visibility logic and gating it there breaks scorecard access.';

-- Blocking must also sever the friendship, or the blocked user keeps round
-- visibility through is_friend() and keeps appearing in the activity feed.
CREATE OR REPLACE FUNCTION block_user(p_blocked UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_blocked = auth.uid() THEN
    RAISE EXCEPTION 'Cannot block yourself' USING ERRCODE = '22023';
  END IF;

  INSERT INTO user_blocks (blocker_id, blocked_id)
  VALUES (auth.uid(), p_blocked)
  ON CONFLICT DO NOTHING;

  DELETE FROM friendships
  WHERE (requester_id = auth.uid() AND addressee_id = p_blocked)
     OR (requester_id = p_blocked AND addressee_id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION report_content(
  p_content_type TEXT,
  p_content_id   UUID,
  p_author       UUID,
  p_reason       TEXT,
  p_note         TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO content_reports (reporter_id, content_type, content_id, author_id, reason, note)
  VALUES (auth.uid(), p_content_type, p_content_id, p_author, p_reason, p_note)
  ON CONFLICT ON CONSTRAINT content_reports_once_per_reporter DO NOTHING
  RETURNING id INTO v_id;

  -- On a duplicate report return the EXISTING id rather than NULL, so a
  -- double-tap stays idempotent without looking like a failure to the caller.
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM content_reports
    WHERE reporter_id = auth.uid()
      AND content_type = p_content_type
      AND content_id = p_content_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION is_blocked_pair(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_reported_by_viewer(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION block_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION report_content(TEXT, UUID, UUID, TEXT, TEXT) TO authenticated;
```

- [ ] **Step 2: Verify structure without applying**

```bash
grep -c "CREATE TABLE IF NOT EXISTS" supabase/migrations/20260905000000_ugc_moderation_schema.sql   # expect 2
grep -o '\$\$' supabase/migrations/20260905000000_ugc_moderation_schema.sql | wc -l                 # expect 8 (4 functions)
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260905000000_ugc_moderation_schema.sql
git commit -m "feat(moderation): add content_reports and user_blocks schema"
```

---

### Task 2: Apply report and block predicates to the existing policies

⚠️ **The highest-risk task in this plan.** These policies already carry Part A's `social_enabled()`. Recreating one without it silently removes the under-13 gate while every test still passes.

**Files:**
- Create: `supabase/migrations/20260905000100_ugc_moderation_policies.sql`

**Interfaces:**
- Consumes: `is_blocked_pair()` (Task 1), `social_enabled()` (Part A)
- Produces: no new callable surface; `search_players()` gains block filtering

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260905000100_ugc_moderation_policies.sql
-- Applies report/block visibility to the social tables.
--
-- ⚠️ Each policy below reproduces Part A's social_enabled() predicate. Removing
-- it would silently drop the under-13 gate. The composed rule is:
--   social_enabled() AND NOT blocked AND NOT reported-by-viewer
--
-- Safe to re-run.

DROP POLICY IF EXISTS round_comments_select ON round_comments;
CREATE POLICY round_comments_select ON round_comments FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND social_enabled()
    AND can_view_round(round_id)
    AND NOT is_blocked_pair(auth.uid(), author_id)
    AND NOT is_reported_by_viewer('round_comment', round_comments.id)
  );

DROP POLICY IF EXISTS round_photos_select ON round_photos;
CREATE POLICY round_photos_select ON round_photos FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND social_enabled()
    AND can_view_round(round_id)
    AND NOT is_blocked_pair(auth.uid(), uploader_id)
    AND NOT is_reported_by_viewer('round_photo', round_photos.id)
  );

DROP POLICY IF EXISTS round_likes_select ON round_likes;
CREATE POLICY round_likes_select ON round_likes FOR SELECT
  TO authenticated
  USING (
    social_enabled()
    AND can_view_round(round_id)
    AND NOT is_blocked_pair(auth.uid(), player_id)
  );

DROP POLICY IF EXISTS round_comment_likes_select ON round_comment_likes;
CREATE POLICY round_comment_likes_select ON round_comment_likes FOR SELECT
  TO authenticated
  USING (
    social_enabled()
    AND NOT is_blocked_pair(auth.uid(), player_id)
  );

-- Neither party can send the other a friend request.
DROP POLICY IF EXISTS "Users can send friend requests" ON friendships;
CREATE POLICY "Users can send friend requests" ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = requester_id
    AND social_enabled(requester_id)
    AND social_enabled(addressee_id)
    AND NOT is_blocked_pair(requester_id, addressee_id)
  );

-- Blocked users disappear from search. Reproduces Part A's definition with one
-- added predicate; the explicit column list stays (SECURITY DEFINER bypasses
-- RLS, so SELECT p.* would leak email and phone).
CREATE OR REPLACE FUNCTION search_players(p_query TEXT)
RETURNS TABLE (
  id        UUID,
  name      TEXT,
  photo_url TEXT,
  handicap  NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT p.id, p.name::TEXT, p.photo_url::TEXT, p.handicap
  FROM players p
  WHERE social_enabled()
    AND social_enabled(p.id)
    AND p.id <> auth.uid()
    AND p.is_placeholder IS NOT TRUE
    AND NOT is_blocked_pair(auth.uid(), p.id)
    AND p.name ILIKE '%' || p_query || '%'
  ORDER BY p.name
  LIMIT 25;
$$;
```

- [ ] **Step 2: Verify Part A's gate survived**

Every recreated policy must still mention `social_enabled`. This grep is the guard against the failure mode described above:

```bash
grep -c "social_enabled" supabase/migrations/20260905000100_ugc_moderation_policies.sql
```

Expected: **10**. Rather than trusting a single total, check each recreated policy carries it:

```bash
for pol in round_comments_select round_photos_select round_likes_select round_comment_likes_select; do
  printf '%s: ' "$pol"
  awk "/CREATE POLICY $pol /,/;/" supabase/migrations/20260905000100_ugc_moderation_policies.sql \
    | grep -c social_enabled
done
```

Expected: `1` for every one. A zero anywhere means Part A's under-13 gate was silently dropped
from that policy, and no test will tell you.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260905000100_ugc_moderation_policies.sql
git commit -m "feat(moderation): hide reported and blocked content in RLS"
```

---

### Task 2b: Filter blocked and reported content out of the feed RPCs

⚠️ **Added after plan review — the policies in Task 2 do not cover this.**

`get_activity_feed` and `get_round_feed_card` are `SECURITY DEFINER`, which **bypasses RLS**.
They read the social tables directly in subqueries, so without this task a blocked user's
photos still appear in your feed card and their comments and likes still count toward the
totals. Part A got away with the same shape because it gated the feed at the top level (zero
rows for a restricted user); blocking and reporting need per-row filtering *inside* the
subqueries.

Without this task, you can block someone and still see their photos on every shared round —
the feature does not work.

**Files:**
- Create: `supabase/migrations/20260905000150_ugc_moderation_feed.sql`

**Interfaces:**
- Consumes: `is_blocked_pair()`, `is_reported_by_viewer()` (Task 1)
- Produces: no new callable surface

- [ ] **Step 1: Reproduce both RPCs with the subqueries filtered**

Extract both function bodies verbatim from their current definition in
`supabase/migrations/20260904000100_age_gate_policies.sql` — do **not** retype them; they are
long and one dropped predicate silently removes Part A's age gate. Then apply exactly these
four edits to each function (the aliases are `vr` in `get_activity_feed` and `r` in
`get_round_feed_card`; everything else is identical):

```sql
-- 1. photos: exclude blocked uploaders and anything the viewer reported
      FROM round_photos ph
      WHERE ph.round_id = vr.id AND ph.deleted_at IS NULL
        AND NOT is_blocked_pair(auth.uid(), ph.uploader_id)
        AND NOT is_reported_by_viewer('round_photo', ph.id)

-- 2. like_count
    (SELECT COUNT(*) FROM round_likes rl
      WHERE rl.round_id = vr.id
        AND NOT is_blocked_pair(auth.uid(), rl.player_id))::INT,

-- 3. comment_count
    (SELECT COUNT(*) FROM round_comments rc
      WHERE rc.round_id = vr.id AND rc.deleted_at IS NULL
        AND NOT is_blocked_pair(auth.uid(), rc.author_id)
        AND NOT is_reported_by_viewer('round_comment', rc.id))::INT,

-- 4. viewer_has_liked is the viewer's OWN like, so it needs no filtering.
--    Left unchanged deliberately - do not "tidy" it by adding a predicate.
```

The `participants` subquery is **not** filtered: it lists who played the round, which is a
fact about the round rather than user-generated content, and blanking a playing partner out
of a scorecard would be wrong.

- [ ] **Step 2: Verify the bodies came across intact**

```bash
F=supabase/migrations/20260905000150_ugc_moderation_feed.sql
# Strip comment lines first: the migration header names both helpers, which
# otherwise inflates each count by one and looks like an extra predicate.
SQL=$(grep -v '^[[:space:]]*--' $F)
grep -c "social_enabled()"        <<<"$SQL"   # expect 2 - one per RPC, Part A's gate preserved
grep -c "is_blocked_pair"         <<<"$SQL"   # expect 6 - photos + likes + comments, x two RPCs
grep -c "is_reported_by_viewer"   <<<"$SQL"   # expect 4 - photos + comments, x two RPCs
grep -o '\$\$' $F | wc -l                     # expect 4 - two functions
```

If `social_enabled()` is not exactly 2, Part A's age gate was lost in the copy and the feed
is now open to under-13 accounts.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260905000150_ugc_moderation_feed.sql
git commit -m "feat(moderation): filter blocked and reported content from feed RPCs"
```

---

### Task 3: Content filter

**Files:**
- Create: `src/utils/contentFilter.ts`
- Create: `supabase/migrations/20260905000200_ugc_content_filter.sql`
- Test: `src/__tests__/utils/contentFilter.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `containsBlockedTerms(text: string): boolean`, `BLOCKED_TERMS: readonly string[]`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/utils/contentFilter.test.ts
import { containsBlockedTerms } from '@/utils/contentFilter';

describe('containsBlockedTerms', () => {
  it('accepts ordinary golf chat', () => {
    expect(containsBlockedTerms('Great round mate, that putt on 17 was filthy')).toBe(false);
  });

  it('accepts an empty string', () => {
    expect(containsBlockedTerms('')).toBe(false);
  });

  it('rejects a blocked term regardless of case', () => {
    expect(containsBlockedTerms('you are a SLUR_EXAMPLE')).toBe(true);
    expect(containsBlockedTerms('slur_example')).toBe(true);
  });

  it('matches on word boundaries, not substrings', () => {
    // "scunthorpe problem": a term embedded in an innocent word must not match.
    expect(containsBlockedTerms('assess the lie before you swing')).toBe(false);
  });

  it('catches a term surrounded by punctuation', () => {
    expect(containsBlockedTerms('what a slur_example!')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test --testPathPattern='contentFilter'
```

Expected: FAIL — cannot resolve `@/utils/contentFilter`.

- [ ] **Step 3: Write the implementation**

```ts
// src/utils/contentFilter.ts

/**
 * Word list for the Guideline 1.2 "filter objectionable material" requirement.
 *
 * Deliberately a simple list, not classification. The goal is a good-faith
 * filter on the way in; anything it misses is caught by reporting.
 *
 * SLUR_EXAMPLE is a placeholder kept so the tests are readable and the file can
 * be reviewed without shipping slurs in the diff. Replace with a real list
 * before submission — see the note in the Deployment section of the plan.
 *
 * ⚠️ MUST be kept in sync with contains_blocked_terms() in
 * supabase/migrations/20260905000200_ugc_content_filter.sql. This check is UX
 * (it stops an honest user before they post); the database trigger is the
 * enforcement, because a modified client can skip this one entirely.
 */
export const BLOCKED_TERMS: readonly string[] = ['slur_example'];

/** Escapes regex metacharacters so terms are matched literally. */
function escapeRegex(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Whether the text contains a blocked term as a whole word.
 *
 * Word-boundary matched so an innocent word containing a term as a substring
 * is not rejected.
 */
export function containsBlockedTerms(text: string): boolean {
  if (!text) return false;
  return BLOCKED_TERMS.some((term) =>
    new RegExp(`\\b${escapeRegex(term)}\\b`, 'i').test(text)
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm test --testPathPattern='contentFilter'
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Write the database backstop**

The client check can be bypassed by a modified client, so the same list is enforced at insert.

```sql
-- supabase/migrations/20260905000200_ugc_content_filter.sql
-- Server-side backstop for the comment content filter.
--
-- ⚠️ The term list here MUST match BLOCKED_TERMS in src/utils/contentFilter.ts.
-- This trigger is the enforcement (a modified client can skip the TS check);
-- the TS check exists so an honest user is stopped before they post rather than
-- getting a database error. Update both together or the filter is inconsistent.
--
-- Safe to re-run.

CREATE OR REPLACE FUNCTION contains_blocked_terms(p_text TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
AS $$
  SELECT p_text ~* '\m(slur_example)\M';
$$;

CREATE OR REPLACE FUNCTION reject_blocked_comment()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$
BEGIN
  IF contains_blocked_terms(NEW.body) THEN
    RAISE EXCEPTION 'Comment contains content that is not allowed'
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reject_blocked_comment_before_insert ON round_comments;
CREATE TRIGGER reject_blocked_comment_before_insert
  BEFORE INSERT OR UPDATE OF body ON round_comments
  FOR EACH ROW EXECUTE FUNCTION reject_blocked_comment();
```

- [ ] **Step 6: Commit**

```bash
git add src/utils/contentFilter.ts src/__tests__/utils/contentFilter.test.ts supabase/migrations/20260905000200_ugc_content_filter.sql
git commit -m "feat(moderation): add content filter with database backstop"
```

---

### Task 4: Moderation hooks

**Files:**
- Create: `src/hooks/moderation/useReportContent.ts`
- Create: `src/hooks/moderation/useBlockUser.ts`
- Create: `src/hooks/moderation/useBlockedUsers.ts`
- Create: `src/hooks/moderation/index.ts`
- Test: `src/__tests__/hooks/moderation/useBlockUser.test.tsx`

**Interfaces:**
- Consumes: `report_content()`, `block_user()`, `user_blocks` (Task 1)
- Produces:
  - `useReportContent(): { report: (input: ReportInput) => Promise<void>; isReporting: boolean }`
  - `type ReportInput = { contentType: 'round_comment' | 'round_photo' | 'player'; contentId: string; authorId: string | null; reason: ReportReason; note?: string }`
  - `type ReportReason = 'offensive' | 'harassment' | 'spam' | 'nudity' | 'other'`
  - `useBlockUser(): { block: (playerId: string) => Promise<void>; unblock: (playerId: string) => Promise<void>; isBusy: boolean }`
  - `useBlockedUsers(): { data: BlockedUser[] | undefined; isLoading: boolean }` where `BlockedUser = { blocked_id: string; created_at: string; player: { id: string; name: string; photo_url: string | null } | null }`

- [ ] **Step 1: Write the failing test**

```tsx
// src/__tests__/hooks/moderation/useBlockUser.test.tsx
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useBlockUser } from '@/hooks/moderation/useBlockUser';

const mockRpc = jest.fn();
const mockDelete = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: () => ({
      delete: () => ({ match: (...a: unknown[]) => mockDelete(...a) }),
    }),
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useBlockUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRpc.mockResolvedValue({ error: null });
    mockDelete.mockResolvedValue({ error: null });
  });

  // Blocking goes through the RPC because it must also delete the friendship;
  // a plain insert into user_blocks would leave the blocked user visible in the
  // feed through is_friend().
  it('blocks through the block_user RPC', async () => {
    const { result } = renderHook(() => useBlockUser(), { wrapper });
    await act(async () => {
      await result.current.block('player-2');
    });
    expect(mockRpc).toHaveBeenCalledWith('block_user', { p_blocked: 'player-2' });
  });

  it('throws when the RPC fails, so callers can surface it', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'nope' } });
    const { result } = renderHook(() => useBlockUser(), { wrapper });
    await expect(result.current.block('player-2')).rejects.toBeDefined();
  });

  it('unblocks by deleting the row, not through the RPC', async () => {
    const { result } = renderHook(() => useBlockUser(), { wrapper });
    await act(async () => {
      await result.current.unblock('player-2');
    });
    expect(mockDelete).toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalledWith('block_user', expect.anything());
  });

  it('reports busy state while a block is in flight', async () => {
    const { result } = renderHook(() => useBlockUser(), { wrapper });
    expect(result.current.isBusy).toBe(false);
    await act(async () => {
      await result.current.block('player-2');
    });
    await waitFor(() => expect(result.current.isBusy).toBe(false));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test --testPathPattern='moderation/useBlockUser'
```

Expected: FAIL — cannot resolve `@/hooks/moderation/useBlockUser`.

- [ ] **Step 3: Write the hooks**

```ts
// src/hooks/moderation/useBlockUser.ts
import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/services/supabase/client';

/**
 * Block and unblock other players.
 *
 * Blocking goes through the block_user RPC rather than a direct insert: it must
 * also delete any existing friendship, or the blocked user keeps round
 * visibility via is_friend() and keeps appearing in the activity feed.
 *
 * Unblocking is a plain delete. It does NOT restore the deleted friendship.
 */
export function useBlockUser() {
  const queryClient = useQueryClient();
  const [isBusy, setIsBusy] = useState(false);

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
    await queryClient.invalidateQueries({ queryKey: ['friends'] });
    await queryClient.invalidateQueries({ queryKey: ['activity'] });
  }, [queryClient]);

  const block = useCallback(
    async (playerId: string) => {
      setIsBusy(true);
      try {
        // `as any`: block_user is absent from the generated database types until
        // 20260905000000 is applied and types are regenerated.
        const { error } = await (supabase as any).rpc('block_user', { p_blocked: playerId });
        if (error) throw error;
        await invalidate();
      } finally {
        setIsBusy(false);
      }
    },
    [invalidate]
  );

  const unblock = useCallback(
    async (playerId: string) => {
      setIsBusy(true);
      try {
        const { error } = await (supabase as any)
          .from('user_blocks')
          .delete()
          .match({ blocked_id: playerId });
        if (error) throw error;
        await invalidate();
      } finally {
        setIsBusy(false);
      }
    },
    [invalidate]
  );

  return { block, unblock, isBusy };
}
```

```ts
// src/hooks/moderation/useReportContent.ts
import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/services/supabase/client';

export type ReportReason = 'offensive' | 'harassment' | 'spam' | 'nudity' | 'other';

export interface ReportInput {
  contentType: 'round_comment' | 'round_photo' | 'player';
  contentId: string;
  authorId: string | null;
  reason: ReportReason;
  note?: string;
}

/**
 * Report a comment, photo or player.
 *
 * The content disappears for the reporter immediately because the RLS policies
 * exclude anything they have reported — so the invalidation below is what makes
 * the change visible, not local state. It stays hidden across devices and
 * reinstalls.
 */
export function useReportContent() {
  const queryClient = useQueryClient();
  const [isReporting, setIsReporting] = useState(false);

  const report = useCallback(
    async (input: ReportInput) => {
      setIsReporting(true);
      try {
        const { error } = await (supabase as any).rpc('report_content', {
          p_content_type: input.contentType,
          p_content_id: input.contentId,
          p_author: input.authorId,
          p_reason: input.reason,
          p_note: input.note ?? null,
        });
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ['activity'] });
      } finally {
        setIsReporting(false);
      }
    },
    [queryClient]
  );

  return { report, isReporting };
}
```

```ts
// src/hooks/moderation/useBlockedUsers.ts
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/services/supabase/client';
import { CACHE_TIMES } from '@/constants/cacheConfig';

export interface BlockedUser {
  blocked_id: string;
  created_at: string;
  player: { id: string; name: string; photo_url: string | null } | null;
}

/** The blocked list backing the management screen. */
export function useBlockedUsers() {
  return useQuery({
    queryKey: ['blocked-users'],
    queryFn: async (): Promise<BlockedUser[]> => {
      const { data, error } = await (supabase as any)
        .from('user_blocks')
        .select('blocked_id, created_at, player:players!user_blocks_blocked_id_fkey(id, name, photo_url)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as BlockedUser[];
    },
    staleTime: CACHE_TIMES.MODERATE,
  });
}
```

```ts
// src/hooks/moderation/index.ts
export { useReportContent } from './useReportContent';
export type { ReportInput, ReportReason } from './useReportContent';
export { useBlockUser } from './useBlockUser';
export { useBlockedUsers } from './useBlockedUsers';
export type { BlockedUser } from './useBlockedUsers';
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm test --testPathPattern='moderation/useBlockUser'
pnpm type-check > /tmp/tc.log 2>&1; echo "exit=$?"
```

Expected: PASS, 4 tests; type-check exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/moderation src/__tests__/hooks/moderation
git commit -m "feat(moderation): add report and block hooks"
```

---

### Task 5: ReportSheet

**Files:**
- Create: `src/components/moderation/ReportSheet.tsx`
- Create: `src/components/moderation/index.ts`
- Test: `src/__tests__/components/moderation/ReportSheet.test.tsx`

**Interfaces:**
- Consumes: `ReportReason` (Task 4)
- Produces: `<ReportSheet visible onSubmit={(reason, note) => Promise<void>} onDismiss />`

- [ ] **Step 1: Write the failing test**

```tsx
// src/__tests__/components/moderation/ReportSheet.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import { ReportSheet } from '@/components/moderation/ReportSheet';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    textPrimary: '#000', textSecondary: '#666', primary: '#2563eb',
    surface: '#fff', border: '#ddd', background: '#fff', white: '#fff', error: '#f00',
  }),
}));

describe('ReportSheet', () => {
  it('renders nothing when hidden', () => {
    const { toJSON } = render(
      <ReportSheet visible={false} onSubmit={jest.fn()} onDismiss={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });

  it('collects an optional note', () => {
    render(<ReportSheet visible onSubmit={jest.fn()} onDismiss={jest.fn()} />);
    expect(screen.getByLabelText('Add detail (optional)')).toBeTruthy();
  });

  it('offers every reason', () => {
    render(<ReportSheet visible onSubmit={jest.fn()} onDismiss={jest.fn()} />);
    ['Offensive', 'Harassment', 'Spam', 'Nudity', 'Other'].forEach((label) => {
      expect(screen.getByText(label)).toBeTruthy();
    });
  });

  it('submits the chosen reason', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<ReportSheet visible onSubmit={onSubmit} onDismiss={jest.fn()} />);
    fireEvent.press(screen.getByText('Harassment'));
    fireEvent.press(screen.getByText('Report'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('harassment', undefined));
  });

  it('passes an optional note through', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<ReportSheet visible onSubmit={onSubmit} onDismiss={jest.fn()} />);
    fireEvent.press(screen.getByText('Other'));
    fireEvent.changeText(screen.getByLabelText('Add detail (optional)'), 'targeted abuse');
    fireEvent.press(screen.getByText('Report'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('other', 'targeted abuse'));
  });

  it('sends undefined rather than an empty string when the note is blank', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<ReportSheet visible onSubmit={onSubmit} onDismiss={jest.fn()} />);
    fireEvent.press(screen.getByText('Spam'));
    fireEvent.changeText(screen.getByLabelText('Add detail (optional)'), '   ');
    fireEvent.press(screen.getByText('Report'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('spam', undefined));
  });

  it('does not submit until a reason is chosen', () => {
    const onSubmit = jest.fn();
    render(<ReportSheet visible onSubmit={onSubmit} onDismiss={jest.fn()} />);
    fireEvent.press(screen.getByText('Report'));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test --testPathPattern='ReportSheet'
```

Expected: FAIL — cannot resolve `@/components/moderation/ReportSheet`.

- [ ] **Step 3: Write the component**

```tsx
// src/components/moderation/ReportSheet.tsx
import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Text } from 'react-native-paper';

import { BottomSheet } from '@/components/common/BottomSheet/BottomSheet';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography } from '@/constants/theme';
import type { ReportReason } from '@/hooks/moderation';

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'offensive', label: 'Offensive' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'spam', label: 'Spam' },
  { value: 'nudity', label: 'Nudity' },
  { value: 'other', label: 'Other' },
];

export interface ReportSheetProps {
  visible: boolean;
  onSubmit: (reason: ReportReason, note?: string) => Promise<void>;
  onDismiss: () => void;
}

export function ReportSheet({ visible, onSubmit, onDismiss }: ReportSheetProps) {
  const colors = useThemeColors();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!reason) return;
    setIsBusy(true);
    try {
      // Blank or whitespace-only becomes undefined rather than an empty string,
      // so the column stores NULL and the operator email omits the line.
      await onSubmit(reason, note.trim() || undefined);
      onDismiss();
    } finally {
      setIsBusy(false);
    }
  }, [reason, note, onSubmit, onDismiss]);

  if (!visible) return null;

  return (
    <BottomSheet visible={visible} onClose={onDismiss} height={0.6} showHandle useModal>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Report content</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          It will be hidden from you straight away and reviewed within 24 hours.
        </Text>

        {REASONS.map((r) => (
          <TouchableOpacity
            key={r.value}
            style={[
              styles.reason,
              {
                borderColor: reason === r.value ? colors.primary : colors.border,
                backgroundColor: colors.surface,
              },
            ]}
            onPress={() => setReason(r.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: reason === r.value }}
          >
            <Text style={{ ...typography.body, color: colors.textPrimary }}>{r.label}</Text>
          </TouchableOpacity>
        ))}

        <TextInput
          style={[
            styles.note,
            { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface },
          ]}
          value={note}
          onChangeText={setNote}
          placeholder="Add detail (optional)"
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel="Add detail (optional)"
          multiline
          maxLength={500}
        />

        <TouchableOpacity
          style={[
            styles.submit,
            { backgroundColor: reason ? colors.error : colors.border },
          ]}
          onPress={handleSubmit}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel="Submit report"
        >
          <Text style={{ ...typography.bodyBold, color: colors.white }}>
            {isBusy ? 'Reporting…' : 'Report'}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.sm },
  title: { ...typography.h3 },
  body: { ...typography.body, marginBottom: spacing.sm },
  reason: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  note: {
    marginTop: spacing.sm,
    minHeight: 64,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    textAlignVertical: 'top',
  },
  submit: {
    marginTop: spacing.md,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

```ts
// src/components/moderation/index.ts
export { ReportSheet } from './ReportSheet';
export type { ReportSheetProps } from './ReportSheet';
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm test --testPathPattern='ReportSheet'
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/moderation src/__tests__/components/moderation
git commit -m "feat(moderation): add ReportSheet"
```

---

### Task 6: Report action on comments and photos

**Files:**
- Modify: `src/components/activity/RoundComments.tsx` (the `isOwn` branch at ~line 100 gains an `else`)
- Modify: `src/components/activity/RoundPhotoViewer.tsx`
- Test: `src/__tests__/components/activity/RoundCommentsReport.test.tsx`

**Interfaces:**
- Consumes: `useReportContent` (Task 4), `ReportSheet` (Task 5)
- Produces: no new exports

- [ ] **Step 1: Write the failing test**

```tsx
// src/__tests__/components/activity/RoundCommentsReport.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import { RoundComments } from '@/components/activity/RoundComments';

const mockReport = jest.fn().mockResolvedValue(undefined);
jest.mock('@/hooks/moderation', () => ({
  useReportContent: () => ({ report: mockReport, isReporting: false }),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'me' } }),
}));

jest.mock('@/hooks/activity', () => ({
  useRoundComments: () => ({
    data: [
      { id: 'c1', author_id: 'someone-else', body: 'nice round', created_at: new Date().toISOString(), author: { name: 'Alex', photo_url: null } },
      { id: 'c2', author_id: 'me', body: 'thanks', created_at: new Date().toISOString(), author: { name: 'Me', photo_url: null } },
    ],
    isLoading: false,
  }),
  useDeleteComment: () => ({ mutateAsync: jest.fn() }),
  useLikeComment: () => ({ mutateAsync: jest.fn() }),
  useUnlikeComment: () => ({ mutateAsync: jest.fn() }),
}));

describe('RoundComments reporting', () => {
  beforeEach(() => jest.clearAllMocks());

  it("offers Report on another person's comment", () => {
    render(<RoundComments roundId="r1" />);
    expect(screen.getByLabelText('Report comment by Alex')).toBeTruthy();
  });

  // You can already delete your own comment; offering to report it as well is
  // noise, and self-reports would pollute the operator's queue.
  it('does not offer Report on your own comment', () => {
    render(<RoundComments roundId="r1" />);
    expect(screen.queryByLabelText('Report comment by Me')).toBeNull();
  });

  it('reports the comment with the chosen reason', async () => {
    render(<RoundComments roundId="r1" />);
    fireEvent.press(screen.getByLabelText('Report comment by Alex'));
    fireEvent.press(screen.getByText('Spam'));
    fireEvent.press(screen.getByText('Report'));
    await waitFor(() =>
      expect(mockReport).toHaveBeenCalledWith({
        contentType: 'round_comment',
        contentId: 'c1',
        authorId: 'someone-else',
        reason: 'spam',
        note: undefined,
      })
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test --testPathPattern='RoundCommentsReport'
```

Expected: FAIL — no element with label `Report comment by Alex`.

- [ ] **Step 3: Add the report action to comments**

In `RoundComments.tsx`, the comment row already renders a delete button inside `{isOwn ? (...) : null}`. Change that to a ternary with a report action in the `else` branch:

```tsx
{isOwn ? (
  <TouchableOpacity
    onPress={() => confirmDelete(comment)}
    accessibilityRole="button"
    accessibilityLabel="Delete comment"
    hitSlop={8}
  >
    <Icon source="trash-can-outline" size={16} color={colors.textSecondary} />
  </TouchableOpacity>
) : (
  <TouchableOpacity
    onPress={() => setReporting(comment)}
    accessibilityRole="button"
    accessibilityLabel={`Report comment by ${comment.author?.name ?? 'Player'}`}
    hitSlop={8}
  >
    <Icon source="flag-outline" size={16} color={colors.textSecondary} />
  </TouchableOpacity>
)}
```

Add the state and sheet to the component:

```tsx
const [reporting, setReporting] = useState<{ id: string; author_id: string } | null>(null);
const { report } = useReportContent();

const handleReport = useCallback(
  async (reason: ReportReason, note?: string) => {
    if (!reporting) return;
    await report({
      contentType: 'round_comment',
      contentId: reporting.id,
      authorId: reporting.author_id,
      reason,
      note,
    });
    setReporting(null);
  },
  [reporting, report]
);
```

and render `<ReportSheet visible={reporting !== null} onSubmit={handleReport} onDismiss={() => setReporting(null)} />` at the end of the returned tree.

Import from module paths, not the `@/components/common` barrel:

```tsx
import { ReportSheet } from '@/components/moderation/ReportSheet';
import { useReportContent, type ReportReason } from '@/hooks/moderation';
```

- [ ] **Step 4: Add the same action to the photo viewer**

`RoundPhotoViewer` takes `{ photos, index, onClose }`, and `visible` is `index !== null`. Add
the report control to its chrome, keyed off the currently-shown photo:

```tsx
const current = index !== null ? photos[index] : null;
const [isReporting, setIsReporting] = useState(false);
const { report } = useReportContent();

const handleReport = useCallback(
  async (reason: ReportReason, note?: string) => {
    if (!current) return;
    await report({
      contentType: 'round_photo',
      contentId: current.id,
      authorId: current.uploader_id ?? null,
      reason,
      note,
    });
    setIsReporting(false);
    onClose(); // the photo is now hidden from this viewer, so the frame is stale
  },
  [current, report, onClose]
);
```

Render the trigger beside the existing close control:

```tsx
<TouchableOpacity
  onPress={() => setIsReporting(true)}
  accessibilityRole="button"
  accessibilityLabel="Report photo"
  hitSlop={8}
>
  <Icon source="flag-outline" size={20} color="#fff" />
</TouchableOpacity>
```

and `<ReportSheet visible={isReporting} onSubmit={handleReport} onDismiss={() => setIsReporting(false)} />`
at the end of the returned tree.

⚠️ If `RoundPhotoViewerPhoto` does not carry `uploader_id`, add it to that type and to the
query that populates it. The report row needs the author, and denormalising it onto
`content_reports` is what lets a takedown survive the author deleting their account.

- [ ] **Step 5: Run the tests**

```bash
pnpm test --testPathPattern='(RoundCommentsReport|RoundPhoto)'
pnpm type-check > /tmp/tc.log 2>&1; echo "exit=$?"
```

Expected: PASS; type-check exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/activity src/__tests__/components/activity
git commit -m "feat(moderation): report actions on comments and photos"
```

---

### Task 7: Block and report a player, and manage blocks

**Files:**
- Modify: `src/screens/social/PlayerDetailScreen.tsx`
- Create: `src/screens/profile/BlockedUsersScreen.tsx`
- Modify: `src/navigation/types.ts` (add `BlockedUsers: undefined`)
- Modify: `src/navigation/RootNavigator.tsx` (register `BlockedUsers`)
- Modify: `src/screens/profile/ProfileScreen.tsx` (entry point)
- Test: `src/__tests__/screens/profile/BlockedUsersScreen.test.tsx`

**Interfaces:**
- Consumes: `useBlockUser`, `useBlockedUsers` (Task 4), `ReportSheet` (Task 5)
- Produces: `BlockedUsers` route

- [ ] **Step 1: Write the failing test**

```tsx
// src/__tests__/screens/profile/BlockedUsersScreen.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import BlockedUsersScreen from '@/screens/profile/BlockedUsersScreen';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    textPrimary: '#000', textSecondary: '#666', primary: '#2563eb',
    surface: '#fff', border: '#ddd', background: '#fff', white: '#fff', error: '#f00',
  }),
}));

const mockUnblock = jest.fn().mockResolvedValue(undefined);
let mockBlocked: unknown[] = [];
jest.mock('@/hooks/moderation', () => ({
  useBlockedUsers: () => ({ data: mockBlocked, isLoading: false }),
  useBlockUser: () => ({ block: jest.fn(), unblock: mockUnblock, isBusy: false }),
}));

const navigation = { goBack: jest.fn() } as never;

describe('BlockedUsersScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBlocked = [];
  });

  it('explains the empty state', () => {
    render(<BlockedUsersScreen navigation={navigation} />);
    expect(screen.getByText(/haven't blocked anyone/i)).toBeTruthy();
  });

  it('lists blocked players', () => {
    mockBlocked = [
      { blocked_id: 'p2', created_at: '2026-09-01T00:00:00Z', player: { id: 'p2', name: 'Alex', photo_url: null } },
    ];
    render(<BlockedUsersScreen navigation={navigation} />);
    expect(screen.getByText('Alex')).toBeTruthy();
  });

  it('unblocks on press', async () => {
    mockBlocked = [
      { blocked_id: 'p2', created_at: '2026-09-01T00:00:00Z', player: { id: 'p2', name: 'Alex', photo_url: null } },
    ];
    render(<BlockedUsersScreen navigation={navigation} />);
    fireEvent.press(screen.getByLabelText('Unblock Alex'));
    await waitFor(() => expect(mockUnblock).toHaveBeenCalledWith('p2'));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test --testPathPattern='BlockedUsersScreen'
```

Expected: FAIL — cannot resolve the screen.

- [ ] **Step 3: Write the screen**

```tsx
// src/screens/profile/BlockedUsersScreen.tsx
import React, { useCallback } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';

import { PageHeader } from '@/components/common/PageHeader';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useBlockedUsers, useBlockUser } from '@/hooks/moderation';

interface Props {
  navigation: { goBack: () => void };
}

/**
 * Review and undo blocks.
 *
 * Unblocking does not restore a friendship that blocking deleted — the two
 * users have to re-add each other.
 */
export default function BlockedUsersScreen({ navigation }: Props) {
  const colors = useThemeColors();
  const { data, isLoading } = useBlockedUsers();
  const { unblock, isBusy } = useBlockUser();

  const handleUnblock = useCallback((id: string) => unblock(id), [unblock]);

  const items = data ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Blocked players" showBack onBack={navigation.goBack} />

      {!isLoading && items.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          You haven&apos;t blocked anyone.
        </Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.blocked_id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <PlayerAvatar photoUrl={item.player?.photo_url} name={item.player?.name} size={40} />
              <Text style={[styles.name, { color: colors.textPrimary }]}>
                {item.player?.name ?? 'Player'}
              </Text>
              <TouchableOpacity
                onPress={() => handleUnblock(item.blocked_id)}
                disabled={isBusy}
                accessibilityRole="button"
                accessibilityLabel={`Unblock ${item.player?.name ?? 'player'}`}
              >
                <Text style={{ ...typography.bodyBold, color: colors.primary }}>Unblock</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.sm },
  empty: { ...typography.body, textAlign: 'center', padding: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  name: { ...typography.body, flex: 1 },
});
```

- [ ] **Step 4: Register the route**

In `src/navigation/types.ts` add `BlockedUsers: undefined;` to `RootStackParamList`. In `RootNavigator.tsx` register it beside the other profile screens:

```tsx
<Stack.Screen
  name="BlockedUsers"
  component={BlockedUsersScreen}
  options={{ title: 'Blocked players', headerShown: false }}
/>
```

⚠️ Register it **unconditionally** — it is not a social surface. A restricted user must still be able to review and undo blocks.

- [ ] **Step 5: Add block and report to PlayerDetailScreen**

`PlayerDetailScreen` already has action buttons around line 328. Add two: "Block" (confirm via `useConfirmationDialog`, then `block(playerId)`, then `navigation.goBack()`), and "Report" opening `ReportSheet` with `contentType: 'player'`, `contentId: playerId`, `authorId: playerId`.

Copy for the block confirmation: *"Block {name}? You won't see each other's comments, photos or activity, and any friendship between you will be removed."* — say the friendship is deleted, because it is not reversible by unblocking.

- [ ] **Step 6: Add the Profile entry point**

In `ProfileScreen.tsx`, add `onBlockedUsers={() => navigation.navigate('BlockedUsers')}` to `ProfileMenuSection` and a corresponding row in that component, under the privacy grouping.

- [ ] **Step 7: Run the tests**

```bash
pnpm test --testPathPattern='(BlockedUsersScreen|PlayerDetail)'
pnpm type-check > /tmp/tc.log 2>&1; echo "exit=$?"
```

Expected: PASS; type-check exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/screens src/navigation src/__tests__/screens
git commit -m "feat(moderation): block/report a player and manage blocks"
```

---

### Task 8: Operator alerting and dashboard helpers

**Files:**
- Create: `supabase/functions/notify-content-report/index.ts`
- Create: `supabase/migrations/20260905000300_ugc_moderation_ops.sql`

**Interfaces:**
- Consumes: `content_reports` (Task 1)
- Produces: `pending_reports` view, `moderate_content(p_report_id UUID, p_action TEXT)`

- [ ] **Step 1: Write the ops migration**

```sql
-- supabase/migrations/20260905000300_ugc_moderation_ops.sql
-- Dashboard workflow for actioning reports. Safe to re-run.

-- Everything the operator needs to judge a report, in one place.
--
-- ⚠️ security_invoker = true is REQUIRED. Without it the view runs as its owner
-- and content_reports' RLS does not apply, exposing the entire moderation queue
-- - reporter names and reported content included - to every authenticated user.
-- It also trips this project's security linter, which already forced the same
-- fix on achievement_leaderboard (20260303000000) and the sand-save views.
-- The operator reads this through the service role, which is unaffected.
CREATE OR REPLACE VIEW pending_reports
WITH (security_invoker = true) AS
  SELECT
    cr.id,
    cr.created_at,
    cr.reason,
    cr.note,
    cr.content_type,
    cr.content_id,
    reporter.name AS reporter_name,
    author.name   AS author_name,
    CASE cr.content_type
      WHEN 'round_comment' THEN (SELECT rc.body FROM round_comments rc WHERE rc.id = cr.content_id)
      WHEN 'round_photo'   THEN (SELECT rp.storage_path FROM round_photos rp WHERE rp.id = cr.content_id)
      ELSE NULL
    END AS content_preview
  FROM content_reports cr
  LEFT JOIN players reporter ON reporter.id = cr.reporter_id
  LEFT JOIN players author   ON author.id = cr.author_id
  WHERE cr.status = 'open'
  ORDER BY cr.created_at DESC;

ALTER VIEW pending_reports SET (security_invoker = true);

-- Takedown reuses the existing deleted_at soft-delete: every read path already
-- filters on it, so removal needs no new query changes. The audit trail of who
-- removed what and why lives in content_reports.
CREATE OR REPLACE FUNCTION moderate_content(p_report_id UUID, p_action TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_type TEXT;
  v_id   UUID;
BEGIN
  IF p_action NOT IN ('actioned', 'dismissed') THEN
    RAISE EXCEPTION 'Invalid action: %', p_action USING ERRCODE = '22023';
  END IF;

  SELECT content_type, content_id INTO v_type, v_id
  FROM content_reports WHERE id = p_report_id;

  IF v_type IS NULL THEN
    RAISE EXCEPTION 'No such report: %', p_report_id USING ERRCODE = '22023';
  END IF;

  IF p_action = 'actioned' THEN
    IF v_type = 'round_comment' THEN
      UPDATE round_comments SET deleted_at = NOW() WHERE id = v_id;
    ELSIF v_type = 'round_photo' THEN
      UPDATE round_photos SET deleted_at = NOW() WHERE id = v_id;
    END IF;
  END IF;

  UPDATE content_reports
     SET status = p_action, resolved_at = NOW()
   WHERE id = p_report_id;
END;
$$;

COMMENT ON FUNCTION moderate_content IS
  'Operator action from the Supabase dashboard:
     SELECT * FROM pending_reports;
     SELECT moderate_content(''<report-id>'', ''actioned'');';
```

- [ ] **Step 2: Write the alert edge function**

Follows `supabase/functions/send-support-email` (same Resend setup, same `RESEND_API_KEY` env var).

```ts
// supabase/functions/notify-content-report/index.ts
/**
 * Supabase Edge Function: notify-content-report
 *
 * Emails the operator when a content report is filed, so reports can be acted
 * on promptly without an in-app console. Apple requires prompt action, not a
 * particular tool for taking it.
 *
 * Request body: { report_id: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_URL = 'https://api.resend.com/emails';
const MODERATION_INBOX = 'support@thenineteenth.golf';

serve(async (req: Request) => {
  try {
    const { report_id } = await req.json();
    if (!report_id) {
      return new Response(JSON.stringify({ error: 'report_id required' }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: report, error } = await supabase
      .from('pending_reports')
      .select('*')
      .eq('id', report_id)
      .single();

    if (error || !report) {
      return new Response(JSON.stringify({ error: 'report not found' }), { status: 404 });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY environment variable is not set');
      return new Response(JSON.stringify({ error: 'email not configured' }), { status: 500 });
    }

    const body = [
      `Reason: ${report.reason}`,
      `Type: ${report.content_type}`,
      `Reported by: ${report.reporter_name ?? 'unknown'}`,
      `Author: ${report.author_name ?? 'unknown'}`,
      report.note ? `Note: ${report.note}` : null,
      '',
      `Content: ${report.content_preview ?? '(not previewable)'}`,
      '',
      `Action it with:  SELECT moderate_content('${report.id}', 'actioned');`,
      `Dismiss it with: SELECT moderate_content('${report.id}', 'dismissed');`,
    ]
      .filter(Boolean)
      .join('\n');

    const resendResponse = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Nineteenth <noreply@thenineteenth.golf>',
        to: [MODERATION_INBOX],
        subject: `Content report: ${report.reason}`,
        text: body,
      }),
    });

    if (!resendResponse.ok) {
      console.error('Resend rejected the message', await resendResponse.text());
      return new Response(JSON.stringify({ error: 'send failed' }), { status: 502 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    console.error('notify-content-report failed', e);
    return new Response(JSON.stringify({ error: 'unexpected' }), { status: 500 });
  }
});
```

- [ ] **Step 3: Call it from the report hook**

In `src/hooks/moderation/useReportContent.ts`, after the RPC succeeds, fire the alert without blocking the user:

```ts
// Best-effort: the report is already recorded, so a failed alert must not
// surface as a failed report.
void (supabase as any).functions
  .invoke('notify-content-report', { body: { report_id: reportId } })
  .catch(() => undefined);
```

`report_content()` already returns the id (Task 1), including on a duplicate report, so the
hook just captures it:

```ts
const { data: reportId, error } = await (supabase as any).rpc('report_content', { /* … */ });
if (error) throw error;
```

- [ ] **Step 4: Verify**

```bash
pnpm type-check > /tmp/tc.log 2>&1; echo "exit=$?"
pnpm test --testPathPattern='moderation'
```

Expected: type-check exit 0; moderation suites pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/notify-content-report supabase/migrations/20260905000300_ugc_moderation_ops.sql src/hooks/moderation
git commit -m "feat(moderation): operator alerting and dashboard helpers"
```

---

### Task 9: Terms of Service commitment

**Files:**
- Modify: `docs/legal/TERMS_OF_SERVICE.md` (§5.3 Prohibited Content)

- [ ] **Step 1: Add the response commitment**

§5.3 already prohibits objectionable content but promises nothing about response, and
reviewers look for the commitment. Spec §12.7 says to amend §5.3, so append this paragraph
**inside** §5.3 rather than opening a new section:

```markdown
You can report objectionable content from within the app, and block any other
user. We remove reported content that breaches these Terms, and eject users who
post it, within 24 hours of a report being received.
```

⚠️ This is a promise the operator must be able to keep. It is only credible because of the email alerting in Task 8 — do not ship this wording without that function deployed.

- [ ] **Step 2: Commit**

```bash
git add docs/legal/TERMS_OF_SERVICE.md
git commit -m "docs(legal): commit to 24-hour removal of reported content"
```

---

### Task 10: Full verification

- [ ] **Step 1: Full suite**

```bash
pnpm test > /tmp/full.log 2>&1; echo "FULL EXIT=$?"
grep -E "^Test Suites:|^Tests:" /tmp/full.log
```

Expected: exit 0, 0 failures. ⚠️ Do not pipe through `tail` before checking the exit code — the pipe returns tail's status and hides failures.

- [ ] **Step 2: Gate**

```bash
pnpm verify:gate
```

Expected: `Gate PASSED`.

- [ ] **Step 3: Confirm Part A's gate survived Task 2**

The single most important check in this plan. Every policy Task 2 recreated must still carry the age gate:

```bash
grep -A12 "CREATE POLICY round_comments_select" supabase/migrations/20260905000100_ugc_moderation_policies.sql | grep -c social_enabled
```

Expected: **1**. Repeat for `round_photos_select`, `round_likes_select`, `round_comment_likes_select` and `search_players`. A zero anywhere means Part A's under-13 gate was silently dropped and no test will tell you.

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "chore(moderation): Part B verification pass"
```

---

## SQL verification (run after applying, as two real accounts)

Spec §12.8 asks for policy-level tests. These cannot run under jest — they need a live
database and two authenticated sessions — so they are scripted here instead of being
silently dropped. Run each as the stated user, after the migrations are applied.

**Reported content hides from the reporter only.** The most important property: reporting is
not a takedown.

```sql
-- as the reporter
SELECT report_content('round_comment', '<comment-id>', '<author-id>', 'spam', NULL);
SELECT COUNT(*) FROM round_comments WHERE id = '<comment-id>';  -- expect: 0
-- as any other user who can see that round
SELECT COUNT(*) FROM round_comments WHERE id = '<comment-id>';  -- expect: 1
```

**Blocking is symmetric and severs the friendship.**

```sql
-- as user A, already an accepted friend of B
SELECT block_user('<B-id>');
SELECT COUNT(*) FROM friendships
 WHERE (requester_id = '<A-id>' AND addressee_id = '<B-id>')
    OR (requester_id = '<B-id>' AND addressee_id = '<A-id>');   -- expect: 0
SELECT COUNT(*) FROM round_comments WHERE author_id = '<B-id>'; -- expect: 0
SELECT COUNT(*) FROM search_players('<B name>');                -- expect: 0
-- as user B
SELECT COUNT(*) FROM round_comments WHERE author_id = '<A-id>'; -- expect: 0
SELECT COUNT(*) FROM search_players('<A name>');                -- expect: 0
```

**A blocked pair cannot re-friend.**

```sql
-- as user A
INSERT INTO friendships (requester_id, addressee_id, status)
VALUES ('<A-id>', '<B-id>', 'pending');
-- expect: ERROR - new row violates row-level security policy
```

**Duplicate reports are idempotent, not an error.**

```sql
SELECT report_content('round_comment', '<comment-id>', '<author-id>', 'spam', NULL);
SELECT report_content('round_comment', '<comment-id>', '<author-id>', 'spam', NULL);
SELECT COUNT(*) FROM content_reports
 WHERE reporter_id = auth.uid() AND content_id = '<comment-id>';  -- expect: 1
```

**The filter is enforced server-side, not just in the client.**

```sql
INSERT INTO round_comments (round_id, author_id, body)
VALUES ('<round-id>', auth.uid(), 'you are a slur_example');
-- expect: ERROR - Comment contains content that is not allowed
```

**Blocked content is gone from the feed, not just from direct table reads.** This is the
check that would have caught the Task 2b gap: the feed RPCs are SECURITY DEFINER and bypass
RLS, so passing the table-level checks above proves nothing about them.

```sql
-- as user A, having blocked B, on a round where B commented and added a photo
SELECT jsonb_array_length(photos), comment_count, like_count
FROM get_activity_feed(20) WHERE round_id = '<shared-round-id>';
-- expect: B's photo absent, and both counts excluding B's rows
```

**Takedown removes content from every read path, including the feed RPCs.**

```sql
SELECT moderate_content('<report-id>', 'actioned');
SELECT COUNT(*) FROM round_comments WHERE id = '<comment-id>';           -- expect: 0 for everyone
SELECT comment_count FROM get_round_feed_card('<round-id>');             -- expect: decremented
```

**Part A's age gate still holds after Task 2 recreated the policies.** With
`age_gate_config.enforce = TRUE`, as an `under13` user:

```sql
SELECT COUNT(*) FROM round_comments;         -- expect: 0
SELECT COUNT(*) FROM get_activity_feed(20);  -- expect: 0
SELECT can_view_round('<a-round-they-played>'); -- expect: t  (scorecards unaffected)
```

Reset `enforce = FALSE` afterwards if the switch is not meant to be live yet.

**Combined policy performance.** Spec §9 requires the `EXPLAIN ANALYZE` check against the
*combined* policy, not Part A's in isolation — `social_enabled()`, `is_blocked_pair()` and the
report `NOT EXISTS` now all sit on the same hot read path:

```sql
EXPLAIN ANALYZE SELECT * FROM round_comments WHERE round_id = '<busy-round>';
EXPLAIN ANALYZE SELECT * FROM get_activity_feed(20);
```

Expect per-statement evaluation of the helpers, not per-row. If the report subquery shows as
per-row, `idx_content_reports_by_reporter` from Task 1 is the index that should be serving it.

## Deployment

Migrations are authored, not applied. Run them in the Supabase SQL editor in order, after Part A's three:

1. `20260905000000_ugc_moderation_schema.sql`
2. `20260905000100_ugc_moderation_policies.sql`
3. `20260905000150_ugc_moderation_feed.sql`
4. `20260905000200_ugc_content_filter.sql`
5. `20260905000300_ugc_moderation_ops.sql`

Then:

- `supabase functions deploy notify-content-report`, with `RESEND_API_KEY` set (already configured for `send-support-email`).
- **Replace the placeholder word list.** `BLOCKED_TERMS` in `src/utils/contentFilter.ts` and the regex in `20260905000200` both ship with `slur_example` only. Populate both with a real list and keep them in sync — the client check is UX, the trigger is enforcement.
- Verify the whole loop by hand before submission: report something from a second account, confirm it disappears for the reporter and stays visible to everyone else, confirm the email arrives, then action it from the dashboard and confirm it disappears for all.

## Out of scope

An in-app moderation console. Apple requires prompt action, not a particular tool for taking it, and at current volume a console would be infrastructure for traffic that does not exist. The upgrade path is a super-admin screen reading the same `pending_reports` view.
