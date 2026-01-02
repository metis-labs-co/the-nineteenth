/**
 * FriendListItem - Friend card with selection capability
 *
 * Displays friend info (avatar, name, email, handicap) with a circular
 * selection button. Consistent design across round and competition flows.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Divider } from 'react-native-paper';
import { IconCheck, IconPlus } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import type { FriendListItemProps } from './FriendSelector.types';

export const FriendListItem = memo(function FriendListItem({
  friend,
  isSelected,
  isDisabled = false,
  onToggle,
  showDivider = false,
  showPendingBadge = false,
}: FriendListItemProps) {
  const colors = useThemeColors();
  const isPending = showPendingBadge && friend.friendship_status === 'pending';

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
            {friend.email && (
              <Text
                style={[
                  styles.email,
                  { color: colors.textSecondary },
                  isDisabled && { color: colors.textDisabled },
                ]}
                numberOfLines={1}
              >
                {friend.email}
              </Text>
            )}
            {friend.handicap !== null && friend.handicap !== undefined && (
              <Text
                style={[
                  styles.handicap,
                  { color: colors.primary },
                  isDisabled && { color: colors.textDisabled },
                ]}
              >
                HC: {friend.handicap}
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
