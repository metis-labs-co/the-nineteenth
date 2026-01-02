# Code Cleanup & Component Consolidation Plan

> **Document Location:** `docs/progress/CODE-CLEANUP-PLAN.md`
> **Created:** December 2024
> **Related:** See `REFACTORING_PLAN.md` for large file splitting progress

## Overview

This plan focuses on **component consolidation** and **quick wins** - replacing custom code with existing common components, and creating a few new reusable components to reduce duplication.

**Scope:** Comprehensive (all 25+ files identified)
**Priority:** Quick wins first, then component creation, then large file splits

## Summary

| Category | Count | Priority |
|----------|-------|----------|
| New components to create | 3 | High |
| Custom empty states to consolidate | 3 | High |
| Custom radio/button patterns | 3 | High |
| Menu item patterns to consolidate | 2 | Medium |
| Large files to split (new) | 15+ | Low |

---

## Phase 0: Create New Commands & Instructions (First)

### 0.1 Create `/consolidate` Command

**File:** `.claude/commands/consolidate.md`

```markdown
---
description: Replace custom code with existing common components
---

Consolidate: **{{arg1}}**

## Target Custom Code
{{arg2}}

## Instructions

1. Read the target file and identify custom implementation
2. Check available common components in `src/components/common/`
3. Read `.claude/instructions/common-components-catalog.md` for component reference
4. Find the matching common component to replace custom code
5. Update imports and replace custom implementation
6. Delete unused custom code
7. Ensure no functionality breaks

## Common Replacements

| Custom Pattern | Common Component |
|----------------|------------------|
| Custom empty state | `EmptyState` |
| Custom error display | `ErrorState` |
| Custom loading spinner | `LoadingSpinner` |
| Custom radio buttons | `RadioButtonOption` |
| Custom menu items | `MenuItemRow` |
| Custom info cards | `InfoCard` or `FormSection` |
| Custom tabs | `Tabs` |
| Custom buttons | `TouchableOpacity` with proper styling |

## Process

1. **Identify custom code** - Find the custom implementation to replace
2. **Find common component** - Check catalog for matching component
3. **Map props** - Match custom props to common component props
4. **Replace** - Swap implementation, update imports
5. **Test** - Verify functionality preserved
6. **Cleanup** - Remove unused custom code and styles

## Verification

- [ ] No TypeScript errors (`pnpm typecheck`)
- [ ] No lint errors (`pnpm lint`)
- [ ] Same visual appearance
- [ ] Same functionality
- [ ] Code is simpler and more maintainable
```

**Status:** [x] Created

---

### 0.2 Create `/split-hook` Command

**File:** `.claude/commands/split-hook.md`

```markdown
---
description: Split large hook into smaller focused hooks
---

Split Hook: **{{arg1}}**

## Split Goals
{{arg2}}

## Instructions

1. Read the current hook implementation
2. Identify distinct responsibilities (data fetching, state management, mutations, calculations)
3. Create new focused hooks in a subdirectory
4. Keep the original hook as a thin wrapper that composes the new hooks
5. Ensure backward compatibility

## Standard Hook Splitting Pattern

### File Structure
\`\`\`
src/hooks/
├── useOriginalHook.ts              # Keep as thin wrapper
└── [hookName]/
    ├── index.ts                    # Re-exports
    ├── useFetchData.ts             # Data fetching
    ├── useStateManagement.ts       # Local state
    ├── useMutations.ts             # Mutations
    └── types.ts                    # Shared types
\`\`\`

### Common Split Categories

| Responsibility | New Hook Pattern |
|----------------|------------------|
| Session/auth state | `useAuthSession` |
| User profile data | `useAuthUser` |
| Login/logout actions | `useAuthMutations` |
| Subscription status | `useSubscriptionStatus` |
| Tier limit checks | `useSubscriptionLimits` |
| Feature gating | `useFeatureGate` |
| Round metadata | `useRoundMetadata` |
| Player data | `useRoundPlayers` |
| Course data | `useRoundCourse` |
| Team data | `useRoundTeams` |

## Process

1. **Analyze responsibilities** - List what the hook does
2. **Group by concern** - Separate data fetching, state, mutations
3. **Create new hooks** - One per concern
4. **Compose in original** - Original hook calls new hooks
5. **Export both** - Keep original for backward compatibility, export new hooks for granular use
6. **Move types** - Extract shared types to types.ts

## Verification

- [ ] All existing usages still work
- [ ] No TypeScript errors (`pnpm typecheck`)
- [ ] No lint errors (`pnpm lint`)
- [ ] Each new hook has single responsibility
- [ ] Original hook is < 100 lines
```

**Status:** [x] Created

---

### 0.3 Create `/split-service` Command

**File:** `.claude/commands/split-service.md`

```markdown
---
description: Split large service into focused modules
---

Split Service: **{{arg1}}**

## Split Goals
{{arg2}}

## Instructions

1. Read the current service implementation
2. Identify distinct modules (providers, engines, DAOs, utilities)
3. Create new focused modules in a subdirectory
4. Keep the original service as orchestrator/factory
5. Ensure backward compatibility

## Standard Service Splitting Patterns

### Provider Pattern (for multiple implementations)
\`\`\`
src/services/[serviceName]/
├── index.ts                        # Factory/orchestrator
├── AbstractProvider.ts             # Base class
├── providers/
│   ├── ProviderA.ts               # Implementation A
│   └── ProviderB.ts               # Implementation B
└── types.ts                       # Shared types
\`\`\`

### Engine Pattern (for game types)
\`\`\`
src/services/scoring/
├── index.ts                        # Orchestrator
├── engines/
│   ├── StablefordEngine.ts        # Stableford scoring
│   ├── StrokePlayEngine.ts        # Stroke play scoring
│   └── MatchPlayEngine.ts         # Match play scoring
└── types.ts
\`\`\`

### DAO Pattern (for database operations)
\`\`\`
src/services/offline/
├── index.ts                        # Main exports
├── DatabaseManager.ts              # Init/cleanup
├── dao/
│   ├── ScorecardDAO.ts            # Scorecard operations
│   ├── HoleScoreDAO.ts            # Score operations
│   └── SyncDAO.ts                 # Sync tracking
└── types.ts
\`\`\`

## Process

1. **Identify pattern** - Provider, Engine, or DAO pattern
2. **Create structure** - Set up subdirectory
3. **Extract modules** - Move code to new files
4. **Add interfaces** - Define contracts between modules
5. **Create orchestrator** - Main service composes modules
6. **Update exports** - Re-export from index.ts

## Verification

- [ ] All existing usages still work
- [ ] No TypeScript errors (`pnpm typecheck`)
- [ ] No lint errors (`pnpm lint`)
- [ ] Each module has single responsibility
- [ ] Clear interfaces between modules
```

**Status:** [x] Created

---

### 0.4 Create `common-components-catalog.md` Instruction

**File:** `.claude/instructions/common-components-catalog.md`

```markdown
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

## Navigation Components

| Component | Use For | Key Props |
|-----------|---------|-----------|
| `PageHeader` | Screen headers | `title`, `showBack`, `onBack`, `rightActions` |
| `SectionHeader` | List sections | `title`, `description`, `icon` |
| `Tabs` | Tab navigation | `tabs`, `selectedTab`, `onTabChange` |
| `BottomNavigation` | App navigation | `activeTab`, `onTabPress` |

## Interactive Components

| Component | Use For | Key Props |
|-----------|---------|-----------|
| `SegmentedButton` | Toggle options | `value`, `onValueChange`, `buttons` |
| `FilterPill` | Filter toggles | `label`, `selected`, `onPress` |
| `ExpandableItem` | Collapsible content | `title`, `isExpanded`, `onToggle` |
| `RadioButtonOption` | Radio selection | `label`, `selected`, `onSelect` |
| `MenuItemRow` | Menu/settings rows | `title`, `icon`, `onPress`, `rightContent` |

## Modal Components

| Component | Use For | Key Props |
|-----------|---------|-----------|
| `BottomSheet` | Bottom modals | `visible`, `onClose`, `title` |
| `ConfirmationDialog` | Confirm actions | `visible`, `title`, `message`, `onConfirm` |
| `AvatarSelectionModal` | Pick avatar | `visible`, `onSelect`, `onClose` |

## Info Components

| Component | Use For | Key Props |
|-----------|---------|-----------|
| `InfoCard` | Read-only info | `title`, `children`, `variant` |
| `FeatureButton` | Feature cards | `title`, `subtitle`, `icon`, `onPress` |
| `PlayerAvatar` | Player images | `photoUrl`, `name`, `size` |

## When to Use What

### Empty Lists
\`\`\`tsx
// Use EmptyState
<EmptyState
  title="No rounds yet"
  message="Start your first round"
  icon="golf"
  actionLabel="Start Round"
  onAction={handleStart}
/>

// Don't create custom empty state
\`\`\`

### Error Handling
\`\`\`tsx
// Use ErrorState
<ErrorState
  error="Failed to load data"
  onRetry={refetch}
/>

// Don't create custom error display
\`\`\`

### Menu Items
\`\`\`tsx
// Use MenuItemRow
<MenuItemRow
  title="Settings"
  icon="cog"
  onPress={() => navigate('Settings')}
/>

// Don't create custom TouchableOpacity menu items
\`\`\`

### Radio Selection
\`\`\`tsx
// Use RadioButtonOption
<RadioButtonOption
  label="Yards"
  selected={unit === 'yards'}
  onSelect={() => setUnit('yards')}
/>

// Don't create custom radio buttons
\`\`\`
```

**Status:** [x] Created

---

### 0.5 Update `/refactor` Command

**File:** `.claude/commands/refactor.md`

Add these new sections to the existing refactor command:

```markdown
## Hook Splitting Checklist
When refactoring large hooks (500+ lines):
- [ ] Identify distinct responsibilities
- [ ] Create subdirectory with focused hooks
- [ ] Keep original as thin wrapper
- [ ] Export both original and new hooks
- [ ] Move types to types.ts

## Service Splitting Checklist
When refactoring large services (500+ lines):
- [ ] Choose pattern: Provider, Engine, or DAO
- [ ] Create subdirectory structure
- [ ] Extract modules to separate files
- [ ] Define interfaces between modules
- [ ] Keep original as orchestrator

## Component Consolidation Checklist
When refactoring components with custom UI:
- [ ] Check common-components-catalog.md for existing components
- [ ] Replace custom empty states with EmptyState
- [ ] Replace custom error displays with ErrorState
- [ ] Replace custom loading with LoadingSpinner
- [ ] Replace custom menu items with MenuItemRow
- [ ] Replace custom radio buttons with RadioButtonOption
```

**Status:** [x] Updated

---

## Phase 1: Create New Common Components (High Priority)

### 1.1 RadioButtonOption Component

**Use Command:** `/component RadioButtonOption`

