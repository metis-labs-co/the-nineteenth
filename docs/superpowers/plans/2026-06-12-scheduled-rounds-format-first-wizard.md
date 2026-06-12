# Scheduled Social Rounds + Format-First Wizard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the standalone create-round wizard to pick game format first from the canonical preset catalog (with per-format player counts), then add the ability to schedule a future round with friends who accept/decline invitations.

**Architecture:** Part A (Tasks 1–7) reorders the `CreateRoundBottomSheet` wizard and replaces its ad-hoc format list with `roundPresets.ts` + new standalone player-count metadata — no schema changes. Part B (Tasks 8–17) adds `invitation_status` to `round_players`, a "When" wizard step, a `ScheduledRound` detail screen with accept/decline, and a start-day flow that reuses the extracted round-session service. Each part is independently shippable; B depends on A.

**Tech Stack:** React Native (Expo SDK 54), TypeScript, Supabase (Postgres + RLS + triggers), TanStack Query, Jest.

**Spec:** `docs/superpowers/specs/2026-06-12-scheduled-rounds-format-first-wizard-design.md`

---

## Critical context for the implementer

Read these before starting — they are the load-bearing facts:

1. **Three format lists exist today.** `MATCH_TYPES` in `src/screens/rounds/CreateRoundBottomSheet/types.ts:198` (partially dead), the option arrays inside `src/components/competitionWizard/create/RoundGameTypeSelector.tsx:29-85` (what the wizard actually renders today, via `MatchTypeStep`), and the preset catalog `src/constants/roundPresets.ts` (what competition rounds use, via `RoundPresetPicker`). This plan unifies the standalone wizard on the preset catalog.
2. **Tier gating deviation from the spec.** The spec said "tier gating from each preset's `tier` field", but `INDIVIDUAL_STROKE.tier === 'social'` while the live standalone wizard (and CLAUDE.md) give Free users Stroke Play via `limits.allowedGameTypes`. To avoid regressing Free users, the standalone wizard gates by `limits.allowedGameTypes.includes(preset.config.game_type)` (DB-driven), not `preset.tier`. Competition flows keep using `preset.tier`.
3. **`comingSoon` flags must not regress standalone.** `TEAM_BEST_BALL` and `TEAM_SHAMBLE` are `comingSoon: true` (a competition-finalization concern), but the standalone wizard already offers Best Ball and Shamble in production. `getPresetAvailability` is changed so `comingSoon` never blocks a standalone-eligible preset in standalone context.
4. **Push notifications for invites already exist.** `notify_round_player_invited()` (latest version in `supabase/migrations/20260118000100_fix_round_player_notification_trigger.sql`) fires a `social_round_invitation` notification on every `round_players` INSERT. Part B does NOT need to build invite pushes — only the decline/cancel notifications and the new column.
5. **Supabase CLI is linked to PROD** (see memory/staging notes). NEVER run `supabase db push` from this checkout. Apply the Part B migration to staging via psql (aws-1 pooler) for testing; prod migration ships with the release process.
6. **Parallel sessions share this checkout.** Do all work on a feature branch inside a git worktree (`superpowers:using-git-worktrees`), not on `main` in this directory.
7. Commands: `pnpm type-check`, `pnpm lint`, `pnpm test <path>`.

## File structure (what's created/modified)

```
src/constants/roundPresets.ts                                  # MODIFY: standalone metadata + helpers (A1)
src/constants/__tests__/roundPresets.standalone.test.ts        # CREATE: tests (A1)
src/utils/presetPlayers.ts                                     # CREATE: player-count validation (A2)
src/utils/__tests__/presetPlayers.test.ts                      # CREATE: tests (A2)
src/components/rounds/RoundPresetPicker.tsx                    # MODIFY: optional tier-override prop (A3)
src/screens/rounds/CreateRoundBottomSheet/
  types.ts                                                     # MODIFY: WizardData/steps/props (A3, A4, B3)
  index.tsx                                                    # MODIFY: step order, rendering (A4, A5, B3)
  steps/GameFormatStep.tsx                                     # CREATE (A3)
  steps/MatchTypeStep.tsx                                      # DELETE (A6)
  steps/WhenStep.tsx                                           # CREATE (B3)
  steps/PartnersStep.tsx                                       # MODIFY: count validation + Schedule CTA (A5, B4)
  steps/index.ts                                               # MODIFY: exports (A3, A6, B3)
  hooks/useCreateRoundWizard.ts                                # MODIFY (A4, B3)
  hooks/useWizardNavigation.ts                                 # MODIFY (A4, B4)
  hooks/useWizardCourseSelection.ts                            # MODIFY (A4)
  hooks/useWizardInitialization.ts                             # MODIFY (A4)
  hooks/useWizardPartners.ts                                   # MODIFY: preset selection (A4)
src/services/rounds/roundSession.ts                            # CREATE: extracted shared logic (B5)
src/screens/rounds/RoundListScreen/hooks/useStartNewRound.ts   # MODIFY: use roundSession (B5)
src/screens/rounds/RoundListScreen/hooks/useScheduleRound.ts   # CREATE (B4)
src/screens/rounds/RoundListScreen/index.tsx                   # MODIFY: upcoming → detail nav (B7)
src/hooks/rounds/scheduledRounds.ts                            # CREATE: queries + mutations (B6)
src/utils/invitationSummary.ts                                 # CREATE: pure helpers (B6)
src/utils/__tests__/invitationSummary.test.ts                  # CREATE: tests (B6)
src/screens/rounds/ScheduledRoundScreen/index.tsx              # CREATE (B7)
src/types/database/enums.ts                                    # MODIFY: InvitationStatus, notification type (B2)
src/types/database/round.types.ts                              # MODIFY: RoundPlayer fields (B2)
src/navigation/types.ts                                        # MODIFY: ScheduledRound route (B7)
supabase/migrations/20260612000000_scheduled_rounds.sql        # CREATE (B1)
```

---

# PART A — Format-first wizard (no schema changes)

### Task 1: Standalone metadata on the preset catalog

**Files:**
- Modify: `src/constants/roundPresets.ts`
- Test: `src/constants/__tests__/roundPresets.standalone.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/constants/__tests__/roundPresets.standalone.test.ts
import {
  ROUND_PRESETS,
  getStandalonePresets,
  getPresetAvailability,
  presetIdForGameType,
} from '@/constants/roundPresets';

describe('standalone preset metadata', () => {
  it('exposes exactly the standalone-eligible presets, in catalog order', () => {
    expect(getStandalonePresets().map((p) => p.id)).toEqual([
      'individual_stableford',
      'individual_stroke',
      'individual_par',
      'individual_match_play',
      'team_best_ball',
      'team_shamble',
      'team_scramble',
      'team_match_play',
    ]);
  });

  it('defines player bounds including the organiser', () => {
    expect(ROUND_PRESETS.individual_stableford.standalone).toEqual({ minPlayers: 1, maxPlayers: 4 });
    expect(ROUND_PRESETS.individual_match_play.standalone).toEqual({ minPlayers: 2, maxPlayers: 2 });
    expect(ROUND_PRESETS.team_scramble.standalone).toEqual({ minPlayers: 2, maxPlayers: 4 });
    expect(ROUND_PRESETS.team_match_play.standalone).toEqual({ minPlayers: 4, maxPlayers: 4 });
    expect(ROUND_PRESETS.pairs_better_ball_2v2.standalone).toBeUndefined();
  });

  it('marks comp-only presets context-blocked in standalone context', () => {
    const ctx = { tier: 'premium' as const, isStandalone: true, perRoundRulesEnabled: true };
    expect(getPresetAvailability(ROUND_PRESETS.pairs_better_ball_2v2, ctx).contextAllowed).toBe(false);
    expect(getPresetAvailability(ROUND_PRESETS.individual_match_play_seeded, ctx).contextAllowed).toBe(false);
    expect(getPresetAvailability(ROUND_PRESETS.team_best_ball, ctx).contextAllowed).toBe(true);
  });

  it('does not apply comingSoon to standalone-eligible presets in standalone context', () => {
    const ctx = { tier: 'premium' as const, isStandalone: true, perRoundRulesEnabled: true };
    // team_best_ball is comingSoon for competitions but already live standalone
    expect(getPresetAvailability(ROUND_PRESETS.team_best_ball, ctx).comingSoon).toBe(false);
  });

  it('maps legacy GameType entry points to canonical presets', () => {
    expect(presetIdForGameType('stableford')).toBe('individual_stableford');
    expect(presetIdForGameType('match-play')).toBe('individual_match_play');
    expect(presetIdForGameType('scramble')).toBe('team_scramble');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/constants/__tests__/roundPresets.standalone.test.ts`
Expected: FAIL — `getStandalonePresets is not a function` (and friends).

- [ ] **Step 3: Implement the metadata and helpers**

In `src/constants/roundPresets.ts`:

3a. Add to the `RoundPreset` interface (after `comingSoon`):

