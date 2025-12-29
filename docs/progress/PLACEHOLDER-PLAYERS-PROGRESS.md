# Placeholder Players - Implementation Plan

**Goal:** Add placeholder (guest) players to rounds and competitions - people who aren't app users yet but can be tracked by name and handicap, scored, and later linked to real accounts
**Status:** ✅ Complete - 100% (12/12 tasks)

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
**Status:** ✅ Complete
**Target File:** `supabase/migrations/20250329000000_placeholder_players.sql`
**Deliverables:**
- [x] Drop FK constraint from `players.id` to `auth.users` (allow placeholders without auth)
- [x] Add `is_placeholder BOOLEAN NOT NULL DEFAULT FALSE` column
- [x] Add `created_by UUID REFERENCES auth.users(id)` column (who created the placeholder)
- [x] Add `linked_player_id UUID REFERENCES players(id)` column (for future linking)
- [x] Add constraint: real players have `created_by IS NULL`, placeholders have `created_by IS NOT NULL`
- [x] Add constraint: `linked_player_id` only on placeholders
- [x] Create indexes: `idx_players_created_by`, `idx_players_unlinked_placeholders`, `idx_players_linked_player`, `idx_players_is_placeholder`
- [x] Update RLS policies for placeholder visibility and creation
- [x] Create `create_placeholder_player(name, handicap)` function
- [x] Create `link_placeholder_player(placeholder_id, real_player_id)` function (transfers all history)
- [x] Create `get_my_placeholder_players()` function
- [x] Create `search_linkable_players(search_term, limit)` function (bonus)

**Prompt:**
```
/db placeholder_players Extend the players table to support placeholder (guest) players. Requirements:

1. ALTER TABLE changes:
   - Drop existing FK constraint from players.id to auth.users (if exists)
   - Add is_placeholder BOOLEAN NOT NULL DEFAULT FALSE
   - Add created_by UUID REFERENCES auth.users(id) (who created the placeholder)
   - Add linked_player_id UUID REFERENCES players(id) (for linking to real accounts later)

2. Constraints:
   - Real players: created_by IS NULL, is_placeholder = FALSE
   - Placeholders: created_by IS NOT NULL, is_placeholder = TRUE
   - linked_player_id only allowed when is_placeholder = TRUE

3. Indexes:
   - idx_players_created_by ON players(created_by) WHERE created_by IS NOT NULL
   - idx_players_unlinked_placeholders ON players(id) WHERE is_placeholder = TRUE AND linked_player_id IS NULL
   - idx_players_linked_player ON players(linked_player_id) WHERE linked_player_id IS NOT NULL

4. RLS Policies:
   - Users can SELECT placeholders they created OR that are in competitions they belong to
   - Users can INSERT placeholders (with their user_id as created_by)
   - Only creator can UPDATE/DELETE their unlinked placeholders

5. Functions:
   - create_placeholder_player(p_name TEXT, p_handicap INTEGER DEFAULT NULL) - creates placeholder with generated email {uuid}@placeholder.local
   - link_placeholder_player(p_placeholder_id UUID, p_real_player_id UUID) - transfers ALL history (scorecards, competition_players, pairings) to real player
   - get_my_placeholder_players() - returns unlinked placeholders created by current user
```

**Dependencies:** None

---

### Task 2: TypeScript Types - Placeholder Players
**Status:** ✅ Complete
**Target File:** `src/types/database/player.types.ts`
**Deliverables:**
- [x] Add `is_placeholder: boolean` to `Player` interface
- [x] Add `created_by: string | null` to `Player` interface
- [x] Add `linked_player_id: string | null` to `Player` interface
- [x] Create `PlaceholderPlayerInput` interface (name, handicap)
- [x] Create `PlaceholderPlayerWithStats` interface (with usage counts)
- [x] Create `LinkablePlayer` interface (for search results)
- [x] Create `LinkPlaceholderResult` interface (for linking results)
- [x] Add type guards: `isPlaceholderPlayer()`, `isLinkedPlaceholder()`, `isRealPlayer()`
- [x] Export types from `src/types/database/index.ts`
- [x] Updated `docs/database/DATABASE_SCHEMA.md` with placeholder player documentation

