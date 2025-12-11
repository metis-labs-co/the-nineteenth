# React Native Styling Guide

**The Nineteenth** - Mobile Golf Competition App

> Complete guide to styling patterns, design tokens, dark mode, and best practices for React Native development

---

## Overview

React Native uses its own **StyleSheet API** instead of CSS. Each component has its styles defined in the same file or a companion `.styles.ts` file. This is the mobile equivalent of CSS Modules per component.

**Key Differences from Web**:
- JavaScript objects instead of CSS syntax
- Flexbox-only layout (no Grid)
- No CSS cascade
- Platform-specific styling (iOS vs Android)
- Density-independent pixels (not px/rem)

---

## Dark Mode Architecture

This app supports **light and dark themes** with automatic system preference detection.

### Theme Context & Hooks

Three hooks are available from `@/context/ThemeContext`:

```typescript
// Most common - get current colors
import { useThemeColors } from '@/context/ThemeContext';
const colors = useThemeColors();

// Full theme control
import { useTheme } from '@/context/ThemeContext';
const { colors, isDark, themeMode, setThemeMode, toggleTheme } = useTheme();

// Simple dark mode check
import { useIsDark } from '@/context/ThemeContext';
const isDark = useIsDark();
```

### Color Imports - CRITICAL CHANGE

**OLD Pattern (DO NOT USE):**
```typescript
// ❌ WRONG - colors are no longer static imports
import { colors, spacing } from '@/constants/theme';
```

**NEW Pattern (REQUIRED):**
```typescript
// ✅ CORRECT - colors come from hook, other tokens are static imports
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';

export function MyComponent() {
  const colors = useThemeColors(); // Dynamic colors based on theme
  // ...
}
```

### Dynamic Color Application

Colors must be applied inline (not in StyleSheet) because they change with theme:

```typescript
export function MyComponent() {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Title</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Subtitle</Text>
    </View>
  );
}

// Static styles - no colors here
const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.small,
  },
});
```

### Available Color Properties

The `ColorPalette` type includes:

| Property | Light Mode | Dark Mode | Usage |
|----------|------------|-----------|-------|
| `background` | White | Dark gray | Screen backgrounds |
| `surface` | White | Slightly lighter | Cards, containers |
| `textPrimary` | Dark gray | White | Main text |
| `textSecondary` | Medium gray | Light gray | Secondary text |
| `textTertiary` | Light gray | Medium gray | Tertiary text |
| `textDisabled` | Light gray | Dark gray | Disabled text |
| `textInverse` | White | Dark | Text on colored backgrounds |
| `primary` | Blue | Blue | Primary actions |
| `border` | Light gray | Dark gray | Borders, dividers |
| `error` | Red | Red | Error states |
| `success` | Green | Green | Success states |
| `warning` | Orange | Orange | Warning states |
| `birdie` | Green | Green | Golf: under par |
| `par` | Blue | Blue | Golf: par |
| `bogey` | Orange | Orange | Golf: over par |
| `doubleBogey` | Red | Red | Golf: 2+ over |

---

## Styling Patterns

### Pattern 1: Styles in Same File (Recommended for Most Components)

Use this pattern for simple to medium complexity components.

```typescript
// src/components/competition/CompetitionCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';

interface CompetitionCardProps {
  name: string;
  date: Date;
}

export default function CompetitionCard({ name, date }: CompetitionCardProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{name}</Text>
      <Text style={[styles.date, { color: colors.textSecondary }]}>
        {date.toLocaleDateString('en-AU')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    ...shadows.sm,
  },
  title: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  date: {
    ...typography.small,
  },
});
```

---

### Pattern 2: Separate Styles File (For Large/Complex Components)

Use this pattern for screens and complex components with many style rules.

**Note:** With dark mode, only static styles go in the separate file. Color-related styles must be applied inline in the component.

```typescript
// src/screens/player/ScorecardScreen.styles.ts
import { StyleSheet } from 'react-native';
import { spacing, borderRadius, typography } from '@/constants/theme';

// Static styles only - no colors!
export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  playerCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
  },
  playerName: {
    ...typography.body,
    fontWeight: '600',
  },
  scoreButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
});
```

```typescript
// src/screens/player/ScorecardScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { styles } from './ScorecardScreen.styles';

export default function ScorecardScreen() {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.playerCard, {
        backgroundColor: colors.surface,
        borderColor: colors.border,
      }]}>
        <Text style={[styles.playerName, { color: colors.textPrimary }]}>
          John Doe
        </Text>
      </View>
    </View>
  );
}
```

