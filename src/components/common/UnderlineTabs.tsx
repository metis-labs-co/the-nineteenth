// src/components/common/UnderlineTabs.tsx
import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius } from '@/constants/theme';
import type { TabItem } from './Tabs';

export interface UnderlineTabsProps<T extends string = string> {
  /** Array of tab items to render */
  tabs: TabItem<T>[];
  /** Currently selected tab key */
  selectedTab: T;
  /** Callback when a tab is selected */
  onTabChange: (tab: T) => void;
  /** Custom container style (e.g., for margins) */
  style?: StyleProp<ViewStyle>;
  /** Test ID for the component */
  testID?: string;
}

/**
 * Underline-style horizontal tab bar with optional count pills.
 *
 * Visual language from the Competition Details redesign: plain labels on a
 * transparent background, the active tab bold with a rounded primary
 * underline, counts rendered as small pills (primary-filled when active).
 * Horizontally scrollable for large tab sets; keeps the selected tab visible.
 */
export const UnderlineTabs = React.memo(function UnderlineTabs<
  T extends string = string,
>({ tabs, selectedTab, onTabChange, style, testID }: UnderlineTabsProps<T>) {
  const colors = useThemeColors();
  const scrollRef = useRef<ScrollView>(null);
  const tabOffsets = useRef<Partial<Record<T, number>>>({});

  const handleTabPress = useCallback(
    (key: T) => {
      onTabChange(key);
    },
    [onTabChange]
  );

  // Keep the selected tab in view when selection changes (e.g. via nav params)
  useEffect(() => {
    const x = tabOffsets.current[selectedTab];
    if (x !== undefined) {
      scrollRef.current?.scrollTo({ x: Math.max(0, x - spacing.xxl), animated: true });
    }
  }, [selectedTab]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.scrollContainer, style]}
      contentContainerStyle={styles.scrollContent}
      testID={testID}
    >
      <View style={styles.row} accessibilityRole="tablist">
        {tabs.map((tab) => {
          const isSelected = tab.key === selectedTab;
          const isDisabled = tab.disabled === true;
          const showCount = tab.count !== undefined;

          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isDisabled && styles.tabDisabled]}
              onPress={() => handleTabPress(tab.key)}
              onLayout={(e) => {
                tabOffsets.current[tab.key] = e.nativeEvent.layout.x;
              }}
              activeOpacity={0.7}
              disabled={isDisabled}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected, disabled: isDisabled }}
              accessibilityLabel={
                showCount ? `${tab.label}, ${tab.count} items` : tab.label
              }
              accessibilityHint={`Switch to ${tab.label} tab`}
            >
              <View style={styles.labelRow}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.label,
                    isSelected ? styles.labelSelected : null,
                    {
                      color: isDisabled
                        ? colors.textDisabled
                        : isSelected
                          ? colors.textPrimary
                          : colors.textTertiary,
                    },
                  ]}
                >
                  {tab.label}
                </Text>
                {showCount && (
                  <View
                    style={[
                      styles.countPill,
                      {
                        backgroundColor: isSelected
                          ? colors.primary
                          : colors.surfaceVariant,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.countText,
                        {
                          color: isSelected
                            ? colors.textOnColored
                            : colors.textTertiary,
                        },
                      ]}
                    >
                      {tab.count}
                    </Text>
                  </View>
                )}
              </View>
              <View
                style={[
                  styles.underline,
                  {
                    backgroundColor: isSelected ? colors.primary : 'transparent',
                  },
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}) as <T extends string = string>(props: UnderlineTabsProps<T>) => React.ReactElement;

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 0,
    flexShrink: 0,
  },
  scrollContent: {
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md + 2,
  },
  tab: {
    paddingTop: spacing.xs + 2,
    paddingBottom: spacing.sm,
    paddingHorizontal: 1,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'flex-end',
  },
  tabDisabled: {
    opacity: 0.5,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  label: {
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 18,
  },
  labelSelected: {
    fontWeight: '800',
  },
  countPill: {
    minWidth: 18,
    height: 18,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countText: {
    fontSize: 10.5,
    fontWeight: '700',
    lineHeight: 13,
  },
  underline: {
    alignSelf: 'stretch',
    height: 2.5,
    borderRadius: 2,
    marginTop: spacing.xs + 2,
  },
});

export default UnderlineTabs;
