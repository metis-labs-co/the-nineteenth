# Skins Game - Phase 2 Implementation Plan

**Goal:** Add "Tally All Rounds" settlement mode + skins statistics tracking, history view, and lifetime earnings display
**Status:** Not Started - 0% (0/18 tasks)
**Prerequisites:** Phase 1 complete

---

## Overview

This plan implements **Phase 2** of the Skins gambling feature with two major additions:
1. **Tally All Rounds** settlement mode - accumulate carryovers across all competition rounds with one final settlement
2. **Statistics & History** - track lifetime stats, game history, and leaderboards

### Key Features
- **Tally All Rounds** - Carryover accumulates across rounds, settle at competition end
- **Lifetime statistics** - Track wins, earnings, streaks across all games
- **Game history** - View past skins games with full breakdowns
- **Win streaks** - Current and longest hole win streaks
- **Skins leaderboard** - Compare earnings with friends
- **Performance trends** - Track improvement over time

### Tally All Rounds Mode

When `settlement_mode = 'tally_all'` on `competition_skins_config`:
- Carryover from Round 1 Hole 18 → Round 2 Hole 1
- One big pot accumulates across all rounds
- Settlement happens only when competition is marked complete
- Requires same participants in all rounds (for fairness)

**Example: 3-round competition, $5/hole, 4 players**
```
Round 1: Total pot $90, John wins 3 holes ($15), $30 carries to Round 2
Round 2: $30 + $90 = $120 pot, Sarah wins 5 holes ($25+$30 carryover), $40 carries
Round 3: $40 + $90 = $130 pot, Final settlement

Competition End Settlement:
- John: +$45 (3 wins R1, 2 wins R3)
- Sarah: +$55 (5 wins R2)
- Mike: -$50
- You: -$50
```

### Example Statistics Display

**Player "John" Skins Profile:**
```
LIFETIME SKINS STATS
Games Played: 24
Holes Won: 87 / 432 (20.1%)
Total Winnings: $1,245.00
Total Buy-ins: $1,080.00
Net Result: +$165.00

STREAKS
Current Win Streak: 2 holes
Longest Win Streak: 7 holes (Royal Melbourne, Oct 2025)

RECENT GAMES
Royal Melbourne (Dec 15) - Won $45, +$22.50 net
Kingston Heath (Dec 8) - Won $15, -$7.50 net
```

---

## Sprint 1: Tally All Rounds - Database

### Task 1: Competition Skins Game Table
**Status:** Not Started
**Command:**
```bash
/db "Create migration for competition-level skins game tracking (tally all rounds mode). New table competition_skins_games: id UUID PK, competition_id UUID FK to competitions ON DELETE CASCADE UNIQUE, config_id UUID FK to competition_skins_config ON DELETE CASCADE, participant_ids UUID[] NOT NULL, total_pot DECIMAL(12,2) DEFAULT 0, current_carryover DECIMAL(10,2) DEFAULT 0, current_round_number INTEGER DEFAULT 1, rounds_completed INTEGER DEFAULT 0, status TEXT NOT NULL CHECK IN ('active', 'completed', 'cancelled') DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), completed_at TIMESTAMPTZ NULL. RLS: participants can view (auth.uid() = ANY(participant_ids)), organizers can manage. Add function get_competition_skins_carryover(competition_id) to get current carryover for cross-round continuity. Add trigger on skins_games completion to update competition_skins_games carryover when settlement_mode='tally_all'."
```
**Deliverables:**
- [ ] `supabase/migrations/2026XXXX_competition_skins_games.sql`
- [ ] `competition_skins_games` table
- [ ] RLS policies
- [ ] `get_competition_skins_carryover()` function
- [ ] Trigger for carryover updates

**Dependencies:** Phase 1 complete
**Estimated Time:** 3-4 hours

---

