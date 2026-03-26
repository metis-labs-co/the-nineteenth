# MVP Phase 1 - Core Features

**Timeline:** 4-6 weeks
**Goal:** Validate core concept with absolute minimum viable feature set
**Status:** ✅ Complete

---

## Philosophy

Phase 1 is about **validation, not perfection**. Build the simplest version that allows:
- An organizer to create a single-round competition
- Players to join and score their round
- Everyone to see basic standings

**Key Constraints:**
- ✅ Single round only (no multi-round competitions)
- ✅ Stableford scoring only (no other game types)
- ✅ Manual everything (no auto-pairing, no API integrations)
- ✅ Basic offline support (save scores locally, sync on submit)
- ✅ Simple refresh leaderboard (no real-time updates)

---

## Features Included

### 1. Authentication (Week 1)
**Scope:** Bare minimum to identify users

- [x] Email + password sign up
- [x] Email + password login
- [x] Simple profile (name only)
- [x] Logout

**Out of Scope:**
- ❌ Magic links (Phase 2)
- ❌ Social login (Phase 2)
- ❌ Password reset (Phase 2)
- ❌ Email verification (Phase 2)
- ❌ Profile photos (Phase 2)

---

### 2. Admin: Create Competition (Week 1-2)

**Step 1: Competition Details**
- [x] Competition name (required)
- [x] Description (optional, text area)
- [x] Start date (required, date picker)
- [x] Handicap system (dropdown: Honor System, WHS, Gross Only)
- [x] Private competition (checkbox, default checked)

**Step 2: Add Round (SINGLE ROUND ONLY)**
- [x] Course name (text input, manual entry)
- [x] Date (date picker)
- [x] Game type: **Stableford only** (fixed, not a dropdown)

**Step 3: Add Players**
- [x] Manual entry: Name + Handicap
- [x] List of added players
- [x] Remove player button
- [x] Minimum 2 players required

**Step 4: Review & Create**
- [x] Show all details for review
- [x] Edit buttons to go back to each step
- [x] Generate unique invite code (e.g., COMP-94821)
- [x] Create competition in Supabase
- [x] Show success screen with invite code

**Out of Scope:**
- ❌ Multiple rounds (Phase 2)
- ❌ Course search API (Phase 2)
- ❌ CSV import (Phase 2)
- ❌ Auto-pairing algorithm (Phase 2)
- ❌ Tee time scheduling (Phase 2)
- ❌ Email/SMS invitations (Phase 2)
- ❌ Player search from previous competitions (Phase 2)

---

### 3. Player: Join Competition (Week 2)

**Join Flow:**
- [x] Input invite code screen
- [x] Validate code with Supabase
- [x] Show competition details preview
- [x] "Join Competition" button
- [x] Add player to competition in database
- [x] Navigate to competition dashboard

**Out of Scope:**
- ❌ QR code scanning (Phase 2)
- ❌ Email invitation links (Phase 2)
- ❌ Accept/decline invitations (Phase 2)

---

### 4. Player: Competition Dashboard (Week 2-3)

**Display:**
- [x] Competition name and details card
- [x] Current standing (position + points)
- [x] Round details card:
  - Course name
  - Date
  - Game type (Stableford)
  - Status (Upcoming / In Progress / Completed)
- [x] "Start Round" button (if round not completed)
- [x] Leaderboard preview (top 3 + current player)
- [x] "View Full Leaderboard" button

**Out of Scope:**
- ❌ Multiple rounds list (Phase 2)
- ❌ Round scheduling with tee times (Phase 2)
- ❌ Playing partners list (Phase 2)
- ❌ Statistics dashboard (Phase 2)
- ❌ Round-by-round history (Phase 2)

---

### 5. Player: Scorecard Entry (Week 3-4)

**Critical Flow - Must Work Offline**

**Header:**
- [x] Course name
- [x] Progress indicator (Hole X of 18)
- [x] Progress bar

**Hole Info:**
- [x] Hole number (large, centered)
- [x] Par (from course data)
- [x] Stroke index (for handicap calculation)

**Score Entry (for each player in group):**
- [x] Player name + handicap
- [x] Current score display (large number or "-")
- [x] Score buttons: 1, 2, 3, 4, 5, 6, 7, 8 (grid layout)
- [x] Active state when score selected
- [x] Highlight current player's card (border)

**Navigation:**
- [x] "Previous Hole" button (disabled on hole 1)
- [x] "Next Hole" button (holes 1-17)
- [x] "Review & Submit" button (hole 18)

