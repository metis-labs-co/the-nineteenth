# Mobile Form Handling with React Hook Form and Zod - The Nineteenth

**Core Philosophy**: Use React Hook Form for form state and validation with Zod schemas for The Nineteenth golf competition app.

## Setup
```bash
cd GolfApp
pnpm add react-hook-form @hookform/resolvers zod
```

## Key Principles

1. **Zod schemas** - Define in `src/schemas/`, will be shared with backend when built
2. **Client validation** - React Hook Form + zodResolver for instant feedback
3. **Server validation** - Always validate in backend (when built)
4. **Keyboard handling** - Proper KeyboardAvoidingView and dismissal
5. **Type safety** - Infer TypeScript types from Zod schemas
6. **Accessibility** - Proper labels and error announcements
7. **NativeBase forms** - Use NativeBase FormControl and Input components

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
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import {
  Box,
  VStack,
  FormControl,
  Input,
  TextArea,
  Button,
  Select,
  CheckIcon,
} from 'native-base';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCompetitionSchema, type CreateCompetitionInput } from '@/schemas/competition';
import { apiClient } from '@/services/api/client';

export default function CreateCompetitionScreen({ navigation }) {
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
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
      // TODO: Replace with actual API
      const response = await apiClient.post('/competitions', data);
      return response.data;
    },
    onSuccess: (competition) => {
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      navigation.navigate('CompetitionDetail', { id: competition.id });
    },
    onError: (error) => {
      console.error('Failed to create competition:', error);
    },
  });

  const onSubmit = handleSubmit((data) => {
    mutation.mutate(data);
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.contentContainer}
      >
        <Box p={4}>
          <VStack space={4}>
            {/* Competition Name */}
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormControl isInvalid={!!errors.name}>
                  <FormControl.Label>Competition Name *</FormControl.Label>
                  <Input
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Enter competition name"
                    accessibilityLabel="Competition name"
                  />
                  {errors.name && (
                    <FormControl.ErrorMessage>
                      {errors.name.message}
                    </FormControl.ErrorMessage>
                  )}
                </FormControl>
              )}
            />

            {/* Description */}
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormControl>
                  <FormControl.Label>Description</FormControl.Label>
                  <TextArea
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Optional description"
                    numberOfLines={4}
                    accessibilityLabel="Competition description"
                  />
                </FormControl>
              )}
            />

            {/* Handicap System */}
            <Controller
              control={control}
              name="handicapSystem"
              render={({ field: { onChange, value } }) => (
                <FormControl isInvalid={!!errors.handicapSystem}>
                  <FormControl.Label>Handicap System *</FormControl.Label>
                  <Select
                    selectedValue={value}
                    onValueChange={onChange}
                    placeholder="Select handicap system"
                    accessibilityLabel="Handicap system"
                    _selectedItem={{
                      endIcon: <CheckIcon size="5" />,
                    }}
                  >
                    <Select.Item label="Honor System" value="honor" />
                    <Select.Item label="Golf Australia" value="golf-australia" />
                    <Select.Item label="Gross Only" value="gross-only" />
                  </Select>
                  {errors.handicapSystem && (
                    <FormControl.ErrorMessage>
                      {errors.handicapSystem.message}
                    </FormControl.ErrorMessage>
                  )}
                </FormControl>
              )}
            />

            {/* Submit Button */}
            <Button
              onPress={onSubmit}
              isLoading={mutation.isPending}
              isDisabled={mutation.isPending}
              mt={4}
            >
              Create Competition
            </Button>
          </VStack>
        </Box>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },
});
```

## Form Input Components

### Custom Input with React Hook Form
```tsx
// src/components/forms/FormInput.tsx
import React, { forwardRef } from 'react';
import { FormControl, Input as NBInput, IInputProps } from 'native-base';

interface FormInputProps extends IInputProps {
  label: string;
  error?: string;
  helperText?: string;
  isRequired?: boolean;
}

export const FormInput = forwardRef<any, FormInputProps>(
  function FormInput({ label, error, helperText, isRequired, ...props }, ref) {
    return (
      <FormControl isInvalid={!!error} isRequired={isRequired} mb={4}>
        <FormControl.Label>{label}</FormControl.Label>
        <NBInput
          ref={ref}
          variant="outline"
          accessibilityLabel={label}
          {...props}
        />
        {error && (
          <FormControl.ErrorMessage>{error}</FormControl.ErrorMessage>
        )}
        {helperText && !error && (
          <FormControl.HelperText>{helperText}</FormControl.HelperText>
        )}
      </FormControl>
    );
  }
);
```

### Select/Picker Component
```tsx
// src/components/forms/FormSelect.tsx
import React from 'react';
import { Controller } from 'react-hook-form';
import { FormControl, Select, CheckIcon } from 'native-base';

