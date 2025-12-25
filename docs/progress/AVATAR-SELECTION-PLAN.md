# Profile Avatar Selection - Implementation Plan

**Goal:** Replace "Photo uploads coming soon" placeholder with selectable avatar options using The Nineteenth golfer icon in different colour variations.
**Status:** ✅ Complete - 100% (13/13 tasks)

---

## Quick Execution Guide

Each task below has a **"Command (copy and run)"** block with full context included. Just copy the command and run it.

**Execution Order:**
1. **Task 1** → `/component GolferIcon` (creates SVG component)
2. **Task 2** → Manual (create `src/constants/avatars.ts` - code provided)
3. **Task 3** → `/component PlayerAvatar` (creates unified avatar display)
4. **Task 4** → Manual (add exports to index.ts)
5. **Task 5** → `/component AvatarSelectionModal` (creates picker modal)
6. **Task 6** → Manual (add exports to index.ts)
7. **Tasks 7-10** → `/refactor EditProfileScreen` (can run individually or combine)
8. **Task 11** → `/refactor` (update all player avatars app-wide)
9. **Task 12** → `/test-component` (run 3 times for each component)
10. **Task 13** → `/review` (final code review)

**Tip:** Each command is self-contained with all context needed. Scroll to the task for the full copy-ready command.

---

## Claude Commands Reference

| Command | Purpose | Tasks |
|---------|---------|-------|
| `/component` | Create new React Native components | 1, 3, 5 |
| `/refactor` | Update existing screens/components | 7-11 |
| `/test-component` | Create component tests | 12 |
| `/review` | Review completed work for quality | 13 |

**Key Context Files:**
- **Source SVG:** `/Users/samkay/Desktop/19th_1080 x 1080 px Logo 1.svg`
- **Pattern reference:** `src/components/common/Logo.tsx`
- **Target file:** `src/screens/profile/EditProfileScreen.tsx` (lines 260-268)

---

## Overview

This plan adds **profile avatar selection** to the EditProfileScreen. Users can choose from 12 colour variations of The Nineteenth golfer icon. Each avatar uses the same icon with different colour palettes (green, blue, red, purple, teal, orange, etc.).

### Current State (Already Implemented)

- **Database Schema**: `photo_url TEXT` field on players table
- **Player Type**: `photo_url: string | null` in `src/types/database/player.types.ts`
- **Profile Update**: `updateProfile()` mutation already supports `photoUrl` parameter
- **Avatar Display**: Avatar.Image/Avatar.Icon components in ProfileScreen and EditProfileScreen
- **Placeholder**: "Photo uploads coming soon" text in EditProfileScreen (line 266-268)
- **Dependencies**: `expo-image-picker` installed (unused - not needed for this approach)

### What This Plan Adds

- **GolferIcon Component**: React Native SVG component with dynamic colour props
- **Avatar Configuration**: 12 colour palettes mapping green shades to other hues
- **PlayerAvatar Component**: Unified avatar display handling all avatar types
- **AvatarSelectionModal**: Grid-based picker triggered by tapping avatar
- **EditProfileScreen Integration**: Tappable avatar with selection flow

### Colour Palette System

The original icon uses 5 green shades. Each avatar variation maps these to a different hue:

**Original Green Shades (reference):**
| Shade | Hex | Role |
|-------|-----|------|
| Darkest | #0a5d24 | Shadows, depth |
| Dark | #2e8e36 | Secondary areas |
| Mid | #34953d | Primary fill |
| Light | #67a749 | Highlights |
| Lightest | #6eac4d | Accent highlights |

**Constant Colours (same across all variants):**
| Element | Hex | Description |
|---------|-----|-------------|
| Outline | #003913 | Dark outlines (st4) |
| Face/Clouds | #f7f3e0 | Cream/white areas |
| Flag Yellow | #f5d459 | Flag top |
| Flag Gold | #f2b724 | Flag middle |
| Flag Orange | #ed9d1f | Flag bottom |
| Highlights | #cbc5a9 | Beige accents |

### Avatar Colour Variations