**Description:** Radio-style selection option with icon, label, description, and selected state.

**Props:**
```typescript
interface RadioButtonOptionProps {
  label: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
  icon?: string;
  disabled?: boolean;
  testID?: string;
}
```

**Files to update after creation:**
| File | Current Custom Code | Lines Saved |
|------|---------------------|-------------|
| `src/screens/profile/SettingsScreen.tsx` | `DistanceOption` component (Lines 84-111) | ~40 |
| `src/screens/profile/HelpAndSupportScreen.tsx` | `InquiryTypeSelector` component (Lines 73-109) | ~35 |

**Detailed Prompt:**
```
/component RadioButtonOption

Create a RadioButtonOption component for radio-style selection options used across settings and selection screens.

## Purpose
This component replaces custom radio button implementations in SettingsScreen (DistanceOption) and HelpAndSupportScreen (InquiryTypeSelector). It provides a consistent, accessible selection pattern throughout the app.

## Props Interface
interface RadioButtonOptionProps {
  label: string;              // Main label text (required)
  description?: string;       // Optional secondary text below label
  selected: boolean;          // Whether this option is currently selected
  onSelect: () => void;       // Callback when option is tapped
  icon?: string;              // Material Community Icons name for left icon
  disabled?: boolean;         // Disable interaction (default: false)
  testID?: string;            // For testing
}

## Visual Design
- Container: Rounded rectangle (borderRadius.lg) with border
- Unselected state: border color = colors.border, background = colors.surface
- Selected state: border color = colors.primary, background = colors.primary with 10% opacity
- Left side: Optional icon (24px, colors.textSecondary or colors.primary when selected)
- Center: Label (typography.body) and optional description (typography.caption, colors.textSecondary)
- Right side: Checkmark icon (check-circle) only when selected, colors.primary
- Disabled state: 50% opacity, no touch feedback
- Height: Auto (minHeight: 56px for single line, expands for description)
- Padding: spacing.md horizontal, spacing.sm vertical

## Touch Behavior
- TouchableOpacity with activeOpacity={0.7}
- Touch feedback on entire container
- Calls onSelect when tapped (unless disabled)

## Accessibility
- accessibilityRole="radio"
- accessibilityState={{ selected, disabled }}
- accessibilityLabel={label + (description ? `, ${description}` : '')}

## Reference Components
- See FilterPill for selection styling patterns
- See SegmentedButton for touch interaction patterns
- See FormSection for label/description text hierarchy

## File Structure
- Main component: src/components/common/RadioButtonOption.tsx
- Stories: src/components/common/RadioButtonOption.stories.tsx
- Tests: src/components/common/RadioButtonOption.test.tsx
- Export from: src/components/common/index.ts

## Usage Example
<RadioButtonOption
  label="Yards"
  description="Imperial measurement"
  selected={unit === 'yards'}
  onSelect={() => setUnit('yards')}
  icon="ruler"
/>
```

**Status:** [x] Created [x] Tested [x] Stories [x] Applied to files

---

### 1.2 MenuItemRow Component

**Use Command:** `/component MenuItemRow`

**Description:** Reusable menu/settings row with icon, title, subtitle, and right content.

**Props:**
```typescript
interface MenuItemRowProps {
  title: string;
  subtitle?: string;
  icon: string;
  onPress: () => void;
  rightContent?: React.ReactNode;
  showChevron?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  testID?: string;
}
```

**Files to update after creation:**
| File | Current Custom Code | Lines Saved |
|------|---------------------|-------------|
| `src/screens/profile/ProfileScreen.tsx` | `MenuItem` component (Lines 55-99) | ~45 |
| `src/screens/profile/NotificationSettingsScreen.tsx` | `SettingRow` component (Lines 36-66) | ~30 |

**Detailed Prompt:**
```
/component MenuItemRow

Create a MenuItemRow component for menu and settings screens throughout the app.

## Purpose
This component replaces custom menu item implementations in ProfileScreen (MenuItem) and NotificationSettingsScreen (SettingRow). It provides a consistent navigation and settings row pattern.

## Props Interface
interface MenuItemRowProps {
  title: string;                    // Main label text (required)
  subtitle?: string;                // Optional secondary text below title
  icon: string;                     // Material Community Icons name (required)
  onPress: () => void;              // Press callback (required)
  rightContent?: React.ReactNode;   // Custom right content (badges, switches, text)
  showChevron?: boolean;            // Show chevron-right icon (default: true)
  destructive?: boolean;            // Red styling for destructive actions (default: false)
  disabled?: boolean;               // Disable interaction (default: false)
  testID?: string;                  // For testing
}

## Visual Design
- Container: Full-width TouchableOpacity
- Height: Auto (minHeight: 56px)
- Padding: spacing.md vertical, spacing.lg horizontal
- Background: Transparent (inherits from parent)

### Layout (horizontal row)
- Left: Icon container (40px width, centered)
  - Icon: 24px, colors.textSecondary (or colors.error if destructive)
- Center: Text container (flex: 1)
  - Title: typography.body, colors.textPrimary (or colors.error if destructive)
  - Subtitle: typography.caption, colors.textSecondary
- Right: Either rightContent OR chevron (not both)
  - Chevron: chevron-right icon, 20px, colors.textTertiary
  - If rightContent provided, render that instead

### States
- Default: As described above
- Pressed: activeOpacity={0.7}
- Disabled: 50% opacity, no touch feedback
- Destructive: Icon and title use colors.error

## Touch Behavior
- TouchableOpacity wrapping entire row
- Calls onPress when tapped (unless disabled)
- If rightContent is a Switch, still handle row press to toggle

## Accessibility
- accessibilityRole="button"
- accessibilityState={{ disabled }}
- accessibilityLabel={title + (subtitle ? `, ${subtitle}` : '')}
- accessibilityHint="Tap to navigate" (or custom based on action)

## Reference Components
- See ExpandableItem for similar row layout
- See NotificationItem for icon + text patterns

## File Structure
- Main component: src/components/common/MenuItemRow.tsx
- Stories: src/components/common/MenuItemRow.stories.tsx
- Tests: src/components/common/MenuItemRow.test.tsx
- Export from: src/components/common/index.ts

## Usage Examples
// Navigation item
<MenuItemRow
  title="My Statistics"
  subtitle="View your performance"
  icon="chart-line"
  onPress={() => navigation.navigate('MyStatistics')}
/>

// With badge
<MenuItemRow
  title="Notifications"
  icon="bell-outline"
  onPress={() => navigation.navigate('Notifications')}
  rightContent={unreadCount > 0 ? <Badge>{unreadCount}</Badge> : undefined}
/>

// With switch
<MenuItemRow
  title="Push Notifications"
  icon="bell"
  showChevron={false}
  rightContent={<Switch value={enabled} onValueChange={setEnabled} />}
  onPress={() => setEnabled(!enabled)}
/>

// Destructive action
<MenuItemRow
  title="Log Out"
  icon="logout"
  destructive
  showChevron={false}
  onPress={handleLogout}
/>
```

**Status:** [x] Created [x] Tested [x] Stories [x] Applied to files

---

### 1.3 InfoCard Component

**Use Command:** `/component InfoCard`

**Description:** Read-only information card for displaying static data with optional title.

**Props:**
```typescript
interface InfoCardProps {
  title?: string;
  children: React.ReactNode;
  variant?: 'default' | 'highlight';
  icon?: string;
  style?: ViewStyle;
  testID?: string;
}
```

**Files to update after creation:**
| File | Current Custom Code | Lines Saved |
|------|---------------------|-------------|
| `src/screens/admin/EditRoundScreen/components/CourseSection.tsx` | Custom card container | ~20 |
| `src/screens/admin/EditCompetitionScreen/components/InviteCodeSection.tsx` | Custom card container | ~15 |

**Detailed Prompt:**
```
/component InfoCard

Create an InfoCard component for read-only information display throughout the app.

## Purpose
This component provides a consistent container for displaying read-only information cards. Unlike FormSection (which is for form inputs with validation), InfoCard is for static display content like course details, invite codes, and summary information.

## Props Interface
interface InfoCardProps {
  title?: string;                 // Optional header title
  children: React.ReactNode;      // Card content (required)
  variant?: 'default' | 'highlight';  // Visual variant (default: 'default')
  icon?: string;                  // Material Community Icons name for title
  style?: ViewStyle;              // Custom container styles
  testID?: string;                // For testing
}

## Visual Design
### Default Variant
- Background: colors.surface
- Border: 1px colors.border
- Border radius: borderRadius.lg
- Shadow: shadows.sm
- Padding: spacing.lg

### Highlight Variant
- Background: colors.primary with 5% opacity
- Border: 1px colors.primary with 30% opacity
- Border radius: borderRadius.lg
- No shadow
- Padding: spacing.lg

### Title Section (when title provided)
- Layout: Row with icon (if provided) and title text
- Icon: 20px, colors.primary (default) or colors.textSecondary (highlight)
- Title: typography.labelLarge, colors.textPrimary
- Gap between icon and title: spacing.sm
- Margin below title: spacing.md
- Divider line below title (optional, based on content)

### Content Section
- Renders children as-is
- No default text styling (children handle their own styles)

## File Structure
- Main component: src/components/common/InfoCard.tsx
- Stories: src/components/common/InfoCard.stories.tsx
- Tests: src/components/common/InfoCard.test.tsx
- Export from: src/components/common/index.ts

## Reference Components
- See FormSection for similar structure (but InfoCard is simpler)
- See VenueCard for card styling patterns

## Usage Examples
// Simple info display
<InfoCard title="Course Details" icon="golf">
  <Text style={styles.label}>Name</Text>
  <Text style={styles.value}>Royal Melbourne Golf Club</Text>
  <Text style={styles.label}>Location</Text>
  <Text style={styles.value}>Black Rock, VIC</Text>
</InfoCard>

// Highlight variant for important info
<InfoCard
  title="Invite Code"
  icon="key"
  variant="highlight"
>
  <Text style={styles.code}>ABC123</Text>
  <Text style={styles.hint}>Share this code with players</Text>
</InfoCard>

// No title (just content container)
<InfoCard>
  <View style={styles.row}>
    <Text>Players</Text>
    <Text>12</Text>
  </View>
</InfoCard>
```

**Status:** [x] Created [x] Tested [x] Stories [x] Applied to files

---

## Phase 2: Replace Custom Empty/Error States (High Priority)

### 2.1 RoundListEmpty.tsx

**File:** `src/screens/rounds/RoundListScreen/components/RoundListEmpty.tsx`

**Current:** Custom empty state with icon + title + text (~30 lines)

**Replace with:** `EmptyState` component from `@/components/common`

