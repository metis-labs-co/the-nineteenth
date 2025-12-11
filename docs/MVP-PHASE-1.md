# MVP Phase 1 - Core Features

**Timeline:** 4-6 weeks
**Goal:** Validate core concept with absolute minimum viable feature set
**Status:** 🎯 In Planning

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

- [ ] Email + password sign up
- [ ] Email + password login
- [ ] Simple profile (name only)
- [ ] Logout

**Out of Scope:**
- ❌ Magic links (Phase 2)
- ❌ Social login (Phase 2)
- ❌ Password reset (Phase 2)
- ❌ Email verification (Phase 2)
- ❌ Profile photos (Phase 2)

---

### 2. Admin: Create Competition (Week 1-2)

**Step 1: Competition Details**
- [ ] Competition name (required)
- [ ] Description (optional, text area)
- [ ] Start date (required, date picker)
- [ ] Handicap system (dropdown: Honor System, Golf Australia, Gross Only)
- [ ] Private competition (checkbox, default checked)

**Step 2: Add Round (SINGLE ROUND ONLY)**
- [ ] Course name (text input, manual entry)
- [ ] Date (date picker)
- [ ] Game type: **Stableford only** (fixed, not a dropdown)

**Step 3: Add Players**
- [ ] Manual entry: Name + Handicap
- [ ] List of added players
- [ ] Remove player button
- [ ] Minimum 2 players required

**Step 4: Review & Create**
- [ ] Show all details for review
- [ ] Edit buttons to go back to each step
- [ ] Generate unique invite code (e.g., COMP-94821)
- [ ] Create competition in Supabase
- [ ] Show success screen with invite code

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
- [ ] Input invite code screen
- [ ] Validate code with Supabase
- [ ] Show competition details preview
- [ ] "Join Competition" button
- [ ] Add player to competition in database
- [ ] Navigate to competition dashboard

**Out of Scope:**
- ❌ QR code scanning (Phase 2)
- ❌ Email invitation links (Phase 2)
- ❌ Accept/decline invitations (Phase 2)

---

### 4. Player: Competition Dashboard (Week 2-3)

**Display:**
- [ ] Competition name and details card
- [ ] Current standing (position + points)
- [ ] Round details card:
  - Course name
  - Date
  - Game type (Stableford)
  - Status (Upcoming / In Progress / Completed)
- [ ] "Start Round" button (if round not completed)
- [ ] Leaderboard preview (top 3 + current player)
- [ ] "View Full Leaderboard" button

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
- [ ] Course name
- [ ] Progress indicator (Hole X of 18)
- [ ] Progress bar

**Hole Info:**
- [ ] Hole number (large, centered)
- [ ] Par (from course data)
- [ ] Stroke index (for handicap calculation)

**Score Entry (for each player in group):**
- [ ] Player name + handicap
- [ ] Current score display (large number or "-")
- [ ] Score buttons: 1, 2, 3, 4, 5, 6, 7, 8 (grid layout)
- [ ] Active state when score selected
- [ ] Highlight current player's card (border)

**Navigation:**
- [ ] "Previous Hole" button (disabled on hole 1)
- [ ] "Next Hole" button (holes 1-17)
- [ ] "Review & Submit" button (hole 18)

**Quick Scorecard View:**
- [ ] Horizontal scrollable holes (1-18)
- [ ] Visual indicator: completed (✓), current (blue), incomplete (-)
- [ ] Tap hole to jump to it

**Offline Support:**
- [ ] Save all scores to Expo SQLite as they're entered
- [ ] Work completely offline
- [ ] Show offline indicator if no network

**Out of Scope:**
- ❌ Detailed stats (putts, fairways, GIR) - Phase 2
- ❌ Photo uploads (Phase 2)
- ❌ GPS shot tracking (Phase 2)
- ❌ Live sync while scoring (Phase 2)
- ❌ Playing partner confirmation (Phase 2)

---

### 6. Player: Review & Submit (Week 4)

**Scorecard Review:**
- [ ] Full scorecard table (all 18 holes, all players)
- [ ] Hole | Par | Player 1 | Player 2 | Player 3 columns
- [ ] Front 9 (OUT) subtotal
- [ ] Back 9 (IN) subtotal (if implemented)
- [ ] Total scores

**Score Summaries (per player):**
- [ ] Gross total
- [ ] Net total (calculated from handicap)
- [ ] Stableford points total
- [ ] Position relative to par

**Actions:**
- [ ] "Edit Scores" button → back to scorecard
- [ ] "Submit All Scores" button → send to Supabase
- [ ] Success confirmation screen
- [ ] Navigate back to competition dashboard

**Sync Logic:**
- [ ] If online: submit directly to Supabase
- [ ] If offline: queue for sync, show pending status
- [ ] On successful submit: clear local SQLite data
- [ ] Show success message with final score

**Out of Scope:**
- ❌ Playing partner digital signatures (Phase 2)
- ❌ Comments/notes on round (Phase 2)
- ❌ Photo uploads (Phase 2)
- ❌ Social sharing (Phase 2)

---

### 7. Leaderboard (Week 5)

**Display:**
- [ ] Competition name header
- [ ] Game type (Stableford)
- [ ] Sorted by total points (descending)
- [ ] Position | Player Name | Handicap | Points
- [ ] Highlight current player row
- [ ] Trophy icon for 1st place

**Refresh:**
- [ ] Pull-to-refresh to reload from Supabase
- [ ] Manual refresh button
- [ ] Loading indicator while fetching

**Calculation:**
- [ ] Fetch all scorecards for the round
- [ ] Calculate Stableford points per player
- [ ] Sort by total points
- [ ] Handle ties (same position number)

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
- [ ] Save all scorecard data to Expo SQLite
- [ ] Queue scorecard submission if offline
- [ ] Show "Pending Sync" indicator
- [ ] On app open: attempt to sync pending scorecards
- [ ] Manual "Sync Now" button
- [ ] Clear local data after successful sync

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
- [ ] Show user-friendly error messages
- [ ] "Retry" button for failed operations
- [ ] Offline mode indicator (persistent banner)

**Validation Errors:**
- [ ] Form validation (required fields)
- [ ] Invalid invite code message
- [ ] Duplicate player names warning
- [ ] Scorecard incomplete warning (missing holes)

**Edge Cases:**
- [ ] Handle competition not found
- [ ] Handle player already in competition
- [ ] Handle scorecard already submitted
- [ ] Handle deleted competition

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
- [ ] Create competition end-to-end
- [ ] Join competition with code
- [ ] Score full 18 holes offline
- [ ] Submit scorecard
- [ ] View leaderboard
- [ ] Test on iOS device
- [ ] Test on Android device
- [ ] Test with poor network (airplane mode on/off)
- [ ] Test with multiple players in group

### Edge Cases
- [ ] Invalid invite code
- [ ] Duplicate player names
- [ ] Submit incomplete scorecard
- [ ] Join already-joined competition
- [ ] Network failure during submit

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

## What Comes Next?

After Phase 1 is validated with real users, see [MVP-PHASE-2.md](./MVP-PHASE-2.md) for next features:
- Multi-round competitions
- Multiple game types
- Auto-pairing algorithm
- Course API integration
- Real-time leaderboard updates
- And more...

---

**Remember:** Phase 1 is about learning, not perfection. Ship it, get feedback, iterate.

*Last Updated: January 2025*
