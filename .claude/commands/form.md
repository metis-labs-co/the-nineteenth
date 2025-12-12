---
description: Create a mobile form screen with validation using React Hook Form and Zod (project)
---

Create a mobile form: **{{arg1}}**

## Instructions

1. Read the project's form patterns in `.claude/instructions/forms.md`
2. Read the styling guide in `.claude/instructions/styling.md`
3. Check if this form needs subscription tier validation (`.claude/instructions/subscriptions.md`)
4. Check for golf-specific requirements (`.claude/instructions/golf-guidelines.md`)

## Requirements

### File Structure
```
src/screens/{{folder}}/{{FormName}}Screen.tsx     # Form screen
src/schemas/{{entity}}.ts                          # Zod validation schema
src/hooks/use{{Action}}{{Entity}}.ts               # TanStack Query mutation hook
```

### Technical
- Use React Hook Form with zodResolver
- Define Zod schema in `src/schemas/`
- Use `useThemeColors()` hook for all colors
- Use KeyboardAvoidingView with platform-specific behavior
- Use ScrollView with `keyboardShouldPersistTaps="handled"`
- Handle loading states with ActivityIndicator
- Show validation errors inline
- Dismiss keyboard on submit
- Add accessibility labels on all inputs

### Patterns
- Text Input: React Native Paper TextInput with `mode="outlined"`
- Error: Display below input with error color
- Submit: TouchableOpacity with loading state
- Success: Navigate away or show confirmation
- Error: Display with Alert or toast

## Additional Context
{{arg2}}

## Output

After creating the form:
1. Show usage examples and navigation setup
2. Document the validation schema
3. Explain mutation hook integration
4. Provide testing instructions for validation rules