| ID | Name | Darkest | Dark | Mid | Light | Lightest |
|----|------|---------|------|-----|-------|----------|
| avatar-green | Green (Original) | #0a5d24 | #2e8e36 | #34953d | #67a749 | #6eac4d |
| avatar-blue | Blue | #0a3d5d | #2e6e8e | #3478a3 | #4998c7 | #4da0cf |
| avatar-navy | Navy | #0a2445 | #2e4a6e | #34567d | #4978a1 | #4d82ab |
| avatar-teal | Teal | #0a5d5d | #2e8e8e | #349d9d | #49c7c7 | #4dcfcf |
| avatar-purple | Purple | #3d0a5d | #6e2e8e | #7d349d | #a149c7 | #ab4dcf |
| avatar-violet | Violet | #4a0a5d | #7a2e8e | #8a349d | #b249c7 | #bc4dcf |
| avatar-red | Red | #5d0a0a | #8e2e2e | #9d3434 | #c74949 | #cf4d4d |
| avatar-orange | Orange | #5d3d0a | #8e6e2e | #9d7d34 | #c7a149 | #cfab4d |
| avatar-gold | Gold | #5d4a0a | #8e7a2e | #9d8a34 | #c7b249 | #cfbc4d |
| avatar-pink | Pink | #5d0a3d | #8e2e6e | #9d347d | #c749a1 | #cf4dab |
| avatar-slate | Slate | #2a3d4a | #4a6070 #587080 | #7090a0 | #80a0b0 |
| avatar-charcoal | Charcoal | #1a1a1a | #3a3a3a | #4a4a4a | #6a6a6a | #7a7a7a |

### Storage Format

```
photo_url = "avatar:avatar-blue"
```

This prefix-based format allows easy detection of bundled vs remote avatars.

---

## Sprint 1: Core Infrastructure

### Task 1: Create GolferIcon SVG Component
**Status:** ✅ Complete
**File:** `src/components/common/GolferIcon.tsx`

**Command (copy and run):**
```
/component GolferIcon - Create a React Native SVG component from the golfer icon at /Users/samkay/Desktop/19th_1080 x 1080 px Logo 1.svg. Follow the pattern in src/components/common/Logo.tsx using react-native-svg. Accept a colorPalette prop with 5 shades (darkest, dark, mid, light, lightest) and a size prop (default 100). The SVG has colour classes that need mapping: st0→colorPalette.mid, st2→colorPalette.dark, st7→colorPalette.light, st10→colorPalette.lightest, st11→colorPalette.darkest. Keep these colours static: st1=#f7f5e0, st3=#f7f3e0, st4=#003913, st5=#f5d459, st6=#f2b724, st8=#ed9d1f, st9=#cbc5a9. Use viewBox="0 0 1080 1080" and memoize with React.memo().
```

**Reference Details:**

**SVG Colour Class Mapping:**
| Class | Original Hex | Role | Dynamic/Static |
|-------|--------------|------|----------------|
| st0 | #34953d | Mid green | **DYNAMIC** → `colorPalette.mid` |
| st2 | #2e8e36 | Dark green | **DYNAMIC** → `colorPalette.dark` |
| st7 | #67a749 | Light green | **DYNAMIC** → `colorPalette.light` |
| st10 | #6eac4d | Lightest green | **DYNAMIC** → `colorPalette.lightest` |
| st11 | #0a5d24 | Darkest green | **DYNAMIC** → `colorPalette.darkest` |
| st1 | #f7f5e0 | Face cream | Static |
| st3 | #f7f3e0 | Face cream | Static |
| st4 | #003913 | Dark outline | Static |
| st5 | #f5d459 | Flag yellow | Static |
| st6 | #f2b724 | Flag gold | Static |
| st8 | #ed9d1f | Flag orange | Static |
| st9 | #cbc5a9 | Beige accent | Static |

**Component Interface:**
```typescript
interface GolferIconProps {
  size?: number;
  colorPalette: {
    darkest: string;   // Maps to st11 (#0a5d24)
    dark: string;      // Maps to st2 (#2e8e36)
    mid: string;       // Maps to st0 (#34953d)
    light: string;     // Maps to st7 (#67a749)
    lightest: string;  // Maps to st10 (#6eac4d)
  };
}
```

**Implementation Notes:**
- Convert SVG `<path>` → `<Path>`, `<g>` → `<G>`, `<rect>` → `<Rect>`
- Use `viewBox="0 0 1080 1080"` for proper scaling
- Replace `class="stX"` with inline `fill={...}` props
- Memoize component with `React.memo()` for performance

**Dependencies:** react-native-svg (already installed)

---

