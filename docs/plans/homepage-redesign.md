# Homepage Redesign Plan

## Context

The current homepage (RoundsScreen / RoundsTab) is purely functional — a PageHeader, single CTA button, tabs, and a FlatList of round cards. It lacks personality, visual hierarchy, stats, cross-feature discovery, and any engaging content. The goal is to make it more interesting and engaging while keeping it performant and useful.

Two approaches are presented below. **Approach A is recommended as Phase 1** — it's lower risk, ships faster, and all components carry forward into Approach B if desired later.

---

## Approach A: Enhanced Rounds Screen

**Philosophy:** Keep the Rounds tab identity. Add engaging sections above the round list using FlatList's `ListHeaderComponent`. Additive changes only — no structural/navigation changes.

### Layout

```
┌──────────────────────────────────┐
│  PageHeader: "Rounds"            │
├──────────────────────────────────┤
│  GREETING BANNER                 │
│  [Avatar] Good morning, Sam!     │
│  Handicap: 18.4 | 3 active      │
├──────────────────────────────────┤
│  CONTINUE SCORING (gradient)     │  ← only if in-progress round exists
│  Royal Melbourne GC              │
│  [======>        ] 9/18 holes    │
│  Stableford | John, Mike [Go →]  │
├──────────────────────────────────┤
│  QUICK ACTIONS (3 compact btns)  │
│  [+Score] [+New Comp] [Join]     │
├──────────────────────────────────┤
│  MINI STATS (3 stat cards)       │  ← hidden if 0 rounds; show onboarding instead
│  [12 Rounds] [32 Avg Pts] [38 Best] │
├──────────────────────────────────┤
│  Tabs: Active (3) | Completed (8)│
│  "Rounds that need scoring"      │
├──────────────────────────────────┤
│  RoundListCard: Kingston Heath   │
│  RoundListCard: Spring Valley    │
│  ...                             │
├──────────────────────────────────┤
│  (or) ENHANCED EMPTY STATE       │
│  [Score a Round] [Browse Comps]  │
└──────────────────────────────────┘
```

### New Components

| # | Component | File | Description | Lines (est.) |
|---|-----------|------|-------------|-------------|
| 1 | `GreetingBanner` | `src/screens/rounds/RoundListScreen/components/GreetingBanner.tsx` | Avatar + time-of-day greeting + handicap + active round count | ~80 |
| 2 | `InProgressHighlight` | `src/screens/rounds/RoundListScreen/components/InProgressHighlight.tsx` | Gradient card for in-progress round with ProgressBar and resume CTA. Uses `expo-linear-gradient`. Conditional render. | ~120 |
| 3 | `QuickActionsRow` | `src/screens/rounds/RoundListScreen/components/QuickActionsRow.tsx` | 3x `FeatureButton` compact variant — Score Round, New Competition, Join Competition | ~60 |
| 4 | `StatCard` | `src/components/common/StatCard.tsx` | Reusable small stat card (large number + caption label). Shared component. | ~50 |
| 5 | `MiniStatsRow` | `src/screens/rounds/RoundListScreen/components/MiniStatsRow.tsx` | 3 StatCards in a row — Rounds Played, Avg Stableford, Best Stableford | ~70 |
| 6 | `GettingStartedCard` | `src/screens/rounds/RoundListScreen/components/GettingStartedCard.tsx` | Onboarding checklist for first-time users (replaces MiniStatsRow when 0 rounds) | ~100 |
| 7 | `useQuickStats` | `src/screens/rounds/RoundListScreen/hooks/useQuickStats.ts` | Lightweight hook fetching aggregate stats (rounds played, avg points, best score) | ~60 |

### Modified Files

| File | Changes |
|------|---------|
| `src/screens/rounds/RoundListScreen/index.tsx` | Move round list into FlatList with `ListHeaderComponent` containing all new sections. Add `useQuickStats` hook call. |
| `src/screens/rounds/RoundListScreen/components/RoundListHeader.tsx` | Refactor — remove PageHeader and FeatureButton (moved to new sections). Keep Tabs + subtitle + LimitIndicator only. |
| `src/screens/rounds/RoundListScreen/components/RoundListEmpty.tsx` | Enhance with two CTAs (Score Round + Browse Competitions) and richer messaging. |
| `src/screens/rounds/RoundListScreen/components/index.ts` | Export new components. |

### Data Flow