```typescript
  /**
   * Standalone (social-round) eligibility and player bounds. Presence of
   * this object means the preset can be picked in the create-round wizard.
   * Bounds INCLUDE the organiser (so minPlayers 4 = organiser + 3 partners).
   */
  standalone?: { minPlayers: number; maxPlayers: number };
```

3b. Add the `standalone` field to these preset literals (and ONLY these):

| Preset constant | `standalone` value |
|---|---|
| `INDIVIDUAL_STABLEFORD` | `{ minPlayers: 1, maxPlayers: 4 }` |
| `INDIVIDUAL_STROKE` | `{ minPlayers: 1, maxPlayers: 4 }` |
| `INDIVIDUAL_PAR` | `{ minPlayers: 1, maxPlayers: 4 }` |
| `INDIVIDUAL_MATCH_PLAY` | `{ minPlayers: 2, maxPlayers: 2 }` |
| `TEAM_BEST_BALL` | `{ minPlayers: 2, maxPlayers: 4 }` |
| `TEAM_SHAMBLE` | `{ minPlayers: 2, maxPlayers: 4 }` |
| `TEAM_SCRAMBLE` | `{ minPlayers: 2, maxPlayers: 4 }` |
| `TEAM_MATCH_PLAY` | `{ minPlayers: 4, maxPlayers: 4 }` |

Rationale: these eight map to game types the standalone engine already supports (`useStartNewRound` derives `is_team_round`/`team_format` from the game type; `MAX_PARTNERS = 3` caps every bound at 4). Sub-match presets (`round_format: 'split'`) and seeded brackets need competition pairing infrastructure — leave them comp-only.

3c. Add helpers after `getRoundPreset`:

```typescript
/** Presets selectable in the standalone create-round wizard, in catalog order. */
export function getStandalonePresets(): RoundPreset[] {
  return ROUND_PRESET_ORDER.map((id) => ROUND_PRESETS[id]).filter(
    (p) => p.standalone != null
  );
}

/**
 * Canonical preset for a bare GameType. Used by legacy entry points that
 * pre-select a game type (league quick-start, initialMatchType prop).
 */
export function presetIdForGameType(gameType: GameType): RoundPresetId {
  switch (gameType) {
    case 'stableford': return 'individual_stableford';
    case 'stroke': return 'individual_stroke';
    case 'par': return 'individual_par';
    case 'match-play': return 'individual_match_play';
    case 'best-ball': return 'team_best_ball';
    case 'scramble': return 'team_scramble';
    case 'shamble': return 'team_shamble';
  }
}
```

3d. In `getPresetAvailability` (line ~621), replace the `contextAllowed` and `comingSoon` lines:

```typescript
  const contextAllowed = context.isStandalone
    ? preset.standalone != null
    : true;
  // Dev builds bypass the "Coming Soon" lock. Standalone-eligible presets
  // are also exempt in standalone context: their game types (e.g. best-ball,
  // shamble) already ship in the social-round wizard — comingSoon only gates
  // the competition finalization path.
  const comingSoon =
    preset.comingSoon === true &&
    !__DEV__ &&
    !(context.isStandalone && preset.standalone != null);
```

Note the old expression was `!(preset.requiresCompetitionTeams && context.isStandalone)` — the new standalone branch is strictly more accurate (it also blocks `individual_match_play_seeded`, which never made sense standalone).

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/constants/__tests__/roundPresets.standalone.test.ts`
Expected: PASS. Also run `pnpm test src/components/rounds` and `pnpm test roundPresets` to confirm no existing preset/picker test regressed.

- [ ] **Step 5: Commit**

```bash
git add src/constants/roundPresets.ts src/constants/__tests__/roundPresets.standalone.test.ts
git commit -m "feat(rounds): standalone eligibility + player bounds on round presets"
```

---

### Task 2: Player-count validation helper

**Files:**
- Create: `src/utils/presetPlayers.ts`
- Test: `src/utils/__tests__/presetPlayers.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/utils/__tests__/presetPlayers.test.ts
import { checkPresetPlayerCount } from '@/utils/presetPlayers';