### Task 2: Create Avatar Configuration Module
**Status:** ✅ Complete
**File:** `src/constants/avatars.ts`

**Command:** Manual file creation (no slash command needed - straightforward constants)

**Context:**
- **Similar pattern:** `src/constants/theme.ts` (exports typed constants and helper functions)
- **Storage format:** `photo_url = "avatar:avatar-blue"` in database
- **Reference:** Colour palettes defined in "Avatar Colour Variations" table above

**Deliverables:**
- [ ] Define `ColorPalette` interface with 5 shade properties
- [ ] Define `AvatarOption` interface with id, name, colorPalette
- [ ] Export `AVATARS` array with all 12 colour variations (copy hex values from plan table)
- [ ] Export `AVATAR_PREFIX = 'avatar:'` constant
- [ ] Export `DEFAULT_AVATAR_ID = 'avatar-green'`
- [ ] Create helper functions:
  - `isAvatarId(photoUrl: string | null): boolean` - checks if URL starts with prefix
  - `getAvatarId(photoUrl: string): string` - extracts ID after prefix
  - `getAvatarById(avatarId: string): AvatarOption | undefined` - finds config by ID
  - `formatAvatarUrl(avatarId: string): string` - adds prefix for database storage

**Full Implementation:**
```typescript
export interface ColorPalette {
  darkest: string;
  dark: string;
  mid: string;
  light: string;
  lightest: string;
}

export interface AvatarOption {
  id: string;
  name: string;
  colorPalette: ColorPalette;
}

export const AVATAR_PREFIX = 'avatar:';
export const DEFAULT_AVATAR_ID = 'avatar-green';

export const AVATARS: AvatarOption[] = [
  { id: 'avatar-green', name: 'Green', colorPalette: { darkest: '#0a5d24', dark: '#2e8e36', mid: '#34953d', light: '#67a749', lightest: '#6eac4d' } },
  { id: 'avatar-blue', name: 'Blue', colorPalette: { darkest: '#0a3d5d', dark: '#2e6e8e', mid: '#3478a3', light: '#4998c7', lightest: '#4da0cf' } },
  { id: 'avatar-navy', name: 'Navy', colorPalette: { darkest: '#0a2445', dark: '#2e4a6e', mid: '#34567d', light: '#4978a1', lightest: '#4d82ab' } },
  { id: 'avatar-teal', name: 'Teal', colorPalette: { darkest: '#0a5d5d', dark: '#2e8e8e', mid: '#349d9d', light: '#49c7c7', lightest: '#4dcfcf' } },
  { id: 'avatar-purple', name: 'Purple', colorPalette: { darkest: '#3d0a5d', dark: '#6e2e8e', mid: '#7d349d', light: '#a149c7', lightest: '#ab4dcf' } },
  { id: 'avatar-violet', name: 'Violet', colorPalette: { darkest: '#4a0a5d', dark: '#7a2e8e', mid: '#8a349d', light: '#b249c7', lightest: '#bc4dcf' } },
  { id: 'avatar-red', name: 'Red', colorPalette: { darkest: '#5d0a0a', dark: '#8e2e2e', mid: '#9d3434', light: '#c74949', lightest: '#cf4d4d' } },
  { id: 'avatar-orange', name: 'Orange', colorPalette: { darkest: '#5d3d0a', dark: '#8e6e2e', mid: '#9d7d34', light: '#c7a149', lightest: '#cfab4d' } },
  { id: 'avatar-gold', name: 'Gold', colorPalette: { darkest: '#5d4a0a', dark: '#8e7a2e', mid: '#9d8a34', light: '#c7b249', lightest: '#cfbc4d' } },
  { id: 'avatar-pink', name: 'Pink', colorPalette: { darkest: '#5d0a3d', dark: '#8e2e6e', mid: '#9d347d', light: '#c749a1', lightest: '#cf4dab' } },
  { id: 'avatar-slate', name: 'Slate', colorPalette: { darkest: '#2a3d4a', dark: '#4a6070', mid: '#587080', light: '#7090a0', lightest: '#80a0b0' } },
  { id: 'avatar-charcoal', name: 'Charcoal', colorPalette: { darkest: '#1a1a1a', dark: '#3a3a3a', mid: '#4a4a4a', light: '#6a6a6a', lightest: '#7a7a7a' } },
];

export function isAvatarId(photoUrl: string | null | undefined): boolean {
  return !!photoUrl && photoUrl.startsWith(AVATAR_PREFIX);
}

export function getAvatarId(photoUrl: string): string {
  return photoUrl.replace(AVATAR_PREFIX, '');
}

export function getAvatarById(avatarId: string): AvatarOption | undefined {
  return AVATARS.find((a) => a.id === avatarId);
}

export function formatAvatarUrl(avatarId: string): string {
  return `${AVATAR_PREFIX}${avatarId}`;
}
```

