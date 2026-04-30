# Team Prize Pool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a team prize pool that runs alongside the existing individual pool for fixed-team competitions, with auto-split per-member payouts.

**Architecture:** Discriminate `competition_prize_pools` rows by a new `target_type` column (`'individual' | 'team'`). Team pools store `team_id` on placement rows; settlement reads `teams.final_position` and writes one `pool_transactions` row per team member at `payout / team_size`. Frontend renders the existing `PrizePoolSection` twice in fixed-team competitions and the existing `PayoutsTab` once per pool.

**Tech Stack:** PostgreSQL (Supabase), TypeScript, React Native, TanStack Query, Jest, React Native Paper.

**Spec:** `docs/superpowers/specs/2026-04-30-team-prize-pool-design.md`

---

## File Structure

### Database (new)
- `supabase/migrations/20260430000000_team_prize_pool.sql` — schema changes, triggers, RPC

### Types (modify)
- `src/types/database/prizePool.types.ts` — add `target_type`, `team_id`, transaction columns, update inputs
- `src/types/database/team.types.ts` — add `final_position` to `Team`

### Hooks (modify)
- `src/hooks/prizePool/queries.ts` — `useCompetitionPrizePool` accepts target; add `useCompetitionPrizePools`
- `src/hooks/prizePool/mutations.ts` — `useCreatePrizePool` accepts target; `useSettleCompetitionPayouts` branches by target
- `src/hooks/prizePool/index.ts` — re-export new hook

### Components (modify)
- `src/components/prizePool/PrizePoolSection.tsx` — accepts `targetType`
- `src/components/prizePool/usePrizePoolConfig.ts` — accepts `targetType`, `teamCount`
- `src/components/prizePool/PrizePoolPlacements.tsx` — placement cap by participant count
- `src/components/prizePool/PrizePoolFundingSection.tsx` — minor label tweaks (no math change)
- `src/components/prizePool/PrizePoolSummaryCard.tsx` — target pill + per-member share when settled
- `src/components/prizePool/EditPrizePoolBottomSheet.tsx` — accepts `targetType`
- `src/components/prizePool/PrizePoolFundingSection.tsx` — pass through

### Screens / containers (modify)
- `src/screens/admin/CreateCompetitionScreen/...` — render twice when `team_mode === 'fixed'`
- `src/components/competitions/detail/PayoutsTab.tsx` — render one settlement card per pool
- `src/screens/competitions/CompetitionDetailScreen/hooks/useCompetitionDetailData.ts` — fetch both pools

### Tests (new / modify)
- `src/__tests__/hooks/prizePool/mutations.test.ts` — settle dispatcher behavior
- `src/__tests__/components/prizePool/PrizePoolSection.test.tsx` — target rendering

---

## Notes for the executor

- **Verification commands**:
  - Type-check: `pnpm type-check`
  - Lint: `pnpm lint`
  - Tests: `pnpm test`
  - Local DB reset (verifies migration): `npx supabase db reset`
- **Commit cadence**: After each task. Use the conventional `feat(prize-pool): …` / `feat(db): …` format.
- **Migration testing**: There's no existing automated DB test harness for migrations. Verify by running `npx supabase db reset` against a fresh local DB after writing the migration.
- **Existing test patterns**: Hook tests use `@testing-library/react-hooks` style with mocked Supabase client. Component tests use React Native Testing Library.

---

## Task 1: Database migration — schema additions

**Files:**
- Create: `supabase/migrations/20260430000000_team_prize_pool.sql`

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/20260430000000_team_prize_pool.sql` with:

```sql
-- =====================================================
-- Team Prize Pool Migration
-- Adds target_type discrimination and team-pool plumbing
-- =====================================================

BEGIN;

-- 1. Add target_type to competition_prize_pools
ALTER TABLE competition_prize_pools
  ADD COLUMN IF NOT EXISTS target_type TEXT NOT NULL DEFAULT 'individual'
    CHECK (target_type IN ('individual', 'team'));

COMMENT ON COLUMN competition_prize_pools.target_type IS
  'Discriminator: ''individual'' pays players, ''team'' pays teams (auto-split among members)';

-- The original migration declared `competition_id UUID NOT NULL UNIQUE ...`,
-- producing an auto-named unique index. Drop it and replace with a composite
-- so a competition can have one pool per target_type.
ALTER TABLE competition_prize_pools
  DROP CONSTRAINT IF EXISTS competition_prize_pools_competition_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_pool_per_competition_target'
      AND conrelid = 'competition_prize_pools'::regclass
  ) THEN
    ALTER TABLE competition_prize_pools
      ADD CONSTRAINT unique_pool_per_competition_target
      UNIQUE (competition_id, target_type);
  END IF;
END $$;

-- 2. Add team_id to prize_pool_placements with XOR constraint
ALTER TABLE prize_pool_placements
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

