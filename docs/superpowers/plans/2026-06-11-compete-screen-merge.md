# Compete Screen Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the Competitions and Leagues list screens into one `CompeteScreen` with a Comps/Leagues toggle, move Activity into the freed bottom-tab slot (center), and rework JoinLeagueScreen with Public/Private modes.

**Architecture:** A new `src/screens/compete/` module owns the merged screen: a `SegmentedButton` toggle switches between `CompsContent` (create buttons + Active/Upcoming/Completed sections) and `LeaguesContent` (Create + Join buttons + my-leagues list). Grouping logic is a pure tested function. Navigation swaps `CompetitionsTab`/`LeaguesTab` for `CompeteTab` + `ActivityTab`. JoinLeagueScreen gains a Public (search → LeagueDetail) / Private (invite code) toggle.

**Tech Stack:** React Native (Expo SDK 54), TypeScript, React Navigation bottom tabs, TanStack Query, existing common components (`SegmentedButton`, `SectionHeader`, `SearchBar`, `FeatureButton`, `LimitIndicator`, `EmptyState`).

**Spec:** `docs/superpowers/specs/2026-06-11-compete-screen-merge-design.md`

**Verification commands** (used throughout):
- Tests: `pnpm test -- <path>` (jest)
- Types: `pnpm type-check`
- Lint: `pnpm lint`

---

### Task 1: Competition grouping utility (pure logic, TDD)

Pure function that merges my + joined competitions, dedupes, excludes cancelled, and groups into active/upcoming/completed with correct sort order.

**Files:**
- Create: `src/screens/compete/utils/groupCompetitions.ts`
- Test: `src/screens/compete/utils/__tests__/groupCompetitions.test.ts`

**Grouping rules** (from spec):
- **Completed:** `status === 'completed'`.
- **Cancelled:** excluded entirely (matches current behaviour where cancelled never shows).
- **Active:** status is `active`/`in_progress`/`in-progress`, OR has a `startDate` that is now-or-past.
- **Upcoming:** everything else (future `startDate`, or drafts with no `startDate`).
- **Dedupe:** same competition can appear in both lists in edge cases; keep the `isOrganizer: true` copy.
- **Sort:** Active and Upcoming by earliest `startDate` first (null dates last); Completed by most recent `startDate` first.

- [ ] **Step 1: Write the failing test**

```typescript
// src/screens/compete/utils/__tests__/groupCompetitions.test.ts
import { groupCompetitions, type CompetitionItem } from '../groupCompetitions';

const NOW = new Date('2026-06-11T10:00:00Z');

function comp(overrides: Partial<CompetitionItem>): CompetitionItem {
  return {
    id: 'c1',
    name: 'Test Comp',
    status: 'active',
    rounds: 1,
    players: 4,
    isOrganizer: true,
    startDate: null,
    ...overrides,
  };
}

describe('groupCompetitions', () => {
  it('puts in-progress statuses in active regardless of date', () => {
    const result = groupCompetitions(
      [comp({ id: 'a', status: 'in_progress', startDate: '2026-07-01' })],
      [],
      NOW
    );
    expect(result.active.map((c) => c.id)).toEqual(['a']);
    expect(result.upcoming).toEqual([]);
  });

  it('puts past/today start dates in active and future dates in upcoming', () => {
    const result = groupCompetitions(
      [
        comp({ id: 'past', status: 'upcoming', startDate: '2026-06-01' }),
        comp({ id: 'today', status: 'upcoming', startDate: '2026-06-11' }),
        comp({ id: 'future', status: 'upcoming', startDate: '2026-06-20' }),
      ],
      [],
      NOW
    );
    expect(result.active.map((c) => c.id)).toEqual(['past', 'today']);
    expect(result.upcoming.map((c) => c.id)).toEqual(['future']);
  });

  it('puts drafts without a start date in upcoming', () => {
    const result = groupCompetitions(
      [comp({ id: 'd', status: 'draft', startDate: null })],
      [],
      NOW
    );
    expect(result.upcoming.map((c) => c.id)).toEqual(['d']);
  });

  it('groups completed and excludes cancelled', () => {
    const result = groupCompetitions(
      [
        comp({ id: 'done', status: 'completed', startDate: '2026-05-01' }),
        comp({ id: 'gone', status: 'cancelled', startDate: '2026-05-01' }),
      ],
      [],
      NOW
    );
    expect(result.completed.map((c) => c.id)).toEqual(['done']);
    expect(result.active).toEqual([]);
    expect(result.upcoming).toEqual([]);
  });

  it('merges my and joined lists, preferring the organizer copy on duplicate ids', () => {
    const result = groupCompetitions(
      [comp({ id: 'dup', isOrganizer: true })],
      [comp({ id: 'dup', isOrganizer: false }), comp({ id: 'j1', isOrganizer: false })],
      NOW
    );
    const dup = result.active.find((c) => c.id === 'dup');
    expect(dup?.isOrganizer).toBe(true);
    expect(result.active).toHaveLength(2);
  });

  it('sorts active/upcoming earliest-first (null dates last) and completed most-recent-first', () => {
    const result = groupCompetitions(
      [
        comp({ id: 'u2', status: 'upcoming', startDate: '2026-08-01' }),
        comp({ id: 'u1', status: 'upcoming', startDate: '2026-07-01' }),
        comp({ id: 'u3', status: 'draft', startDate: null }),
        comp({ id: 'done1', status: 'completed', startDate: '2026-01-01' }),
        comp({ id: 'done2', status: 'completed', startDate: '2026-03-01' }),
      ],
      [],
      NOW
    );
    expect(result.upcoming.map((c) => c.id)).toEqual(['u1', 'u2', 'u3']);
    expect(result.completed.map((c) => c.id)).toEqual(['done2', 'done1']);
  });

  it('handles undefined inputs', () => {
    const result = groupCompetitions(undefined, undefined, NOW);
    expect(result).toEqual({ active: [], upcoming: [], completed: [] });
  });
});
```

Note: `CompetitionItem` is defined in `groupCompetitions.ts` (Step 3) so Task 1 is independently runnable; Task 2's hook re-exports it for consumers.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/screens/compete/utils/__tests__/groupCompetitions.test.ts`
Expected: FAIL — cannot find module `../groupCompetitions`.

- [ ] **Step 3: Implement groupCompetitions**

