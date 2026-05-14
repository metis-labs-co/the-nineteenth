# Plan: Allow Organizers to Set Up a Competition Before Players Join

## Context

Today an organizer goes through a 5-step wizard and must add at least 2 players (themselves + 1) to finish creating a competition. We want to flip this so:

1. An organizer can fully configure a competition (rounds, prize pool, team mode) and **finish creation with 0 other players**.
2. The organizer optionally sets a **player slot capacity** (e.g. "12 players").
3. As people join via the invite code, they **fill the available slots**.
4. The organizer can optionally **opt out of playing themselves** (run-only mode), so the comp can be set up entirely for others.

The exploration revealed the codebase is ~95% ready for the "empty setup" part — Step 3 is already skippable in the data layer, rounds support nullable courses, pairings are already manual/post-setup, and placeholder players already exist. The actual blockers are small.

The "organizer opts out" toggle is the **medium** lift: it requires a fix to one RLS policy and an audit of UI surfaces that assume the organizer is a player.

**Overall verdict:** Not a big change. ~1 day for slot capacity + empty creation. ~1–2 days for organizer-not-playing toggle done carefully. Can ship in two PRs.

---

## Recommended Approach

### Phase 1 — Capacity + Empty Setup (essential, ~half day)

#### 1.1 Database migration

New migration: `supabase/migrations/<timestamp>_competition_capacity_and_organizer_role.sql`

```sql
ALTER TABLE competitions
  ADD COLUMN max_players INTEGER CHECK (max_players IS NULL OR max_players >= 2),
  ADD COLUMN lock_at_capacity BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN organizer_is_player BOOLEAN NOT NULL DEFAULT true;
```

Per `MEMORY.md`: every new column on existing tables doesn't need grants, but **if any new tables are introduced** they must be granted to `authenticated`/`service_role`. This migration only ALTERs existing tables — no new grants needed.

#### 1.2 Update TypeScript types

- `src/types/supabase.ts` — regenerate or hand-edit `competitions` Row/Insert/Update types
- `src/types/database/competition.types.ts` — add the three new fields
- `src/schemas/competition.ts` — extend the Zod schema with:
  - `max_players: z.number().int().min(2).max(<tier_limit>).optional().nullable()`
  - `lock_at_capacity: z.boolean().default(true)`
  - `organizer_is_player: z.boolean().default(true)`

#### 1.3 Wizard Step 1 (Competition Details)

File: `src/components/competitionWizard/create/CompetitionDetailsStep.tsx` (and parent state in `src/store/competitionWizardStore.ts`)

Add three new controls grouped under a "Players & slots" section:
- **"Set a player limit"** toggle. When on, show:
  - Number stepper for `max_players` (min 2, max = tier limit)
  - **"Lock when full"** toggle (default on) → maps to `lock_at_capacity`
- **"I'm organizing, not playing"** toggle (default off) → maps to `organizer_is_player = false`

Store these on `competitionWizardStore.ts` alongside name/dates/team toggle.

#### 1.4 Wizard Step 3 (Players) — relax minimum

File: `src/components/competitionWizard/create/AddPlayersStep.tsx`

- Current rule: minimum 2 players required to submit (line ~190).
- New rule:
  - If `organizer_is_player = true` and no one else → allowed (organizer alone, players join via code).
  - If `organizer_is_player = false` and no players → allowed (pure empty setup).
