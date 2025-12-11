# MVP Phase 1 - Progress Tracker

**Timeline:** 6 weeks
**Goal:** Validate core concept with absolute minimum viable feature set
**Status:** 🔄 In Progress - ~88% Complete

---

## ⚠️ Important Notes

**Wireframes vs MVP Scope:**
The wireframes in `docs/design/wireframes.jsx` show the **Phase 2 vision** with multi-round competitions. This MVP Phase 1 implements a **simplified single-round version** to validate the core concept faster. Key differences:

- **Wireframes show**: 4-round competitions, course search API, multiple game types
- **Phase 1 implements**: Single round only, manual course entry, Stableford only

This is intentional - we're building the minimum to validate, then expanding based on feedback.

---

## Overview

This document tracks the implementation progress of MVP Phase 1 for The Nineteenth golf app. Tasks are organized by week and priority, with clear slash command references for execution.

**UI Framework:** All components use **React Native Paper** (Material Design 3) as specified in CLAUDE.md and aesthetic guidelines.

---

## Week 1: Database Schema & Auth Setup

### Task 1: Database Schema Design
**Status:** ✅ Completed
**Command:**
```bash
/db "Complete MVP Phase 1 database schema with tables for competitions, rounds, courses, players, competition_players, scorecards. Include RLS policies for private competitions, triggers for updated_at timestamps, and indexes for common queries like leaderboards and competition lookups."
```
**Deliverables:**
- [x] `competitions` table with RLS policies
- [x] `rounds` table (single round per competition)
- [x] `courses` table (manual entry only)
- [x] `players` table
- [x] `competition_players` join table
- [x] `scorecards` table with JSONB scores
- [x] Updated_at trigger for all tables
- [x] Indexes for leaderboard and competition queries
- [x] Migration SQL file (`supabase/migrations/20250109000000_mvp_phase_1_schema.sql`)

**Dependencies:** None
**Estimated Time:** 4-6 hours
**Completed:** 2025-01-09

---

### Task 2: Common UI Components
**Status:** ✅ Completed

#### PageHeader Component
**Command:**
```bash
/component "PageHeader - Consistent header component for all screens. Props: title (required), showBack (boolean), onBack (function), rightActions (array of icon buttons). Height 56dp Android / 44dp iOS + safe area insets. Background surface color, subtle elevation. Uses React Native Paper Appbar component."
```
**Deliverables:**
- [x] `src/components/common/PageHeader.tsx`
- [x] Title display (typography: titleLarge, 20sp)
- [x] Optional back button (left)
- [x] Optional action buttons (right, max 2)
- [x] Safe area insets handling
- [x] Platform-specific elevation (iOS shadow, Android elevation)
- [x] React Native Paper Appbar.Header

**Dependencies:** None
**Estimated Time:** 2-3 hours
**Completed:** 2025-01-09

---

#### OfflineIndicator Component
**Status:** ✅ Completed
**Command:**
```bash
/component "OfflineIndicator - Persistent banner showing offline status, pending syncs count, and manual sync button. Different colors for offline (yellow), syncing (blue), error (red). Uses React Native Paper Banner component."
```
**Deliverables:**
- [x] `src/components/common/OfflineIndicator.tsx`
- [x] Offline status display
- [x] Pending syncs counter
- [x] Manual Sync button
- [x] Color-coded states (yellow/blue/red)
- [x] Sync/Retry buttons with proper accessibility
- [x] ActivityIndicator for syncing state

**Dependencies:** None (Network hook added later)
**Estimated Time:** 2 hours
**Completed:** 2025-01-09

---

### Task 3: Authentication Screens
**Status:** ✅ Completed

#### LoginScreen
**Status:** ✅ Completed
**Command:**
```bash
/screen "LoginScreen - Simple email + password login form with validation, error handling, and navigation to SignupScreen. No magic links or social login - just basic auth for MVP. Uses React Native Paper TextInput and Button components. Includes PageHeader component."
```
**Deliverables:**
- [x] `src/screens/auth/LoginScreen.tsx` (React Navigation)
- [x] Email + password form fields (React Native Paper TextInput)
- [x] Form validation with error states (email format, required fields)
- [x] Loading state during login (React Native Paper Button loading prop)
- [x] Navigation to SignupScreen
- [x] Error handling (invalid credentials, network errors)
- [x] Uses PageHeader component
- [x] Password visibility toggle
- [x] KeyboardAvoidingView for iOS/Android
- [x] Accessibility labels and hints
- [x] Design tokens for styling

**Dependencies:** Task 1 (database schema), Task 2 (PageHeader)
**Estimated Time:** 2-3 hours
**Completed:** 2025-01-09

---

#### SignupScreen
**Status:** ✅ Completed
**Command:**
```bash
/screen "SignupScreen - Email + password signup with name field. Basic validation, error states, and auto-login after successful signup. Uses React Native Paper TextInput and Button components. Includes PageHeader component."
```
**Deliverables:**
- [x] `src/screens/auth/SignupScreen.tsx` (React Navigation)
- [x] Name, email, password, confirm password form fields (React Native Paper TextInput)
- [x] Form validation (email format, password strength, password match)
- [x] Password strength requirements (8+ chars, uppercase, lowercase, numbers)
- [x] Loading state during signup (React Native Paper Button loading prop)
- [x] Auto-login after successful signup (navigates to home)
- [x] Error handling (duplicate email, network errors)
- [x] Uses PageHeader component
- [x] Password visibility toggles for both password fields
- [x] KeyboardAvoidingView for iOS/Android
- [x] Accessibility labels and hints
- [x] Design tokens for styling
- [x] Terms & Privacy notice

**Dependencies:** Task 1 (database schema), Task 2 (PageHeader)
**Estimated Time:** 2-3 hours
**Completed:** 2025-01-09

---