**Dependencies:** None

---

### Task 3: Create PlayerAvatar Component
**Status:** ✅ Complete
**File:** `src/components/common/PlayerAvatar.tsx`

**Command (copy and run):**
```
/component PlayerAvatar - Create a unified avatar display component at src/components/common/PlayerAvatar.tsx. Props: photoUrl (string|null), name (string, optional for accessibility), size (number, default 64), style (ViewStyle). Import GolferIcon from ./GolferIcon and helpers (isAvatarId, getAvatarId, getAvatarById, DEFAULT_AVATAR_ID) from @/constants/avatars. Import Avatar from react-native-paper. Render logic: (1) if isAvatarId(photoUrl) → render GolferIcon with getAvatarById(getAvatarId(photoUrl)).colorPalette, (2) else if photoUrl is truthy → render Avatar.Image with uri, (3) else → render GolferIcon with default green palette. Wrap in circular View with overflow hidden and borderRadius size/2. Add accessibilityLabel. Memoize with React.memo(). Export from src/components/common/index.ts.
```

**Reference Details:**

**Props Interface:**
```typescript
interface PlayerAvatarProps {
  photoUrl: string | null | undefined;
  name?: string;           // For accessibility label
  size?: number;           // Default 64
  style?: StyleProp<ViewStyle>;
}
```

**Render Logic:**
1. If `isAvatarId(photoUrl)` → render `GolferIcon` with that avatar's palette
2. Else if `photoUrl` is a URL → render `Avatar.Image` with remote source
3. Else (null/undefined) → render `GolferIcon` with default green palette

**Dependencies:** Task 1 (GolferIcon), Task 2 (avatar helpers)

---

### Task 4: Export Components from Common
**Status:** ✅ Complete
**File:** `src/components/common/index.ts`

**Command:** Manual edit (simple export additions)

**Add these exports:**
```typescript
// Add to existing exports in src/components/common/index.ts
export { GolferIcon } from './GolferIcon';
export type { GolferIconProps } from './GolferIcon';
export { PlayerAvatar } from './PlayerAvatar';
export type { PlayerAvatarProps } from './PlayerAvatar';
```

**Dependencies:** Task 1, Task 3

---

## Sprint 2: Avatar Selection Modal

### Task 5: Create AvatarSelectionModal Component
**Status:** ✅ Complete
**File:** `src/components/common/AvatarSelectionModal.tsx`

**Command (copy and run):**
```
/component AvatarSelectionModal - Create a bottom sheet modal at src/components/common/AvatarSelectionModal.tsx. Props: visible (boolean), onClose (function), onSelect (function taking avatarId string), currentAvatarUrl (string|null). Import GolferIcon from ./GolferIcon, AVATARS and helpers from @/constants/avatars, Modal from react-native-paper, useThemeColors from @/context/ThemeContext. Render a 4x3 grid using FlatList with numColumns={4}. Each item is TouchableOpacity with GolferIcon (size ~60) and Text label below showing avatar.name. Selected avatar (match currentAvatarUrl) gets primary colour border ring. Header shows "Choose Avatar" with close X button. On item press call onSelect(avatar.id) then onClose(). Use semi-transparent backdrop, rounded top corners, safe area padding. Add accessibility roles and labels.
```

**Reference Details:**

**Props Interface:**
```typescript
interface AvatarSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (avatarId: string) => void;
  currentAvatarUrl: string | null | undefined;
}
```

**Layout (4 columns x 3 rows):**
```
┌─────────────────────────────────────┐
│          Choose Avatar        [X]   │
├─────────────────────────────────────┤
│  [🏌️] [🏌️] [🏌️] [🏌️]              │
│  Green Blue  Navy  Teal             │
│                                     │
│  [🏌️] [🏌️] [🏌️] [🏌️]              │
│  Purple Violet Red  Orange          │
│                                     │
│  [🏌️] [🏌️] [🏌️] [🏌️]              │
│  Gold  Pink  Slate Charcoal         │
└─────────────────────────────────────┘
```