### Task 2: Cross-Round Carryover Function
**Status:** Not Started
**Command:**
```bash
/db "Create PostgreSQL functions for tally-all-rounds carryover logic. (1) initialize_competition_skins_game(p_competition_id UUID) - creates competition_skins_games record when first round starts if settlement_mode='tally_all', validates same participants across rounds, SECURITY DEFINER. (2) get_round_starting_carryover(p_round_id UUID) - returns carryover from previous round in competition if tally_all mode, 0 otherwise, STABLE. (3) update_competition_carryover(p_competition_id UUID, p_carryover DECIMAL) - updates current_carryover on competition_skins_games after each round, SECURITY DEFINER. (4) finalize_competition_skins(p_competition_id UUID) - called when competition ends, calculates final payouts across all rounds, splits any remaining carryover, marks completed, SECURITY DEFINER. (5) validate_tally_all_participants(p_competition_id UUID) - ensures all rounds have same participants, returns {isValid, errors}."
```
**Deliverables:**
- [ ] `initialize_competition_skins_game()` function
- [ ] `get_round_starting_carryover()` function
- [ ] `update_competition_carryover()` function
- [ ] `finalize_competition_skins()` function
- [ ] `validate_tally_all_participants()` function

**Dependencies:** Task 1
**Estimated Time:** 4-5 hours

---

### Task 3: Competition Skins Types
**Status:** Not Started
**Command:**
```bash
/refactor "Add tally-all-rounds types to src/types/database/skins.types.ts. New interfaces: CompetitionSkinsGame (id, competitionId, configId, participantIds string[], totalPot number, currentCarryover number, currentRoundNumber number, roundsCompleted number, status, createdAt, updatedAt, completedAt nullable). CompetitionSkinsGameWithRounds extends with rounds array of SkinsGame[]. CompetitionSkinsSummary (game: CompetitionSkinsGame, roundSummaries: {roundId, roundNumber, holesWon map, potWon map, carryoverOut}[], totalPayouts: SkinsPayout[]). Update SkinsSettlementMode to include validation that tally_all requires same participants."
```
**Deliverables:**
- [ ] `CompetitionSkinsGame` interface
- [ ] `CompetitionSkinsGameWithRounds` interface
- [ ] `CompetitionSkinsSummary` interface
- [ ] Type exports updated

**Dependencies:** Task 1 (schema)
**Estimated Time:** 1-2 hours

---

### Task 4: Tally All Rounds Hooks
**Status:** Not Started
**Command:**
```bash
/hook "Add tally-all-rounds hooks to src/hooks/useCompetitionSkinsConfig.ts. New query keys: competitionSkinsGame: (competitionId) => [...skinsKeys.all, 'competitionGame', competitionId]. New hooks: (1) useCompetitionSkinsGame(competitionId) - fetches competition_skins_games with round details, staleTime 30s. (2) useCompetitionSkinsSummary(competitionId) - combines competition game + all round results + calculated payouts across all rounds. (3) useInitializeCompetitionSkins() - mutation to initialize when first round starts. (4) useFinalizeCompetitionSkins() - mutation to finalize when competition ends. (5) useValidateTallyAllParticipants(competitionId) - query to check participant consistency."
```
**Deliverables:**
- [ ] `useCompetitionSkinsGame()` hook
- [ ] `useCompetitionSkinsSummary()` hook
- [ ] `useInitializeCompetitionSkins()` mutation
- [ ] `useFinalizeCompetitionSkins()` mutation
- [ ] `useValidateTallyAllParticipants()` hook

**Dependencies:** Task 3 (types)
**Estimated Time:** 3-4 hours

---

### Task 5: Update Score Processing for Tally Mode
**Status:** Not Started
**Command:**
```bash
/refactor "Update skins score processing to handle tally-all-rounds mode. In score submission flow: (1) When round starts and settlement_mode='tally_all', call initializeCompetitionSkins if not exists. (2) When processing Hole 1, get starting carryover from previous round via get_round_starting_carryover(). (3) When round finalizes, update competition carryover via update_competition_carryover(). (4) Do NOT settle per-round - skip settlement step when tally_all. (5) When competition is marked complete, call finalizeCompetitionSkins to settle everything. Update UI to show 'Settlement at competition end' instead of per-round settlement for tally_all mode."
```
**Deliverables:**
- [ ] Round start initializes competition skins
- [ ] Hole 1 gets carryover from previous round
- [ ] Round end updates competition carryover
- [ ] Skip per-round settlement for tally_all
- [ ] Competition end triggers final settlement