### Task 4: Authentication Hook
**Status:** ✅ Completed
**Command:**
```bash
/hook "useAuth - Authentication hook using Supabase Auth. Provide login, signup, logout functions and current user state. Store auth token for API calls. Handle session persistence and token refresh."
```
**Deliverables:**
- [x] `src/hooks/useAuth.ts`
- [x] Login function
- [x] Signup function
- [x] Logout function
- [x] Current user state
- [x] Session persistence
- [x] Token management

**Dependencies:** Task 1 (database schema)
**Estimated Time:** 3-4 hours
**Completed:** 2025-01-09

---

## Week 2: Admin Flow - Competition Creation

### Task 5: Competition Creation Feature
**Status:** ✅ Completed
**Command:**
```bash
/feature "Admin Competition Creation - Multi-step wizard (4 steps) for creating a single-round Stableford competition. Steps: 1) Competition details (name, description, dates, handicap system), 2) Add single round (course name manual entry, date, Stableford only), 3) Add players manually (name + handicap), 4) Review and generate invite code. Use stepper UI component, form validation with Zod, and store competition in database."
```
**Deliverables:**
- [x] Multi-step wizard flow
- [x] Form validation schemas with Zod (`src/schemas/competition.ts`)
- [x] Competition state management
- [x] Navigation between steps
- [x] Progress indicator (stepper)

**Dependencies:** Task 1-4 (Auth complete)
**Estimated Time:** 8-10 hours
**Completed:** 2025-01-10

---

### Task 6: Competition Creation Screens
**Status:** ✅ Completed

#### Step 1: Competition Details
**Status:** ✅ Completed
**Command:**
```bash
/screen "CreateCompetitionScreen - Step 1: Competition details form (name, description, start date, handicap system dropdown). Use KeyboardAvoidingView, form validation with Zod, React Native Paper TextInput and Dropdown, and stepper indicator at top. Manual text entry for course name - NO search or API integration."
```
**Deliverables:**
- [x] `src/screens/admin/CreateCompetitionScreen.tsx` (wizard orchestrator)
- [x] `src/components/competition/create/CompetitionDetailsStep.tsx` (step 1)
- [x] Name field (required)
- [x] Description field (optional, textarea)
- [x] Start date picker (required)
- [x] Handicap system dropdown (Honor System, Golf Australia, Gross Only)
- [x] Stepper indicator showing step 1/4
- [x] Next button with validation

**Dependencies:** Task 4
**Estimated Time:** 3-4 hours
**Completed:** 2025-01-10

---

#### Step 2: Add Round
**Status:** ✅ Completed
**Command:**
```bash
/screen "AddRoundScreen - Step 2: Single round setup with manual course name entry (text input ONLY - NO search, NO API), date picker, game type fixed to Stableford (non-editable text). Show stepper progress. Uses React Native Paper TextInput and date picker."
```
**Deliverables:**
- [x] `src/components/competition/create/RoundDetailsStep.tsx` (step 2)
- [x] Course name text input (manual entry only - NO search functionality)
- [x] Date picker for round date
- [x] Game type display (Stableford, non-editable text label)
- [x] Stepper indicator showing step 2/4
- [x] Previous/Next buttons

**Dependencies:** Task 5
**Estimated Time:** 2-3 hours
**Completed:** 2025-01-10

---

#### Step 3: Add Players
**Status:** ✅ Completed
**Command:**
```bash
/screen "AddPlayersScreen - Step 3: Manual player entry with name and handicap fields. Display list of added players with remove buttons. Minimum 2 players validation."
```
**Deliverables:**
- [x] `src/components/competition/create/AddPlayersStep.tsx` (step 3)
- [x] Player name input
- [x] Handicap input (number)
- [x] Add Player button
- [x] List of added players with remove buttons
- [x] Validation: minimum 2 players
- [x] Stepper indicator showing step 3/4
- [x] Previous/Next buttons

**Dependencies:** Task 5
**Estimated Time:** 3-4 hours
**Completed:** 2025-01-10

---

#### Step 4: Review & Create
**Status:** ✅ Completed
**Command:**
```bash
/screen "ReviewCompetitionScreen - Step 4: Summary of all competition details with edit buttons for each section. Generate unique invite code (COMP-XXXXX format) and create competition in Supabase. Show success screen with shareable invite code. Uses React Native Paper Card and Button components."
```
**Deliverables:**
- [x] `src/components/competition/create/ReviewStep.tsx` (step 4)
- [x] Summary of competition details
- [x] Summary of round details
- [x] Summary of players list
- [x] Edit buttons to go back to each step
- [x] Generate invite code (COMP-XXXXX)
- [x] Create Competition button
- [x] Success screen with invite code (handled in wizard)
- [x] Share/copy invite code functionality

**Dependencies:** Task 5, Task 7
**Estimated Time:** 4-5 hours
**Completed:** 2025-01-10

---

### Task 7: Competition Data Hooks
**Status:** ✅ Completed

#### Create Competition Hook
**Status:** ✅ Completed
**Command:**
```bash
/hook "useCreateCompetition - TanStack Query mutation hook for creating competitions with optimistic updates, error handling, and cache invalidation. Include player associations and round creation in single transaction."
```
**Deliverables:**
- [x] `src/hooks/useCreateCompetition.ts`
- [x] Mutation function for competition creation
- [x] Transaction handling (competition + round + players)
- [x] Optimistic updates
- [x] Error handling
- [x] Cache invalidation

**Dependencies:** Task 5
**Estimated Time:** 3-4 hours
**Completed:** 2025-01-10

---

#### List Competitions Hook
**Status:** ✅ Completed
**Command:**
```bash
/hook "useCompetitions - Query hook to fetch all competitions for current user (as organizer or player). Include loading, error, and empty states. Configure appropriate staleTime for competition lists."
```
**Deliverables:**
- [x] `src/hooks/useCompetitions.ts`
- [x] Query function for user's competitions
- [x] Filter by role (organizer or player) - via `useFilteredCompetitions`
- [x] Loading state
- [x] Error handling
- [x] Empty state handling
- [x] Appropriate cache configuration (staleTime: 5min, gcTime: 10min)

