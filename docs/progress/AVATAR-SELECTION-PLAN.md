# Profile Avatar Selection - Implementation Plan

**Goal:** Replace "Photo uploads coming soon" placeholder with selectable avatar options using code-generated colored placeholders (upgradable to real cartoon portraits later).
**Status:** Not Started - 0% Complete (0/10 tasks)

---

## Overview

This plan adds **profile avatar selection** to the EditProfileScreen. Users can choose from 16 code-generated placeholder avatars (colored circles with golf icons). The infrastructure supports upgrading to real cartoon golfer portraits later.

### Current State (Already Implemented)

- **Database Schema**: `photo_url TEXT` field on players table
- **Player Type**: `photo_url: string | null` in `src/types/database/player.types.ts`
- **Profile Update**: `updateProfile()` mutation already supports `photoUrl` parameter
- **Avatar Display**: Avatar.Image/Avatar.Icon components in ProfileScreen and EditProfileScreen
- **Placeholder**: "Photo uploads coming soon" text in EditProfileScreen (line 266-268)
- **Dependencies**: `expo-image-picker` installed (unused - not needed for this approach)

### What This Plan Adds

- **Avatar Configuration**: 16 placeholder avatars with colors and golf icons
- **PlayerAvatar Component**: Unified avatar display handling placeholder and URL avatars
- **AvatarSelectionModal**: Grid-based picker triggered by tapping avatar
- **EditProfileScreen Integration**: Tappable avatar with selection flow
- **Future Upgrade Path**: Format supports swapping placeholders for real images

### Avatar Configuration

| ID | Color | Icon | Label |
|----|-------|------|-------|
| avatar-01 | #4CAF50 (green) | golf | Green Golf |
| avatar-02 | #2196F3 (blue) | golf-tee | Blue Tee |
| avatar-03 | #009688 (teal) | flag | Teal Flag |
| avatar-04 | #9C27B0 (purple) | trophy | Purple Trophy |
| avatar-05 | #FF9800 (orange) | golf | Orange Golf |
| avatar-06 | #F44336 (red) | flag-variant | Red Flag |
| avatar-07 | #E91E63 (pink) | star | Pink Star |
| avatar-08 | #FFC107 (gold) | crown | Gold Crown |
| ... | (8 more variations with alternate icons) | ... | ... |

### Storage Format

```
photo_url = "avatar:avatar-01"
```

This prefix-based format allows easy detection of bundled vs remote avatars and supports future migration to real images stored in Supabase Storage.

---

## Sprint 1: Core Infrastructure

### Task 1: Create Avatar Configuration Module
**Status:** ⬜ Not Started
**File:** `src/constants/avatars.ts`
**Deliverables:**
- [ ] Define `AvatarOption` interface with id, color, icon, label
- [ ] Export `AVATARS` array with 16 placeholder definitions
- [ ] Export `AVATAR_PREFIX = 'avatar:'` constant
- [ ] Create `isAvatarId(photoUrl)` - checks if URL is bundled avatar
- [ ] Create `getAvatarId(photoUrl)` - extracts ID from prefixed URL
- [ ] Create `getAvatarById(avatarId)` - finds avatar config by ID
- [ ] Create `formatAvatarUrl(avatarId)` - adds prefix for storage

**Code Pattern:**
```typescript
export interface AvatarOption {
  id: string;           // e.g., "avatar-01"
  color: string;        // Hex color for background
  icon: string;         // MaterialCommunityIcons name
  label: string;        // Accessibility label
}

export const AVATAR_PREFIX = 'avatar:';

export const AVATARS: AvatarOption[] = [
  { id: 'avatar-01', color: '#4CAF50', icon: 'golf', label: 'Green Golf' },
  // ... 15 more
];
```

**Dependencies:** None

---

### Task 2: Create PlayerAvatar Component
**Status:** ⬜ Not Started
**File:** `src/components/common/PlayerAvatar.tsx`
**Deliverables:**
- [ ] Create component with props: photoUrl, name, size, style
- [ ] Render colored circle + icon for placeholder avatars (using avatar config)
- [ ] Render Avatar.Image for remote URLs (future real images)
- [ ] Render Avatar.Icon fallback for null/undefined photoUrl
- [ ] Support all common avatar sizes (40, 64, 100)
- [ ] Apply theme colors correctly
- [ ] Add accessibility labels

**Component Logic:**
```typescript
if (isAvatarId(photoUrl)) {
  // Render View with backgroundColor + Icon
  const avatar = getAvatarById(getAvatarId(photoUrl));
  return <View style={{ backgroundColor: avatar.color }}>
    <Icon source={avatar.icon} color={colors.white} />
  </View>
} else if (photoUrl) {
  // Render Avatar.Image with uri
  return <Avatar.Image source={{ uri: photoUrl }} />
} else {
  // Render fallback icon
  return <Avatar.Icon icon="account" />
}
```

