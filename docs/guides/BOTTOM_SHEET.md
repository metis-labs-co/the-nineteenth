# BottomSheet Component Guide

## Overview

The `BottomSheet` component is a unified slide-from-bottom UI component that standardizes modal and sheet presentations across the app. It consolidates two previous patterns:

1. **React Native Modal** - Used for full-screen presentations (e.g., AddFriendModal)
2. **Custom Animated Views** - Used for partial sheets (e.g., CreateRoundBottomSheet)

The unified component provides consistent behavior, animations, and API regardless of the presentation style.

## Location

```
src/components/common/BottomSheet/
```

## File Structure

| File | Description |
|------|-------------|
| `types.ts` | TypeScript interfaces for all props and options |
| `constants.ts` | Animation defaults (damping: 20, stiffness: 150) and dimensions |
| `BottomSheet.tsx` | Main component |
| `BottomSheetHeader.tsx` | Default header with handle, title, and close button |
| `hooks/useBottomSheetAnimation.ts` | Spring animation logic |
| `hooks/useBottomSheetGestures.ts` | Swipe-to-dismiss handling |
| `hooks/useBottomSheet.ts` | State helper hook (open/close/toggle) |
| `index.ts` | Public exports |

---

## Key Props

### Core Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `visible` | `boolean` | required | Controls visibility of the bottom sheet |
| `onClose` | `() => void` | required | Callback when sheet is dismissed |
| `children` | `ReactNode` | required | Content to render inside the sheet |

### Height Configuration

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `height` | `'full' \| number` | `0.8` | Sheet height: `'full'` = 100%, number = percentage (0.8 = 80%) |

### Handle & Header

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showHandle` | `boolean` | `true` (partial), `false` (full) | Show drag indicator bar |
| `title` | `string` | - | Header title text |
| `showCloseButton` | `boolean` | `true` | Show close button (X) in header |
| `headerLeft` | `ReactNode` | - | Left header content (e.g., back button) |
| `headerRight` | `ReactNode` | - | Right header content (e.g., action button) |
| `customHeader` | `ReactNode` | - | Replace default header entirely |

### Backdrop

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showBackdrop` | `boolean` | `true` | Show semi-transparent backdrop |
| `closeOnBackdropPress` | `boolean` | `true` | Dismiss sheet when backdrop is tapped |

### Gestures

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enableSwipeToDismiss` | `boolean` | `true` | Enable swipe-down to dismiss gesture |
| `swipeThreshold` | `number` | `0.3` | Percentage of height to trigger dismiss (0.3 = 30%) |

### Safe Area

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `safeAreaTop` | `boolean` | `false` (partial), `true` (full) | Include top safe area inset |
| `safeAreaBottom` | `boolean` | `true` | Include bottom safe area inset |

### Keyboard

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `keyboardBehavior` | `'padding' \| 'height' \| 'position' \| 'none'` | iOS: `'padding'`, Android: `'height'` | Keyboard avoidance behavior |

### Animation

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `animationConfig.damping` | `number` | `20` | Spring damping for open/close |
| `animationConfig.stiffness` | `number` | `150` | Spring stiffness for open/close |
| `animationConfig.backdropOpenDuration` | `number` | `200` | Backdrop fade-in duration (ms) |
| `animationConfig.backdropCloseDuration` | `number` | `150` | Backdrop fade-out duration (ms) |

### Styling

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `containerStyle` | `StyleProp<ViewStyle>` | - | Style for the sheet container |
| `contentStyle` | `StyleProp<ViewStyle>` | - | Style for the content area |
| `testID` | `string` | - | Test ID for testing |

---

## Usage Examples

### Partial Sheet (80% Height)

Standard use case for forms, pickers, and selection sheets:

```tsx
import { BottomSheet, useBottomSheet } from '@/components/common/BottomSheet';

function MyScreen() {
  const { isOpen, open, close } = useBottomSheet();

  return (
    <>
      <Button onPress={open}>Open Sheet</Button>

      <BottomSheet
        visible={isOpen}
        onClose={close}
        height={0.8}
        title="Add Players"
      >
        <PlayerSelectionList onSelect={handleSelect} />
      </BottomSheet>
    </>
  );
}
```

### Full Screen Sheet

For search interfaces, forms, or any content that needs maximum space:

```tsx
<BottomSheet
  visible={visible}
  onClose={onClose}
  height="full"
  title="Add Friend"
  showHandle={false}
  safeAreaTop
>
  <View style={styles.searchContainer}>
    <SearchBar value={query} onChangeText={setQuery} />
  </View>
  <SearchResults results={results} />
</BottomSheet>
```

### With Custom Header Content

Adding action buttons or custom left/right elements:

```tsx
<BottomSheet
  visible={visible}
  onClose={onClose}
  title="Create Round"
  headerLeft={
    <TouchableOpacity onPress={handleBack}>
      <Icon source="arrow-left" size={24} />
    </TouchableOpacity>
  }
  headerRight={
    <TouchableOpacity onPress={handleSave}>
      <Text>Save</Text>
    </TouchableOpacity>
  }
>
  <RoundForm />
