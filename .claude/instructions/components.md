# React Native Components with React Native Paper - The Nineteenth

You are an expert in building reusable React Native components with React Native Paper and TypeScript for The Nineteenth golf competition app.

## Core Principles
- Build accessible, reusable components
- Use React Native Paper components for UI elements (Text, Icon, ActivityIndicator, Divider, TextInput)
- **DO NOT use Paper's Button component** - use TouchableOpacity with explicit styling
- Use TypeScript for all components
- Apply design tokens from `src/constants/theme.ts`
- Use `useThemeColors()` hook for dynamic colors (light/dark mode support)
- Follow composition patterns
- Optimize performance with React.memo

## Component Structure

### Basic Component Template (REQUIRED PATTERN)
```tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';

interface ComponentProps {
  title: string;
  description?: string;
  variant?: 'default' | 'elevated';
  onPress?: () => void;
}

export function ExampleComponent({
  title,
  description,
  variant = 'default',
  onPress,
}: ComponentProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface },
        variant === 'elevated' && styles.elevated,
      ]}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {title}
      </Text>
      {description && (
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {description}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  elevated: {
    ...shadows.md,
  },
  title: {
    ...typography.h3,
  },
  description: {
    ...typography.body,
    marginTop: spacing.sm,
  },
});
```

### Button Component (Use TouchableOpacity, NOT Paper Button)
```tsx
import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'solid' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
}

export function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'solid',
  size = 'md',
  icon,
}: ButtonProps) {
  const colors = useThemeColors();
  const isDisabled = disabled || loading;

  const getBackgroundColor = () => {
    if (isDisabled) return colors.surfaceDisabled;
    if (variant === 'solid') return colors.primary;
    return 'transparent';
  };

  const getTextColor = () => {
    if (isDisabled) return colors.textDisabled;
    if (variant === 'solid') return colors.white;
    return colors.primary;
  };

  const getHeight = () => {
    switch (size) {
      case 'sm': return 36;
      case 'lg': return 56;
      default: return 48;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          height: getHeight(),
          borderColor: variant === 'outline' ? colors.primary : 'transparent',
          borderWidth: variant === 'outline' ? 2 : 0,
        },
      ]}
      accessibilityLabel={title}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <View style={styles.buttonContent}>
          {icon && <Icon source={icon} size={20} color={getTextColor()} />}
          <Text style={[styles.buttonText, { color: getTextColor() }]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    ...shadows.sm,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buttonText: {
    ...typography.bodyBold,
  },
});
```

### Card Component
```tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';

interface CardProps {
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  onPress?: () => void;
  children?: React.ReactNode;
}

export function Card({
  title,
  subtitle,
  description,
  imageUrl,
  onPress,
  children,
}: CardProps) {
  const colors = useThemeColors();

  const content = (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {imageUrl && (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          accessibilityLabel={title}
        />
      )}
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
        {description && (
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {description}
          </Text>
        )}
        {children}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`View ${title}`}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  image: {
    width: '100%',
    height: 200,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  title: {
    ...typography.h3,
  },
  subtitle: {
    ...typography.small,
  },
  description: {
    ...typography.body,
    marginTop: spacing.xs,
  },
});
```

### Input Component (Form)
```tsx
import React, { forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Text, HelperText } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';

interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  helperText?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export const Input = forwardRef<any, InputProps>(
  function Input({ label, value, onChangeText, error, helperText, ...props }, ref) {
    const colors = useThemeColors();

    return (
      <View style={styles.container}>
        <TextInput
          ref={ref}
          label={label}
          value={value}
          onChangeText={onChangeText}
          mode="outlined"
          error={!!error}
          accessibilityLabel={label}
          accessibilityHint={helperText}
          outlineColor={colors.border}
          activeOutlineColor={colors.primary}
          textColor={colors.textPrimary}
          {...props}
        />
        {(error || helperText) && (
          <HelperText type={error ? 'error' : 'info'} visible>
            {error || helperText}
          </HelperText>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
});
```