**Dependencies:** Task 4 (hooks), Phase 1 Task 25
**Estimated Time:** 4-5 hours

---

### Task 6: Competition Skins Results UI
**Status:** Not Started
**Command:**
```bash
/component "CompetitionSkinsResultsCard - Show cumulative skins results across all rounds. Props: competitionId (string), summary (CompetitionSkinsSummary). Layout: Card with header 'COMPETITION SKINS - Tally All Rounds'. (1) Overview section: Total Pot, Rounds Played, Current Carryover. (2) Per-round breakdown: Collapsible sections for each round showing holes won and pot won per player. (3) Running totals: Cumulative winnings per player updated after each round. (4) If competition not complete: 'Final settlement when competition ends' note. (5) If complete: Show final settlement using SkinsSettlementCard. Use useCompetitionSkinsSummary hook."
```
**Deliverables:**
- [ ] `src/components/skins/CompetitionSkinsResultsCard.tsx`
- [ ] Overview section
- [ ] Per-round breakdown (collapsible)
- [ ] Running totals display
- [ ] Final settlement integration

**Dependencies:** Task 4 (hooks)
**Estimated Time:** 4-5 hours

---

## Sprint 2: Statistics Database

### Task 7: Player Statistics Table
**Status:** Not Started
**Command:**
```bash
/db "Create migration for skins player statistics table. New table skins_player_statistics: id UUID PK, player_id UUID FK to players ON DELETE CASCADE UNIQUE, games_played INTEGER DEFAULT 0, games_won INTEGER DEFAULT 0 (most holes won in game), total_holes_played INTEGER DEFAULT 0, total_holes_won INTEGER DEFAULT 0, total_holes_tied INTEGER DEFAULT 0, total_holes_lost INTEGER DEFAULT 0, total_buy_ins DECIMAL(12,2) DEFAULT 0, total_winnings DECIMAL(12,2) DEFAULT 0, total_net_result DECIMAL(12,2) DEFAULT 0, current_hole_win_streak INTEGER DEFAULT 0, longest_hole_win_streak INTEGER DEFAULT 0, longest_streak_game_id UUID FK to skins_games NULL (reference to game where streak occurred), longest_streak_date DATE NULL, win_rate DECIMAL(5,2) NULL (calculated: holes_won/holes_played * 100), avg_net_per_game DECIMAL(10,2) NULL (calculated: net_result/games_played), last_game_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(). Add RLS: users can view own stats (player_id = auth.uid()), friends can view each other's stats (via friends table check). Add updated_at trigger. Add indexes on player_id, win_rate DESC, total_net_result DESC for leaderboard queries."
```
**Deliverables:**
- [ ] `supabase/migrations/2025XXXX_skins_player_statistics.sql`
- [ ] `skins_player_statistics` table
- [ ] RLS policies for own and friends' stats
- [ ] Indexes for leaderboard queries
- [ ] Updated_at trigger

**Dependencies:** Phase 1 complete
**Estimated Time:** 2-3 hours

---

### Task 8: Statistics Update Trigger
**Status:** Not Started
**Command:**
```bash
/db "Create trigger function to automatically update skins_player_statistics when games are finalized. Function update_skins_statistics() - triggered AFTER UPDATE ON skins_games when OLD.status != 'completed' AND NEW.status = 'completed'. For each participant in game: (1) Upsert into skins_player_statistics if not exists. (2) Increment games_played. (3) Get payouts from skins_payouts table. (4) Add holes_won, holes_tied, holes_lost to totals. (5) Add buy_in to total_buy_ins, winnings to total_winnings. (6) Update total_net_result. (7) Check if player had most holes won in game - if so, increment games_won. (8) Calculate and update current streak from recent games. (9) Check if current streak > longest streak, update if so. (10) Recalculate win_rate and avg_net_per_game. (11) Update last_game_at. Create trigger on skins_games table."
```
**Deliverables:**
- [ ] `update_skins_statistics()` function
- [ ] Trigger on skins_games
- [ ] All stat calculations
- [ ] Streak tracking logic

**Dependencies:** Task 7
**Estimated Time:** 3-4 hours

