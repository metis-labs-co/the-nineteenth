# Task 4 Report: Branding sweep + contributions verification

## Part A — Grep Results Table

Command run:
```
grep -rn "Scramble\|SCRAMBLE" src/screens/rounds/ViewRoundScreen/tabs src/components/scorecard --include="*.tsx" | grep -vE "//|/\*|\* |import|teamFormat|game_type|\.test\."
```

| File | Line | Occurrence | Action | Reason |
|------|------|-----------|--------|--------|
| `ScrambleTeamScoreTab.tsx:12,18,20,28,36,42,49` | Multiple | Interface names, component names, prop names (`ScrambleTeam`, `ScrambleTeamScoreTabProps`, `scrambleTeams`, `ScrambleTeamScoreTab`, `ScrambleTeamSelector`, `ScrambleScorecardTable`) | **LEFT** | Internal identifiers — not rendered text. None are JSX text nodes or label values. |
| `ScrambleContributionsTab.tsx:11,17,18,26,33,37` | Multiple | Interface names, prop names, component names (`ScrambleTeam`, `ScrambleContributionsTabProps`, `scrambleTeams`, `ScrambleContributionsTab`, `ScrambleTeamSelector`) | **LEFT** | Internal identifiers — not rendered text. No user-visible "Scramble" in this file. |
| `ScrambleLeaderboardTab.tsx:12,18,20,21,26,29,32,36,38` | Multiple | Interface names, prop names (`ScrambleTeam`, `ScrambleLeaderboardTabProps`, `scrambleTeams`, `allScramblePlayers`, `ScrambleLeaderboardTab`, `ScrambleTeamLeaderboard`) | **LEFT** | Internal identifiers — not rendered text. |
| `ScrambleTeamLeaderboard.tsx:41,85,92,107,550` | Multiple | Interface name, export name, function call (`ScrambleTeamLeaderboardProps`, `ScrambleTeamLeaderboard`, `calculateScrambleTeamHandicap`) | **LEFT** | Internal identifiers — not rendered text. |
| `ScrambleTeamSelector.tsx:31,37,39,50,56,422` | Multiple | Interface names, component name (`ScrambleTeam`, `ScrambleTeamSelectorProps`, `ScrambleTeamSelector`) | **LEFT** | Internal identifiers — not rendered text. |
| `TeamScoreCard.stories.tsx:337,356` | Multiple | `description="Standard 2-player Scramble format"`, `description="4-player Scramble format"` | **LEFT** | Stories file (`.stories.tsx`) — not app UI. Also not reachable by alt-shot. |
| `ScrambleScorecardTable.tsx:24,46,52,423` | Multiple | Interface name, component name (`ScrambleScorecardTableProps`, `ScrambleScorecardTable`) | **LEFT** | Internal identifiers — not rendered text. |
| `TeamScoreCard/TeamScoreCard.tsx:138` | 138 | `<Text ...>SCRAMBLE</Text>` — rendered JSX text in format badge | **LEFT** | **Alt-shot never reaches this component.** `ScorecardScoreContent.tsx` routes `teamFormat === 'alt-shot'` to `AltShotScoreCard` (line 389–413). `TeamScoreCard` is only rendered for actual scramble rounds (lines 369–385). |
| `GameTypeHeader/GameTypeHeader.tsx:89` | 89 | `return 'SCRAMBLE'` (in `getGameTypeLabel`) | **LEFT** | **Alt-shot is caught earlier** — line 73: `if (teamFormat === 'alt-shot') return 'ALT SHOT'`. The `case 'scramble': return 'SCRAMBLE'` branch (line 88-89) is only reached when `gameType === 'scramble'`, which alt-shot rounds never have. |

**Conclusion**: Zero rendered "Scramble" strings reachable by alt-shot rounds exist. No changes required for Part A.

## Part B — Contributions Verification Test

**File**: `src/utils/contributions/computeContributions.test.ts`

Added a new `describe` block:
```ts
describe('computeContributions — alt-shot (scramble format)', () => {
  it('alt-shot one-ball contributions count shots per player', () => { ... })
})
```

**Metric asserted**: Raw shot count (`value`) via `computeScrambleTeam`:
- `sam` (p1): `teeShot` (drive=1) + `putt` (putt=1) = **value: 2**
- `alex` (p2): `approach` (approach=1) = **value: 1**
- `metricLabel`: `'shots used'`
- `dataMissing`: `false`

The test uses `format: 'scramble'` with `gameType: 'alt-shot'`, mirroring how the production hook maps alt-shot rounds to the scramble contribution format. This locks the behavior that alt-shot contributions produce per-player shot counts via `computeScrambleTeam`.

## Part C — Test + Type-check Results

```
PASS src/utils/contributions/computeContributions.test.ts
  computeContributions — alt-shot (scramble format)
    ✓ alt-shot one-ball contributions count shots per player

Tests: 10 passed, 10 total (including 9 pre-existing tests)
```

```
pnpm type-check → clean (0 errors)
```

## Self-review

- Only one file modified: `computeContributions.test.ts` (new test added).
- No rendered strings changed (none needed changing).
- No comment/identifier churn.
- Scramble-only rendered strings (`TeamScoreCard.tsx:138`, `GameTypeHeader.tsx:89`) left intact with clear reasoning.
- Contributions test asserts real computed values (`value: 2`, `value: 1`) and passes.
- Type-check clean.