COMMENT ON COLUMN prize_pool_placements.team_id IS
  'Team assigned to this placement on settlement (team pools only). XOR with player_id.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'placement_xor_player_or_team'
      AND conrelid = 'prize_pool_placements'::regclass
  ) THEN
    ALTER TABLE prize_pool_placements
      ADD CONSTRAINT placement_xor_player_or_team CHECK (
        (player_id IS NOT NULL AND team_id IS NULL) OR
        (player_id IS NULL AND team_id IS NOT NULL) OR
        (player_id IS NULL AND team_id IS NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_prize_pool_placements_team_id
  ON prize_pool_placements(team_id) WHERE team_id IS NOT NULL;

-- 3. Add final_position to teams
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS final_position INTEGER NULL;

COMMENT ON COLUMN teams.final_position IS
  'Set on team-pool settlement to map placements to teams. NULL pre-settlement.';

CREATE INDEX IF NOT EXISTS idx_teams_competition_final_position
  ON teams(competition_id, final_position);

-- 4. Add player_id and team_id to pool_transactions
ALTER TABLE pool_transactions
  ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

COMMENT ON COLUMN pool_transactions.player_id IS
  'Recipient player (set on prize_payout rows for individual pools and per-member team-pool shares).';
COMMENT ON COLUMN pool_transactions.team_id IS
  'Source team (set on team-pool prize_payout rows alongside player_id).';

CREATE INDEX IF NOT EXISTS idx_pool_transactions_player_id
  ON pool_transactions(player_id) WHERE player_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pool_transactions_team_id
  ON pool_transactions(team_id) WHERE team_id IS NOT NULL;

COMMIT;
```

- [ ] **Step 2: Run migration to verify**

Run: `npx supabase db reset`
Expected: Migration runs without errors, all migrations through to this one apply cleanly.

- [ ] **Step 3: Verify columns exist**

Run:
```bash
npx supabase db dump --schema public 2>/dev/null | grep -A 1 "target_type\|teams\.final_position\|pool_transactions.*player_id"
```
Expected: Output shows the new columns.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260430000000_team_prize_pool.sql
git commit -m "feat(db): add team prize pool schema (target_type, team placements, transactions)"
```

---

## Task 2: Database migration — eligibility + alignment triggers

**Files:**
- Modify: `supabase/migrations/20260430000000_team_prize_pool.sql` (append before COMMIT)

- [ ] **Step 1: Append eligibility trigger**

Insert before the `COMMIT;` at the end of the migration file:

```sql
-- 5. Trigger: team pools require team_mode = 'fixed'
CREATE OR REPLACE FUNCTION enforce_team_pool_requires_fixed_teams()
RETURNS TRIGGER AS $$
DECLARE
  v_team_mode TEXT;
BEGIN
  IF NEW.target_type = 'team' THEN
    SELECT team_mode::TEXT INTO v_team_mode
    FROM competitions
    WHERE id = NEW.competition_id;

    IF v_team_mode IS DISTINCT FROM 'fixed' THEN
      RAISE EXCEPTION 'Team prize pools require competition team_mode = ''fixed'' (got: %)', COALESCE(v_team_mode, 'NULL');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_team_pool_team_mode ON competition_prize_pools;
CREATE TRIGGER check_team_pool_team_mode
  BEFORE INSERT OR UPDATE ON competition_prize_pools
  FOR EACH ROW
  EXECUTE FUNCTION enforce_team_pool_requires_fixed_teams();

-- 6. Trigger: placement participant must match pool target_type
CREATE OR REPLACE FUNCTION enforce_placement_target_alignment()
RETURNS TRIGGER AS $$
DECLARE
  v_target TEXT;
BEGIN
  -- Pre-settlement rows have neither player_id nor team_id; allow.
  IF NEW.player_id IS NULL AND NEW.team_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT target_type INTO v_target
  FROM competition_prize_pools
  WHERE id = NEW.pool_id;

  IF v_target = 'individual' AND NEW.team_id IS NOT NULL THEN
    RAISE EXCEPTION 'Individual pool placements cannot have team_id';
  END IF;

  IF v_target = 'team' AND NEW.player_id IS NOT NULL THEN
    RAISE EXCEPTION 'Team pool placements cannot have player_id';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_placement_target_alignment ON prize_pool_placements;
CREATE TRIGGER check_placement_target_alignment
  BEFORE INSERT OR UPDATE ON prize_pool_placements
  FOR EACH ROW
  EXECUTE FUNCTION enforce_placement_target_alignment();
```

- [ ] **Step 2: Reset DB to apply triggers**

Run: `npx supabase db reset`
Expected: All migrations apply cleanly.

- [ ] **Step 3: Smoke test the eligibility trigger**

Run via psql or Supabase Studio:
```sql
-- Create a non-fixed competition (use existing seed or insert)
-- Then attempt to insert a team pool — must fail
INSERT INTO competition_prize_pools (competition_id, funding_type, funding_amount, total_pool_amount, status, created_by, target_type)
SELECT id, 'fixed_total', 100, 100, 'draft', organizer_id, 'team'
FROM competitions WHERE team_mode = 'none' LIMIT 1;
```
Expected: ERROR mentioning `team_mode = 'fixed'`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260430000000_team_prize_pool.sql
git commit -m "feat(db): add team-pool eligibility and placement-alignment triggers"
```

---

## Task 3: Database migration — settle_team_prize_pool RPC

**Files:**
- Modify: `supabase/migrations/20260430000000_team_prize_pool.sql` (append before COMMIT)

- [ ] **Step 1: Append the settlement RPC**

Insert before `COMMIT;`:

```sql
-- 7. Settlement RPC for team pools
CREATE OR REPLACE FUNCTION settle_team_prize_pool(p_pool_id UUID)
RETURNS VOID AS $$
DECLARE
  v_competition_id UUID;
  v_target TEXT;
  v_placement RECORD;
  v_team_id UUID;
  v_member_count INTEGER;
  v_share DECIMAL(10, 2);
  v_member RECORD;
BEGIN
  SELECT competition_id, target_type INTO v_competition_id, v_target
  FROM competition_prize_pools
  WHERE id = p_pool_id;

  IF v_competition_id IS NULL THEN
    RAISE EXCEPTION 'Prize pool not found: %', p_pool_id;
  END IF;

  IF v_target IS DISTINCT FROM 'team' THEN
    RAISE EXCEPTION 'settle_team_prize_pool called on non-team pool (target=%)', v_target;
  END IF;

  FOR v_placement IN
    SELECT id, position, payout_amount
    FROM prize_pool_placements
    WHERE pool_id = p_pool_id
    ORDER BY position
  LOOP
    -- Match team to position
    v_team_id := NULL;
    SELECT id INTO v_team_id
    FROM teams
    WHERE competition_id = v_competition_id
      AND final_position = v_placement.position
    LIMIT 1;

    IF v_team_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Assign team to placement
    UPDATE prize_pool_placements
    SET team_id = v_team_id, paid_at = NOW(), updated_at = NOW()
    WHERE id = v_placement.id;

    -- Per-member share
    SELECT COUNT(*) INTO v_member_count
    FROM team_members
    WHERE team_id = v_team_id;

    IF v_member_count = 0 THEN
      CONTINUE;
    END IF;

    v_share := ROUND(v_placement.payout_amount / v_member_count, 2);

    -- One transaction row per member
    FOR v_member IN
      SELECT player_id FROM team_members WHERE team_id = v_team_id
    LOOP
      INSERT INTO pool_transactions
        (pool_id, transaction_type, amount, description, balance_after, team_id, player_id)
      VALUES (
        p_pool_id,
        'prize_payout',
        -v_share,
        'Team payout: position ' || v_placement.position,
        get_pool_balance(p_pool_id),
        v_team_id,
        v_member.player_id
      );
    END LOOP;
  END LOOP;

  UPDATE competition_prize_pools
  SET status = 'settled', updated_at = NOW()
  WHERE id = p_pool_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION settle_team_prize_pool(UUID) IS
  'Assigns teams to placements via teams.final_position and writes per-member prize_payout transactions at payout_amount / team_size.';
```

- [ ] **Step 2: Reset DB to apply RPC**

Run: `npx supabase db reset`
Expected: All migrations apply cleanly.

- [ ] **Step 3: Verify function exists**

Run:
```bash
npx supabase db dump --schema public 2>/dev/null | grep "settle_team_prize_pool"
```
Expected: Function definition present.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260430000000_team_prize_pool.sql
git commit -m "feat(db): add settle_team_prize_pool RPC with per-member auto-split"
```

---

## Task 4: Regenerate Supabase types

**Files:**
- Modify: `src/types/supabase.ts` (auto-generated)

- [ ] **Step 1: Regenerate types**

Run (from project root):
```bash
npx supabase gen types typescript --local > src/types/supabase.ts
```
Expected: `src/types/supabase.ts` updates with new columns (`target_type`, `teams.final_position`, `pool_transactions.player_id`/`team_id`) and new RPC `settle_team_prize_pool`.

If the project uses `schema.ts` instead, regenerate that file by the same command.

- [ ] **Step 2: Verify type-check still passes**

Run: `pnpm type-check`
Expected: PASS — generated types compile.

- [ ] **Step 3: Commit**

```bash
git add src/types/supabase.ts src/types/database/schema.ts
git commit -m "chore(types): regenerate supabase types for team prize pool schema"
```

---

## Task 5: Update domain types — prizePool

**Files:**
- Modify: `src/types/database/prizePool.types.ts`

- [ ] **Step 1: Update `prizePool.types.ts`**

Open `src/types/database/prizePool.types.ts` and apply these edits:

Add at the top of the ENUMS section:
```typescript
/** Pool target — who is paid out */
export type PoolTargetType = 'individual' | 'team';
```

Update `CompetitionPrizePool`:
```typescript
export interface CompetitionPrizePool {
  id: string;
  competition_id: string;

  /** Pool target (individual players vs teams) */
  target_type: PoolTargetType;

  /** Funding configuration */
  funding_type: PoolFundingType;
  funding_amount: number;
  currency: string;

  /** Calculated total pool amount */
  total_pool_amount: number;

  /** Locking state (pool locked when any round starts) */
  is_locked: boolean;
  locked_at: string | null;

  /** Pool status */
  status: PoolStatus;

  /** Audit fields */
  created_by: string;
  created_at: string;
  updated_at: string;
}
```

Update `PrizePoolPlacement`:
```typescript
export interface PrizePoolPlacement {
  id: string;
  pool_id: string;
  position: number;
  percent: number;
  payout_amount: number;
  /** Set on settlement for individual pools */
  player_id: string | null;
  /** Set on settlement for team pools */
  team_id: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}
```

Update `PoolTransaction`:
```typescript
export interface PoolTransaction {
  id: string;
  pool_id: string;
  transaction_type: PoolTransactionType;
  amount: number;
  description: string | null;
  balance_after: number;
  /** Recipient player (set on prize_payout transactions) */
  player_id: string | null;
  /** Source team (set on team-pool prize_payout transactions) */
  team_id: string | null;
  created_by: string | null;
  created_at: string;
}
```

Update `CreatePrizePoolInput`:
```typescript
export interface CreatePrizePoolInput {
  competition_id: string;
  target_type: PoolTargetType;
  funding_type: PoolFundingType;
  funding_amount: number;
  currency?: string;
  placements: PlacementInput[];
}
```

- [ ] **Step 2: Verify type-check**

Run: `pnpm type-check`
Expected: Errors will surface in callers that don't yet pass `target_type`. That's intentional — we'll fix them in subsequent tasks. Note the failing files but don't fix yet.

- [ ] **Step 3: Commit**

```bash
git add src/types/database/prizePool.types.ts
git commit -m "feat(types): add PoolTargetType and team_id fields to prize pool types"
```

---

## Task 6: Update domain types — team

**Files:**
- Modify: `src/types/database/team.types.ts`

- [ ] **Step 1: Add `final_position`**

Open `src/types/database/team.types.ts` and locate the `Team` interface. Add `final_position`:

```typescript
export interface Team {
  // ...existing fields
  /** Set when the team-pool settlement runs. Null pre-settlement. */
  final_position: number | null;
}
```

- [ ] **Step 2: Verify type-check**

Run: `pnpm type-check`
Expected: Same baseline errors as Task 5 — we're widening the Team type, no callers should break.

- [ ] **Step 3: Commit**

```bash
git add src/types/database/team.types.ts
git commit -m "feat(types): add final_position to Team"
```

---

## Task 7: Update `useCompetitionPrizePool` to accept target

**Files:**
- Modify: `src/hooks/prizePool/queries.ts`
- Modify: `src/hooks/queryKeys.ts` (or wherever `prizePoolKeys` lives)

- [ ] **Step 1: Find the query keys file**

Run: `grep -rn "prizePoolKeys = " /Users/samkay/Documents/Metis\ Co/Dev/the-nineteenth/src --include="*.ts" | head -3`
Expected: Identifies where `prizePoolKeys` is declared. Open that file.

- [ ] **Step 2: Update `prizePoolKeys.pool` to include target**

Modify the key factory to accept and include target type:

```typescript
export const prizePoolKeys = {
  all: ['prizePool'] as const,
  pool: (competitionId: string, target: 'individual' | 'team' = 'individual') =>
    [...prizePoolKeys.all, 'pool', competitionId, target] as const,
  pools: (competitionId: string) =>
    [...prizePoolKeys.all, 'pools', competitionId] as const,
  placements: (poolId: string) =>
    [...prizePoolKeys.all, 'placements', poolId] as const,
  transactions: (poolId: string) =>
    [...prizePoolKeys.all, 'transactions', poolId] as const,
};
```

(Adjust to fit the existing key shape — preserve other entries.)

- [ ] **Step 3: Update `useCompetitionPrizePool` to filter by target**

Edit `src/hooks/prizePool/queries.ts` `useCompetitionPrizePool`:

```typescript
import type { PoolTargetType } from '@/types/database/prizePool.types';

export function useCompetitionPrizePool(
  competitionId: string | undefined,
  target: PoolTargetType = 'individual'
) {
  return useQuery({
    queryKey: prizePoolKeys.pool(competitionId ?? '', target),
    queryFn: async (): Promise<CompetitionPrizePool | null> => {
      if (!competitionId) return null;

      const { data: pool, error } = await supabase
        .from('competition_prize_pools' as never)
        .select('*')
        .eq('competition_id', competitionId)
        .eq('target_type', target)
        .maybeSingle();

      if (error) {
        throw createError(`Failed to fetch prize pool: ${error.message}`, 'DATABASE');
      }

      return (pool as unknown as CompetitionPrizePool) ?? null;
    },
    enabled: !!competitionId,
    staleTime: CACHE_TIMES.FREQUENT,
    gcTime: GC_TIMES.SHORT,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
```

Note the swap from `.single()` (which errored on no row) to `.maybeSingle()` (returns null) — simpler and avoids the PGRST116 special case.

- [ ] **Step 4: Add `useCompetitionPrizePools` (both pools)**

Append to `src/hooks/prizePool/queries.ts`:

```typescript
export interface CompetitionPrizePools {
  individual: CompetitionPrizePool | null;
  team: CompetitionPrizePool | null;
}

export function useCompetitionPrizePools(competitionId: string | undefined) {
  return useQuery({
    queryKey: prizePoolKeys.pools(competitionId ?? ''),
    queryFn: async (): Promise<CompetitionPrizePools> => {
      if (!competitionId) return { individual: null, team: null };

      const { data, error } = await supabase
        .from('competition_prize_pools' as never)
        .select('*')
        .eq('competition_id', competitionId);

      if (error) {
        throw createError(`Failed to fetch prize pools: ${error.message}`, 'DATABASE');
      }

      const rows = (data ?? []) as unknown as CompetitionPrizePool[];
      return {
        individual: rows.find((p) => p.target_type === 'individual') ?? null,
        team: rows.find((p) => p.target_type === 'team') ?? null,
      };
    },
    enabled: !!competitionId,
    staleTime: CACHE_TIMES.FREQUENT,
    gcTime: GC_TIMES.SHORT,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
```

- [ ] **Step 5: Re-export from index**

Open `src/hooks/prizePool/index.ts` and add:

```typescript
export { useCompetitionPrizePools } from './queries';
export type { CompetitionPrizePools } from './queries';
```

- [ ] **Step 6: Verify type-check**

Run: `pnpm type-check`
Expected: Same baseline errors from Task 5/6 still surface (callers needing target updates), plus possibly new ones if the keys change broke other call sites. Resolve any net-new errors caused by the key signature change by passing `'individual'` (default) at call sites.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/prizePool src/hooks/queryKeys.ts
git commit -m "feat(prize-pool): add target-aware queries and useCompetitionPrizePools"
```

---

## Task 8: Update `useCreatePrizePool` to accept target

**Files:**
- Modify: `src/hooks/prizePool/mutations.ts`

- [ ] **Step 1: Update `useCreatePrizePool`**

In `src/hooks/prizePool/mutations.ts`, update the input shape and insert. The funding math stays unchanged (per-player still multiplies by player_count even for team pools, per the spec).

Replace the body of `useCreatePrizePool` mutationFn:

```typescript
mutationFn: async (
  input: CreatePrizePoolInput & { created_by: string; player_count: number }
): Promise<CompetitionPrizePool> => {
  const { player_count, placements, ...poolInput } = input;

  const totalPercent = placements.reduce((sum, p) => sum + p.percent, 0);
  if (Math.abs(totalPercent - 100) > 0.01) {
    throw createError('Placement percentages must sum to 100%', 'VALIDATION');
  }

  const totalPoolAmount =
    poolInput.funding_type === 'per_player'
      ? poolInput.funding_amount * player_count
      : poolInput.funding_amount;

  const { data, error } = await supabase
    .from('competition_prize_pools' as never)
    .insert({
      competition_id: poolInput.competition_id,
      target_type: poolInput.target_type,
      funding_type: poolInput.funding_type,
      funding_amount: poolInput.funding_amount,
      currency: poolInput.currency ?? 'AUD',
      total_pool_amount: totalPoolAmount,
      status: 'draft',
      created_by: poolInput.created_by,
    } as never)
    .select()
    .single();

  if (error) {
    throw createError(`Failed to create prize pool: ${error.message}`, 'DATABASE');
  }

  const pool = data as unknown as CompetitionPrizePool;

  const placementRows = placements.map((p) => ({
    pool_id: pool.id,
    position: p.position,
    percent: p.percent,
    payout_amount: (totalPoolAmount * p.percent) / 100,
  }));

  const { error: placementError } = await supabase
    .from('prize_pool_placements' as never)
    .insert(placementRows as never);

  if (placementError) {
    await supabase
      .from('competition_prize_pools' as never)
      .delete()
      .eq('id', pool.id);
    throw createError(`Failed to create placements: ${placementError.message}`, 'DATABASE');
  }

  return pool;
},
```

Update the `onSuccess` to invalidate both target keys:

```typescript
onSuccess: (data) => {
  queryClient.invalidateQueries({
    queryKey: prizePoolKeys.pool(data.competition_id, data.target_type),
  });
  queryClient.invalidateQueries({
    queryKey: prizePoolKeys.pools(data.competition_id),
  });
  queryClient.invalidateQueries({
    queryKey: competitionKeys.detail(data.competition_id),
  });
},
```

- [ ] **Step 2: Verify type-check**

Run: `pnpm type-check`
Expected: Callers passing `CreatePrizePoolInput` without `target_type` will fail. We fix those in later tasks (PrizePoolSection wiring). The hook itself compiles.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/prizePool/mutations.ts
git commit -m "feat(prize-pool): pass target_type through useCreatePrizePool"
```

---

## Task 9: Branch `useSettleCompetitionPayouts` by target

**Files:**
- Modify: `src/hooks/prizePool/mutations.ts`

- [ ] **Step 1: Update the hook to accept and dispatch by target**

Replace `useSettleCompetitionPayouts`:

```typescript
/**
 * Settle a competition's prize pool by writing final positions and invoking the
 * matching settle RPC. Dispatches by the pool's target_type:
 *   - 'individual': writes competition_players.final_position, calls settle_prize_pool
 *   - 'team': writes teams.final_position, calls settle_team_prize_pool
 */
export function useSettleCompetitionPayouts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      poolId,
      competitionId,
      target,
      standings,
    }: {
      poolId: string;
      competitionId: string;
      target: 'individual' | 'team';
      /**
       * Standings to commit. `participantId` is the player id (individual) or
       * team id (team) depending on target.
       */
      standings: { participantId: string; position: number }[];
    }): Promise<void> => {
      if (target === 'individual') {
        for (const standing of standings) {
          const { error: updateError } = await supabase
            .from('competition_players' as never)
            // @ts-expect-error - Supabase types don't cover partial updates well
            .update({ final_position: standing.position })
            .eq('competition_id', competitionId)
            .eq('player_id', standing.participantId);

          if (updateError) {
            throw createError(
              `Failed to set final position for player: ${updateError.message}`,
              'DATABASE'
            );
          }
        }

        const { error: rpcError } = await supabase.rpc('settle_prize_pool' as never, {
          p_pool_id: poolId,
        } as never);

        if (rpcError) {
          throw createError(`Failed to settle prize pool: ${rpcError.message}`, 'DATABASE');
        }
      } else {
        for (const standing of standings) {
          const { error: updateError } = await supabase
            .from('teams' as never)
            // @ts-expect-error - Supabase types don't cover partial updates well
            .update({ final_position: standing.position })
            .eq('competition_id', competitionId)
            .eq('id', standing.participantId);

          if (updateError) {
            throw createError(
              `Failed to set final position for team: ${updateError.message}`,
              'DATABASE'
            );
          }
        }

        const { error: rpcError } = await supabase.rpc('settle_team_prize_pool' as never, {
          p_pool_id: poolId,
        } as never);

        if (rpcError) {
          throw createError(`Failed to settle team prize pool: ${rpcError.message}`, 'DATABASE');
        }
      }
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.pool(variables.competitionId, variables.target),
      });
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.pools(variables.competitionId),
      });
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.placements(variables.poolId),
      });
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.transactions(variables.poolId),
      });
      queryClient.invalidateQueries({
        queryKey: competitionKeys.detail(variables.competitionId),
      });
    },

    onError: (error) => {
      console.error('[useSettleCompetitionPayouts] Failed to settle payouts:', error);
    },
  });
}
```

- [ ] **Step 2: Verify type-check**

Run: `pnpm type-check`
Expected: Callers of `useSettleCompetitionPayouts` (PayoutsTab) need to pass `target`. That's flagged for Task 16. Hook compiles.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/prizePool/mutations.ts
git commit -m "feat(prize-pool): dispatch useSettleCompetitionPayouts by pool target"
```

---

## Task 10: Test settle dispatcher

**Files:**
- Create: `src/__tests__/hooks/prizePool/settleByTarget.test.ts`

Skip this task if there's no existing pattern in `src/__tests__/hooks/` for testing TanStack mutations against a mocked Supabase client. Otherwise:

- [ ] **Step 1: Confirm test infra**

Run: `find /Users/samkay/Documents/Metis\ Co/Dev/the-nineteenth/src/__tests__/hooks -name "*.test.ts" 2>/dev/null | head -5`
If no hook tests exist, skip Step 2-4 and commit nothing for this task.

- [ ] **Step 2: Write a failing test**

```typescript
import { renderHook, waitFor } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSettleCompetitionPayouts } from '@/hooks/prizePool/mutations';
import { supabase } from '@/services/supabase/client';

jest.mock('@/services/supabase/client');

describe('useSettleCompetitionPayouts target dispatch', () => {
  it('writes teams.final_position and calls settle_team_prize_pool when target=team', async () => {
    const update = jest.fn().mockReturnThis();
    const eq = jest.fn().mockReturnThis();
    const rpc = jest.fn().mockResolvedValue({ error: null });
    const fromTeams = { update, eq } as any;
    update.mockReturnValue(fromTeams);
    eq.mockResolvedValue({ error: null });

    (supabase as any).from = jest.fn().mockImplementation((table: string) => {
      if (table === 'teams') return fromTeams;
      throw new Error(`unexpected table: ${table}`);
    });
    (supabase as any).rpc = rpc;

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useSettleCompetitionPayouts(), { wrapper });

    await result.current.mutateAsync({
      poolId: 'pool-1',
      competitionId: 'comp-1',
      target: 'team',
      standings: [{ participantId: 'team-A', position: 1 }],
    });

    expect((supabase as any).from).toHaveBeenCalledWith('teams');
    expect(rpc).toHaveBeenCalledWith('settle_team_prize_pool', { p_pool_id: 'pool-1' });
  });
});
```

- [ ] **Step 3: Run the test**

Run: `pnpm test -- settleByTarget`
Expected: PASS (since hook is already implemented).

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/hooks/prizePool/settleByTarget.test.ts
git commit -m "test(prize-pool): cover team-target dispatch in useSettleCompetitionPayouts"
```

