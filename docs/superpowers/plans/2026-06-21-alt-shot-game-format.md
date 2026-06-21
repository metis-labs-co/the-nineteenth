# Alt Shot (Foursomes) Game Format Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Alt Shot" (alternate shot / foursomes) team game format for competition rounds: a combined whole-match preset scored net-lowest off each team's own 50%-combined handicap, and a Ryder-Cup 2v2 split preset scored by handicap differential and decided on total net.

**Architecture:** Alt Shot is a new team-only `GameType` `'alt-shot'`, the same finalization shape as Scramble. The **combined** preset reuses the Scramble round-total path with a new 50%-combined handicap helper. The **split** preset repurposes the existing `ryder_cup_foursomes_2v2` stub and extends `finalizePairResults` with a one-ball-per-side, rounded-differential, total-net sub-match resolver.

**Tech Stack:** TypeScript, React Native (Expo), Supabase/Postgres migrations, Jest.

## Global Constraints

- Handicap allowance = **50% of the sum of partners' daily handicaps** (= average of the pair), rounded to 1 dp. Per-hole/round allocation uses `floor()`, capped at 18 (mirrors Scramble).
- Scoring is **net stroke play, lowest wins**. No Stableford basis. No hole-by-hole match-play decision — sub-matches decide on **total net**.
- **Strictly 2 players** per team / sub-team.
- **Combined** preset: each team off its **own** 50%-combined handicap; ranked net-lowest across the field.
- **Split** preset: the two sides' 50%-combined handicaps are compared; `diff = round(|A−B|)` (nearest, .5 up) strokes go to the **higher-handicap** side on the hardest holes; the side with the lower **net total** wins the `pair_points` (`{win:1, tie:0.5, loss:0}`).
- **Premium** tier; **competition team rounds only** (no `standalone` field on either preset).
- Daily handicap source = the scorecard's `daily_handicap_used`, falling back to the player record's `handicap` (mirrors `resolveMemberDailyHandicaps` in `scramble.ts`).
- Migrations are NOT auto-applied to staging/prod — they are a manual deploy step (see Task 9).
- Diff tests against the documented Jest baseline (~243 pre-existing failures on `main`); do not expect a fully green suite.

---

### Task 1: Alt Shot team handicap + round-total score (pure util)

Clone the Scramble round-total math with a 50% allowance. Pure, no IO — fully testable in isolation and does not yet touch the `GameType` union.

**Files:**
- Create: `src/utils/teamScoring/altShot.ts`
- Test: `src/utils/teamScoring/altShot.test.ts`

**Interfaces:**
- Consumes: `Scorecard` from `@/types/database/scorecard.types`; reuses the `ScrambleTeamMember` / `ScrambleTeamScore` shapes' intent.
- Produces:
  - `calculateAltShotTeamHandicap(members: { handicap?: number | null }[]): number`
  - `computeAltShotTeamRoundScore(teamScorecards: Scorecard[], members: AltShotTeamMember[]): AltShotTeamScore`
  - `interface AltShotTeamMember { player_id: string; handicap: number | null | undefined }`
  - `interface AltShotTeamScore { teamGross: number; teamHandicap: number; teamHandicapStrokes: number; teamNet: number; holesCompleted: number }`

- [ ] **Step 1: Write the failing test**

```typescript
// src/utils/teamScoring/altShot.test.ts
import {
  calculateAltShotTeamHandicap,
  computeAltShotTeamRoundScore,
} from './altShot';
import type { Scorecard } from '@/types/database/scorecard.types';

describe('calculateAltShotTeamHandicap', () => {
  it('is 50% of the combined member handicaps (pair average)', () => {
    expect(calculateAltShotTeamHandicap([{ handicap: 9 }, { handicap: 11 }])).toBe(10);
    expect(calculateAltShotTeamHandicap([{ handicap: 8 }, { handicap: 13 }])).toBe(10.5);
  });

  it('rounds to 1 decimal place and treats null/undefined as 0', () => {
    expect(calculateAltShotTeamHandicap([{ handicap: 7 }, { handicap: null }])).toBe(3.5);
    expect(calculateAltShotTeamHandicap([])).toBe(0);
  });
});

describe('computeAltShotTeamRoundScore', () => {
  const members = [
    { player_id: 'p1', handicap: 9 },
    { player_id: 'p2', handicap: 11 },
  ];

  const oneBallCard = (playerId: string): Scorecard =>
    ({
      player_id: playerId,
      daily_handicap_used: playerId === 'p1' ? 9 : 11,
      scores: { '1': { strokes: 4 }, '2': { strokes: 5 } },
      total_gross: 9,
      total_net: 0,
      total_points: 0,
    } as unknown as Scorecard);

  it('reads one ball, applies floor(50% combined) strokes for net', () => {
    const score = computeAltShotTeamRoundScore([oneBallCard('p1'), oneBallCard('p2')], members);
    expect(score.teamHandicap).toBe(10); // (9+11)/2
    expect(score.teamHandicapStrokes).toBe(10);
    expect(score.teamGross).toBe(9); // from total_gross
    expect(score.teamNet).toBe(9 - 10);
    expect(score.holesCompleted).toBe(2);
  });

  it('returns zeros when no card has data', () => {
    const score = computeAltShotTeamRoundScore([], members);
    expect(score).toEqual({
      teamGross: 0,
      teamHandicap: 0,
      teamHandicapStrokes: 0,
      teamNet: 0,
      holesCompleted: 0,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/utils/teamScoring/altShot.test.ts`
Expected: FAIL — `Cannot find module './altShot'`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/utils/teamScoring/altShot.ts
/**
 * Alt Shot (Foursomes) Team Scoring
 *
 * One ball per team (partners alternate shots). Mirrors scramble.ts, but the
 * team handicap allowance is 50% of the sum of member daily handicaps (the
 * WHS foursomes standard) instead of scramble's 25%. Used by the combined
 * Alt Shot finalize path (resultsEngine.pickAltShotScore).
 */
import type { Scorecard } from '@/types/database/scorecard.types';