**Dependencies:** Task 5
**Estimated Time:** 2-3 hours
**Completed:** 2025-12-01

---

### Task 8: Competition Components
**Status:** ✅ Completed

#### Competition Header Card
**Status:** ✅ Completed
**Command:**
```bash
/component "CompetitionHeaderCard - Reusable card showing competition name, dates, description, and status badge. Use React Native Paper Card component with design tokens from theme.ts for spacing and colors."
```
**Deliverables:**
- [x] `src/components/competition/CompetitionHeaderCard.tsx`
- [x] Competition name display (React Native Paper Text)
- [x] Date range display (DD/MM/YYYY format - Australian)
- [x] Description display
- [x] Status badge (Active, Upcoming, Completed - React Native Paper Badge)
- [x] Uses design tokens for spacing/colors
- [x] React Native Paper Card wrapper
- [x] Optional course name display
- [x] Optional player count display
- [x] Accessibility labels and hints
- [x] React.memo optimization

**Dependencies:** None
**Estimated Time:** 2 hours
**Completed:** 2025-12-01

---

#### Round Card
**Status:** ✅ Completed
**Command:**
```bash
/component "RoundCard - Display round details (course name, date, game type, status). Include Start Round button that navigates to scorecard. Show status badge (Upcoming/In Progress/Completed)."
```
**Deliverables:**
- [x] `src/components/competition/RoundCard.tsx`
- [x] Course name display with icon
- [x] Date display (DD/MM/YYYY Australian format)
- [x] Tee time display (optional)
- [x] Game type display (Stableford, Stroke Play, Match Play, etc.)
- [x] Status badge (Upcoming, In Progress, Completed)
- [x] Start Round / Continue Round / View Scorecard buttons
- [x] Navigation callbacks (onStartRound, onViewScorecard)
- [x] Round number display
- [x] Accessibility labels and hints
- [x] React.memo optimization

**Dependencies:** None
**Estimated Time:** 2 hours
**Completed:** 2025-12-01

---

## Week 2-3: Player Flow - Join & Dashboard

### Task 9: Join Competition Flow
**Status:** ✅ Completed

#### Join Competition Screen
**Status:** ✅ Completed
**Command:**
```bash
/screen "JoinCompetitionScreen - DEDICATED SCREEN (not inline on home) with input field for invite code with validation. On valid code, show competition preview (name, dates, organizer, player count) using React Native Paper Card. Join button adds player to competition and navigates to dashboard. Uses React Native Paper TextInput, Card, and Button components."
```
**Deliverables:**
- [x] `src/screens/player/JoinCompetitionScreen.tsx`
- [x] Invite code input field (React Native Paper TextInput)
- [x] Code validation (format: COMP-XXXXX)
- [x] Competition preview card (React Native Paper Card)
- [x] Join Competition button (React Native Paper Button)
- [x] Loading states (React Native Paper ActivityIndicator)
- [x] Error handling (invalid code, already joined)
- [x] Navigation to dashboard on success
- [x] Custom header (inline, consistent with other screens)
- [x] Auto-format invite code (uppercase, auto-add dash)
- [x] Australian date format (DD/MM/YYYY)
- [x] Accessibility labels and hints

**Dependencies:** Task 7
**Estimated Time:** 3-4 hours
**Completed:** 2025-12-01

---

#### Join Competition Hook
**Status:** ✅ Completed
**Command:**
```bash
/hook "useJoinCompetition - Mutation hook for joining competition via invite code. Validate code, check if already joined, add player to competition_players table, invalidate competition queries."
```
**Deliverables:**
- [x] `src/hooks/useJoinCompetition.ts`
- [x] Mutation function for joining competition
- [x] Invite code validation (normalizes to uppercase)
- [x] Duplicate join check
- [x] Add to competition_players table
- [x] Cache invalidation (competitions, players)
- [x] Error handling (typed errors: INVALID_CODE, ALREADY_JOINED, NOT_AUTHENTICATED, etc.)
- [x] `useValidateInviteCode` helper hook for preview before joining

**Dependencies:** Task 7
**Estimated Time:** 2-3 hours
**Completed:** 2025-12-01

---

### Task 10: Competition Dashboard
**Status:** ✅ Completed
**Command:**
```bash
/screen "CompetitionDashboardScreen - Display competition header card (name, dates, description), current standing (position + points), single round details card (course, date, Stableford), Start Round button, leaderboard preview (top 3 + current player), and View Full Leaderboard button. Include pull-to-refresh."
```
**Deliverables:**
- [x] `src/screens/player/CompetitionDashboardScreen.tsx`
- [x] Competition header (reuses CompetitionHeaderCard component)
- [x] Current standing card (position with ordinal + points display)
- [x] Round details card (reuses RoundCard component with Start Round / View Scorecard)
- [x] Start Round button (navigates to Scorecard screen)
- [x] Leaderboard preview (top 3 + current player with gap indicator)
- [x] View Full Leaderboard button (navigates to Leaderboard screen)
- [x] Pull-to-refresh functionality (RefreshControl)
- [x] Loading state (ActivityIndicator with message)
- [x] Error state (error icon, message, Retry button)
- [x] Empty states (no rounds, no scores)
- [x] Custom header with back navigation
- [x] TanStack Query integration for data fetching
- [x] Navigation types added to RootStackParamList
- [x] Screen registered in RootNavigator

**Dependencies:** Task 8, Task 9
**Estimated Time:** 4-5 hours
**Completed:** 2025-12-01

---

## Week 3-4: Scorecard Entry (CRITICAL - Offline Support)

