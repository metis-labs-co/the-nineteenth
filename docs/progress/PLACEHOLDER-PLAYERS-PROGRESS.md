# Placeholder Players - Implementation Plan

**Goal:** Add placeholder (guest) players to rounds and competitions - people who aren't app users yet but can be tracked by name and handicap, scored, and later linked to real accounts
**Status:** ⬜ Not Started - 0% (0/12 tasks)

---

## Overview

This plan introduces a **Placeholder Players** feature that allows organizers to add "guest" players to rounds and competitions without requiring those players to have app accounts. Key capabilities:

- **Add placeholder players**: Name + handicap only (no authentication required)
- **Full scoring support**: Placeholders appear on scorecards and can be scored by group members
- **Tier limit integration**: Count against subscription limits like real players
- **Future linking**: When placeholder person signs up, organizer can link to their account, transferring ALL historical data

### Example Scenario

**Creating a round with 4 players:**
- Alice (app user, organizer)
- Bob (app user, friend)
- "Charlie" (placeholder - Bob's brother visiting)
- "Dana" (placeholder - new to golf, trying it out)

Charlie and Dana can be scored during the round. If Charlie later downloads the app and creates an account, Alice can link the "Charlie" placeholder to his real account, and all his scores transfer automatically.

---

## Sprint 1: Database Foundation

### Task 1: Database Migration - Placeholder Players Schema
**Status:** ⬜ Not Started
**Target File:** `supabase/migrations/20250328000000_placeholder_players.sql`
**Deliverables:**
- [ ] Drop FK constraint from `players.id` to `auth.users` (allow placeholders without auth)
- [ ] Add `is_placeholder BOOLEAN NOT NULL DEFAULT FALSE` column
- [ ] Add `created_by UUID REFERENCES auth.users(id)` column (who created the placeholder)
- [ ] Add `linked_player_id UUID REFERENCES players(id)` column (for future linking)
- [ ] Add constraint: real players have `created_by IS NULL`, placeholders have `created_by IS NOT NULL`
- [ ] Add constraint: `linked_player_id` only on placeholders
- [ ] Create indexes: `idx_players_created_by`, `idx_players_unlinked_placeholders`, `idx_players_linked_player`
- [ ] Update RLS policies for placeholder visibility and creation
- [ ] Create `create_placeholder_player(name, handicap)` function
- [ ] Create `link_placeholder_player(placeholder_id, real_player_id)` function (transfers all history)
- [ ] Create `get_my_placeholder_players()` function

**Dependencies:** None

---

### Task 2: TypeScript Types - Placeholder Players
**Status:** ⬜ Not Started
**Target File:** `src/types/database/player.types.ts`
**Deliverables:**
- [ ] Add `is_placeholder: boolean` to `Player` interface
- [ ] Add `created_by: string | null` to `Player` interface
- [ ] Add `linked_player_id: string | null` to `Player` interface
- [ ] Create `PlaceholderPlayerInput` interface (name, handicap)
- [ ] Create `PlaceholderPlayer` interface (subset of fields)
- [ ] Export types from `src/types/index.ts`

**Dependencies:** Task 1 (database schema)

---

## Sprint 2: React Query Hooks

### Task 3: Query Keys for Placeholder Players
**Status:** ⬜ Not Started
**Target File:** `src/hooks/queryKeys.ts`
**Deliverables:**
- [ ] Add `placeholderPlayersKeys` object
- [ ] Keys: `all`, `list(userId)`, `detail(id)`

**Dependencies:** None

---

### Task 4: Placeholder Players Hooks
**Status:** ⬜ Not Started
**Target File:** `src/hooks/usePlaceholderPlayers.ts` (new file)
**Deliverables:**
- [ ] `usePlaceholderPlayers()` - fetch unlinked placeholders created by current user
- [ ] `useCreatePlaceholderPlayer()` - create new placeholder mutation
- [ ] `useLinkPlaceholderPlayer()` - link placeholder to real player mutation
- [ ] `useDeletePlaceholderPlayer()` - delete unlinked placeholder mutation
- [ ] Export from `src/hooks/index.ts`

**Dependencies:** Task 2 (types), Task 3 (query keys)

---

## Sprint 3: UI Components

### Task 5: AddPlaceholderModal Component
**Status:** ⬜ Not Started
**Target File:** `src/components/common/AddPlaceholderModal.tsx` (new file)
**Deliverables:**
- [ ] Modal with name input (required)
- [ ] Handicap input (optional, numeric 0-54)
- [ ] Create button with loading state
- [ ] Error handling and validation
- [ ] Uses `useCreatePlaceholderPlayer` mutation
- [ ] Callback `onPlayerCreated(player)` on success
- [ ] Accessibility labels
- [ ] Theme-aware styling

**Dependencies:** Task 4 (hooks)

---

### Task 6: Update FriendSelector - Placeholder Support
**Status:** ⬜ Not Started
**Target File:** `src/components/common/FriendSelector/FriendSelector.tsx`
**Deliverables:**
- [ ] Add `placeholderPlayers?: PlaceholderPlayer[]` prop
- [ ] Add `onAddPlaceholderPress?: () => void` prop
- [ ] Add `addPlaceholderLabel?: string` prop (default: "Add Guest")
- [ ] Add "Add Guest" button in search row (alongside "Add Friend")
- [ ] Add "GUESTS" section above friends list when placeholders exist
- [ ] Display placeholders with "Guest" badge to differentiate from friends
- [ ] Allow selecting placeholders (included in `selectedPlayers`)
- [ ] Search filters both friends and placeholders

**Dependencies:** Task 2 (types)

---

### Task 7: Update SelectedPlayerChip - Guest Badge
**Status:** ⬜ Not Started
**Target File:** `src/components/common/FriendSelector/SelectedPlayerChip.tsx`
**Deliverables:**
- [ ] Check `is_placeholder` on player
- [ ] Show "Guest" badge/indicator for placeholder players
- [ ] Different icon or styling to distinguish guests

**Dependencies:** Task 2 (types)

---

### Task 8: Update FriendSelector Types
**Status:** ⬜ Not Started
**Target File:** `src/components/common/FriendSelector/FriendSelector.types.ts`
**Deliverables:**
- [ ] Add `is_placeholder?: boolean` to `SelectedPlayer` interface

**Dependencies:** None

---

## Sprint 4: Wizard Integration

### Task 9: Update PartnersStep - Round Creation
**Status:** ⬜ Not Started
**Target File:** `src/screens/rounds/CreateRoundBottomSheet/steps/PartnersStep.tsx`
**Deliverables:**
- [ ] Import `usePlaceholderPlayers`, `useCreatePlaceholderPlayer`
- [ ] Import `AddPlaceholderModal`
- [ ] Add state for showing add placeholder modal
- [ ] Pass `placeholderPlayers` to `FriendSelector`
- [ ] Pass `onAddPlaceholderPress` to open modal
- [ ] On placeholder created, auto-add to selected players
- [ ] Include placeholder players in wizard state

**Dependencies:** Task 5 (modal), Task 6 (FriendSelector updates)

---

### Task 10: Update AddPlayersStep - Competition Creation
**Status:** ⬜ Not Started
**Target File:** `src/components/competitionWizard/create/AddPlayersStep.tsx`
**Deliverables:**
- [ ] Same changes as PartnersStep (Task 9)
- [ ] Import `usePlaceholderPlayers`, `useCreatePlaceholderPlayer`
- [ ] Import `AddPlaceholderModal`
- [ ] Integrate with FriendSelector
- [ ] Include placeholders in competition player list

**Dependencies:** Task 5 (modal), Task 6 (FriendSelector updates)

---

## Sprint 5: Linking Flow (Phase 2)

### Task 11: LinkPlaceholderScreen
**Status:** ⬜ Not Started
**Target File:** `src/screens/admin/LinkPlaceholderScreen.tsx` (new file)
**Deliverables:**
- [ ] List unlinked placeholders created by current user
- [ ] "Link to Player" button per placeholder
- [ ] Friend search modal to find real player
- [ ] Confirmation dialog explaining data transfer
- [ ] Execute link via `useLinkPlaceholderPlayer`
- [ ] Success/error feedback
- [ ] Navigation registration in `src/navigation/types.ts` and `RootNavigator.tsx`

**Dependencies:** Task 4 (hooks)

---

### Task 12: Admin Access Point for Linking
**Status:** ⬜ Not Started
**Target Files:** Competition/Round settings screens
**Deliverables:**
- [ ] Add "Manage Guest Players" option in settings
- [ ] Show count of unlinked placeholders
- [ ] Navigate to LinkPlaceholderScreen

**Dependencies:** Task 11 (LinkPlaceholderScreen)

---

## Progress Summary

### Completion Statistics
- **Total Tasks:** 12
- **Completed:** 0 (0%)
- **In Progress:** 0 (0%)
- **Not Started:** 12 (100%)

### Sprint Progress

**Sprint 1: Database Foundation** ⬜ Not Started
- ⬜ Task 1: Database Migration
- ⬜ Task 2: TypeScript Types

**Sprint 2: React Query Hooks** ⬜ Not Started
- ⬜ Task 3: Query Keys
- ⬜ Task 4: Placeholder Players Hooks

**Sprint 3: UI Components** ⬜ Not Started
- ⬜ Task 5: AddPlaceholderModal Component
- ⬜ Task 6: Update FriendSelector
- ⬜ Task 7: Update SelectedPlayerChip
- ⬜ Task 8: Update FriendSelector Types

**Sprint 4: Wizard Integration** ⬜ Not Started
- ⬜ Task 9: Update PartnersStep
- ⬜ Task 10: Update AddPlayersStep

**Sprint 5: Linking Flow (Phase 2)** ⬜ Not Started
- ⬜ Task 11: LinkPlaceholderScreen
- ⬜ Task 12: Admin Access Point

---

## Critical Files

### New Files
| File | Purpose |
|------|---------|
| `supabase/migrations/20250328000000_placeholder_players.sql` | Database migration |
| `src/hooks/usePlaceholderPlayers.ts` | CRUD hooks for placeholders |
| `src/components/common/AddPlaceholderModal.tsx` | Create placeholder modal |
| `src/screens/admin/LinkPlaceholderScreen.tsx` | Admin linking screen |

### Modified Files
| File | Changes |
|------|---------|
| `src/types/database/player.types.ts` | Add placeholder fields to Player |
| `src/hooks/queryKeys.ts` | Add placeholderPlayersKeys |
| `src/hooks/index.ts` | Export new hooks |
| `src/components/common/FriendSelector/FriendSelector.tsx` | Add guest section |
| `src/components/common/FriendSelector/FriendSelector.types.ts` | Add is_placeholder |
| `src/components/common/FriendSelector/SelectedPlayerChip.tsx` | Add guest badge |
| `src/screens/rounds/CreateRoundBottomSheet/steps/PartnersStep.tsx` | Integrate placeholders |
| `src/components/competitionWizard/create/AddPlayersStep.tsx` | Integrate placeholders |
| `src/navigation/types.ts` | Add LinkPlaceholder route |
| `src/navigation/RootNavigator.tsx` | Register screen |

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Scoring placeholder | Works - scorecards reference players table |
| Leaderboard with placeholder | Works - existing functions join on players |
| Tier limits | Works - counts competition_players rows |
| Pairings | Works - array of UUIDs |
| Push notifications | Skipped - placeholders have push_enabled=FALSE |
| Offline sync | Works - placeholder players synced like regular players |
| Delete placeholder in comp | Cascade delete from competition_players |
| Link then unlink | Not supported - linking is permanent |
| Placeholder email | Generated as `{uuid}@placeholder.local` |

---

## Backward Compatibility

- `is_placeholder` defaults to `FALSE` - all existing players unaffected
- `created_by` is NULL for real players - no constraint violations
- Existing queries on `players` table work unchanged
- Leaderboard functions, scorecards, pairings all work with placeholders
- No breaking changes to existing API

---

## Key Design Decisions

1. **Extend players table**: All FK constraints already point to players - minimal code changes
2. **Generated placeholder email**: Required field uses `{uuid}@placeholder.local` format
3. **Linking transfers ALL history**: Scores, competitions, rounds all migrate to real player
4. **Linked placeholders kept for audit**: `linked_player_id` preserves trail, placeholder not deleted
5. **Creator ownership**: Only the user who created a placeholder can link/delete it
6. **Count against tier limits**: Placeholders are "real" for subscription purposes

---

## Command Usage Reference

| Command | Use For |
|---------|---------|
| `/db` | Database schema design and migrations |
| `/component` | AddPlaceholderModal, FriendSelector updates |
| `/screen` | LinkPlaceholderScreen |
| `/hook` | usePlaceholderPlayers hooks |
| `/refactor` | PartnersStep, AddPlayersStep integration |

---

**Last Updated:** 2025-12-27
**Next Action:** Start Task 1 - Database Migration
**Current Sprint:** Sprint 1 - Database Foundation
