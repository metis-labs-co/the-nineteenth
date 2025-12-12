---
description: Refactor code to improve structure, performance, or maintainability
---

Refactor: **{{arg1}}**

## Refactoring Goals
{{arg2}}

## Instructions

1. Read and understand the current implementation
2. Check project patterns:
   - `.claude/instructions/components.md` for component patterns
   - `.claude/instructions/screens.md` for screen patterns
   - `.claude/instructions/styling.md` for styling patterns
   - `.claude/instructions/subscriptions.md` if adding tier enforcement
   - `.claude/instructions/golf-guidelines.md` for golf-specific conventions

## Review Checklist

### Code Quality
- [ ] Remove duplication (DRY)
- [ ] Improve naming clarity
- [ ] Add missing TypeScript types
- [ ] Add error handling where needed
- [ ] Simplify complex logic

### Component Refactoring
- [ ] Extract repeated patterns into reusable components
- [ ] Improve prop interfaces
- [ ] Optimize re-renders (React.memo, useCallback, useMemo)
- [ ] Improve accessibility
- [ ] Ensure proper touch targets (44dp minimum)

### Database Refactoring
- [ ] Optimize queries with better indexes
- [ ] Simplify complex joins
- [ ] Add database functions for complex logic
- [ ] Improve RLS policy efficiency

## Process

1. **Document current behavior** - understand what the code does
2. **Make changes incrementally** - small, testable changes
3. **Test after each change** - ensure nothing breaks
4. **Ensure no functionality breaks** - same behavior, better code
5. **Update documentation if needed**

## Safety Checks

Before completing:
- [ ] All existing tests still pass
- [ ] No new TypeScript errors
- [ ] Performance is same or better
- [ ] Functionality unchanged
- [ ] Code is more maintainable

## Output

After refactoring:
1. Explain the improvements made
2. List any patterns that were applied
3. Note any potential follow-up refactoring opportunities