**Prompt:**
```
/refactor src/types/database/player.types.ts Add placeholder player support to TypeScript types. Changes needed:

1. Update Player interface:
   - Add is_placeholder: boolean (default false for existing players)
   - Add created_by: string | null (UUID of creator, null for real players)
   - Add linked_player_id: string | null (UUID of linked real player, null if unlinked)

2. Create new interfaces:
   - PlaceholderPlayerInput: { name: string; handicap?: number | null } for creating placeholders
   - PlaceholderPlayer: Pick<Player, 'id' | 'name' | 'handicap' | 'avatar_url' | 'is_placeholder' | 'created_by' | 'created_at'> - minimal fields for placeholder display

3. Update exports in src/types/index.ts to include new types

4. Add JSDoc comments explaining:
   - is_placeholder: TRUE for guest players without app accounts
   - created_by: The user ID who created this placeholder
   - linked_player_id: When placeholder is linked to a real account, this references that player

Ensure backward compatibility - existing code using Player type should not break.
```

**Dependencies:** Task 1 (database schema)

---

## Sprint 2: React Query Hooks

### Task 3: Query Keys for Placeholder Players
**Status:** ✅ Complete
**Target File:** `src/hooks/queryKeys.ts`
**Deliverables:**
- [x] Add `placeholderPlayersKeys` object
- [x] Keys: `all`, `lists()`, `list(userId)`, `details()`, `detail(id)`
- [x] Added to `allQueryKeys` array for global invalidation

**Prompt:**
```
/refactor src/hooks/queryKeys.ts Add query keys for placeholder players. Follow existing patterns in this file.

Add placeholderPlayersKeys object with:
- all: ['placeholderPlayers'] as const - base key for all placeholder queries
- list: (userId: string) => [...all, 'list', userId] as const - list of user's placeholders
- detail: (id: string) => [...all, 'detail', id] as const - single placeholder details

Keep consistent with existing key patterns in the file (competitions, rounds, players, etc.).
```

**Dependencies:** None

---

### Task 4: Placeholder Players Hooks
**Status:** ✅ Complete
**Target File:** `src/hooks/usePlaceholderPlayers.ts` (new file)
**Deliverables:**
- [x] `usePlaceholderPlayers()` - fetch unlinked placeholders created by current user
- [x] `usePlaceholderPlayer(id)` - fetch single placeholder by ID
- [x] `useCreatePlaceholderPlayer()` - create new placeholder mutation
- [x] `useLinkPlaceholderPlayer()` - link placeholder to real player mutation
- [x] `useDeletePlaceholderPlayer()` - delete unlinked placeholder mutation
- [x] `useUpdatePlaceholderPlayer()` - update placeholder name/handicap (bonus)
- [x] Export from `src/hooks/index.ts`
- [x] Added RPC function types to `src/types/database/schema.ts`

**Prompt:**
```
/hook usePlaceholderPlayers Create TanStack Query hooks for placeholder player CRUD operations. New file: src/hooks/usePlaceholderPlayers.ts

Hooks needed:

1. usePlaceholderPlayers()
   - Calls get_my_placeholder_players() RPC function
   - Returns unlinked placeholders created by current user
   - Uses placeholderPlayersKeys.list(userId)
   - staleTime: 5 minutes

2. useCreatePlaceholderPlayer()
   - useMutation calling create_placeholder_player(name, handicap) RPC
   - Input: PlaceholderPlayerInput { name: string; handicap?: number | null }
   - Invalidates placeholderPlayersKeys.list on success
   - Returns created PlaceholderPlayer

3. useLinkPlaceholderPlayer()
   - useMutation calling link_placeholder_player(placeholder_id, real_player_id) RPC
   - Input: { placeholderId: string; realPlayerId: string }
   - Invalidates placeholderPlayersKeys.list on success
   - Also invalidates player-related queries (scores transferred)

4. useDeletePlaceholderPlayer()
   - useMutation to delete from players table where is_placeholder = true
   - Only deletes unlinked placeholders created by current user
   - Invalidates placeholderPlayersKeys.list on success

Import types from @/types, query keys from ./queryKeys, supabase from @/lib/supabase.
Export all hooks from src/hooks/index.ts.
```