---

### Task 9: Streak Calculation Function
**Status:** Not Started
**Command:**
```bash
/db "Create function to calculate current win streak for a player. Function calculate_current_win_streak(p_player_id UUID) RETURNS INTEGER. Logic: Query recent skins_results where winner_id = player_id, ordered by calculated_at DESC. Count consecutive wins from most recent game backward until a loss or tie. A 'loss' is any hole where player participated but did not win (check skins_games.participant_ids contains player_id AND winner_id != player_id AND is_carryover = false). Return count. Also create function check_longest_streak_update(p_player_id UUID, p_current_streak INTEGER) - compares with existing longest, returns true if should update. Helper function get_player_recent_hole_results(p_player_id UUID, p_limit INTEGER) - returns recent hole results with win/loss/tie status."
```
**Deliverables:**
- [ ] `calculate_current_win_streak()` function
- [ ] `check_longest_streak_update()` function
- [ ] `get_player_recent_hole_results()` helper
- [ ] Proper streak calculation logic

**Dependencies:** Task 7
**Estimated Time:** 2-3 hours

---

## Sprint 3: Statistics Types

### Task 10: Statistics Type Definitions
**Status:** Not Started
**Command:**
```bash
/refactor "Add statistics types to src/types/database/skins.types.ts. New interfaces: SkinsPlayerStatistics (id, playerId, gamesPlayed, gamesWon, totalHolesPlayed, totalHolesWon, totalHolesTied, totalHolesLost, totalBuyIns number, totalWinnings number, totalNetResult number, currentHoleWinStreak, longestHoleWinStreak, longestStreakGameId nullable, longestStreakDate nullable Date, winRate nullable number, avgNetPerGame nullable number, lastGameAt nullable Date, createdAt, updatedAt). SkinsPlayerStatisticsWithPlayer extends with player object {id, name, handicap, avatarUrl}. SkinsLeaderboardEntry (rank number, playerId, playerName, playerAvatar nullable, gamesPlayed, holesWon, winRate, totalNetResult). SkinsGameHistoryEntry extends SkinsGameWithParticipants with {playerPayout: SkinsPayout, holesWon, netResult, date}. Export all new types."
```
**Deliverables:**
- [ ] `SkinsPlayerStatistics` interface
- [ ] `SkinsPlayerStatisticsWithPlayer` interface
- [ ] `SkinsLeaderboardEntry` interface
- [ ] `SkinsGameHistoryEntry` interface
- [ ] Exports updated

**Dependencies:** Phase 1 types
**Estimated Time:** 1-2 hours

---

## Sprint 4: Statistics Hooks

### Task 11: Statistics and Leaderboard Hooks
**Status:** Not Started
**Command:**
```bash
/hook "Add statistics hooks to src/hooks/useSkins.ts. New query keys in queryKeys.ts: statistics: (playerId) => [...all, 'stats', playerId], leaderboard: () => [...all, 'leaderboard'], history: (playerId, page?) => [...all, 'history', playerId, page]. New hooks: (1) useSkinsStatistics(playerId) - fetches skins_player_statistics for player, returns SkinsPlayerStatistics, staleTime 1min. (2) useMySkinsStatistics() - convenience wrapper using current user id. (3) useSkinsLeaderboard(options?: {limit?: number, friendsOnly?: boolean}) - fetches top players by total_net_result, optionally filtered to friends only via join, returns SkinsLeaderboardEntry[], staleTime 5min. (4) useSkinsGameHistory(playerId, options?: {limit?: number, offset?: number}) - fetches past skins_games where participant_ids contains player, with their payout data, ordered by completed_at DESC, returns SkinsGameHistoryEntry[], supports pagination, staleTime 1min."
```
**Deliverables:**
- [ ] `useSkinsStatistics()` hook
- [ ] `useMySkinsStatistics()` hook
- [ ] `useSkinsLeaderboard()` hook
- [ ] `useSkinsGameHistory()` hook
- [ ] Query keys updated

**Dependencies:** Task 10 (types)
**Estimated Time:** 2-3 hours

---

## Sprint 5: Statistics UI Components

