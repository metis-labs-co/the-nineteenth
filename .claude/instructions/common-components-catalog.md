# Common Components Catalog - The Nineteenth

Quick reference for all reusable components. Use these instead of building custom implementations.

## Form Components

| Component | Use For | Key Props |
|-----------|---------|-----------|
| `FormInput` | Text inputs with labels/errors | `label`, `value`, `onChangeText`, `error` |
| `FormSection` | Grouping form fields | `title`, `description`, `required`, `error` |
| `DatePicker` | Date/time selection | `value`, `onChange`, `mode` |
| `DateTimeFieldGroup` | Date + time together | `date`, `time`, `onDateChange`, `onTimeChange` |
| `PlayerSelector` | Select players | `players`, `selectedIds`, `onSelect`, `multiSelect` |
| `TeeSelector` | Select golf tees | `tees`, `selectedTee`, `onSelectTee`, `variant` |
| `SearchBar` | Search input field | `value`, `onChangeText`, `placeholder` |

## Display Components

| Component | Use For | Key Props |
|-----------|---------|-----------|
| `Pill` | Static labels/tags | `label`, `variant`, `size` |
| `StatusBadge` | Status indicators | `status`, `label` |
| `EmptyState` | No data message | `title`, `message`, `icon`, `actionLabel`, `onAction` |
| `ErrorState` | Error display | `error`, `onRetry`, `title` |
| `LoadingSpinner` | Loading state | `size`, `message` |
| `GolfBallLoader` | Animated loader | `size` |
| `ProgressBar` | Progress indicator | `value`, `max`, `label` |
| `StepIndicator` | Multi-step progress | `steps`, `currentStep` |
| `DateTimeDisplay` | Formatted date/time | `dateTime`, `size`, `icon` |
| `GolferIcon` | Golfer silhouette icon | `size`, `colors` |

## Navigation Components

| Component | Use For | Key Props |
|-----------|---------|-----------|
| `PageHeader` | Screen headers | `title`, `showBack`, `onBack`, `rightActions` |
| `SectionHeader` | List sections | `title`, `description`, `icon` |
| `Tabs` | Tab navigation | `tabs`, `selectedTab`, `onTabChange` |
| `BottomNavigation` | App navigation | `activeTab`, `onTabPress` |
| `NotificationBell` | Notification icon with badge | `onPress`, `size` |

## Interactive Components

| Component | Use For | Key Props |
|-----------|---------|-----------|
| `SegmentedButton` | Toggle options | `value`, `onValueChange`, `buttons` |
| `FilterPill` | Filter toggles | `label`, `selected`, `onPress` |
| `ExpandableItem` | Collapsible content | `title`, `isExpanded`, `onToggle`, `children` |
| `ExpandableList` | List of expandable items | `items`, `renderContent` |

## Modal Components

| Component | Use For | Key Props |
|-----------|---------|-----------|
| `BottomSheet` | Bottom modals | `visible`, `onClose`, `title` |
| `ConfirmationDialog` | Confirm actions | `visible`, `title`, `message`, `onConfirm` |
| `AvatarSelectionModal` | Pick avatar | `visible`, `onSelect`, `onClose` |
| `AddPlaceholderModal` | Add placeholder players | `visible`, `onAdd`, `onClose` |

## Info Components

| Component | Use For | Key Props |
|-----------|---------|-----------|
| `FeatureButton` | Feature cards | `title`, `subtitle`, `icon`, `onPress` |
| `PlayerAvatar` | Player images | `photoUrl`, `name`, `size` |
| `LogoHorizontal` | App logo horizontal | `height` |
| `OfflineIndicator` | Offline status banner | (no props, uses context) |

## When to Use What

### Empty Lists
```tsx
// Use EmptyState
<EmptyState
  title="No rounds yet"
  message="Start your first round"
  icon="golf"
  actionLabel="Start Round"
  onAction={handleStart}
/>

// Don't create custom empty state
```

### Error Handling
```tsx
// Use ErrorState
<ErrorState
  error="Failed to load data"
  onRetry={refetch}
/>

// Don't create custom error display
```

### Expandable Content
```tsx
// Use ExpandableItem
<ExpandableItem
  title="How do I create a competition?"
  isExpanded={expandedId === '1'}
  onToggle={() => setExpandedId(expandedId === '1' ? null : '1')}
>
  <Text>Go to the Competitions tab and tap the "+" button...</Text>
</ExpandableItem>

// Don't create custom accordion/collapsible views
```

### Search Fields
```tsx
// Use SearchBar
<SearchBar
  value={searchQuery}
  onChangeText={setSearchQuery}
  placeholder="Search courses..."
/>

// Don't create custom TextInput search fields
```

## Import Paths

All common components are available from `@/components/common`:

```tsx
import {
  EmptyState,
  ErrorState,
  LoadingSpinner,
  FormInput,
  FormSection,
  PageHeader,
  Tabs,
  SegmentedButton,
  FilterPill,
  BottomSheet,
  ConfirmationDialog,
} from '@/components/common';
```

## Component Location

All common components are in `src/components/common/`:

```
src/components/common/
├── BottomSheet/                  # Bottom sheet modal with animations
├── FriendSelector/               # Friend selection UI
├── PlayerSelector/               # Player selection UI
├── AddPlaceholderModal.tsx       # Add placeholder player modal
├── AvatarSelectionModal.tsx      # Avatar selection modal
├── ConfirmationDialog.tsx        # Confirmation dialog
├── DatePicker.tsx                # Date/time picker
├── DateTimeDisplay.tsx           # Formatted date/time display
├── DateTimeFieldGroup.tsx        # Date + time field group
├── EmptyState.tsx                # Empty state display
├── ErrorState.tsx                # Error state display
├── ExpandableItem.tsx            # Collapsible accordion item
├── FeatureButton.tsx             # Feature card button
├── FilterPill.tsx                # Filter toggle pill
├── FormInput.tsx                 # Form text input
├── FormSection.tsx               # Form section wrapper
├── GolfBallLoader.tsx            # Animated golf ball loader
├── GolferIcon.tsx                # Golfer silhouette icon
├── LoadingSpinner.tsx            # Loading spinner
├── LogoHorizontal.tsx            # Horizontal logo
├── NotificationBell.tsx          # Notification bell with badge
├── OfflineIndicator.tsx          # Offline status indicator
├── PageHeader.tsx                # Page header with navigation
├── Pill.tsx                      # Status/label pill
├── PlayerAvatar.tsx              # Player avatar image
├── ProgressBar.tsx               # Progress bar
├── SearchBar.tsx                 # Search input field
├── SectionHeader.tsx             # Section header
├── SegmentedButton.tsx           # Segmented button toggle
├── StatusBadge.tsx               # Status badge
├── StepIndicator.tsx             # Multi-step indicator
├── Tabs.tsx                      # Tab navigation
├── TeeSelector.tsx               # Golf tee selector
└── index.ts                      # Barrel exports
```