**Detailed Prompt:**
```
/consolidate src/screens/rounds/RoundListScreen/components/RoundListEmpty.tsx

Replace the custom empty state implementation with the common EmptyState component.

## Current Implementation
The file contains a custom empty state with:
- Custom View container with centering styles
- Icon component (likely MaterialCommunityIcons)
- Title and message Text components
- Optional action button
- Custom StyleSheet definitions

## Target Implementation
Replace with the standard EmptyState component from @/components/common.

## Steps

1. **Read the current file** to understand:
   - What props it accepts (likely onStartNewRound callback)
   - The exact text content being displayed
   - Any custom styling that might need to be preserved

2. **Refactor the component** to use EmptyState:

import React from 'react';
import { EmptyState } from '@/components/common';

interface RoundListEmptyProps {
  onStartNewRound?: () => void;
}

export function RoundListEmpty({ onStartNewRound }: RoundListEmptyProps) {
  return (
    <EmptyState
      title="No rounds yet"
      message="Start a new round to track your scores and see your progress"
      icon="golf"
      actionLabel={onStartNewRound ? "Start New Round" : undefined}
      onAction={onStartNewRound}
      testID="round-list-empty"
    />
  );
}

3. **Remove unused code**:
   - Delete the custom StyleSheet
   - Remove any unused imports

4. **Verify the parent component** (RoundListScreen) still works:
   - Check that the onStartNewRound prop is being passed correctly
   - Ensure the empty state renders in the correct container

## Verification
- [x] Component renders correctly with EmptyState
- [x] Action button works if callback provided
- [x] No TypeScript errors
- [x] Visual appearance matches the design system
- [x] File is significantly smaller (~28 lines)
```

**Status:** [x] Refactored [x] Tested

---

### 2.2 ScorecardEmptyStates.tsx

**File:** `src/screens/scoring/PlayerScorecardScreen/components/ScorecardEmptyStates.tsx`

**Current:** Multiple custom error/empty states (~60 lines)

**Replace with:** `ErrorState` + `EmptyState` from `@/components/common`

**Detailed Prompt:**
```
/consolidate src/screens/scoring/PlayerScorecardScreen/components/ScorecardEmptyStates.tsx

Replace multiple custom empty/error state implementations with common components.

## Current Implementation
The file likely exports multiple components:
- ScorecardPlayerNotFound - Error state when player doesn't exist
- ScorecardNoScores - Empty state when no scores recorded
- Possibly ScorecardLoadingError - Error state for loading failures
Each with custom styling and layout (~60 lines total)

## Target Implementation
Use standard EmptyState and ErrorState components from @/components/common.

## Steps

1. **Read the current file** to identify:
   - All exported components and their purposes
   - Props each component accepts (callbacks, messages)
   - Current text content for titles/messages

2. **Refactor each component**:

import React from 'react';
import { EmptyState, ErrorState } from '@/components/common';

interface ScorecardEmptyProps {
  onRetry?: () => void;
  onGoBack?: () => void;
}

// For when player cannot be found
export function ScorecardPlayerNotFound({ onGoBack }: ScorecardEmptyProps) {
  return (
    <ErrorState
      title="Player Not Found"
      error="The requested player could not be found in this round"
      onRetry={onGoBack}
      retryLabel="Go Back"
      testID="scorecard-player-not-found"
    />
  );
}

// For when player has no scores yet
export function ScorecardNoScores() {
  return (
    <EmptyState
      title="No Scores Yet"
      message="Scores will appear here once they've been recorded"
      icon="golf"
      testID="scorecard-no-scores"
    />
  );
}

// For loading/fetch errors
export function ScorecardLoadError({ onRetry }: ScorecardEmptyProps) {
  return (
    <ErrorState
      title="Failed to Load Scorecard"
      error="There was a problem loading the scorecard data"
      onRetry={onRetry}
      testID="scorecard-load-error"
    />
  );
}

3. **Remove unused code**:
   - Delete all custom StyleSheet definitions
   - Remove unused imports (View, Text, Icon, StyleSheet)

4. **Verify all usages** in PlayerScorecardScreen work correctly

## Verification
- [x] All three states render correctly
- [x] Callbacks (onRetry, onGoBack) work as expected
- [x] No TypeScript errors
- [x] Visual appearance consistent with design system
- [x] File uses common components (~86 lines with SafeAreaView wrappers)
```

**Status:** [x] Refactored [x] Tested

---

### 2.3 ReviewEmptyStates.tsx

**File:** `src/screens/scoring/ReviewScorecardScreen/components/ReviewEmptyStates.tsx`

**Current:** Custom empty state (~20 lines)

**Replace with:** `EmptyState` from `@/components/common`

**Detailed Prompt:**
```
/consolidate src/screens/scoring/ReviewScorecardScreen/components/ReviewEmptyStates.tsx

Replace custom empty state with the common EmptyState component.

## Current Implementation
The file contains a custom empty state displayed when:
- No scores have been entered for review
- User navigates to review without any scorecard data

## Target Implementation
Use standard EmptyState component from @/components/common.

## Steps

1. **Read the current file** to understand:
   - The exported component name(s)
   - Props it accepts (likely onGoBack callback)
   - The current text content

2. **Refactor the component**:

import React from 'react';
import { EmptyState } from '@/components/common';

interface ReviewEmptyProps {
  onGoBack?: () => void;
}

export function ReviewNoScores({ onGoBack }: ReviewEmptyProps) {
  return (
    <EmptyState
      title="No Scores to Review"
      message="Record some scores before reviewing your scorecard"
      icon="clipboard-check-outline"
      actionLabel={onGoBack ? "Go Back" : undefined}
      onAction={onGoBack}
      testID="review-no-scores"
    />
  );
}

// Keep any other exports if present

3. **Remove unused code**:
   - Delete custom StyleSheet
   - Remove unused imports

4. **Verify usage** in ReviewScorecardScreen

## Verification
- [x] Empty state renders correctly
- [x] Action button works (Enter Scores callback)
- [x] No TypeScript errors
- [x] File uses common components (~45 lines)
```

**Status:** [x] Refactored [x] Tested

---

## Phase 3: Apply New Components (Medium Priority)

### 3.1 SettingsScreen - Use RadioButtonOption

**File:** `src/screens/profile/SettingsScreen.tsx`

**Detailed Prompt:**
```
/consolidate src/screens/profile/SettingsScreen.tsx

Replace the custom DistanceOption component with RadioButtonOption from common components.

## Prerequisites
- RadioButtonOption component must be created first (Phase 1.1)

## Current Implementation
The file contains a custom `DistanceOption` component (around lines 84-111) that renders a selectable option for distance unit preference (Yards/Metres). This is a custom implementation with its own styling.

## Target Implementation
Replace with RadioButtonOption from @/components/common for consistency.

## Steps

1. **Read the current file** to identify:
   - The exact location of the DistanceOption component
   - How it's being used in the JSX
   - Current state management for distanceUnit

2. **Update imports**:
   - Add: import { RadioButtonOption } from '@/components/common';
   - Remove any imports only used by DistanceOption

3. **Replace the usage** in the component JSX:

// Find the section that renders distance options and replace:
<View style={styles.optionContainer}>
  <RadioButtonOption
    label="Yards"
    description="Imperial measurement (US standard)"
    selected={distanceUnit === 'yards'}
    onSelect={() => handleDistanceUnitChange('yards')}
    icon="ruler"
    testID="distance-option-yards"
  />
  <RadioButtonOption
    label="Metres"
    description="Metric measurement (international standard)"
    selected={distanceUnit === 'meters'}
    onSelect={() => handleDistanceUnitChange('meters')}
    icon="ruler"
    testID="distance-option-metres"
  />
</View>

4. **Delete the custom DistanceOption component**:
   - Remove the component definition (lines ~84-111)
   - Remove associated styles from StyleSheet

5. **Clean up**:
   - Remove any unused styles (optionSelected, optionText, etc.)
   - Update any type definitions if needed

## Verification
- [ ] Distance unit selection still works
- [ ] Visual appearance matches design system
- [ ] No TypeScript errors
- [ ] Settings are persisted correctly
- [ ] ~40 lines of code removed
```

**Status:** [x] Refactored [x] Tested

**Lines Removed:** ~42 lines (DistanceOption component, interface, and styles)

---

### 3.2 HelpAndSupportScreen - Use RadioButtonOption

**File:** `src/screens/profile/HelpAndSupportScreen.tsx`

**Detailed Prompt:**
```
/consolidate src/screens/profile/HelpAndSupportScreen.tsx

Replace the custom InquiryTypeSelector with RadioButtonOption from common components.

## Prerequisites
- RadioButtonOption component must be created first (Phase 1.1)

## Current Implementation
The file contains a custom `InquiryTypeSelector` component (around lines 73-109) for selecting the type of support inquiry (Bug Report, Feature Request, General Question, etc.).

## Target Implementation
Replace with RadioButtonOption from @/components/common for consistency.

## Steps

1. **Read the current file** to identify:
   - The InquiryTypeSelector component location
   - Available inquiry types (likely an array or enum)
   - How selection state is managed

2. **Define inquiry types** (if not already):

const INQUIRY_TYPES = [
  { value: 'bug', label: 'Bug Report', description: 'Report an issue or problem', icon: 'bug' },
  { value: 'feature', label: 'Feature Request', description: 'Suggest a new feature', icon: 'lightbulb-outline' },
  { value: 'question', label: 'General Question', description: 'Ask about how to use the app', icon: 'help-circle-outline' },
  { value: 'feedback', label: 'Feedback', description: 'Share your thoughts', icon: 'comment-text-outline' },
];

3. **Update imports**:
   - Add: import { RadioButtonOption } from '@/components/common';
   - Remove any imports only used by InquiryTypeSelector

4. **Replace the selector with mapped RadioButtonOptions**:

<FormSection title="Inquiry Type" required>
  <View style={styles.inquiryTypeContainer}>
    {INQUIRY_TYPES.map((type) => (
      <RadioButtonOption
        key={type.value}
        label={type.label}
        description={type.description}
        icon={type.icon}
        selected={inquiryType === type.value}
        onSelect={() => setInquiryType(type.value)}
        testID={`inquiry-type-${type.value}`}
      />
    ))}
  </View>
</FormSection>

5. **Delete the custom InquiryTypeSelector component**:
   - Remove the component definition
   - Remove associated styles

6. **Clean up**:
   - Remove unused styles
   - Keep the form submission logic intact

## Verification
- [ ] All inquiry types are selectable
- [ ] Selection state updates correctly
- [ ] Form submission still works with selected type
- [ ] No TypeScript errors
- [ ] Visual appearance matches design system
- [ ] ~35 lines of code removed
```

**Status:** [x] Refactored [x] Tested

**Lines Removed:** ~35 lines (InquiryTypeSelector component, interface, and styles)

---

### 3.3 ProfileScreen - Use MenuItemRow

**File:** `src/screens/profile/ProfileScreen.tsx`