---

## Design Tokens

Shared design tokens ensure consistency across the app. All tokens are defined in `src/constants/theme.ts`.

### Colors (Dynamic via Hook)

Colors are now **dynamic** and provided by the `useThemeColors()` hook. Two palettes exist:

```typescript
// src/constants/theme.ts - Color palettes (simplified)
export const lightColors: ColorPalette = {
  // Backgrounds
  background: '#ffffff',
  surface: '#ffffff',
  surfaceVariant: '#f9fafb',

  // Text
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',

  // Primary
  primary: '#3b82f6',
  primaryDark: '#2563eb',

  // Semantic
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',

  // Golf-specific
  birdie: '#22c55e',
  par: '#3b82f6',
  bogey: '#f59e0b',
  doubleBogey: '#ef4444',

  // Borders
  border: '#e5e7eb',
  // ... and more
};

export const darkColors: ColorPalette = {
  // Backgrounds
  background: '#111827',
  surface: '#1f2937',
  surfaceVariant: '#374151',

  // Text
  textPrimary: '#f9fafb',
  textSecondary: '#d1d5db',
  textTertiary: '#9ca3af',

  // Primary (same or adjusted for dark)
  primary: '#3b82f6',
  primaryDark: '#2563eb',

  // Semantic (same or adjusted)
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',

  // Golf-specific (same)
  birdie: '#22c55e',
  par: '#3b82f6',
  bogey: '#f59e0b',
  doubleBogey: '#ef4444',

  // Borders
  border: '#374151',
  // ... and more
};
```

**Usage:**
```typescript
import { useThemeColors } from '@/context/ThemeContext';

function MyComponent() {
  const colors = useThemeColors(); // Returns lightColors or darkColors
  return <View style={{ backgroundColor: colors.surface }} />;
}
```

### Spacing

```typescript
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};
```

### Typography

```typescript
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
```

### Border Radius

```typescript
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
};
```

### Shadows

```typescript
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
```

### Using Design Tokens

```typescript
// Import static tokens from theme, colors from hook
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, shadows, borderRadius } from '@/constants/theme';

function MyComponent() {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Title</Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {/* Card content */}
      </View>
    </View>
  );
}

// Static styles only - colors applied inline
const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
});
```

---

## Dynamic & Conditional Styling

### Conditional Styles with Array Syntax

```typescript
const colors = useThemeColors();

// Apply multiple styles conditionally with dynamic colors
<View style={[
  styles.button,
  { backgroundColor: colors.primary },
  isActive && { backgroundColor: colors.primaryDark },
  isDisabled && { backgroundColor: colors.gray300, opacity: 0.5 },
]} />
```

### Dynamic Values with Theme Colors

```typescript
const colors = useThemeColors();

// Dynamic inline values
<View style={[
  styles.progressBar,
  { width: `${progress}%`, backgroundColor: colors.primary }
]} />

// Computed background color for golf scores
<View style={[
  styles.scoreButton,
  { backgroundColor: getScoreColor(score, par, colors) }
]} />

// Helper function receives colors
function getScoreColor(score: number, par: number, colors: ColorPalette) {
  const diff = score - par;
  if (diff < 0) return colors.birdie;
  if (diff === 0) return colors.par;
  if (diff === 1) return colors.bogey;
  return colors.doubleBogey;
}
```

### Theme-Aware Conditional Styles

```typescript
const colors = useThemeColors();
const { isDark } = useTheme();

// Conditional based on theme mode
<View style={[
  styles.container,
  {
    backgroundColor: colors.surface,
    // Extra styling only in dark mode
    ...(isDark && { borderWidth: 1, borderColor: colors.border }),
  }
]} />
```

---

## Platform-Specific Styling

### Using Platform.select()

```typescript
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    padding: 16,
    // Platform-specific shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  text: {
    // Different font families per platform
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
    }),
  },
});
```

### Inline Platform Checks

```typescript
// Conditional rendering based on platform
<View style={[
  styles.container,
  Platform.OS === 'ios' && styles.iosOnly,
  Platform.OS === 'android' && styles.androidOnly,
]} />
```

---

## Component File Structure

Recommended file organization for styling:

```
src/
├── components/
│   ├── common/
│   │   ├── Button.tsx              # Simple: styles in same file
│   │   ├── Input.tsx
│   │   └── Card.tsx
│   │
│   ├── competition/
│   │   ├── CompetitionCard.tsx     # Simple: styles in same file
│   │   ├── CompetitionList.tsx
│   │   └── CompetitionDetails/     # Complex: separate styles
│   │       ├── index.tsx
│   │       ├── CompetitionDetails.styles.ts
│   │       └── components/
│   │           └── RoundsList.tsx
│   │
│   └── scorecard/
│       ├── HoleInput.tsx
│       ├── PlayerScoreCard.tsx
│       └── ScorecardReview/
│           ├── index.tsx
│           └── ScorecardReview.styles.ts
│
├── screens/
│   ├── player/
│   │   ├── ScorecardScreen.tsx
│   │   └── ScorecardScreen.styles.ts    # Large screen: separate styles
│   └── admin/
│       └── CreateCompetitionScreen.tsx
│
└── constants/
    └── theme.ts                         # Design tokens
```

---

## Complete Component Example

Full example showing all styling best practices with dark mode support:

```typescript
// src/components/scorecard/PlayerScoreCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, shadows, borderRadius } from '@/constants/theme';
import type { Player, HoleScore } from '@/types';

interface PlayerScoreCardProps {
  player: Player;
  score?: HoleScore;
  onScorePress: (score: number) => void;
  isCurrentPlayer?: boolean;
}

export default function PlayerScoreCard({
  player,
  score,
  onScorePress,
  isCurrentPlayer = false,
}: PlayerScoreCardProps) {
  const colors = useThemeColors();
  const scoreButtons = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: isCurrentPlayer ? colors.surfaceVariant : colors.surface,
        borderColor: isCurrentPlayer ? colors.primary : colors.border,
      }
    ]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.playerInfo}>
          <Text style={[styles.playerName, { color: colors.textPrimary }]}>
            {player.name}
          </Text>
          <Text style={[styles.playerHandicap, { color: colors.textSecondary }]}>
            HC: {player.handicap || 0}
          </Text>
        </View>
        <View style={[styles.scoreDisplay, { backgroundColor: colors.gray100 }]}>
          <Text style={[styles.scoreDisplayText, { color: colors.textPrimary }]}>
            {score?.strokes || '-'}
          </Text>
        </View>
      </View>

      {/* Score Buttons */}
      <View style={styles.scoreButtons}>
        {scoreButtons.map((buttonScore) => {
          const isActive = score?.strokes === buttonScore;
          return (
            <TouchableOpacity
              key={buttonScore}
              style={[
                styles.scoreButton,
                {
                  backgroundColor: isActive ? colors.primary : colors.gray100,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onScorePress(buttonScore)}
            >
              <Text
                style={[
                  styles.scoreButtonText,
                  { color: isActive ? colors.white : colors.textPrimary },
                ]}
              >
                {buttonScore}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Static styles only - no colors
const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    ...typography.body,
    fontWeight: '600',
  },
  playerHandicap: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  scoreDisplay: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreDisplayText: {
    fontSize: 24,
    fontWeight: '700',
  },
  scoreButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scoreButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  scoreButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
});
```

---

## Styling Best Practices

### 1. Use Theme Hook for Colors
Always use `useThemeColors()` hook for colors, never static imports

```typescript
// ✅ Good - colors from hook
import { useThemeColors } from '@/context/ThemeContext';
const colors = useThemeColors();
backgroundColor: colors.primary,

// ❌ Bad - static color imports no longer work for dark mode
import { colors } from '@/constants/theme';
backgroundColor: colors.primary,

// ❌ Bad - hardcoded colors
backgroundColor: '#3b82f6',
```

### 2. Co-locate Styles
Keep styles with components (same file or `.styles.ts`)

✅ **Good**: Static styles at bottom, colors applied inline
❌ **Bad**: Styles in separate global stylesheet

### 3. Use Static Design Tokens
Import non-color tokens from `@/constants/theme`

```typescript
// ✅ Good - static tokens imported, colors from hook
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';

const colors = useThemeColors();
padding: spacing.lg,
borderRadius: borderRadius.md,

// ❌ Bad - hardcoded values
padding: 16,
borderRadius: 8,
```

### 4. Name Semantically
Use descriptive names, not visual descriptions

```typescript
// ✅ Good
styles.container
styles.title
styles.button

// ❌ Bad
styles.blueBox
styles.bigText
styles.roundButton
```

### 5. StyleSheet.create Outside Component
Define at bottom of file for performance (static styles only)

```typescript
// ✅ Good - hook in component, styles outside
export default function MyComponent() {
  const colors = useThemeColors();
  return <View style={[styles.container, { backgroundColor: colors.surface }]} />;
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
});

// ❌ Bad - creating styles inside component
export default function MyComponent() {
  const colors = useThemeColors();
  const styles = StyleSheet.create({
    container: { backgroundColor: colors.surface }, // Recreated every render!
  });
}
```