**Dependencies:** Task 1

---

### Task 3: Export PlayerAvatar from Common
**Status:** ⬜ Not Started
**File:** `src/components/common/index.ts`
**Deliverables:**
- [ ] Add export for PlayerAvatar component
- [ ] Add export for PlayerAvatarProps type

**Dependencies:** Task 2

---

## Sprint 2: Avatar Selection Modal

### Task 4: Create AvatarSelectionModal Component
**Status:** ⬜ Not Started
**File:** `src/components/common/AvatarSelectionModal.tsx`
**Deliverables:**
- [ ] Create BottomSheet-based modal (follow existing BottomSheet pattern)
- [ ] Props: visible, onClose, onSelect, currentAvatarUrl
- [ ] Header: "Choose Avatar" with close button
- [ ] "Remove avatar" option at top (clears to null)
- [ ] Grid layout (4 columns) of all 16 avatars
- [ ] Selected state indicator (border + checkmark)
- [ ] Use FlatList with numColumns for efficient rendering
- [ ] Theme-aware colors (useThemeColors hook)
- [ ] Accessibility: role="button", labels, selected state

**Layout:**
```
┌─────────────────────────────────────┐
│          Choose Avatar        [X]  │
├─────────────────────────────────────┤
│   [ Remove avatar ]                 │
├─────────────────────────────────────┤
│  [O] [O] [O] [O]                   │
│  [O] [O] [O] [O]                   │
│  [O] [O] [O] [O]                   │
│  [O] [O] [O] [O]                   │
└─────────────────────────────────────┘
```

**Dependencies:** Task 1, Task 2

---

### Task 5: Export AvatarSelectionModal from Common
**Status:** ⬜ Not Started
**File:** `src/components/common/index.ts`
**Deliverables:**
- [ ] Add export for AvatarSelectionModal component
- [ ] Add export for AvatarSelectionModalProps type

**Dependencies:** Task 4

---

## Sprint 3: EditProfileScreen Integration

### Task 6: Add Avatar Selection State to EditProfileScreen
**Status:** ⬜ Not Started
**File:** `src/screens/profile/EditProfileScreen.tsx`
**Deliverables:**
- [ ] Add `avatarModalVisible` state (boolean)
- [ ] Add `pendingAvatarId` state (string | null) for unsaved changes
- [ ] Update `isDirty` logic to include avatar changes
- [ ] Create `handleAvatarSelect(avatarId)` callback

**Dependencies:** Task 1

---

### Task 7: Update Avatar Display in EditProfileScreen
**Status:** ⬜ Not Started
**File:** `src/screens/profile/EditProfileScreen.tsx`
**Deliverables:**
- [ ] Replace Avatar.Image/Avatar.Icon with PlayerAvatar component
- [ ] Wrap avatar in TouchableOpacity to trigger modal
- [ ] Add pencil edit badge overlay (positioned absolute)
- [ ] Replace "Photo uploads coming soon" text with "Tap to change avatar"
- [ ] Show pending avatar if changed, otherwise current player.photo_url

**UI Change:**
```
Before:                     After:
┌──────────┐               ┌──────────┐
│   [👤]   │               │   [⛳]   │ ← Colored avatar
│          │               │     ✏️   │ ← Pencil badge
│ Coming   │               │ Tap to   │
│ soon     │               │ change   │
└──────────┘               └──────────┘
```

**Dependencies:** Task 2, Task 6

---

### Task 8: Integrate AvatarSelectionModal in EditProfileScreen
**Status:** ⬜ Not Started
**File:** `src/screens/profile/EditProfileScreen.tsx`
**Deliverables:**
- [ ] Import AvatarSelectionModal component
- [ ] Render modal at end of component (before closing tags)
- [ ] Pass visible={avatarModalVisible} prop
- [ ] Pass onClose to set avatarModalVisible false
- [ ] Pass onSelect={handleAvatarSelect} callback
- [ ] Pass currentAvatarUrl (pending or player.photo_url)

**Dependencies:** Task 4, Task 7

---

### Task 9: Update Form Submission with Avatar
**Status:** ⬜ Not Started
**File:** `src/screens/profile/EditProfileScreen.tsx`
**Deliverables:**
- [ ] Update `onSubmit` to include avatar in updateProfile call
- [ ] Format avatar ID using `formatAvatarUrl()` before saving
- [ ] Handle "remove avatar" case (empty string → null)
- [ ] Only include photoUrl if avatar was changed (pendingAvatarId !== null)
- [ ] Reset pendingAvatarId after successful save

