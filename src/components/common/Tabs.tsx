// src/components/common/Tabs.tsx
import React, { useCallback, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager, StyleProp, ViewStyle, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Individual tab item configuration
 */
export interface TabItem<T extends string = string> {
  /**
   * Unique identifier for the tab
   */
  key: T;
  /**
   * Display label for the tab
   */
  label: string;
  /**
   * Optional badge count to display (e.g., number of items)
   */
  count?: number;
  /**
   * Whether this tab is disabled
   */
  disabled?: boolean;
}

/**
 * Props for the Tabs component
 */
export interface TabsProps<T extends string = string> {
  /**
   * Array of tab items to render
   */
  tabs: TabItem<T>[];
  /**
   * Currently selected tab key
   */
  selectedTab: T;
  /**
   * Callback when a tab is selected
   */
  onTabChange: (tab: T) => void;
  /**
   * Size variant for the tabs
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large';
  /**
   * Whether to animate tab transitions
   * @default true
   */
  animated?: boolean;
  /**
   * Custom container style (e.g., for margins)
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Test ID for the component
   */
  testID?: string;
}

/**
 * A flexible, theme-aware tabs component for navigation between views.
 * Always horizontally scrollable. Tabs fill the screen width when there are
 * few tabs, and scroll when they overflow.
 *
 * @example
 * ```tsx
 * const [tab, setTab] = useState<'active' | 'history'>('active');
 *
 * <Tabs
 *   tabs={[
 *     { key: 'active', label: 'Active', count: 5 },
 *     { key: 'history', label: 'History', count: 12 },
 *   ]}
 *   selectedTab={tab}
 *   onTabChange={setTab}
 * />
 * ```
 */
export const Tabs = React.memo(function Tabs<T extends string = string>({
  tabs,
  selectedTab,
  onTabChange,
  size = 'medium',
  animated = true,
  style,
  testID,
}: TabsProps<T>) {
  const colors = useThemeColors();

  const handleTabPress = useCallback(
    (key: T) => {
      if (animated) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      onTabChange(key);
    },
    [animated, onTabChange]
  );

  const sizeStyles = useMemo(() => {
    switch (size) {
      case 'small':
        return {
          containerPadding: spacing.xs,
          tabPaddingVertical: spacing.xs,
          tabPaddingHorizontal: spacing.sm,
          typography: typography.smallBold,
        };
      case 'large':
        return {
          containerPadding: spacing.sm,
          tabPaddingVertical: spacing.md,
          tabPaddingHorizontal: spacing.lg,
          typography: typography.bodyBold,
        };
      case 'medium':
      default:
        return {
          containerPadding: spacing.xs,
          tabPaddingVertical: spacing.sm,
          tabPaddingHorizontal: spacing.lg,
          typography: typography.bodyBold,
        };
    }
  }, [size]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={[styles.scrollContainer, style]}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: colors.surfaceVariant, padding: sizeStyles.containerPadding },
        ]}
        testID={testID}
        accessibilityRole="tablist"
      >
        {tabs.map((tab) => {
          const isSelected = tab.key === selectedTab;
          const isDisabled = tab.disabled === true;

          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                {
                  paddingVertical: sizeStyles.tabPaddingVertical,
                  paddingHorizontal: sizeStyles.tabPaddingHorizontal,
                },
                isSelected && { backgroundColor: colors.surfaceSelected },
                isDisabled && styles.tabDisabled,
              ]}
              onPress={() => handleTabPress(tab.key)}
              activeOpacity={0.7}
              disabled={isDisabled}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected, disabled: isDisabled }}
              accessibilityLabel={
                tab.count !== undefined
                  ? `${tab.label}, ${tab.count} items`
                  : tab.label
              }
              accessibilityHint={`Switch to ${tab.label} tab`}
            >
              <Text
                style={[
                  sizeStyles.typography,
                  { color: colors.textSecondary },
                  isSelected && { color: colors.primary },
                  isDisabled && { color: colors.textDisabled },
                ]}
                numberOfLines={1}
              >
                {tab.count !== undefined ? `${tab.label} (${tab.count})` : tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}) as <T extends string = string>(props: TabsProps<T>) => React.ReactElement;

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 0,
    flexShrink: 0,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    flex: 1,
  },
  tab: {
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, // iOS HIG minimum touch target
    flexGrow: 1,
    flexShrink: 0,
  },
  tabDisabled: {
    opacity: 0.5,
  },
});
