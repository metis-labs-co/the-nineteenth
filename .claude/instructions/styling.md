# React Native Styling with React Native Paper - The Nineteenth

You are an expert in styling React Native applications using React Native Paper and React Native's StyleSheet API for The Nineteenth golf competition app.

## Core Principles
- Use React Native StyleSheet API for component styles
- Use React Native Paper for pre-built components (Text, Icon, ActivityIndicator, TextInput)
- Apply design tokens from `src/constants/theme.ts`
- **Use `useThemeColors()` hook for dynamic colors** (REQUIRED for dark mode support)
- Follow responsive design principles
- Handle platform-specific styling (iOS/Android)

## REQUIRED Component Pattern

Every component that uses colors MUST follow this pattern:

```tsx
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';

export function MyComponent() {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Title</Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handlePress}
      >
        <Icon source="icon-name" size={20} color={colors.white} />
        <Text style={{ ...typography.bodyBold, color: colors.white }}>Button</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    height: 48,
    gap: spacing.sm,
    ...shadows.sm,
  },
});
```

**Key Points:**
- Import `useThemeColors` from `@/context/ThemeContext`
- Call `const colors = useThemeColors()` inside the component
- Apply colors inline with dynamic styles: `{ backgroundColor: colors.surface }`
- Static layout styles go in `StyleSheet.create()`
- DO NOT import colors directly from theme - always use the hook

## Design Tokens

### Theme Configuration
```tsx
// src/constants/theme.ts

// Static tokens - import directly
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  small: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
};

// Dynamic colors - accessed via useThemeColors() hook
export const lightColors = {
  // Primary
  primary: '#3b82f6',
  primaryDark: '#2563eb',
  primaryLight: '#dbeafe',

  // Backgrounds
  background: '#f9fafb',
  surface: '#ffffff',
  surfaceVariant: '#f3f4f6',
  surfaceDisabled: '#e5e7eb',

  // Text
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textDisabled: '#9ca3af',
  white: '#ffffff',

  // Borders
  border: '#e5e7eb',

  // Semantic
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Golf-specific
  birdie: '#22c55e',
  par: '#3b82f6',
  bogey: '#f59e0b',
  doubleBogey: '#ef4444',
};

export const darkColors = {
  // Primary
  primary: '#60a5fa',
  primaryDark: '#3b82f6',
  primaryLight: '#1e3a5f',

  // Backgrounds
  background: '#111827',
  surface: '#1f2937',
  surfaceVariant: '#374151',
  surfaceDisabled: '#4b5563',

  // Text
  textPrimary: '#f9fafb',
  textSecondary: '#9ca3af',
  textDisabled: '#6b7280',
  white: '#ffffff',

  // Borders
  border: '#374151',

  // Semantic
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#60a5fa',

  // Golf-specific
  birdie: '#22c55e',
  par: '#60a5fa',
  bogey: '#f59e0b',
  doubleBogey: '#ef4444',
};
```

### Using Design Tokens
```tsx
import { StyleSheet } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';

export function StyledCard() {
  const colors = useThemeColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Title</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>Description</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    ...shadows.md,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
  },
});
```

## Key Color Properties

Access these via `const colors = useThemeColors()`:

| Property | Usage |
|----------|-------|
| `colors.background` | Screen backgrounds |
| `colors.surface` | Card/container backgrounds |
| `colors.surfaceVariant` | Secondary surfaces, input backgrounds |
| `colors.textPrimary` | Main text color |
| `colors.textSecondary` | Secondary text, labels |
| `colors.textDisabled` | Disabled text |
| `colors.primary` | Primary actions, links |
| `colors.primaryLight` | Highlighted backgrounds |
| `colors.border` | Border colors |
| `colors.error` | Error states |
| `colors.success` | Success states |
| `colors.warning` | Warning states |
| `colors.birdie` | Birdie score (green) |
| `colors.par` | Par score (blue) |
| `colors.bogey` | Bogey score (orange) |
| `colors.doubleBogey` | Double bogey+ score (red) |
| `colors.white` | White (constant across themes) |

## Responsive Design

### Screen Size Handling
```tsx
import { Dimensions, StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    width: width > 768 ? '50%' : '100%',
    padding: width > 768 ? 32 : 16,
  },
});
```

### Using useSafeAreaInsets
```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function SafeScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {/* Content */}
    </View>
  );
}
```

## Platform-Specific Styling

### Platform Select
```tsx
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});
```

## Dynamic Styling

### Conditional Styles
```tsx
interface CardProps {
  isActive?: boolean;
  variant?: 'default' | 'elevated';
}

export function Card({ isActive, variant = 'default' }: CardProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface },
        isActive && { borderColor: colors.primary, borderWidth: 2 },
        variant === 'elevated' && styles.cardElevated,
      ]}
    >
      <Text style={{ color: colors.textPrimary }}>Card content</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  cardElevated: {
    ...shadows.lg,
  },
});
```