describe('checkPresetPlayerCount', () => {
  it('passes individual formats with any group size 1-4', () => {
    expect(checkPresetPlayerCount('individual_stableford', 0).ok).toBe(true); // solo
    expect(checkPresetPlayerCount('individual_stableford', 3).ok).toBe(true); // full group
  });

  it('blocks under-filled formats with an add-N-more message', () => {
    const result = checkPresetPlayerCount('team_scramble', 0); // organiser only
    expect(result.ok).toBe(false);
    expect(result.message).toBe('Scramble needs at least 2 players — add 1 more');
  });

  it('uses singular wording when one player is missing', () => {
    const result = checkPresetPlayerCount('team_match_play', 2); // 3 of 4
    expect(result.ok).toBe(false);
    expect(result.message).toBe('Team Match Play needs at least 4 players — add 1 more');
  });

  it('blocks exact-size formats when over-filled', () => {
    const result = checkPresetPlayerCount('individual_match_play', 2); // 3 players in a 1v1
    expect(result.ok).toBe(false);
    expect(result.message).toBe('Match Play allows at most 2 players');
  });

  it('reports the bounds and total for UI hints', () => {
    const result = checkPresetPlayerCount('team_match_play', 1);
    expect(result.required).toEqual({ minPlayers: 4, maxPlayers: 4 });
    expect(result.totalPlayers).toBe(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/utils/__tests__/presetPlayers.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/utils/presetPlayers.ts
/**
 * Player-count validation for standalone round presets.
 * partnerCount EXCLUDES the organiser; totals include them.
 */
import { ROUND_PRESETS, type RoundPresetId } from '@/constants/roundPresets';

export interface PlayerCountCheck {
  ok: boolean;
  required: { minPlayers: number; maxPlayers: number };
  totalPlayers: number;
  /** Human message when not ok, null when ok. */
  message: string | null;
}

export function checkPresetPlayerCount(
  presetId: RoundPresetId,
  partnerCount: number
): PlayerCountCheck {
  const preset = ROUND_PRESETS[presetId];
  const required = preset.standalone ?? { minPlayers: 1, maxPlayers: 4 };
  const totalPlayers = partnerCount + 1;

  if (totalPlayers < required.minPlayers) {
    const missing = required.minPlayers - totalPlayers;
    return {
      ok: false,
      required,
      totalPlayers,
      message: `${preset.shortTitle} needs at least ${required.minPlayers} players — add ${missing} more`,
    };
  }
  if (totalPlayers > required.maxPlayers) {
    return {
      ok: false,
      required,
      totalPlayers,
      message: `${preset.shortTitle} allows at most ${required.maxPlayers} players`,
    };
  }
  return { ok: true, required, totalPlayers, message: null };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/utils/__tests__/presetPlayers.test.ts`
Expected: PASS. (If the `'add 1 more'` singular assertion fails because you prefer "1 more player", change the TEST and the message together — pick one wording.)

- [ ] **Step 5: Commit**

```bash
git add src/utils/presetPlayers.ts src/utils/__tests__/presetPlayers.test.ts
git commit -m "feat(rounds): preset player-count validation helper"
```

---

### Task 3: GameFormatStep rendering the preset catalog

**Files:**
- Modify: `src/components/rounds/RoundPresetPicker.tsx`
- Create: `src/screens/rounds/CreateRoundBottomSheet/steps/GameFormatStep.tsx`
- Modify: `src/screens/rounds/CreateRoundBottomSheet/types.ts`
- Modify: `src/screens/rounds/CreateRoundBottomSheet/steps/index.ts`

- [ ] **Step 1: Add a tier-override prop to RoundPresetPicker**

In `RoundPresetPicker.tsx`, add to `RoundPresetPickerProps`:

```typescript
  /**
   * Override tier gating per preset. When provided, replaces the
   * tier check from getPresetAvailability (used by the standalone
   * wizard, which gates by limits.allowedGameTypes instead of preset.tier).
   */
  tierAllowsPreset?: (preset: RoundPreset) => boolean;
```

Where the component computes availability (it calls `getPresetAvailability` per preset — find the call inside the render/`useMemo`), apply the override:

```typescript
const availability = getPresetAvailability(preset, context);
const tierAllowed = tierAllowsPreset
  ? tierAllowsPreset(preset)
  : availability.tierAllowed;
```

and use `tierAllowed` wherever `availability.tierAllowed` was used (lock pill, onUpgrade routing). Keep all other behavior identical so competition flows are untouched.

- [ ] **Step 2: Add `selectedPresetId` to WizardData**

In `CreateRoundBottomSheet/types.ts`:

```typescript
import type { RoundPresetId } from '@/constants/roundPresets';
```

Add to `WizardData` (after `selectedMatchType`):

```typescript
  /** Canonical preset driving game type + player-count requirements. */
  selectedPresetId: RoundPresetId | null;
```

- [ ] **Step 3: Create GameFormatStep**

```typescript
// src/screens/rounds/CreateRoundBottomSheet/steps/GameFormatStep.tsx
/**
 * GameFormatStep - First step in the create round wizard.
 *
 * Renders the canonical round-preset catalog (shared with competition
 * rounds), filtered to standalone-eligible presets. Tier gating uses
 * limits.allowedGameTypes (DB-driven) rather than preset.tier so Free
 * users keep Stroke Play.
 */
import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useSubscription } from '@/hooks/useSubscription';
import { RoundPresetPicker } from '@/components/rounds/RoundPresetPicker';
import type { RoundPreset, RoundPresetId } from '@/constants/roundPresets';

interface GameFormatStepProps {
  selectedPresetId: RoundPresetId | null;
  onSelectPreset: (presetId: RoundPresetId) => void;
  onUpgradePress?: () => void;
}

export const GameFormatStep = memo(function GameFormatStep({
  selectedPresetId,
  onSelectPreset,
  onUpgradePress,
}: GameFormatStepProps) {
  const colors = useThemeColors();
  const { limits } = useSubscription();

  const tierAllowsPreset = useCallback(
    (preset: RoundPreset) =>
      (limits?.allowedGameTypes ?? ['stableford']).includes(preset.config.game_type),
    [limits?.allowedGameTypes]
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.textSecondary }]}>
        How would you like to play?
      </Text>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        <RoundPresetPicker
          selectedPresetId={selectedPresetId}
          onSelect={onSelectPreset}
          perRoundRulesEnabled={false}
          isStandalone={true}
          teamCount={0}
          tierAllowsPreset={tierAllowsPreset}
          onUpgrade={onUpgradePress}
        />
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  list: {
    paddingBottom: spacing.lg,
  },
});
```

Note: `perRoundRulesEnabled: false` — standalone rounds have no competition rules engine. Check how `RoundPresetPicker` surfaces `rulesWouldBeIgnored` (a note on presets carrying a `rules_override`); for standalone-eligible presets that carry one (`team_scramble`), the note text is competition-specific. If it renders confusingly here, pass `perRoundRulesEnabled: true` instead and document why (standalone finalization ignores `rules_override` entirely, so the flag is cosmetic in this context).

- [ ] **Step 4: Export it**

In `steps/index.ts`, add `export { GameFormatStep } from './GameFormatStep';` (keep `MatchTypeStep` exported until Task 6 removes it).

- [ ] **Step 5: Verify compile**

Run: `pnpm type-check`
Expected: clean (the new step isn't wired yet — that's Task 4).

- [ ] **Step 6: Commit**

```bash
git add src/components/rounds/RoundPresetPicker.tsx src/screens/rounds/CreateRoundBottomSheet
git commit -m "feat(rounds): GameFormatStep over preset catalog with tier-override gating"
```

---

### Task 4: Reorder the wizard — format first

**Files:**
- Modify: `src/screens/rounds/CreateRoundBottomSheet/hooks/useCreateRoundWizard.ts`
- Modify: `src/screens/rounds/CreateRoundBottomSheet/hooks/useWizardPartners.ts`
- Modify: `src/screens/rounds/CreateRoundBottomSheet/hooks/useWizardCourseSelection.ts`
- Modify: `src/screens/rounds/CreateRoundBottomSheet/hooks/useWizardInitialization.ts`
- Modify: `src/screens/rounds/CreateRoundBottomSheet/hooks/useWizardNavigation.ts`
- Modify: `src/screens/rounds/CreateRoundBottomSheet/index.tsx`

The step KEY stays `'matchType'` (renaming it touches every conditional for no behavioral gain); only its position and title change. New order: `matchType → course → nineType → partners → …`.

- [ ] **Step 1: Initial step + selectedPresetId state**

In `useCreateRoundWizard.ts`:
- Line 173: `useState<WizardStep>('course')` → `useState<WizardStep>('matchType')`.
- Add `selectedPresetId: null,` to `initialData` (after `selectedMatchType: null,`).
- Add `handleSelectPreset: (presetId: RoundPresetId) => void;` to the return interface and return object (implemented in Step 2).

In `useWizardInitialization.ts` line 94: `setCurrentStep('course')` → `setCurrentStep('matchType')` inside `resetState`.

- [ ] **Step 2: Preset selection routes to course (or skips it)**

In `useWizardPartners.ts`, find `handleSelectMatchType` (it sets `selectedMatchType` and advances the step). Add alongside it (the hook already receives `data`):

```typescript
const handleSelectPreset = useCallback(
  (presetId: RoundPresetId) => {
    const preset = ROUND_PRESETS[presetId];
    setData((prev) => ({
      ...prev,
      selectedPresetId: presetId,
      selectedMatchType: preset.config.game_type,
    }));
    // Course may already be pre-filled (initialCourse / single-course home
    // club) — skip the course step in that case.
    setCurrentStep(data.selectedCourse ? 'nineType' : 'course');
  },
  [data.selectedCourse, setData, setCurrentStep]
);
```

Imports to add: `import { ROUND_PRESETS, type RoundPresetId } from '@/constants/roundPresets';`

Keep `handleSelectMatchType` exported (other steps still pass `selectedMatchType` around) but it should no longer advance the step on its own — check its body: if it calls `setCurrentStep`, remove that call (preset selection owns advancement now). Wire `handleSelectPreset` through `useCreateRoundWizard`'s return.

- [ ] **Step 3: Course selection routes to nineType, nineType routes to partners**

In `useWizardCourseSelection.ts` — both `handleSelectCourse` (lines 77-89) and `handleSelectFavoriteCourse` (lines 121-133): the 9-hole branch `setCurrentStep(initialMatchType ? 'partners' : 'matchType')` becomes `setCurrentStep('partners')` (format is always chosen by now). The 18-hole branch stays `setCurrentStep('nineType')`.

In `useCreateRoundWizard.ts` lines 239-242, `handleSelectNineType`:

```typescript
  const handleSelectNineType = useCallback((nineType: NineType) => {
    setData((prev) => ({ ...prev, nineType }));
    setCurrentStep('partners');
  }, [setData, setCurrentStep]);
```

- [ ] **Step 4: Pre-fill effects in useWizardInitialization**

In the `initialCourse`/home-club effect (lines 115-165): the trailing `setCurrentStep('nineType')` calls (lines 157-162) must NOT skip format selection. Replace both branches with:

```typescript
        // Course is pre-filled, but format is still step 1. If the caller
        // locked the format too (initialMatchType), jump straight to nineType.
        setCurrentStep(initialMatchType ? 'nineType' : 'matchType');
```

In the `initialMatchType` effect (lines 178-185), also derive the preset:

```typescript
  useEffect(() => {
    if (visible && initialMatchType) {
      setData((prev) => ({
        ...prev,
        selectedMatchType: initialMatchType,
        selectedPresetId: presetIdForGameType(initialMatchType),
      }));
    }
  }, [visible, initialMatchType, setData]);
```

Import: `import { presetIdForGameType } from '@/constants/roundPresets';`

Also: when `initialMatchType` is NOT set but no course is pre-filled, the wizard now opens on `matchType` — verify the effect doesn't force `'course'` anywhere else.

- [ ] **Step 5: Back navigation**

In `useWizardNavigation.ts`:
- Add a new handler:

```typescript
  const handleBackToGameFormat = useCallback(() => {
    setCurrentStep('matchType');
  }, [setCurrentStep]);
```

- `handleBackToMatchType` (used as partners' back target before) now means "back to nineType" in the new order — but rather than repurpose it confusingly, leave its body (it routes to `matchType`/`nineType` based on lock) and rewire the CALLERS in index.tsx instead (next step). Export `handleBackToGameFormat` from the hook and through `useCreateRoundWizard`.

In `index.tsx` `resolveBackHandler` (lines 467-477), new mapping:

```typescript
      switch (wizard.currentStep) {
        case 'course': return wizard.handleBackToGameFormat;
        case 'nineType': return wizard.handleBackToCourse;
        case 'partners': return wizard.handleBackToNineType;
        case 'yourSetup': return wizard.handleBackToPartners;
        case 'ballCount': return wizard.handleBackToPartners;
        case 'scoringSetup': return wizard.handleBackToPartners;
        default: return undefined;
      }
```

Caveat: when `initialMatchType` locks the format, `course` is the first step — `handleBackToGameFormat` must not land on a skipped step. Guard in index.tsx: `case 'course': return initialMatchType ? undefined : wizard.handleBackToGameFormat;`. Also `handleBackToCourse` clears `selectedTee` (line 62-69) — still correct.

`isFirstStep` (line 447): `const isFirstStep = currentStepIndex === 0 && !showCreateCourseForm;` (replaces the `currentStep === 'course'` check).

- [ ] **Step 6: Step list, titles, and rendering in index.tsx**

`dynamicStepKeys` (lines 400-414) — reorder every array, e.g.:

```typescript
    let steps: string[];
    if (skipPartnerStep) {
      steps = ['matchType', 'course', 'nineType'];
    } else if (wizard.data.selectedPartners.length > 0) {
      steps = ['matchType', 'course', 'nineType', 'partners', 'scoringSetup'];
    } else if (wizard.currentStep === 'yourSetup') {
      steps = ['matchType', 'course', 'nineType', 'partners', 'yourSetup'];
    } else if (wizard.currentStep === 'ballCount') {
      steps = ['matchType', 'course', 'nineType', 'partners', 'ballCount'];
    } else {
      steps = ['matchType', 'course', 'nineType', 'partners'];
    }
    return initialMatchType ? steps.filter((s) => s !== 'matchType') : steps;
```

`titleMap` (line 450): `matchType: 'Game Format',`.

Replace the `MatchTypeStep` render block (lines 699-706) with:

```typescript
      {wizard.currentStep === 'matchType' && (
        <GameFormatStep
          selectedPresetId={wizard.data.selectedPresetId}
          onSelectPreset={wizard.handleSelectPreset}
        />
      )}
```

Update the imports in `index.tsx` (`GameFormatStep` in, `MatchTypeStep` out) and the file-header step comment (lines 5-11).

- [ ] **Step 7: Type-check, lint, run wizard tests**

Run: `pnpm type-check && pnpm lint && pnpm test src/screens/rounds`
Expected: clean. Existing tests that asserted the old step order will fail — update them to the new order (they are legitimate behavior changes, not regressions).

- [ ] **Step 8: Manual smoke test**

Run `npx expo start --ios` and walk: open Create Round → Game Format first (team formats visible, lock pills per tier) → course → holes → partners → scoring setup → start a stableford round to the scorecard. Also verify a league quick-start (which passes `initialMatchType`) still opens on the course step.

- [ ] **Step 9: Commit**

```bash
git add src/screens/rounds/CreateRoundBottomSheet
git commit -m "feat(rounds): format-first wizard order using preset catalog"
```

---

### Task 5: Player-count enforcement on the Partners step

**Files:**
- Modify: `src/screens/rounds/CreateRoundBottomSheet/steps/PartnersStep.tsx`
- Modify: `src/screens/rounds/CreateRoundBottomSheet/index.tsx` (pass the prop)

- [ ] **Step 1: Pass `selectedPresetId` into PartnersStep**

In `index.tsx`'s PartnersStep render block add `selectedPresetId={wizard.data.selectedPresetId}`; add `selectedPresetId: RoundPresetId | null;` to `PartnersStepProps`.

- [ ] **Step 2: Compute the check and gate Continue**

In `PartnersStep.tsx`:

```typescript
import { checkPresetPlayerCount } from '@/utils/presetPlayers';
```

Inside the component:

```typescript
  const playerCountCheck = useMemo(
    () =>
      selectedPresetId
        ? checkPresetPlayerCount(selectedPresetId, selectedPartners.length)
        : null,
    [selectedPresetId, selectedPartners.length]
  );
  const canContinue = playerCountCheck?.ok ?? true;
```

Find the Continue button at the bottom of the step (the one calling `onContinue`). Gate it:
- `disabled={!canContinue}` and dim it (`backgroundColor: canContinue ? colors.primary : colors.gray300` — same disabled pattern as the create-course button in `index.tsx:659-671`).
- Above the button, when `playerCountCheck && !playerCountCheck.ok`, render the message:

```typescript
  {playerCountCheck && !playerCountCheck.ok && (
    <Text style={[typography.small, { color: colors.warning, textAlign: 'center', marginBottom: spacing.sm }]}>
      {playerCountCheck.message}
    </Text>
  )}
```

Also: the "Add friend/guest" affordances should respect `maxPlayers` — `MAX_PARTNERS` already caps at 3 partners (4 total), which equals every preset's max except `individual_match_play` (max 2). For that case the over-max message + disabled Continue is sufficient; do not add extra hiding logic (YAGNI).

- [ ] **Step 3: Remove the now-dead solo auto-start mismatch**

`useWizardNavigation.handleContinueToScoringSetup` (line 91) routes solo users onward with zero partners. With format-first, a solo user can only reach this with a preset whose `minPlayers === 1` (Continue is disabled otherwise) — no change needed, but verify by reading the function. Leave a one-line comment in `PartnersStep` only if you find an uncovered path.

- [ ] **Step 4: Type-check + tests + manual**

Run: `pnpm type-check && pnpm test src/screens/rounds`
Manual: select Team Match Play → Partners shows "Team Match Play needs at least 4 players — add 3 more", Continue disabled; add 3 friends → enabled. Select Match Play → with 3 players shows the at-most-2 message.

- [ ] **Step 5: Commit**

```bash
git add src/screens/rounds/CreateRoundBottomSheet
git commit -m "feat(rounds): enforce preset player counts on partners step"
```

---

### Task 6: Delete the superseded format lists

**Files:**
- Delete: `src/screens/rounds/CreateRoundBottomSheet/steps/MatchTypeStep.tsx`
- Modify: `src/screens/rounds/CreateRoundBottomSheet/types.ts` (remove `MATCH_TYPES`, `MatchTypeOption`)
- Modify: `src/screens/rounds/CreateRoundBottomSheet/steps/index.ts`, `steps/PartnersStep.tsx`

- [ ] **Step 1: Find all remaining consumers**

Run: `grep -rn "MATCH_TYPES\|MatchTypeOption\|MatchTypeStep" src --include="*.ts" --include="*.tsx" | grep -v test`
`PartnersStep.tsx:23` imports `MATCH_TYPES` — check what it's used for (likely a label lookup for the selected match type banner). Replace with the preset: `ROUND_PRESETS[selectedPresetId].shortTitle` (preferred) or `GAME_TYPE_DESCRIPTIONS` from `@/constants/gameTypeDescriptions`.

- [ ] **Step 2: Delete MatchTypeStep.tsx, remove its export, remove MATCH_TYPES + MatchTypeOption from types.ts**

Do NOT remove `TIER_DISPLAY_NAMES` or `getTeeColor` from types.ts — they have other consumers.

- [ ] **Step 3: Verify**

Run: `pnpm type-check && pnpm lint && pnpm test src/screens/rounds`
Expected: clean — the grep from Step 1 returns no production hits.

- [ ] **Step 4: Commit**

```bash
git add -A src/screens/rounds/CreateRoundBottomSheet
git commit -m "refactor(rounds): remove superseded MATCH_TYPES list and MatchTypeStep"
```

---

### Task 7: Part A wrap-up

- [ ] **Step 1: Full verification**

Run: `pnpm type-check && pnpm lint && pnpm test`
Expected: all green. Fix anything that fails before proceeding.

- [ ] **Step 2: Manual regression pass** (simulator)

- Free-tier account: Stableford + Stroke selectable; Par/Match Play/team formats locked with upgrade prompt.
- Solo stableford round end-to-end to scorecard.
- 4-player scramble: format → course → partners (count gate) → scoring setup team formation pre-seeded → scorecard.
- 2-player match play → MatchPlayScoring screen.

- [ ] **Step 3: Request code review** (superpowers:requesting-code-review) for Part A before starting Part B — A is independently shippable.

---

# PART B — Scheduled rounds with friends

### Task 8: Migration — invitation status, RLS, decline/cancel notifications

**Files:**
- Create: `supabase/migrations/20260612000000_scheduled_rounds.sql`

- [ ] **Step 1: Study the existing policies and trigger**

Read `supabase/migrations/20250114000000_standalone_rounds.sql` (rounds RLS for standalone) and `supabase/migrations/20250131000000_round_players_and_notifications.sql` + `20260118000100_fix_round_player_notification_trigger.sql` (round_players policies, notification-type CHECK constraint pattern at 20250131:98-111, `notify_round_player_invited()`). Note the exact names of existing UPDATE policies on `rounds` and `round_players` and whether invited (non-owner) players already have SELECT on standalone rounds — adjust Step 2's policy names to avoid collisions and skip anything that already exists.

- [ ] **Step 2: Write the migration**

```sql
-- Scheduled social rounds: invitation tracking + start permissions
-- Spec: docs/superpowers/specs/2026-06-12-scheduled-rounds-format-first-wizard-design.md

-- 1) Invitation tracking. Default 'accepted' keeps every existing code path
--    (play-now rounds, competition rounds, backfill) valid without touching
--    inserts; the scheduled flow sets 'pending' explicitly for invitees.
ALTER TABLE round_players
  ADD COLUMN IF NOT EXISTS invitation_status text NOT NULL DEFAULT 'accepted'
    CHECK (invitation_status IN ('pending', 'accepted', 'declined')),
  ADD COLUMN IF NOT EXISTS responded_at timestamptz;

-- 2) Invitees respond to their own invitation row.
DROP POLICY IF EXISTS "Players can respond to their round invitation" ON round_players;
CREATE POLICY "Players can respond to their round invitation"
  ON round_players FOR UPDATE
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- 3) Accepted players (not just the creator) can start a standalone round
--    (status upcoming -> in-progress) and edit it on the day.
DROP POLICY IF EXISTS "Accepted players can update standalone rounds" ON rounds;
CREATE POLICY "Accepted players can update standalone rounds"
  ON rounds FOR UPDATE
  USING (
    competition_id IS NULL
    AND EXISTS (
      SELECT 1 FROM round_players rp
      WHERE rp.round_id = rounds.id
        AND rp.player_id = auth.uid()
        AND rp.invitation_status = 'accepted'
    )
  );

