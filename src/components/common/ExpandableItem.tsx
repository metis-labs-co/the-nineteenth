/**
 * ExpandableItem - Expandable accordion-style item
 *
 * Provides an expandable/collapsible item for FAQs, settings, etc.
 * Features smooth animations and proper accessibility support.
 *
 * @example
 * ```tsx
 * <ExpandableItem
 *   title="How do I create a competition?"
 *   isExpanded={expandedId === '1'}
 *   onToggle={() => setExpandedId(expandedId === '1' ? null : '1')}
 * >
 *   <Text>Go to the Competitions tab and tap the "+" button...</Text>
 * </ExpandableItem>
 * ```
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  ViewStyle,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface ExpandableItemProps {
  /** The title/question displayed in the header */
  title: string;
  /** Whether the item is currently expanded */
  isExpanded: boolean;
  /** Callback when the item is toggled */
  onToggle: () => void;
  /** Content to display when expanded */
  children: React.ReactNode;
  /** Show border at bottom (for list items) */
  showBorder?: boolean;
  /** Whether this is the last item (no bottom border) */
  isLast?: boolean;
  /** Container style override */
  style?: ViewStyle;
  /** Use animation (defaults to true) */
  animated?: boolean;
  /** Custom icon when collapsed */
  collapsedIcon?: string;
  /** Custom icon when expanded */
  expandedIcon?: string;
}

export const ExpandableItem = React.memo(function ExpandableItem({
  title,
  isExpanded,
  onToggle,
  children,
  showBorder = true,
  isLast = false,
  style,
  animated = true,
  collapsedIcon = 'chevron-down',
  expandedIcon = 'chevron-up',
}: ExpandableItemProps) {
  const colors = useThemeColors();
  const animatedOpacity = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(animatedOpacity, {
        toValue: isExpanded ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isExpanded, animated, animatedOpacity]);

  const handleToggle = () => {
    if (animated) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    onToggle();
  };

  return (
    <View
      style={[
        styles.container,
        showBorder && !isLast && { borderBottomColor: colors.gray100 },
        showBorder && !isLast && styles.withBorder,
        style,
      ]}
    >
      <Pressable
        style={({ pressed }) => [
          styles.header,
          pressed && { backgroundColor: colors.gray50 },
        ]}
        onPress={handleToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityLabel={title}
        accessibilityHint={isExpanded ? 'Collapse to hide content' : 'Expand to show content'}
      >
        <Text
          style={[styles.title, { color: colors.textPrimary }]}
          numberOfLines={2}
        >
          {title}
        </Text>
        <Icon
          source={isExpanded ? expandedIcon : collapsedIcon}
          size={20}
          color={colors.gray400}
        />
      </Pressable>

      {isExpanded && (
        <Animated.View
          style={[
            styles.content,
            { backgroundColor: colors.gray50 },
            animated && { opacity: animatedOpacity },
          ]}
        >
          {children}
        </Animated.View>
      )}
    </View>
  );
});

export interface ExpandableListProps {
  /** Currently expanded item ID */
  expandedId: string | null;
  /** Callback when an item is toggled */
  onToggle: (id: string) => void;
  /** Whether to allow multiple items expanded (defaults to false) */
  allowMultiple?: boolean;
  /** Container style */
  style?: ViewStyle;
  children: React.ReactNode;
}

/**
 * ExpandableList - Container for multiple expandable items
 *
 * Provides consistent styling and handles the expand/collapse logic.
 *
 * @example
 * ```tsx
 * <ExpandableList
 *   expandedId={expandedId}
 *   onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
 * >
 *   {items.map((item, index) => (
 *     <ExpandableItem
 *       key={item.id}
 *       title={item.question}
 *       isExpanded={expandedId === item.id}
 *       onToggle={() => onToggle(item.id)}
 *       isLast={index === items.length - 1}
 *     >
 *       <Text>{item.answer}</Text>
 *     </ExpandableItem>
 *   ))}
 * </ExpandableList>
 * ```
 */
export const ExpandableList = React.memo(function ExpandableList({
  style,
  children,
}: ExpandableListProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.list, { backgroundColor: colors.surface }, style]}>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {},
  withBorder: {
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  title: {
    ...typography.body,
    flex: 1,
    marginRight: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  list: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
});

export default ExpandableItem;
