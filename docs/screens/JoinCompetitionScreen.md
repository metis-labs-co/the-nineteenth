# JoinCompetitionScreen

**File:** `src/screens/competitions/JoinCompetitionScreen.tsx`

## Overview

Dedicated screen for players to join competitions via invite code. Features code validation, competition preview, and one-tap join functionality.

## Features

- **Invite Code Input**: Auto-formatting for COMP-XXXXX format
- **Code Validation**: Regex pattern matching before lookup
- **Competition Preview**: Detailed preview card after successful lookup
- **Membership Check**: Prevents duplicate joins
- **Status Handling**: Blocks joining completed/cancelled competitions
- **Loading States**: Separate states for lookup and join operations

## Navigation

| Destination | Trigger |
|-------------|---------|
| Previous screen | Back button |
| `CompetitionDashboard` | Successful join (with replace) |

## Data Dependencies

### Hooks Used
- `useAuth()` - Get current user and player for join operation

### Supabase Queries
1. **Competition Lookup**: Fetches competition with player count
2. **Organizer Name**: Fetches organizer's name
3. **Membership Check**: Verifies user hasn't already joined
4. **Join Insert**: Adds player to `competition_players`

## Component Structure

```
JoinCompetitionScreen
├── SafeAreaView
│   └── KeyboardAvoidingView
│       ├── Header
│       │   ├── BackButton
│       │   ├── Title ("Join Competition")
│       │   └── Subtitle
│       └── ScrollView
│           ├── InputSection
│           │   ├── TextInput (invite code)
│           │   ├── HelperText (lookup error)
│           │   └── LookupButton
│           ├── PreviewSection (conditional: competition found)
│           │   ├── Divider
│           │   ├── SectionTitle ("Competition Found")
│           │   ├── CompetitionCard
│           │   │   ├── StatusBadge
│           │   │   ├── CompetitionName
│           │   │   ├── Description
│           │   │   └── DetailsGrid (date, organizer, players, handicap)
│           │   ├── JoinError (conditional)
│           │   ├── JoinButton
│           │   └── WarningText (for non-joinable)
│           └── EmptyState (conditional: lookup failed)
```

## State Management

| State | Type | Purpose |
|-------|------|---------|
| `inviteCode` | `string` | Input value (auto-formatted) |
| `competition` | `CompetitionPreview \| null` | Found competition data |
| `isLookingUp` | `boolean` | Lookup loading state |
| `isJoining` | `boolean` | Join loading state |
| `lookupError` | `string \| null` | Lookup error message |
| `joinError` | `string \| null` | Join error message |
| `hasLookedUp` | `boolean` | Tracks if lookup attempted |

## Invite Code Handling

### Auto-Formatting
```typescript
const handleInviteCodeChange = useCallback((text: string) => {
  let formatted = text.toUpperCase();

  // Auto-insert dash after COMP
  if (formatted.length > 4 && formatted.startsWith('COMP') && formatted[4] !== '-') {
    formatted = 'COMP-' + formatted.slice(4);
  }

  // Limit to 10 characters (COMP-XXXXX)
  if (formatted.length <= 10) {
    setInviteCode(formatted);
  }
}, [competition]);
```

### Validation Pattern
```typescript
const validateInviteCode = (code: string): boolean => {
  const pattern = /^COMP-\d{5}$/;
  return pattern.test(code.toUpperCase());
};
```

## Lookup Flow

1. User enters invite code
2. Code auto-formats as typed
3. "Look Up" button enabled at 10 characters
4. On tap:
   - Validates format
   - Fetches competition from Supabase
   - Fetches organizer name
   - Checks for existing membership
5. On success: Shows competition preview
6. On error: Shows appropriate error message

## Join Flow

1. User taps "Join Competition"
2. Validates:
   - Competition exists
   - User is logged in
   - Competition is joinable (not completed/cancelled)
3. Inserts record into `competition_players`
4. On success: Navigates to CompetitionDashboard (replace)
5. On error: Shows join error message

## Status Configuration

| Status | Color | Badge Text |
|--------|-------|------------|
| `upcoming` | info | "Upcoming" |
| `in-progress` | success | "In Progress" |
| `completed` | gray500 | "Completed" |
| `cancelled` | error | "Cancelled" |

## Competition Preview Data

```typescript
interface CompetitionPreview {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  organizerName: string;
  playerCount: number;
  handicapSystem: string;
  status: string;
}
```

## Error Messages

### Lookup Errors
| Condition | Message |
|-----------|---------|
| Invalid format | "Invalid code format. Please enter a code like COMP-12345" |
| Not found (PGRST116) | "No competition found with this invite code..." |
| Already member | "You have already joined this competition." |
| Other errors | "Unable to look up competition. Please try again." |

### Join Errors
| Condition | Message |
|-----------|---------|
| Not logged in | "Unable to join. Please make sure you are logged in." |
| Completed/Cancelled | "This competition is {status} and cannot be joined." |
| Duplicate (23505) | "You have already joined this competition." |
| Other errors | "Unable to join competition. Please try again." |

## UI Components Used

- `View`, `Text`, `ScrollView`, `KeyboardAvoidingView`, `TouchableOpacity`, `ActivityIndicator` - React Native core
- `TextInput`, `Button`, `Card`, `HelperText`, `Divider` - React Native Paper
- `SafeAreaView` - react-native-safe-area-context

## Date Formatting

Australian format (DD/MM/YYYY):
```typescript
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};
```

## Styling Highlights

- White header with border bottom
- Primary color for "Look Up" button
- Success (green) color for "Join Competition" button
- Status badges with semi-transparent backgrounds
- Card with medium shadow
- Details grid with border separators
- Warning text in warning color for non-joinable competitions

## Accessibility

- Back button with proper role and label
- Input has accessibility label and hint
- Lookup/Join buttons have descriptive labels and hints
- Competition name read by screen readers
- Hit slop on back button for easier tapping