-- 4) New notification type for invitation responses + cancellations.
--    Repeat the constraint-replacement pattern from
--    20250131000000_round_players_and_notifications.sql:98-111, adding
--    'social_round_response' to the allowed list (keep every existing value).

-- 5) Organizer notification when an invitee declines.
CREATE OR REPLACE FUNCTION notify_round_invitation_declined()
RETURNS TRIGGER AS $$
DECLARE
  v_round RECORD;
  v_decliner_name text;
BEGIN
  IF NEW.invitation_status = 'declined' AND OLD.invitation_status IS DISTINCT FROM 'declined' THEN
    SELECT r.user_id, r.date, c.name AS course_name
      INTO v_round
      FROM rounds r LEFT JOIN courses c ON c.id = r.course_id
      WHERE r.id = NEW.round_id;
    SELECT name INTO v_decliner_name FROM players WHERE id = NEW.player_id;

    IF v_round.user_id IS NOT NULL AND v_round.user_id <> NEW.player_id THEN
      INSERT INTO notifications (user_id, type, title, body, data)
      VALUES (
        v_round.user_id,
        'social_round_response',
        'Invitation declined',
        COALESCE(v_decliner_name, 'A player') || ' can''t make your round at '
          || COALESCE(v_round.course_name, 'the course'),
        jsonb_build_object('round_id', NEW.round_id, 'player_id', NEW.player_id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_round_invitation_declined ON round_players;
CREATE TRIGGER trigger_notify_round_invitation_declined
  AFTER UPDATE ON round_players
  FOR EACH ROW EXECUTE FUNCTION notify_round_invitation_declined();

-- 6) Notify all invitees when an upcoming round is cancelled (deleted).
CREATE OR REPLACE FUNCTION notify_scheduled_round_cancelled()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'upcoming' AND OLD.competition_id IS NULL THEN
    INSERT INTO notifications (user_id, type, title, body, data)
    SELECT rp.player_id,
           'social_round_response',
           'Round cancelled',
           'Your scheduled round on ' || COALESCE(OLD.date::text, 'TBD') || ' was cancelled',
           jsonb_build_object('round_id', OLD.id)
      FROM round_players rp
      WHERE rp.round_id = OLD.id
        AND rp.player_id <> OLD.user_id
        AND rp.invitation_status <> 'declined';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_scheduled_round_cancelled ON rounds;
CREATE TRIGGER trigger_notify_scheduled_round_cancelled
  BEFORE DELETE ON rounds
  FOR EACH ROW EXECUTE FUNCTION notify_scheduled_round_cancelled();
```

Adjust column/table names in the two trigger functions to match the real `notifications` schema — copy the INSERT column list used by `notify_round_player_invited()` in `20260118000100_...sql` (it is the ground truth for `notifications` inserts, including any push-related fields).

Verify item 4's exact SQL against the notifications CHECK constraint in the live schema before finalizing; also verify whether non-owner invitees can SELECT standalone rounds and their round_players rows (needed for the Upcoming list) — if not, add the SELECT policies here, modeled on the round_players visibility policy from `20250131...sql`.

- [ ] **Step 3: Test against staging**

Apply via psql to STAGING (aws-1 pooler — see memory note; do NOT `supabase db push`, the CLI is linked to prod):
- Insert a fake upcoming round + pending round_player, update to declined → notification row appears for the owner.
- Delete the round → cancellation notifications appear.
- As the invitee role (set `request.jwt.claims`), update own row (allowed), another player's row (denied), and the round status with `invitation_status='accepted'` (allowed) vs `'pending'` (denied).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260612000000_scheduled_rounds.sql
git commit -m "feat(db): round invitation status, start RLS, decline/cancel notifications"
```

---

### Task 9: TypeScript types for invitations

**Files:**
- Modify: `src/types/database/enums.ts`
- Modify: `src/types/database/round.types.ts`

- [ ] **Step 1: Add the enum + notification type**

In `enums.ts` (near `RoundStatus`, line 22):

```typescript
/** Response state for a player invited to a scheduled social round. */
export type InvitationStatus = 'pending' | 'accepted' | 'declined';
```

In the `NotificationType` union (line 121+), after `'social_round_invitation'` add `| 'social_round_response'`.

- [ ] **Step 2: Extend RoundPlayer**

In `round.types.ts` `RoundPlayer` interface (lines 114-129), add:

```typescript
  /** Invitation response for scheduled rounds. Play-now rows default to 'accepted'. */
  invitation_status: InvitationStatus;
  responded_at: string | null;
```

(plus the `InvitationStatus` import). If a generated `database.types.ts`/Supabase types file also declares `round_players`, regenerate or hand-extend it the same way — grep `round_players` in `src/types` to find every declaration.

- [ ] **Step 3: Verify + commit**

Run: `pnpm type-check`

```bash
git add src/types
git commit -m "feat(types): invitation status on round players"
```

---

### Task 10: Pure invitation helpers (TDD)

**Files:**
- Create: `src/utils/invitationSummary.ts`
- Test: `src/utils/__tests__/invitationSummary.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/utils/__tests__/invitationSummary.test.ts
import { summarizeInvitations, startBlockReason } from '@/utils/invitationSummary';

const p = (id: string, status: 'pending' | 'accepted' | 'declined') => ({
  player_id: id,
  invitation_status: status,
});

describe('summarizeInvitations', () => {
  it('counts by status', () => {
    expect(
      summarizeInvitations([p('a', 'accepted'), p('b', 'pending'), p('c', 'declined'), p('d', 'pending')])
    ).toEqual({ accepted: 1, pending: 2, declined: 1, activeCount: 3 });
  });
});

describe('startBlockReason', () => {
  it('allows start when accepted players satisfy the preset minimum', () => {
    expect(startBlockReason('individual_stableford', [p('a', 'accepted')])).toBeNull();
  });

  it('blocks start when kept players fall below the minimum', () => {
    expect(startBlockReason('team_match_play', [p('a', 'accepted'), p('b', 'accepted'), p('c', 'declined'), p('d', 'declined')]))
      .toBe('Team Match Play needs at least 4 players — add 2 more');
  });

  it('counts pending players toward the requirement (keep-or-drop resolves them at start)', () => {
    expect(startBlockReason('team_match_play', [p('a', 'accepted'), p('b', 'accepted'), p('c', 'pending'), p('d', 'pending')]))
      .toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test src/utils/__tests__/invitationSummary.test.ts` — FAIL, module not found.

- [ ] **Step 3: Implement**

```typescript
// src/utils/invitationSummary.ts
import { checkPresetPlayerCount } from '@/utils/presetPlayers';
import type { RoundPresetId } from '@/constants/roundPresets';
import type { InvitationStatus } from '@/types/database/enums';

interface InvitationRow {
  player_id: string;
  invitation_status: InvitationStatus;
}

export interface InvitationSummary {
  accepted: number;
  pending: number;
  declined: number;
  /** accepted + pending — players who may still tee off. */
  activeCount: number;
}

export function summarizeInvitations(rows: InvitationRow[]): InvitationSummary {
  const accepted = rows.filter((r) => r.invitation_status === 'accepted').length;
  const pending = rows.filter((r) => r.invitation_status === 'pending').length;
  const declined = rows.filter((r) => r.invitation_status === 'declined').length;
  return { accepted, pending, declined, activeCount: accepted + pending };
}

/**
 * Null when the round can be started, otherwise the human-readable reason.
 * Pending players count toward the requirement — the keep-or-drop prompt
 * resolves them at start time and re-checks against the kept set.
 */
export function startBlockReason(
  presetId: RoundPresetId,
  rows: InvitationRow[]
): string | null {
  const { activeCount } = summarizeInvitations(rows);
  // checkPresetPlayerCount takes partner count excluding the organiser,
  // but rows here INCLUDE the organiser's own row.
  const result = checkPresetPlayerCount(presetId, activeCount - 1);
  return result.ok ? null : result.message;
}
```

- [ ] **Step 4: Run to verify pass, commit**

Run: `pnpm test src/utils/__tests__/invitationSummary.test.ts` — PASS.

```bash
git add src/utils/invitationSummary.ts src/utils/__tests__/invitationSummary.test.ts
git commit -m "feat(rounds): invitation summary + start-gate helpers"
```

---

### Task 11: Extract the shared round-session service

**Files:**
- Create: `src/services/rounds/roundSession.ts`
- Modify: `src/screens/rounds/RoundListScreen/hooks/useStartNewRound.ts`

This is a pure refactor: `useStartNewRound.ts:312-443` (scoring pairs, skins, wolf creation, player-tee map, hole filtering, scorecard init, navigation routing) is needed verbatim by the Part B start-day flow. Extract it so both call sites share it.

- [ ] **Step 1: Create the service**

Move the following from `useStartNewRound` into exported functions in `src/services/rounds/roundSession.ts`, parameterizing on what the hook closes over:

```typescript
// Signatures (bodies are moved verbatim from useStartNewRound):

/** Creates scoring pairs / skins / wolf rows for a round. All non-blocking. */
export async function createRoundSideGames(args: {
  roundId: string;
  userId: string;
  partners: PlayingPartner[];
  scoringPairsConfig?: ScoringPairsConfig;
  skinsConfig?: StandaloneSkinsConfig;
  wolfConfig?: StandaloneWolfConfig;
}): Promise<void>;

/** Builds the per-player tee map (useStartNewRound.ts:397-407). */
export function buildPlayerTeeMap(args: {
  currentUserId: string | null;
  selectedTee: TeeBox | undefined;
  partners: PlayingPartner[];
}): Map<string, TeeBox>;

/** Routes to the right scoring screen (useStartNewRound.ts:420-443). */
export function navigateToScoring(
  navigation: NativeStackNavigationProp<RootStackParamList>,
  args: {
    roundId: string;
    gameType: GameType;
    teamConfig?: TeamConfig;
    players: Player[];
    isBuildAsYouPlay?: boolean;
  }
): void;
```

Also move `DEFAULT_HOLES` and the course-holes fetch/parse block (lines 168-192) into an exported `fetchRoundHoles(courseId, isBuildAsYouPlay, nineType)` returning `{ holes: Hole[]; effectiveNineType: NineType }`.

- [ ] **Step 2: Rewire useStartNewRound to call the service**

The hook keeps: handicap-commit logic, the rounds INSERT, the round_players INSERT (now explicitly setting `invitation_status: 'accepted'` on every row — play-now players are present in person), then calls `fetchRoundHoles`, `createRoundSideGames`, `buildPlayerTeeMap`, `initializeRound`, `navigateToScoring`. Behavior must be identical — this is the verification bar.

- [ ] **Step 3: Verify**

Run: `pnpm type-check && pnpm test src/screens/rounds && pnpm test src/services`
Manual: start a play-now group round with skins enabled → skins game row exists, scorecard opens.

- [ ] **Step 4: Commit**

```bash
git add src/services/rounds/roundSession.ts src/screens/rounds/RoundListScreen/hooks/useStartNewRound.ts
git commit -m "refactor(rounds): extract shared round session service from useStartNewRound"
```

---

### Task 12: "When" step in the wizard

**Files:**
- Create: `src/screens/rounds/CreateRoundBottomSheet/steps/WhenStep.tsx`
- Modify: `CreateRoundBottomSheet/types.ts`, `steps/index.ts`, `index.tsx`, `hooks/useCreateRoundWizard.ts`

- [ ] **Step 1: Check the date-picker dependency**

Run: `grep -n "datetimepicker" package.json`
If absent: `npx expo install @react-native-community/datetimepicker`. (Check first how competition creation picks dates — `grep -rn "DateTimePicker\|DatePicker" src/components/competitionWizard src/components/forms` — and reuse that component/pattern instead if one exists.)

- [ ] **Step 2: Extend wizard types**

`types.ts`:
- `WizardStep` union: add `'when'` → `'course' | 'nineType' | 'matchType' | 'when' | 'partners' | 'ballCount' | 'scoringSetup' | 'yourSetup'`.
- `WizardData`: add

```typescript
  /** Scheduled round date (YYYY-MM-DD). Null = play now. */
  scheduledDate: string | null;
  /** Scheduled tee time (HH:MM:SS). Null = no specific time. */
  scheduledTeeTime: string | null;
```

- `initialData` in `useCreateRoundWizard.ts`: `scheduledDate: null, scheduledTeeTime: null,`.
- `CreateRoundBottomSheetProps`: add

```typescript
  /** Invoked instead of onStartRound when the user schedules a future round. */
  onScheduleRound?: (args: ScheduleRoundArgs) => void;
```

with a named-args interface (no more positional growth):

```typescript
export interface ScheduleRoundArgs {
  courseId: string;
  courseName: string;
  partners: PlayingPartner[];
  selectedTee?: TeeBox;
  gameType: GameType;
  presetId: RoundPresetId;
  nineType: NineType;
  date: string;          // YYYY-MM-DD
  teeTime: string | null; // HH:MM:SS
}
```

- [ ] **Step 3: Build WhenStep**

```typescript
// src/screens/rounds/CreateRoundBottomSheet/steps/WhenStep.tsx
/**
 * WhenStep - Play now, or schedule this round for a future date/tee time.
 * Scheduling switches the wizard to the scheduled path (ends at Partners
 * with a "Schedule Round" CTA; scoring setup happens on the day).
 */
import React, { memo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { getLocalDateString } from '@/utils/formatting';

interface WhenStepProps {
  scheduledDate: string | null;
  scheduledTeeTime: string | null;
  onPlayNow: () => void;
  onSchedule: (date: string, teeTime: string | null) => void;
}

export const WhenStep = memo(function WhenStep({
  scheduledDate,
  scheduledTeeTime,
  onPlayNow,
  onSchedule,
}: WhenStepProps) {
  const colors = useThemeColors();
  const [mode, setMode] = useState<'now' | 'schedule'>(scheduledDate ? 'schedule' : 'now');
  const [date, setDate] = useState<Date>(
    scheduledDate ? new Date(`${scheduledDate}T${scheduledTeeTime ?? '08:00:00'}`) : defaultTomorrowMorning()
  );

  const handleContinue = () => {
    if (mode === 'now') {
      onPlayNow();
    } else {
      const yyyyMmDd = getLocalDateString(date);
      const hhMmSs = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`;
      onSchedule(yyyyMmDd, hhMmSs);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.textSecondary }]}>When are you playing?</Text>

      <TouchableOpacity
        style={[styles.option, { borderColor: mode === 'now' ? colors.primary : colors.border, backgroundColor: colors.surface }, shadows.sm]}
        onPress={() => setMode('now')}
        accessibilityRole="radio"
        accessibilityState={{ selected: mode === 'now' }}
      >
        <Icon source="play-circle-outline" size={24} color={colors.primary} />
        <View style={styles.optionText}>
          <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>Play now</Text>
          <Text style={[typography.small, { color: colors.textSecondary }]}>Head straight to scoring</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.option, { borderColor: mode === 'schedule' ? colors.primary : colors.border, backgroundColor: colors.surface }, shadows.sm]}
        onPress={() => setMode('schedule')}
        accessibilityRole="radio"
        accessibilityState={{ selected: mode === 'schedule' }}
      >
        <Icon source="calendar-clock" size={24} color={colors.primary} />
        <View style={styles.optionText}>
          <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>Schedule for later</Text>
          <Text style={[typography.small, { color: colors.textSecondary }]}>Pick a date and tee time, invite your friends</Text>
        </View>
      </TouchableOpacity>

      {mode === 'schedule' && (
        <View style={styles.pickerBlock}>
          <DateTimePicker
            value={date}
            mode="datetime"
            minimumDate={new Date()}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, selected) => selected && setDate(selected)}
          />
        </View>
      )}

      <TouchableOpacity
        style={[styles.continueButton, { backgroundColor: colors.primary }, shadows.sm]}
        onPress={handleContinue}
      >
        <Text style={[typography.bodyBold, { color: colors.white }]}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
});