</BottomSheet>
```

### Without Close Button

When using a custom header or navigation:

```tsx
<BottomSheet
  visible={visible}
  onClose={onClose}
  title="Select Course"
  showCloseButton={false}
  headerLeft={
    <TouchableOpacity onPress={onClose}>
      <Text>Cancel</Text>
    </TouchableOpacity>
  }
  headerRight={
    <TouchableOpacity onPress={handleDone}>
      <Text>Done</Text>
    </TouchableOpacity>
  }
>
  <CourseList />
</BottomSheet>
```

### Disabling Swipe to Dismiss

For sheets with important form data that shouldn't be accidentally dismissed:

```tsx
<BottomSheet
  visible={visible}
  onClose={onClose}
  title="Edit Score"
  enableSwipeToDismiss={false}
  closeOnBackdropPress={false}
>
  <ScoreEntryForm />
</BottomSheet>
```

---

## Using the `useBottomSheet` Hook

The `useBottomSheet` hook provides a simple API for managing visibility:

```tsx
import { useBottomSheet } from '@/components/common/BottomSheet';

function MyComponent() {
  const { isOpen, open, close, toggle } = useBottomSheet();

  return (
    <>
      <Button onPress={open}>Open</Button>
      <Button onPress={toggle}>Toggle</Button>

      <BottomSheet visible={isOpen} onClose={close} title="Sheet">
        <Content />
      </BottomSheet>
    </>
  );
}
```

### Hook Return Type

```typescript
interface UseBottomSheetReturn {
  isOpen: boolean;   // Current visibility state
  open: () => void;  // Open the sheet
  close: () => void; // Close the sheet
  toggle: () => void; // Toggle visibility
}
```

---

## Migrated Components

The following components were migrated to use the unified BottomSheet:

| Component | Height | Notes |
|-----------|--------|-------|
| `CreateRoundBottomSheet` | `0.8` (80%) | Multi-step round creation wizard |
| `AddPlayersBottomSheet` | `0.8` (80%) | Player selection for competitions |
| `AddFriendModal` | `'full'` | Friend search with keyboard input |
| `ApiSearchModal` | `'full'` | Course search with API integration |

---

## Features

### Consistent Spring Animation

All sheets use the same spring physics for a natural, fluid feel:
- **Damping**: 20 (controls oscillation dampening)
- **Stiffness**: 150 (controls spring tension)

### Swipe-to-Dismiss

Users can swipe down to dismiss partial sheets:
- **Distance threshold**: 30% of sheet height
- **Velocity threshold**: 500 px/sec (fast swipe dismisses regardless of distance)
- Snaps back if threshold not met

### Backdrop Press-to-Dismiss

Tapping the semi-transparent backdrop closes the sheet (configurable via `closeOnBackdropPress`).

### Android Back Button Support

Pressing the hardware back button on Android closes the sheet gracefully.

### Keyboard Avoidance

Built-in `KeyboardAvoidingView` automatically adjusts the sheet when the keyboard appears:
- iOS: Uses `padding` behavior by default
- Android: Uses `height` behavior by default

### Dark/Light Theme Support

The component uses `useThemeColors()` to automatically adapt to the current theme:
- `colors.surface` for sheet background
- `colors.border` for handle and header border
- `colors.textPrimary` / `colors.textSecondary` for text

### Safe Area Handling

Respects device safe areas (notches, home indicators):
- Bottom safe area enabled by default
- Top safe area auto-enabled for full-screen sheets

---

## Animation Constants

```typescript
// src/components/common/BottomSheet/constants.ts

export const DEFAULT_ANIMATION_CONFIG = {
  damping: 20,                  // Spring damping
  stiffness: 150,               // Spring stiffness
  backdropOpenDuration: 200,    // ms
  backdropCloseDuration: 150,   // ms
};

export const DEFAULT_SWIPE_THRESHOLD = 0.3;    // 30%
export const SWIPE_VELOCITY_THRESHOLD = 500;   // px/sec
export const BACKDROP_OPACITY = 0.5;           // 50%
export const SHEET_BORDER_RADIUS = 20;         // px
export const HEADER_HEIGHT = 56;               // px
export const HANDLE_WIDTH = 40;                // px
export const HANDLE_HEIGHT = 4;                // px
export const CLOSE_BUTTON_SIZE = 44;           // px (accessibility minimum)
```

---

## Imports

```tsx
// Main component and hook
import { BottomSheet, useBottomSheet } from '@/components/common/BottomSheet';

// Header (rarely needed directly)
import { BottomSheetHeader } from '@/components/common/BottomSheet';

// Types
import type {
  BottomSheetProps,
  BottomSheetHeaderProps,
  BottomSheetHeight,
  BottomSheetAnimationConfig,
  UseBottomSheetReturn,
} from '@/components/common/BottomSheet';
```

---

## Best Practices

1. **Use `useBottomSheet` hook** for simple open/close state management
2. **Use `height={0.8}`** for most sheets (forms, pickers, lists)
3. **Use `height="full"`** for search interfaces or complex forms
4. **Disable swipe dismiss** when sheet contains unsaved form data
5. **Add `headerLeft`** for multi-step wizards (back navigation)
6. **Always provide a `title`** for accessibility and context
7. **Use `testID`** for automated testing

---

*Last Updated: December 2024*