### Task 11: Scorecard Entry Feature
**Status:** ✅ Completed
**Command:**
```bash
/feature "Scorecard Entry System - Offline-first scoring interface for 18-hole rounds. Display current hole number, par, stroke index. For each player in group, show name, handicap, score buttons (1-8 in grid), and selected score indicator. Include Previous/Next Hole navigation, progress bar (Hole X of 18), quick scorecard view (horizontal scroll 1-18 with status indicators). Auto-save all scores to Expo SQLite for offline support. Must work completely offline with sync on submit."
```
**Deliverables:**
- [x] `src/screens/player/ScorecardEntryScreen.tsx`
- [x] Offline-first architecture with Expo SQLite
- [x] Score entry interface for group (all players in pairing)
- [x] Hole navigation (Previous/Next buttons)
- [x] Progress tracking (HoleProgressBar component)
- [x] Quick scorecard view (QuickScorecardView component)
- [x] Auto-save to SQLite on every score change
- [x] Sync queue management via offline sync service
- [x] Zustand store for scorecard state (`src/store/scorecardStore.ts`)
- [x] Unsaved changes warning on back navigation

**Dependencies:** Task 10
**Estimated Time:** 12-16 hours (CRITICAL PATH)
**Completed:** 2025-12-01

---

### Task 12: Scorecard Components
**Status:** ✅ Completed

#### Player Score Card
**Status:** ✅ Completed
**Command:**
```bash
/component "ScorecardPlayerCard - Player score entry component with name, handicap display (HC: X), current score display (large circle), and score buttons grid (1-8). Active state when score selected. Touch targets minimum 44dp. Props: player, score, onScorePress, isCurrentPlayer."
```
**Deliverables:**
- [x] `src/components/scorecard/PlayerScoreCard.tsx`
- [x] Player name and handicap display
- [x] Strokes received badge (+N for handicap strokes on hole)
- [x] Current score display (large circle with color coding)
- [x] Score button grid (1-8 in 4x2 layout)
- [x] Active state styling with score color
- [x] 44dp minimum touch targets
- [x] Accessibility labels and states

**Dependencies:** Task 10
**Estimated Time:** 3-4 hours
**Completed:** 2025-12-01

---

#### Hole Progress Bar
**Status:** ✅ Completed
**Command:**
```bash
/component "HoleProgressBar - Progress indicator showing current hole and completion status. Shows hole X of 18, front/back nine indicator."
```
**Deliverables:**
- [x] `src/components/scorecard/HoleProgressBar.tsx`
- [x] Progress bar with fill based on completed holes
- [x] Current hole marker
- [x] "Hole X of 18" text
- [x] Front 9 / Back 9 indicator
- [x] Completed holes count

**Dependencies:** Task 10
**Estimated Time:** 2 hours
**Completed:** 2025-12-01

---

#### Quick Scorecard View
**Status:** ✅ Completed
**Command:**
```bash
/component "QuickScorecardView - Horizontal scrollable holes (1-18) with visual indicators: completed (checkmark), current (highlighted), incomplete (empty). Tap to jump to hole."
```
**Deliverables:**
- [x] `src/components/scorecard/QuickScorecardView.tsx`
- [x] Horizontal scroll (1-18 with Front/Back sections)
- [x] Visual status indicators (green dot for complete, border highlight for current)
- [x] Tap to jump functionality
- [x] Current hole highlighting with primary color
- [x] Auto-scroll to current hole on change
- [x] Score color coding (eagle/birdie/par/bogey/double)

**Dependencies:** Task 10
**Estimated Time:** 2-3 hours
**Completed:** 2025-12-01

---

#### Hole Header
**Status:** ✅ Completed
**Command:**
```bash
/component "HoleHeader - Display current hole number, par, and stroke index prominently."
```
**Deliverables:**
- [x] `src/components/scorecard/HoleHeader.tsx`
- [x] Large hole number display
- [x] Par value display
- [x] Stroke index display
- [x] Yardage display (optional)

**Dependencies:** Task 10
**Estimated Time:** 1 hour
**Completed:** 2025-12-01

---

#### Offline Indicator (Already completed in Task 2)
**Status:** ✅ Completed (previously)
**Note:** Already implemented as part of Task 2 - Common UI Components
**Location:** `src/components/common/OfflineIndicator.tsx`

---

### Task 13: Scorecard Data Hooks
**Status:** ✅ Completed

#### Fetch Scorecards Hook
**Status:** ✅ Completed
**Command:**
```bash
/hook "useScorecards - Query hook to fetch all scorecards for a round. Support offline mode by reading from Expo SQLite when no network. Include network status detection with useNetworkStatus hook. Auto-save to SQLite on fetch."
```
**Deliverables:**
- [x] `src/hooks/scorecard/useScorecards.ts`
- [x] `useScorecardsByRound` - Query function for round scorecards
- [x] Offline mode support (reads from SQLite when offline)
- [x] Network status detection via sync service
- [x] Automatic fallback to local data on API error
- [x] Query key factory for cache management
- [x] Configurable staleTime (5min) and gcTime (30min)

**Dependencies:** Task 11, Task 16
**Estimated Time:** 3-4 hours
**Completed:** 2025-12-01

---

#### Update Scorecard Hook
**Status:** ✅ Completed
**Command:**
```bash
/hook "useUpdateScorecard - Mutation hook for updating scorecard scores with optimistic updates. Always save to SQLite immediately (offline-first). Queue for sync if offline. On success, mark as synced. On error, keep in pending queue."
```
**Deliverables:**
- [x] `src/hooks/scorecard/useSubmitScorecard.ts` (includes `useUpdateScore`)
- [x] `useUpdateScore` mutation function for score updates
- [x] Optimistic updates with rollback on error
- [x] Immediate SQLite save via scorecard store
- [x] Sync queue management via offline sync service
- [x] Error handling with automatic rollback

**Dependencies:** Task 11, Task 16
**Estimated Time:** 4-5 hours
**Completed:** 2025-12-01

---