```typescript
// src/screens/compete/utils/groupCompetitions.ts
import type { CompetitionWinnerInfo } from '@/components/competitions/CompetitionListCard';

export interface CompetitionItem {
  id: string;
  name: string;
  status: string;
  rounds: number;
  players: number;
  isOrganizer: boolean;
  startDate: string | null;
  /** Whether this competition is grandfathered (over tier limit) */
  isLegacy?: boolean;
  /** Winner information (only for completed competitions) */
  winner?: CompetitionWinnerInfo;
}

export interface CompetitionGroups {
  active: CompetitionItem[];
  upcoming: CompetitionItem[];
  completed: CompetitionItem[];
}

const STARTED_STATUSES = new Set(['active', 'in_progress', 'in-progress']);

function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function byStartDateAsc(a: CompetitionItem, b: CompetitionItem): number {
  if (!a.startDate && !b.startDate) return 0;
  if (!a.startDate) return 1;
  if (!b.startDate) return -1;
  return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
}

function byStartDateDesc(a: CompetitionItem, b: CompetitionItem): number {
  const timeA = a.startDate ? new Date(a.startDate).getTime() : 0;
  const timeB = b.startDate ? new Date(b.startDate).getTime() : 0;
  return timeB - timeA;
}

/**
 * Merge my + joined competitions and group into active/upcoming/completed.
 *
 * - Duplicate ids keep the organizer copy.
 * - Cancelled competitions are excluded.
 * - Active = started status, or start date today-or-earlier.
 * - Upcoming = everything else (future or missing start date).
 */
export function groupCompetitions(
  myCompetitions: CompetitionItem[] | undefined,
  joinedCompetitions: CompetitionItem[] | undefined,
  now: Date = new Date()
): CompetitionGroups {
  const byId = new Map<string, CompetitionItem>();
  for (const comp of joinedCompetitions ?? []) {
    byId.set(comp.id, comp);
  }
  for (const comp of myCompetitions ?? []) {
    byId.set(comp.id, comp); // organizer copy wins
  }

  const active: CompetitionItem[] = [];
  const upcoming: CompetitionItem[] = [];
  const completed: CompetitionItem[] = [];
  const todayStart = startOfDay(now);

  for (const comp of byId.values()) {
    const status = comp.status?.toLowerCase() ?? 'draft';
    if (status === 'cancelled') continue;
    if (status === 'completed') {
      completed.push(comp);
      continue;
    }
    const hasStarted =
      STARTED_STATUSES.has(status) ||
      (comp.startDate !== null && startOfDay(new Date(comp.startDate)) <= todayStart);
    if (hasStarted) {
      active.push(comp);
    } else {
      upcoming.push(comp);
    }
  }

  active.sort(byStartDateAsc);
  upcoming.sort(byStartDateAsc);
  completed.sort(byStartDateDesc);

  return { active, upcoming, completed };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/screens/compete/utils/__tests__/groupCompetitions.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/screens/compete/utils
git commit -m "feat(compete): add competition grouping utility for sectioned list"
```

---

### Task 2: useCompetitionGroups hook

New hook for the Compete screen's Comps mode. It reuses the two queries from the old `useCompetitionsList` but replaces tab/filter state with the grouped sections. The old hook stays untouched until Task 8 cleanup (so the app keeps compiling between tasks).

**Files:**
- Create: `src/screens/compete/hooks/useCompetitionGroups.ts`
- Create: `src/screens/compete/hooks/index.ts`

No new unit test for the hook itself — the queries are copied verbatim from the existing, already-exercised `useCompetitionsList`, and the new logic (grouping) is covered by Task 1. Screen-level behaviour is tested in Task 5.

- [ ] **Step 1: Create the hook**

Copy `src/screens/competitions/hooks/useCompetitionsList.ts` to `src/screens/compete/hooks/useCompetitionGroups.ts`, then apply these changes (the queries, legacy-ids effect, delete handlers, and subscription-limit code are kept verbatim):

1. Rename the exported function and remove tab/filter machinery. Delete: `TabValue`, `StatusFilter` types; `activeTab`/`setActiveTab`/`statusFilter`/`setStatusFilter` state; `filterByStatus`; `sortCompetitions`; the `hasInitializedTab` effect; `getEmptyStateContent`.
2. Move the `CompetitionItem` interface out: import it from the Task 1 utility instead, and re-export it.
3. Replace `currentCompetitions` with grouped sections.
4. `isLoading`/`isRefetching`/`handleRefresh` cover both queries.

The resulting file (showing the changed parts in full; `/* …queries unchanged… */` marks the verbatim-copied blocks):

```typescript
// src/screens/compete/hooks/useCompetitionGroups.ts
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { getCompetitionsOverLimit } from '@/services/subscription/grandfathering';
import { isUnlimited, isNoLimit } from '@/types/subscription.types';
import { fetchCompetitionWinner } from '@/services/competitions/winnerService';
import { useToast } from '@/context/ToastContext';
import {
  groupCompetitions,
  type CompetitionItem,
} from '../utils/groupCompetitions';

export type { CompetitionItem };

// CompetitionRow and JoinedCompetitionRow interfaces: copy verbatim from
// src/screens/competitions/hooks/useCompetitionsList.ts (lines 30-50).

export function useCompetitionGroups() {
  const { user } = useAuth();
  const { limits, checkCanCreateCompetition, isSuperAdmin } =
    useSubscriptionContext();

  const [legacyCompetitionIds, setLegacyCompetitionIds] = useState<Set<string>>(
    new Set()
  );

  const { showToast } = useToast();

  // Delete state — copy verbatim (deleteDialogVisible, competitionToDelete, isDeleting).

  // 'myCompetitions' query — copy verbatim from useCompetitionsList (lines 72-132).
  // 'joinedCompetitions' query — copy verbatim from useCompetitionsList (lines 134-206).
  // Legacy-ids effect — copy verbatim (lines 255-277).
  // Subscription limit values — copy verbatim (lines 228-241):
  //   myCompetitionCount, maxCompetitions, hasUnlimitedCompetitions, canCreateCompetition.
  // Delete handlers — copy verbatim (lines 357-411):
  //   handleDeleteCompetition, handleConfirmDelete, handleCancelDelete.

  // Grouped sections with legacy flag applied to organizer comps
  const groups = useMemo(() => {
    const flaggedMy =
      legacyCompetitionIds.size > 0
        ? myCompetitions?.map((comp) => ({
            ...comp,
            isLegacy: legacyCompetitionIds.has(comp.id),
          }))
        : myCompetitions;
    return groupCompetitions(flaggedMy, joinedCompetitions);
  }, [myCompetitions, joinedCompetitions, legacyCompetitionIds]);

  const isLoading = isLoadingMy || isLoadingJoined;
  const isRefetching = isRefetchingMy || isRefetchingJoined;

  const handleRefresh = useCallback(() => {
    refetchMy();
    refetchJoined();
  }, [refetchMy, refetchJoined]);

  const hasAnyCompetitions =
    groups.active.length > 0 ||
    groups.upcoming.length > 0 ||
    groups.completed.length > 0;

  return {
    // Sections
    activeComps: groups.active,
    upcomingComps: groups.upcoming,
    completedComps: groups.completed,
    hasAnyCompetitions,

    // Loading states
    isLoading,
    isRefetching,

    // Subscription info
    myCompetitionCount,
    maxCompetitions,
    hasUnlimitedCompetitions,
    canCreateCompetition,

    // Handlers
    handleRefresh,
    handleDeleteCompetition,
    handleConfirmDelete,
    handleCancelDelete,

    // Delete dialog state
    deleteDialogVisible,
    competitionToDelete,
    isDeleting,
  };
}
```

