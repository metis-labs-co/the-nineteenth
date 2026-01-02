---
description: Create a TanStack Query hook for data fetching or mutations in React Native (project)
---

Create a data fetching/mutation hook: **{{arg1}}**

## Instructions

1. Read the project's data fetching patterns in `.claude/instructions/data-fetching.md`
2. Check if this hook needs subscription tier checks (`.claude/instructions/subscriptions.md`)

## Requirements

### Location
- Create in `src/hooks/` directory
- Use query key patterns from `src/hooks/queryKeys.ts`

### Technical
- Use TanStack Query (useQuery, useMutation, useInfiniteQuery)
- Implement proper TypeScript types from `@/types`
- Configure appropriate cache settings (staleTime, cacheTime)
- Handle loading, error, and success states
- Implement optimistic updates for mutations
- Support offline-first for scorecard-related hooks (Expo SQLite)
- Use generic API client from `@/services/api/client.ts`

### Hook Types
- **Query**: Data fetching with caching
- **Mutation**: Create/Update/Delete with optimistic updates
- **Infinite Query**: Pagination/infinite scroll

### Cache Settings
- Lists: `staleTime: 5 * 60 * 1000` (5 min)
- Details: `staleTime: 5 * 60 * 1000` (5 min)
- Scorecards: `staleTime: 30 * 1000` (30 sec, more frequent for live scoring)
- Leaderboards: `refetchInterval: 30000` (auto-refresh every 30 sec)

## Additional Context
{{arg2}}

## Output

After creating the hook:
1. Show usage examples in screens/components
2. Document the query key structure
3. Explain cache invalidation strategy
4. Note offline behavior (if applicable)
5. Document optimistic updates (if mutation)

## Verification

Before considering the task complete:
1. Run type check: `pnpm typecheck`
2. Run lint check: `pnpm lint`
3. Fix any errors or warnings that were introduced