### Task 12: SkinsStatsCard Component
**Status:** Not Started
**Command:**
```bash
/component "SkinsStatsCard - Display player's lifetime skins statistics. Props: statistics (SkinsPlayerStatistics), showHeader (boolean default true). Layout: Card with optional header 'LIFETIME SKINS STATS'. Stats grid showing: (1) Games Played count. (2) Holes Won with percentage 'X / Y (Z%)'. (3) Total Winnings formatted as currency. (4) Net Result with +/- prefix, colored green if positive, red if negative. (5) Win Rate percentage. (6) Avg Per Game currency. Use 3-column grid on larger screens, 2-column on smaller. Each stat with label above and value below. If statistics null or gamesPlayed = 0, show empty state 'No skins games played yet'. Follow StatCard.tsx patterns for styling."
```
**Deliverables:**
- [ ] `src/components/skins/SkinsStatsCard.tsx`
- [ ] Stats grid layout
- [ ] Currency and percentage formatting
- [ ] Color coding for net result
- [ ] Empty state handling

**Dependencies:** Task 10 (types)
**Estimated Time:** 2-3 hours

---

### Task 13: SkinsStreakCard Component
**Status:** Not Started
**Command:**
```bash
/component "SkinsStreakCard - Display win streak information. Props: currentStreak (number), longestStreak (number), longestStreakDate (Date nullable), longestStreakGameId (string nullable), onViewGame ((gameId: string) => void optional). Layout: Card with header 'STREAKS'. Two sections side by side: (1) 'Current Streak' with flame icon if streak > 0, showing number and 'holes' label. (2) 'Longest Streak' with trophy icon, showing number, 'holes' label, and date if available. If longestStreakGameId exists and onViewGame provided, show 'View Game' link. Streak of 0 shows '0 holes' without icon. Highlight current streak if it equals or exceeds longest. Use fire animation for active streaks > 3."
```
**Deliverables:**
- [ ] `src/components/skins/SkinsStreakCard.tsx`
- [ ] Current and longest streak display
- [ ] Fire icon for active streaks
- [ ] Date and link to game
- [ ] Animation for high streaks

**Dependencies:** Task 10 (types)
**Estimated Time:** 2-3 hours

---

### Task 14: SkinsGameHistoryList Component
**Status:** Not Started
**Command:**
```bash
/component "SkinsGameHistoryList - Scrollable list of past skins games. Props: games (SkinsGameHistoryEntry[]), onGamePress ((gameId: string) => void), isLoading (boolean), onEndReached (() => void optional for pagination), ListEmptyComponent (ReactNode optional). Layout: FlatList with SkinsGameHistoryRow items. Each row shows: course name/date on left, holes won badge, net result (+$X or -$X) on right with color coding. Tap navigates to game details. Support pull-to-refresh. Show loading footer when paginating. Empty state 'No skins history yet. Play your first skins game!' with dice icon."
```
**Deliverables:**
- [ ] `src/components/skins/SkinsGameHistoryList.tsx`
- [ ] SkinsGameHistoryRow sub-component
- [ ] FlatList with pagination
- [ ] Pull-to-refresh
- [ ] Empty state

**Dependencies:** Task 10 (types)
**Estimated Time:** 2-3 hours

---

### Task 15: SkinsLeaderboard Component
**Status:** Not Started
**Command:**
```bash
/component "SkinsLeaderboard - Leaderboard of top skins players. Props: entries (SkinsLeaderboardEntry[]), currentUserId (string), onPlayerPress ((playerId: string) => void optional), isLoading (boolean), friendsOnly (boolean default false). Layout: Card with header 'SKINS LEADERBOARD' and optional 'Friends Only' toggle. Table with columns: Rank (#), Player (avatar + name), Games, Win Rate %, Net Result. Top 3 get medal icons (gold/silver/bronze). Current user row highlighted. Net result colored green/red. If friendsOnly, header shows 'FRIENDS LEADERBOARD'. Empty state if no entries. Tap on row triggers onPlayerPress if provided."
```
**Deliverables:**
- [ ] `src/components/skins/SkinsLeaderboard.tsx`
- [ ] Leaderboard table
- [ ] Medal icons for top 3
- [ ] Current user highlighting
- [ ] Friends only toggle

