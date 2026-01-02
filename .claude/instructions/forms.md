# Mobile Form Handling with React Hook Form and Zod - The Nineteenth

**Core Philosophy**: Use React Hook Form for form state and validation with Zod schemas for The Nineteenth golf competition app.

## Key Principles

1. **Zod schemas** - Define in `src/schemas/`, shared with backend validation
2. **Client validation** - React Hook Form + zodResolver for instant feedback
3. **Server validation** - Always validate in backend
4. **Keyboard handling** - Proper KeyboardAvoidingView and dismissal
5. **Type safety** - Infer TypeScript types from Zod schemas
6. **Accessibility** - Proper labels and error announcements
7. **Theming** - Use `useThemeColors()` hook for all colors
8. **Styling** - Use StyleSheet.create() with design tokens from `@/constants/theme`

## Complete Form Pattern

### 1. Define Zod Schema
```typescript
// src/schemas/competition.ts
import { z } from 'zod';

export const createCompetitionSchema = z.object({
  name: z.string().min(1, 'Competition name is required'),
  description: z.string().optional(),
  startDate: z.date(),
  endDate: z.date().optional(),
  handicapSystem: z.enum(['honor', 'golf-australia', 'gross-only'], {
    errorMap: () => ({ message: 'Please select a handicap system' }),
  }),
  visibility: z.enum(['private', 'public', 'unlisted']).default('private'),
});

export type CreateCompetitionInput = z.infer<typeof createCompetitionSchema>;
```

### 2. Mobile Form Screen
```tsx
// src/screens/admin/CreateCompetitionScreen.tsx
import React from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput, ActivityIndicator } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCompetitionSchema, type CreateCompetitionInput } from '@/schemas/competition';
import { FormSection } from '@/components/common';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateCompetition'>;

export default function CreateCompetitionScreen({ navigation }: Props) {
  const colors = useThemeColors();
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCompetitionInput>({
    resolver: zodResolver(createCompetitionSchema),
    defaultValues: {
      name: '',
      description: '',
      handicapSystem: 'honor',
      visibility: 'private',
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: CreateCompetitionInput) => {
      // API call
      const response = await apiClient.post('/competitions', data);
      return response.data;
    },
    onSuccess: (competition) => {
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      navigation.navigate('CompetitionDetail', { id: competition.id });
    },
  });

  const onSubmit = handleSubmit((data) => {
    mutation.mutate(data);
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.form}>
          {/* Competition Name */}
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>
                  Competition Name *
                </Text>
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Enter competition name"
                  mode="outlined"
                  error={!!errors.name}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  textColor={colors.textPrimary}
                  accessibilityLabel="Competition name"
                />
                {errors.name && (
                  <Text style={[styles.error, { color: colors.error }]}>
                    {errors.name.message}
                  </Text>
                )}
              </View>
            )}
          />

          {/* Description */}
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>
                  Description
                </Text>
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Optional description"
                  mode="outlined"
                  multiline
                  numberOfLines={4}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  textColor={colors.textPrimary}
                  accessibilityLabel="Competition description"
                />
              </View>
            )}
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: mutation.isPending ? colors.surfaceDisabled : colors.primary },
            ]}
            onPress={onSubmit}
            disabled={mutation.isPending}
            accessibilityLabel="Create competition"
            accessibilityRole="button"
          >
            {mutation.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.white }]}>
                Create Competition
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  form: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    ...typography.bodyBold,
  },
  error: {
    ...typography.small,
  },
  button: {
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonText: {
    ...typography.bodyBold,
  },
});
```

## Using Existing Common Components

### FormInput Component
Use the existing `FormInput` from `@/components/common`:

```tsx
import { FormInput, FormSection } from '@/components/common';

<FormSection title="Player Details" required>
  <Controller
    control={control}
    name="name"
    render={({ field: { onChange, onBlur, value } }) => (
      <FormInput
        label="Player Name"
        value={value}
        onChangeText={onChange}
        onBlur={onBlur}
        error={errors.name?.message}
        required
      />
    )}
  />
</FormSection>
```

### Date Picker
Use the existing `DatePicker` from `@/components/common`:

```tsx
import { DatePicker } from '@/components/common';
import { Controller } from 'react-hook-form';

<Controller
  control={control}
  name="startDate"
  render={({ field: { onChange, value } }) => (
    <DatePicker
      label="Start Date"
      value={value}
      onChange={onChange}
      mode="date"
      error={errors.startDate?.message}
    />
  )}
/>
```

## Keyboard Handling

### KeyboardAvoidingView Setup
```tsx
import { KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, ScrollView } from 'react-native';

export function FormScreen() {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          {/* Form content */}
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
```

