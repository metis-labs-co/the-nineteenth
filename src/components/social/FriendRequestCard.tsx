/**
 * FriendRequestCard - Displays a pending friend request with accept/decline actions
 *
 * Shows requester info (avatar, name, email) with action buttons to accept or decline.
 * Used in FriendsScreen to display incoming friend requests.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { Text, Icon } from 'react-native-paper';
import { GolfBallLoader, PlayerAvatar } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { FriendRequest } from '@/types/database.types';

/**
 * Props for the FriendRequestCard component
 */
export interface FriendRequestCardProps {
  /**
   * The friend request data to display
   */
  request: FriendRequest;
  /**
   * Callback when accept button is pressed
   */
  onAccept: () => void;
  /**
   * Callback when decline button is pressed
   */
  onDecline: () => void;
  /**
   * Whether the accept action is in progress
   */
  isAccepting?: boolean;
  /**
   * Whether the decline action is in progress
   */
  isDeclining?: boolean;
  /**
   * Test ID for testing
   */
  testID?: string;
}

/**
 * FriendRequestCard - Displays a pending friend request
 *
 * @example
 * ```tsx
 * <FriendRequestCard
 *   request={{
 *     id: 'req-1',
 *     requester: {
 *       id: 'user-1',
 *       name: 'John Smith',
 *       email: 'john@example.com',
 *       photo_url: null,
 *     },
 *   }}
 *   onAccept={() => acceptRequest('req-1')}
 *   onDecline={() => declineRequest('req-1')}
 *   isAccepting={false}
 *   isDeclining={false}
 * />
 * ```
 */
export const FriendRequestCard = React.memo(function FriendRequestCard({
  request,
  onAccept,
  onDecline,
  isAccepting = false,
  isDeclining = false,
  testID,
}: FriendRequestCardProps) {
  const colors = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container} testID={testID}>
      <TouchableOpacity
        style={styles.info}
        onPress={() => navigation.navigate('PlayerDetail', { id: request.requester.id })}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`View ${request.requester.name}'s profile`}
      >
        <PlayerAvatar
          photoUrl={request.requester.photo_url}
          name={request.requester.name}
          size={48}
        />
        <View style={styles.textInfo}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {request.requester.name}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.gray100 }]}
          onPress={onDecline}
          disabled={isDeclining}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Decline friend request"
        >
          {isDeclining ? (
            <GolfBallLoader size="sm" />
          ) : (
            <Icon source="close" size={20} color={colors.gray600} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.success }]}
          onPress={onAccept}
          disabled={isAccepting}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Accept friend request"
        >
          {isAccepting ? (
            <GolfBallLoader size="sm" />
          ) : (
            <Icon source="check" size={20} color={colors.white} />
          )}
        </TouchableOpacity>
      </View>
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
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FriendRequestCard;