function defaultTomorrowMorning(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return d;
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  title: { ...typography.smallBold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.md },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 2, marginBottom: spacing.sm, minHeight: 72 },
  optionText: { flex: 1 },
  pickerBlock: { marginTop: spacing.sm, alignItems: 'center' },
  continueButton: { marginTop: 'auto', marginBottom: spacing.lg, height: 48, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center' },
});
```

Verify `getLocalDateString`'s signature in `src/utils/formatting.ts` — `useStartNewRound.ts:208` calls it with no args; if it doesn't accept a Date, add an optional `date: Date = new Date()` parameter there (with its existing tests updated) rather than reimplementing.

Android note: `mode="datetime"` is iOS-only. On Android render two pickers (date then time) — follow the platform-split pattern of whatever existing date field you found in Step 1.

- [ ] **Step 4: Wire the step into the flow**

- `handleSelectNineType` (from Task 4 Step 3): `setCurrentStep('partners')` → `setCurrentStep('when')`.
- `useCreateRoundWizard`: add handlers

```typescript
  const handlePlayNow = useCallback(() => {
    setData((prev) => ({ ...prev, scheduledDate: null, scheduledTeeTime: null }));
    setCurrentStep('partners');
  }, [setData, setCurrentStep]);

  const handleScheduleFor = useCallback((date: string, teeTime: string | null) => {
    setData((prev) => ({ ...prev, scheduledDate: date, scheduledTeeTime: teeTime }));
    setCurrentStep('partners');
  }, [setData, setCurrentStep]);