**Dependencies:** Task 10 (types)
**Estimated Time:** 2-3 hours

---

## Sprint 6: Statistics Screens

### Task 16: SkinsStatisticsScreen
**Status:** Not Started
**Command:**
```bash
/screen "SkinsStatisticsScreen - Full screen for viewing skins statistics. Route: 'SkinsStatistics' with optional params {playerId?: string} - if not provided, shows current user. Layout: ScrollView with PageHeader 'Skins Statistics' (show player name if viewing another). (1) SkinsStatsCard at top with full stats. (2) SkinsStreakCard below. (3) SkinsLeaderboard with friendsOnly toggle - collapsed by default, expandable. (4) SkinsGameHistoryList taking remaining space. Add to navigation types.ts and RootNavigator. Accessible from MyStatisticsScreen (add 'View Skins Stats' link) and CompareStatsScreen (add skins comparison). Use useMySkinsStatistics or useSkinsStatistics based on playerId."
```
**Deliverables:**
- [ ] `src/screens/skins/SkinsStatisticsScreen.tsx`
- [ ] All component integrations
- [ ] Navigation setup
- [ ] Player vs self view handling
- [ ] Links from existing screens

**Dependencies:** Tasks 12, 13, 14, 15 (components), Task 11 (hooks)
**Estimated Time:** 3-4 hours

---

### Task 17: Add Skins Stats to Profile
**Status:** Not Started
**Command:**
```bash
/refactor "Update ProfileScreen and MyStatisticsScreen to include skins statistics entry point. In ProfileScreen.tsx: If user has played skins games (check useMySkinsStatistics), add 'Skins' row in stats section showing quick summary (net result with color). Tap navigates to SkinsStatisticsScreen. In MyStatisticsScreen.tsx: Add 'SKINS' section after Advanced Analytics. Show SkinsStatsCard component if gamesPlayed > 0. Add 'View Full Stats' button navigating to SkinsStatisticsScreen. If no skins history, show 'Try Skins' promo card explaining feature. Both respect Premium tier gating - show FeatureLock if not Premium."
```
**Deliverables:**
- [ ] ProfileScreen skins row
- [ ] MyStatisticsScreen skins section
- [ ] Navigation to SkinsStatisticsScreen
- [ ] Tier gating with FeatureLock
- [ ] Promo card for non-users

**Dependencies:** Task 16 (screen), Task 12 (component)
**Estimated Time:** 2-3 hours

---

## Sprint 7: Documentation

### Task 18: Update Documentation
**Status:** Not Started
**Command:**
```bash
/docs "Update documentation for skins statistics (Phase 2). Files: (1) docs/database/DATABASE_SCHEMA.md - add skins_player_statistics table with all columns, update trigger, streak functions. (2) docs/guides/SKINS_GAME.md - add 'Statistics & History' section explaining what's tracked, how streaks work, leaderboard calculation. (3) Update CLAUDE.md Data Model to mention skins statistics tracking."
```
**Deliverables:**
- [ ] DATABASE_SCHEMA.md updated
- [ ] SKINS_GAME.md extended
- [ ] CLAUDE.md updated

**Dependencies:** All Phase 2 tasks
**Estimated Time:** 1-2 hours

---

## Progress Summary

### Completion Statistics
- **Total Tasks:** 18
- **Completed:** 0 (0%)
- **In Progress:** 0 (0%)
- **Not Started:** 18 (100%)

### Sprint Progress

**Sprint 1: Tally All Rounds - Database** - Not Started
- Task 1: Competition Skins Game Table
- Task 2: Cross-Round Carryover Functions
- Task 3: Competition Skins Types
- Task 4: Tally All Rounds Hooks
- Task 5: Update Score Processing for Tally Mode
- Task 6: Competition Skins Results UI

**Sprint 2: Statistics Database** - Not Started
- Task 7: Player Statistics Table
- Task 8: Statistics Update Trigger
- Task 9: Streak Calculation Function

**Sprint 3: Statistics Types** - Not Started
- Task 10: Statistics Type Definitions