**Dependencies:** Task 2 (types), Task 3 (query keys)

---

## Sprint 3: UI Components

### Task 5: AddPlaceholderModal Component
**Status:** ✅ Complete
**Target File:** `src/components/common/AddPlaceholderModal.tsx` (new file)
**Deliverables:**
- [x] Modal with name input (required)
- [x] Handicap input (optional, numeric 0-54)
- [x] Create button with loading state
- [x] Error handling and validation
- [x] Uses `useCreatePlaceholderPlayer` mutation
- [x] Callback `onPlayerCreated(player)` on success
- [x] Accessibility labels
- [x] Theme-aware styling

**Prompt:**
```
/component AddPlaceholderModal Modal component for creating placeholder (guest) players. Location: src/components/common/AddPlaceholderModal.tsx

Props interface:
- visible: boolean - controls modal visibility
- onClose: () => void - called when modal dismissed
- onPlayerCreated: (player: PlaceholderPlayer) => void - callback with created player

Features:
1. Form fields:
   - Name input (required, TextInput with validation)
   - Handicap input (optional, numeric 0-54, NumericInput or TextInput with keyboardType="numeric")

2. Actions:
   - Cancel button - calls onClose
   - "Add Guest" button - submits form, shows loading spinner during mutation

3. Validation:
   - Name required, minimum 2 characters
   - Handicap optional, must be 0-54 if provided
   - Show inline error messages

4. Behavior:
   - Use useCreatePlaceholderPlayer mutation
   - On success: call onPlayerCreated with result, then onClose
   - On error: show error message in modal
   - Clear form on close

5. Styling:
   - Use Modal from react-native or Portal from react-native-paper
   - Theme-aware with useThemeColors()
   - Card-style modal centered on screen
   - Proper keyboard avoiding behavior

Accessibility: Labels for all inputs, role="dialog" on modal.
```

**Dependencies:** Task 4 (hooks)

---

### Task 6: Update FriendSelector - Placeholder Support
**Status:** ✅ Complete
**Target File:** `src/components/common/FriendSelector/FriendSelector.tsx`
**Deliverables:**
- [x] Add `placeholderPlayers?: PlaceholderPlayerWithStats[]` prop
- [x] Add `onAddPlaceholderPress?: () => void` prop
- [x] Add `addPlaceholderLabel?: string` prop (default: "Add Guest")
- [x] Add "Add Guest" button in search row (alongside "Add Friend")
- [x] Add "GUESTS" section above friends list when placeholders exist
- [x] Display placeholders with "Guest" badge to differentiate from friends
- [x] Allow selecting placeholders (included in `selectedPlayers`)
- [x] Search filters both friends and placeholders

**Prompt:**
```
/refactor src/components/common/FriendSelector/FriendSelector.tsx Add placeholder player support to FriendSelector component.

New props to add:
- placeholderPlayers?: PlaceholderPlayer[] - list of user's placeholder players
- onAddPlaceholderPress?: () => void - callback when "Add Guest" button pressed
- addPlaceholderLabel?: string - button label (default: "Add Guest")

UI changes:
1. Search/action row: Add "Add Guest" button next to existing "Add Friend" button
   - Only show if onAddPlaceholderPress is provided
   - Icon: account-plus-outline or similar

2. List sections (in order):
   - "GUESTS" section header (only if placeholderPlayers has items)
   - Placeholder player items with "Guest" badge
   - "FRIENDS" section header (existing)
   - Friend items (existing)

3. Placeholder item display:
   - Show name and handicap like regular players
   - Add "Guest" chip/badge (small, different color like colors.textSecondary background)
   - Same selection behavior as friends (checkbox, tap to toggle)

4. Search behavior:
   - Filter both friends AND placeholders by search query
   - Match on name field

5. Selection handling:
   - Placeholders should work with existing selectedPlayers logic
   - Include is_placeholder: true in selected player data

Keep backward compatible - if placeholderPlayers not provided, behave exactly as before.
```

**Dependencies:** Task 2 (types)

---