export interface AltShotTeamMember {
  player_id: string;
  handicap: number | null | undefined;
}

interface HandicapOnly {
  handicap?: number | null | undefined;
}

export interface AltShotTeamScore {
  teamGross: number;
  teamHandicap: number;
  teamHandicapStrokes: number;
  teamNet: number;
  holesCompleted: number;
}

/** 50% of the sum of member handicaps (= pair average), rounded to 1 dp. */
export function calculateAltShotTeamHandicap(members: HandicapOnly[]): number {
  if (members.length === 0) return 0;
  const sum = members.reduce((acc, m) => acc + (m.handicap ?? 0), 0);
  return Math.round(sum * 0.5 * 10) / 10;
}

interface SingleBallStrokes {
  strokes: number;
}

function readStrokes(score: unknown): number {
  if (!score || typeof score !== 'object') return 0;
  const s = score as Partial<SingleBallStrokes>;
  return typeof s.strokes === 'number' && s.strokes > 0 ? s.strokes : 0;
}

function resolveMemberDailyHandicaps(
  teamScorecards: Scorecard[],
  members: AltShotTeamMember[]
): HandicapOnly[] {
  const dhcByPlayer = new Map<string, number>();
  for (const sc of teamScorecards) {
    if (typeof sc.daily_handicap_used === 'number') {
      dhcByPlayer.set(sc.player_id, sc.daily_handicap_used);
    }
  }
  return members.map((m) => ({ handicap: dhcByPlayer.get(m.player_id) ?? m.handicap }));
}

export function computeAltShotTeamRoundScore(
  teamScorecards: Scorecard[],
  members: AltShotTeamMember[]
): AltShotTeamScore {
  const memberHandicaps = resolveMemberDailyHandicaps(teamScorecards, members);
  const teamHandicap = calculateAltShotTeamHandicap(memberHandicaps);
  const teamHandicapStrokes = Math.min(Math.floor(teamHandicap), 18);

  let withScores: Scorecard | undefined;
  let withTotal: Scorecard | undefined;
  for (const sc of teamScorecards) {
    if (!withScores && sc.scores && Object.keys(sc.scores).length > 0) withScores = sc;
    if (!withTotal && (sc.total_gross ?? 0) > 0) withTotal = sc;
  }

  const chosen = withScores ?? withTotal;
  if (!chosen) {
    return { teamGross: 0, teamHandicap: 0, teamHandicapStrokes: 0, teamNet: 0, holesCompleted: 0 };
  }

  let perHoleGross = 0;
  let holesCompleted = 0;
  if (chosen.scores) {
    for (const score of Object.values(chosen.scores)) {
      const strokes = readStrokes(score);
      if (strokes > 0) {
        perHoleGross += strokes;
        holesCompleted++;
      }
    }
  }

  const fromTotal = chosen.total_gross ?? 0;
  const teamGross = fromTotal > 0 ? fromTotal : perHoleGross;

  return {
    teamGross,
    teamHandicap,
    teamHandicapStrokes,
    teamNet: teamGross - teamHandicapStrokes,
    holesCompleted,
  };
}
```

Note: the empty-input case returns `teamHandicap: 0` (no members resolved), matching the test.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest src/utils/teamScoring/altShot.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/teamScoring/altShot.ts src/utils/teamScoring/altShot.test.ts
git commit -m "feat(alt-shot): add 50%-combined team handicap + round-total util"
```

---

### Task 2: Thread `'alt-shot'` through the GameType / TeamFormat unions

Adding the enum value breaks every exhaustive `Record<GameType, …>` / `switch (gameType)` until satisfied. This task adds the value AND every consumer the compiler flags, so the build returns to green. The "test" is `tsc`.

**Files:**
- Modify: `src/types/database/enums.ts` (GameType line 21, TeamFormat line 47)
- Modify: `src/services/rounds/resultsEngine.ts` (add `ALT_SHOT` spec + `pickAltShotScore` + `ROUND_ENGINES` entry)
- Modify: `src/constants/gameTypeDescriptions.ts` (`GAME_TYPE_DESCRIPTIONS['alt-shot']`, `TEAM_FORMAT_DESCRIPTIONS['alt-shot']`)
- Modify: `src/constants/roundPresets.ts` (`presetIdForGameType` switch — line ~558)
- Modify: `src/services/rounds/roundResultsService.ts` (game-type switch — case ~582)

**Interfaces:**
- Consumes: `computeAltShotTeamRoundScore`, `AltShotTeamMember` from Task 1.
- Produces: `ROUND_ENGINES['alt-shot']` (shape `'team-only'`, `betterDirection: 'lower'`), making `isTeamOnlyGameType('alt-shot') === true`.

- [ ] **Step 1: Add the enum values**

In `src/types/database/enums.ts`:

```typescript
export type GameType = 'stroke' | 'stableford' | 'par' | 'match-play' | 'best-ball' | 'scramble' | 'shamble' | 'alt-shot';
```

```typescript
export type TeamFormat = 'best-ball' | 'scramble' | 'aggregate' | 'match-play-team' | 'shamble' | 'alt-shot';
```

- [ ] **Step 2: Run the type-checker to see what breaks**

Run: `pnpm type-check`
Expected: errors at the exhaustive consumers — `ROUND_ENGINES` (missing `alt-shot`), `GAME_TYPE_DESCRIPTIONS`, `TEAM_FORMAT_DESCRIPTIONS`, and `presetIdForGameType`'s `never` exhaustiveness. Use this list to drive the following steps.

- [ ] **Step 3: Add the results-engine spec**

In `src/services/rounds/resultsEngine.ts`, import the Task 1 util near the top:

```typescript
import {
  computeAltShotTeamRoundScore,
  type AltShotTeamMember,
} from '@/utils/teamScoring/altShot';
```

Add a picker beside `pickScrambleScore`:

```typescript
/**
 * Alt Shot combined: team plays one ball; gross read from any member's card.
 * Team handicap is 50% of the sum of member daily handicaps; net = gross −
 * floor(team_handicap). Lower net is better (ascending sort inferred from
 * gameType not being stableford/par).
 */
function pickAltShotScore(
  teamScorecards: Scorecard[],
  teamMembers: EngineTeamMember[]
): PickedScore {
  if (teamScorecards.length === 0) {
    throw new Error('pickTeamRawScore called with empty scorecards array');
  }
  const members: AltShotTeamMember[] = teamMembers.map((m) => ({
    player_id: m.player_id,
    handicap: m.handicap,
  }));
  const score = computeAltShotTeamRoundScore(teamScorecards, members);
  return {
    rawScore: score.teamNet,
    rawResultData: {
      team_score: score.teamNet,
      gross_score: score.teamGross,
      net_score: score.teamNet,
      team_handicap: score.teamHandicap,
    },
  };
}
```

Add the spec and register it:

```typescript
const ALT_SHOT: RoundEngineSpec = {
  gameType: 'alt-shot',
  shape: 'team-only',
  // Net stroke play: lower team net wins (ascending sort inferred for any
  // gameType that isn't stableford/par).
  betterDirection: 'lower',
  pickIndividualRawScore: pickTeamFormatScore,
  pickTeamRawScore: pickAltShotScore,
};
```

```typescript
export const ROUND_ENGINES: Record<GameType, RoundEngineSpec> = {
  stableford: STABLEFORD,
  stroke: STROKE,
  par: PAR,
  'match-play': MATCH_PLAY,
  scramble: SCRAMBLE,
  'best-ball': BEST_BALL,
  shamble: SHAMBLE,
  'alt-shot': ALT_SHOT,
};
```

- [ ] **Step 4: Add the description entries**

In `src/constants/gameTypeDescriptions.ts`, add to `GAME_TYPE_DESCRIPTIONS`:

```typescript
  'alt-shot': {
    title: 'Alt Shot',
    icon: 'swap-horizontal',
    summary: 'Foursomes — partners alternate hitting one ball. Lowest net wins.',
    howItWorks: [
      'Each pair plays a single ball, alternating shots until it is holed',
      'Team handicap is 50% of the two partners’ combined handicaps',
      'Combined rounds rank teams by net total (gross minus team handicap)',
      'Ryder Cup sub-matches give the higher-handicap pair the difference in strokes, then compare net totals',
    ],
    bestFor: 'Pairs events and Ryder-Cup style team days.',
    tip: 'Agree who tees off on odd vs even holes before you start.',
  },
```

Add to `TEAM_FORMAT_DESCRIPTIONS` (same content is fine — both keyed maps need an entry):

```typescript
  'alt-shot': {
    title: 'Alt Shot',
    icon: 'swap-horizontal',
    summary: 'Foursomes — partners alternate hitting one ball. Lowest net wins.',
    howItWorks: [
      'Each pair plays a single ball, alternating shots until it is holed',
      'Team handicap is 50% of the two partners’ combined handicaps',
      'Lowest net score wins',
    ],
    bestFor: 'Pairs events and Ryder-Cup style team days.',
  },
```

- [ ] **Step 5: Add the `presetIdForGameType` case**

In `src/constants/roundPresets.ts`, in the `presetIdForGameType` switch, add before the `default`:

```typescript
    case 'alt-shot': return 'team_alt_shot';
```