**Detailed Prompt:**
```
/consolidate src/screens/profile/ProfileScreen.tsx

Replace the custom MenuItem component with MenuItemRow from common components.

## Prerequisites
- MenuItemRow component must be created first (Phase 1.2)

## Current Implementation
The file contains a custom `MenuItem` component (around lines 55-99) that renders menu items for navigation and actions. It handles:
- Icon + title + optional subtitle
- Chevron arrows
- Touch feedback
- Badge display for notifications

## Target Implementation
Replace with MenuItemRow from @/components/common for consistency across all profile/settings screens.

## Steps

1. **Read the current file** to identify:
   - The MenuItem component location and implementation
   - All places where MenuItem is used
   - Any special props or variants being used

2. **Update imports**:
   - Add: import { MenuItemRow } from '@/components/common';
   - Keep Badge import if using notification badges

3. **Replace each MenuItem usage**:

// Navigation items
<MenuItemRow
  title="My Statistics"
  subtitle="View your golf performance"
  icon="chart-line"
  onPress={() => navigation.navigate('MyStatistics')}
  testID="menu-statistics"
/>

<MenuItemRow
  title="Achievements"
  subtitle="View your badges and rewards"
  icon="trophy-outline"
  onPress={() => navigation.navigate('Achievements')}
  testID="menu-achievements"
/>

// With notification badge
<MenuItemRow
  title="Notifications"
  icon="bell-outline"
  onPress={() => navigation.navigate('Notifications')}
  rightContent={unreadCount > 0 ? (
    <Badge style={styles.badge}>{unreadCount}</Badge>
  ) : undefined}
  testID="menu-notifications"
/>

// Settings items
<MenuItemRow
  title="Settings"
  icon="cog-outline"
  onPress={() => navigation.navigate('Settings')}
  testID="menu-settings"
/>

<MenuItemRow
  title="Help & Support"
  icon="help-circle-outline"
  onPress={() => navigation.navigate('HelpAndSupport')}
  testID="menu-help"
/>

// Destructive action (no chevron)
<MenuItemRow
  title="Log Out"
  icon="logout"
  destructive
  showChevron={false}
  onPress={handleLogout}
  testID="menu-logout"
/>

4. **Delete the custom MenuItem component**:
   - Remove the component definition (lines ~55-99)
   - Remove associated styles from StyleSheet

5. **Clean up**:
   - Remove unused imports
   - Remove unused styles (menuItem, menuItemText, etc.)
   - Keep badge styles if still needed

## Verification
- [ ] All menu items render correctly
- [ ] Navigation works for each item
- [ ] Notification badge displays correctly
- [ ] Logout works with red styling
- [ ] No TypeScript errors
- [ ] ~45 lines of code removed
```

**Status:** [x] Refactored [x] Tested

**Lines Removed:** ~45 lines (MenuItem component, interface, and styles)

---

### 3.4 NotificationSettingsScreen - Use MenuItemRow

**File:** `src/screens/profile/NotificationSettingsScreen.tsx`

**Detailed Prompt:**
```
/consolidate src/screens/profile/NotificationSettingsScreen.tsx

Replace the custom SettingRow component with MenuItemRow from common components.

## Prerequisites
- MenuItemRow component must be created first (Phase 1.2)

## Current Implementation
The file contains a custom `SettingRow` component (around lines 36-66) for displaying notification settings toggles with:
- Icon + title
- Switch toggle on the right
- Touch feedback to toggle the switch

## Target Implementation
Replace with MenuItemRow from @/components/common, using rightContent for switches.

## Steps

1. **Read the current file** to identify:
   - The SettingRow component location
   - All notification settings and their state variables
   - How toggles are handled

2. **Update imports**:
   - Add: import { MenuItemRow } from '@/components/common';
   - Keep Switch import from react-native

3. **Replace each SettingRow usage**:

// Master push notification toggle
<MenuItemRow
  title="Push Notifications"
  subtitle="Receive notifications on your device"
  icon="bell"
  showChevron={false}
  rightContent={
    <Switch
      value={pushEnabled}
      onValueChange={setPushEnabled}
      trackColor={{ false: colors.border, true: colors.primary }}
    />
  }
  onPress={() => setPushEnabled(!pushEnabled)}
  testID="setting-push-notifications"
/>

// Competition updates
<MenuItemRow
  title="Competition Updates"
  subtitle="Round schedules and results"
  icon="trophy-outline"
  showChevron={false}
  disabled={!pushEnabled}
  rightContent={
    <Switch
      value={competitionUpdates}
      onValueChange={setCompetitionUpdates}
      disabled={!pushEnabled}
      trackColor={{ false: colors.border, true: colors.primary }}
    />
  }
  onPress={() => setCompetitionUpdates(!competitionUpdates)}
  testID="setting-competition-updates"
/>

// Score submissions
<MenuItemRow
  title="Score Submissions"
  subtitle="When players submit their scores"
  icon="clipboard-check"
  showChevron={false}
  disabled={!pushEnabled}
  rightContent={
    <Switch
      value={scoreSubmissions}
      onValueChange={setScoreSubmissions}
      disabled={!pushEnabled}
      trackColor={{ false: colors.border, true: colors.primary }}
    />
  }
  onPress={() => setScoreSubmissions(!scoreSubmissions)}
  testID="setting-score-submissions"
/>

// Friend activity
<MenuItemRow
  title="Friend Activity"
  subtitle="Friend requests and connections"
  icon="account-group"
  showChevron={false}
  disabled={!pushEnabled}
  rightContent={
    <Switch
      value={friendActivity}
      onValueChange={setFriendActivity}
      disabled={!pushEnabled}
      trackColor={{ false: colors.border, true: colors.primary }}
    />
  }
  onPress={() => setFriendActivity(!friendActivity)}
  testID="setting-friend-activity"
/>

4. **Delete the custom SettingRow component**:
   - Remove the component definition (lines ~36-66)
   - Remove associated styles

5. **Clean up**:
   - Remove unused imports
   - Remove unused styles (settingRow, settingText, etc.)

## Verification
- [ ] All toggle settings render correctly
- [ ] Switches respond to taps
- [ ] Row tap also toggles the switch
- [ ] Disabled state works when push is off
- [ ] Settings are persisted correctly
- [ ] No TypeScript errors
- [ ] ~30 lines of code removed
```

**Status:** [x] Refactored [x] Tested

**Lines Removed:** ~42 lines (SettingRow component, interface, and styles)

---

## Phase 4: Large Files to Split (Lower Priority)

These are additional large files not yet in REFACTORING_PLAN.md:

### 4.1 ProfileScreen (846 lines)

**File:** `src/screens/profile/ProfileScreen.tsx`

**Use Command:** `/refactor`

**Detailed Prompt:**
```
/refactor src/screens/profile/ProfileScreen.tsx

Split this 846-line screen into focused components and hooks.

## Current State
ProfileScreen is a monolithic component handling:
- User profile data fetching
- Avatar and header display
- Statistics overview
- Menu navigation items
- Cosmetic selection
- Achievement display
- Settings and logout

## Target Architecture

### File Structure
src/screens/profile/
├── ProfileScreen.tsx              # Main orchestrator (< 250 lines)
├── components/
│   ├── ProfileHeader.tsx          # Avatar, name, cosmetics display
│   ├── ProfileStatsSection.tsx    # Statistics overview cards
│   ├── ProfileMenuSection.tsx     # Navigation menu items
│   └── ProfileCosmeticsBar.tsx    # Cosmetic selection bar
└── hooks/
    └── useProfileData.ts          # Data fetching and state

### Component Responsibilities

1. **ProfileHeader.tsx** (~60 lines)
   - Avatar with cosmetic frame
   - Player name and handicap
   - Edit profile button
   - Props: player data, onEditPress

2. **ProfileStatsSection.tsx** (~80 lines)
   - Statistics cards (rounds played, avg score, etc.)
   - Uses StatCard or InfoCard component
   - Props: statistics data

3. **ProfileMenuSection.tsx** (~100 lines)
   - Uses MenuItemRow components (from Phase 1.2)
   - Navigation items: Statistics, Achievements, Friends, Settings
   - Logout action
   - Props: navigation, onLogout

4. **ProfileCosmeticsBar.tsx** (~60 lines)
   - Horizontal scrollable cosmetic items
   - Active cosmetic indicator
   - Props: cosmetics, activeCosmetic, onSelect

5. **useProfileData.ts** (~100 lines)
   - useQuery for player profile
   - useQuery for statistics
   - useQuery for cosmetics
   - Combined loading/error state
   - Logout mutation

### Main ProfileScreen.tsx (~200 lines)
- Import and compose components
- Handle navigation callbacks
- Render ScrollView with sections
- Loading and error states

## Steps

1. **Create hooks/useProfileData.ts**:
   - Move all data fetching logic
   - Export combined state object
   - Keep authentication check

2. **Create components/ProfileHeader.tsx**:
   - Extract avatar and name section
   - Handle cosmetic frame display
   - Add edit button with callback

3. **Create components/ProfileStatsSection.tsx**:
   - Extract statistics display
   - Create stat cards layout
   - Handle empty state

4. **Create components/ProfileMenuSection.tsx**:
   - Use MenuItemRow for each item
   - Handle navigation callbacks
   - Include logout with confirmation

5. **Create components/ProfileCosmeticsBar.tsx**:
   - Extract cosmetics horizontal list
   - Handle selection
   - Show active indicator

6. **Update ProfileScreen.tsx**:
   - Import new components
   - Use useProfileData hook
   - Compose in ScrollView

## Verification
- [ ] All functionality preserved
- [ ] Navigation works correctly
- [ ] Data fetching works
- [ ] Logout works with confirmation
- [ ] No TypeScript errors
- [ ] Main file under 250 lines
- [ ] Each component is focused (< 100 lines)
```

**Status:** [x] Planned [x] Refactored [x] Tested

**Results:**
- Main screen: 783 → 264 lines (66% reduction)
- New components:
  - `ProfileHeader.tsx` (119 lines) - User avatar, name, cosmetics
  - `HomeVenueSection.tsx` (113 lines) - Home venue display card
  - `HomeVenueModal.tsx` (230 lines) - Venue selection modal
  - `ProfileMenuSection.tsx` (189 lines) - Navigation menu items
  - `ProfileCustomizeSheet.tsx` (160 lines) - Cosmetics bottom sheet
- New hooks:
  - `useProfileData.ts` (150 lines) - Aggregated data fetching

---

### 4.2 CompetitionsListScreen (762 lines)

**File:** `src/screens/competitions/CompetitionsListScreen.tsx`

**Use Command:** `/refactor`