---

## Task 11: Update `usePrizePoolConfig` for target awareness

**Files:**
- Modify: `src/components/prizePool/usePrizePoolConfig.ts`

- [ ] **Step 1: Add target-related options and logic**

Open `src/components/prizePool/usePrizePoolConfig.ts`.

Update imports and the options interface:

```typescript
import type {
  CompetitionPrizePool,
  PoolFundingType,
  PoolTargetType,
} from '@/types';

interface UsePrizePoolConfigOptions {
  pool: CompetitionPrizePool | null;
  /** Number of players in competition */
  playerCount: number;
  /** Number of teams in competition (required when targetType='team') */
  teamCount?: number;
  /** Pool target — defaults to 'individual' */
  targetType?: PoolTargetType;
  onPoolChange: (config: PrizePoolConfig | null) => void;
  disabled?: boolean;
  editState?: PrizePoolEditState;
  hideToggle?: boolean;
}
```

Replace the function signature and the `maxPlacements` calculation:

```typescript
export function usePrizePoolConfig({
  pool,
  playerCount,
  teamCount = 0,
  targetType = 'individual',
  onPoolChange,
  disabled,
  editState,
  hideToggle,
}: UsePrizePoolConfigOptions) {
  // ...existing setup unchanged

  // Max placements capped at participant count (minimum 1)
  const participantCount = targetType === 'team' ? teamCount : playerCount;
  const maxPlacements = Math.max(participantCount, 1);

  // ...rest unchanged
```

