/**
 * PlaceholderListItem - Placeholder/guest player card with selection capability
 *
 * Displays placeholder player info (avatar, name, handicap) with a circular
 * selection button and "Guest" badge. Similar to FriendListItem but for
 * placeholder players.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Divider } from 'react-native-paper';
import { IconCheck, IconPlus } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import type { PlaceholderPlayerWithStats } from '@/types/database.types';

export interface PlaceholderListItemProps {
  placeholder: PlaceholderPlayerWithStats;
  isSelected: boolean;
  isDisabled?: boolean;
  onToggle: () => void;
  showDivider?: boolean;
}

export const PlaceholderListItem = memo(function PlaceholderListItem({
  placeholder,
  isSelected,
  isDisabled = false,
  onToggle,
  showDivider = false,
}: PlaceholderListItemProps) {
  const colors = useThemeColors();

  return (
    <>
      <TouchableOpacity
        style={[styles.card, isDisabled && styles.cardDisabled]}
        onPress={onToggle}
        disabled={isDisabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected, disabled: isDisabled }}
        accessibilityLabel={`${isSelected ? 'Remove' : 'Add'} ${placeholder.name} (Guest)`}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          {/* Avatar */}
          <PlayerAvatar
            photoUrl={null}
            name={placeholder.name}
            size={56}
          />

          {/* Placeholder Info */}
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text
                style={[
                  styles.name,
                  { color: colors.textPrimary },
                  isDisabled && { color: colors.textDisabled },
                ]}
                numberOfLines={1}
              >
                {placeholder.name}
              </Text>
              <StatusBadge
                status="custom"
                label="Guest"
                size="sm"
                backgroundColor={colors.surfaceVariant}
              />
            </View>
            {placeholder.handicap !== null && placeholder.handicap !== undefined && (
              <Text
                style={[
                  styles.handicap,
                  { color: colors.primary },
                  isDisabled && { color: colors.textDisabled },
                ]}
              >
                HC: {placeholder.handicap}
              </Text>
            )}
          </View>

          {/* Selection Button */}
          <View
            style={[
              styles.selectionButton,
              { backgroundColor: isSelected ? colors.primary : colors.surfaceVariant },
            ]}
          >
            {isSelected ? (
              <IconCheck size={20} color={colors.white} />
            ) : (
              <IconPlus size={20} color={colors.textSecondary} />
            )}
          </View>
        </View>
      </TouchableOpacity>
      {showDivider && (
        <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
      )}
    </>
  );
});

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    ...typography.bodyBold,
    flexShrink: 1,
  },
  handicap: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  selectionButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    marginHorizontal: spacing.lg,
  },
});
