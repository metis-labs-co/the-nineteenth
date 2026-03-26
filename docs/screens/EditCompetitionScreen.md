# EditCompetitionScreen

**File:** `src/screens/admin/EditCompetitionScreen/index.tsx`

## Overview

Allows organizers to edit existing competition details. Features form validation with Zod schema, date pickers, segmented button selectors, and unsaved changes protection.

## Features

- **Edit Competition Details**: Name, description, dates, handicap system, visibility
- **Form Validation**: Zod schema validation with react-hook-form
- **Date Pickers**: Native date picker for start/end dates
- **Segmented Controls**: Handicap system and visibility selection
- **Unsaved Changes Warning**: Alert on back navigation with dirty form
- **Read-only Invite Code**: Display only, not editable

## Navigation

| Destination | Trigger | Condition |
|-------------|---------|-----------|
| Previous screen | Close (X) button | No dirty changes or user confirms |
| Previous screen | Save successful | Always |

## Route Parameters

```typescript
type Props = {
  route: {
    params: {
      id: string; // Competition ID
    }
  }
}
```

## Data Dependencies

### Hooks Used
- `useQuery` - Fetch competition data
- `useMutation` - Update competition
- `useQueryClient` - Cache invalidation
- `useForm` (react-hook-form) - Form state management
- `useSafeAreaInsets()` - Safe area handling

### Form Schema (Zod)
```typescript
const editCompetitionSchema = z.object({
  name: z.string().min(3).max(50),
  description: z.string().max(500).optional().nullable(),
  startDate: z.date(),
  endDate: z.date().optional().nullable(),
  handicapSystem: z.enum(['honor', 'whs', 'gross-only']),
  visibility: z.enum(['private', 'public', 'unlisted']),
});
```

## Component Structure

```
EditCompetitionScreen
├── KeyboardAvoidingView
│   ├── Header
│   │   ├── CloseButton (IconButton)
│   │   ├── Title ("Edit Competition")
│   │   └── HeaderSpacer
│   └── ScrollView
│       ├── Field (Competition Name) *
│       │   ├── Label
│       │   ├── TextInput (Controller)
│       │   └── HelperText (error)
│       ├── Field (Description)
│       │   ├── Label
│       │   ├── TextInput (multiline, Controller)
│       │   └── HelperText (error)
│       ├── Field (Start Date) *
│       │   ├── Label
│       │   ├── DateButton
│       │   └── DateTimePicker (conditional)
│       ├── Field (End Date)
│       │   ├── Label
│       │   ├── DateButton + ClearButton
│       │   └── DateTimePicker (conditional)
│       ├── Field (Handicap System) *
│       │   ├── Label
│       │   ├── SegmentedButtons (Controller)
│       │   └── HelperText (description)
│       ├── Field (Visibility) *
│       │   ├── Label
│       │   ├── SegmentedButtons (Controller)
│       │   └── HelperText (description)
│       ├── Field (Invite Code - read-only)
│       │   ├── Label
│       │   ├── InviteCodeContainer
│       │   └── HelperText
│       └── SaveButton
```

## State Management

| State | Type | Purpose |
|-------|------|---------|
| `showStartDatePicker` | `boolean` | Start date picker visibility |
| `showEndDatePicker` | `boolean` | End date picker visibility |

### Form State (react-hook-form)
- `errors` - Validation errors
- `isDirty` - Tracks unsaved changes
- `control` - Form control for Controller components
- `watch` - Watch form values
- `setValue` - Programmatic value updates
- `reset` - Reset form with new values

## Field Configurations

### Handicap System Options
| Value | Label | Description |
|-------|-------|-------------|
| `honor` | Honor | Players self-report their handicap |
| `whs` | WHS | Uses World Handicap System |
| `gross-only` | Gross | No handicap adjustments - gross scores only |

### Visibility Options
| Value | Label | Description |
|-------|-------|-------------|
| `private` | Private | Only invited players can see and join |
| `public` | Public | Anyone can see and join |
| `unlisted` | Unlisted | Only accessible via invite code |

## Interactions

### Form Population
When competition data loads, form is reset with existing values:
```typescript
useEffect(() => {
  if (competition) {
    reset({
      name: competition.name,
      description: competition.description || '',
      startDate: parseDate(competition.start_date) || new Date(),
      endDate: parseDate(competition.end_date),
      handicapSystem: competition.handicap_system,
      visibility: competition.visibility,
    });
  }
}, [competition, reset]);
```

### Date Selection
- Start date picker shows native DateTimePicker
- End date has minimum date constraint (must be >= start date)
- End date can be cleared with close button

### Unsaved Changes Warning
```typescript
const handleBack = useCallback(() => {
  if (isDirty) {
    Alert.alert(
      'Unsaved Changes',
      'You have unsaved changes. Are you sure you want to leave?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
  } else {
    navigation.goBack();
  }
}, [navigation, isDirty]);
```

### Save Flow
1. Form submitted via `handleSubmit(onSubmit)`
2. `updateMutation.mutate(data)` called
3. On success:
   - Invalidates related queries (competition, details, competitions list)
   - Navigates back
4. On error: Shows alert with error message

## Query Invalidation

After successful update:
```typescript
queryClient.invalidateQueries({ queryKey: ['competition', id] });
queryClient.invalidateQueries({ queryKey: ['competition', id, 'details'] });
queryClient.invalidateQueries({ queryKey: ['competitions'] });
```

## UI Components Used

- `View`, `ScrollView`, `KeyboardAvoidingView`, `Alert` - React Native core
- `Text`, `TextInput`, `Button`, `ActivityIndicator`, `IconButton`, `SegmentedButtons`, `HelperText` - React Native Paper
- `DateTimePicker` - @react-native-community/datetimepicker
- `Controller` - react-hook-form

## Date Formatting

Australian format (DD/MM/YYYY):
```typescript
function formatDateDisplay(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
```

## Loading & Error States

### Loading
- Centered activity indicator
- "Loading competition..." text

### Error
- Large exclamation icon
- "Unable to load competition" title
- Error message
- "Go Back" button

## Styling Highlights

- Surface background on header with shadow
- White input backgrounds
- Multiline textarea with 100px min height
- Date buttons with calendar icon
- Segmented buttons for radio selections
- Invite code in highlighted primary-lighter container
- Save button disabled when not dirty or pending
- 52px height save button

## Accessibility

- All inputs have accessibility labels
- Date buttons describe current date value
- Close button has proper label
- Save button has role and label
- Helper text provides context for selections