- Show contextual helper text: "Share the invite code after creating to fill the remaining N slots."
- If `max_players` set, show "X of N filled" in the header of this step.
- Keep tier-limit checks (don't allow adding more than max_players).

#### 1.5 API creation logic

File: `src/services/api/competitions.ts` (around lines 32–250)

- Persist the three new fields on insert.
- **Around line 187:** auto-add organizer as `competition_players` row **only if `organizer_is_player = true`**. If false, skip it.
- Keep the existing behavior of inserting pre-selected players from Step 3.

#### 1.6 Tier limits

File: `src/services/api/permissions.ts` (`checkCompetitionCreationPermission`)

- If `max_players` is set, validate it doesn't exceed the user's tier limit (Free: 4, Social: 12, Premium: 40).
- Existing per-player tier checks at join time stay as they are.

---

### Phase 2 — Capacity enforcement at join time (small, ~1 hour)

File: `src/screens/competitions/JoinCompetitionScreen.tsx` (lines ~96–150)

Before inserting the `competition_players` row:

1. Count current accepted players: `select count(*) from competition_players where competition_id = ? and status = 'accepted'`.
2. If `competition.max_players` is set and `competition.lock_at_capacity = true` and count >= max → show error "This competition is full" and abort.
3. Otherwise proceed.

Belt-and-braces: add a Postgres trigger or RLS policy update to enforce this server-side too, so a client bypass can't overfill. New migration:

```sql
-- Enforce capacity in DB
CREATE FUNCTION enforce_competition_capacity() RETURNS trigger ...
CREATE TRIGGER trg_enforce_capacity BEFORE INSERT ON competition_players ...
```

(Skip this if it feels heavy — client check + RLS subquery is acceptable for v1.)

---

### Phase 3 — Organizer-not-playing fixes (medium, ~1 day)

This is the trickier half. Audit found one **must-fix** and a handful of UI polish items.

#### 3.1 Must-fix: scorecard INSERT RLS policy

File: `supabase/migrations/20260202000000_fix_scorecard_rls_for_standalone_groups.sql` (lines 121–127)

The current INSERT policy for organizer scorecard creation has `c.organizer_id = auth.uid()` as a fallback for VIEW/UPDATE/DELETE but **not for INSERT** when `competition_players` is required in the join chain. With `organizer_is_player = false`, an organizer who never plays themselves won't trip this — but the group-scoring path (lines 109–119) joins `competition_players` and would block an organizer-as-scorer.

Fix in a new migration: rewrite the INSERT policy so it allows the organizer (via `c.organizer_id = auth.uid()`) **OR** a row in `competition_players`, without requiring both. Mirrors the SELECT policy at lines 42–49.

#### 3.2 Player list UI

Files to audit:
- `src/hooks/scorecard/useRoundPlayers.ts` (lines 87–94) — already fetches only `competition_players`, so organizer will naturally be absent.
- `src/screens/competitions/.../PlayersTab.tsx` (or equivalent) — show organizer as a separate "Organizer (not playing)" row above the player list when `organizer_is_player = false`.
- Competition card / dashboard headers that say "N players" — should not count the organizer if they're not playing.

#### 3.3 Leaderboard & scoring

Already decoupled per exploration:
- `src/hooks/competitions/leaderboard.ts` pulls from `round_results` — organizer simply won't appear if they have no results.
- `src/utils/pairingAlgorithm.ts` accepts any player list — no organizer assumptions.
- `src/services/rounds/roundResultsService.ts` — decoupled.

No code changes needed here. Verify by manually creating a comp with `organizer_is_player = false` and ensuring the leaderboard, pairings, and round results are all sensible.

#### 3.4 Permission checks

File: `src/services/competitionPlayers/competitionPlayersService.ts` (lines 264–279) — already uses `organizer_id`, not `competition_players` membership.

---

### Phase 4 — Display polish (small, ~1 hour)

- Competition detail / dashboard header: show `"X of N players"` badge when `max_players` is set.
- Players tab empty state when no non-organizer players have joined yet: "Share invite code `COMP-XXXXX` to fill the remaining N slots." Use existing invite-code share UI.
- In Step 5 (Review): summarize the new fields ("Player limit: 12 (locks when full)", "Organizer: playing / not playing").

---

## Critical Files to Modify

| File | Change |
|------|--------|
| `supabase/migrations/<new>_competition_capacity_and_organizer_role.sql` | NEW — add `max_players`, `lock_at_capacity`, `organizer_is_player` |
| `supabase/migrations/<new>_fix_scorecard_insert_policy.sql` | NEW — relax INSERT policy for organizer (Phase 3.1) |
| `src/types/supabase.ts` | Regenerate/extend for new columns |
| `src/types/database/competition.types.ts` | Add new fields to TS types |
| `src/schemas/competition.ts` | Extend Zod schema |
| `src/store/competitionWizardStore.ts` | Store new fields in wizard state |
| `src/components/competitionWizard/create/CompetitionDetailsStep.tsx` | Add slot capacity + organizer toggle controls |
| `src/components/competitionWizard/create/AddPlayersStep.tsx` | Relax 2-player minimum, show "X of N" |
| `src/services/api/competitions.ts` (~line 187) | Conditional organizer auto-add; persist new fields |
| `src/services/api/permissions.ts` | Validate `max_players` against tier limit |
| `src/screens/competitions/JoinCompetitionScreen.tsx` (~lines 96–150) | Capacity check before insert |
| Competition header/detail screen | "X of N" badge, organizer label when not playing |

---

## Reused Existing Functionality

- **Placeholder players** (`supabase/migrations/20250329000000_placeholder_players.sql`) — already exist; organizer can still pre-create named "Slot 3 — TBD" rows if desired (not required for this feature).
- **Nullable `course_id`** on rounds — already supports blank round placeholders.
- **Manual pairings** (`src/utils/pairingAlgorithm.ts` + `pairing_source = 'manual'`) — already deferred until rounds start.
- **Invite code generation** — auto-generated on competition insert via existing trigger.
- **Tier limit framework** (`checkCompetitionCreationPermission`) — just extend with the `max_players` check.

---

## Verification

Manual end-to-end test plan:

1. **Empty setup, organizer playing**
   - Create competition with `max_players = 8`, `organizer_is_player = true`, no other players.
   - Confirm wizard completes (no "minimum 2 players" error).
   - Confirm dashboard shows "1 of 8 players".
   - Share invite code with a test account → confirm they can join → confirm "2 of 8".

2. **Empty setup, organizer NOT playing**
   - Create competition with `organizer_is_player = false`, `max_players = 4`, no other players.
   - Confirm `competition_players` has no row for the organizer.
   - Confirm dashboard shows "0 of 4 players".
   - Have 4 test accounts join → confirm "4 of 4".
   - 5th join attempt → confirm "competition is full" error.
   - Open the first round, score it → confirm organizer is **not** on the leaderboard, pairings algorithm doesn't include them, but the organizer can still view/edit scorecards.

3. **Capacity lock off (soft target)**
   - Create with `max_players = 4`, `lock_at_capacity = false`.
   - 5th player joins → succeeds; dashboard shows "5 of 4 (over target)" or similar.

4. **Tier limits**
   - As a Free-tier user, try `max_players = 10` → blocked by `checkCompetitionCreationPermission`.

5. **Edit existing competition**
   - For competitions created before this migration, all three new fields default sensibly (`max_players = NULL`, `lock_at_capacity = true`, `organizer_is_player = true`). Existing comps behave exactly as today.

Run `pnpm type-check` and `pnpm lint` after each phase.

---

## Open Questions / Decisions Already Made

- **Capacity mode**: organizer chooses — `max_players` field + `lock_at_capacity` toggle gives soft target, hard cap, or no cap. (Waitlist deferred.)
- **Organizer opt-out**: yes, supported via `organizer_is_player` toggle.
- **Pre-join setup scope**: rounds, prize pool, and team mode/size — all already supported, no extra work.
- **Placeholder players** as a parallel mechanism: kept as-is, not required for this feature.