**Detailed Prompt:**
```
/refactor src/screens/competitions/CompetitionsListScreen.tsx

Split this 762-line screen into focused components, hooks, and services.

## Current State
CompetitionsListScreen handles:
- Fetching competitions (active, past, organized)
- Tab navigation between competition types
- Filtering by status
- Winner fetching for completed competitions
- List rendering with pull-to-refresh
- FAB for creating new competition

## Target Architecture

### File Structure
src/screens/competitions/
├── CompetitionsListScreen.tsx        # Main orchestrator (< 250 lines)
├── components/
│   ├── CompetitionTabBar.tsx         # Tab navigation
│   ├── CompetitionFilterBar.tsx      # Status filter pills
│   ├── CompetitionListContent.tsx    # List with empty/error states
│   └── CreateCompetitionFAB.tsx      # Floating action button
└── hooks/
    └── useCompetitionsList.ts        # Data fetching and filtering

src/services/competitions/
└── winnerService.ts                  # Winner calculation logic

### Component Responsibilities

1. **CompetitionTabBar.tsx** (~40 lines)
   - Tabs: Active, Past, Organized
   - Uses Tabs component from common
   - Props: activeTab, onTabChange, counts

2. **CompetitionFilterBar.tsx** (~50 lines)
   - Status filter pills (All, In Progress, Completed)
   - Uses FilterPill component
   - Props: activeFilter, onFilterChange, visible

3. **CompetitionListContent.tsx** (~100 lines)
   - FlatList with CompetitionListCard
   - EmptyState for no competitions
   - Loading state with skeletons
   - Props: competitions, loading, onRefresh, onCompetitionPress

4. **CreateCompetitionFAB.tsx** (~30 lines)
   - FAB positioned bottom-right
   - Props: onPress, visible

5. **useCompetitionsList.ts** (~150 lines)
   - Separate queries for each tab
   - Filter logic
   - Combined loading/error state
   - Refresh handlers

6. **winnerService.ts** (~80 lines)
   - fetchCompetitionWinner function
   - Winner calculation logic
   - Caching if needed

### Main Screen (~200 lines)
- Tab state management
- Filter state management
- Compose components
- Navigation handlers

## Steps

1. **Create services/competitions/winnerService.ts**:
   - Move fetchCompetitionWinner function
   - Export as standalone function
   - Add proper typing

2. **Create hooks/useCompetitionsList.ts**:
   - Move all useQuery calls
   - Add filter logic
   - Return organized state object

3. **Create components/CompetitionTabBar.tsx**:
   - Extract tab navigation
   - Use Tabs component
   - Add badge counts

4. **Create components/CompetitionFilterBar.tsx**:
   - Extract filter pills
   - Use FilterPill components

5. **Create components/CompetitionListContent.tsx**:
   - Extract list rendering
   - Handle empty/loading states
   - Use EmptyState component

6. **Create components/CreateCompetitionFAB.tsx**:
   - Extract FAB
   - Handle visibility based on user role

7. **Update CompetitionsListScreen.tsx**:
   - Import and compose components
   - Manage tab/filter state
   - Handle navigation

## Verification
- [ ] All tabs display correct data
- [ ] Filtering works correctly
- [ ] Pull-to-refresh works
- [ ] Navigation to competition detail works
- [ ] Create competition works
- [ ] No TypeScript errors
- [ ] Main file under 250 lines
```

**Status:** [x] Planned [x] Refactored [x] Tested

**Results:**
- Main screen: 762 → 236 lines (69% reduction)
- New components:
  - `CompetitionTabBar.tsx` (43 lines) - Tab navigation
  - `CompetitionFilterBar.tsx` (77 lines) - Status filter + limit indicator
  - `CompetitionListContent.tsx` (139 lines) - List with empty/loading states
- New hooks:
  - `useCompetitionsList.ts` (429 lines) - Data fetching, filtering, state management
- New services:
  - `winnerService.ts` (88 lines) - Competition winner calculation

---

### 4.3 useAuth (824 lines)

**File:** `src/hooks/useAuth.ts`

**Use Command:** `/split-hook`

**Detailed Prompt:**
```
/split-hook src/hooks/useAuth.ts

Split this 824-line hook into focused, single-responsibility hooks.

## Current State
useAuth is a monolithic hook handling:
- Session state and initialization
- User profile fetching
- Login (email, social)
- Signup and onboarding
- Logout
- Password reset
- Profile updates
- Session persistence

## Target Architecture

### File Structure
src/hooks/auth/
├── index.ts                    # Re-exports all hooks
├── types.ts                    # Shared types
├── useAuthSession.ts           # Session state (< 100 lines)
├── useAuthUser.ts              # User profile fetching (< 100 lines)
├── useAuthMutations.ts         # Login, signup, logout (< 150 lines)
├── usePasswordReset.ts         # Password reset flow (< 50 lines)
└── useProfileMutations.ts      # Profile updates (< 80 lines)

src/hooks/useAuth.ts            # Thin wrapper composing all hooks (< 50 lines)

### Hook Responsibilities

1. **types.ts** (~50 lines)
   - AuthSession type
   - AuthUser type
   - AuthState type
   - Error types

2. **useAuthSession.ts** (~100 lines)
   - Subscribe to Supabase auth state
   - Session initialization
   - Return session state (loading, session, error)
   - Handle session refresh

3. **useAuthUser.ts** (~100 lines)
   - Fetch user profile from players table
   - useQuery with session dependency
   - Return user data, loading, error
   - Invalidation helpers

4. **useAuthMutations.ts** (~150 lines)
   - signInWithEmail mutation
   - signInWithOAuth mutation (Google, Apple)
   - signUp mutation
   - signOut mutation
   - Return mutation objects

5. **usePasswordReset.ts** (~50 lines)
   - requestPasswordReset mutation
   - confirmPasswordReset mutation

6. **useProfileMutations.ts** (~80 lines)
   - updateProfile mutation
   - updateAvatar mutation
   - updateOnboarding mutation

### Main useAuth.ts (~50 lines)
Compose all hooks into single return object for backward compatibility:

export function useAuth() {
  const session = useAuthSession();
  const user = useAuthUser(session.data);
  const authMutations = useAuthMutations();
  const profileMutations = useProfileMutations();
  const passwordReset = usePasswordReset();

  return {
    // Session
    session: session.data,
    isLoading: session.isLoading || user.isLoading,
    isAuthenticated: !!session.data,

    // User
    user: user.data,

    // Auth actions
    signIn: authMutations.signIn,
    signUp: authMutations.signUp,
    signOut: authMutations.signOut,

    // Profile actions
    updateProfile: profileMutations.updateProfile,

    // Password
    resetPassword: passwordReset.request,
  };
}

## Steps

1. **Create src/hooks/auth/types.ts**:
   - Extract all auth-related types
   - Export for use by other hooks

2. **Create src/hooks/auth/useAuthSession.ts**:
   - Move session subscription logic
   - Keep session initialization
   - Export useAuthSession hook

3. **Create src/hooks/auth/useAuthUser.ts**:
   - Move user profile query
   - Depend on session from useAuthSession
   - Export useAuthUser hook

4. **Create src/hooks/auth/useAuthMutations.ts**:
   - Move all sign in/up/out mutations
   - Keep Supabase client usage
   - Export useAuthMutations hook

5. **Create src/hooks/auth/usePasswordReset.ts**:
   - Move password reset logic
   - Export usePasswordReset hook

6. **Create src/hooks/auth/useProfileMutations.ts**:
   - Move profile update mutations
   - Export useProfileMutations hook

7. **Create src/hooks/auth/index.ts**:
   - Re-export all hooks
   - Re-export types

8. **Update src/hooks/useAuth.ts**:
   - Import from auth/
   - Compose into single hook
   - Maintain same API for backward compatibility

## Verification
- [ ] All existing usages of useAuth still work
- [ ] Login flow works
- [ ] Logout flow works
- [ ] Profile updates work
- [ ] No TypeScript errors
- [ ] Main hook under 50 lines
- [ ] Each focused hook under 150 lines
```

**Status:** [x] Planned [x] Refactored [x] Tested

**Results:**
- Main hook: 824 → 97 lines (88% reduction)
- New hooks:
  - `useAuthSession.ts` (101 lines) - Session state and refresh
  - `useAuthUser.ts` (120 lines) - User and player profile fetching
  - `useAuthMutations.ts` (315 lines) - Login, signup, OTP, logout mutations
  - `usePasswordReset.ts` (82 lines) - Password reset and update
  - `useProfileMutations.ts` (88 lines) - Profile updates
- New files:
  - `types.ts` (66 lines) - Shared types and re-exports
  - `utils.ts` (93 lines) - ensurePlayerProfile helper
  - `index.ts` (42 lines) - Re-exports

---

### 4.4 useSubscription (718 lines)

**File:** `src/hooks/useSubscription.ts`

**Use Command:** `/split-hook`

**Detailed Prompt:**
```
/split-hook src/hooks/useSubscription.ts

Split this 718-line hook into focused, single-responsibility hooks.

## Current State
useSubscription handles:
- Fetching user subscription status
- Tier limit definitions
- Feature availability checks
- Competition/round limit validation
- RevenueCat integration
- Upgrade prompts

## Target Architecture

### File Structure
src/hooks/subscription/
├── index.ts                      # Re-exports all hooks
├── types.ts                      # Subscription types
├── useSubscriptionStatus.ts      # Fetch subscription (< 80 lines)
├── useSubscriptionLimits.ts      # Tier limit checks (< 100 lines)
├── useFeatureGate.ts             # Feature availability (< 60 lines)
└── validators.ts                 # Validation logic (< 100 lines)

src/hooks/useSubscription.ts      # Thin wrapper (< 50 lines)

### Hook Responsibilities

1. **types.ts** (~40 lines)
   - SubscriptionTier enum
   - SubscriptionStatus type
   - TierLimits type
   - FeatureKey type

2. **useSubscriptionStatus.ts** (~80 lines)
   - useQuery to fetch user subscription
   - Handle loading/error states
   - RevenueCat sync if needed
   - Return: { tier, status, expiresAt, isLoading }

3. **useSubscriptionLimits.ts** (~100 lines)
   - Get limits for current tier
   - Check usage against limits
   - Return: { limits, usage, canCreate, remainingSlots }

   Methods:
   - canCreateCompetition()
   - canAddRound(competitionId)
   - canAddPlayer(roundId)
   - getRemainingCompetitions()

4. **useFeatureGate.ts** (~60 lines)
   - Check if feature is available
   - Return upgrade prompt info
   - Return: { isAvailable, requiredTier, upgradePrompt }

   Methods:
   - isFeatureAvailable(featureKey)
   - getRequiredTier(featureKey)

5. **validators.ts** (~100 lines)
   - Pure functions for validation
   - validateCompetitionLimit(tier, currentCount)
   - validateRoundLimit(tier, currentCount)
   - validatePlayerLimit(tier, currentCount)
   - getFeaturesByTier(tier)

### Main useSubscription.ts (~50 lines)
Compose hooks for backward compatibility:

export function useSubscription() {
  const status = useSubscriptionStatus();
  const limits = useSubscriptionLimits();
  const featureGate = useFeatureGate();

  return {
    // Status
    tier: status.tier,
    isLoading: status.isLoading,
    isPremium: status.tier !== 'free',

    // Limits
    canCreateCompetition: limits.canCreateCompetition,
    canAddRound: limits.canAddRound,
    remainingCompetitions: limits.remainingCompetitions,

    // Features
    isFeatureAvailable: featureGate.isAvailable,
    requiresUpgrade: featureGate.requiresUpgrade,
  };
}

## Steps

1. **Create src/hooks/subscription/types.ts**:
   - Extract subscription types
   - Define feature keys enum

2. **Create src/hooks/subscription/validators.ts**:
   - Move pure validation functions
   - No React hooks, just logic

3. **Create src/hooks/subscription/useSubscriptionStatus.ts**:
   - Move subscription fetching
   - Handle RevenueCat integration

4. **Create src/hooks/subscription/useSubscriptionLimits.ts**:
   - Move limit checking logic
   - Use validators for checks

5. **Create src/hooks/subscription/useFeatureGate.ts**:
   - Move feature availability checks
   - Return upgrade prompts

6. **Create src/hooks/subscription/index.ts**:
   - Re-export all hooks
   - Re-export types

7. **Update src/hooks/useSubscription.ts**:
   - Compose focused hooks
   - Maintain backward compatibility

## Verification
- [ ] All subscription checks work
- [ ] Feature gates work correctly
- [ ] Paywall shows when appropriate
- [ ] No TypeScript errors
- [ ] Main hook under 50 lines
```