### List Item Component
```tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text, Icon, Avatar } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';

interface ListItemProps {
  title: string;
  description?: string;
  avatar?: string;
  icon?: string;
  onPress: () => void;
  rightElement?: React.ReactNode;
}

export const ListItem = React.memo(function ListItem({
  title,
  description,
  avatar,
  icon,
  onPress,
  rightElement,
}: ListItemProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, { borderBottomColor: colors.border }]}
      accessibilityLabel={title}
      accessibilityHint={description}
      accessibilityRole="button"
    >
      <View style={styles.row}>
        {avatar && (
          <Avatar.Image size={40} source={{ uri: avatar }} />
        )}
        {icon && !avatar && (
          <Icon source={icon} size={24} color={colors.textSecondary} />
        )}
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
          {description && (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {description}
            </Text>
          )}
        </View>
        {rightElement}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.body,
    fontWeight: '500',
  },
  description: {
    ...typography.small,
  },
});
```

## Golf-Specific Components

### Scorecard Player Card
```tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';
import type { Player, HoleScore } from '@/types';

interface ScorecardPlayerCardProps {
  player: Player;
  score?: HoleScore;
  onScorePress: (strokes: number) => void;
  isCurrentPlayer?: boolean;
}

export const ScorecardPlayerCard = React.memo(function ScorecardPlayerCard({
  player,
  score,
  onScorePress,
  isCurrentPlayer = false,
}: ScorecardPlayerCardProps) {
  const colors = useThemeColors();
  const scoreButtons = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isCurrentPlayer ? colors.primaryLight : colors.surface,
          borderColor: isCurrentPlayer ? colors.primary : colors.border,
        },
      ]}
    >
      {/* Player Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.playerName, { color: colors.textPrimary }]}>
            {player.name}
          </Text>
          <Text style={[styles.handicap, { color: colors.textSecondary }]}>
            HC: {player.handicap || 0}
          </Text>
        </View>
        <View style={[styles.scoreDisplay, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.scoreText, { color: colors.textPrimary }]}>
            {score?.strokes || '-'}
          </Text>
        </View>
      </View>

      {/* Score Buttons */}
      <View style={styles.buttonRow}>
        {scoreButtons.map((strokes) => {
          const isActive = score?.strokes === strokes;
          return (
            <TouchableOpacity
              key={strokes}
              style={[
                styles.scoreButton,
                {
                  backgroundColor: isActive ? colors.primary : colors.surfaceVariant,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onScorePress(strokes)}
              accessibilityRole="button"
              accessibilityLabel={`Score ${strokes} strokes`}
            >
              <Text
                style={[
                  styles.buttonText,
                  { color: isActive ? colors.white : colors.textPrimary },
                ]}
              >
                {strokes}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    ...shadows.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  playerName: {
    ...typography.h3,
  },
  handicap: {
    ...typography.small,
  },
  scoreDisplay: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    ...typography.h2,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  scoreButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    ...typography.bodyBold,
  },
});
```

### Competition Card
```tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { format } from 'date-fns';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';
import type { Competition } from '@/types';

interface CompetitionCardProps {
  competition: Competition;
  onPress: () => void;
}

export const CompetitionCard = React.memo(function CompetitionCard({
  competition,
  onPress,
}: CompetitionCardProps) {
  const colors = useThemeColors();
  const startDate = format(new Date(competition.startDate), 'dd/MM/yyyy');

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${competition.name} competition`}
    >
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {competition.name}
            </Text>
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              Starts: {startDate}
            </Text>
          </View>
          <Chip compact>{competition.visibility}</Chip>
        </View>
        {competition.description && (
          <Text
            style={[styles.description, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {competition.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    ...shadows.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    ...typography.h3,
  },
  date: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  description: {
    ...typography.body,
    marginTop: spacing.sm,
  },
});
```

## Design Tokens Integration

### Using Design Tokens with Theme Colors
```tsx
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';

export function ThemedComponent() {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface },
      ]}
    >
      <Text style={[typography.h2, { color: colors.textPrimary }]}>
        Themed content
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
});
```

### Key Color Properties
- `colors.background` - Screen backgrounds
- `colors.surface` - Card/container backgrounds
- `colors.surfaceVariant` - Secondary surfaces
- `colors.textPrimary` - Main text color
- `colors.textSecondary` - Secondary text color
- `colors.primary` - Primary action color
- `colors.border` - Border colors
- `colors.error`, `colors.success`, `colors.warning` - Semantic colors
- `colors.birdie`, `colors.par`, `colors.bogey`, `colors.doubleBogey` - Golf score colors

## Accessibility Patterns

### Basic Accessibility
```tsx
<TouchableOpacity
  onPress={handlePress}
  accessibilityLabel="Add new competition"
  accessibilityHint="Opens a form to create a new golf competition"
  accessibilityRole="button"
  accessibilityState={{ disabled: isDisabled, busy: isLoading }}
