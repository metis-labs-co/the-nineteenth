---
description: Create a new React Native screen with React Navigation (project)
---

Create a new React Native screen: **{{arg1}}**

## Instructions

1. Read the project's screen patterns in `.claude/instructions/screens.md`
2. Read the styling guide in `.claude/instructions/styling.md`
3. **Review the common components catalog** in `.claude/instructions/common-components-catalog.md`
4. Check if this screen needs subscription tier gating (`.claude/instructions/subscriptions.md`)
5. Check for golf-specific requirements (`.claude/instructions/golf-guidelines.md`)

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
- **Use existing common components** from `@/components/common` (see catalog)
- Include proper loading, error, and empty states
- Add pull-to-refresh on list screens
- Use KeyboardAvoidingView for form screens
- Apply safe area insets via useSafeAreaInsets

### Common Components (MUST USE)
- Loading: `<LoadingSpinner />` from `@/components/common`
- Error: `<ErrorState />` from `@/components/common`
- Empty: `<EmptyState />` from `@/components/common`
- Forms: `<FormInput />`, `<FormSection />` from `@/components/common`
- Search: `<SearchBar />` from `@/components/common`
- Modals: `<BottomSheet />`, `<ConfirmationDialog />` from `@/components/common`
- List: Use FlatList or FlashList with pull-to-refresh

## Additional Context
{{arg2}}

## Output

After creating the screen:
1. Show navigation setup (add to types, add to navigator)
2. Provide usage example for navigating to the screen
3. List any new hooks or components created
4. Note accessibility and platform considerations

## Verification

Before considering the task complete:
1. Run type check: `pnpm typecheck`
2. Run lint check: `pnpm lint`
3. Fix any errors or warnings that were introduced