**Quick Scorecard View:**
- [x] Horizontal scrollable holes (1-18)
- [x] Visual indicator: completed (✓), current (blue), incomplete (-)
- [x] Tap hole to jump to it

**Offline Support:**
- [x] Save all scores to Expo SQLite as they're entered
- [x] Work completely offline
- [x] Show offline indicator if no network

**Out of Scope:**
- ❌ Detailed stats (putts, fairways, GIR) - Phase 2
- ❌ Photo uploads (Phase 2)
- ❌ GPS shot tracking (Phase 2)
- ❌ Live sync while scoring (Phase 2)
- ❌ Playing partner confirmation (Phase 2)

---

### 6. Player: Review & Submit (Week 4)

**Scorecard Review:**
- [x] Full scorecard table (all 18 holes, all players)
- [x] Hole | Par | Player 1 | Player 2 | Player 3 columns
- [x] Front 9 (OUT) subtotal
- [x] Back 9 (IN) subtotal (if implemented)
- [x] Total scores

**Score Summaries (per player):**
- [x] Gross total
- [x] Net total (calculated from handicap)
- [x] Stableford points total
- [x] Position relative to par

**Actions:**
- [x] "Edit Scores" button → back to scorecard
- [x] "Submit All Scores" button → send to Supabase
- [x] Success confirmation screen
- [x] Navigate back to competition dashboard

**Sync Logic:**
- [x] If online: submit directly to Supabase
- [x] If offline: queue for sync, show pending status
- [x] On successful submit: clear local SQLite data
- [x] Show success message with final score

**Out of Scope:**
- ❌ Playing partner digital signatures (Phase 2)
- ❌ Comments/notes on round (Phase 2)
- ❌ Photo uploads (Phase 2)
- ❌ Social sharing (Phase 2)

---

### 7. Leaderboard (Week 5)

**Display:**
- [x] Competition name header
- [x] Game type (Stableford)
- [x] Sorted by total points (descending)
- [x] Position | Player Name | Handicap | Points
- [x] Highlight current player row
- [x] Trophy icon for 1st place

**Refresh:**
- [x] Pull-to-refresh to reload from Supabase
- [x] Manual refresh button
- [x] Loading indicator while fetching

**Calculation:**
- [x] Fetch all scorecards for the round
- [x] Calculate Stableford points per player
- [x] Sort by total points
- [x] Handle ties (same position number)

**Out of Scope:**
- ❌ Real-time updates (Phase 2)
- ❌ Round-by-round breakdown (Phase 2)
- ❌ Gross vs Net toggle (Phase 2)
- ❌ Statistics (average score, best hole, etc.) - Phase 2
- ❌ Export to PDF/CSV (Phase 2)
- ❌ Social sharing (Phase 2)

---

### 8. Offline Support (Week 3-5)

**What Works Offline:**
- ✅ View competition details (cached)
- ✅ Enter scores for entire group
- ✅ Navigate between holes
- ✅ Review scorecard
- ✅ View cached leaderboard (stale data)

**Sync Strategy:**
- [x] Save all scorecard data to Expo SQLite
- [x] Queue scorecard submission if offline
- [x] Show "Pending Sync" indicator
- [x] On app open: attempt to sync pending scorecards
- [x] Manual "Sync Now" button
- [x] Clear local data after successful sync

**Conflict Resolution:**
- **Simple Rule:** Last write wins (no complex merge logic)
- If scorecard already submitted: show error, discard local copy

**Out of Scope:**
- ❌ Background sync (Phase 2)
- ❌ Automatic retry logic (Phase 2)
- ❌ Conflict resolution UI (Phase 2)
- ❌ Offline competition creation (Phase 2)

---

### 9. Error Handling (Week 5-6)

**Network Errors:**
- [x] Show user-friendly error messages
- [x] "Retry" button for failed operations
- [x] Offline mode indicator (persistent banner)

**Validation Errors:**
- [x] Form validation (required fields)
- [x] Invalid invite code message
- [x] Duplicate player names warning
- [x] Scorecard incomplete warning (missing holes)

**Edge Cases:**
- [x] Handle competition not found
- [x] Handle player already in competition
- [x] Handle scorecard already submitted
- [x] Handle deleted competition

**Out of Scope:**
- ❌ Sentry error tracking (Phase 2)
- ❌ Detailed error logs (Phase 2)
- ❌ Analytics (Phase 2)

---

## Technical Implementation

### Tech Stack
- **Expo** (SDK 50+)
- **React Native** with TypeScript
- **React Native Paper** (Material Design 3 UI)
- **React Navigation** (Stack navigator)
- **TanStack Query** (API state management)
- **Zustand** (Client state)
- **Expo SQLite** (Offline storage)
- **Supabase** (Backend: PostgreSQL + Auth)