```

(export both through the return interface).
- `index.tsx`: render block

```typescript
      {wizard.currentStep === 'when' && (
        <WhenStep
          scheduledDate={wizard.data.scheduledDate}
          scheduledTeeTime={wizard.data.scheduledTeeTime}
          onPlayNow={wizard.handlePlayNow}
          onSchedule={wizard.handleScheduleFor}
        />
      )}
```

- `dynamicStepKeys`: insert `'when'` after `'nineType'` in every array from Task 4 Step 6 (except the `skipPartnerStep` quick-start list, which stays play-now only).
- `titleMap`: `when: 'When'`.
- Back handlers: `partners` back → new `handleBackToWhen` (`setCurrentStep('when')`); `when` back → `handleBackToNineType`. Add `handleBackToWhen` to `useWizardNavigation` and the `resolveBackHandler` switch.
- `skipPartnerStep` and `initialMatchType` quick-start flows bypass `'when'` entirely (league rounds are play-now): in `useWizardCourseSelection`, the `skipPartnerStep` auto-start branches are untouched; the 9-hole `setCurrentStep('partners')` from Task 4 becomes `setCurrentStep('when')`.

- [ ] **Step 5: Verify + commit**

Run: `pnpm type-check && pnpm lint && pnpm test src/screens/rounds`
Manual: wizard now runs Format → Course → Holes → When → Partners; "Play now" path identical to before.

```bash
git add src/screens/rounds/CreateRoundBottomSheet package.json pnpm-lock.yaml
git commit -m "feat(rounds): When step — play now or schedule for later"
```

---

### Task 13: Schedule-round creation path

**Files:**
- Create: `src/screens/rounds/RoundListScreen/hooks/useScheduleRound.ts`
- Modify: `CreateRoundBottomSheet/hooks/useWizardNavigation.ts`, `steps/PartnersStep.tsx`, `index.tsx`
- Modify: `src/screens/rounds/RoundListScreen/index.tsx` (pass the new callback)

- [ ] **Step 1: The hook**

```typescript
// src/screens/rounds/RoundListScreen/hooks/useScheduleRound.ts
/**
 * useScheduleRound - Creates an 'upcoming' standalone round with pending
 * friend invitations. No scorecards are created; that happens at start time
 * (see ScheduledRoundScreen). The round_players INSERT fires the existing
 * notify_round_player_invited trigger, which sends the invite pushes.
 */
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useConfirmationDialog, type DialogConfig } from '@/hooks';
import type { ScheduleRoundArgs } from '../../CreateRoundBottomSheet';

