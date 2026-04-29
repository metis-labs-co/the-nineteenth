# Team Prize Pool

## Context

The Nineteenth supports prize pools for individual competitions: organizers fund a pool, define placement splits (e.g. 1st 60%, 2nd 30%, 3rd 10%), and on settlement the system maps placements to players via `competition_players.final_position`.

Team competitions (where `team_mode = 'fixed'`) currently have no equivalent. Organizers running team-format competitions (best-ball, scramble, aggregate, match-play-team) want to reward top teams the same way they reward top individuals — and want to do so *alongside* the individual pool, not as a replacement for it. A typical use case: a 16-player team comp with $20/head ($320) going to top individuals, plus a $40/team ($160) team pool paying out to the winning teams.

This design adds team prize pools alongside the existing individual pool. The two pools are independent: organizers can enable either, both, or neither. Funding, locking, and settlement are tracked separately per pool.

## Design Decisions

- **Target type discriminator**: `competition_prize_pools.target_type` (`'individual' | 'team'`). One row per `(competition_id, target_type)` — a competition can have up to two pools.
- **Fixed-team only**: Team pools require `team_mode = 'fixed'`. Per-round teams are excluded — there's no stable team identity to pay out at competition end.
- **Same funding types**: `per_player` and `fixed_total`. No `per_team` funding option for v1; a $40/team mental model is achievable with `fixed_total = team_count * 40` or expressed as `per_player` with the per-player slice.
- **Auto-split payouts**: On settlement, each team-pool placement spawns one `prize_payout` transaction *per team member* at `payout_amount / team_size`. The placement row remains the canonical team total; transactions record the per-member share.
- **Final position on `teams`**: Team standings are confirmed by writing `teams.final_position`, mirroring the individual flow on `competition_players.final_position`. Organizer can manually override the auto-calculated standings before confirming.
- **Independent pools**: Each pool has its own funding amount, locking state, and settlement status. One can be settled while the other is still active.
- **Single subscription flag**: The existing `prize_pool` feature gates both pool types. Premium users get both.

## Database Changes

### `competition_prize_pools` — add target

```sql
ALTER TABLE competition_prize_pools
  ADD COLUMN target_type TEXT NOT NULL DEFAULT 'individual'
    CHECK (target_type IN ('individual', 'team'));

-- The original migration declared `competition_id UUID NOT NULL UNIQUE ...`,
-- which produces an auto-named unique index. Drop it and replace with a
-- composite unique constraint so a competition can have one pool per target.
ALTER TABLE competition_prize_pools
  DROP CONSTRAINT IF EXISTS competition_prize_pools_competition_id_key;

ALTER TABLE competition_prize_pools
  ADD CONSTRAINT unique_pool_per_competition_target
  UNIQUE (competition_id, target_type);
```

A trigger enforces that `target_type = 'team'` only inserts/updates against a competition with `team_mode = 'fixed'`.

### `prize_pool_placements` — add team participant

```sql
ALTER TABLE prize_pool_placements
  ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

ALTER TABLE prize_pool_placements
  ADD CONSTRAINT placement_xor_player_or_team CHECK (
    (player_id IS NOT NULL AND team_id IS NULL) OR
    (player_id IS NULL AND team_id IS NOT NULL) OR
    (player_id IS NULL AND team_id IS NULL)  -- pre-settlement
  );
```

A second trigger enforces target-type alignment: pools with `target_type = 'individual'` only accept `player_id`; `target_type = 'team'` only accepts `team_id`.

### `teams` — final position

```sql
ALTER TABLE teams
  ADD COLUMN final_position INTEGER NULL;

CREATE INDEX idx_teams_competition_final_position
  ON teams(competition_id, final_position);
```

Nullable — written when the organizer confirms team standings on settlement.

### `pool_transactions` — per-member splits

```sql
ALTER TABLE pool_transactions
  ADD COLUMN player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
```

For individual-pool payouts, `player_id` is set, `team_id` is null. For team-pool payouts, both are set on each member-share row. Existing rows backfill to null on both.

### New RPC: `settle_team_prize_pool(p_pool_id UUID)`

Mirrors `settle_prize_pool` for team pools:

1. Verify pool exists with `target_type = 'team'`.
2. For each placement row (in position order), find the team where `final_position = placement.position`.
3. Assign `team_id` to the placement row, set `paid_at`.
4. Compute per-member share: `payout_amount / member_count`, rounded to 2 decimals.
5. Insert one `prize_payout` transaction per team member at the share amount, with both `team_id` and `player_id` set, description `'Team payout: position N'`.
6. Set pool `status = 'settled'`.

Rounding drift (e.g. $100/3 = three $33.33 transactions totalling $99.99) is accepted in v1. The placement row's `payout_amount` remains the canonical team total.

### Triggers

- **`enforce_team_pool_requires_fixed_teams`**: BEFORE INSERT/UPDATE on `competition_prize_pools`. Raises if `target_type = 'team'` and the competition isn't `fixed`.
- **`enforce_placement_target_alignment`**: BEFORE INSERT/UPDATE on `prize_pool_placements`. Raises if the placement's `player_id`/`team_id` doesn't match the parent pool's `target_type`.
- Existing `validate_placement_percentages` and pool-locking triggers apply unchanged.

### Migration order

New migration `20260430000000_team_prize_pool.sql`:

1. Add `target_type` to `competition_prize_pools` (default `'individual'`, NOT NULL).
2. Drop any existing `competition_prize_pools_competition_id_key` (if present); add `unique_pool_per_competition_target`.
3. Add `team_id` column + XOR constraint to `prize_pool_placements`.
4. Add `final_position` to `teams` + index.
5. Add `player_id`, `team_id` to `pool_transactions`.
6. Create `enforce_team_pool_requires_fixed_teams` and `enforce_placement_target_alignment` triggers.
7. Create `settle_team_prize_pool` RPC.
8. Update RLS policies on `prize_pool_placements` and `pool_transactions` if needed (existing policies key off pool ownership, which carries through).

## Type Changes

### `src/types/database/prizePool.types.ts`

```typescript
export type PoolTargetType = 'individual' | 'team';

export interface CompetitionPrizePool {
  // ...existing
  target_type: PoolTargetType;
}

export interface PrizePoolPlacement {
  // ...existing
  team_id: string | null;
}

export interface CreatePrizePoolInput {
  competition_id: string;
  target_type: PoolTargetType;
  funding_type: PoolFundingType;
  funding_amount: number;
  currency?: string;
  placements: PlacementInput[];
}

export interface PoolTransaction {
  // ...existing
  player_id: string | null;
  team_id: string | null;
}
```

### `src/types/database/team.types.ts`

```typescript
export interface Team {
  // ...existing
  final_position: number | null;
}
```

## Hook Changes

### `src/hooks/prizePool/queries.ts`

- `usePrizePool(competitionId, target?: PoolTargetType = 'individual')` — fetches one pool. Existing single-arg callers default to individual.
- `usePrizePools(competitionId)` — new; returns `{ individual, team }`, both nullable. Used by Payouts tab and Edit screen.
- `usePrizePoolPlacements(poolId)` — unchanged signature, returns placements with optional `team_id`.

### `src/hooks/prizePool/mutations.ts`

- `useCreatePrizePool` — accepts `target_type` in input.
- `useUpdatePrizePool` — unchanged.
- `useSettleCompetitionPayouts` — extended to dispatch by pool target. The current implementation takes `{ poolId, competitionId, standings: { participantId, position }[] }` and writes to `competition_players.final_position`. It now also takes the pool's `target_type` (or fetches it from `poolId`); for `'individual'` it keeps current behavior (write `competition_players.final_position`, call `settle_prize_pool`); for `'team'` it writes `teams.final_position` (matching on `competition_id` + `id`) and calls `settle_team_prize_pool`. The `participantId` field is reused for either `player_id` or `team_id` depending on target.

## Frontend Changes

### `PrizePoolSection`

Adds a `targetType` prop (default `'individual'`). When `team_mode = 'fixed'`, the parent screens (CreateCompetitionWizard step, EditCompetitionScreen) render the section twice — once per target. Both share the same toggle/funding/placements UI; the only differences:

- Header label: "Individual prize pool" vs "Team prize pool".
- Placement cap is `playerCount` for individual, `teamCount` for team.
- Eligibility: team section is conditional on `team_mode = 'fixed'`.

### `usePrizePoolConfig`

Accepts `targetType` and `teamCount`. The placement cap is computed from the appropriate count.