Update labels:

```typescript
  const labelText = hasExistingPool
    ? `${targetType === 'team' ? 'Team' : 'Individual'} Prize Pool Configured`
    : `Add ${targetType === 'team' ? 'Team' : 'Individual'} Prize Pool`;

  const descriptionText =
    isLocked && editState?.lockedReason
      ? editState.lockedReason
      : targetType === 'team'
        ? 'Distribute prizes to top finishing teams (auto-split among members)'
        : 'Distribute prizes to top finishers';
```

Add `targetType` to the return object:

```typescript
  return {
    poolEnabled,
    config,
    calculations,
    maxPlacements,
    targetType,
    isEditMode,
    isLocked,
    isDisabled,
    hasExistingPool,
    labelText,
    descriptionText,
    handleToggle,
    handleFundingTypeChange,
    handleFundingAmountChange,
    handlePlacementPercentChange,
    handleAddPlacement,
    handleRemovePlacement,
  };
```

- [ ] **Step 2: Verify type-check**

Run: `pnpm type-check`
Expected: Hook compiles. Callers of `PrizePoolSection` may now have new errors as the section forwards target — fix in next task.

- [ ] **Step 3: Commit**

```bash
git add src/components/prizePool/usePrizePoolConfig.ts
git commit -m "feat(prize-pool): teach usePrizePoolConfig about pool target and team count"
```