#### Submit Scorecard Hook
**Status:** ✅ Completed
**Command:**
```bash
/hook "useSubmitScorecard - Mutation for final scorecard submission. Calculate totals (gross, net, Stableford points), validate all 18 holes complete, sync to Supabase if online or queue if offline. Clear SQLite data on successful sync."
```
**Deliverables:**
- [x] `src/hooks/scorecard/useSubmitScorecard.ts`
- [x] `useSubmitScorecards` mutation for final submission
- [x] Saves to SQLite first (offline-first)
- [x] Queues for sync to server
- [x] Attempts immediate sync if online
- [x] Returns sync status (syncedImmediately flag)
- [x] Cache invalidation on success

**Dependencies:** Task 11, Task 16
**Estimated Time:** 4-5 hours
**Completed:** 2025-12-01

---

## Week 4: Review & Submit

### Task 14: Scorecard Review Screen
**Status:** ✅ Completed
**Command:**
```bash
/screen "ReviewScorecardScreen - Full scorecard table showing all 18 holes for all players. Columns: Hole | Par | Player 1 | Player 2 | Player 3. Include Front 9 (OUT) subtotal, Back 9 (IN) subtotal, totals row. Show gross total, net total (calculated from handicap), Stableford points total per player. Edit Scores and Submit All Scores buttons. Handle online/offline submission."
```
**Deliverables:**
- [x] `src/screens/player/ReviewScorecardScreen.tsx`
- [x] Full 18-hole scorecard table
- [x] Multi-column layout (Hole, Par, Players)
- [x] Front 9 (OUT) subtotals
- [x] Back 9 (IN) subtotals
- [x] Totals row (gross, net, Stableford)
- [x] Edit Scores button
- [x] Submit All Scores button
- [x] Online/offline submission handling

**Dependencies:** Task 13
**Estimated Time:** 5-6 hours
**Completed:** 2025-12-01

---

### Task 15: Scorecard Review Components
**Status:** ✅ Completed

#### Scorecard Summary Table
**Status:** ✅ Completed (embedded in ReviewScorecardScreen)
**Command:**
```bash
/component "ScorecardSummaryTable - Tabular scorecard display with hole numbers, pars, and player scores. Highlight current player column. Color-code scores (birdie green, par blue, bogey orange, double+ red)."
```
**Deliverables:**
- [x] `ScorecardTable` component (embedded in ReviewScorecardScreen.tsx)
- [x] Tabular layout (18 rows + subtotals + totals)
- [x] Hole numbers and pars
- [x] Player score columns
- [x] Current player highlighting
- [x] Color-coded scores (golf-specific colors)

**Dependencies:** Task 14
**Estimated Time:** 4-5 hours
**Completed:** 2025-12-01

---

#### Player Summary Card
**Status:** ✅ Completed
**Command:**
```bash
/component "PlayerSummaryCard - Per-player summary showing gross total, net total, Stableford points, position relative to par. Use golf-specific colors from design tokens. Uses React Native Paper Card."
```
**Deliverables:**
- [x] `src/components/scoring/PlayerSummaryCard.tsx`
- [x] Gross total display
- [x] Net total display
- [x] Stableford points display
- [x] Position relative to par
- [x] Golf-specific color coding (from design tokens)
- [x] React Native Paper Card wrapper

**Dependencies:** Task 14
**Estimated Time:** 2-3 hours
**Completed:** 2025-12-01

---

## Week 5: Leaderboard & Polish

### Task 16: Network Status Hook
**Status:** ✅ Completed
**Command:**
```bash
/hook "useNetworkStatus - Custom hook using NetInfo to detect online/offline status, internet reachability. Return isConnected, isInternetReachable, isOffline boolean."
```
**Deliverables:**
- [x] `src/hooks/scorecard/useOfflineSync.ts` (includes `useIsOnline`)
- [x] NetInfo integration via sync service
- [x] `useIsOnline` hook for simple online/offline status
- [x] `useOfflineSync` hook with full sync state (status, pendingCount, error)
- [x] Real-time status updates via subscription
- [x] Integrated with offline sync system

**Dependencies:** None
**Estimated Time:** 1-2 hours
**Completed:** 2025-12-01

---

### Task 17: Leaderboard Screen
**Status:** ✅ Completed
**Command:**
```bash
/screen "LeaderboardScreen - Display sorted list of players by Stableford points (descending). Columns: Position | Player Name | Handicap | Points. Highlight current player row, show trophy icon for 1st place. Pull-to-refresh to reload from Supabase. Manual refresh button. Handle ties with same position number."
```
**Deliverables:**
- [x] `src/screens/player/LeaderboardScreen.tsx`
- [x] Sorted player list (by points, descending)
- [x] Position | Name | Handicap | Points columns
- [x] Current player highlighting
- [x] Trophy icon for 1st place
- [x] Pull-to-refresh
- [x] Manual refresh button
- [x] Tie handling (same position)

**Dependencies:** Task 18
**Estimated Time:** 3-4 hours
**Completed:** 2025-12-01

---

### Task 18: Leaderboard Hook
**Status:** ✅ Completed
**Command:**
```bash
/hook "useLeaderboard - Query hook to fetch leaderboard for competition. Calculate Stableford points from scorecards, sort by total points descending, handle ties. Configure refetchInterval for manual refresh only (no auto-refresh for MVP)."
```
**Deliverables:**
- [x] `src/hooks/useLeaderboard.ts`
- [x] Query function for leaderboard
- [x] Stableford calculation
- [x] Sort by points (descending)
- [x] Tie handling logic
- [x] Auto-refresh with configurable interval (30s default)
- [x] `useRoundLeaderboard` for round-specific leaderboards

**Dependencies:** None
**Estimated Time:** 3-4 hours
**Completed:** 2025-12-01

---