(`'team_alt_shot'` is created in Task 4. If executing strictly in order, temporarily return `'team_scramble'` here and correct it in Task 4 — but Task 4 immediately follows, so prefer adding the real id now and accept one transient unknown-id reference resolved by Task 4's `RoundPresetId` union edit.)

- [ ] **Step 6: Add the roundResultsService switch case**

In `src/services/rounds/roundResultsService.ts`, extend the team-format case group (~line 582):

```typescript
      case 'best-ball':
      case 'scramble':
      case 'shamble':
      case 'alt-shot':
        rawScore = sc.total_points || sc.total_net;
        resultData = { team_score: rawScore, gross_score: sc.total_gross, net_score: sc.total_net };
        break;
```

- [ ] **Step 7: Re-run the type-checker**

Run: `pnpm type-check`
Expected: PASS (or only pre-existing unrelated errors). If new exhaustiveness errors remain, add the analogous `'alt-shot'` branch at each flagged site (treat like Scramble) until green.

- [ ] **Step 8: Commit**

```bash
git add src/types/database/enums.ts src/services/rounds/resultsEngine.ts src/constants/gameTypeDescriptions.ts src/constants/roundPresets.ts src/services/rounds/roundResultsService.ts
git commit -m "feat(alt-shot): register alt-shot game type, engine spec, descriptions"
```

---

### Task 3: Database migrations

Three migrations following the established patterns. Timestamps after the latest existing migration.

**Files:**
- Create: `supabase/migrations/20260621000000_add_alt_shot_game_type.sql`
- Create: `supabase/migrations/20260621000001_add_alt_shot_team_format.sql`
- Create: `supabase/migrations/20260621000002_add_alt_shot_to_premium_tier.sql`

- [ ] **Step 1: Game-type check constraint**

```sql
-- supabase/migrations/20260621000000_add_alt_shot_game_type.sql
-- Add 'alt-shot' (foursomes) to the rounds.game_type check constraint.
ALTER TABLE rounds DROP CONSTRAINT IF EXISTS rounds_game_type_check;

ALTER TABLE rounds
ADD CONSTRAINT rounds_game_type_check
CHECK (game_type IN ('stroke', 'stableford', 'par', 'match-play', 'best-ball', 'scramble', 'shamble', 'alt-shot'));
```

- [ ] **Step 2: team_format enum value**

```sql
-- supabase/migrations/20260621000001_add_alt_shot_team_format.sql
-- Add 'alt-shot' to the team_format enum.
ALTER TYPE team_format ADD VALUE IF NOT EXISTS 'alt-shot';
```

- [ ] **Step 3: Premium tier game-type allowance**

```sql
-- supabase/migrations/20260621000002_add_alt_shot_to_premium_tier.sql
-- Allow 'alt-shot' for premium and super_admin tiers.
UPDATE tier_limits
SET allowed_game_types = array_append(allowed_game_types, 'alt-shot')
WHERE tier = 'premium'
  AND NOT ('alt-shot' = ANY(allowed_game_types));

UPDATE tier_limits
SET allowed_game_types = array_append(allowed_game_types, 'alt-shot')
WHERE tier = 'super_admin'
  AND NOT ('alt-shot' = ANY(allowed_game_types));
```

- [ ] **Step 4: Verify SQL parses (optional local DB)**

If a local Supabase is running: `supabase db reset` and confirm no errors. Otherwise verify the timestamps are unique and ordered after existing migrations: `ls supabase/migrations | sort | tail -5`.
Expected: the three new files sort last.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260621000000_add_alt_shot_game_type.sql supabase/migrations/20260621000001_add_alt_shot_team_format.sql supabase/migrations/20260621000002_add_alt_shot_to_premium_tier.sql
git commit -m "feat(alt-shot): migrations for game type, team format, tier allowance"
```

---

### Task 4: Combined Alt Shot preset (`team_alt_shot`)

Adds the whole-match preset to the catalog (group `team_combined`). Net-lowest finalize is already wired via Task 2's `ALT_SHOT` engine spec (`team-only` shape → `finalizeTeamOnlyRound`).

**Files:**
- Modify: `src/constants/roundPresets.ts` (RoundPresetId union, preset const, registry, order)
- Test: `src/constants/roundPresets.test.ts` (extend existing)

**Interfaces:**
- Consumes: nothing new.
- Produces: preset id `'team_alt_shot'`; `inferPresetIdFromRound` resolves an `alt-shot` combined round to it.

- [ ] **Step 1: Write the failing test**

Append to `src/constants/roundPresets.test.ts`:

```typescript
import { inferPresetIdFromRound } from './roundPresets';

describe('Alt Shot presets', () => {
  it('infers the combined Alt Shot preset', () => {
    const id = inferPresetIdFromRound({
      game_type: 'alt-shot',
      is_team_round: true,
      team_format: 'alt-shot',
      round_format: 'combined',
      sub_match_size: null,
      rules_override: null,
    });
    expect(id).toBe('team_alt_shot');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/constants/roundPresets.test.ts -t "Alt Shot"`
Expected: FAIL — `inferPresetIdFromRound` returns null/undefined (no matching preset).

- [ ] **Step 3: Add the preset**

In `src/constants/roundPresets.ts`, add `'team_alt_shot'` to the `RoundPresetId` union (near `team_scramble`):

```typescript
  | 'team_scramble'
  | 'team_alt_shot'
```

Add the preset const (after `TEAM_SCRAMBLE`):

```typescript
export const TEAM_ALT_SHOT: RoundPreset = {
  id: 'team_alt_shot',
  title: 'Team Alt Shot',
  shortTitle: 'Alt Shot',
  summary: 'Foursomes — partners alternate one ball. Lowest net wins.',
  longDescription:
    'Each pair plays a single ball, alternating shots. Team handicap is 50% of the two partners’ combined handicaps. Teams are ranked by net total (gross minus team handicap), lowest wins. Does not feed the individual leaderboard.',
  icon: 'swap-horizontal',
  tier: 'premium',
  group: 'team_combined',
  config: {
    game_type: 'alt-shot',
    is_team_round: true,
    team_format: 'alt-shot',
    round_format: 'combined',
    sub_match_size: null,
    rules_override: {
      contributes_to_individual_leaderboard: false,
      contributes_to_team_leaderboard: true,
    },
  },
  requiresCompetitionTeams: true,
};
```

Register it in `ROUND_PRESETS` (after `team_scramble`) and in `ROUND_PRESET_ORDER` (after `'team_scramble'`):

```typescript
  team_scramble: TEAM_SCRAMBLE,
  team_alt_shot: TEAM_ALT_SHOT,
```

```typescript
  'team_scramble',
  'team_alt_shot',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest src/constants/roundPresets.test.ts -t "Alt Shot"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/constants/roundPresets.ts src/constants/roundPresets.test.ts
git commit -m "feat(alt-shot): add combined Team Alt Shot preset"
```

---

### Task 5: Alt Shot split sub-match resolver (pure)

The differential, total-net, one-ball-per-side resolver. Pure helper in `pairPointsCalculation.ts`, tested with the spec's worked example.

**Files:**
- Modify: `src/services/rounds/pairPointsCalculation.ts`
- Test: `src/services/rounds/pairPointsCalculation.test.ts` (create if absent)

**Interfaces:**
- Consumes: `Hole` from `@/types/database.types`; `calculateAltShotTeamHandicap` from Task 1; `SideOutcome` (existing).
- Produces:
  - `resolveAltShotSubMatchOutcome(params: { teamAPlayerIds: string[]; teamBPlayerIds: string[]; holes: Hole[]; getGross: (playerId: string, hole: Hole) => number | null; dailyHandicaps: Map<string, number> }): SideOutcome | null`

- [ ] **Step 1: Write the failing test**

```typescript
// src/services/rounds/pairPointsCalculation.test.ts
import { resolveAltShotSubMatchOutcome } from './pairPointsCalculation';
import type { Hole } from '@/types/database.types';

// 2 holes; hole 1 is hardest (strokeIndex 1).
const holes: Hole[] = [
  { number: 1, par: 4, strokeIndex: 1 } as Hole,
  { number: 2, par: 4, strokeIndex: 2 } as Hole,
];

// Side A = p1(9)+p2(11) -> 10.0 ; Side B = p3(8)+p4(13) -> 10.5
// diff = round(0.5) = 1 stroke to side B (the higher handicap side).
const dailyHandicaps = new Map([
  ['p1', 9],
  ['p2', 11],
  ['p3', 8],
  ['p4', 13],
]);

describe('resolveAltShotSubMatchOutcome', () => {
  it('gives the higher-handicap side its differential stroke and decides on total net', () => {
    // Side A one ball: 4 + 4 = 8 gross, no strokes -> net 8.
    // Side B one ball: 5 + 4 = 9 gross, minus 1 differential stroke -> net 8.
    // Equal nets -> halved.
    const grossByPlayer: Record<string, Record<number, number>> = {
      p1: { 1: 4, 2: 4 },
      p3: { 1: 5, 2: 4 },
    };
    const getGross = (playerId: string, hole: Hole) =>
      grossByPlayer[playerId]?.[hole.number] ?? null;

    const outcome = resolveAltShotSubMatchOutcome({
      teamAPlayerIds: ['p1', 'p2'],
      teamBPlayerIds: ['p3', 'p4'],
      holes,
      getGross,
      dailyHandicaps,
    });
    expect(outcome).toBe('halved');
  });

  it('side A wins when its net total is lower', () => {
    const grossByPlayer: Record<string, Record<number, number>> = {
      p1: { 1: 4, 2: 4 }, // A net 8
      p3: { 1: 6, 2: 5 }, // B gross 11 - 1 = net 10
    };
    const getGross = (playerId: string, hole: Hole) =>
      grossByPlayer[playerId]?.[hole.number] ?? null;

    const outcome = resolveAltShotSubMatchOutcome({
      teamAPlayerIds: ['p1', 'p2'],
      teamBPlayerIds: ['p3', 'p4'],
      holes,
      getGross,
      dailyHandicaps,
    });
    expect(outcome).toBe('a-wins');
  });

  it('returns null when a side has no usable scores', () => {
    const getGross = () => null;
    const outcome = resolveAltShotSubMatchOutcome({
      teamAPlayerIds: ['p1', 'p2'],
      teamBPlayerIds: ['p3', 'p4'],
      holes,
      getGross,
      dailyHandicaps,
    });
    expect(outcome).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/services/rounds/pairPointsCalculation.test.ts`
Expected: FAIL — `resolveAltShotSubMatchOutcome` is not exported.

- [ ] **Step 3: Write the implementation**

Add to `src/services/rounds/pairPointsCalculation.ts`:

```typescript
import { calculateAltShotTeamHandicap } from '@/utils/teamScoring/altShot';

/**
 * One side's single-ball gross total. Both partners record the same ball, so
 * for each hole take the first partner who has a recorded gross. Returns null
 * when the side has no usable scores on any hole.
 */
function sideOneBallGross(
  playerIds: string[],
  holes: Hole[],
  getGross: (playerId: string, hole: Hole) => number | null
): number | null {
  let total = 0;
  let anyHole = false;
  for (const hole of holes) {
    let holeGross: number | null = null;
    for (const playerId of playerIds) {
      const g = getGross(playerId, hole);
      if (g != null) {
        holeGross = g;
        break;
      }
    }
    if (holeGross != null) {
      total += holeGross;
      anyHole = true;
    }
  }
  return anyHole ? total : null;
}

/** 50%-combined team handicap for one side from the daily-handicap map. */
function sideTeamHandicap(
  playerIds: string[],
  dailyHandicaps: Map<string, number>
): number {
  return calculateAltShotTeamHandicap(
    playerIds.map((id) => ({ handicap: dailyHandicaps.get(id) ?? 0 }))
  );
}

/**
 * Decide an Alt Shot (foursomes) sub-match. Each side plays one ball off its
 * 50%-combined handicap; the higher-handicap side receives the rounded
 * difference in strokes (allocation is immaterial to a total comparison), and
 * the lower net total wins. Returns null when either side has no usable scores.
 */
export function resolveAltShotSubMatchOutcome(params: {
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];
  holes: Hole[];
  getGross: (playerId: string, hole: Hole) => number | null;
  dailyHandicaps: Map<string, number>;
}): SideOutcome | null {
  const { teamAPlayerIds, teamBPlayerIds, holes, getGross, dailyHandicaps } = params;

  const aGross = sideOneBallGross(teamAPlayerIds, holes, getGross);
  const bGross = sideOneBallGross(teamBPlayerIds, holes, getGross);
  if (aGross === null || bGross === null) return null;

  const aHc = sideTeamHandicap(teamAPlayerIds, dailyHandicaps);
  const bHc = sideTeamHandicap(teamBPlayerIds, dailyHandicaps);
  const diff = Math.round(Math.abs(aHc - bHc)); // nearest; .5 rounds up

  // Higher-handicap side receives `diff` strokes off its total.
  const aNet = aGross - (aHc > bHc ? diff : 0);
  const bNet = bGross - (bHc > aHc ? diff : 0);

  if (aNet === bNet) return 'halved';
  return aNet < bNet ? 'a-wins' : 'b-wins';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest src/services/rounds/pairPointsCalculation.test.ts`
Expected: PASS (all three cases).

- [ ] **Step 5: Commit**

```bash
git add src/services/rounds/pairPointsCalculation.ts src/services/rounds/pairPointsCalculation.test.ts
git commit -m "feat(alt-shot): add differential total-net sub-match resolver"
```

---

### Task 6: Wire the Alt Shot resolver into split finalization

Dispatch to the Alt Shot resolver inside `finalizePairResults` when `gameType === 'alt-shot'`, and feed the team-only+split branch of the orchestrator the data it needs (`scorecards`, `gameType`, `competitionId`, `courseHoles`) so the live computation can run.

**Files:**
- Modify: `src/services/rounds/finalizePairResults.ts`
- Modify: `src/services/rounds/refinalizeRoundResults.ts` (team-only + split branch)
- Test: `src/services/rounds/finalizePairResults.altShot.test.ts` (create)

**Interfaces:**
- Consumes: `resolveAltShotSubMatchOutcome` (Task 5); existing `buildHoleValueLookup`/`getHoleGross`/`resolveSubMatchOutcomeFromScores`.
- Produces: `finalizePairResults` deciding `alt-shot` sub-matches via the differential resolver; returns team rows as before.

- [ ] **Step 1: Write the failing test**

```typescript
// src/services/rounds/finalizePairResults.altShot.test.ts
import { resolveAltShotSubMatchOutcome } from './pairPointsCalculation';
import type { Hole } from '@/types/database.types';

// Guards the dispatch contract: alt-shot uses the one-ball differential
// resolver (Task 5), not best-ball. This re-asserts the resolver wiring at
// the boundary finalizePairResults relies on.
describe('finalizePairResults alt-shot dispatch', () => {
  it('uses the differential resolver for a clear A win', () => {
    const holes: Hole[] = [
      { number: 1, par: 4, strokeIndex: 1 } as Hole,
      { number: 2, par: 4, strokeIndex: 2 } as Hole,
    ];
    const grossByPlayer: Record<string, Record<number, number>> = {
      pA1: { 1: 4, 2: 4 }, // A net 8
      pB1: { 1: 6, 2: 6 }, // B gross 12 - 1 diff = 11
    };
    const outcome = resolveAltShotSubMatchOutcome({
      teamAPlayerIds: ['pA1', 'pA2'],
      teamBPlayerIds: ['pB1', 'pB2'],
      holes,
      getGross: (id, h) => grossByPlayer[id]?.[h.number] ?? null,
      dailyHandicaps: new Map([['pA1', 9], ['pA2', 11], ['pB1', 8], ['pB2', 13]]),
    });
    expect(outcome).toBe('a-wins');
  });
});
```

(A full DB-mocked `finalizePairResults` test is heavier than the existing suite warrants; this guards the resolver contract the dispatch depends on. The integration is verified manually in Task 9 / on-device QA.)

- [ ] **Step 2: Run test to verify it passes the resolver, then add the dispatch**

Run: `pnpm jest src/services/rounds/finalizePairResults.altShot.test.ts`
Expected: PASS (it exercises Task 5's resolver). Now wire the dispatch so production uses it.

- [ ] **Step 3: Dispatch on game type in `finalizePairResults`**

In `src/services/rounds/finalizePairResults.ts`, import the resolver and the daily-handicap snapshot. Replace the live-outcome computation (the `resolveSubMatchOutcomeFromScores` block, ~lines 300-308) so `alt-shot` takes the one-ball differential path:

```typescript
import {
  resolveSubMatchOutcomeFromScores,
  resolveAltShotSubMatchOutcome,
  deriveSideTeamIds,
  type SideOutcome,
} from './pairPointsCalculation';
```

Build a daily-handicap map alongside the existing `getHoleValue` setup (after the `getHoleValue` block, ~line 274):

```typescript
  // Daily-handicap snapshot for alt-shot's differential allowance.
  const dhcByPlayer = new Map<string, number>();
  if (input.scorecards) {
    for (const sc of input.scorecards) {
      if (typeof sc.daily_handicap_used === 'number') {
        dhcByPlayer.set(sc.player_id, sc.daily_handicap_used);
      }
    }
  }

  // One-ball gross lookup for alt-shot (reuses getHoleGross over scores JSON).
  const getGross = (playerId: string, hole: Hole): number | null => {
    const sc = input.scorecards?.find((c) => c.player_id === playerId);
    return sc ? getHoleGross(sc.scores, hole.number) : null;
  };
```

In the per-sub-match loop, change the live computation to branch on game type:

```typescript
    let outcome = persistedOutcome(sm);
    if (!outcome && gameType === 'alt-shot' && holes.length > 0) {
      outcome = resolveAltShotSubMatchOutcome({
        teamAPlayerIds: sm.team_a_player_ids,
        teamBPlayerIds: sm.team_b_player_ids,
        holes,
        getGross,
        dailyHandicaps: dhcByPlayer,
      });
    } else if (!outcome && getHoleValue && gameType) {
      outcome = resolveSubMatchOutcomeFromScores({
        teamAPlayerIds: sm.team_a_player_ids,
        teamBPlayerIds: sm.team_b_player_ids,
        holes,
        getHoleValue,
        higherIsBetter: higherIsBetter(gameType),
      });
    }
```

Note: `holes` is already fetched lazily in the existing `getHoleValue` setup block; ensure that block runs for alt-shot too by widening its guard from `if (input.scorecards && input.scorecards.length > 0 && gameType)` to also fetch holes when `gameType === 'alt-shot'` (it already will, since alt-shot rounds have scorecards). No further change needed if scorecards are present.

- [ ] **Step 4: Feed the orchestrator's team-only+split branch**

In `src/services/rounds/refinalizeRoundResults.ts`, the second team-only branch (`isTeamOnlyGameType(gameType) && splitWithPairPoints`) calls `finalizePairResults` with only `{ roundId, team1Id, team2Id, rulesOverride, perRoundRulesEnabled }`. Extend that call so alt-shot can compute live:

```typescript
        const pairRowCount = await finalizePairResults({
          roundId,
          team1Id: round.team1_id,
          team2Id: round.team2_id,
          competitionId: round.competition_id,
          gameType,
          scorecards,
          rulesOverride: effectiveOverride,
          perRoundRulesEnabled,
        });
```

This is additive — `persistedOutcome` still takes priority, so scramble split (which relies on persisted results) is unaffected; alt-shot now resolves live from scorecards.

- [ ] **Step 5: Run tests + type-check**

Run: `pnpm jest src/services/rounds/finalizePairResults.altShot.test.ts && pnpm type-check`
Expected: PASS / no new type errors.

- [ ] **Step 6: Commit**

```bash
git add src/services/rounds/finalizePairResults.ts src/services/rounds/refinalizeRoundResults.ts src/services/rounds/finalizePairResults.altShot.test.ts
git commit -m "feat(alt-shot): finalize split sub-matches via differential resolver"
```

---

### Task 7: Repurpose the `ryder_cup_foursomes_2v2` preset for Alt Shot

The catalog already has a `ryder_cup_foursomes_2v2` stub (`game_type: 'match-play'`, `comingSoon: true`). Point it at the real Alt Shot format and ship it.

**Files:**
- Modify: `src/constants/roundPresets.ts` (`RYDER_CUP_FOURSOMES_2V2`)
- Test: `src/constants/roundPresets.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `ryder_cup_foursomes_2v2` resolves to an `alt-shot` split round; `inferPresetIdFromRound` round-trips it.

- [ ] **Step 1: Write the failing test**

Append to the "Alt Shot presets" describe in `src/constants/roundPresets.test.ts`:

```typescript
  it('infers the Ryder Cup foursomes (alt-shot split) preset', () => {
    const id = inferPresetIdFromRound({
      game_type: 'alt-shot',
      is_team_round: true,
      team_format: 'alt-shot',
      round_format: 'split',
      sub_match_size: 2,
      rules_override: { pair_points: { win: 1, tie: 0.5, loss: 0 } },
    });
    expect(id).toBe('ryder_cup_foursomes_2v2');
  });

  it('foursomes preset is no longer coming soon', () => {
    expect(ROUND_PRESETS.ryder_cup_foursomes_2v2.comingSoon).toBeFalsy();
    expect(ROUND_PRESETS.ryder_cup_foursomes_2v2.config.game_type).toBe('alt-shot');
  });
```

Ensure `ROUND_PRESETS` is imported in the test file (add to the existing import from `./roundPresets`).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/constants/roundPresets.test.ts -t "foursomes"`
Expected: FAIL — preset is still `match-play` / `comingSoon`.

- [ ] **Step 3: Update the preset**

In `src/constants/roundPresets.ts`, replace the `RYDER_CUP_FOURSOMES_2V2` body:

```typescript
export const RYDER_CUP_FOURSOMES_2V2: RoundPreset = {
  id: 'ryder_cup_foursomes_2v2',
  title: '2v2 Alt Shot (Foursomes)',
  shortTitle: '2v2 Alt Shot',
  summary: 'Pair vs pair, one ball each, handicap-differential match.',
  longDescription:
    'The round is split into 2v2 sub-matches. Each pair plays a single ball, alternating shots, off 50% of their combined handicaps. The higher-handicap pair receives the difference in strokes on the hardest holes; the lower net total wins the sub-match (1 point, 0.5 for a tie). Does not feed the individual leaderboard.',
  icon: 'swap-horizontal',
  tier: 'premium',
  group: 'sub_matches',
  config: {
    game_type: 'alt-shot',
    is_team_round: true,
    team_format: 'alt-shot',
    round_format: 'split',
    sub_match_size: 2,
    rules_override: {
      pair_points: { win: 1, tie: 0.5, loss: 0 },
      contributes_to_individual_leaderboard: false,
      contributes_to_team_leaderboard: true,
    },
  },
  requiresCompetitionTeams: true,
};
```

(Remove the `comingSoon: true` line.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest src/constants/roundPresets.test.ts -t "Alt Shot"`
Expected: PASS (combined + both foursomes assertions).

- [ ] **Step 5: Commit**

```bash
git add src/constants/roundPresets.ts src/constants/roundPresets.test.ts
git commit -m "feat(alt-shot): ship Ryder Cup foursomes as alt-shot split preset"
```

---

### Task 8: Strict-pairs validation

Enforce exactly-2-players for Alt Shot. Split is already guaranteed by `sub_match_size: 2`; this covers the combined preset (competition teams of any size). Add a pure validator + a finalize-time guard + a setup-screen warning.

**Files:**
- Create: `src/utils/teamScoring/altShotValidation.ts`
- Test: `src/utils/teamScoring/altShotValidation.test.ts`
- Modify: `src/services/rounds/finalizeTeamResults.ts` (guard in the team-only path — log + skip non-pair teams)
- Modify: `src/screens/admin/AddRoundScreen/steps/GameFormatStep.tsx` (surface a warning when an alt-shot combined preset is selected but a team isn't a pair)

**Interfaces:**
- Consumes: nothing new.
- Produces: `validateAltShotPairs(teams: { id: string; memberIds: string[] }[]): { teamId: string; size: number }[]` (returns offending teams; empty = valid).

- [ ] **Step 1: Write the failing test**

```typescript
// src/utils/teamScoring/altShotValidation.test.ts
import { validateAltShotPairs } from './altShotValidation';

describe('validateAltShotPairs', () => {
  it('returns no offenders when every team has exactly 2 members', () => {
    expect(
      validateAltShotPairs([
        { id: 't1', memberIds: ['a', 'b'] },
        { id: 't2', memberIds: ['c', 'd'] },
      ])
    ).toEqual([]);
  });

  it('flags teams that are not pairs', () => {
    expect(
      validateAltShotPairs([
        { id: 't1', memberIds: ['a', 'b', 'c'] },
        { id: 't2', memberIds: ['d'] },
        { id: 't3', memberIds: ['e', 'f'] },
      ])
    ).toEqual([
      { teamId: 't1', size: 3 },
      { teamId: 't2', size: 1 },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/utils/teamScoring/altShotValidation.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the validator**

```typescript
// src/utils/teamScoring/altShotValidation.ts
/**
 * Alt Shot requires exactly 2 players per team (foursomes is a pair format).
 * Split rounds enforce this via sub_match_size=2; combined rounds use
 * competition teams of arbitrary size, so they need this check.
 */
export interface AltShotTeamShape {
  id: string;
  memberIds: string[];
}

export function validateAltShotPairs(
  teams: AltShotTeamShape[]
): { teamId: string; size: number }[] {
  return teams
    .filter((t) => t.memberIds.length !== 2)
    .map((t) => ({ teamId: t.id, size: t.memberIds.length }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest src/utils/teamScoring/altShotValidation.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the finalize-time guard**

In `src/services/rounds/finalizeTeamResults.ts`, inside the team-only path where teams are grouped (locate where `getCompetitionTeams`/team membership is iterated to build each team's scorecards), add — for `gameType === 'alt-shot'` — a guard that skips teams whose member count ≠ 2 and logs a warning via the module's existing logger.

Place this import with the other imports:

```typescript
import { validateAltShotPairs } from '@/utils/teamScoring/altShotValidation';
```

Add the guard right before team rows are written:

```typescript
  if (gameType === 'alt-shot') {
    const offenders = validateAltShotPairs(
      teams.map((t) => ({ id: t.id, memberIds: t.members.map((m) => m.player_id) }))
    );
    for (const o of offenders) {
      submitLogger.warn('Alt Shot team is not a pair; skipping from results', {
        teamId: o.teamId.substring(0, 8) + '...',
        size: o.size,
      });
    }
    // Only finalize valid pairs; non-pairs are excluded from team rows.
    teams = teams.filter((t) => t.members.length === 2);
  }
```

(Adapt variable names — `teams`, `t.members`, `submitLogger` — to the actual identifiers in `finalizeTeamResults.ts`; read the file first and match its existing team-iteration shape.)

- [ ] **Step 6: Surface a setup warning**

In `src/screens/admin/AddRoundScreen/steps/GameFormatStep.tsx`, when the selected preset's `config.game_type === 'alt-shot'` and `round_format === 'combined'`, render a warning row (reuse the step's existing note/warning component) reading:

> "Alt Shot is played in pairs — make sure every team has exactly 2 players."

Read the file first to match its existing note pattern (it already renders a `perRoundRulesEnabled` note). Keep it informational; the finalize guard is the hard enforcement.

- [ ] **Step 7: Run tests + type-check**

Run: `pnpm jest src/utils/teamScoring/altShotValidation.test.ts && pnpm type-check`
Expected: PASS / no new type errors.

- [ ] **Step 8: Commit**

```bash
git add src/utils/teamScoring/altShotValidation.ts src/utils/teamScoring/altShotValidation.test.ts src/services/rounds/finalizeTeamResults.ts src/screens/admin/AddRoundScreen/steps/GameFormatStep.tsx
git commit -m "feat(alt-shot): enforce strict 2-player pairs"
```

---

### Task 9: Sweep remaining game-type branches, live leaderboard, and verify

Catch every remaining site that switches on game type / team format (review tabs, skins team scoring, live leaderboard) using the compiler and a grep, treat `alt-shot` like Scramble, then run the full check.

**Files:**
- Modify: as surfaced by `pnpm type-check` and the grep below (likely `src/screens/scoring/ReviewScorecardScreen/**`, `src/utils/skins/**`, `src/utils/teamScoring/calculations.ts`, `src/utils/roundLeaderboardFormatters.ts`).

- [ ] **Step 1: Find non-exhaustive branches**

Run:
```bash
grep -rn "'scramble'" src --include="*.ts" --include="*.tsx" | grep -iv "test" | grep -E "case |=== |includes\(|\[" 
```
Expected: a list of switch/array/comparison sites. For each that drives team-format behaviour (live team leaderboard, skins team winner, review leaderboard tab selection, contributions), add an `'alt-shot'` branch mirroring `'scramble'` (one net ball, but with `calculateAltShotTeamHandicap` where a handicap % is applied).

- [ ] **Step 2: Live team leaderboard handicap**

In `src/utils/teamScoring/calculations.ts`, where the team handicap is computed for live display (the scramble 25% path), add an `alt-shot` case that calls `calculateAltShotTeamHandicap`. Read the file to locate the dispatch (e.g. `getGroupHoleScore` / `buildLiveTeamEntries` / the team-handicap helper) and branch on the round's `team_format`/`game_type` so an alt-shot combined round shows the 50%-combined handicap and one-ball net, matching finalize.

- [ ] **Step 3: Review screen leaderboard tab**

In `src/screens/scoring/ReviewScorecardScreen/`, the `ScrambleLeaderboardTab` (and `useReviewScorecardTabs`) decide which leaderboard renders for team-only formats. Add `alt-shot` wherever `scramble` selects the team (one-ball) leaderboard tab so an Alt Shot combined round shows the team leaderboard. Match the existing scramble condition.

- [ ] **Step 4: Skins team scoring (if skins enabled)**

In `src/utils/skins/teamScores.ts` / `teamWinner.ts`, where `scramble`/team formats pick the team's per-hole value, add `alt-shot` to the same branch (one ball, lower net). Only needed so a skins side-game on an Alt Shot round resolves; mirror scramble.

- [ ] **Step 5: Full type-check + targeted tests**

Run:
```bash
pnpm type-check
pnpm jest src/utils/teamScoring src/services/rounds/pairPointsCalculation.test.ts src/services/rounds/finalizePairResults.altShot.test.ts src/constants/roundPresets.test.ts
```
Expected: `type-check` clean (no new errors vs baseline); the Alt Shot test files green.

- [ ] **Step 6: Baseline diff for the broader suite**

Run: `pnpm jest 2>&1 | tail -40`
Expected: no NEW failures beyond the documented ~243 baseline. Investigate any failure that references alt-shot, presets, finalize, or team scoring.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(alt-shot): handle alt-shot in leaderboard, review, skins branches"
```

- [ ] **Step 8: Record the deploy step**

Add a line to the team's deploy checklist / PR description: the three Task 3 migrations must be applied to staging then prod (per project memory, migrations are not auto-applied). On-device QA: create a competition team round with each Alt Shot preset, score one ball per team/side, finalize, and confirm the leaderboard ranks by net (combined) and awards pair points by differential (split).

---

## Notes for the implementer

- **Pattern source of truth:** Alt Shot combined == Scramble with a 50% (not 25%) handicap. When unsure how a screen/util should treat `alt-shot`, find the `scramble` branch and mirror it, swapping `calculateScrambleTeamHandicap` → `calculateAltShotTeamHandicap` where a handicap is computed.
- **Split == differential:** the only genuinely new logic is `resolveAltShotSubMatchOutcome` (Task 5) and its wiring (Task 6). Everything else is registration + mirroring.
- **Don't** add standalone (`standalone: {...}`) to either Alt Shot preset — competition-only.
- **Read before editing** the files in Tasks 8.5/8.6 and 9.2-9.4; they're matched to existing patterns rather than reproduced in full here because they're large RN/util files where the surrounding idiom matters.