---

## Task 12: Pass target through `PrizePoolSection`

**Files:**
- Modify: `src/components/prizePool/PrizePoolSection.tsx`

- [ ] **Step 1: Add `targetType` and `teamCount` props**

Open `src/components/prizePool/PrizePoolSection.tsx`. Update the props interface:

```typescript
import type { PoolTargetType } from '@/types/database/prizePool.types';

export interface PrizePoolSectionProps {
  competitionId?: string;
  pool: CompetitionPrizePool | null;
  playerCount: number;
  teamCount?: number;
  targetType?: PoolTargetType;
  roundCount: number;
  onPoolChange: (config: import('./usePrizePoolConfig').PrizePoolConfig | null) => void;
  onUpgradePress: () => void;
  disabled?: boolean;
  editState?: import('./usePrizePoolConfig').PrizePoolEditState;
  hideToggle?: boolean;
}
```

Update the component signature and the hook call:

```typescript
export const PrizePoolSection = memo(function PrizePoolSection({
  competitionId: _competitionId,
  pool,
  playerCount,
  teamCount = 0,
  targetType = 'individual',
  roundCount: _roundCount,
  onPoolChange,
  onUpgradePress,
  disabled,
  editState,
  hideToggle,
}: PrizePoolSectionProps) {
  // ...
  const {
    // ...same destructure
  } = usePrizePoolConfig({
    pool,
    playerCount,
    teamCount,
    targetType,
    onPoolChange,
    disabled,
    editState,
    hideToggle,
  });
  // ...rest unchanged
```

