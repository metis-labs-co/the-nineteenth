---
description: Create a layout component for React Native mobile app (Header, Navigation, etc.)
---

Create a layout component: **{{arg1}}**

## Instructions

1. Read the project's component patterns in `.claude/instructions/components.md`
2. Read the styling guide in `.claude/instructions/styling.md`

## Requirements

### File Structure
```
src/components/layout/{{arg1}}/
├── {{arg1}}.tsx          # Component implementation
├── {{arg1}}.styles.ts    # StyleSheet styles (optional, for complex layouts)
└── index.ts              # Export
```

### Technical
- Use `useThemeColors()` hook for all colors
- Use StyleSheet.create() for static styles
- Use design tokens from `@/constants/theme.ts`
- Use `useSafeAreaInsets()` for proper spacing
- Handle platform differences (iOS/Android)
- Optimize with React.memo and useCallback
- Export from barrel file

### Layout Patterns
- **Safe Areas**: Use useSafeAreaInsets for notch/gesture navigation
- **Elevation**: Use Platform.select for iOS shadows / Android elevation
- **Sticky**: Use position 'absolute' for fixed headers/footers
- **Keyboard**: Handle keyboard appearance (if applicable)

### Common Layout Types
- **Header**: Title, back button, right actions
- **Bottom Nav**: Tab items with icons, badges
- **Footer**: Fixed bottom with action buttons
- **App Layout**: Wrapper with header/footer/content

## Additional Context
{{arg2}}

## Output

After creating the component:
1. Show usage examples
2. Demonstrate integration with other layouts
3. Show safe area handling
4. Show variant examples (if applicable)
