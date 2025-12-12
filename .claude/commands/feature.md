---
description: Build a complete mobile feature with database, API hooks, screens, and components (project)
---

Build a complete feature: **{{arg1}}**

## Instructions

1. Read all relevant instruction files:
   - `.claude/instructions/components.md` - Component patterns
   - `.claude/instructions/screens.md` - Screen patterns
   - `.claude/instructions/forms.md` - Form patterns
   - `.claude/instructions/data-fetching.md` - API/hooks patterns
   - `.claude/instructions/styling.md` - Styling patterns
   - `.claude/instructions/subscriptions.md` - Tier restrictions
   - `.claude/instructions/golf-guidelines.md` - Golf-specific conventions

## Implementation Flow

### 1. Type Definition
```
src/types/index.ts              # Add/update TypeScript types
src/schemas/{{entity}}.ts       # Add Zod validation schemas
```

### 2. Local State (if needed)
```
src/store/{{entity}}Store.ts    # Zustand store for local state
```

### 3. API Hooks
```
src/hooks/use{{Entity}}.ts            # useQuery hook
src/hooks/use{{EntityPlural}}.ts      # useInfiniteQuery hook
src/hooks/useCreate{{Entity}}.ts      # useMutation hook
src/hooks/useUpdate{{Entity}}.ts      # useMutation with optimistic updates
src/hooks/useDelete{{Entity}}.ts      # useMutation hook
```

### 4. Screens
```
src/screens/{{folder}}/{{Feature}}Screen.tsx        # Main screen
src/screens/{{folder}}/{{Feature}}DetailScreen.tsx  # Detail screen
```

### 5. Components
```
src/components/{{entity}}/{{Entity}}Card.tsx        # List item component
src/components/{{entity}}/{{Entity}}Form.tsx        # Form component
```

### 6. Offline Support (if required)
```
src/services/offline/database.ts    # SQLite helper functions
src/services/offline/sync.ts        # Background sync logic
```

### 7. Navigation
```
src/navigation/types.ts             # Add navigation types
src/navigation/RootNavigator.tsx    # Add screens to navigator
```

## Checklist

### Design & UI
- [ ] Uses `useThemeColors()` hook for all colors
- [ ] Colors applied inline (not in StyleSheet)
- [ ] Static design tokens from `@/constants/theme.ts`
- [ ] Loading, error, and empty states implemented
- [ ] Touch targets minimum 44dp
- [ ] Accessibility labels and roles
- [ ] Works on iOS and Android with dark mode support

### Technical
- [ ] TypeScript types defined in `@/types`
- [ ] Zod schemas in `src/schemas/`
- [ ] TanStack Query hooks in `src/hooks/`
- [ ] Zustand store (if needed) in `src/store/`
- [ ] Optimistic updates for mutations
- [ ] Navigation types added
- [ ] Offline support (if scorecard-related)

### Subscription Tiers
- [ ] Check if feature needs tier gating
- [ ] Add tier checks to creation screens
- [ ] Use FeatureLock for restricted sections
- [ ] Handle permission errors gracefully

## Additional Context
{{arg2}}

## Output

After implementing:
1. Summary of what was built
2. File structure created
3. Navigation setup required
4. Testing instructions
5. Known limitations or TODOs
