---
description: Create an optimized list screen with FlatList or FlashList for React Native (project)
---

Create an optimized list screen: **{{arg1}}**

## Instructions

1. Read the project's screen patterns in `.claude/instructions/screens.md`
2. Read the styling guide in `.claude/instructions/styling.md`
3. Read data fetching patterns in `.claude/instructions/data-fetching.md`
4. Check for golf-specific requirements (`.claude/instructions/golf-guidelines.md`)

## Requirements

### File Structure
```
src/screens/{{folder}}/{{ListName}}Screen.tsx              # List screen
src/components/{{entity}}/{{ItemName}}Card.tsx             # List item component
src/hooks/useInfinite{{EntityPlural}}.ts                   # Infinite query hook
```

### Technical
- Use FlashList for better performance (or FlatList if unavailable)
- Use TanStack Query's useInfiniteQuery for pagination
- Implement pull-to-refresh with RefreshControl
- Add empty state component
- Add loading states (spinner or skeleton)
- Memoize item component with React.memo
- Use useCallback for handlers
- Set estimatedItemSize for FlashList

### Patterns
- Data: useInfiniteQuery with `fetchNextPage` on scroll
- Empty: EmptyState component with action button
- Loading: Spinner for initial, footer spinner for pagination
- Error: Error state with retry button
- Item: Memoized component with stable key extraction

### Performance
- Memoize list items with React.memo
- Use useCallback for onPress handlers
- Avoid inline functions in renderItem
- Set estimatedItemSize for FlashList
- Use stable keys (item.id)

## Additional Context
{{arg2}}

## Output

After creating the list:
1. Show usage examples and navigation setup
2. Document the item component
3. Explain the pagination strategy
4. Describe search/filter implementation (if applicable)