- [ ] **Step 2: Verify type-check**

Run: `pnpm type-check`
Expected: PrizePoolSection compiles. Callers (CreateCompetitionScreen wizard, EditPrizePoolBottomSheet) still work since the new props are optional.

- [ ] **Step 3: Commit**

```bash
git add src/components/prizePool/PrizePoolSection.tsx
git commit -m "feat(prize-pool): accept targetType and teamCount on PrizePoolSection"
```

---

## Task 13: Update `EditPrizePoolBottomSheet` to pass target through

**Files:**
- Modify: `src/components/prizePool/EditPrizePoolBottomSheet.tsx`

- [ ] **Step 1: Read the file to find the create-call site**

Open `src/components/prizePool/EditPrizePoolBottomSheet.tsx`. Find where `createPoolMutation.mutate(...)` is called.

- [ ] **Step 2: Add a `targetType` prop and forward it**

Add to the component's props:

```typescript
import type { PoolTargetType } from '@/types/database/prizePool.types';

interface EditPrizePoolBottomSheetProps {
  // ...existing props
  /** Pool target — defaults to 'individual' */
  targetType?: PoolTargetType;
  /** Number of teams (required when targetType='team') */
  teamCount?: number;
}
```

In the component body, default `targetType = 'individual'` and `teamCount = 0`. Use them in:
- The `useCompetitionPrizePool(visible ? competitionId : undefined, targetType)` call (Task 7 made this two-arg).
- Pass `targetType` and `teamCount` to `<PrizePoolSection ... targetType={targetType} teamCount={teamCount} />`.
- In the `createPoolMutation.mutate(...)` payload, include `target_type: targetType`.

Example create payload (find the existing one and add `target_type`):

```typescript
createPoolMutation.mutate({
  competition_id: competitionId,
  target_type: targetType,
  funding_type: config.fundingType,
  funding_amount: config.fundingAmount,
  placements: config.placements.map((p) => ({ position: p.position, percent: p.percent })),
  created_by: userId,
  player_count: playerCount,
});
```

- [ ] **Step 3: Verify type-check**

Run: `pnpm type-check`
Expected: PASS for this file. Other callers of the bottom sheet still work since `targetType` is optional with a default.

- [ ] **Step 4: Commit**

```bash
git add src/components/prizePool/EditPrizePoolBottomSheet.tsx
git commit -m "feat(prize-pool): forward target through EditPrizePoolBottomSheet"
```

---

## Task 14: Update `PrizePoolSummaryCard` (target pill + per-member share)

**Files:**
- Modify: `src/components/prizePool/PrizePoolSummaryCard.tsx`

- [ ] **Step 1: Read the file**

Open `src/components/prizePool/PrizePoolSummaryCard.tsx` and identify:
- Where the header is rendered.
- Where settled placements list winners.

- [ ] **Step 2: Add target pill in header**

Add a `target_type` read from the `pool` prop, render a small `Pill` next to the title:

```typescript
import { Pill } from '@/components/common';

// In the header JSX, next to the trophy icon:
<Pill
  label={pool.target_type === 'team' ? 'Team' : 'Individual'}
  variant={pool.target_type === 'team' ? 'primary' : 'neutral'}
  filled
  size="sm"
/>
```

- [ ] **Step 3: Show per-member share when settled (team pools only)**