### Task 7: Update SelectedPlayerChip - Guest Badge
**Status:** ✅ Complete
**Target File:** `src/components/common/FriendSelector/SelectedPlayerChip.tsx`
**Deliverables:**
- [x] Check `is_placeholder` on player
- [x] Show "Guest" badge/indicator for placeholder players (shows "(Guest)" suffix)
- [x] Different styling to distinguish guests (lighter font weight for suffix)

**Prompt:**
```
/refactor src/components/common/FriendSelector/SelectedPlayerChip.tsx Add guest badge indicator for placeholder players.

Changes needed:
1. Check player.is_placeholder property

2. If is_placeholder === true:
   - Add small "Guest" text label or badge after the player name
   - OR use a different icon (e.g., account-outline instead of account)
   - OR add subtle visual distinction (e.g., dashed border, different background tint)

3. Suggested implementation:
   - Add a small Text element with "Guest" after name
   - Style: smaller font (typography.caption or 10px), colors.textSecondary
   - Example: "Charlie (Guest)" or show as chip-within-chip

4. Ensure the chip still fits in the horizontal scroll without getting too wide
   - Name may need to be truncated shorter for placeholder players
   - Consider max width constraints

Keep existing styling for non-placeholder players unchanged.
```

**Dependencies:** Task 2 (types)

---

### Task 8: Update FriendSelector Types
**Status:** ✅ Complete
**Target File:** `src/components/common/FriendSelector/FriendSelector.types.ts`
**Deliverables:**
- [x] Add `is_placeholder?: boolean` to `SelectedPlayer` interface
- [x] Add `placeholderPlayers?: PlaceholderPlayerWithStats[]` to `FriendSelectorProps`
- [x] Add `onAddPlaceholderPress?: () => void` to `FriendSelectorProps`
- [x] Add `addPlaceholderLabel?: string` to `FriendSelectorProps`

**Prompt:**
```
/refactor src/components/common/FriendSelector/FriendSelector.types.ts Add placeholder support to FriendSelector types.

Changes:
1. Add to SelectedPlayer interface:
   - is_placeholder?: boolean - true for guest players

2. Update FriendSelectorProps interface (if it exists) to add:
   - placeholderPlayers?: PlaceholderPlayer[]
   - onAddPlaceholderPress?: () => void
   - addPlaceholderLabel?: string

3. Import PlaceholderPlayer type from @/types if needed

4. Add JSDoc comment explaining is_placeholder field:
   /** True if this player is a placeholder/guest without an app account */

This is a small change - just adding the optional field to existing types.
```

**Dependencies:** None

---

## Sprint 4: Wizard Integration

### Task 9: Update PartnersStep - Round Creation
**Status:** ✅ Complete
**Target File:** `src/screens/rounds/CreateRoundBottomSheet/steps/PartnersStep.tsx`
**Deliverables:**
- [x] Import `usePlaceholderPlayers`, `useCreatePlaceholderPlayer`
- [x] Import `AddPlaceholderModal`
- [x] Add state for showing add placeholder modal
- [x] Pass `placeholderPlayers` to `FriendSelector`
- [x] Pass `onAddPlaceholderPress` to open modal
- [x] On placeholder created, auto-add to selected players
- [x] Include placeholder players in wizard state

**Prompt:**
```
/refactor src/screens/rounds/CreateRoundBottomSheet/steps/PartnersStep.tsx Integrate placeholder player support into the round creation partners step.

Changes needed:

1. Imports:
   - Import usePlaceholderPlayers from @/hooks/usePlaceholderPlayers
   - Import AddPlaceholderModal from @/components/common/AddPlaceholderModal
   - Import PlaceholderPlayer type from @/types

2. State:
   - Add showAddPlaceholderModal state (boolean, default false)

3. Hook usage:
   - Call usePlaceholderPlayers() to get placeholder players list
   - Extract data as placeholderPlayers

4. FriendSelector props:
   - Pass placeholderPlayers={placeholderPlayers || []}
   - Pass onAddPlaceholderPress={() => setShowAddPlaceholderModal(true)}
   - Pass addPlaceholderLabel="Add Guest"

5. Modal integration:
   - Render AddPlaceholderModal with visible={showAddPlaceholderModal}
   - onClose={() => setShowAddPlaceholderModal(false)}
   - onPlayerCreated handler that:
     a) Auto-adds the new placeholder to selectedPlayers
     b) Closes the modal

6. Wizard state:
   - Ensure placeholder players (with is_placeholder: true) are included in wizard form data
   - They should flow through to round creation like regular players

The goal is to let users create guest players on-the-fly while selecting partners for a round.
```