```
RoundsScreen
├── useAuth()                     → name, photo, handicap
├── useRoundList()                → activeRounds, historyRounds (existing)
├── useQuickStats(userId)         → roundsPlayed, avgPoints, bestScore (NEW)
├── useSubscriptionContext()      → limits (existing)
│
└── FlatList
    ├── ListHeaderComponent:
    │   ├── PageHeader
    │   ├── GreetingBanner        ← useAuth data
    │   ├── InProgressHighlight   ← first in-progress from activeRounds (conditional)
    │   ├── QuickActionsRow       ← navigation callbacks
    │   ├── MiniStatsRow          ← useQuickStats data (or GettingStartedCard if 0 rounds)
    │   └── Tabs + subtitle       ← from current RoundListHeader
    ├── data = displayedRounds
    ├── renderItem = RoundListCard
    └── ListEmptyComponent = EnhancedRoundListEmpty
```

### Reused Components
- `PlayerAvatar` — for greeting banner
- `FeatureButton` (compact variant) — for quick actions row
- `ProgressBar` — for in-progress highlight
- `Pill` / `Badge` — for game type labels
- `CardContainer` — for stat cards
- `PageHeader` — kept at top
- `Tabs` — kept in header
- `LimitIndicator` — kept in header

### Complexity: **~540 new lines, 6 new files, 4 modified files**

---

## Approach B: Full Dashboard Home

**Philosophy:** Transform the Rounds tab into a true home dashboard. The full rounds list becomes accessible via "See All" drill-down. The tab becomes a curated hub for the user's entire golf life.

### Layout

```
┌──────────────────────────────────┐
│  HERO SECTION (gradient bg)      │
│  [Avatar 56px]                   │
│  Good afternoon, Sam             │
│  Handicap 18.4 | [Social badge]  │
│  [12 Rounds] [3 Comps] [38 Best] │
├──────────────────────────────────┤
│  QUICK ACTIONS (2x2 grid)       │
│  [+Score Round ] [New Comp    ]  │
│  [Join Comp    ] [Add Friend  ]  │
├──────────────────────────────────┤
│  CONTINUE SCORING (gradient)     │  ← conditional
│  Royal Melbourne - 9/18 holes    │
│  [Resume →]                      │
├──────────────────────────────────┤
│  UPCOMING ROUNDS      [See All→] │
│  Kingston Heath - Tomorrow 7:30  │
│  Spring Valley - Sat 22 Feb      │
├──────────────────────────────────┤
│  MY COMPETITIONS      [See All→] │
│  [Summer Series] [Winter Cup]    │  ← horizontal scroll
├──────────────────────────────────┤
│  RECENT RESULTS       [See All→] │
│  Royal Melbourne | 34 pts | 2nd  │
├──────────────────────────────────┤
│  YOUR STATS           [View All→]│
│  [32 Avg] [14 Birdies] [42% Par]│
└──────────────────────────────────┘
│ [Home] [Comps] [Courses] [Friends] [Profile] │
```

### New Components

| # | Component | File | Description | Lines (est.) |
|---|-----------|------|-------------|-------------|
| 1 | `HomeHeroSection` | `src/screens/home/components/HomeHeroSection.tsx` | Gradient hero with avatar, greeting, handicap, tier badge, 3 inline stats | ~150 |
| 2 | `QuickActionCard` | `src/screens/home/components/QuickActionCard.tsx` | Single action card for 2x2 grid (icon, title, subtitle) | ~80 |
| 3 | `QuickActionsGrid` | `src/screens/home/components/QuickActionsGrid.tsx` | 2x2 layout of QuickActionCard | ~60 |
| 4 | `ContinueScoringSection` | `src/screens/home/components/ContinueScoringSection.tsx` | Gradient card for in-progress round (similar to Approach A) | ~130 |
| 5 | `UpcomingRoundCard` | `src/screens/home/components/UpcomingRoundCard.tsx` | Compact round card for upcoming list | ~80 |
| 6 | `UpcomingRoundsSection` | `src/screens/home/components/UpcomingRoundsSection.tsx` | Section with SectionHeader + up to 3 UpcomingRoundCards + "See All" | ~60 |
| 7 | `CompetitionMiniCard` | `src/screens/home/components/CompetitionMiniCard.tsx` | Small card for horizontal competition scroll (name, progress) | ~80 |
| 8 | `MyCompetitionsSection` | `src/screens/home/components/MyCompetitionsSection.tsx` | Horizontal ScrollView of CompetitionMiniCards + "Create New" card | ~80 |
| 9 | `RecentResultCard` | `src/screens/home/components/RecentResultCard.tsx` | Compact completed round card with score and highlights | ~90 |
| 10 | `RecentResultsSection` | `src/screens/home/components/RecentResultsSection.tsx` | Section with up to 3 RecentResultCards + "See All" | ~60 |
| 11 | `StatsSnapshotSection` | `src/screens/home/components/StatsSnapshotSection.tsx` | 3 StatCards + "View All" linking to MyStatistics screen | ~80 |
| 12 | `OnboardingSection` | `src/screens/home/components/OnboardingSection.tsx` | 3-step onboarding for first-time users (replaces content sections) | ~120 |
| 13 | `StatCard` | `src/components/common/StatCard.tsx` | Shared stat card (same as Approach A) | ~50 |
| 14 | `HomeScreen` | `src/screens/home/HomeScreen.tsx` | Main dashboard screen with ScrollView composing all sections | ~200 |
| 15 | `useHomeData` | `src/screens/home/hooks/useHomeData.ts` | Aggregator hook combining round, competition, and stats data | ~80 |
| 16 | `useQuickStats` | `src/screens/home/hooks/useQuickStats.ts` | Same lightweight stats hook as Approach A | ~60 |
| 17 | `useActiveCompetitions` | `src/screens/home/hooks/useActiveCompetitions.ts` | Lightweight hook for user's active competitions (name, progress) | ~60 |