**Dependencies:** Task 1 (GolferIcon), Task 2 (AVATARS array)

---

### Task 6: Export AvatarSelectionModal from Common
**Status:** ✅ Complete
**File:** `src/components/common/index.ts`

**Command:** Manual edit (simple export addition)

**Add this export:**
```typescript
export { AvatarSelectionModal } from './AvatarSelectionModal';
export type { AvatarSelectionModalProps } from './AvatarSelectionModal';
```

**Dependencies:** Task 5

---

## Sprint 3: EditProfileScreen Integration

> **Note:** Tasks 7-10 are all changes to the same file. You can run them as one combined refactor or individually.

### Task 7: Add Avatar Selection State to EditProfileScreen
**Status:** ✅ Complete
**File:** `src/screens/profile/EditProfileScreen.tsx`

**Command (copy and run):**
```
/refactor src/screens/profile/EditProfileScreen.tsx - Add avatar selection state. Import formatAvatarUrl from @/constants/avatars. Add useState: avatarModalVisible (boolean, default false), pendingAvatarId (string|null, default null). Add useCallback handleAvatarSelect that sets pendingAvatarId and closes modal. Update isDirty to include (pendingAvatarId !== null). This is step 1 of 4 for avatar selection - just add the state and handlers, don't modify the UI yet.
```

**Changes Required:**

1. **Add imports:**
```typescript
import { formatAvatarUrl } from '@/constants/avatars';
```

2. **Add state (after existing useState calls):**
```typescript
const [avatarModalVisible, setAvatarModalVisible] = useState(false);
const [pendingAvatarId, setPendingAvatarId] = useState<string | null>(null);
```

3. **Add handler:**
```typescript
const handleAvatarSelect = useCallback((avatarId: string) => {
  setPendingAvatarId(avatarId);
  setAvatarModalVisible(false);
}, []);
```

4. **Update isDirty calculation** to include avatar changes

**Dependencies:** Task 2 (avatar helpers)

---

### Task 8: Update Avatar Display in EditProfileScreen
**Status:** ✅ Complete
**File:** `src/screens/profile/EditProfileScreen.tsx`

**Command (copy and run):**
```
/refactor src/screens/profile/EditProfileScreen.tsx - Replace the avatar display around lines 260-268. Currently shows Avatar.Icon with "Photo uploads coming soon" text. Replace with: TouchableOpacity (onPress opens modal) containing PlayerAvatar (import from @/components/common) with photoUrl={pendingAvatarId ? formatAvatarUrl(pendingAvatarId) : player?.photo_url}, size=100. Add pencil edit badge (View with Icon source="pencil") positioned absolute bottom-right. Change text to "Tap to change avatar". Add styles: avatarContainer with position relative, editBadge with position absolute bottom 0 right 0, width/height 32, borderRadius 16, centered content.
```

**Current Code to Replace (approx lines 260-268):**
```tsx
<Avatar.Icon
  size={100}
  icon="account"
  style={[styles.avatar, { backgroundColor: colors.primary }]}
/>
<Text style={[styles.avatarHint, { color: colors.textSecondary }]}>
  Photo uploads coming soon
</Text>
```

**New Code:**
```tsx
<TouchableOpacity
  onPress={() => setAvatarModalVisible(true)}
  style={styles.avatarContainer}
  accessibilityRole="button"
  accessibilityLabel="Change avatar"
>
  <PlayerAvatar
    photoUrl={pendingAvatarId ? formatAvatarUrl(pendingAvatarId) : player?.photo_url}
    name={player?.name}
    size={100}
  />
  <View style={[styles.editBadge, { backgroundColor: colors.primary }]}>
    <Icon source="pencil" size={16} color={colors.white} />
  </View>
</TouchableOpacity>
<Text style={[styles.avatarHint, { color: colors.textSecondary }]}>
  Tap to change avatar
</Text>
```

**Dependencies:** Task 3 (PlayerAvatar), Task 7 (state/handlers)

---

### Task 9: Integrate AvatarSelectionModal in EditProfileScreen
**Status:** ✅ Complete
**File:** `src/screens/profile/EditProfileScreen.tsx`

