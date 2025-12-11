# SettingsScreen

**File:** `src/screens/profile/SettingsScreen.tsx`

## Overview

The SettingsScreen allows users to configure app preferences including distance units and scoring entry options. These settings affect how data is displayed in scorecard entry, leaderboards, and statistics throughout the app.

## Features

- **Distance Units**: Toggle between metres and yards
- **Scoring Entry Options**: Enable/disable putts, FIR, and GIR tracking
- **Reset to Defaults**: One-tap reset of all settings
- **Clear Sync Queue**: Troubleshooting tool for sync issues

## Navigation

| Destination | Trigger |
|-------------|---------|
| Previous screen | Back button |

## Data Dependencies

### Store Integration
Uses `useSettingsStore` (Zustand) for all settings state:

**State Values:**
- `distanceUnit` - `'metres' | 'yards'`
- `showPutts` - `boolean`
- `showFairwayHit` - `boolean`
- `showGreenInRegulation` - `boolean`

**Actions:**
- `setDistanceUnit(unit)` - Update distance unit
- `setShowPutts(value)` - Toggle putts tracking
- `setShowFairwayHit(value)` - Toggle FIR tracking
- `setShowGreenInRegulation(value)` - Toggle GIR tracking
- `resetToDefaults()` - Reset all settings

### External Services
- `clearSyncQueue()` from `@/services/offline/sync` - Clears pending sync operations

## Component Structure

```
SettingsScreen
├── Header
│   ├── BackButton
│   ├── Title ("Settings")
│   └── HeaderSpacer
└── ScrollView
    ├── Section (Distance Units)
    │   ├── SectionTitle
    │   ├── SectionDescription
    │   └── DistanceOptions
    │       ├── DistanceOption (Metres)
    │       └── DistanceOption (Yards)
    ├── Divider
    ├── Section (Scoring Entry)
    │   ├── SectionTitle
    │   ├── SectionDescription
    │   └── SettingsGroup
    │       ├── SettingRow (Putts)
    │       ├── SettingRow (Fairways Hit)
    │       └── SettingRow (Greens in Regulation)
    ├── Divider
    ├── Section (Reset)
    │   └── ResetButton
    ├── Divider
    ├── Section (Troubleshooting)
    │   ├── SectionTitle
    │   ├── SectionDescription
    │   └── TroubleshootButton (Clear Sync Queue)
    └── InfoFooter
```

## State Management

| State | Type | Purpose |
|-------|------|---------|
| `isClearing` | `boolean` | Loading state for sync queue clearing |

## Internal Components

### SettingRow
Memoized toggle row for boolean settings.

| Prop | Type | Description |
|------|------|-------------|
| `icon` | `string` | Material Design icon name |
| `label` | `string` | Setting name |
| `description` | `string?` | Optional helper text |
| `value` | `boolean` | Current toggle state |
| `onValueChange` | `(value: boolean) => void` | Change handler |

### DistanceOption
Memoized radio button for distance unit selection.

| Prop | Type | Description |
|------|------|-------------|
| `unit` | `DistanceUnit` | 'metres' or 'yards' |
| `label` | `string` | Display text |
| `isSelected` | `boolean` | Selection state |
| `onSelect` | `() => void` | Selection handler |

## Settings Configuration

### Distance Units
| Option | Value | Description |
|--------|-------|-------------|
| Metres | `'metres'` | Metric distances |
| Yards | `'yards'` | Imperial distances |

### Scoring Entry Options
| Setting | Icon | Description |
|---------|------|-------------|
| Putts | `golf-tee` | Track number of putts per hole |
| Fairways Hit (FIR) | `arrow-right-bold` | Track fairways hit on par 4s and 5s |
| Greens in Regulation (GIR) | `flag-checkered` | Track greens hit in regulation |

## Interactions

### Distance Unit Selection
Tapping a distance option updates the store immediately:
```typescript
onSelect={() => setDistanceUnit('metres')}
```

### Toggle Settings
Switch toggles update store directly:
```typescript
<Switch
  value={showPutts}
  onValueChange={setShowPutts}
/>
```

### Reset to Defaults
Single function call resets all settings:
```typescript
const handleResetDefaults = useCallback(() => {
  resetToDefaults();
}, [resetToDefaults]);
```

### Clear Sync Queue
Shows confirmation alert before clearing:
```typescript
Alert.alert(
  'Clear Sync Queue',
  'This will clear all pending sync operations...',
  [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Clear',
      style: 'destructive',
      onPress: async () => {
        setIsClearing(true);
        const result = await clearSyncQueue();
        Alert.alert('Sync Queue Cleared', `Cleared ${result.pendingCleared}...`);
        setIsClearing(false);
      },
    },
  ]
);
```

## Sync Queue Clearing

The troubleshooting feature helps resolve sync issues:

1. User taps "Clear Sync Queue"
2. Confirmation alert appears
3. On confirm, `clearSyncQueue()` is called
4. Loading indicator shown during operation
5. Success/failure alert displayed
6. Returns: `{ pendingCleared: number, invalidCleared: number }`

## UI Components Used

- `View`, `ScrollView`, `Pressable`, `Alert` - React Native core
- `Text`, `Switch`, `Icon`, `Divider`, `ActivityIndicator` - React Native Paper
- `useSafeAreaInsets` - Safe area handling

## Styling Highlights

- Distance options as selectable cards with border highlight
- Selected option shows primary color border and checkmark
- Settings group with white background and rounded corners
- Reset button with error color styling
- Troubleshoot button with neutral gray styling
- Info footer with gray background and information icon

## Accessibility

- Distance options have `accessibilityRole="radio"` and `accessibilityState`
- Switch toggles have `accessibilityLabel` and `accessibilityHint`
- Back button has `accessibilityRole="button"` and label
- Reset/troubleshoot buttons have accessibility labels
- Minimum 64px height for setting rows
