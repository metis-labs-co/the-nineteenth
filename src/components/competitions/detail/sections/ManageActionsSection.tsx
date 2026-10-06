/**
 * ManageActionsSection - Organiser quick-action grid on the Details tab.
 *
 * A 3-column grid of tappable action tiles (Add round, Formats & points,
 * Manage teams, Pairings, Settings, Share invite) mirroring the redesign
 * mock's "Manage" section. Purely presentational: each tile invokes a
 * caller-provided handler; the section renders nothing when no actions are
 * passed (e.g. non-organisers).
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';

export interface ManageAction {
  /** Stable key for the tile. */
  key: string;
  /** Tile label (wraps to two lines if needed). */
  label: string;
  /** MDI icon name rendered in the tinted badge. */
  icon: string;
  /** Invoked on tap. */
  onPress: () => void;
}

export interface ManageActionsSectionProps {
  actions: ManageAction[];
}

export function ManageActionsSection({ actions }: ManageActionsSectionProps) {
  const colors = useThemeColors();

  if (actions.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>MANAGE</Text>
      <View style={styles.grid}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.key}
            style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }, shadows.sm]}
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBadge, { backgroundColor: colors.primaryBackground }]}>
              <Icon source={action.icon} size={20} color={colors.primary} />
            </View>
            <Text style={[styles.tileLabel, { color: colors.textSecondary }]} numberOfLines={2}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const TILE_GAP = spacing.sm;

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.captionBold,
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TILE_GAP,
  },
  tile: {
    // Three per row: (100% - 2 gaps) / 3. RN lacks calc(), so use a flexBasis
    // percentage slightly under a third and let the gap absorb the remainder.
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 96,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    ...typography.smallBold,
    textAlign: 'center',
  },
});

export default ManageActionsSection;