### Computed Styles (Golf Score Colors)
```tsx
interface ScoreProps {
  score: number;
  par: number;
}

export function ScoreDisplay({ score, par }: ScoreProps) {
  const colors = useThemeColors();

  const getScoreColor = () => {
    const diff = score - par;
    if (diff <= -2) return colors.birdie; // Eagle or better
    if (diff === -1) return colors.birdie; // Birdie
    if (diff === 0) return colors.par;     // Par
    if (diff === 1) return colors.bogey;   // Bogey
    return colors.doubleBogey;             // Double bogey or worse
  };

  return (
    <View style={[styles.score, { backgroundColor: getScoreColor() }]}>
      <Text style={[styles.scoreText, { color: colors.white }]}>{score}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  score: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    ...typography.bodyBold,
  },
});
```

## Layout Patterns

### Flexbox (Default in React Native)
```tsx
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  column: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: spacing.md,
  },
});
```

### Common Layout Components
```tsx
// Horizontal row with gap
<View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
  {children}
</View>

// Vertical stack with gap
<View style={{ gap: spacing.md }}>
  {children}
</View>

// Centered container
<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
  {children}
</View>
```

## Golf-Specific Styling

### Score Color Coding
```tsx
export const getScoreColor = (score: number, par: number, colors: ThemeColors) => {
  const diff = score - par;
  if (diff <= -2) return colors.birdie; // Eagle or better
  if (diff === -1) return colors.birdie; // Birdie
  if (diff === 0) return colors.par;     // Par
  if (diff === 1) return colors.bogey;   // Bogey
  return colors.doubleBogey;             // Double bogey or worse
};
```

### Touch Targets for Score Entry
```tsx
const styles = StyleSheet.create({
  scoreButton: {
    width: 48,  // Minimum 44dp for touch, slightly larger for gloved fingers
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

### Hole Display
```tsx
const styles = StyleSheet.create({
  holeCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  holeNumber: {
    fontSize: 48,
    fontWeight: '700',
  },
  parDisplay: {
    ...typography.small,
  },
});
```

## Performance Optimization

### Avoid Inline Object Styles
```tsx
// ❌ Bad - creates new object on every render
<View style={{ padding: 16, backgroundColor: colors.surface }}>

// ✅ Good - combines static and dynamic styles
<View style={[styles.container, { backgroundColor: colors.surface }]}>

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
});
```

### Memoize Computed Style Arrays
```tsx
import { useMemo } from 'react';

export function OptimizedComponent({ isActive }: { isActive: boolean }) {
  const colors = useThemeColors();

  const containerStyle = useMemo(
    () => [
      styles.container,
      { backgroundColor: colors.surface },
      isActive && { borderColor: colors.primary },
    ],
    [colors.surface, colors.primary, isActive]
  );

  return <View style={containerStyle} />;
}
```

## Accessibility

### Color Contrast
Ensure sufficient contrast ratios for text readability:
- `textPrimary` on `surface` - High contrast
- `textSecondary` on `surface` - Medium contrast
- `white` on `primary` - High contrast

### Touch Target Sizes
```tsx
const styles = StyleSheet.create({
  touchable: {
    minWidth: 44,  // Minimum 44dp for iOS HIG
    minHeight: 44, // Minimum 44dp
    padding: spacing.md,
  },
});
```

## Common Patterns

### Card with Shadow
```tsx
const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
});

// Usage with theme colors
<View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
```

### Button Variants
```tsx
const styles = StyleSheet.create({
  buttonBase: {
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
});

// Primary solid button
<TouchableOpacity style={[styles.buttonBase, { backgroundColor: colors.primary }]}>
  <Text style={{ color: colors.white, ...typography.bodyBold }}>Primary</Text>
</TouchableOpacity>

// Outline button
<TouchableOpacity style={[styles.buttonBase, { borderWidth: 2, borderColor: colors.primary }]}>
  <Text style={{ color: colors.primary, ...typography.bodyBold }}>Outline</Text>
</TouchableOpacity>
```

### List Item
```tsx
const styles = StyleSheet.create({
  listItem: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
});

// Usage
<View style={[styles.listItem, { borderBottomColor: colors.border }]}>
```

## Best Practices Summary

1. **ALWAYS use `useThemeColors()` hook** for colors - never import colors directly
2. **Use StyleSheet.create()** for static layout styles (padding, margin, flexbox)
3. **Apply dynamic colors inline** with style array: `[styles.static, { color: colors.dynamic }]`
4. **Apply design tokens** from `src/constants/theme.ts` (spacing, typography, shadows, borderRadius)
5. **Use Platform.select** for iOS/Android differences (especially shadows)
6. **Use safe area insets** for proper iOS notch handling
7. **Minimum 44dp touch targets** for accessibility
8. **Color code golf scores** using theme colors (birdie, par, bogey, doubleBogey)
9. **Test on both platforms** - iOS and Android render differently
10. **Avoid inline object creation** - combine static and dynamic styles properly
11. **Memoize complex style computations** with useMemo when needed
12. **Support dark mode** by using theme colors (automatic with useThemeColors hook)