Implementation note: "copy verbatim" blocks must be copied from the source file, not retyped. The `handleConfirmDelete` copy keeps its `refetchMy()` calls.

- [ ] **Step 2: Create the barrel export**

```typescript
// src/screens/compete/hooks/index.ts
export { useCompetitionGroups } from './useCompetitionGroups';
export type { CompetitionItem } from './useCompetitionGroups';
```

- [ ] **Step 3: Verify types compile**

Run: `pnpm type-check`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/screens/compete/hooks
git commit -m "feat(compete): add useCompetitionGroups hook with sectioned data"
```

---

### Task 3: CompsContent component

The Comps mode body: create buttons, limit indicator, and the three sections. Rendered inside CompeteScreen's ScrollView (Task 5), so this component renders plain Views, not its own scroll container.

**Files:**
- Create: `src/screens/compete/components/CompsContent.tsx`
- Create: `src/screens/compete/components/index.ts`

- [ ] **Step 1: Create CompsContent**

```typescript
// src/screens/compete/components/CompsContent.tsx
import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { IconPlus, IconSparkles } from '@tabler/icons-react-native';
import {
  FeatureButton,
  ConfirmationDialog,
  SectionHeader,
  EmptyState,
  Badge,
  LoadingSpinner,
} from '@/components/common';
import { FeatureLockCompact, LimitIndicator } from '@/components/subscription';
import { CompetitionListCard } from '@/components/competitions';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';
import { useCompetitionGroups } from '../hooks';
import type { CompetitionItem } from '../hooks';

