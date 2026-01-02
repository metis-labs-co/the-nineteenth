/**
 * ScorecardPlayerHeader Component
 *
 * Custom header for the PlayerScorecardScreen with back button,
 * player name, handicap display, and view mode toggle.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';

export type ScorecardViewMode = 'standard' | 'compact';

interface ScorecardPlayerHeaderProps {
  playerName: string;
  handicap: number;
  onGoBack: () => void;
  viewMode?: ScorecardViewMode;
  onViewModeChange?: (mode: ScorecardViewMode) => void;
  showViewToggle?: boolean;
}

export function ScorecardPlayerHeader({
  playerName,
  handicap,
  onGoBack,
  viewMode = 'standard',
  onViewModeChange,
  showViewToggle = false,
}: ScorecardPlayerHeaderProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.header,
        { backgroundColor: colors.surface, borderBottomColor: colors.border },
      ]}
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={onGoBack}
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <MaterialCommunityIcons
          name="chevron-left"
          size={28}
          color={colors.textPrimary}
        />
        <Text style={[styles.backButtonText, { color: colors.primary }]}>
          Back
        </Text>
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text
          style={[styles.headerTitle, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {playerName}
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          HC: {handicap}
        </Text>
      </View>
      {showViewToggle && onViewModeChange ? (
        <View style={[styles.toggleContainer, { backgroundColor: colors.surfaceVariant }]}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'standard' && [
                styles.toggleButtonActive,
                { backgroundColor: colors.surface },
              ],
            ]}
            onPress={() => onViewModeChange('standard')}
            activeOpacity={0.7}
            accessibilityLabel="Standard view"
          >
            <MaterialCommunityIcons
              name="table"
              size={18}
              color={viewMode === 'standard' ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'compact' && [
                styles.toggleButtonActive,
                { backgroundColor: colors.surface },
              ],
            ]}
            onPress={() => onViewModeChange('compact')}
            activeOpacity={0.7}
            accessibilityLabel="Compact view"
          >
            <MaterialCommunityIcons
              name="view-compact"
              size={18}
              color={viewMode === 'compact' ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
    paddingVertical: spacing.xs,
  },
  backButtonText: {
    ...typography.body,
    marginLeft: spacing.xs,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h4,
    textAlign: 'center',
  },
  headerSubtitle: {
    ...typography.caption,
  },
  headerSpacer: {
    minWidth: 80,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: 4,
    gap: 4,
  },
  toggleButton: {
    width: 36,
    height: 32,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleButtonActive: {
    ...shadows.sm,
  },
});