Where the settled placements display the winner, branch on target:

```typescript
{pool.target_type === 'team' && placement.team_id && teamLookup ? (
  <View style={styles.teamWinner}>
    <Text style={[typography.body, { color: colors.textPrimary }]}>
      {teamLookup.get(placement.team_id)?.name ?? 'Team'}
    </Text>
    <Text style={[typography.caption, { color: colors.textSecondary }]}>
      {formatMoney(placement.payout_amount, pool.currency)} —{' '}
      {formatMoney(
        placement.payout_amount / Math.max(1, teamLookup.get(placement.team_id)?.memberCount ?? 1),
        pool.currency
      )} each
    </Text>
  </View>
) : (
  /* existing individual rendering */
)}
```

If the component doesn't currently receive a `teamLookup`, add an optional prop:

```typescript
interface PrizePoolSummaryCardProps {
  // ...existing
  /** Team metadata for rendering team winners (team pools only) */
  teamLookup?: Map<string, { name: string; memberCount: number }>;
}
```

Callers that don't render team pools simply omit it.

- [ ] **Step 4: Verify type-check**

Run: `pnpm type-check`
Expected: PASS for this file. Callers still work with the optional prop.

- [ ] **Step 5: Commit**

```bash
git add src/components/prizePool/PrizePoolSummaryCard.tsx
git commit -m "feat(prize-pool): show target pill and per-member share on summary card"
```

---

## Task 15: Render `PrizePoolSection` twice in CreateCompetitionScreen

**Files:**
- Modify: `src/screens/admin/CreateCompetitionScreen/...` (find by grep)

- [ ] **Step 1: Locate where `PrizePoolSection` is rendered in the wizard**

Run:
```bash
grep -rn "PrizePoolSection" /Users/samkay/Documents/Metis\ Co/Dev/the-nineteenth/src/screens/admin/CreateCompetitionScreen --include="*.tsx" 2>/dev/null
```
Expected: Identifies the wizard step file. Open it.

- [ ] **Step 2: Conditionally render the team-pool section**

Below the existing `<PrizePoolSection ... />`, add a sibling that renders only when the wizard's competition has `team_mode === 'fixed'`:

```typescript
{teamMode === 'fixed' && (
  <PrizePoolSection
    competitionId={competitionId}
    targetType="team"
    pool={teamPool ?? null}
    playerCount={playerCount}
    teamCount={teamCount}
    roundCount={roundCount}
    onPoolChange={handleTeamPoolChange}
    onUpgradePress={onUpgradePress}
    disabled={disabled}
  />
)}
```

Wire `teamPool`, `teamCount`, and `handleTeamPoolChange` through whatever wizard state hook the screen uses. `teamCount` is `Math.floor(playerCount / teamSize)` or — if teams are explicitly created in the wizard — the count of created teams.

- [ ] **Step 3: Update the form-submit hook to create both pools**

Open `src/screens/admin/CreateCompetitionScreen/hooks/useCompetitionFormSubmit.ts`. Find the `createPrizePool.mutate(...)` call. Add a sibling call when a team-pool config is present:

```typescript
if (poolConfig) {
  await createPrizePool.mutateAsync({
    competition_id: competition.id,
    target_type: 'individual',
    funding_type: poolConfig.fundingType,
    funding_amount: poolConfig.fundingAmount,
    placements: poolConfig.placements,
    created_by: userId,
    player_count: playerCount,
  });
}

if (teamPoolConfig && competition.team_mode === 'fixed') {
  await createPrizePool.mutateAsync({
    competition_id: competition.id,
    target_type: 'team',
    funding_type: teamPoolConfig.fundingType,
    funding_amount: teamPoolConfig.fundingAmount,
    placements: teamPoolConfig.placements,
    created_by: userId,
    player_count: playerCount,
  });
}
```

- [ ] **Step 4: Verify type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/admin/CreateCompetitionScreen
git commit -m "feat(prize-pool): render team prize pool section in create wizard for fixed-team comps"
```

---

## Task 16: Update CompetitionDetailScreen to fetch both pools

**Files:**
- Modify: `src/screens/competitions/CompetitionDetailScreen/hooks/useCompetitionDetailData.ts`

- [ ] **Step 1: Replace single-pool fetch with both-pool fetch**

Open the file. Find:

```typescript
import { useCompetitionPrizePool, usePrizePoolPlacements } from '@/hooks/prizePool';
// ...
} = useCompetitionPrizePool(id);
const { data: prizePoolPlacements } = usePrizePoolPlacements(prizePool?.id);
```

Replace with:

```typescript
import {
  useCompetitionPrizePools,
  usePrizePoolPlacements,
} from '@/hooks/prizePool';
// ...
const { data: prizePools } = useCompetitionPrizePools(id);
const individualPool = prizePools?.individual ?? null;
const teamPool = prizePools?.team ?? null;
const { data: individualPlacements } = usePrizePoolPlacements(individualPool?.id);
const { data: teamPlacements } = usePrizePoolPlacements(teamPool?.id);
```

Surface the new values in the hook's return shape (e.g. `individualPool`, `individualPlacements`, `teamPool`, `teamPlacements`). Keep the existing `prizePool` / `prizePoolPlacements` returned values as aliases of `individualPool` / `individualPlacements` for backwards compatibility with non-PayoutsTab consumers in the screen.

- [ ] **Step 2: Verify type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/screens/competitions/CompetitionDetailScreen/hooks/useCompetitionDetailData.ts
git commit -m "feat(prize-pool): fetch both individual and team pools in detail screen"
```

---

## Task 17: Update `PayoutsTab` to render two settlement cards

**Files:**
- Modify: `src/components/competitions/detail/PayoutsTab.tsx`
- Modify: `src/screens/competitions/CompetitionDetailScreen/index.tsx` (or wherever PayoutsTab is used)

- [ ] **Step 1: Refactor `PayoutsTab` to accept both pools**

Update props:

```typescript
export interface PayoutsTabProps {
  competition: Competition;
  individualPool: CompetitionPrizePool | null;
  individualPlacements: PrizePoolPlacement[];
  teamPool: CompetitionPrizePool | null;
  teamPlacements: PrizePoolPlacement[];
  isOrganizer: boolean;
}
```

Internally split into a single `PoolSection` subcomponent that handles one pool, and call it twice. Sketch:

```typescript
function PoolSection({
  competition,
  pool,
  placements,
  isOrganizer,
}: {
  competition: Competition;
  pool: CompetitionPrizePool;
  placements: PrizePoolPlacement[];
  isOrganizer: boolean;
}) {
  const colors = useThemeColors();

  const { data: leaderboard, isLoading: isLoadingLeaderboard } =
    useCompetitionLeaderboard(competition.id, {
      filter: pool.target_type === 'team' ? 'teams' : 'individuals',
    });

  // ...existing leaderByPosition / placementViews / hasTiesAtPaying logic, unchanged

  const { mutate: settle, isPending: isSettling } = useSettleCompetitionPayouts();

  const handleSettleConfirm = () => {
    if (!leaderboard) return;
    setShowConfirm(false);
    settle({
      poolId: pool.id,
      competitionId: competition.id,
      target: pool.target_type,
      standings: leaderboard.map((e) => ({
        participantId: e.participantId,
        position: e.position,
      })),
    });
  };

  return (
    /* existing JSX, but replace `prizePool` with `pool`,
       and remove the isTeamCompetition helper text since it
       no longer applies — render a target pill in the header instead. */
  );
}

export function PayoutsTab({
  competition,
  individualPool,
  individualPlacements,
  teamPool,
  teamPlacements,
  isOrganizer,
}: PayoutsTabProps) {
  return (
    <View>
      {individualPool && (
        <PoolSection
          competition={competition}
          pool={individualPool}
          placements={individualPlacements}
          isOrganizer={isOrganizer}
        />
      )}
      {teamPool && (
        <PoolSection
          competition={competition}
          pool={teamPool}
          placements={teamPlacements}
          isOrganizer={isOrganizer}
        />
      )}
    </View>
  );
}
```

The existing "Prize pool pays individual positions — teams don't affect payouts." helper text can be removed since the team pool now handles team payouts.

- [ ] **Step 2: Update PayoutsTab callers**

Open `src/screens/competitions/CompetitionDetailScreen/index.tsx`. Find where `<PayoutsTab ... />` is rendered. Update the prop spread to pass `individualPool`, `individualPlacements`, `teamPool`, `teamPlacements` from the detail-data hook.

- [ ] **Step 3: Verify type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 4: Verify lint**

Run: `pnpm lint`
Expected: PASS (or only pre-existing warnings).

- [ ] **Step 5: Commit**

```bash
git add src/components/competitions/detail/PayoutsTab.tsx src/screens/competitions/CompetitionDetailScreen
git commit -m "feat(prize-pool): render per-pool settlement cards in PayoutsTab"
```

---

## Task 18: Subscription gating

**Files:**
- Inspect: existing `useCheckFeature('prize_pool')` usage. No code change expected unless the team-pool toggle introduces a new gating call.

- [ ] **Step 1: Verify the team-pool toggle uses the same feature flag**

The PrizePoolSection already calls `useCheckFeature('prize_pool')` once per render. Since we render it twice for fixed-team comps, both check the same flag. Confirm by re-reading `PrizePoolSection.tsx` — no change needed.

- [ ] **Step 2: Commit (no-op verification only)**

No commit. Mark task complete.

---

## Task 19: Eligibility gating in EditCompetitionScreen / mode-change side effect

**Files:**
- Inspect: edit competition screen for team_mode change UI

- [ ] **Step 1: Find the edit-competition team-mode change handler**

Run:
```bash
grep -rn "team_mode\|teamMode" /Users/samkay/Documents/Metis\ Co/Dev/the-nineteenth/src/screens --include="*.tsx" 2>/dev/null | head -10
```

- [ ] **Step 2: Add a confirm-and-delete on team_mode away from 'fixed'**

In the edit-competition team-mode change handler, before committing the change:

```typescript
// pseudocode — adapt to actual handler
if (currentTeamMode === 'fixed' && newTeamMode !== 'fixed' && teamPool) {
  if (teamPool.is_locked) {
    showError('Cannot change team mode: team prize pool is locked.');
    return;
  }
  const confirmed = await showConfirm({
    title: 'Remove team prize pool?',
    message: 'Switching away from fixed teams will delete the team prize pool.',
  });
  if (!confirmed) return;
  await deleteTeamPool({ poolId: teamPool.id, competitionId });
}
```

Use the existing `useDeletePrizePool` hook for the deletion.

If the edit-competition screen doesn't currently allow team_mode changes at all, skip this task.

- [ ] **Step 3: Verify type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/screens
git commit -m "feat(prize-pool): delete team pool when switching away from fixed teams"
```

---

## Task 20: End-to-end smoke test (manual)

**Files:** none

- [ ] **Step 1: Start the dev server**

Run: `npx expo start`

- [ ] **Step 2: Create a fixed-team competition with both pools**

In the wizard:
- Set team mode to "Fixed"
- Add 8 players, assign to 4 teams of 2
- Enable individual pool: $20/player, default 60/30/10
- Enable team pool: $40/team via fixed_total = $160, default 60/30/10
- Submit

Verify in DB or via the UI: two `competition_prize_pools` rows, two sets of placements.

- [ ] **Step 3: Lock by starting a round**

Start one round. Reopen the competition's edit screen. Both pools show locked.

- [ ] **Step 4: Settle individual pool**

Complete the competition. On the Payouts tab, the individual settlement card lists individual leaderboard. Confirm. Verify `prize_pool_placements` for the individual pool now have `player_id` set.

- [ ] **Step 5: Settle team pool**

The team settlement card lists team standings. Confirm. Verify `prize_pool_placements` for team pool have `team_id` set, and `pool_transactions` has one row per team member with `player_id` and `team_id` set, amount = `payout / 2`.

- [ ] **Step 6: Document any failures**

If any step fails, file each issue as a follow-up in the plan rather than fixing inline. The handoff to inline-execution should pause for review.

---

## Task 21: Final verification

- [ ] **Step 1: Type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: PASS (or pre-existing warnings only).

- [ ] **Step 3: Tests**

Run: `pnpm test`
Expected: PASS (or pre-existing failures only — should not include any net-new failures).

- [ ] **Step 4: Final commit (if any aggregate fixes needed)**

If steps 1-3 surfaced anything, fix and commit:
```bash
git add -A
git commit -m "chore(prize-pool): post-implementation cleanup"
```