### Task 19: Leaderboard Component
**Status:** ✅ Completed (embedded in LeaderboardScreen)
**Command:**
```bash
/component "LeaderboardRow - Single row showing position, player name, handicap, and total points. Highlight if current player. Trophy icon for 1st place. Use design tokens."
```
**Deliverables:**
- [x] Leaderboard row rendering (embedded in LeaderboardScreen.tsx)
- [x] Position display with tie indicator
- [x] Player name display (shows "You" for current user)
- [x] Handicap display (HC column)
- [x] Total points display
- [x] Current player highlighting
- [x] Trophy icon for 1st place
- [x] Design tokens usage
- [x] Accessibility labels

**Dependencies:** Task 17
**Estimated Time:** 2 hours
**Completed:** 2025-12-01

---

### Task 20: Error & Empty State Components
**Status:** ✅ Completed

#### Error State Component
**Status:** ✅ Completed
**Command:**
```bash
/component "ErrorState - Reusable error display component with error message, friendly icon, and Retry button. Props: error, onRetry. Use React Native Paper components and design tokens."
```
**Deliverables:**
- [x] `src/components/common/ErrorState.tsx`
- [x] Error message display (React Native Paper Text)
- [x] Friendly error icon (React Native Paper Icon - alert-circle-outline)
- [x] Retry button (React Native Paper Button with refresh icon)
- [x] Props: error (string or Error), onRetry (function), title, retryLabel, compact
- [x] React Native Paper components
- [x] Design tokens for spacing/colors
- [x] Compact variant for inline error states
- [x] Accessibility labels and roles
- [x] Exported from barrel file

**Dependencies:** None
**Estimated Time:** 1-2 hours
**Completed:** 2025-12-01

---

#### Empty State Component
**Status:** ✅ Completed
**Command:**
```bash
/component "EmptyState - Reusable empty state component with icon, message, and optional action button. Props: title, message, actionLabel, onAction. Uses React Native Paper components."
```
**Deliverables:**
- [x] `src/components/common/EmptyState.tsx`
- [x] Empty state icon (React Native Paper Icon - configurable)
- [x] Title and message (React Native Paper Text)
- [x] Optional action button (React Native Paper Button)
- [x] Props: title, message, icon, actionLabel?, onAction?, compact, iconColor
- [x] React Native Paper components
- [x] Design tokens for spacing/colors
- [x] Preset icon type for golf app scenarios
- [x] Compact variant for inline empty states
- [x] Accessibility labels and roles
- [x] Exported from barrel file

**Dependencies:** None
**Estimated Time:** 1-2 hours
**Completed:** 2025-12-01

---

#### Loading Spinner Component
**Status:** ✅ Completed
**Command:**
```bash
/component "LoadingSpinner - Reusable centered loading spinner component using React Native Paper ActivityIndicator. Props: size (sm, md, lg)."
```
**Deliverables:**
- [x] `src/components/common/LoadingSpinner.tsx`
- [x] Centered layout (fullScreen mode)
- [x] Size variants (sm: 24dp, md: 36dp, lg: 48dp)
- [x] React Native Paper ActivityIndicator
- [x] Optional loading text (React Native Paper Text)
- [x] Inline mode (fullScreen={false}) for row-based layouts
- [x] Custom color support
- [x] Accessibility labels and busy state
- [x] Exported from barrel file

**Dependencies:** None
**Estimated Time:** 1 hour
**Completed:** 2025-12-01

---

### Task 21: Offline Sync System
**Status:** ✅ Completed
**Command:**
```bash
/feature "Offline Sync System - Background sync queue using Expo SQLite. Store pending operations (scorecard updates, submissions) in pending_syncs table. On app open or network reconnect, attempt to sync all pending items. Show sync status in OfflineIndicator component. Manual Sync Now button. Conflict resolution: last write wins."
```
**Deliverables:**
- [x] `src/services/offline/database.ts` - SQLite helpers
  - [x] Database initialization with all tables
  - [x] Scorecard CRUD operations
  - [x] Hole scores management
  - [x] Pending syncs queue operations
  - [x] Holes/course data storage
- [x] `src/services/offline/sync.ts` - Sync logic
  - [x] NetInfo integration for network state
  - [x] Auto-sync on network reconnect
  - [x] Manual sync trigger (`manualSync`)
  - [x] Sync state subscription for UI updates
  - [x] `queueScorecardSync` for queuing updates
  - [x] Max retry count with automatic removal
- [x] Pending syncs queue (pending_syncs table)
- [x] Auto-sync on network reconnect (via NetInfo listener)
- [x] Manual sync trigger via `triggerSync` in useOfflineSync hook
- [x] Conflict resolution: last write wins (simple overwrite)
- [x] Sync status tracking (idle, syncing, error, offline)

**Dependencies:** Task 16
**Estimated Time:** 6-8 hours
**Completed:** 2025-12-01

---

## Week 5-6: Testing & Bug Fixes

### Task 22: End-to-End Testing
**Status:** ⬜ Not Started
**Command:**
```bash
/test "MVP Phase 1 E2E Tests - Test critical flows: 1) Admin creates competition with players, 2) Player joins via invite code, 3) Player scores full 18 holes offline, 4) Player submits scorecard, 5) Leaderboard displays correctly. Test on both iOS and Android simulators. Test offline scenarios (airplane mode on/off during scoring)."
```
**Deliverables:**
- [ ] E2E test suite setup
- [ ] Test: Admin creates competition
- [ ] Test: Player joins via invite code
- [ ] Test: Player scores 18 holes offline
- [ ] Test: Player submits scorecard
- [ ] Test: Leaderboard displays correctly
- [ ] iOS simulator testing
- [ ] Android simulator testing
- [ ] Offline scenario testing (airplane mode)

**Dependencies:** All features complete
**Estimated Time:** 8-10 hours

---

