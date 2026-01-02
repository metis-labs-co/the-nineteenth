---
description: Replace custom code with existing common components (project)
---

Consolidate: **{{arg1}}**

## Target Custom Code
{{arg2}}

## Instructions

1. Read the target file and identify custom implementation
2. Check available common components in `src/components/common/`
3. Read `.claude/instructions/common-components-catalog.md` for component reference
4. Find the matching common component to replace custom code
5. Update imports and replace custom implementation
6. Delete unused custom code
7. Ensure no functionality breaks

## Common Replacements

| Custom Pattern | Common Component |
|----------------|------------------|
| Custom empty state | `EmptyState` |
| Custom error display | `ErrorState` |
| Custom loading spinner | `LoadingSpinner` or `GolfBallLoader` |
| Custom collapsible/accordion | `ExpandableItem` or `ExpandableList` |
| Custom search input | `SearchBar` |
| Custom tabs | `Tabs` |
| Custom form fields | `FormInput`, `FormSection` |
| Custom date/time fields | `DatePicker`, `DateTimeFieldGroup` |
| Custom status labels | `Pill`, `StatusBadge` |
| Custom confirmation modal | `ConfirmationDialog` |

## Process

1. **Identify custom code** - Find the custom implementation to replace
2. **Find common component** - Check catalog for matching component
3. **Map props** - Match custom props to common component props
4. **Replace** - Swap implementation, update imports
5. **Test** - Verify functionality preserved
6. **Cleanup** - Remove unused custom code and styles

## Verification

- [ ] No TypeScript errors (`pnpm typecheck`)
- [ ] No lint errors (`pnpm lint`)
- [ ] Same visual appearance
- [ ] Same functionality
- [ ] Code is simpler and more maintainable