**Dependencies:** Task 5 (modal), Task 6 (FriendSelector updates)

---

### Task 10: Update AddPlayersStep - Competition Creation
**Status:** ✅ Complete
**Target File:** `src/components/competitionWizard/create/AddPlayersStep.tsx`
**Deliverables:**
- [x] Same changes as PartnersStep (Task 9)
- [x] Import `usePlaceholderPlayers`, `useCreatePlaceholderPlayer`
- [x] Import `AddPlaceholderModal`
- [x] Integrate with FriendSelector
- [x] Include placeholders in competition player list

**Prompt:**
```
/refactor src/components/competitionWizard/create/AddPlayersStep.tsx Integrate placeholder player support into the competition creation add players step. Same pattern as PartnersStep.

Changes needed:

1. Imports:
   - Import usePlaceholderPlayers from @/hooks/usePlaceholderPlayers
   - Import AddPlaceholderModal from @/components/common/AddPlaceholderModal
   - Import PlaceholderPlayer type from @/types

2. State:
   - Add showAddPlaceholderModal state (boolean, default false)

3. Hook usage:
   - Call usePlaceholderPlayers() to get placeholder players list

4. FriendSelector props:
   - Pass placeholderPlayers={placeholderPlayers || []}
   - Pass onAddPlaceholderPress={() => setShowAddPlaceholderModal(true)}
   - Pass addPlaceholderLabel="Add Guest"

5. Modal integration:
   - Render AddPlaceholderModal with visible={showAddPlaceholderModal}
   - onClose={() => setShowAddPlaceholderModal(false)}
   - onPlayerCreated handler that:
     a) Auto-adds the new placeholder to selected players
     b) Closes the modal

6. Competition wizard state:
   - Ensure placeholder players are included in the players list for competition creation
   - They count against tier limits like regular players
   - Placeholders should be added to competition_players table on creation

This mirrors Task 9 but for competition creation instead of round creation.
```

**Dependencies:** Task 5 (modal), Task 6 (FriendSelector updates)

---

## Sprint 5: Linking Flow (Phase 2)

### Task 11: LinkPlaceholderScreen
**Status:** ✅ Complete
**Target File:** `src/screens/admin/LinkPlaceholderScreen.tsx` (new file)
**Deliverables:**
- [x] List unlinked placeholders created by current user
- [x] "Link to Player" button per placeholder
- [x] Friend search modal to find real player (using BottomSheet + useSearchPlayers)
- [x] Confirmation dialog explaining data transfer
- [x] Execute link via `useLinkPlaceholderPlayer`
- [x] Success/error feedback (Toast messages + Alert dialogs)
- [x] Delete option with confirmation dialog
- [x] Navigation registration in `src/navigation/types.ts` and `RootNavigator.tsx`

**Prompt:**
```
/screen LinkPlaceholderScreen Admin screen for linking placeholder players to real accounts. Location: src/screens/admin/LinkPlaceholderScreen.tsx

Screen features:

1. Header: "Manage Guest Players" with back navigation

2. Placeholder list:
   - Use usePlaceholderPlayers() to fetch unlinked placeholders
   - FlatList of placeholder player cards
   - Each card shows: name, handicap, created date
   - "Link to Account" button on each card

3. Empty state:
   - Show when no unlinked placeholders exist
   - Message: "No guest players to link"
   - Helpful text explaining what placeholder players are

4. Link flow (per placeholder):
   a) Tap "Link to Account" button
   b) Open friend search modal (reuse existing FriendSearchModal or similar)
   c) User selects a real player from their friends
   d) Show confirmation dialog:
      - Title: "Link Guest to Account?"
      - Message: "All scores and history from [Placeholder Name] will be transferred to [Real Player Name]. This cannot be undone."
      - Cancel / Confirm buttons
   e) On confirm: call useLinkPlaceholderPlayer mutation
   f) Show success toast or error message
   g) Refresh list (placeholder disappears after linking)

5. Delete option:
   - Swipe-to-delete or delete button on each card
   - Confirmation before deleting
   - Use useDeletePlaceholderPlayer mutation

6. Navigation:
   - Add to src/navigation/types.ts: LinkPlaceholderScreen in RootStackParamList
   - Register in RootNavigator.tsx

Loading/error states, pull-to-refresh, theme-aware styling with useThemeColors().
```