### Task 23: Code Review
**Status:** ⬜ Not Started
**Command:**
```bash
/review "Review all MVP Phase 1 code for best practices, proper TypeScript types, accessibility (labels, roles, touch targets), error handling, and golf app-specific guidelines (handicap format, Australian dates, score colors). Check for code duplication and opportunities for shared components."
```
**Deliverables:**
- [ ] TypeScript type safety review
- [ ] Accessibility audit (labels, roles, 44dp targets)
- [ ] Error handling review
- [ ] Golf app guidelines compliance
  - [ ] Handicap format (HC: X)
  - [ ] Australian date format (DD/MM/YYYY)
  - [ ] Score color coding
- [ ] Code duplication analysis
- [ ] Shared component opportunities

**Dependencies:** All features complete
**Estimated Time:** 4-6 hours

---

### Task 24: Refactoring
**Status:** 🔄 Partially Complete (Scoring utilities done early)
**Command:**
```bash
/refactor "Refactor repeated patterns into shared utilities: scoring calculations (Stableford points, net scores, handicap strokes), date formatting (Australian DD/MM/YYYY), invite code generation, scorecard validation."
```
**Deliverables:**
- [x] `src/utils/scoring.ts` - Scoring utilities ✅ (Completed early for competition creation)
  - [x] Stableford points calculation
  - [x] Net score calculation
  - [x] Handicap stroke allocation
  - [x] Match play calculations
  - [x] Statistics calculations
  - [x] Leaderboard sorting
- [ ] `src/utils/dateFormat.ts` - Date formatting
  - [ ] Australian date format (DD/MM/YYYY)
  - [ ] Date range display
- [ ] `src/utils/inviteCode.ts` - Invite code generation
  - [ ] Generate unique code (COMP-XXXXX)
  - [ ] Validate code format
- [ ] `src/utils/scorecardValidation.ts` - Scorecard validation
  - [ ] 18-hole completion check
  - [ ] Score range validation

**Dependencies:** Task 23 (code review)
**Estimated Time:** 4-6 hours (2-3 hours remaining for date/invite/validation utils)
**Note:** Scoring utilities completed early as they were needed for competition setup

---

## Progress Summary

### Completion Statistics
- **Total Tasks:** 24
- **Completed:** 21 ✅ (88%)
- **Partially Complete:** 1 🔄 (4%)
- **Not Started:** 2 ⬜ (8%)

### Week 1 Progress (Database Schema & Auth Setup)
- ✅ Task 1: Database Schema Design
- ✅ Task 2: Common UI Components (PageHeader, OfflineIndicator)
- ✅ Task 3: Authentication Screens (Login, Signup)
- ✅ Task 4: Authentication Hook

**Week 1 Status:** ✅ COMPLETE (4/4 tasks - 100%)

### Week 2 Progress (Admin Flow - Competition Creation)
- ✅ Task 5: Competition Creation Feature
- ✅ Task 6: Competition Creation Screens (all 4 steps)
- ✅ Task 7: Create Competition Hook (useCreateCompetition + useCompetitions)
- ✅ Task 8: Competition Components (CompetitionHeaderCard, RoundCard)

**Week 2 Status:** ✅ COMPLETE (4/4 tasks - 100%)

### Week 2-3 Progress (Player Flow - Join & Dashboard)
- ✅ Task 9: Join Competition Flow (JoinCompetitionScreen + useJoinCompetition)
- ✅ Task 10: Competition Dashboard (CompetitionDashboardScreen complete)

**Week 2-3 Status:** ✅ COMPLETE (2/2 tasks - 100%)

### Week 3-4 Progress (Scorecard Entry)
- ✅ Task 11: Scorecard Entry Feature (ScorecardEntryScreen with full offline support)
- ✅ Task 12: Scorecard Components (PlayerScoreCard, HoleProgressBar, QuickScorecardView, HoleHeader)
- ✅ Task 13: Scorecard Data Hooks (useScorecards, useSubmitScorecard, useUpdateScore)

**Week 3-4 Status:** ✅ COMPLETE (3/3 tasks - 100%)

### Week 4 Progress (Review & Submit)
- ✅ Task 14: Scorecard Review Screen
- ✅ Task 15: Scorecard Review Components (ScorecardSummaryTable, PlayerSummaryCard)

**Week 4 Status:** ✅ COMPLETE (2/2 tasks - 100%)

### Week 5 Progress (Leaderboard & Polish)
- ✅ Task 16: Network Status Hook (useOfflineSync, useIsOnline)
- ✅ Task 17: Leaderboard Screen
- ✅ Task 18: Leaderboard Hook
- ✅ Task 19: Leaderboard Component
- ✅ Task 20: Error & Empty State Components (ErrorState, EmptyState, LoadingSpinner)
- ✅ Task 21: Offline Sync System (database.ts + sync.ts fully implemented)

**Week 5 Status:** ✅ COMPLETE (6/6 tasks - 100%)

### Week 5-6 Progress (Testing & Bug Fixes)
- ⬜ Task 22: E2E Testing (not yet started)
- ⬜ Task 23: Code Review (not yet started)
- 🔄 Task 24: Refactoring - Scoring utilities completed early (50% done)

**Week 5-6 Status:** 🔄 IN PROGRESS (0.5/3 tasks - 17%)

### Additional Implemented Items (Supporting Infrastructure)
These items support the main tasks and were implemented alongside them:
- ✅ `src/store/scorecardStore.ts` - Zustand store for scorecard state management
- ✅ `src/store/competitionStore.ts` - Zustand store for competition state
- ✅ `src/navigation/types.ts` - Full navigation type definitions
- ✅ `src/navigation/RootNavigator.tsx` - Root navigation setup
- ✅ `src/hooks/queryKeys.ts` - TanStack Query key definitions
- ✅ `src/hooks/scorecard/index.ts` - Scorecard hooks barrel export
- ✅ `src/services/supabase/client.ts` - Supabase client configuration
- ✅ `src/services/offline/index.ts` - Offline services barrel export
- ✅ `src/components/scoring/index.ts` - Scoring components barrel export
- ✅ `src/components/scorecard/index.ts` - Scorecard components barrel export
- ✅ `src/components/competition/index.ts` - Competition components barrel export