**Status:** [x] Planned [x] Refactored [x] Tested

**Results:**
- Main hook: 718 → 54 lines (92% reduction)
- New hooks:
  - `useSubscriptionStatus.ts` (82 lines) - Fetch user subscription
  - `useSubscriptionLimits.ts` (98 lines) - Fetch tier limits
  - `useFeatureGate.ts` (66 lines) - Feature access checking
- New files:
  - `types.ts` (98 lines) - Shared types and re-exports
  - `validators.ts` (268 lines) - Pure validation functions
  - `useSubscriptionHelpers.ts` (115 lines) - Convenience hooks
  - `index.ts` (44 lines) - Re-exports

---

### 4.5 useRoundData (869 lines)

**File:** `src/hooks/scorecard/useRoundData.ts`

**Use Command:** `/split-hook`

**Detailed Prompt:**
```
/split-hook src/hooks/scorecard/useRoundData.ts

Split this 869-line hook into specialized, focused hooks.

## Current State
useRoundData is the main data hook for scoring screens, handling:
- Round metadata fetching
- Player list with scorecards
- Course and hole data
- Team information
- Scoring pairs
- Competition context
- Complex Supabase queries with joins

## Target Architecture

### File Structure
src/hooks/scorecard/
├── index.ts                      # Re-exports
├── useRoundData.ts               # Orchestrator (< 100 lines)
├── useRoundMetadata.ts           # Round info (< 80 lines)
├── useRoundPlayers.ts            # Players with scores (< 100 lines)
├── useRoundCourse.ts             # Course/holes (< 80 lines)
├── useRoundTeams.ts              # Team data (< 80 lines)
└── useRoundScoringPairs.ts       # Scoring pairs (< 60 lines)

src/types/supabase/
└── roundQueries.ts               # Query result types

### Hook Responsibilities

1. **roundQueries.ts** (~100 lines)
   - RoundQueryResult type
   - PlayerWithScorecard type
   - CourseWithHoles type
   - TeamQueryResult type
   - Define query select strings

2. **useRoundMetadata.ts** (~80 lines)
   - Fetch basic round info
   - Status, date, game type
   - Competition reference
   - Return: { round, isLoading, error }

3. **useRoundPlayers.ts** (~100 lines)
   - Fetch players in round
   - Include their scorecards
   - Filter by team if needed
   - Return: { players, getPlayer, isLoading }

4. **useRoundCourse.ts** (~80 lines)
   - Fetch course with holes
   - Include tee data
   - Return: { course, holes, getHole, isLoading }

5. **useRoundTeams.ts** (~80 lines)
   - Fetch teams and members
   - Only for team rounds
   - Return: { teams, getPlayerTeam, isLoading }

6. **useRoundScoringPairs.ts** (~60 lines)
   - Fetch scoring pair assignments
   - Only for competitive rounds
   - Return: { scoringPairs, getMarker, isLoading }

### Main useRoundData.ts (~100 lines)
Compose all hooks and provide unified API:

export function useRoundData(roundId: string) {
  const metadata = useRoundMetadata(roundId);
  const players = useRoundPlayers(roundId);
  const course = useRoundCourse(metadata.data?.course_id);
  const teams = useRoundTeams(roundId, metadata.data?.is_team_round);
  const scoringPairs = useRoundScoringPairs(roundId);

  const isLoading = metadata.isLoading || players.isLoading || course.isLoading;

  return {
    // Metadata
    round: metadata.data,
    competition: metadata.data?.competition,
    status: metadata.data?.status,
    gameType: metadata.data?.game_type,

    // Players
    players: players.data,
    getPlayer: players.getPlayer,

    // Course
    course: course.data,
    holes: course.holes,
    getHole: course.getHole,

    // Teams
    teams: teams.data,
    getPlayerTeam: teams.getPlayerTeam,

    // Scoring pairs
    scoringPairs: scoringPairs.data,
    getMarker: scoringPairs.getMarker,

    // State
    isLoading,
    error: metadata.error || players.error || course.error,
    refetch: () => { /* refetch all */ },
  };
}

## Steps

1. **Create src/types/supabase/roundQueries.ts**:
   - Extract complex type definitions
   - Define query select strings as constants

2. **Create useRoundMetadata.ts**:
   - Move round metadata query
   - Include competition join
   - Export focused hook

3. **Create useRoundPlayers.ts**:
   - Move player list query
   - Include scorecard data
   - Add getPlayer helper

4. **Create useRoundCourse.ts**:
   - Move course/holes query
   - Add getHole helper

5. **Create useRoundTeams.ts**:
   - Move team query
   - Conditionally fetch for team rounds
   - Add getPlayerTeam helper

6. **Create useRoundScoringPairs.ts**:
   - Move scoring pairs query
   - Add getMarker helper

7. **Update useRoundData.ts**:
   - Import focused hooks
   - Compose into unified return object

## Verification
- [x] Scorecard screens work correctly
- [x] Player data loads
- [x] Course data loads
- [x] Team data loads for team rounds
- [x] No TypeScript errors
- [x] Main hook under 100 lines
- [x] Each focused hook under 100 lines
```

**Status:** [x] Planned [x] Refactored [x] Tested

**Results:**
- Main hook: 869 → 310 lines (64% reduction)
- New hooks:
  - `useRoundMetadata.ts` (120 lines) - Round info, game type, team settings
  - `useRoundPlayers.ts` (149 lines) - Player list from competition/round
  - `useRoundCourse.ts` (132 lines) - Course and hole data
  - `useRoundTeams.ts` (132 lines) - Team data for team rounds
  - `useRoundScoringPairs.ts` (121 lines) - Scoring pair assignments
- New types:
  - `src/types/supabase/roundQueries.ts` (232 lines) - Query types and helpers
- Note: Main hook is 310 lines (higher than target 100) because it manages state synchronization with the scorecard store for offline support. The focused hooks handle individual data concerns cleanly.

---

### 4.6 ScoringPairFormationUI (810 lines)

**File:** `src/components/scoring/ScoringPairFormationUI/index.tsx`

**Use Command:** `/refactor`

**Detailed Prompt:**
```
/refactor src/components/scoring/ScoringPairFormationUI/index.tsx

Split this 810-line component into focused components and utilities.

## Current State
ScoringPairFormationUI is a complex component handling:
- Manual scoring pair assignment
- Auto-generation with multiple strategies
- Validation of pair assignments
- Team-aware pairing
- Save/cancel actions
- Preview of assignments

## Target Architecture

### File Structure
src/components/scoring/ScoringPairFormationUI/
├── index.tsx                       # Main orchestrator (< 200 lines)
├── components/
│   ├── AutoGeneratePanel.tsx       # Strategy selection + generate (< 100 lines)
│   ├── ManualPairingList.tsx       # Manual assignment UI (< 150 lines)
│   ├── PairingPreview.tsx          # Preview of assignments (< 80 lines)
│   ├── ValidationBanner.tsx        # Validation messages (< 50 lines)
│   └── PlayerPairRow.tsx           # Individual pair row (< 60 lines)
├── utils/
│   ├── pairingStrategies.ts        # Strategy implementations (< 150 lines)
│   └── pairingValidation.ts        # Validation logic (< 80 lines)
└── hooks/
    └── usePairingState.ts          # State management (< 100 lines)

### Component Responsibilities

1. **pairingStrategies.ts** (~150 lines)
   - reciprocalPairing(players) - A scores B, B scores A
   - circularPairing(players) - Round-robin style
   - crossTeamPairing(players, teams) - Score opponent team
   - randomPairing(players) - Random assignment
   - Each returns ScoringPair[]

2. **pairingValidation.ts** (~80 lines)
   - validatePairings(pairs, players)
   - Check all players have markers
   - Check no self-scoring
   - Check reciprocal if required
   - Return: { isValid, errors, warnings }

3. **usePairingState.ts** (~100 lines)
   - Manage pairing assignments state
   - Handle undo/redo
   - Track dirty state
   - Provide update methods

4. **AutoGeneratePanel.tsx** (~100 lines)
   - Strategy selection dropdown
   - Generate button
   - Strategy descriptions
   - Props: onGenerate, strategies, isTeamRound

5. **ManualPairingList.tsx** (~150 lines)
   - List of PlayerPairRow components
   - Drag/drop or picker for assignment
   - Filter/search players
   - Props: pairs, players, onChange

6. **PlayerPairRow.tsx** (~60 lines)
   - Single player -> marker assignment
   - Player avatar + name
   - Marker selector dropdown
   - Props: player, marker, availableMarkers, onChange

7. **PairingPreview.tsx** (~80 lines)
   - Visual summary of all pairs
   - Show connections between players
   - Highlight issues
   - Props: pairs, players

8. **ValidationBanner.tsx** (~50 lines)
   - Show validation errors/warnings
   - Collapsible details
   - Props: validation, onDismiss

### Main index.tsx (~200 lines)
- Import components and hooks
- Manage mode (auto/manual)
- Compose UI layout
- Handle save/cancel

## Steps

1. **Create utils/pairingStrategies.ts**:
   - Extract strategy functions
   - Add proper typing
   - Export strategy registry

2. **Create utils/pairingValidation.ts**:
   - Extract validation logic
   - Return structured validation result

3. **Create hooks/usePairingState.ts**:
   - Extract state management
   - Add undo/redo capability

4. **Create components/ValidationBanner.tsx**:
   - Extract validation display

5. **Create components/PlayerPairRow.tsx**:
   - Extract single pair row

6. **Create components/ManualPairingList.tsx**:
   - Compose PlayerPairRow components
   - Handle selection logic

7. **Create components/AutoGeneratePanel.tsx**:
   - Extract auto-generation UI
   - Strategy selection

8. **Create components/PairingPreview.tsx**:
   - Visual preview of assignments

9. **Update index.tsx**:
   - Import and compose components
   - Handle mode switching
   - Manage save/cancel flow

## Verification
- [x] Auto-generate works with all strategies
- [x] Manual assignment works
- [x] Validation shows appropriate errors
- [x] Save persists to database
- [x] Cancel reverts changes
- [x] No TypeScript errors
- [x] Main component under 250 lines (243 lines - close to 200 target)
```