**Dependencies:** Task 4 (hooks)

---

### Task 12: Admin Access Point for Linking
**Status:** ✅ Complete
**Target Files:** `src/screens/profile/ProfileScreen.tsx`
**Deliverables:**
- [x] Add "Manage Guest Players" option in Profile screen Account section
- [x] Show badge with count of unlinked placeholders (when > 0)
- [x] Navigate to LinkPlaceholderScreen
- [x] Uses `usePlaceholderPlayers()` hook to get count
- [x] Added badge support to existing `MenuItem` component
- [x] Icon: account-multiple-outline

**Prompt:**
```
/refactor Add admin access point for managing guest players. Need to add navigation entry to LinkPlaceholderScreen.

Identify the best location(s) for this entry point. Options:
1. Profile/Settings screen - under a "My Data" or similar section
2. Competition settings screen - if user is admin of a competition with placeholders
3. Round settings screen - if round has placeholder players

Implementation for each location:

1. Profile/Settings (recommended primary location):
   - Add menu item: "Manage Guest Players"
   - Icon: account-multiple-outline or account-question-outline
   - Show badge with count of unlinked placeholders (if > 0)
   - Use usePlaceholderPlayers() to get count
   - onPress: navigation.navigate('LinkPlaceholderScreen')

2. Optional: Competition admin menu:
   - Only show if competition has placeholder players
   - "Guest Players" option
   - Navigate to LinkPlaceholderScreen (could filter by competition)

Add the menu item using existing patterns in those screens. Use:
- useThemeColors() for styling
- Icon from react-native-paper
- Badge component for unlinked count
- navigation.navigate for routing

The goal is to make it easy for organizers to find and link guest players after they sign up.
```

**Dependencies:** Task 11 (LinkPlaceholderScreen)

---

## Progress Summary

### Completion Statistics
- **Total Tasks:** 12
- **Completed:** 12 (100%)
- **In Progress:** 0 (0%)
- **Not Started:** 0 (0%)

### Sprint Progress

**Sprint 1: Database Foundation** ✅ Complete
- ✅ Task 1: Database Migration
- ✅ Task 2: TypeScript Types

**Sprint 2: React Query Hooks** ✅ Complete
- ✅ Task 3: Query Keys
- ✅ Task 4: Placeholder Players Hooks

**Sprint 3: UI Components** ✅ Complete
- ✅ Task 5: AddPlaceholderModal Component
- ✅ Task 6: Update FriendSelector
- ✅ Task 7: Update SelectedPlayerChip
- ✅ Task 8: Update FriendSelector Types

**Sprint 4: Wizard Integration** ✅ Complete
- ✅ Task 9: Update PartnersStep
- ✅ Task 10: Update AddPlayersStep

**Sprint 5: Linking Flow (Phase 2)** ✅ Complete
- ✅ Task 11: LinkPlaceholderScreen
- ✅ Task 12: Admin Access Point

---

## Critical Files

### New Files
| File | Purpose |
|------|---------|
| `supabase/migrations/20250328000000_placeholder_players.sql` | Database migration |
| `src/hooks/usePlaceholderPlayers.ts` | CRUD hooks for placeholders |
| `src/components/common/AddPlaceholderModal.tsx` | Create placeholder modal |
| `src/components/common/FriendSelector/PlaceholderListItem.tsx` | Placeholder player list item component |
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

**Last Updated:** 2025-12-29
**Status:** ✅ All tasks complete! Placeholder players feature is fully implemented.
**Implementation Summary:** Users can now add guest players to rounds/competitions, and later link them to real accounts via Profile > "Manage Guest Players".
