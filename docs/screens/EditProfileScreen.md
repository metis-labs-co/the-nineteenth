# EditProfileScreen

**File:** `src/screens/profile/EditProfileScreen.tsx`

## Overview

Form screen for editing player profile data including name, phone number, handicap, and National Golf ID. Uses React Hook Form with Zod validation and integrates with the auth hook for profile updates.

## Features

- **Editable Fields**: Name, phone, handicap, Golf ID
- **Read-only Email**: Displayed but not editable
- **Form Validation**: Zod schema with real-time validation
- **Unsaved Changes Warning**: Alert on cancel with dirty form
- **Success Feedback**: Snackbar notification on save
- **Avatar Display**: Photo preview (uploads coming soon)

## Navigation

| Destination | Trigger | Condition |
|-------------|---------|-----------|
| Previous screen | Cancel button | No dirty changes or user confirms |
| Previous screen | Save successful | Auto-navigates after 1.5s |

## Data Dependencies

### Hooks Used
- `useAuth()` - Get player data, user, updateProfile function
- `useForm()` - React Hook Form for form state
- `useSafeAreaInsets()` - Safe area handling

### Form Schema (Zod)
```typescript
const editProfileSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().optional()
    .refine((val) => !val || /^[\d\s+()-]{8,20}$/.test(val)),
  handicap: z.string().optional()
    .refine((val) => !val || (parseFloat(val) >= 0 && parseFloat(val) <= 54)),
  golf_id: z.string().optional()
    .refine((val) => !val || /^[0-9]{10}$/.test(val)),
});
```

## Component Structure

```
EditProfileScreen
├── KeyboardAvoidingView
│   ├── Header
│   │   ├── CancelButton
│   │   ├── Title ("Edit Profile")
│   │   └── SaveButton (or ActivityIndicator)
│   └── ScrollView
│       ├── AvatarSection
│       │   ├── Avatar (Image or Icon)
│       │   └── AvatarHint
│       ├── FormSection
│       │   ├── NameField (Controller) *
│       │   ├── EmailField (read-only)
│       │   ├── PhoneField (Controller)
│       │   ├── HandicapField (Controller)
│       │   └── GolfIdField (Controller)
│       └── InfoSection
└── Snackbar (success message)
```

## State Management

| State | Type | Purpose |
|-------|------|---------|
| `snackbarVisible` | `boolean` | Success message visibility |
| `snackbarMessage` | `string` | Success message text |
| `isSubmitting` | `boolean` | Form submission state |

### Form State (react-hook-form)
- `errors` - Field validation errors
- `isDirty` - Tracks unsaved changes
- `control` - Form control for Controller components
- `reset` - Reset form values

## Field Configurations

| Field | Required | Validation | Keyboard | Affix |
|-------|----------|------------|----------|-------|
| Name | Yes | 2-100 chars | Default | None |
| Email | - | Read-only | - | None |
| Phone | No | 8-20 digits/symbols | phone-pad | None |
| Handicap | No | 0-54 numeric | decimal-pad | "HC:" |
| Golf ID | No | Exactly 10 digits | number-pad | "GA:" |

## Interactions

### Form Population
When player data loads, form is reset with values:
```typescript
useEffect(() => {
  if (player) {
    reset({
      name: player.name || '',
      phone: player.phone || '',
      handicap: player.handicap?.toString() || '',
      golf_id: player.golf_id || '',
    });
  }
}, [player, reset]);
```

### Cancel with Unsaved Changes
```typescript
const handleCancel = () => {
  if (isDirty) {
    Alert.alert(
      'Discard Changes?',
      'You have unsaved changes...',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
  } else {
    navigation.goBack();
  }
};
```

### Save Flow
1. Form validated via `handleSubmit(onSubmit)`
2. Handicap change check for `handicap_updated_at`
3. `updateProfile()` called with form data
4. On success: Snackbar shown, navigate after delay
5. On error: Alert shown

## Handicap Update Tracking

If handicap value changes, `handicap_updated_at` is updated:
```typescript
const handicapChanged = data.handicap !== (player?.handicap?.toString() || '');
await updateProfile({
  ...fields,
  ...(handicapChanged && { handicap_updated_at: new Date().toISOString() }),
});
```

## Date Formatting

For handicap last updated display:
```typescript
const formatHandicapDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};
```

## UI Components Used

- `View`, `ScrollView`, `KeyboardAvoidingView`, `Pressable`, `ActivityIndicator`, `Alert` - React Native core
- `Text`, `TextInput`, `Avatar`, `Icon`, `Snackbar` - React Native Paper
- `Controller` - react-hook-form
- `useSafeAreaInsets` - Safe area handling

## Loading State

When loading and no player data:
- Centered activity indicator

## Styling Highlights

- White header with cancel/save buttons
- Cancel in secondary color, Save in primary (bold)
- Save disabled when not dirty or submitting
- 100px avatar centered with hint text
- White form section with shadow
- Input affixes for handicap (HC:) and golf ID (GA:)
- Disabled email input with gray background
- Error text in red below fields
- Hint text in secondary color
- Info section with gray background and icon
- Green success snackbar

## Accessibility

- Cancel and Save buttons with proper roles and labels
- All inputs have accessibility labels and hints
- Keyboard type matches expected input
- Phone: phone-pad
- Handicap: decimal-pad
- Golf ID: number-pad