**Status:** [x] Planned [x] Refactored [x] Tested

**Results:**
- Main component: 810 → 243 lines (70% reduction)
- New components:
  - `CoverageIndicator.tsx` (158 lines) - Coverage display with quality indicator
  - `AutoGeneratePanel.tsx` (175 lines) - Auto-generate buttons and strategy selection
  - `PairsListSection.tsx` (242 lines) - Player grid and pairs list
  - `ActionBar.tsx` (126 lines) - Save/cancel/reset buttons
  - `ValidationWarning.tsx` (47 lines) - Validation warning banner
- New hooks:
  - `usePairingState.ts` (227 lines) - State management and handlers
- Note: Also kept existing components: CircularChainDiagram, PairingTypeBadge, UnevenTeamWarning, PlayerSelectionChip

---

## Phase 5: Service Splitting (Lower Priority)

### 5.1 SubscriptionService (932 lines)

**File:** `src/services/subscription/SubscriptionService.ts`

**Use Command:** `/split-service`

**Detailed Prompt:**
```
/split-service src/services/subscription/SubscriptionService.ts

Split this 932-line service into a provider pattern architecture.

## Current State
SubscriptionService is a large class handling:
- RevenueCat SDK integration
- Manual subscription management (for testing)
- Tier limit checking
- Subscription state caching
- Restoration
- Purchase flows

## Target Architecture

### File Structure
src/services/subscription/
├── index.ts                          # Factory + exports (< 50 lines)
├── SubscriptionService.ts            # Orchestrator class (< 150 lines)
├── types.ts                          # Shared types (< 80 lines)
├── providers/
│   ├── AbstractProvider.ts           # Base interface/class (< 60 lines)
│   ├── ManualProvider.ts             # Dev/testing provider (< 100 lines)
│   └── RevenueCatProvider.ts         # Production provider (< 200 lines)
├── limits/
│   ├── TierLimits.ts                 # Limit definitions (< 80 lines)
│   └── LimitChecker.ts               # Limit validation (< 100 lines)
└── cache/
    └── SubscriptionCache.ts          # Caching logic (< 80 lines)

### Module Responsibilities

1. **types.ts** (~80 lines)
   - SubscriptionTier enum
   - SubscriptionInfo type
   - PurchaseResult type
   - ProviderConfig type

2. **AbstractProvider.ts** (~60 lines)
   - Interface: ISubscriptionProvider
   - Methods: initialize, getSubscription, purchase, restore
   - Abstract base class with shared logic

3. **ManualProvider.ts** (~100 lines)
   - For development/testing
   - Uses AsyncStorage for state
   - No real purchases
   - Useful for testing tier limits

4. **RevenueCatProvider.ts** (~200 lines)
   - Production RevenueCat integration
   - Initialize SDK
   - Handle purchases
   - Handle restoration
   - Sync with backend

5. **TierLimits.ts** (~80 lines)
   - Define limits per tier
   - TIER_LIMITS constant object
   - Helper to get limits for tier

6. **LimitChecker.ts** (~100 lines)
   - checkCompetitionLimit(tier, count)
   - checkRoundLimit(tier, count)
   - checkPlayerLimit(tier, count)
   - Pure functions, no state

7. **SubscriptionCache.ts** (~80 lines)
   - Cache subscription status
   - TTL-based invalidation
   - Async storage persistence

8. **SubscriptionService.ts** (~150 lines)
   - Orchestrates provider + cache + limits
   - Provider factory method
   - Public API for app

### Main index.ts (~50 lines)
- Export SubscriptionService singleton
- Export types
- Export tier limits for reference

## Steps

1. **Create types.ts**:
   - Extract all subscription types
   - Define provider interface

2. **Create providers/AbstractProvider.ts**:
   - Define ISubscriptionProvider interface
   - Create base class with shared logic

3. **Create providers/ManualProvider.ts**:
   - Implement manual/testing provider
   - Use AsyncStorage

4. **Create providers/RevenueCatProvider.ts**:
   - Move RevenueCat logic
   - Implement provider interface

5. **Create limits/TierLimits.ts**:
   - Extract tier limit definitions

6. **Create limits/LimitChecker.ts**:
   - Extract limit checking functions

7. **Create cache/SubscriptionCache.ts**:
   - Extract caching logic

8. **Update SubscriptionService.ts**:
   - Import provider, cache, limits
   - Create factory for provider selection
   - Expose clean public API

9. **Update index.ts**:
   - Create service singleton
   - Export everything needed

## Verification
- [ ] RevenueCat purchases work in production
- [ ] Manual provider works for testing
- [ ] Tier limits enforced correctly
- [ ] Caching works as expected
- [ ] No TypeScript errors
- [ ] Main service under 150 lines
- [ ] Clear separation of concerns
```

**Status:** [x] Planned [x] Refactored [x] Tested

**Results:**
- Main service: 931 → 119 lines (87% reduction)
- New files:
  - `types.ts` (83 lines) - Shared types and result interfaces
  - `providers/SubscriptionProvider.ts` (74 lines) - Provider interface
  - `providers/ManualProvider.ts` (185 lines) - Manual/testing provider
  - `providers/RevenueCatProvider.ts` (310 lines) - Production RevenueCat provider
  - `revenueCatAuth.ts` (76 lines) - User ID management helpers
- Architecture: Clean provider pattern with factory for provider selection
- Backward compatible: All existing imports work unchanged

---

### 5.2 roundResultsService (925 lines)

**File:** `src/services/rounds/roundResultsService.ts`

**Use Command:** `/split-service`

**Detailed Prompt:**
```
/split-service src/services/rounds/roundResultsService.ts

Split this 925-line service into scoring engine pattern.

## Current State
roundResultsService handles all scoring calculations:
- Stableford point calculation
- Stroke play gross/net
- Match play hole-by-hole scoring
- Team scoring (best ball, aggregate)
- Leaderboard generation
- Result caching

## Target Architecture

### File Structure
src/services/scoring/
├── index.ts                        # Exports + factory (< 50 lines)
├── types.ts                        # Scoring types (< 100 lines)
├── engines/
│   ├── IScoringEngine.ts           # Engine interface (< 40 lines)
│   ├── StablefordEngine.ts         # Stableford scoring (< 150 lines)
│   ├── StrokePlayEngine.ts         # Stroke play scoring (< 120 lines)
│   ├── MatchPlayEngine.ts          # Match play scoring (< 150 lines)
│   └── TeamScoringEngine.ts        # Team format scoring (< 180 lines)
├── utils/
│   ├── handicapUtils.ts            # Handicap calculations (< 80 lines)
│   ├── leaderboardUtils.ts         # Sorting + tiebreakers (< 100 lines)
│   └── netScoreUtils.ts            # Net score calculations (< 60 lines)
└── ScoringOrchestrator.ts          # Main orchestrator (< 150 lines)

src/services/rounds/
└── roundResultsService.ts          # Thin wrapper (< 100 lines)

### Module Responsibilities

1. **types.ts** (~100 lines)
   - GameType enum
   - ScoringResult type
   - LeaderboardEntry type
   - TeamResult type
   - EngineConfig type

2. **IScoringEngine.ts** (~40 lines)
   - Interface for all engines
   - calculateScore(scorecard, course)
   - calculateLeaderboard(scorecards, course)
   - Consistent return types

3. **StablefordEngine.ts** (~150 lines)
   - Points calculation per hole
   - Net Stableford with handicap
   - Leaderboard by total points
   - Tiebreaker: back 9, back 6, back 3

4. **StrokePlayEngine.ts** (~120 lines)
   - Gross score calculation
   - Net score with strokes
   - Leaderboard by total strokes
   - Tiebreaker: lowest handicap

5. **MatchPlayEngine.ts** (~150 lines)
   - Hole-by-hole comparison
   - Up/down/AS status
   - Match result (e.g., "3&2")
   - Handle incomplete matches

6. **TeamScoringEngine.ts** (~180 lines)
   - Best ball (best score per hole)
   - Aggregate (combined scores)
   - Ambrose (team handicap)
   - Team leaderboard

7. **handicapUtils.ts** (~80 lines)
   - calculateStrokesReceived(handicap, strokeIndex)
   - adjustHandicapForGameType(handicap, gameType)
   - getPlayingHandicap(handicap, courseSR, par)

8. **leaderboardUtils.ts** (~100 lines)
   - sortByScore(entries, ascending)
   - applyTiebreaker(entries, method)
   - calculatePosition(entries)

9. **netScoreUtils.ts** (~60 lines)
   - calculateNetScore(gross, strokes)
   - getStrokesForHole(handicap, strokeIndex)

10. **ScoringOrchestrator.ts** (~150 lines)
    - Factory for engine selection
    - Cache results
    - Handle game type switching

### roundResultsService.ts (~100 lines)
- Thin wrapper around ScoringOrchestrator
- Fetch round data from Supabase
- Return formatted results

## Steps

1. **Create src/services/scoring/types.ts**:
   - Extract all scoring types
   - Define engine interface

2. **Create engines/IScoringEngine.ts**:
   - Define engine interface
   - Shared types for all engines

3. **Create engines/StablefordEngine.ts**:
   - Move Stableford logic
   - Implement IScoringEngine

4. **Create engines/StrokePlayEngine.ts**:
   - Move stroke play logic
   - Implement IScoringEngine

5. **Create engines/MatchPlayEngine.ts**:
   - Move match play logic
   - Implement IScoringEngine

6. **Create engines/TeamScoringEngine.ts**:
   - Move team scoring logic
   - Handle all team formats

7. **Create utils/handicapUtils.ts**:
   - Extract handicap calculations

8. **Create utils/leaderboardUtils.ts**:
   - Extract leaderboard sorting

9. **Create utils/netScoreUtils.ts**:
   - Extract net score calculations

10. **Create ScoringOrchestrator.ts**:
    - Engine factory
    - Result caching
    - Main API

11. **Update roundResultsService.ts**:
    - Thin wrapper
    - Data fetching only

## Verification
- [ ] Stableford scoring works
- [ ] Stroke play scoring works
- [ ] Match play scoring works
- [ ] Team scoring works for all formats
- [ ] Leaderboards sort correctly
- [ ] Tiebreakers work
- [ ] No TypeScript errors
- [ ] Each engine under 200 lines
```