interface Option {
  label: string;
  value: string;
}

interface FormSelectProps {
  control: any;
  name: string;
  label: string;
  options: Option[];
  error?: string;
  placeholder?: string;
  isRequired?: boolean;
}

export function FormSelect({
  control,
  name,
  label,
  options,
  error,
  placeholder,
  isRequired,
}: FormSelectProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <FormControl isInvalid={!!error} isRequired={isRequired} mb={4}>
          <FormControl.Label>{label}</FormControl.Label>
          <Select
            selectedValue={value}
            onValueChange={onChange}
            placeholder={placeholder || `Select ${label}`}
            accessibilityLabel={label}
            _selectedItem={{
              endIcon: <CheckIcon size="5" />,
            }}
          >
            {options.map((option) => (
              <Select.Item
                key={option.value}
                label={option.label}
                value={option.value}
              />
            ))}
          </Select>
          {error && (
            <FormControl.ErrorMessage>{error}</FormControl.ErrorMessage>
          )}
        </FormControl>
      )}
    />
  );
}
```

### Checkbox Component
```tsx
// src/components/forms/FormCheckbox.tsx
import React from 'react';
import { Controller } from 'react-hook-form';
import { Checkbox, FormControl, HStack } from 'native-base';

interface FormCheckboxProps {
  control: any;
  name: string;
  label: string;
  error?: string;
}

export function FormCheckbox({ control, name, label, error }: FormCheckboxProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <FormControl isInvalid={!!error} mb={4}>
          <HStack space={2} alignItems="center">
            <Checkbox
              value={name}
              isChecked={value}
              onChange={onChange}
              accessibilityLabel={label}
            >
              {label}
            </Checkbox>
          </HStack>
          {error && (
            <FormControl.ErrorMessage>{error}</FormControl.ErrorMessage>
          )}
        </FormControl>
      )}
    />
  );
}
```

### Date Picker Component (React Native)
```tsx
// src/components/forms/FormDatePicker.tsx
import React, { useState } from 'react';
import { Controller } from 'react-hook-form';
import { Platform } from 'react-native';
import { FormControl, Button, Text, HStack } from 'native-base';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

interface FormDatePickerProps {
  control: any;
  name: string;
  label: string;
  error?: string;
  isRequired?: boolean;
}

