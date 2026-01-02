---
description: Split large hook into smaller focused hooks (project)
---

Split Hook: **{{arg1}}**

## Split Goals
{{arg2}}

## Instructions

1. Read the current hook implementation
2. Identify distinct responsibilities (data fetching, state management, mutations, calculations)
3. Create new focused hooks in a subdirectory
4. Keep the original hook as a thin wrapper that composes the new hooks
5. Ensure backward compatibility

## Standard Hook Splitting Pattern

### File Structure
```
src/hooks/
├── useOriginalHook.ts              # Keep as thin wrapper
└── [hookName]/
    ├── index.ts                    # Re-exports
    ├── useFetchData.ts             # Data fetching
    ├── useStateManagement.ts       # Local state
    ├── useMutations.ts             # Mutations
    └── types.ts                    # Shared types
```

### Common Split Categories

| Responsibility | New Hook Pattern |
|----------------|------------------|
| Session/auth state | `useAuthSession` |
| User profile data | `useAuthUser` |
| Login/logout actions | `useAuthMutations` |
| Subscription status | `useSubscriptionStatus` |
| Tier limit checks | `useSubscriptionLimits` |
| Feature gating | `useFeatureGate` |
| Round metadata | `useRoundMetadata` |
| Player data | `useRoundPlayers` |
| Course data | `useRoundCourse` |
| Team data | `useRoundTeams` |

## Process

1. **Analyze responsibilities** - List what the hook does
2. **Group by concern** - Separate data fetching, state, mutations
3. **Create new hooks** - One per concern
4. **Compose in original** - Original hook calls new hooks
5. **Export both** - Keep original for backward compatibility, export new hooks for granular use
6. **Move types** - Extract shared types to types.ts

## Verification

- [ ] All existing usages still work
- [ ] No TypeScript errors (`pnpm typecheck`)
- [ ] No lint errors (`pnpm lint`)
- [ ] Each new hook has single responsibility
- [ ] Original hook is < 100 lines