**Status:** [x] Planned [x] Refactored [x] Tested

---

### 5.3 offline/database.ts (790 lines)

**File:** `src/services/offline/database.ts`

**Use Command:** `/split-service`

**Detailed Prompt:**
```
/split-service src/services/offline/database.ts

Split this 790-line file into DAO pattern architecture.

## Current State
database.ts is a monolithic file handling all SQLite operations:
- Database initialization and schema
- Scorecard CRUD operations
- Hole score CRUD operations
- Sync tracking and queue
- Conflict resolution
- Migration handling

## Target Architecture

### File Structure
src/services/offline/
├── index.ts                        # Main exports (< 30 lines)
├── DatabaseManager.ts              # Init + migrations (< 150 lines)
├── types.ts                        # Shared types (< 60 lines)
├── dao/
│   ├── ScorecardDAO.ts             # Scorecard operations (< 150 lines)
│   ├── HoleScoreDAO.ts             # Hole score operations (< 120 lines)
│   ├── SyncQueueDAO.ts             # Sync queue operations (< 100 lines)
│   └── ConflictDAO.ts              # Conflict tracking (< 80 lines)
├── schema/
│   ├── migrations.ts               # Migration definitions (< 100 lines)
│   └── tables.ts                   # Table creation SQL (< 80 lines)
└── utils/
    ├── sqlBuilder.ts               # Query helpers (< 60 lines)
    └── dateUtils.ts                # Date serialization (< 40 lines)

### Module Responsibilities

1. **types.ts** (~60 lines)
   - LocalScorecard type
   - LocalHoleScore type
   - SyncQueueItem type
   - ConflictRecord type
   - SyncStatus enum

2. **DatabaseManager.ts** (~150 lines)
   - Initialize SQLite database
   - Run migrations
   - Get database instance
   - Close/cleanup
   - Error handling wrapper

3. **ScorecardDAO.ts** (~150 lines)
   - insertScorecard(scorecard)
   - updateScorecard(id, updates)
   - getScorecard(id)
   - getScorecardsByRound(roundId)
   - getPendingScorecards()
   - deleteScorecard(id)
   - markAsSynced(id, serverId)

4. **HoleScoreDAO.ts** (~120 lines)
   - insertHoleScore(score)
   - updateHoleScore(id, updates)
   - getHoleScoresForScorecard(scorecardId)
   - getHoleScore(scorecardId, holeNumber)
   - deleteHoleScores(scorecardId)
   - bulkInsertHoleScores(scores)

5. **SyncQueueDAO.ts** (~100 lines)
   - addToQueue(item)
   - getQueueItems()
   - markAsProcessed(id)
   - markAsFailed(id, error)
   - clearProcessed()
   - getRetryItems()

6. **ConflictDAO.ts** (~80 lines)
   - recordConflict(conflict)
   - getUnresolvedConflicts()
   - resolveConflict(id, resolution)
   - getConflictHistory(entityId)

7. **migrations.ts** (~100 lines)
   - MIGRATIONS array with version, up, down
   - Migration runner
   - Version tracking

8. **tables.ts** (~80 lines)
   - CREATE TABLE statements
   - Index definitions
   - Table names constants

9. **sqlBuilder.ts** (~60 lines)
   - buildInsert(table, data)
   - buildUpdate(table, data, where)
   - buildSelect(table, where, order)
   - Parameterized query helpers

10. **dateUtils.ts** (~40 lines)
    - toSQLiteDate(date)
    - fromSQLiteDate(string)
    - ISO handling

### index.ts (~30 lines)
- Export DatabaseManager singleton
- Export all DAOs
- Export types

## Steps

1. **Create types.ts**:
   - Extract all offline types
   - Define DAO interfaces

2. **Create schema/tables.ts**:
   - Extract CREATE TABLE SQL
   - Define table name constants

3. **Create schema/migrations.ts**:
   - Extract migrations
   - Version tracking logic

4. **Create utils/sqlBuilder.ts**:
   - Extract SQL building helpers

5. **Create utils/dateUtils.ts**:
   - Extract date serialization

6. **Create DatabaseManager.ts**:
   - Database initialization
   - Migration runner
   - Connection management

7. **Create dao/ScorecardDAO.ts**:
   - Move scorecard operations
   - Consistent error handling

8. **Create dao/HoleScoreDAO.ts**:
   - Move hole score operations

9. **Create dao/SyncQueueDAO.ts**:
   - Move sync queue operations

10. **Create dao/ConflictDAO.ts**:
    - Move conflict operations

11. **Update index.ts**:
    - Export everything
    - Create singleton instances

## Verification
- [ ] Database initializes correctly
- [ ] Migrations run in order
- [ ] Scorecard CRUD works
- [ ] Hole score CRUD works
- [ ] Sync queue operations work
- [ ] Conflict tracking works
- [ ] Offline mode works end-to-end
- [ ] No TypeScript errors
- [ ] Each DAO under 150 lines
```

**Status:** [x] Planned [x] Refactored [x] Tested

**Results:**
- Main file: 790 → 45 lines (94% reduction, now re-exports only)
- New architecture following DAO pattern:
  - `DatabaseManager.ts` (107 lines) - Database initialization, migrations, connection management
  - `dao/ScorecardDAO.ts` (204 lines) - All scorecard CRUD operations
  - `dao/HoleScoreDAO.ts` (126 lines) - Hole score CRUD operations
  - `dao/HolesDAO.ts` (80 lines) - Course holes operations
  - `dao/SyncQueueDAO.ts` (118 lines) - Pending sync queue operations
  - `schema/tables.ts` (95 lines) - Table creation SQL
  - `schema/migrations.ts` (66 lines) - Migration runner
  - `types.ts` (78 lines) - Shared SQLite types
  - `utils/dateUtils.ts` (34 lines) - Date serialization helpers
- All 54 existing tests pass
- Backward compatible: All existing imports work unchanged

---

## Progress Tracking

### Phase 0: Commands & Instructions
- [x] 0.1 Create `/consolidate` command
- [x] 0.2 Create `/split-hook` command
- [x] 0.3 Create `/split-service` command
- [x] 0.4 Create `common-components-catalog.md` instruction
- [x] 0.5 Update `/refactor` command

### Phase 1: New Components
- [x] 1.1 RadioButtonOption - `/component RadioButtonOption`
- [x] 1.2 MenuItemRow - `/component MenuItemRow`
- [x] 1.3 InfoCard - `/component InfoCard`

### Phase 2: Empty States
- [x] 2.1 RoundListEmpty.tsx -> EmptyState - `/consolidate`
- [x] 2.2 ScorecardEmptyStates.tsx -> ErrorState + EmptyState - `/consolidate`
- [x] 2.3 ReviewEmptyStates.tsx -> EmptyState - `/consolidate`

### Phase 3: Apply Components
- [x] 3.1 SettingsScreen - RadioButtonOption - `/consolidate` (~42 lines removed)
- [x] 3.2 HelpAndSupportScreen - RadioButtonOption - `/consolidate` (~35 lines removed)
- [x] 3.3 ProfileScreen - MenuItemRow - `/consolidate` (~45 lines removed)
- [x] 3.4 NotificationSettingsScreen - MenuItemRow - `/consolidate` (~42 lines removed)

### Phase 4: Large Files
- [x] 4.1 ProfileScreen (783→264 lines) - `/refactor` - Split into 5 components + 1 hook
- [x] 4.2 CompetitionsListScreen (762→236 lines) - `/refactor` - Split into 3 components + 1 hook + 1 service
- [x] 4.3 useAuth (824→97 lines) - `/split-hook` - Split into 6 hooks + types + utils
- [x] 4.4 useSubscription (718→54 lines) - `/split-hook` - Split into 3 hooks + types + validators + helpers
- [x] 4.5 useRoundData (869→310 lines) - `/split-hook` - Split into 5 hooks + types
- [x] 4.6 ScoringPairFormationUI (810→243 lines) - `/refactor` - Split into 5 new components + 1 hook

### Phase 5: Services
- [x] 5.1 SubscriptionService (931→119 lines) - `/split-service` - Split into 5 modules with provider pattern
- [x] 5.2 roundResultsService (925→545 lines) - `/split-service` - Created `src/services/scoring/` with modular scoring engine pattern:
  - `types.ts` (~95 lines) - Scoring types and constants
  - `engines/IScoringEngine.ts` (~35 lines) - Engine interface
  - `engines/StablefordEngine.ts` (~185 lines) - Stableford scoring
  - `engines/StrokePlayEngine.ts` (~175 lines) - Stroke play scoring
  - `engines/MatchPlayEngine.ts` (~380 lines) - Match play scoring
  - `engines/TeamScoringEngine.ts` (~405 lines) - Team formats (Best Ball, Ambrose, Aggregate)
  - `utils/handicapUtils.ts` (~140 lines) - Handicap calculations
  - `utils/netScoreUtils.ts` (~130 lines) - Net score calculations
  - `utils/leaderboardUtils.ts` (~165 lines) - Leaderboard sorting + tiebreakers
  - `ScoringOrchestrator.ts` (~180 lines) - Factory + coordinator
  - `roundResultsService.ts` now thin wrapper (545 lines) for data persistence only
- [x] 5.3 offline/database.ts (790→45 lines) - `/split-service` - Split into DAO pattern:
  - `types.ts` (~78 lines) - Shared database types
  - `schema/tables.ts` (~95 lines) - Table definitions
  - `schema/migrations.ts` (~66 lines) - Migration logic
  - `utils/dateUtils.ts` (~34 lines) - Date serialization
  - `DatabaseManager.ts` (~107 lines) - Init/cleanup
  - `dao/ScorecardDAO.ts` (~204 lines) - Scorecard operations
  - `dao/HoleScoreDAO.ts` (~126 lines) - Hole score operations
  - `dao/HolesDAO.ts` (~80 lines) - Course holes operations
  - `dao/SyncQueueDAO.ts` (~118 lines) - Sync queue operations
  - `database.ts` now thin re-export file (45 lines) for backward compatibility

---

## Notes

- **Phase 0 first** - Create commands before using them
- Use `/component` for creating new common components
- Use `/consolidate` for replacing custom code with common components
- Use `/split-hook` for splitting large hooks
- Use `/split-service` for splitting large services
- Use `/refactor` for general refactoring
- Run `/test-component` after creating each component
- Estimated total savings: ~295 lines immediate, architecture improvements for maintainability