### 6. Compose Colors with Arrays
Use array syntax for combining static styles with dynamic colors

```typescript
const colors = useThemeColors();

// ✅ Good - static style + dynamic color
<View style={[styles.card, { backgroundColor: colors.surface }]} />

// ✅ Good - conditional with colors
<View style={[
  styles.button,
  { backgroundColor: isActive ? colors.primary : colors.gray200 }
]} />

// ❌ Bad - all inline
<View style={{ padding: 16, backgroundColor: colors.surface }} />
```

### 7. Platform-Specific Sparingly
Only when truly needed

```typescript
// ✅ Good: Real platform difference (in static styles)
...Platform.select({
  ios: { shadowOpacity: 0.3 },
  android: { elevation: 5 },
})

// ❌ Bad: Same on all platforms
...Platform.select({
  ios: { padding: 16 },
  android: { padding: 16 },
})
```

### 8. Flexbox for Layouts
React Native uses Flexbox (default `flexDirection: 'column'`)

```typescript
// ✅ Good: Explicit flex layout in static styles
container: {
  flex: 1,
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
}

// Remember: Default is flexDirection: 'column' (opposite of web!)
```

---

## React Native vs CSS/Tailwind Comparison

| Aspect | React Native StyleSheet | CSS Modules | Tailwind CSS |
|--------|------------------------|-------------|--------------|
| **Syntax** | JavaScript objects | CSS syntax | Utility classes |
| **File structure** | Same file or `.styles.ts` | `.module.css` | HTML/JSX classes |
| **Scoping** | Component-scoped (by convention) | Scoped to module | Global utilities |
| **Type safety** | Full TypeScript support | Limited | Class names only |
| **Performance** | Optimized by RN | Browser CSS engine | Browser CSS engine |
| **Layout** | Flexbox only | Full CSS (Grid, etc.) | Flexbox + Grid |
| **Cascade** | No cascade | CSS cascade | Cascade + specificity |
| **Platform** | iOS + Android | Web | Web |
| **Dynamic** | JavaScript logic | CSS variables | Conditional classes |

### Key Differences

**Flexbox by Default**
- React Native: `flexDirection: 'column'` (vertical)
- Web CSS: `flexDirection: 'row'` (horizontal)

**No Cascade**
- All styles are scoped to component
- No inheritance from parent elements
- Must explicitly style each component

**Platform-Specific**
- Use `Platform.select()` for iOS vs Android
- Different shadow implementations

**Measurements**
- Density-independent pixels (DP)
- No `px`, `rem`, `em` units
- Just numbers: `fontSize: 16`

**Limited CSS Features**
- No pseudo-classes (`:hover`, `:focus`, `:nth-child`)
- No pseudo-elements (`::before`, `::after`)
- No animations (use Animated API instead)

---

## Common Patterns

### Card Components

```typescript
const colors = useThemeColors();

// Usage
<View style={[styles.card, { backgroundColor: colors.surface }]}>
  {/* content */}
</View>

// Static styles
const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
});
```

### Button States

```typescript
const colors = useThemeColors();

// Usage
<TouchableOpacity
  style={[
    styles.button,
    {
      backgroundColor: isDisabled
        ? colors.gray300
        : isPressed
        ? colors.primaryDark
        : colors.primary,
      opacity: isDisabled ? 0.5 : 1,
    },
  ]}
>
  <Text style={{ color: colors.white }}>Button</Text>
</TouchableOpacity>

// Static styles
const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});
```

### List Items

```typescript
const colors = useThemeColors();

// Usage
<View style={[
  styles.listItem,
  { borderBottomColor: colors.border },
  isLast && styles.listItemLast,
]}>
  <Text style={{ color: colors.textPrimary }}>{item.name}</Text>
</View>

// Static styles
const styles = StyleSheet.create({
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  listItemLast: {
    borderBottomWidth: 0,
  },
});
```

### Centered Content

```typescript
const colors = useThemeColors();

// Usage
<View style={[styles.centered, { backgroundColor: colors.background }]}>
  <ActivityIndicator color={colors.primary} />
</View>

// Static styles
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

---

## Related Documentation

- **[src/constants/theme.ts](../../src/constants/theme.ts)** - Design token definitions
- **[CLAUDE.md](../../CLAUDE.md)** - Project overview
- **[PROJECT_SETUP.md](../../PROJECT_SETUP.md)** - Setup and configuration

---

*Last Updated: January 2025*
