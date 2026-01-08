---
description: Create a reusable React Native component with TypeScript and React Native Paper (project)
---

Create a new React Native component: **{{arg1}}**

## Instructions

1. **Check existing components first**: Review `.claude/instructions/common-components-catalog.md` to avoid duplicating existing components
2. Read the project's component patterns in `.claude/instructions/components.md`
3. Read the styling guide in `.claude/instructions/styling.md`
4. Check if this component needs subscription tier gating (`.claude/instructions/subscriptions.md`)
5. Check for golf-specific requirements (`.claude/instructions/golf-guidelines.md`)

## Requirements

### Location
- Create in `src/components/{{arg1}}.tsx` (single file)
- Or in a subdirectory for related components: `src/components/[group]/{{arg1}}.tsx`

### Technical
- Use TypeScript with proper interface for props (include JSDoc)
- Use `useThemeColors()` hook for all colors
- Use static design tokens from `@/constants/theme.ts`
- Apply colors inline, static styles in StyleSheet.create
- Minimum 44dp touch targets for interactive elements
- Include proper accessibility (accessibilityLabel, accessibilityRole)
- Handle loading, error, and empty states where appropriate
- Use React.memo for components that re-render frequently
- Export component directly (no barrel file needed)

### Patterns
- Use React Native Paper for basic components (Text, ActivityIndicator, Icon)
- Use TouchableOpacity for touch handling (not Pressable)
- Use forwardRef for form components

## Additional Context
{{arg2}}

## Output

After creating the component:
1. Show usage examples with common props
2. Provide the import path
3. List related components that pair well with it
4. Note any accessibility or platform-specific considerations

## Catalog & Export Requirements

**If the component is in `src/components/common/`:**
1. **Add to barrel export**: Export the component from `src/components/common/index.ts`
2. **Update the catalog**: Add the component to `.claude/instructions/common-components-catalog.md` with:
   - Component name
   - Use case description
   - Key props

**Skip catalog update** for domain-specific components (e.g., `src/components/competition/`, `src/components/scorecard/`).

## Verification

Before considering the task complete:
1. Run type check: `pnpm typecheck`
2. Run lint check: `pnpm lint`
3. Fix any errors or warnings that were introduced
4. **Verify catalog update** (if common component): Confirm the component is in `.claude/instructions/common-components-catalog.md`