function CompetitionSection({
  title,
  competitions,
  onPress,
  onDelete,
  rightContent,
}: {
  title: string;
  competitions: CompetitionItem[];
  onPress: (competition: CompetitionItem) => void;
  onDelete: (competition: CompetitionItem) => void;
  rightContent?: React.ReactNode;
}) {
  if (competitions.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title={title} rightContent={rightContent} />
      <View style={styles.sectionList}>
        {competitions.map((competition) => (
          <View key={competition.id} style={styles.cardWrapper}>
            {competition.isLegacy && (
              <Badge
                label="Legacy"
                variant="warning"
                icon="history"
                size="sm"
                accessibilityLabel="Legacy competition - grandfathered from previous subscription"
                style={styles.legacyBadge}
              />
            )}
            <CompetitionListCard
              competition={competition}
              onPress={onPress}
              onDelete={onDelete}
              swipeEnabled={competition.isOrganizer}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

export function CompsContent() {
  const colors = useThemeColors();
  const navigation = useNavigation();

  const {
    activeComps,
    upcomingComps,
    completedComps,
    hasAnyCompetitions,
    isLoading,
    myCompetitionCount,
    maxCompetitions,
    hasUnlimitedCompetitions,
    canCreateCompetition,
    handleDeleteCompetition,
    handleConfirmDelete,
    handleCancelDelete,
    deleteDialogVisible,
    competitionToDelete,
    isDeleting,
  } = useCompetitionGroups();

  const handleCreateCompetition = useCallback(() => {
    navigation.navigate('CreateCompetition');
  }, [navigation]);

  const handleCreateWithAI = useCallback(() => {
    navigation.navigate('AICompetition');
  }, [navigation]);

  const handleUpgrade = useCallback(() => {
    navigation.navigate('Subscription');
  }, [navigation]);

  const handleViewCompetition = useCallback(
    (competition: CompetitionItem) => {
      navigation.navigate('CompetitionDetail', { id: competition.id });
    },
    [navigation]
  );

  return (
    <View>
      {/* Create buttons */}
      <View style={styles.createButtonsContainer}>
        <View style={styles.featureButtonWrapper}>
          <FeatureButton
            title="Create"
            subtitle="Step-by-step wizard"
            icon={<IconPlus size={20} color={colors.white} strokeWidth={2.5} />}
            onPress={canCreateCompetition ? handleCreateCompetition : handleUpgrade}
            backgroundColor={colors.primary}
            disabled={false}
            accessibilityLabel="Create new competition"
            variant="compact"
            showChevron={false}
          />
        </View>
        <View style={styles.featureButtonWrapper}>
          <FeatureLockCompact
            feature="ai_competition"
            onUpgradePress={handleUpgrade}
          >
            <FeatureButton
              title="AI Create"
              subtitle="Describe in English"
              icon={<IconSparkles size={20} color={colors.white} strokeWidth={2.5} />}
              onPress={canCreateCompetition ? handleCreateWithAI : handleUpgrade}
              backgroundColor={colors.accent}
              disabled={false}
              accessibilityLabel="Create competition with AI"
              variant="compact"
              showChevron={false}
            />
          </FeatureLockCompact>
        </View>
      </View>

      {/* Limit indicator */}
      {!hasUnlimitedCompetitions && (
        <View style={styles.limitRow}>
          <LimitIndicator
            current={myCompetitionCount}
            max={maxCompetitions}
            label="Comps"
            showBar={false}
            testID="comps-limit-indicator"
          />
        </View>
      )}

      {/* Sections */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="lg" message="Loading competitions..." />
        </View>
      ) : !hasAnyCompetitions ? (
        <EmptyState
          icon="trophy-outline"
          title="No Competitions Yet"
          message="Create your first competition to get started, or join one with an invite link."
          actionLabel="Create Competition"
          onAction={handleCreateCompetition}
        />
      ) : (
        <View style={styles.sections}>
          <CompetitionSection
            title="Active"
            competitions={activeComps}
            onPress={handleViewCompetition}
            onDelete={handleDeleteCompetition}
          />
          <CompetitionSection
            title="Upcoming"
            competitions={upcomingComps}
            onPress={handleViewCompetition}
            onDelete={handleDeleteCompetition}
          />
          <CompetitionSection
            title="Completed"
            competitions={completedComps}
            onPress={handleViewCompetition}
            onDelete={handleDeleteCompetition}
          />
        </View>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        visible={deleteDialogVisible}
        title="Delete Competition"
        message={`Are you sure you want to delete "${competitionToDelete?.name ?? 'this competition'}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        loading={isDeleting}
        icon="delete"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  createButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  featureButtonWrapper: {
    flex: 1,
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  loadingContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  sections: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionList: {
    gap: spacing.md,
  },
  cardWrapper: {
    position: 'relative',
  },
  legacyBadge: {
    marginBottom: spacing.xs,
  },
});
```

Adjustments to verify during implementation:
- Confirm `@/components/common` exports `SectionHeader`, `EmptyState`, `Badge`, `LoadingSpinner`, `FeatureButton`, `ConfirmationDialog` (they're all used together in the existing screens — check `src/components/common/index.ts`).
- Confirm `@/components/subscription` exports both `FeatureLockCompact` and `LimitIndicator` from its index (LeagueListScreen imports them by direct path; use whichever import style the index supports).
- `navigation.navigate` calls here are untyped (matching `CompetitionsListScreen`'s current pattern of an untyped `useNavigation()`); if lint complains, type as `NativeStackNavigationProp<RootStackParamList>` like LeagueListScreen does.
- The swipe-delete change: the old screen passed `swipeEnabled={activeTab === 'my'}`; with merged lists this becomes per-item `swipeEnabled={competition.isOrganizer}`.

- [ ] **Step 2: Create the components barrel**

```typescript
// src/screens/compete/components/index.ts
export { CompsContent } from './CompsContent';
```

- [ ] **Step 3: Verify types compile**

Run: `pnpm type-check`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/screens/compete/components
git commit -m "feat(compete): add CompsContent with Active/Upcoming/Completed sections"
```

---

### Task 4: LeaguesContent component

The Leagues mode body: Create + Join buttons side by side, league limit indicator, my-leagues list with swipe delete. Public browse is gone (moves to JoinLeagueScreen in Task 7).

**Files:**
- Create: `src/screens/compete/components/LeaguesContent.tsx`
- Modify: `src/screens/compete/components/index.ts`

- [ ] **Step 1: Create LeaguesContent**

```typescript
// src/screens/compete/components/LeaguesContent.tsx
import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { IconPlus, IconUsersPlus } from '@tabler/icons-react-native';
import { FeatureButton, ConfirmationDialog } from '@/components/common';
import { EmptyState } from '@/components/common/EmptyState';
import { FeatureLockCompact } from '@/components/subscription/FeatureLockCompact';
import { LimitIndicator } from '@/components/subscription/LimitIndicator';
import { LeagueCard } from '@/components/leagues';
import { useThemeColors } from '@/context/ThemeContext';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { useLeagues, useDeleteLeague } from '@/hooks/useLeagues';
import { isUnlimited, isNoLimit } from '@/types/subscription.types';
import { spacing } from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/types';
import type { League } from '@/types/database';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function LeaguesContent() {
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const { data: leagues, isLoading } = useLeagues();
  const deleteLeague = useDeleteLeague();
  const [leagueToDelete, setLeagueToDelete] = useState<League | null>(null);

  const { limits } = useSubscriptionContext();
  const maxLeagues = limits?.maxLeaguesOwned ?? 1;
  const hasUnlimitedLeagues = isUnlimited(maxLeagues) || isNoLimit(maxLeagues);
  const leagueCount = leagues?.length ?? 0;

  const handleCreateLeague = useCallback(() => {
    navigation.navigate('CreateLeague');
  }, [navigation]);

  const handleJoinLeague = useCallback(() => {
    navigation.navigate('JoinLeague');
  }, [navigation]);

  const handleUpgrade = useCallback(() => {
    navigation.navigate('Subscription');
  }, [navigation]);

  const handleLeaguePress = useCallback(
    (league: League) => {
      navigation.navigate('LeagueDetail', { id: league.id });
    },
    [navigation]
  );

  const handleConfirmDelete = useCallback(() => {
    if (leagueToDelete) {
      deleteLeague.mutate(leagueToDelete.id);
      setLeagueToDelete(null);
    }
  }, [leagueToDelete, deleteLeague]);

  return (
    <View>
      {/* Create + Join buttons */}
      <View style={styles.buttonsContainer}>
        <View style={styles.featureButtonWrapper}>
          <FeatureLockCompact
            feature="create_league"
            context={{ currentCount: leagueCount }}
            onUpgradePress={handleUpgrade}
          >
            <FeatureButton
              title="Create"
              subtitle="Start a league"
              icon={<IconPlus size={20} color={colors.white} strokeWidth={2.5} />}
              onPress={handleCreateLeague}
              backgroundColor={colors.primary}
              accessibilityLabel="Create new league"
              variant="compact"
              showChevron={false}
            />
          </FeatureLockCompact>
        </View>
        <View style={styles.featureButtonWrapper}>
          <FeatureLockCompact
            feature="join_league"
            onUpgradePress={handleUpgrade}
          >
            <FeatureButton
              title="Join"
              subtitle="Public or invite code"
              icon={<IconUsersPlus size={20} color={colors.white} strokeWidth={2.5} />}
              onPress={handleJoinLeague}
              backgroundColor={colors.accent}
              accessibilityLabel="Join a league"
              variant="compact"
              showChevron={false}
            />
          </FeatureLockCompact>
        </View>
      </View>

      {/* Limit indicator */}
      {!hasUnlimitedLeagues && (
        <View style={styles.limitRow}>
          <LimitIndicator
            current={leagueCount}
            max={maxLeagues}
            label="Leagues"
            showBar={false}
            testID="leagues-limit-indicator"
          />
        </View>
      )}

      {/* My leagues list */}
      {!isLoading && (!leagues || leagues.length === 0) ? (
        <EmptyState
          icon="trophy-outline"
          title="No Leagues Yet"
          message="Create a league to compete with friends across any course, or join one."
        />
      ) : (
        <View style={styles.list}>
          {(leagues ?? []).map((league) => (
            <LeagueCard
              key={league.id}
              league={league}
              onPress={() => handleLeaguePress(league)}
              onDelete={setLeagueToDelete}
              swipeEnabled
            />
          ))}
        </View>
      )}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        visible={!!leagueToDelete}
        title="Delete League"
        message={`Are you sure you want to delete "${leagueToDelete?.name}"? This will remove all rounds and player data. This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleConfirmDelete}
        onCancel={() => setLeagueToDelete(null)}
        loading={deleteLeague.isPending}
        icon="delete-outline"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  buttonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  featureButtonWrapper: {
    flex: 1,
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
});
```

Adjustments to verify during implementation:
- `IconUsersPlus` — confirm it exists in `@tabler/icons-react-native` (fallback: `IconUserPlus` or `IconLogin2`).
- The old `LeagueListScreen` passed `onDelete={handleDeleteLeague}` where `handleDeleteLeague = (league) => setLeagueToDelete(league)`; `onDelete={setLeagueToDelete}` is equivalent — keep whichever satisfies `LeagueCard`'s prop type.
- Refresh: pull-to-refresh is owned by CompeteScreen's ScrollView (Task 5), so this component doesn't render a RefreshControl.

- [ ] **Step 2: Update the components barrel**

```typescript
// src/screens/compete/components/index.ts
export { CompsContent } from './CompsContent';
export { LeaguesContent } from './LeaguesContent';
```

- [ ] **Step 3: Verify types compile**

Run: `pnpm type-check`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/screens/compete/components
git commit -m "feat(compete): add LeaguesContent with create/join buttons and my leagues"
```

---

### Task 5: CompeteScreen with toggle (component test first)

The merged screen: PageHeader, Comps/Leagues SegmentedButton, mode content in a ScrollView with pull-to-refresh, per-mode welcome modals.

**Files:**
- Create: `src/screens/compete/CompeteScreen.tsx`
- Create: `src/screens/compete/index.ts`
- Test: `src/screens/compete/__tests__/CompeteScreen.test.tsx`

- [ ] **Step 1: Write the failing component test**

Mirror the mocking style of existing screen tests (check `src/screens/leagues/` or `src/screens/rounds/` `__tests__` folders for the established render helper/provider wrapper and copy that setup). The test mocks the two content components to isolate toggle behaviour:

```typescript
// src/screens/compete/__tests__/CompeteScreen.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import CompeteScreen from '../CompeteScreen';

jest.mock('../components', () => ({
  CompsContent: () => {
    const { Text } = require('react-native');
    return <Text>COMPS_CONTENT</Text>;
  },
  LeaguesContent: () => {
    const { Text } = require('react-native');
    return <Text>LEAGUES_CONTENT</Text>;
  },
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('@/hooks/useScreenWelcome', () => ({
  useScreenWelcome: () => ({
    isModalVisible: false,
    dismissModal: jest.fn(),
    showModal: jest.fn(),
    isFirstVisit: false,
    content: { title: 'x', sections: [] },
  }),
}));

describe('CompeteScreen', () => {
  it('shows Comps content by default', () => {
    const { getByText, queryByText } = render(<CompeteScreen />);
    expect(getByText('COMPS_CONTENT')).toBeTruthy();
    expect(queryByText('LEAGUES_CONTENT')).toBeNull();
  });

  it('switches to Leagues content when the Leagues segment is pressed', () => {
    const { getByText, queryByText } = render(<CompeteScreen />);
    fireEvent.press(getByText('Leagues'));
    expect(getByText('LEAGUES_CONTENT')).toBeTruthy();
    expect(queryByText('COMPS_CONTENT')).toBeNull();
  });

  it('switches back to Comps content', () => {
    const { getByText } = render(<CompeteScreen />);
    fireEvent.press(getByText('Leagues'));
    fireEvent.press(getByText('Comps'));
    expect(getByText('COMPS_CONTENT')).toBeTruthy();
  });
});
```

Note: if the project's existing screen tests use a shared `renderWithProviders` helper (theme/query providers), use it instead of bare `render` — `useThemeColors` requires the ThemeProvider unless the project's jest setup already mocks it. Check `jest.setup.js`/`jest.setup.ts` and copy the pattern from a neighbouring screen test (e.g. the rounds or leagues tests found in Task 8's grep).

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/screens/compete/__tests__/CompeteScreen.test.tsx`
Expected: FAIL — cannot find module `../CompeteScreen`.

- [ ] **Step 3: Create CompeteScreen**

```typescript
// src/screens/compete/CompeteScreen.tsx
/**
 * CompeteScreen - merged Competitions + Leagues screen
 *
 * A Comps/Leagues toggle switches between:
 * - Comps: create buttons + Active/Upcoming/Completed sections
 * - Leagues: create/join buttons + my leagues list
 */

import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Icon } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/common/PageHeader';
import { SegmentedButton } from '@/components/common/SegmentedButton';
import { ScreenWelcomeModal } from '@/components/common/ScreenWelcomeModal';
import { useThemeColors } from '@/context/ThemeContext';
import { useScreenWelcome } from '@/hooks/useScreenWelcome';
import { spacing, borderRadius } from '@/constants/theme';
import { CompsContent, LeaguesContent } from './components';

type CompeteMode = 'comps' | 'leagues';

export default function CompeteScreen() {
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<CompeteMode>('comps');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Per-mode welcome modals (reuses existing competitions/leagues content)
  const compsWelcome = useScreenWelcome('competitions');
  const leaguesWelcome = useScreenWelcome('leagues');
  const welcome = mode === 'comps' ? compsWelcome : leaguesWelcome;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (mode === 'comps') {
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['myCompetitions'] }),
          queryClient.refetchQueries({ queryKey: ['joinedCompetitions'] }),
        ]);
      } else {
        await queryClient.refetchQueries({ queryKey: ['leagues'] });
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Compete"
        rightContent={
          !welcome.isFirstVisit ? (
            <TouchableOpacity
              style={[styles.infoButton, { backgroundColor: colors.surfaceVariant }]}
              onPress={welcome.showModal}
              accessibilityRole="button"
              accessibilityLabel={mode === 'comps' ? 'Competitions info' : 'Leagues info'}
            >
              <Icon source="information-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <View style={styles.toggleContainer}>
        <SegmentedButton<CompeteMode>
          value={mode}
          onValueChange={setMode}
          buttons={[
            { value: 'comps', label: 'Comps' },
            { value: 'leagues', label: 'Leagues' },
          ]}
        />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.textPrimary}
            colors={[colors.textPrimary]}
          />
        }
      >
        {mode === 'comps' ? <CompsContent /> : <LeaguesContent />}
      </ScrollView>

      <ScreenWelcomeModal
        visible={welcome.isModalVisible}
        content={welcome.content}
        onDismiss={welcome.dismissModal}
        testID="compete-welcome-modal"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toggleContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  infoButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.xxxl,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: spacing.xxxl,
  },
});
```

Adjustments to verify during implementation:
- The leagues refetch key: check `leagueKeys.all` in `src/hooks/leagues/` (likely `['leagues']`) and use `leagueKeys.all` via import rather than a hand-written array if exported.
- Welcome behaviour: `useScreenWelcome` auto-shows on first visit via its own effect. Mounting both hooks at once would auto-show both modals on a fresh install. To keep "leagues welcome shows the first time Leagues mode is opened", gate the leagues hook: only mount it (or only render its modal) when `mode === 'leagues'`. Simplest correct approach — call `useScreenWelcome` for both (hooks must be unconditional), but render only the active mode's `ScreenWelcomeModal` and pass `visible={welcome.isModalVisible && /* hook matches mode */ true}` as in the code above (the single `welcome` alias already does this). The comps modal auto-show fires on mount; the leagues auto-show also fires on mount but stays invisible until the user switches to Leagues — when its `isModalVisible` is already true. Verify this feels right on device; if the leagues modal flashes immediately on switching, change `useScreenWelcome('leagues')` to only auto-show after first switch (e.g. keep a `hasOpenedLeagues` state and pass it down — only adopt if the simple version misbehaves).

- [ ] **Step 4: Create the screen barrel**

```typescript
// src/screens/compete/index.ts
export { default as CompeteScreen } from './CompeteScreen';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test -- src/screens/compete/__tests__/CompeteScreen.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/screens/compete
git commit -m "feat(compete): add CompeteScreen with Comps/Leagues toggle"
```

---

### Task 6: Navigation rewire (tabs, Activity, call sites)

Swap `CompetitionsTab`/`LeaguesTab` for `CompeteTab` + `ActivityTab` (center), retire the `Activity` stack route, and update call sites.

**Files:**
- Modify: `src/navigation/types.ts:255-261` (TabParamList) and remove `Activity: undefined;` at line 172
- Modify: `src/navigation/MainTabNavigator.tsx`
- Modify: `src/components/layout/BottomNavigation.tsx`
- Modify: `src/navigation/RootNavigator.tsx:756-764` (remove Activity registration)
- Modify: `src/screens/activity/ActivityScreen.tsx:59-64` (remove back button)
- Modify: `src/screens/home/components/FriendActivitySection.tsx:115`
- Modify: `src/screens/profile/ProfileScreen.tsx:180`
- Modify: `src/screens/home/components/tiles/CompetitionsTile.tsx:30`
- Test: `src/components/layout/BottomNavigation.test.tsx`, `src/__tests__/navigation/*.test.tsx`

- [ ] **Step 1: Update TabParamList in `src/navigation/types.ts`**

Replace lines 256-262:

```typescript
export type TabParamList = {
  HomeTab: undefined;
  CompeteTab: undefined;
  ActivityTab: undefined;
  CoursesTab: undefined;
  ProfileTab: undefined;
};
```

And remove line 172 (`Activity: undefined;`) from `RootStackParamList`, keeping `RoundActivity` and `RoundPhotos`.

- [ ] **Step 2: Update BottomNavigation tabs and icons**

In `src/components/layout/BottomNavigation.tsx`:

Update the import (line 18):

```typescript
import { IconHome, IconTrophy, IconUser, IconMap, IconActivity } from '@tabler/icons-react-native';
```

(Verify `IconActivity` exists in `@tabler/icons-react-native`; fallbacks: `IconChartLine`, `IconBolt`, `IconUsersGroup`.)

Update the key union (line 27):

```typescript
  key: 'home' | 'compete' | 'activity' | 'courses' | 'profile';
```

Replace `NAVIGATION_TABS` (lines 58-89):

```typescript
const NAVIGATION_TABS: NavigationTab[] = [
  {
    key: 'home',
    label: 'Home',
    route: 'HomeTab',
    accessibilityLabel: 'Navigate to home screen',
  },
  {
    key: 'compete',
    label: 'Compete',
    route: 'CompeteTab',
    accessibilityLabel: 'Navigate to competitions and leagues',
  },
  {
    key: 'activity',
    label: 'Activity',
    route: 'ActivityTab',
    accessibilityLabel: 'Navigate to activity feed',
  },
  {
    key: 'courses',
    label: 'Courses',
    route: 'CoursesTab',
    accessibilityLabel: 'Navigate to courses list',
  },
  {
    key: 'profile',
    label: 'Profile',
    route: 'ProfileTab',
    accessibilityLabel: 'Navigate to your profile',
  },
];
```

Replace the `getTabIcon` switch cases (lines 102-115):

```typescript
  switch (key) {
    case 'home':
      return <IconHome size={iconSize} color={iconColor} />;
    case 'compete':
      return <IconTrophy size={iconSize} color={iconColor} />;
    case 'activity':
      return <IconActivity size={iconSize} color={iconColor} />;
    case 'courses':
      return <IconMap size={iconSize} color={iconColor} />;
    case 'profile':
      return <IconUser size={iconSize} color={iconColor} />;
    default:
      return null;
  }
```

(`IconTournament` import becomes unused — remove it.)

- [ ] **Step 3: Update MainTabNavigator**

In `src/navigation/MainTabNavigator.tsx`, replace the screen imports (lines 13-15):

```typescript
import { CompeteScreen } from '@/screens/compete';
import CourseListScreen from '@/screens/courses/CourseListScreen';
import { ActivityScreen } from '@/screens/activity';
```

(Remove the `CompetitionsListScreen` and `LeagueListScreen` imports.)

Replace `routeToTabKey` (lines 28-34):

```typescript
const routeToTabKey: Record<string, NavigationTab['key']> = {
  HomeTab: 'home',
  CompeteTab: 'compete',
  ActivityTab: 'activity',
  CoursesTab: 'courses',
  ProfileTab: 'profile',
};
```

Replace the `CompetitionsTab` and `LeaguesTab` `Tab.Screen` entries with (tab order: Home, Compete, Activity, Courses, Profile):

```typescript
      <Tab.Screen
        name="CompeteTab"
        component={CompeteScreen}
        options={{
          title: 'Compete',
        }}
      />
      <Tab.Screen
        name="ActivityTab"
        component={ActivityScreen}
        options={{
          title: 'Activity',
        }}
      />
      <Tab.Screen
        name="CoursesTab"
        component={CourseListScreen}
        options={{
          title: 'Courses',
        }}
      />
```

(`HomeTab` stays first, `ProfileTab` stays last; `CoursesTab` moves after `ActivityTab`.)

- [ ] **Step 4: Retire the Activity stack route and back button**

In `src/navigation/RootNavigator.tsx`, delete the `Activity` `Stack.Screen` registration (lines 757-764) and remove `ActivityScreen` from the import at line 93:

```typescript
import { RoundActivityScreen, RoundPhotosScreen } from '@/screens/activity';
```

In `src/screens/activity/ActivityScreen.tsx`, replace the PageHeader (lines 59-64):

```typescript
      <PageHeader variant="centered" title="Activity" />
```

(The `useNavigation` import stays — it's still used for `openRound`.)

- [ ] **Step 5: Update call sites**

`src/screens/home/components/FriendActivitySection.tsx:115`:

```typescript
          onPress={() => navigation.navigate('MainTabs', { screen: 'ActivityTab' })}
```

`src/screens/profile/ProfileScreen.tsx:180`:

```typescript
        <ActivitySection onPress={() => navigation.navigate('MainTabs', { screen: 'ActivityTab' })} />
```

`src/screens/home/components/tiles/CompetitionsTile.tsx:30`:

```typescript
      onPress={() => navigation.navigate('MainTabs', { screen: 'CompeteTab' })}
```

Then sweep for stragglers:

Run: `grep -rn "navigate('Activity')\|'CompetitionsTab'\|'LeaguesTab'" src --include="*.ts" --include="*.tsx" | grep -v test`
Expected: no hits outside this diff.

- [ ] **Step 6: Update navigation tests**

Run: `pnpm test -- src/components/layout/BottomNavigation.test.tsx src/__tests__/navigation`

Fix failures mechanically: replace `CompetitionsTab`/`LeaguesTab` route expectations with `CompeteTab`/`ActivityTab`, tab keys `competitions`/`leagues` with `compete`/`activity`, labels `Comps`/`Leagues` with `Compete`/`Activity`, and expected tab order Home → Compete → Activity → Courses → Profile. In `deepLinking.test.tsx`, update the tab mappings the same way. If `RootNavigator.test.tsx` asserts the `Activity` stack route exists, change it to assert the `ActivityTab` tab instead.

Expected after fixes: all listed test files PASS.

- [ ] **Step 7: Type-check and commit**

Run: `pnpm type-check`
Expected: no errors. (TS will also catch any `navigate('Activity')` call sites missed by the grep, since the route type is gone.)

```bash
git add src/navigation src/components/layout src/screens/activity src/screens/home src/screens/profile src/__tests__
git commit -m "feat(nav): replace Comps/Leagues tabs with Compete tab and centered Activity tab"
```

---

### Task 7: JoinLeagueScreen Public/Private modes (component test first)

Add a Public/Private segmented toggle. Public = search + results list (tap → LeagueDetail). Private = existing invite-code form.

**Files:**
- Modify: `src/screens/leagues/JoinLeagueScreen.tsx`
- Test: `src/screens/leagues/__tests__/JoinLeagueScreen.test.tsx` (create; if a test for this screen already exists elsewhere, extend it instead)

- [ ] **Step 1: Write the failing test**

```typescript
// src/screens/leagues/__tests__/JoinLeagueScreen.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import JoinLeagueScreen from '../JoinLeagueScreen';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
    replace: jest.fn(),
  }),
}));

const mockPublicLeagues = [
  { id: 'lg-1', name: 'Sunday Swingers', player_count: 8 },
];

jest.mock('@/hooks/useLeagues', () => ({
  useJoinLeague: () => ({ mutateAsync: jest.fn(), isPending: false }),
  usePublicLeagues: () => ({
    data: mockPublicLeagues,
    isLoading: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('@/components/leagues', () => ({
  LeagueCard: ({ league, onPress }: any) => {
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity onPress={onPress}>
        <Text>{league.name}</Text>
      </TouchableOpacity>
    );
  },
}));

describe('JoinLeagueScreen', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('defaults to Public mode showing search and results', () => {
    const { getByText, getByPlaceholderText } = render(<JoinLeagueScreen />);
    expect(getByPlaceholderText('Search public leagues...')).toBeTruthy();
    expect(getByText('Sunday Swingers')).toBeTruthy();
  });

  it('navigates to LeagueDetail when a public league is tapped', () => {
    const { getByText } = render(<JoinLeagueScreen />);
    fireEvent.press(getByText('Sunday Swingers'));
    expect(mockNavigate).toHaveBeenCalledWith('LeagueDetail', { id: 'lg-1' });
  });

  it('shows the invite code form in Private mode', () => {
    const { getByText, queryByPlaceholderText } = render(<JoinLeagueScreen />);
    fireEvent.press(getByText('Private'));
    expect(queryByPlaceholderText('Search public leagues...')).toBeNull();
    expect(queryByPlaceholderText('Enter invite code (e.g. LGE-12345)')).toBeTruthy();
  });
});
```

(Same caveat as Task 5: use the project's established provider/render helper and mock set; extra mocks like `useDebouncedValue` are real hooks that work in tests, but `SearchBar`/`FormInput` may need the theme provider.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/screens/leagues/__tests__/JoinLeagueScreen.test.tsx`
Expected: FAIL — Public-mode assertions (no search bar exists yet).

- [ ] **Step 3: Rework JoinLeagueScreen**

Replace the body of `src/screens/leagues/JoinLeagueScreen.tsx`:

```typescript
/**
 * JoinLeagueScreen - Join a league
 *
 * Public mode: search public leagues, tap to view & join (LeagueDetail).
 * Private mode: enter an invite code (LGE-xxxxx).
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Text, Icon, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { PageHeader, FormInput } from '@/components/common';
import { SegmentedButton } from '@/components/common/SegmentedButton';
import { SearchBar } from '@/components/common/SearchBar';
import { EmptyState } from '@/components/common/EmptyState';
import { LeagueCard } from '@/components/leagues';
import { useThemeColors } from '@/context/ThemeContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useJoinLeague, usePublicLeagues } from '@/hooks/useLeagues';
import type { League, LeagueWithPlayerCount } from '@/types/database';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type JoinMode = 'public' | 'private';

export default function JoinLeagueScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const joinLeague = useJoinLeague();

  const [mode, setMode] = useState<JoinMode>('public');

  // Public search
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const { data: publicLeagues, isLoading: isLoadingPublic } = usePublicLeagues(
    debouncedSearch || undefined
  );

  // Private invite code
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCodeChange = useCallback((text: string) => {
    setError(null);
    const formatted = text.toUpperCase().replace(/[^A-Z0-9-_]/g, '');
    if (formatted.length <= 20) {
      setInviteCode(formatted);
    }
  }, []);

  const canJoin = inviteCode.length >= 4;

  const handleJoin = useCallback(async () => {
    if (!canJoin) return;
    setError(null);
    try {
      const league = await joinLeague.mutateAsync(inviteCode.trim());
      navigation.replace('LeagueDetail', { id: league.id });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join league');
    }
  }, [canJoin, inviteCode, joinLeague, navigation]);

  const handleLeaguePress = useCallback(
    (league: League) => {
      navigation.navigate('LeagueDetail', { id: league.id });
    },
    [navigation]
  );

  const renderPublicLeague = useCallback(
    ({ item }: { item: LeagueWithPlayerCount }) => (
      <LeagueCard
        league={item}
        onPress={() => handleLeaguePress(item)}
        playerCount={item.player_count}
      />
    ),
    [handleLeaguePress]
  );

  const modeToggle = (
    <View style={styles.toggleContainer}>
      <SegmentedButton<JoinMode>
        value={mode}
        onValueChange={setMode}
        buttons={[
          { value: 'public', label: 'Public', icon: 'earth' },
          { value: 'private', label: 'Private', icon: 'lock-outline' },
        ]}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <PageHeader
          title="Join League"
          showBack
          onBack={() => navigation.goBack()}
        />

        {modeToggle}

        {mode === 'public' ? (
          <FlatList
            data={publicLeagues ?? []}
            renderItem={renderPublicLeague}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              (!publicLeagues || publicLeagues.length === 0) && styles.emptyListContent,
            ]}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search public leagues..."
                accessibilityLabel="Search public leagues"
                hideBorder
                containerStyle={styles.searchContainer}
              />
            }
            ListEmptyComponent={
              isLoadingPublic ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : (
                <EmptyState
                  icon="earth"
                  title={searchQuery ? 'No Results' : 'No Public Leagues'}
                  message={
                    searchQuery
                      ? 'No leagues match your search. Try a different term.'
                      : 'No public leagues yet. Check back later or ask a friend for an invite code.'
                  }
                />
              )
            }
          />
        ) : (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.inputSection}>
              <FormInput
                label="Invite Code"
                floatingLabel
                placeholder="Enter invite code (e.g. LGE-12345)"
                value={inviteCode}
                onChangeText={handleCodeChange}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={20}
                error={error || undefined}
                autoFocus
                accessibilityHint="Enter the league invite code shared by the creator"
              />

              <TouchableOpacity
                onPress={handleJoin}
                disabled={!canJoin || joinLeague.isPending}
                style={[
                  styles.joinButton,
                  { backgroundColor: canJoin ? colors.primary : colors.gray200 },
                ]}
                activeOpacity={0.7}
                accessibilityLabel="Join league"
              >
                <Text
                  style={[
                    styles.joinButtonText,
                    { color: canJoin ? colors.white : colors.textSecondary },
                  ]}
                >
                  {joinLeague.isPending ? 'Joining...' : 'Join League'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.helpBox, { backgroundColor: colors.surface }]}>
              <Icon source="information-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                Ask the league creator for the invite code. It starts with &quot;LGE-&quot; followed by 5 digits.
              </Text>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  toggleContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.xxxl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxxl,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  inputSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  joinButton: {
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    ...shadows.sm,
  },
  joinButtonText: {
    ...typography.bodyBold,
  },
  helpBox: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xxl,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  helpText: {
    ...typography.small,
    flex: 1,
    lineHeight: 20,
  },
});
```

Note: `autoFocus` on the code input now only applies in Private mode — that's the desired behaviour (don't pop the keyboard in Public mode). The private form's code, styles, and copy are otherwise unchanged from the current screen.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/screens/leagues/__tests__/JoinLeagueScreen.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/screens/leagues
git commit -m "feat(leagues): add Public/Private modes to JoinLeagueScreen"
```

---

### Task 8: Cleanup — delete old screens and verify everything

Remove the now-orphaned screens/components/hooks, then run the full verification suite.

**Files:**
- Delete: `src/screens/competitions/CompetitionsListScreen.tsx`
- Delete: `src/screens/competitions/components/CompetitionTabBar.tsx`
- Delete: `src/screens/competitions/components/CompetitionFilterBar.tsx`
- Delete: `src/screens/competitions/components/CompetitionListContent.tsx`
- Delete: `src/screens/competitions/components/index.ts`
- Delete: `src/screens/competitions/hooks/useCompetitionsList.ts` (and its `hooks/index.ts` if it only exports this)
- Delete: `src/screens/leagues/LeagueListScreen/` (entire directory)

- [ ] **Step 1: Check for remaining references before deleting**

Run: `grep -rn "CompetitionsListScreen\|LeagueListScreen\|useCompetitionsList\|CompetitionTabBar\|CompetitionFilterBar\|CompetitionListContent" src --include="*.ts" --include="*.tsx"`

Expected: hits only inside the files being deleted (plus their own tests). If anything else imports them — e.g. a `screens/competitions/index.ts` barrel, a `Competitions` stack route in RootNavigator (types.ts line ~35 mentions a `Competitions` route), or other screens' tests — update those references first:
- If `RootStackParamList` has a `Competitions: undefined` route pointing at `CompetitionsListScreen` in RootNavigator, remove both the route type and the registration, then grep for `navigate('Competitions')` and repoint hits to `navigation.navigate('MainTabs', { screen: 'CompeteTab' })`.
- Delete any test files that exclusively test the deleted components (e.g. `useCompetitionsList` or `LeagueListScreen` tests).

- [ ] **Step 2: Delete the files**

```bash
git rm src/screens/competitions/CompetitionsListScreen.tsx
git rm -r src/screens/competitions/components
git rm src/screens/competitions/hooks/useCompetitionsList.ts
git rm -r src/screens/leagues/LeagueListScreen
```

Then fix `src/screens/competitions/hooks/index.ts`: if it exports other hooks, just remove the `useCompetitionsList` line; if it's now empty, `git rm` it too.

- [ ] **Step 3: Full verification**

Run: `pnpm type-check`
Expected: no errors.

Run: `pnpm lint`
Expected: no errors (warnings acceptable if pre-existing).

Run: `pnpm test`
Expected: all suites pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove old Competitions and Leagues list screens replaced by Compete"
```

---

### Task 9: Manual device verification

No code — a smoke checklist on the iOS simulator (`npx expo start --ios`):

- [ ] Bottom nav shows Home, Compete, Activity, Courses, Profile in order; Activity is the center tab.
- [ ] Compete tab opens on Comps mode: Create + AI Create buttons, limit indicator, sections render (Active/Upcoming/Completed, empty ones hidden).
- [ ] Comps welcome modal auto-shows on first visit (reset via dev settings or fresh install) and via the info button afterwards.
- [ ] Toggle to Leagues: Create + Join side by side, my leagues listed, swipe-to-delete works.
- [ ] Leagues welcome modal shows the first time Leagues mode is opened (verify no flash/double-modal; apply the Task 5 fallback if it misbehaves).
- [ ] Join League → Public mode: search filters results; tapping a league opens LeagueDetail with its Join button.
- [ ] Join League → Private mode: code input, join with a valid LGE- code navigates to the league.
- [ ] Activity tab: feed renders with no back button; Home "See all" and Profile activity row both land on the Activity tab.
- [ ] Home Competitions tile lands on the Compete tab.
- [ ] Pull-to-refresh works in both Compete modes.
