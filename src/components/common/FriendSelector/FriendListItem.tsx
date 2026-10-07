/**
 * FriendListItem - Friend card with selection capability
 *
 * Displays friend info (avatar, name, handicap) with a circular
 * selection button. Consistent design across round and competition flows.
 */

import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Divider } from 'react-native-paper';
import { IconCheck, IconPlus } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { calculateGADailyHandicap } from '@/utils/dailyHandicap';
import { getBaseHandicap } from '@/utils/scorecardCalculations';
import { SOCIAL_HANDICAP_SHORT_LABEL } from '@/constants/handicap';
import type { FriendListItemProps } from './FriendSelector.types';

export const FriendListItem = memo(function FriendListItem({
  friend,
  isSelected,
  isDisabled = false,
  onToggle,
  showDivider = false,
  showPendingBadge = false,
  selectedTee,
  coursePar,
  handicapSource = 'profile',
}: FriendListItemProps) {
  const colors = useThemeColors();
  const isPending = showPendingBadge && friend.friendship_status === 'pending';

  // Calculate daily handicap when tee info is available
  const dailyHandicap = useMemo(() => {
    if (!selectedTee || !coursePar || handicapSource === 'none') return null;
    // Nothing to preview when the player has no value for this source
    const hasBase = handicapSource === 'calculated'
      ? (friend.handicap_index ?? friend.handicap) != null
      : friend.handicap != null;
    if (!hasBase) return null;

    // Same base-handicap rule the scorecard uses for this source
    const baseHandicap = getBaseHandicap(friend, handicapSource);

    const result = calculateGADailyHandicap({
      gaHandicap: baseHandicap,
      slopeRating: selectedTee.slopeRating ?? 113,
      courseRating: selectedTee.courseRating ?? coursePar,
      par: coursePar,
      gender: friend.gender ?? 'male',
    });

    return result.dailyHandicap;
  }, [friend, selectedTee, coursePar, handicapSource]);

  return (
    <>
      <TouchableOpacity
        style={[styles.card, isDisabled && styles.cardDisabled]}
        onPress={onToggle}
        disabled={isDisabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected, disabled: isDisabled }}
        accessibilityLabel={`${isSelected ? 'Remove' : 'Add'} ${friend.name}`}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          {/* Avatar */}
          <PlayerAvatar
            photoUrl={friend.photo_url}
            name={friend.name}
            size={56}
          />

          {/* Friend Info */}
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
                {friend.name}
              </Text>
              {isPending && (
                <StatusBadge
                  status="custom"
                  label="Pending"
                  size="sm"
                  backgroundColor={colors.warningBackground}
                />
              )}
            </View>
            {(friend.handicap != null || friend.handicap_index != null) && (
              <Text
                style={[
                  styles.handicap,
                  { color: colors.primary },
                  isDisabled && { color: colors.textDisabled },
                ]}
              >
                {dailyHandicap != null
                  ? `DHC: ${dailyHandicap}`
                  : friend.handicap != null
                    ? `HC: ${friend.handicap}`
                    : `${SOCIAL_HANDICAP_SHORT_LABEL}: ${friend.handicap_index}`}
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
  avatar: {},
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