export function useScheduleRound(onScheduled?: () => void) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { dialogConfig, showAlert, dismissDialog } = useConfirmationDialog();
  const [isScheduling, setIsScheduling] = useState(false);

  const handleScheduleRound = useCallback(
    async (args: ScheduleRoundArgs) => {
      if (isScheduling || !user?.id) return;
      setIsScheduling(true);
      try {
        const isStandardTeamFormat = ['scramble', 'shamble', 'best-ball'].includes(args.gameType);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
        const { data: roundData, error: roundError } = await (supabase.from('rounds') as any)
          .insert({
            course_id: args.courseId,
            user_id: user.id,
            competition_id: null,
            round_number: 1,
            date: args.date,
            tee_time: args.teeTime,
            game_type: args.gameType,
            status: 'upcoming',
            selected_tee: args.selectedTee ?? null,
            is_team_round: isStandardTeamFormat,
            team_format: isStandardTeamFormat ? args.gameType : null,
            nine_type: args.nineType,
          })
          .select('id')
          .single();
        if (roundError) throw new Error(roundError.message);

        const roundId = roundData.id;
        const rows = [
          { round_id: roundId, player_id: user.id, added_by: null, invitation_status: 'accepted', responded_at: new Date().toISOString(), selected_tee: args.selectedTee ?? null },
          ...args.partners.map((p) => ({
            round_id: roundId,
            player_id: p.id,
            added_by: user.id,
            invitation_status: 'pending',
            responded_at: null,
            selected_tee: p.selectedTee ?? args.selectedTee ?? null,
          })),
        ];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
        const { error: playersError } = await (supabase.from('round_players') as any).insert(rows);
        if (playersError) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
          await (supabase.from('rounds') as any).delete().eq('id', roundId);
          throw new Error(playersError.message);
        }

        await queryClient.invalidateQueries({ queryKey: ['rounds'] });
        onScheduled?.();
      } catch (error) {
        console.error('[useScheduleRound] Failed:', error);
        showAlert('Error', 'Failed to schedule the round. Please try again.');
      } finally {
        setIsScheduling(false);
      }
    },
    [isScheduling, user?.id, queryClient, onScheduled, showAlert]
  );

  return { handleScheduleRound, isScheduling, dialogConfig, dismissDialog };
}
```

Replace `['rounds']` with the real query-key factory — `grep -n "rounds" src/hooks/queryKeys.ts` and use the same key `RoundListScreen`'s list query uses. Note: team match play (`team_match_play` preset) schedules as `game_type: 'match-play'` with `is_team_round: false` here — teams are formed at start time, matching the play-now flow where `teamConfig` decides; verify `isStandardTeamFormat` mirrors `useStartNewRound.ts:195-197` exactly.

Guests/placeholders: placeholder players can't respond to invites. Insert their rows with `invitation_status: 'accepted'` — check membership via the `usePlaceholderPlayers()` pattern from `useStartNewRound.ts:139`, or simpler: any partner with no email/auth account. Implement the simplest reliable check available in `PlayingPartner` (placeholder IDs come from `usePlaceholderPlayers`; pass an `isPlaceholder` flag onto `PlayingPartner` when toggled in if needed).

- [ ] **Step 2: Wizard schedule CTA**

`useWizardNavigation.ts`: add

```typescript
  const handleScheduleRound = useCallback(() => {
    if (!data.selectedCourse || !data.scheduledDate || !data.selectedMatchType || !data.selectedPresetId) return;
    onScheduleRound?.({
      courseId: data.selectedCourse.courseId,
      courseName: data.selectedCourse.courseName,
      partners: data.selectedPartners,
      selectedTee: data.selectedTee ?? undefined,
      gameType: data.selectedMatchType,
      presetId: data.selectedPresetId,
      nineType: data.nineType,
      date: data.scheduledDate,
      teeTime: data.scheduledTeeTime,
    });
    resetState();
    onClose();
  }, [data, onScheduleRound, resetState, onClose]);
```

(`onScheduleRound` threaded through `useCreateRoundWizard` options from the component prop.)

`PartnersStep.tsx`: new props `isScheduling: boolean` (i.e. `scheduledDate != null`) and `onSchedule: () => void`. The Continue button becomes: label `isScheduling ? 'Schedule Round' : 'Continue'`, onPress `isScheduling ? onSchedule : onContinue`, still gated by `canContinue` from Task 5 (invitees count toward the requirement — they're in `selectedPartners`).

`index.tsx`: pass `isScheduling={wizard.data.scheduledDate != null}` and `onSchedule={wizard.handleScheduleRound}`; also trim `dynamicStepKeys` for the scheduled path (no `scoringSetup`/`yourSetup`/`ballCount` after partners when `scheduledDate != null`).

`RoundListScreen/index.tsx`: instantiate `useScheduleRound`, pass `onScheduleRound={handleScheduleRound}` to `CreateRoundBottomSheet`, render its `dialogConfig` alongside the existing one, and show a brief success path (the sheet closes; the new round appears in Upcoming via invalidation).

- [ ] **Step 3: Tier limits count scheduled rounds at creation**

Find where the play-now flow enforces the social-rounds tier limit (`grep -rn "social_rounds\|socialRounds\|roundLimit" src/hooks src/screens/rounds --include="*.ts*"` — likely a check in `RoundListScreen` before opening the sheet, or inside `useStartNewRound`). Apply the same check before `useScheduleRound` inserts: a scheduled round counts toward the limit the moment it is created, per the spec. If the existing enforcement is purely count-based on `rounds` rows, no code is needed (the new `upcoming` row counts automatically) — verify and note which it is in the commit message.

- [ ] **Step 4: Verify + commit**

Run: `pnpm type-check && pnpm test src/screens/rounds`
Manual (staging account with a friend account): schedule tomorrow's round with 1 friend → round in Upcoming for organizer; friend receives push + sees it (full friend-side visibility lands with Tasks 14-15).

```bash
git add src/screens/rounds
git commit -m "feat(rounds): schedule-round creation path with pending invitations"
```

---

### Task 14: Scheduled-round queries and mutations

**Files:**
- Create: `src/hooks/rounds/scheduledRounds.ts`

- [ ] **Step 1: Implement hooks**

```typescript
// src/hooks/rounds/scheduledRounds.ts
/**
 * Queries + mutations for scheduled (upcoming) standalone rounds and
 * round invitations.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { InvitationStatus } from '@/types/database/enums';

export const scheduledRoundKeys = {
  all: ['scheduledRounds'] as const,
  detail: (roundId: string) => [...scheduledRoundKeys.all, roundId] as const,
};

/** Round + course + players (with profile + invitation status). */
export function useScheduledRound(roundId: string) {
  return useQuery({
    queryKey: scheduledRoundKeys.detail(roundId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rounds')
        .select(`
          id, user_id, course_id, date, tee_time, status, game_type, nine_type, selected_tee,
          courses ( id, name, holes, num_holes ),
          round_players ( player_id, added_by, invitation_status, responded_at, selected_tee,
            players ( id, name, handicap, avatar_url ) )
        `)
        .eq('id', roundId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!roundId,
  });
}

export function useRespondToRoundInvitation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ roundId, response }: { roundId: string; response: Extract<InvitationStatus, 'accepted' | 'declined'> }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
      const { error } = await (supabase.from('round_players') as any)
        .update({ invitation_status: response, responded_at: new Date().toISOString() })
        .eq('round_id', roundId)
        .eq('player_id', user?.id);
      if (error) throw error;
    },
    onSuccess: (_, { roundId }) => {
      queryClient.invalidateQueries({ queryKey: scheduledRoundKeys.detail(roundId) });
      queryClient.invalidateQueries({ queryKey: scheduledRoundKeys.all });
    },
  });
}

