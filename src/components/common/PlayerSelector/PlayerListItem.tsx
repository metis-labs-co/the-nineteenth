/**
 * PlayerListItem - Individual player row with selection capability
 *
 * Displays player info (avatar, name, email, handicap) with a circular
 * selection button. Supports disabled and locked states.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Divider } from 'react-native-paper';
import { IconCheck, IconPlus, IconLock } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import type { PlayerListItemProps } from './PlayerSelector.types';

export const PlayerListItem = memo(function PlayerListItem({
  player,
  isSelected,
  isDisabled = false,
  isLocked = false,
  showHandicap = true,
  onToggle,
  showDivider = false,
}: PlayerListItemProps) {
  const colors = useThemeColors();

  // Locked items are always selected and cannot be toggled
  const effectiveSelected = isLocked || isSelected;
  const effectiveDisabled = isLocked || isDisabled;

  return (
    <>
      <TouchableOpacity
        style={[styles.item, effectiveDisabled && !isLocked && styles.itemDisabled]}
        onPress={onToggle}
        disabled={effectiveDisabled}
        accessibilityRole="checkbox"
        accessibilityState={{
          checked: effectiveSelected,
          disabled: effectiveDisabled,
        }}
        accessibilityLabel={`${effectiveSelected ? 'Remove' : 'Add'} ${player.name}${isLocked ? ' (locked)' : ''}`}
        activeOpacity={0.7}
      >
        <View style={styles.itemContent}>
          {/* Avatar */}
          <PlayerAvatar
            photoUrl={player.photo_url}
            name={player.name}
            size={56}
          />

          {/* Player Info */}
          <View style={styles.info}>
            <Text
              style={[
                styles.name,
                { color: colors.textPrimary },
                effectiveDisabled && !isLocked && { color: colors.textDisabled },
              ]}
              numberOfLines={1}
            >
              {player.name}
              {isLocked && ' (You)'}
            </Text>
            {player.email && (
              <Text
                style={[
                  styles.email,
                  { color: colors.textSecondary },
                  effectiveDisabled && !isLocked && { color: colors.textDisabled },
                ]}
                numberOfLines={1}
              >
                {player.email}
              </Text>
            )}
            {showHandicap && player.handicap !== null && player.handicap !== undefined && (
              <Text
                style={[
                  styles.handicap,
                  { color: colors.primary },
                  effectiveDisabled && !isLocked && { color: colors.textDisabled },
                ]}
              >
                HC: {player.handicap}
              </Text>
            )}
          </View>

          {/* Selection Button */}
          <View
            style={[
              styles.selectionButton,
              {
                backgroundColor: isLocked
                  ? colors.surfaceVariant
                  : effectiveSelected
                    ? colors.primary
                    : colors.surfaceVariant,
              },
            ]}
          >
            {isLocked ? (
              <IconLock size={20} color={colors.textDisabled} />
            ) : effectiveSelected ? (
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
  item: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  itemDisabled: {
    opacity: 0.5,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  name: {
    ...typography.bodyBold,
    flexShrink: 1,
  },
  email: {
    ...typography.small,
    marginTop: spacing.xs,
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
