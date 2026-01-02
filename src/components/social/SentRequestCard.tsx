/**
 * SentRequestCard - Displays a pending friend request that was sent by the user
 *
 * Shows addressee info (avatar, name, email) with a cancel button.
 * Used in FriendsScreen to display outgoing friend requests.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { GolfBallLoader, PlayerAvatar } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { FriendRequest } from '@/types/database.types';

/**
 * Props for the SentRequestCard component
 */
export interface SentRequestCardProps {
  /**
   * The sent request data (requester field contains the person we sent to)
   */
  request: FriendRequest;
  /**
   * Callback when cancel button is pressed
   */
  onCancel: () => void;
  /**
   * Whether the cancel action is in progress
   */
  isCancelling?: boolean;
  /**
   * Test ID for testing
   */
  testID?: string;
}

/**
 * SentRequestCard - Displays a pending sent friend request
 */
export const SentRequestCard = React.memo(function SentRequestCard({
  request,
  onCancel,
  isCancelling = false,
  testID,
}: SentRequestCardProps) {
  const colors = useThemeColors();

  // The "requester" field actually contains the person we sent TO (addressee)
  const recipient = request.requester;

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.info}>
        <PlayerAvatar
          photoUrl={recipient.photo_url}
          name={recipient.name}
          size={48}
        />
        <View style={styles.textInfo}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {recipient.name}
          </Text>
          <Text style={[styles.status, { color: colors.textTertiary }]} numberOfLines={1}>
            Request pending
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.cancelButton, { borderColor: colors.gray300 }]}
        onPress={onCancel}
        disabled={isCancelling}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Cancel friend request"
      >
        {isCancelling ? (
          <GolfBallLoader size="sm" />
        ) : (
          <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
        )}
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  name: {
    ...typography.bodyBold,
  },
  status: {
    ...typography.caption,
  },
  cancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    minWidth: 70,
    alignItems: 'center',
  },
  cancelText: {
    ...typography.captionBold,
  },
});

export default SentRequestCard;
