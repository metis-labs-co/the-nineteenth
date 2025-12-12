---
description: Create a new React Native screen with React Navigation (project)
---

Create a new React Native screen: **{{arg1}}**

## Instructions

1. Read the project's screen patterns in `.claude/instructions/screens.md`
2. Read the styling guide in `.claude/instructions/styling.md`
3. Check if this screen needs subscription tier gating (`.claude/instructions/subscriptions.md`)
4. Check for golf-specific requirements (`.claude/instructions/golf-guidelines.md`)

## Requirements

### Location
Organize by user role:
- `src/screens/player/` - Player-facing screens
- `src/screens/admin/` - Organizer/admin screens
- `src/screens/auth/` - Authentication screens

### Technical
- Use TypeScript with proper navigation types from `@/navigation/types.ts`
- Use `useThemeColors()` hook for all colors
- Use TanStack Query for data fetching
- Use Zustand for local state if needed
- Include proper loading, error, and empty states
- Add pull-to-refresh on list screens
- Use KeyboardAvoidingView for form screens
- Apply safe area insets via useSafeAreaInsets

### Patterns
- Loading: `<ActivityIndicator color={colors.primary} />`
- Error: Show message with retry button
- Empty: Helpful message with action button
- List: Use FlatList or FlashList with pull-to-refresh

## Additional Context
{{arg2}}

## Output

After creating the screen:
1. Show navigation setup (add to types, add to navigator)
2. Provide usage example for navigating to the screen
3. List any new hooks or components created
4. Note accessibility and platform considerations
