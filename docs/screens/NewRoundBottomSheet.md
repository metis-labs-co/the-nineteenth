# NewRoundBottomSheet

**File:** `src/screens/rounds/NewRoundBottomSheet.tsx`

## Overview

Animated slide-up bottom sheet modal for starting new rounds. Features a two-step wizard flow: course selection followed by playing partner selection from friends list.

## Features

- **Animated Slide-Up**: Spring animation from bottom with backdrop
- **Two-Step Wizard**: Course selection → Partner selection
- **Course Search**: Search and select from available courses
- **Partner Selection**: Select up to 3 friends as playing partners
- **Step Indicator**: Visual dots showing current step
- **Backdrop Dismissal**: Tap outside to close

## Props

```typescript
interface NewRoundBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onStartRound: (courseId: string, courseName: string, partners: PlayingPartner[]) => void;
}
```

## Data Dependencies

### Hooks Used
- `useFriends()` - Fetch user's friends list
- `useQuery()` - Fetch courses with search
- `useSafeAreaInsets()` - Safe area padding

### Data Types
```typescript
interface Course {
  id: string;
  name: string;
  city?: string;
  state?: string;
}

interface PlayingPartner {
  id: string;
  name: string;
  handicap?: number;
}
```

## Component Structure

### Step 1: Course Selection
```
NewRoundBottomSheet
├── Backdrop (animated)
└── Sheet (animated)
    ├── Handle
    ├── Header (title + close button)
    ├── StepIndicator
    ├── SearchContainer (course search)
    └── ListContainer
        ├── ListTitle ("Recent Courses" / "Search Results")
        └── CourseList (FlatList)
            └── CourseItem (map pin + name + location)
```

### Step 2: Partner Selection
```
NewRoundBottomSheet
├── Backdrop (animated)
└── Sheet (animated)
    ├── Handle
    ├── Header (back + title + close)
    ├── StepIndicator
    ├── SelectedBanner (selected course info)
    ├── SelectedPartnersContainer (horizontal chips)
    ├── SearchContainer (friend search)
    ├── ListContainer
    │   ├── ListTitle ("Select up to 3 friends")
    │   └── FriendsList (FlatList)
    │       └── FriendItem (avatar + name + handicap)
    └── ButtonContainer
        └── StartButton
```

## State Management

| State | Type | Purpose |
|-------|------|---------|
| `currentStep` | `'course' \| 'partners'` | Current wizard step |
| `searchQuery` | `string` | Course search input |
| `selectedCourse` | `Course \| null` | Chosen course |
| `selectedPartners` | `PlayingPartner[]` | Chosen partners (max 3) |
| `friendSearchQuery` | `string` | Friend search input |

## Animation

### Sheet Animation
```typescript
// Open
Animated.parallel([
  Animated.spring(translateY, { toValue: 0, damping: 20, stiffness: 150 }),
  Animated.timing(backdropOpacity, { toValue: 1, duration: 200 }),
])

// Close
Animated.parallel([
  Animated.spring(translateY, { toValue: SHEET_HEIGHT }),
  Animated.timing(backdropOpacity, { toValue: 0, duration: 150 }),
])
```

### Sheet Dimensions
- Height: 80% of screen height (`SCREEN_HEIGHT * 0.8`)

## Interactions

### Course Selection
1. Type in search input (filters courses)
2. Tap course item
3. `handleSelectCourse()` stores course and advances to step 2

### Partner Selection
1. Optional: Search friends by name
2. Tap friend to toggle selection (max 3)
3. Selected friends shown as chips
4. Tap X on chip to remove
5. Tap "Start Scoring" to confirm

### Navigation
- **Back to Course**: Available on step 2, returns to course selection
- **Close**: Available on all steps, resets all state
- **Backdrop Tap**: Same as close

## Partner Constraints

```typescript
const MAX_PARTNERS = 3;

// Disabled state when max reached
const disabled = !selected && selectedPartners.length >= MAX_PARTNERS;
```

## Start Round Button Text

- With partners: "Start Scoring (X players)"
- Solo: "Start Solo Round"

Where X = selectedPartners.length + 1 (current user)

## Query Behavior

### Courses Query
- Enabled when: `visible && currentStep === 'course'`
- Search: Case-insensitive name matching
- Limit: 20 results
- Sort: Alphabetical by name

### Friends Query
- Uses `useFriends()` hook
- Client-side filtering by search query

## UI Components Used

- `View`, `Text`, `Animated`, `Dimensions`, `TouchableOpacity`, `Pressable`, `TextInput`, `FlatList`, `KeyboardAvoidingView`, `ScrollView` - React Native core
- `useSafeAreaInsets` - Safe area context
- Tabler Icons: `IconX`, `IconSearch`, `IconMapPin`, `IconGolf`, `IconChevronRight`, `IconChevronLeft`, `IconUsers`, `IconUser`, `IconCheck`, `IconPlus`

## Styling Highlights

- 50% opacity black backdrop
- Sheet with extra-large top border radius
- Centered handle bar (36x4px)
- Step indicator with active dot enlargement
- Course banner with primary-lighter background
- Selected partner chips with border
- Friend list items highlight when selected
- Disabled items at 50% opacity
- Primary color start button with shadow

## Accessibility

- Back button with accessibility label
- Close button with accessibility label
- Course items and friend items are touchable
- Keyboard avoiding view for input focus