**Command (copy and run):**
```
/refactor src/screens/profile/EditProfileScreen.tsx - Add AvatarSelectionModal. Import AvatarSelectionModal from @/components/common. Render at end of component (before final closing tag): <AvatarSelectionModal visible={avatarModalVisible} onClose={() => setAvatarModalVisible(false)} onSelect={handleAvatarSelect} currentAvatarUrl={pendingAvatarId ? formatAvatarUrl(pendingAvatarId) : player?.photo_url} />
```

**Add Import:**
```typescript
import { AvatarSelectionModal, PlayerAvatar } from '@/components/common';
```

**Add Modal (before closing tags):**
```tsx
<AvatarSelectionModal
  visible={avatarModalVisible}
  onClose={() => setAvatarModalVisible(false)}
  onSelect={handleAvatarSelect}
  currentAvatarUrl={pendingAvatarId ? formatAvatarUrl(pendingAvatarId) : player?.photo_url}
/>
```

**Dependencies:** Task 5 (modal component), Task 7 (state), Task 8 (avatar display)

---

### Task 10: Update Form Submission with Avatar
**Status:** ✅ Complete
**File:** `src/screens/profile/EditProfileScreen.tsx`

**Command (copy and run):**
```
/refactor src/screens/profile/EditProfileScreen.tsx - Update the onSubmit/form submission handler to include avatar. Before calling updateProfile mutation, check if pendingAvatarId is not null - if so, add photoUrl: formatAvatarUrl(pendingAvatarId) to the mutation payload. After successful save, call setPendingAvatarId(null) to reset the pending state. Only include photoUrl in payload when avatar was actually changed.
```

**Changes to Submit Handler:**
```typescript
const onSubmit = async (data: FormData) => {
  // ... existing validation

  // Build photoUrl only if avatar was changed
  const photoUrl = pendingAvatarId !== null
    ? formatAvatarUrl(pendingAvatarId)
    : undefined;

  await updateProfile({
    name: data.name,
    handicap: data.handicap,
    // ... other existing fields
    ...(photoUrl !== undefined && { photoUrl }),
  });

  // Reset pending state after successful save
  setPendingAvatarId(null);
};
```

**Dependencies:** Task 7 (state), Task 9 (modal integration)

---

## Sprint 4: App-Wide Avatar Updates

### Task 11: Update Avatar Displays Across App
**Status:** ✅ Complete
**Files:** Multiple components

**Command (copy and run):**
```
/refactor - Replace all player avatar displays with PlayerAvatar component. Search for Avatar.Image and Avatar.Icon usages in src/screens/profile/ProfileScreen.tsx and src/components/teams/TeamFormationUI.tsx. Replace with PlayerAvatar (import from @/components/common) passing photoUrl={player.photo_url} and appropriate size. Also run: grep -rn "Avatar.Image\|Avatar.Icon" src/components src/screens --include="*.tsx" to find any other player avatar usages. The PlayerAvatar component handles bundled avatars (avatar:avatar-blue format), remote URLs, and null fallback automatically.
```

**Files to Update:**

1. **`src/screens/profile/ProfileScreen.tsx`** (lines ~121-133)
   - Replace `Avatar.Image`/`Avatar.Icon` with `PlayerAvatar`
   - Pass `photoUrl={player?.photo_url}` and `size={100}`

2. **`src/components/teams/TeamFormationUI.tsx`** (lines ~509-522)
   - Replace player avatar display with `PlayerAvatar`
   - Pass player's `photo_url` from team member data

3. **Search for other files:**
   ```bash
   grep -rn "Avatar.Image\|Avatar.Icon" src/components src/screens --include="*.tsx" | grep -i player
   ```

**Replacement Pattern:**
```tsx
// Before:
<Avatar.Image source={{ uri: player.photo_url }} size={40} />
// or
<Avatar.Icon icon="account" size={40} />

// After:
<PlayerAvatar photoUrl={player.photo_url} name={player.name} size={40} />
```

**Dependencies:** Task 3 (PlayerAvatar component)

---

## Sprint 5: Testing & Review

### Task 12: Create Component Tests
**Status:** ✅ Complete (3/3 complete)
**Files:** Test files for new components

**Commands (copy and run each):**