export function useInviteToScheduledRound() { /* INSERT round_players rows with invitation_status 'pending', added_by = me; invalidate detail */ }
export function useUpdateScheduledRound() { /* UPDATE rounds date/tee_time; invalidate detail + all; re-notify is v2 */ }
export function useCancelScheduledRound() { /* DELETE rounds row (cancel trigger notifies invitees); invalidate all + the RoundListScreen rounds key */ }
```

Implement the three sketched mutations fully, following the exact shape of `useRespondToRoundInvitation` (mutationFn + targeted invalidation). Adjust the `select` relation names to the actual FK names (run one query against staging or check an existing round query in `src/hooks` for the `courses`/`players` join syntax used elsewhere — copy it).

- [ ] **Step 2: Verify + commit**

Run: `pnpm type-check`

```bash
git add src/hooks/rounds/scheduledRounds.ts
git commit -m "feat(rounds): scheduled round queries and invitation mutations"
```

---

### Task 15: ScheduledRoundScreen + navigation + start-day flow

**Files:**
- Create: `src/screens/rounds/ScheduledRoundScreen/index.tsx`
- Create: `src/screens/rounds/ScheduledRoundScreen/hooks/useStartScheduledRound.ts`
- Modify: `src/navigation/types.ts`, the root navigator (find where `Scorecard`/`MatchPlayScoring` screens are registered: `grep -rn "MatchPlayScoring" src/navigation`)

- [ ] **Step 1: Route registration**

`src/navigation/types.ts` — add to `RootStackParamList`:

```typescript
  ScheduledRound: { roundId: string };
```

Register the screen in the same navigator/section as `Scorecard`, with `presentation` matching sibling detail screens (plain push, not modal — it's a detail view). If it IS presented as a modal anywhere, wrap the screen root in `<SystemModalTheme>` per CLAUDE.md.

- [ ] **Step 2: The screen**

Build `ScheduledRoundScreen` with these sections (use `useScheduledRound`, `summarizeInvitations`, `startBlockReason`; standard loading/error states; `useThemeColors` + static tokens):

1. **Header card**: course name, formatted date (DD/MM/YYYY) + tee time, format chip (`ROUND_PRESETS[presetIdForGameType(round.game_type)].shortTitle` — or store/infer better if `team_format` set), nine type.
2. **Players list**: each `round_players` row → name, handicap, status pill (`pending` = warning tone, `accepted` = success, `declined` = error/strikethrough).
3. **Invitee actions** (my row is `pending`): Accept / Decline buttons → `useRespondToRoundInvitation`.
4. **Organizer actions** (round.user_id === me, status `upcoming`): Edit date/time (reuse the WhenStep picker inside a `<SystemModalTheme>`-wrapped modal → `useUpdateScheduledRound`), Invite more friends (reuse `FriendSelectorBottomSheet` from the wizard steps → `useInviteToScheduledRound`), Cancel round (confirm dialog → `useCancelScheduledRound` → `navigation.goBack()`).
5. **Start Round** (any player whose row is `accepted`; visible when round date ≤ today, enabled-with-warning otherwise is fine — keep it simple: always visible for accepted players, since groups sometimes tee off early):
   - If `startBlockReason(presetId, rows)` is non-null → show the reason, button disabled.
   - If any rows are `pending` → open a keep-or-drop sheet: each pending player with a Keep/Remove toggle (default Keep). Re-run `startBlockReason` against the kept set before confirming.
   - Confirm → `useStartScheduledRound`.

- [ ] **Step 3: useStartScheduledRound**

```typescript
// src/screens/rounds/ScheduledRoundScreen/hooks/useStartScheduledRound.ts
/**
 * Transitions a scheduled round to in-progress and opens scoring.
 * Mirrors useStartNewRound but UPDATEs the existing round instead of
 * inserting one. Side-game setup (skins/wolf/scoring pairs) is collected
 * by the caller via ScoringSetupStep before this runs.
 */
```

Implementation (each step exists already — compose, don't rewrite):
1. Resolve kept players: UPDATE kept pending rows → `accepted`; DELETE dropped rows.
2. UPDATE the round: `status: 'in-progress'` (keep the scheduled `date` — it IS the play date).
3. `fetchRoundHoles(courseId, false, round.nine_type)` (Task 11).
4. `createRoundSideGames(...)` with whatever the caller's ScoringSetup state holds (Task 11).
5. Build `players: Player[]` from the kept `round_players` rows (same mapping as `useStartNewRound.ts:232-270`, sourcing name/handicap from the joined `players` profile).
6. `buildPlayerTeeMap`, `initializeRound(...)`, `navigateToScoring(...)` (Task 11).

For the pre-start scoring setup: render the existing `ScoringSetupStep` component inside the screen (it takes plain props — manage `scoringPairsEnabled/skins/wolf/teams` with local `useState`, defaulting like `initialData` in `useCreateRoundWizard.ts:140`). Solo scheduled rounds (no partners) skip this and start directly. `onStartScoring` → keep-or-drop already resolved → `useStartScheduledRound`.

- [ ] **Step 4: Verify + commit**

Run: `pnpm type-check && pnpm lint && pnpm test src/screens/rounds`
Manual (two staging accounts): friend accepts from the screen; organizer starts on the day with one pending invitee → keep/drop sheet → scorecard opens with the kept group; scoring works for the whole group from the starter's device.

```bash
git add src/screens/rounds/ScheduledRoundScreen src/navigation
git commit -m "feat(rounds): scheduled round detail screen with start-day flow"
```

---

### Task 16: Upcoming list + invited-rounds visibility + deep link

**Files:**
- Modify: `src/screens/rounds/RoundListScreen/index.tsx`
- Modify: the rounds list query hook (find it: `grep -rn "status.*upcoming\|'upcoming'" src/screens/rounds/RoundListScreen src/hooks --include="*.ts*" -l`)
- Modify: the notification deep-link router (find it: `grep -rn "social_round_invitation" src --include="*.ts*"`)

- [ ] **Step 1: Upcoming rows navigate to the detail screen**

In `RoundListScreen/index.tsx`, the Upcoming Rounds section (filter at ~line 91-94): row `onPress` → `navigation.navigate('ScheduledRound', { roundId: round.id })`.

- [ ] **Step 2: Invited rounds appear in my list**

The standalone rounds list query filters by `user_id = me`. Extend it so rounds where I have a non-declined `round_players` row also appear. Supabase JS can't subquery in one builder call — use the inner-join filter form:

```typescript
// rounds I'm invited to (incl. my own — round_players has my row either way)
supabase
  .from('rounds')
  .select('*, courses(name), round_players!inner(player_id, invitation_status)')
  .eq('round_players.player_id', userId)
  .neq('round_players.invitation_status', 'declined')
```

…or two queries merged + deduped by id if the existing hook's shape makes the join awkward. Keep the existing sort/sections. Verify RLS lets invitees SELECT these rounds (Task 8 Step 2 addressed it).

- [ ] **Step 3: Deep link**

In the notification router, add/extend the case for `social_round_invitation` (and add `social_round_response`) to `navigation.navigate('ScheduledRound', { roundId: data.round_id })`. The trigger's `data` payload contains `round_id` — confirm the key name in `notify_round_player_invited()` (`20260118000100_...sql:53` area).

- [ ] **Step 4: Verify + commit**

Manual: invitee's Rounds tab shows the round under Upcoming; tapping the push opens the detail screen; declining removes it from their list (after refetch).

```bash
git add src/screens/rounds src/hooks
git commit -m "feat(rounds): invited rounds in upcoming list + invitation deep links"
```

---

### Task 17: Part B wrap-up

- [ ] **Step 1: Full verification**

Run: `pnpm type-check && pnpm lint && pnpm test`
Expected: all green.

- [ ] **Step 2: End-to-end manual pass** (two staging accounts)

1. Schedule a 4-player Team Match Play round 2 days out, inviting 3 friends → all get pushes.
2. One accepts, one declines (organizer gets the decline notification + sees the below-minimum state), organizer invites a replacement.
3. On the day, the accepted FRIEND (not the organizer) starts the round → keep/drop for the still-pending player → scoring setup → team match play scoring screen.
4. Cancel flow: schedule another round, cancel it → invitees notified, round gone from their lists.
5. Offline: with the scheduled round already loaded, start it in airplane mode → scoring works; sync on reconnect.
6. Play-now regression: full play-now wizard run, including skins.

- [ ] **Step 3: Request code review** (superpowers:requesting-code-review), then follow superpowers:finishing-a-development-branch.