### Modified Files

| File | Changes |
|------|---------|
| `src/navigation/MainTabNavigator.tsx` | Change RoundsTab to render `HomeScreen` instead of `RoundListScreen`. Tab title → "Home", icon → home icon. |
| `src/navigation/types.ts` | Add `FullRoundList` route to stack navigator. |
| `src/screens/rounds/RoundListScreen/index.tsx` | Kept as-is, but now accessible via "See All" navigation from HomeScreen (registered as stack screen). |
| `src/components/common/index.ts` | Export `StatCard`. |

### Data Flow

```
HomeScreen (ScrollView)
├── useAuth()                       → name, photo, handicap
├── useRoundList()                  → activeRounds, historyRounds
├── useQuickStats(userId)           → roundsPlayed, avgPoints, bestScore
├── useActiveCompetitions(userId)   → competitions with progress
├── useSubscriptionContext()        → tier, limits
│
└── ScrollView
    ├── HomeHeroSection             ← auth + quickStats + subscription
    ├── QuickActionsGrid            ← navigation callbacks
    ├── ContinueScoringSection      ← first in-progress round (conditional)
    ├── UpcomingRoundsSection       ← active non-in-progress rounds (max 3)
    ├── MyCompetitionsSection       ← activeCompetitions
    ├── RecentResultsSection        ← historyRounds (max 3)
    ├── StatsSnapshotSection        ← quickStats
    └── (or) OnboardingSection      ← replaces above when no data
```

### Navigation Changes
- Tab icon: golf ball → home
- Tab label: "Rounds" → "Home"
- Add `FullRoundList` as a stack screen for "See All" drill-down
- "See All" on Competitions section → switch to CompetitionsTab

### Complexity: **~1,600 new lines, ~17 new files, 4 modified files**

---

## Comparison

| Dimension | Approach A | Approach B |
|-----------|-----------|-----------|
| Scope | Augment existing screen | New dashboard screen |
| New files | ~6 | ~17 |
| New code | ~540 lines | ~1,600 lines |
| Risk | Low (additive) | Medium (structural) |
| Nav changes | None | Tab rename + new stack route |
| Personalization | Good | Excellent |
| Cross-feature discovery | Moderate (quick actions) | Strong (competitions, results, stats) |
| First-time experience | Better (onboarding card) | Best (full onboarding section) |
| Performance | 1 new lightweight query | 2 new lightweight queries |
| Reusability | All components carry into B | N/A |

## Verification

For either approach:
1. **Visual check**: Run `npx expo start --ios` and verify all sections render correctly in both light and dark mode
2. **Empty state**: Test with a new user (0 rounds) — should show onboarding/getting-started content
3. **In-progress round**: Create a round and score a few holes — in-progress highlight should appear
4. **Stats**: Complete a round — stats row should populate
5. **Pull-to-refresh**: Verify refresh works on the entire screen
6. **Performance**: No perceptible lag on load — stats query should be lightweight
7. **Run tests**: `pnpm test` — existing RoundListScreen tests should be updated for new structure