**12a. GolferIcon tests:** ✅ Complete (31 tests passing)
```
/test-component src/components/common/GolferIcon.tsx - Follow pattern from src/components/common/Pill.test.tsx. Test cases: (1) renders without crashing with valid colorPalette, (2) scales correctly with different size props (50, 100, 200), (3) applies colorPalette colours to SVG paths. Use React Native Testing Library.
```

**12b. PlayerAvatar tests:** ✅ Complete (35 tests passing)
```
/test-component src/components/common/PlayerAvatar.tsx - Follow pattern from src/components/common/EmptyState.test.tsx. Test cases: (1) renders GolferIcon for "avatar:avatar-blue" URL, (2) renders Avatar.Image for remote URL "https://example.com/photo.jpg", (3) renders default green GolferIcon for null/undefined photoUrl, (4) applies correct size to container, (5) has accessibility label including name prop when provided.
```

**12c. AvatarSelectionModal tests:** ✅ Complete (33 tests passing)
```
/test-component src/components/common/AvatarSelectionModal.tsx - Test cases: (1) renders all 12 avatar options from AVATARS array, (2) highlights current selection with border when currentAvatarUrl matches, (3) calls onSelect with correct avatarId when avatar tapped, (4) calls onClose when modal dismissed, (5) has accessible button roles and labels on each avatar option.
```

**Test Cases Summary:**

**GolferIcon.test.tsx:** ✅ Complete
- [x] Renders without crashing with valid colorPalette
- [x] Scales correctly with different size props
- [x] Applies dynamic fill colours to correct paths

**PlayerAvatar.test.tsx:** ✅ Complete
- [x] Renders GolferIcon for `avatar:avatar-blue` URL
- [x] Renders Avatar.Image for remote URL (`https://...`)
- [x] Renders default green GolferIcon for null/undefined
- [x] Applies correct size to container
- [x] Has correct accessibility label with name prop

**AvatarSelectionModal.test.tsx:** ✅ Complete
- [x] Renders all 12 avatar options
- [x] Highlights current selection with border
- [x] Calls onSelect with correct avatarId when tapped
- [x] Calls onClose when dismissed
- [x] Has accessible role and labels

**Dependencies:** Tasks 1, 3, 5

---

### Task 13: Code Review
**Status:** ✅ Complete
**Scope:** All new and modified files

**Command (copy and run):**
```
/review src/components/common/GolferIcon.tsx src/components/common/PlayerAvatar.tsx src/components/common/AvatarSelectionModal.tsx src/constants/avatars.ts src/screens/profile/EditProfileScreen.tsx - Review avatar selection implementation. Check: (1) component patterns consistent with codebase, (2) TypeScript types properly defined and exported, (3) theme colours via useThemeColors() hook, (4) accessibility roles/labels/states, (5) no inline styles that should be StyleSheet, (6) React.memo() applied where beneficial, (7) no unnecessary re-renders, (8) error handling for missing avatar ID edge cases.
```

**Review Checklist:**
- [x] Component patterns consistent with codebase
- [x] TypeScript types properly defined and exported
- [x] Theme colours used via `useThemeColors()` hook
- [x] Accessibility roles, labels, and states
- [x] No inline styles that should be in StyleSheet
- [x] Memoization applied where beneficial (React.memo)
- [x] No performance issues (unnecessary re-renders)
- [x] Error handling for edge cases (missing avatar ID, etc.)

**Review Summary (2025-12-25):**
All files passed review. Implementation follows codebase conventions with proper TypeScript types, accessibility support, theme integration, and memoization.

**Dependencies:** All previous tasks

---

## Progress Summary

### Completion Statistics
- **Total Tasks:** 13
- **Completed:** 13 (100%)
- **In Progress:** 0 (0%)
- **Not Started:** 0 (0%)

### Sprint Progress

**Sprint 1: Core Infrastructure** ✅ Complete (4/4 tasks)
- ✅ Task 1: Create GolferIcon SVG Component (`/component GolferIcon`)
- ✅ Task 2: Create Avatar Configuration Module (manual)
- ✅ Task 3: Create PlayerAvatar Component (`/component PlayerAvatar`)
- ✅ Task 4: Export Components from Common (manual)

**Sprint 2: Avatar Selection Modal** ✅ Complete (2/2 tasks)
- ✅ Task 5: Create AvatarSelectionModal Component (`/component AvatarSelectionModal`)
- ✅ Task 6: Export AvatarSelectionModal from Common (manual)