export function FormDatePicker({
  control,
  name,
  label,
  error,
  isRequired,
}: FormDatePickerProps) {
  const [show, setShow] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <FormControl isInvalid={!!error} isRequired={isRequired} mb={4}>
          <FormControl.Label>{label}</FormControl.Label>
          <Button
            variant="outline"
            onPress={() => setShow(true)}
            justifyContent="flex-start"
          >
            <Text>
              {value ? format(new Date(value), 'dd/MM/yyyy') : `Select ${label}`}
            </Text>
          </Button>
          {show && (
            <DateTimePicker
              value={value || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShow(Platform.OS === 'ios');
                if (selectedDate) {
                  onChange(selectedDate);
                }
              }}
            />
          )}
          {error && (
            <FormControl.ErrorMessage>{error}</FormControl.ErrorMessage>
          )}
        </FormControl>
      )}
    />
  );
}
```

## Keyboard Handling

### KeyboardAvoidingView Setup
```tsx
import { KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';

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

### Custom Validation
```tsx
const schema = z.object({
  email: z.string().email().refine(
    async (email) => {
      // Check if email is unique (when backend is ready)
      const exists = await checkEmailExists(email);
      return !exists;
    },
    { message: 'Email already registered' }
  ),
});
```

## Error Handling

### Display Server Errors
```tsx
const mutation = useMutation({
  mutationFn: submitData,
  onError: (error: any) => {
    if (error.response?.data?.fieldErrors) {
      // Set field errors from server
      Object.entries(error.response.data.fieldErrors).forEach(([field, message]) => {
        setError(field as any, { message: message as string });
      });
    }
  },
});
```

### Error Summary
```tsx
import { Box, VStack, Text } from 'native-base';

{Object.keys(errors).length > 0 && (
  <Box bg="red.50" p={4} borderRadius="md" mb={4}>
    <Text fontSize="md" fontWeight="600" mb={2}>
      Please fix the following errors:
    </Text>
    <VStack space={1}>
      {Object.entries(errors).map(([field, error]) => (
        <Text key={field} fontSize="sm" color="red.600">
          • {error.message}
        </Text>
      ))}
    </VStack>
  </Box>
)}
```

## Complete Form Example - Add Player

```tsx
// src/screens/admin/AddPlayerScreen.tsx
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Box, VStack, Button } from 'native-base';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPlayerSchema, type CreatePlayerInput } from '@/schemas/player';
import { FormInput } from '@/components/forms/FormInput';
import { apiClient } from '@/services/api/client';

export default function AddPlayerScreen({ route, navigation }) {
  const { competitionId } = route.params;
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePlayerInput>({
    resolver: zodResolver(createPlayerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      handicap: 0,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: CreatePlayerInput) => {
      // TODO: Replace with actual API
      const response = await apiClient.post(`/competitions/${competitionId}/players`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players', competitionId] });
      navigation.goBack();
    },
  });

  const onSubmit = handleSubmit((data) => {
    mutation.mutate(data);
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <Box p={4}>
          <VStack space={4}>
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
                  isRequired
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormInput
                  label="Email"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  isRequired
                />
              )}
            />

            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormInput
                  label="Phone"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.phone?.message}
                  keyboardType="phone-pad"
                />
              )}
            />

            <Controller
              control={control}
              name="handicap"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormInput
                  label="Handicap"
                  value={value?.toString() || ''}
                  onChangeText={(text) => onChange(parseInt(text) || 0)}
                  onBlur={onBlur}
                  error={errors.handicap?.message}
                  keyboardType="number-pad"
                  helperText="Official handicap or honor system handicap"
                />
              )}
            />

            <Button
              onPress={onSubmit}
              isLoading={mutation.isPending}
              isDisabled={mutation.isPending}
              mt={4}
            >
              Add Player
            </Button>
          </VStack>
        </Box>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

## Best Practices

1. **Share Zod schemas** - Define in `src/schemas/` (will be shared with backend later)
2. **KeyboardAvoidingView** - Handle keyboard properly on iOS/Android
3. **ScrollView + keyboardShouldPersistTaps** - Allow taps while keyboard is up
4. **Dismiss keyboard on submit** - Better UX
5. **Show inline errors** - Below each input field using FormControl.ErrorMessage
6. **Disable submit while pending** - Prevent duplicate submissions
7. **Accessibility labels** - On all form inputs
8. **Auto-focus first input** - Better UX (use autoFocus prop)
9. **Validate on blur** - Instant feedback
10. **Loading states** - Show progress in submit button with isLoading
11. **Success feedback** - Navigate away or show confirmation
12. **Error retry** - Allow user to retry on error
13. **Use NativeBase FormControl** - Consistent form styling
14. **Date format** - Use DD/MM/YYYY for Australian users

## Golf-Specific Form Patterns

### Handicap Input with Helper
```tsx
<FormInput
  label="Handicap"
  helperText="Enter your official Golf Australia handicap or honor system handicap (0-54)"
  keyboardType="number-pad"
  // ... other props
/>
```

### Game Type Selection
```tsx
<FormSelect
  control={control}
  name="gameType"
  label="Game Type"
  options={[
    { label: 'Stroke Play', value: 'stroke' },
    { label: 'Stableford', value: 'stableford' },
    { label: 'Match Play', value: 'match-play' },
    { label: 'Ambrose', value: 'ambrose' },
    { label: 'Best Ball', value: 'best-ball' },
  ]}
/>
```

### Australian State Selection
```tsx
<FormSelect
  control={control}
  name="state"
  label="State"
  options={[
    { label: 'New South Wales', value: 'NSW' },
    { label: 'Victoria', value: 'VIC' },
    { label: 'Queensland', value: 'QLD' },
    { label: 'South Australia', value: 'SA' },
    { label: 'Western Australia', value: 'WA' },
    { label: 'Tasmania', value: 'TAS' },
    { label: 'Northern Territory', value: 'NT' },
    { label: 'Australian Capital Territory', value: 'ACT' },
  ]}
/>
```