>
  <Text>Add Competition</Text>
</TouchableOpacity>
```

### Interactive Components
```tsx
import { TouchableOpacity, AccessibilityInfo } from 'react-native';

function InteractiveCard({ onPress, title }) {
  const handlePress = () => {
    onPress();
    AccessibilityInfo.announceForAccessibility(`${title} selected`);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessible
    >
      {/* Content */}
    </TouchableOpacity>
  );
}
```

## Performance Optimization

### Memoization
```tsx
import React, { useMemo, useCallback } from 'react';

const ExpensiveComponent = React.memo(function ExpensiveComponent({ data }) {
  const processedData = useMemo(() => {
    return data.map(item => /* expensive operation */);
  }, [data]);

  const handlePress = useCallback(() => {
    // Handle press
  }, []);

  return <View>{/* Render */}</View>;
});
```

### List Optimization
```tsx
import { FlashList } from '@shopify/flash-list';

interface Item {
  id: string;
  title: string;
}

const renderItem = ({ item }: { item: Item }) => (
  <ListItem key={item.id} {...item} />
);

const MemoizedListItem = React.memo(ListItem);

export function OptimizedList({ data }: { data: Item[] }) {
  return (
    <FlashList
      data={data}
      renderItem={renderItem}
      estimatedItemSize={72}
      keyExtractor={(item) => item.id}
    />
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

## Error States

### Error Display Component
```tsx
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';

interface ErrorDisplayProps {
  error: Error;
  onRetry: () => void;
}

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <Icon source="alert-circle" size={48} color={colors.error} />
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Something went wrong
      </Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {error.message}
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        style={[styles.button, { backgroundColor: colors.primary }]}
      >
        <Text style={[styles.buttonText, { color: colors.white }]}>
          Try Again
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    ...typography.h3,
  },
  message: {
    ...typography.body,
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  buttonText: {
    ...typography.bodyBold,
  },
});
```

### Empty State Component
```tsx
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  icon = 'folder-open',
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <Icon source={icon} size={64} color={colors.textSecondary} />
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {title}
      </Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {description}
      </Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          style={[styles.button, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.buttonText, { color: colors.white }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    ...typography.h3,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    textAlign: 'center',
    maxWidth: 300,
  },
  button: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  buttonText: {
    ...typography.bodyBold,
  },
});
```

## Common Components Catalog

When creating reusable components in `src/components/common/`, you MUST:

### 1. Export from Barrel File
Add the export to `src/components/common/index.ts`:
```tsx
export { MyNewComponent } from './MyNewComponent';
```

### 2. Update the Catalog
Add an entry to `.claude/instructions/common-components-catalog.md`:

**In the appropriate table section:**
```markdown
| `MyNewComponent` | Brief description | `prop1`, `prop2`, `onAction` |
```

**Example catalog entry:**
| Component | Use For | Key Props |
|-----------|---------|-----------|
| `ProgressBar` | Progress indicator | `value`, `max`, `label` |

### 3. When to Add to Common
Add to `src/components/common/` when:
- The component is generic and reusable across features
- It handles a common UI pattern (empty state, loading, forms, modals)
- It will be used in 3+ places

**Do NOT add** domain-specific components (competition cards, scorecard UI) to common.

## Best Practices

1. **Use React Native Paper for UI primitives** - Text, Icon, ActivityIndicator, Divider, TextInput
2. **DO NOT use Paper's Button component** - use TouchableOpacity with explicit styling
3. **Use `useThemeColors()` hook** for all dynamic colors (REQUIRED for dark mode)
4. **Apply design tokens** from `src/constants/theme.ts` for spacing, typography, shadows
5. **Use TypeScript** for all props and components
6. **Add proper accessibility labels** - accessibilityLabel, accessibilityHint, accessibilityRole
7. **Use forwardRef** for form input components
8. **Memoize expensive components** with React.memo
9. **Handle error and loading states** in all data-fetching components
10. **Use Platform.select** for platform-specific code
11. **Test on both iOS and Android**
12. **Optimize list items** with React.memo and FlashList
13. **Use proper touch feedback** (TouchableOpacity with activeOpacity)
14. **Ensure minimum 44dp touch targets** for accessibility
15. **Use proper TypeScript types** from `src/types/index.ts`
16. **Update the catalog** when adding common components (see above)