### Time Estimates
- **Week 1 (Setup):** 15-21 hours (added PageHeader + OfflineIndicator)
- **Week 2 (Admin Flow):** 27-35 hours
- **Week 2-3 (Player Flow):** 9-12 hours
- **Week 3-4 (Scorecard - CRITICAL):** 30-40 hours
- **Week 4 (Review):** 11-14 hours
- **Week 5 (Leaderboard):** 16-21 hours
- **Week 5-6 (Testing):** 16-22 hours

**Total Estimated:** 124-165 hours (4-6 weeks @ 30-40 hours/week)

---

## Critical Path

The following tasks are on the critical path and must be completed in order:

1. ✅ **Database Schema** (Task 1) → Blocks all other tasks
2. ✅ **Common Components** (Task 2: PageHeader, OfflineIndicator) → Needed by all screens
3. ✅ **Authentication** (Tasks 3-4) → Blocks all user flows
4. ✅ **Competition Creation** (Tasks 5-8) → Blocks player flows
5. ✅ **Join Competition** (Tasks 9-10) → Join screen and dashboard complete
6. ✅ **Scorecard Entry** (Tasks 11-13) → Core value prop - COMPLETE
7. ✅ **Offline Sync** (Task 21) → Required for scorecard reliability - COMPLETE
8. ✅ **Review & Submit** (Tasks 14-15) → Completes scoring flow
9. ✅ **Leaderboard** (Tasks 17-19) → Validates competition results
10. ✅ **UI States** (Task 20) → Error/Empty/Loading components
11. ⬜ **Testing & Review** (Tasks 22-24) → Final validation

---

## Success Metrics

### MVP Validation Criteria
- [ ] 5+ test competitions created
- [ ] 20+ unique players signed up
- [ ] 10+ rounds completed
- [ ] 50+ scorecards submitted
- [ ] Offline scoring works reliably (95%+ success rate)
- [ ] < 5% error rate on scorecard submission
- [ ] App feels fast and responsive (< 100ms scorecard render)

### Performance Targets
- [ ] Initial load: < 2s on 4G
- [ ] Scorecard screen render: < 100ms
- [ ] Offline score save: Instant (< 50ms)
- [ ] Leaderboard load: < 1s

---

## Known Limitations (MVP Phase 1)

**By Design (Deferred to Phase 2):**
- ❌ Single round only (no multi-round competitions)
- ❌ Stableford scoring only (no Stroke Play, Match Play, etc.)
- ❌ Manual course entry (no API integration)
- ❌ Manual pairings (no auto-generation)
- ❌ Pull-to-refresh leaderboard only (no real-time updates)
- ❌ Manual sync (no background sync for MVP)
- ❌ No email/SMS notifications
- ❌ No detailed statistics (putts, fairways, GIR)
- ❌ No CSV import for players
- ❌ No playing partner confirmation
- ❌ No profile photos
- ❌ No tee time scheduling

---

## Notes

### Current Status & Next Steps
1. ✅ **Task 1 (Database Schema)** - DONE
2. ✅ **Task 2 (Common Components)** - DONE
3. ✅ **Tasks 3-4 (Auth)** - DONE
4. ✅ **Tasks 5-8 (Competition Creation)** - DONE
5. ✅ **Task 9 (Join Competition)** - DONE
6. ✅ **Task 10 (Competition Dashboard)** - DONE - Player flow complete!
7. ✅ **Tasks 11-13 (Scorecard Entry)** - DONE - Core value proposition complete!
8. ✅ **Tasks 14-15, 17-19 (Review & Leaderboard)** - DONE
9. ✅ **Task 16, 20, 21 (Network Status, UI States & Offline Sync)** - DONE
10. ⬜ **NEXT: Task 22 (E2E Testing)** - Validate all flows work correctly
11. ⬜ **THEN: Task 23 (Code Review)** - Quality audit
12. 🔄 **Task 24 (Refactoring)** - Complete remaining utilities (date, invite code, validation)

### Command Usage
- Use `/feature` for large, multi-component features (Competition Creation, Scorecard Entry, Offline Sync)
- Use `/screen` for individual screen implementations
- Use `/component` for reusable UI components
- Use `/hook` for data fetching/mutation hooks
- Use `/db` for database schema design
- Use `/test` for testing suites
- Use `/review` for code quality audits
- Use `/refactor` for cleanup and optimization

### Development Tips
- **USE REACT NATIVE PAPER** - All components must use React Native Paper (Material Design 3), NOT NativeBase
- **Offline-first is non-negotiable** for scorecard entry - build this correctly from the start
- Use **design tokens** from `@/constants/theme.ts` for all styling
- Follow **Australian conventions** (DD/MM/YYYY dates, HC: X handicaps)
- **Course entry is MANUAL ONLY** - Simple text input for course name, NO search API in MVP Phase 1
- Ensure **44dp minimum touch targets** for all interactive elements
- Test **offline scenarios frequently** during development
- Keep **TypeScript strict** - no `any` types
- Use **PageHeader component** on all screens for consistency

---

**Last Updated:** 2025-12-02
**Next Review:** After completing E2E Testing (Task 22)
**Current Sprint:** Week 5-6 - Testing & Validation (Core features complete!)

### 🎉 Major Milestone Achieved
The **complete player flow** is now functional! This includes:
- Competition Dashboard connecting join → scorecard flow
- Full 18-hole scorecard entry with offline support
- SQLite database for local storage
- Background sync system with queue management
- Score entry, review, and submission
- Leaderboard display

**Remaining Work:**
- Task 22: E2E Testing (validation)
- Task 23: Code Review (quality audit)
- Task 24: Refactoring - remaining utilities (date formatting, invite code, scorecard validation)