**Submit Logic:**
```typescript
const onSubmit = async (data) => {
  let photoUrl: string | undefined;
  if (pendingAvatarId !== null) {
    photoUrl = pendingAvatarId === ''
      ? ''  // Will become null in database
      : formatAvatarUrl(pendingAvatarId);
  }

  await updateProfile({
    ...existingFields,
    ...(photoUrl !== undefined && { photoUrl }),
  });
};
```

**Dependencies:** Task 6, Task 8

---

## Sprint 4: App-Wide Avatar Updates

### Task 10: Update Avatar Displays Across App
**Status:** ⬜ Not Started
**Files:** Multiple components
**Deliverables:**
- [ ] Update `src/screens/profile/ProfileScreen.tsx` to use PlayerAvatar
- [ ] Update `src/components/teams/TeamFormationUI.tsx` to use PlayerAvatar
- [ ] Audit and update any other Avatar.Image usages for player photos
- [ ] Ensure consistent avatar rendering across app

**Components to Check:**
- ProfileScreen (lines 121-133)
- TeamFormationUI (lines 509-522)
- FriendSelector components
- PlayerDetailScreen

**Dependencies:** Task 2

---

## Progress Summary

### Completion Statistics
- **Total Tasks:** 10
- **Completed:** 0 (0%)
- **In Progress:** 0 (0%)
- **Not Started:** 10 (100%)

### Sprint Progress

**Sprint 1: Core Infrastructure** ⬜ Not Started (0/3 tasks)
- ⬜ Task 1: Create Avatar Configuration Module
- ⬜ Task 2: Create PlayerAvatar Component
- ⬜ Task 3: Export PlayerAvatar from Common

**Sprint 2: Avatar Selection Modal** ⬜ Not Started (0/2 tasks)
- ⬜ Task 4: Create AvatarSelectionModal Component
- ⬜ Task 5: Export AvatarSelectionModal from Common

**Sprint 3: EditProfileScreen Integration** ⬜ Not Started (0/4 tasks)
- ⬜ Task 6: Add Avatar Selection State to EditProfileScreen
- ⬜ Task 7: Update Avatar Display in EditProfileScreen
- ⬜ Task 8: Integrate AvatarSelectionModal in EditProfileScreen
- ⬜ Task 9: Update Form Submission with Avatar

**Sprint 4: App-Wide Avatar Updates** ⬜ Not Started (0/1 tasks)
- ⬜ Task 10: Update Avatar Displays Across App

---

## Critical Files

### New Files
| File | Purpose |
|------|---------|
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

### Storage Format
- `photo_url = "avatar:avatar-01"` for placeholder avatars
- Supports future remote URLs without format change
- `isAvatarId()` check enables conditional rendering

### Theme Support
- All components use `useThemeColors()` hook
- Avatar colors are fixed (not theme-dependent) for recognizability
- Selection indicators adapt to light/dark mode

### Accessibility
- Avatar items have `accessibilityRole="button"`
- Each avatar has descriptive `accessibilityLabel`
- Selection state communicated via `accessibilityState`
- Touch targets meet 44x44px minimum

### Performance
- No network requests - avatars rendered from config
- FlatList with `numColumns` for efficient grid
- No image files to load/cache

### Future Upgrade Path
1. Generate real cartoon golfer portraits (DALL-E/Midjourney)
2. Upload to Supabase Storage as `avatars/avatar-01.png`
3. Update `avatars.ts` to include `imageUrl` field
4. Update `PlayerAvatar` to prefer `imageUrl` over color/icon
5. Existing user selections continue to work

---

## Testing Checklist

### Avatar Selection Flow
- [ ] Tap avatar in EditProfileScreen opens modal
- [ ] All 16 avatars displayed in grid
- [ ] Current selection highlighted
- [ ] Tap avatar selects and closes modal
- [ ] "Remove avatar" clears selection
- [ ] Unsaved changes show pending avatar
- [ ] Save persists avatar to database
- [ ] Cancel reverts to original avatar

### Avatar Display
- [ ] PlayerAvatar renders colored circle for placeholder
- [ ] PlayerAvatar renders image for remote URL
- [ ] PlayerAvatar renders fallback for null
- [ ] Correct icon displayed for each avatar
- [ ] Correct colors displayed

### Theme Support
- [ ] Modal adapts to light/dark theme
- [ ] Selection indicator visible in both themes
- [ ] Text colors correct in both themes

### App-Wide Consistency
- [ ] ProfileScreen shows selected avatar
- [ ] Team formation shows player avatars
- [ ] Friend lists show avatars
- [ ] Consistent sizing across app

---

**Last Updated:** 2025-12-25
**Status:** Planning Complete - Ready for Implementation