### Database Tables (Supabase)
1. `users` - Player profiles
2. `competitions` - Competition metadata
3. `rounds` - Single round per competition
4. `courses` - Course data (name only for MVP)
5. `competition_players` - Join table
6. `scorecards` - Player scores (one per player per round)

See [database-schema.sql](./database-schema.sql) for full schema.

### File Structure
```
src/
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.tsx
│   │   └── SignupScreen.tsx
│   ├── admin/
│   │   ├── CreateCompetitionScreen.tsx
│   │   ├── AddRoundScreen.tsx
│   │   ├── AddPlayersScreen.tsx
│   │   └── ReviewScreen.tsx
│   └── player/
│       ├── JoinCompetitionScreen.tsx
│       ├── CompetitionDashboardScreen.tsx
│       ├── ScorecardScreen.tsx
│       ├── ReviewScorecardScreen.tsx
│       └── LeaderboardScreen.tsx
├── components/
│   ├── common/
│   ├── competition/
│   └── scorecard/
├── services/
│   ├── supabase.ts
│   └── offline/
│       ├── database.ts
│       └── sync.ts
├── hooks/
│   ├── useCompetition.ts
│   ├── useScorecard.ts
│   └── useNetworkStatus.ts
├── store/
│   ├── authStore.ts
│   ├── scorecardStore.ts
│   └── offlineStore.ts
├── utils/
│   ├── scoring.ts
│   └── handicap.ts
└── constants/
    └── theme.ts
```

---

## Success Metrics

### Validation Criteria
- ✅ 5+ test competitions created
- ✅ 20+ unique players
- ✅ 10+ rounds completed
- ✅ 50+ scorecards submitted
- ✅ Offline scoring works reliably
- ✅ < 5% error rate on score submission
- ✅ App feels fast and responsive

### Performance Targets
- Initial load: < 2s on 4G
- Scorecard screen render: < 100ms
- Offline score save: Instant
- Leaderboard load: < 1s

---

## Testing Checklist

### Manual Testing
- [x] Create competition end-to-end
- [x] Join competition with code
- [x] Score full 18 holes offline
- [x] Submit scorecard
- [x] View leaderboard
- [x] Test on iOS device
- [x] Test on Android device
- [x] Test with poor network (airplane mode on/off)
- [x] Test with multiple players in group

### Edge Cases
- [x] Invalid invite code
- [x] Duplicate player names
- [x] Submit incomplete scorecard
- [x] Join already-joined competition
- [x] Network failure during submit

---

## Timeline Breakdown

### Week 1: Setup + Auth
- Project setup (Expo, Supabase, React Native Paper)
- Authentication (login, signup)
- Basic navigation structure

### Week 2: Admin Flow
- Create competition screens (4 steps)
- Supabase integration
- Invite code generation

### Week 3: Player Flow + Scoring
- Join competition
- Competition dashboard
- Scorecard entry screen (offline support)

### Week 4: Submit + Leaderboard
- Review scorecard
- Submit to Supabase
- Leaderboard display
- Sync logic

### Week 5: Polish + Testing
- Error handling
- Loading states
- Edge cases
- Bug fixes

### Week 6: Final Testing
- End-to-end testing
- iOS and Android testing
- Performance optimization
- Documentation

---

## Technical Implementation Guides

For detailed implementation details, see:

- **[OFFLINE_ARCHITECTURE.md](guides/OFFLINE_ARCHITECTURE.md)** - Complete offline implementation guide for scorecard entry
- **[ALGORITHMS.md](guides/ALGORITHMS.md)** - Stableford scoring calculations and handicap formulas
- **[STYLING_GUIDE.md](guides/STYLING_GUIDE.md)** - React Native styling patterns and design tokens
- **[DATABASE_SCHEMA.md](database/DATABASE_SCHEMA.md)** - Complete database schema with SQL and TypeScript types

---

## What Came Next

Phase 2 and Phase 3 features have been implemented, including:
- Multi-round competitions
- Multiple game types (Stroke Play, Match Play, Team formats)
- Auto-pairing algorithm
- Course search API integration (GolfAPI.io)
- Real-time leaderboard updates
- Push notifications
- Team formats (Ambrose, Best Ball, Scramble, Shamble)
- Social features (friends, player comparison)
- Achievements and cosmetics system
- Leagues (cross-course WHS handicap differential competition)
- Skins and Wolf side-games with prize pools
- Subscription tier system

---

*Last Updated: February 2026*