**Sprint 3: EditProfileScreen Integration** ✅ Complete (4/4 tasks)
- ✅ Task 7: Add Avatar Selection State (`/refactor EditProfileScreen`)
- ✅ Task 8: Update Avatar Display (`/refactor EditProfileScreen`)
- ✅ Task 9: Integrate AvatarSelectionModal (`/refactor EditProfileScreen`)
- ✅ Task 10: Update Form Submission (`/refactor EditProfileScreen`)

**Sprint 4: App-Wide Avatar Updates** ✅ Complete (1/1 tasks)
- ✅ Task 11: Update Avatar Displays Across App (`/refactor`)

**Sprint 5: Testing & Review** ✅ Complete (2/2 tasks)
- ✅ Task 12: Create Component Tests (`/test-component`) - 99 tests total (31 + 35 + 33)
- ✅ Task 13: Code Review (`/review`) - All checks passed

---

## Critical Files

### New Files
| File | Purpose |
|------|---------|
| `src/components/common/GolferIcon.tsx` | SVG component with dynamic colour props |
| `src/constants/avatars.ts` | Avatar configuration and helper functions |
| `src/components/common/PlayerAvatar.tsx` | Unified avatar display component |
| `src/components/common/AvatarSelectionModal.tsx` | Grid-based avatar picker modal |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/common/index.ts` | Export new components |
| `src/screens/profile/EditProfileScreen.tsx` | Add avatar selection UI and logic |
| `src/screens/profile/ProfileScreen.tsx` | Use PlayerAvatar component |
| `src/components/teams/TeamFormationUI.tsx` | Use PlayerAvatar component |

---

## Technical Considerations

### SVG to React Native
- Use `react-native-svg` (already installed) for SVG rendering
- Convert `<path>` elements to `<Path>` components
- Convert `<g>` elements to `<G>` components
- Use `<Svg>` as root with viewBox for scaling
- Replace class-based styles with inline fill props

### Colour Mapping
- Original classes: st0, st2, st7, st10, st11 → dynamic palette
- Constants: st1, st3, st4, st5, st6, st8, st9 → hardcoded in component
- All 12 palettes maintain same shade relationships (darkest to lightest)

### Storage Format
- `photo_url = "avatar:avatar-blue"` for bundled avatars
- Supports future remote URLs without format change
- `isAvatarId()` check enables conditional rendering

### Theme Support
- Modal components use `useThemeColors()` hook
- Avatar colours are fixed (not theme-dependent) for recognisability
- Selection indicators adapt to light/dark mode

### Accessibility
- Avatar items have `accessibilityRole="button"`
- Each avatar has descriptive `accessibilityLabel` (e.g., "Blue golfer avatar")
- Selection state communicated via `accessibilityState`
- Touch targets meet 44x44px minimum

### Performance
- No network requests - avatars rendered from SVG + config
- FlatList with `numColumns` for efficient grid
- SVG components are lightweight
- Memoize GolferIcon to prevent unnecessary re-renders

---

## Testing Checklist

### Avatar Selection Flow
- [ ] Tap avatar in EditProfileScreen opens modal
- [ ] All 12 avatars displayed in grid (4x3)
- [ ] Current selection highlighted with border ring
- [ ] Tap avatar selects and closes modal
- [ ] Unsaved changes show pending avatar
- [ ] Save persists avatar to database
- [ ] Cancel reverts to original avatar

### Avatar Display
- [ ] GolferIcon renders correctly with each colour palette
- [ ] PlayerAvatar renders bundled avatar for `avatar:*` URLs
- [ ] PlayerAvatar renders image for remote URLs
- [ ] PlayerAvatar renders default green for null
- [ ] Proper scaling at different sizes (40, 64, 100)

### Colour Variations
- [ ] All 12 colour palettes look distinct
- [ ] Shade relationships maintained (dark to light gradient)
- [ ] Constant colours (face, flag, outlines) consistent across all

### Theme Support
- [ ] Modal adapts to light/dark theme
- [ ] Selection indicator visible in both themes
- [ ] Text labels readable in both themes

### App-Wide Consistency
- [ ] ProfileScreen shows selected avatar
- [ ] Team formation shows player avatars
- [ ] Friend lists show avatars
- [ ] Consistent sizing across app

---

**Last Updated:** 2025-12-25
**Status:** Planning Complete - Ready for Implementation
**Commands:** Updated with detailed Claude slash command context