**Sprint 4: Statistics Hooks** - Not Started
- Task 11: Statistics and Leaderboard Hooks

**Sprint 5: Statistics UI Components** - Not Started
- Task 12: SkinsStatsCard
- Task 13: SkinsStreakCard
- Task 14: SkinsGameHistoryList
- Task 15: SkinsLeaderboard

**Sprint 6: Statistics Screens** - Not Started
- Task 16: SkinsStatisticsScreen
- Task 17: Add Skins Stats to Profile

**Sprint 7: Documentation** - Not Started
- Task 18: Update Documentation

---

## Critical Files

### New Files
| File | Purpose |
|------|---------|
| `supabase/migrations/2026XXXX_competition_skins_games.sql` | Tally-all-rounds table and functions |
| `supabase/migrations/2026XXXX_skins_player_statistics.sql` | Statistics table and triggers |
| `src/components/skins/CompetitionSkinsResultsCard.tsx` | Multi-round skins results |
| `src/components/skins/SkinsStatsCard.tsx` | Statistics display card |
| `src/components/skins/SkinsStreakCard.tsx` | Streak display card |
| `src/components/skins/SkinsGameHistoryList.tsx` | History list |
| `src/components/skins/SkinsLeaderboard.tsx` | Leaderboard component |
| `src/screens/skins/SkinsStatisticsScreen.tsx` | Full statistics screen |

### Modified Files
| File | Changes |
|------|---------|
| `src/types/database/skins.types.ts` | Add CompetitionSkinsGame + statistics types |
| `src/hooks/useCompetitionSkinsConfig.ts` | Add tally-all hooks |
| `src/hooks/useSkins.ts` | Add statistics hooks |
| `src/hooks/queryKeys.ts` | Add competition skins + statistics keys |
| `src/screens/profile/ProfileScreen.tsx` | Add skins row |
| `src/screens/profile/MyStatisticsScreen.tsx` | Add skins section |
| `src/navigation/types.ts` | Add SkinsStatistics route |
| `src/navigation/RootNavigator.tsx` | Register screen |
| `docs/database/DATABASE_SCHEMA.md` | Document competition_skins_games + statistics |
| `docs/guides/SKINS_GAME.md` | Add Tally All Rounds + Statistics sections |

---

## Time Estimates

| Sprint | Tasks | Estimated Hours |
|--------|-------|-----------------|
| Sprint 1: Tally All Rounds | 6 | 20-27 hours |
| Sprint 2: Statistics Database | 3 | 7-10 hours |
| Sprint 3: Statistics Types | 1 | 1-2 hours |
| Sprint 4: Statistics Hooks | 1 | 2-3 hours |
| Sprint 5: Statistics Components | 4 | 8-12 hours |
| Sprint 6: Statistics Screens | 2 | 5-7 hours |
| Sprint 7: Docs | 1 | 1-2 hours |

**Total Estimated:** 44-63 hours

---

## Key Design Decisions

### Tally All Rounds
1. **Separate Table**: `competition_skins_games` tracks cross-round state independently
2. **Same Participants Required**: All rounds must have same participants for fairness
3. **Carryover Continuity**: Round 1 Hole 18 carryover → Round 2 Hole 1
4. **Deferred Settlement**: No per-round settlement, only at competition end
5. **Validation Function**: `validate_tally_all_participants()` ensures consistency

### Statistics
6. **Automatic Stats Update**: Trigger-based updates ensure consistency without client logic
7. **Streak Calculation**: Server-side function handles complex sequential analysis
8. **Friends Leaderboard**: Social competition without exposing all users
9. **Separate Screen**: Dedicated SkinsStatisticsScreen for detailed view
10. **Profile Integration**: Quick stats visible in profile, full stats one tap away

---

## Command Usage Reference

| Command | Use For |
|---------|---------|
| `/db` | Database schema design and migrations |
| `/component` | Reusable UI components |
| `/screen` | Full screen implementations |
| `/hook` | TanStack Query hooks |
| `/refactor` | Modifying existing code |
| `/docs` | Documentation updates |

---

**Last Updated:** 2025-12-29
**Prerequisites:** Phase 1 must be complete
**Current Sprint:** Not started