### `PrizePoolSummaryCard`

Adds a small "Individual" / "Team" pill to the header so users can distinguish the cards. When settled, team-pool placements show: team name, team color dot, total payout, and per-member share (e.g. "$160 — $40 each").

### Settlement UI (Payouts tab)

Renders one settlement card per existing pool. The team-pool card shows a draggable team standings list (reusing existing standings-confirm UI but bound to teams) and a "Confirm standings & pay out" button that calls `useSetTeamFinalPositions` then `useSettlePrizePool`.

### Mode-change side effect

In the competition edit flow, switching `team_mode` away from `'fixed'` while a team pool exists shows a confirm dialog ("Removing teams will delete the team prize pool"). Confirming deletes the team pool and its placements. Only possible pre-lock; if the pool is locked, the team-mode change is blocked entirely.

## Settlement Flow

1. Organizer opens Payouts tab on a competition with both pools.
2. UI shows two cards: "Individual prize pool" + "Team prize pool".
3. Each card auto-fills standings from its respective standings RPC (`get_competition_standings` for individual, `get_competition_team_standings` for team).
4. Organizer confirms or manually reorders standings, then taps "Confirm & pay out".
5. The confirm action calls `useSettleCompetitionPayouts`, which writes `final_position` to the appropriate table and then invokes the matching settle RPC.
6. Settled cards show the breakdown: position → participant → amount (and per-member share for team pool).
7. Either pool can be settled independently; both transition to `status = 'settled'` once done.

## Verification

1. **Create comp with both pools**: Fixed team comp, enable individual pool ($20/player) + team pool ($40/team via fixed_total). Verify both rows in `competition_prize_pools`, both sets of placements, totals match.
2. **Eligibility gating**: Try to enable team pool on `team_mode = 'none'` or `'per-round'`. UI hides the option; manual API call rejected by trigger.
3. **Placement target alignment**: Try to insert a placement with `player_id` into a team pool (or `team_id` into individual pool). Trigger rejects.
4. **Per-player funding on team pool**: Verify `total = funding_amount × player_count`, not team_count (we kept funding semantics consistent).
5. **Locking**: Start a round, verify both pools lock together.
6. **Settlement — individual**: Confirm individual standings, settle individual pool. Existing flow unchanged.
7. **Settlement — team**: Confirm team standings, settle team pool. Each placement gets `team_id`. `pool_transactions` has one row per team member per placement. Transactions sum to placement total within rounding tolerance.
8. **Independent settlement**: Settle one pool, verify the other remains `'active'` and editable until its own settle action.
9. **Mode change**: Switch `team_mode` to `'none'` on a comp with an unlocked team pool. Confirm dialog appears; confirming deletes the team pool. Switching with a locked team pool is blocked.
10. **Subscription**: Free user can't enable either pool. Premium user can enable both.

## Files to Modify

### Database
- `supabase/migrations/20260430000000_team_prize_pool.sql` — new migration

### Types
- `src/types/database/prizePool.types.ts` — add `target_type`, `team_id`, transaction columns
- `src/types/database/team.types.ts` — add `final_position`
- `src/types/supabase.ts` — regenerate from schema

### Hooks
- `src/hooks/prizePool/queries.ts` — `usePrizePool` accepts target, add `usePrizePools`
- `src/hooks/prizePool/mutations.ts` — `useCreatePrizePool` accepts target, `useSettleCompetitionPayouts` branches on the pool's target
- `src/hooks/prizePool/types.ts` — config type gains `targetType`, `teamCount`

### Components
- `src/components/prizePool/PrizePoolSection.tsx` — accepts `targetType`
- `src/components/prizePool/usePrizePoolConfig.ts` — accepts `targetType`, `teamCount`
- `src/components/prizePool/PrizePoolPlacements.tsx` — placement cap from team or player count
- `src/components/prizePool/PrizePoolSummaryCard.tsx` — target-type pill, per-member share display when settled
- `src/components/prizePool/PrizePoolFundingSection.tsx` — minor label tweaks (no funding-math changes)

### Screens
- Competition wizard / EditCompetitionScreen — render `PrizePoolSection` twice when `team_mode = 'fixed'`
- Payouts tab — render one settlement card per existing pool, team-pool card uses team standings list