### Dismiss Keyboard on Submit
```tsx
import { Keyboard } from 'react-native';

const onSubmit = handleSubmit((data) => {
  Keyboard.dismiss();
  mutation.mutate(data);
});
```

## Validation Patterns

### Golf-Specific Validation
```tsx
// src/schemas/player.ts
import { z } from 'zod';

export const createPlayerSchema = z.object({
  name: z.string().min(1, 'Player name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  handicap: z.number()
    .min(0, 'Handicap must be 0 or greater')
    .max(54, 'Handicap cannot exceed 54')
    .optional(),
});

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>;
```

### Scorecard Validation
```tsx
// src/schemas/scorecard.ts
import { z } from 'zod';

export const holeScoreSchema = z.object({
  strokes: z.number().min(1, 'Must score at least 1').max(20, 'Score too high'),
  putts: z.number().min(0).max(10).optional(),
  fairwayHit: z.boolean().optional(),
  greenInRegulation: z.boolean().optional(),
  penalties: z.number().min(0).optional(),
});

export const updateScorecardSchema = z.object({
  scores: z.record(z.string(), holeScoreSchema),
  status: z.enum(['not-started', 'in-progress', 'completed', 'confirmed']).optional(),
});

export type HoleScoreInput = z.infer<typeof holeScoreSchema>;
export type UpdateScorecardInput = z.infer<typeof updateScorecardSchema>;
```

### Dependent Fields
```tsx
const schema = z
  .object({
    hasHandicap: z.boolean(),
    handicap: z.number().optional(),
  })
  .refine(
    (data) => {
      if (data.hasHandicap) {
        return data.handicap !== undefined && data.handicap >= 0;
      }
      return true;
    },
    {
      message: 'Handicap is required when player has handicap',
      path: ['handicap'],
    }
  );
```

## Error Handling

### Display Server Errors
```tsx
const mutation = useMutation({
  mutationFn: submitData,
  onError: (error: any) => {
    if (error.response?.data?.fieldErrors) {
      Object.entries(error.response.data.fieldErrors).forEach(([field, message]) => {
        setError(field as any, { message: message as string });
      });
    }
  },
});
```

### Error Summary
```tsx
{Object.keys(errors).length > 0 && (
  <View style={[styles.errorBox, { backgroundColor: colors.errorLight }]}>
    <Text style={[styles.errorTitle, { color: colors.error }]}>
      Please fix the following errors:
    </Text>
    {Object.entries(errors).map(([field, error]) => (
      <Text key={field} style={[styles.errorItem, { color: colors.error }]}>
        • {error.message}
      </Text>
    ))}
  </View>
)}
```

## Best Practices

1. **Share Zod schemas** - Define in `src/schemas/` (shared with backend)
2. **KeyboardAvoidingView** - Handle keyboard properly on iOS/Android
3. **ScrollView + keyboardShouldPersistTaps** - Allow taps while keyboard is up
4. **Dismiss keyboard on submit** - Better UX
5. **Show inline errors** - Below each input field
6. **Disable submit while pending** - Prevent duplicate submissions
7. **Accessibility labels** - On all form inputs
8. **Auto-focus first input** - Better UX (use autoFocus prop)
9. **Validate on blur** - Instant feedback
10. **Loading states** - Show ActivityIndicator in submit button
11. **Use `useThemeColors()`** - For all dynamic colors
12. **Use TouchableOpacity** - NOT Paper's Button component
13. **Use existing components** - FormInput, FormSection, DatePicker from `@/components/common`
14. **Date format** - Use DD/MM/YYYY for Australian users

## Golf-Specific Form Patterns

### Handicap Input with Helper
```tsx
<FormInput
  label="Handicap"
  helperText="Enter your official Golf Australia handicap or honor system handicap (0-54)"
  keyboardType="number-pad"
/>
```

### Game Type Selection
```tsx
import { SegmentedButton } from '@/components/common';

<Controller
  control={control}
  name="gameType"
  render={({ field: { onChange, value } }) => (
    <SegmentedButton
      value={value}
      onValueChange={onChange}
      buttons={[
        { value: 'stableford', label: 'Stableford' },
        { value: 'stroke', label: 'Stroke' },
        { value: 'match-play', label: 'Match Play' },
      ]}
    />
  )}
/>
```

### Australian State Selection
```tsx
const AUSTRALIAN_STATES = [
  { label: 'New South Wales', value: 'NSW' },
  { label: 'Victoria', value: 'VIC' },
  { label: 'Queensland', value: 'QLD' },
  { label: 'South Australia', value: 'SA' },
  { label: 'Western Australia', value: 'WA' },
  { label: 'Tasmania', value: 'TAS' },
  { label: 'Northern Territory', value: 'NT' },
  { label: 'Australian Capital Territory', value: 'ACT' },
];
```
