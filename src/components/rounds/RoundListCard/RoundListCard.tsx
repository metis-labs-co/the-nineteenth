// src/components/rounds/RoundListCard/RoundListCard.tsx

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { IconChevronRight } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';
import { CardContainer } from '@/components/common';
import { RoundListCardData, RoundListCardProps } from './types';
import { RoundCardHeader } from './RoundCardHeader';
import { RoundCardMeta } from './RoundCardMeta';

/**
 * RoundListCard - Displays a round card in a list
 *
 * Shows round information including:
 * - Status badge (upcoming, in-progress, completed)
 * - Round number (for competition rounds)
 * - Competition/Practice label
 * - Course name and location
 * - Date and tee time
 * - Game type
 * - Progress bar (for in-progress rounds)
 *
 * @example
 * ```tsx
 * <RoundListCard
 *   round={{
 *     id: '1',
 *     course: { id: 'c1', name: 'Royal Melbourne' },
 *     competition: { id: 'comp1', name: 'Summer Series' },
 *     status: 'in-progress',
 *     date: '2025-01-15',
 *     teeTime: '10:30 AM',
 *     gameType: 'stableford',
 *     roundNumber: 2,
 *     totalRounds: 4,
 *     holesCompleted: 9,
 *     totalHoles: 18,
 *   }}
 *   onPress={(round) => console.log('Pressed:', round.id)}
 * />
 * ```
 */
export const RoundListCard = React.memo(function RoundListCard<
  T extends RoundListCardData = RoundListCardData,
>({
  round,
  onPress,
  onDelete,
  swipeEnabled = false,
  actionLabel,
  currentUserId,
  testID,
}: RoundListCardProps<T>) {
  const colors = useThemeColors();

  const handlePress = useCallback(() => {
    onPress(round);
  }, [onPress, round]);

  const handleDelete = useCallback(() => {
    onDelete?.(round);
  }, [onDelete, round]);

  const getAccessibilityLabel = () => {
    const status = round.status === 'in-progress' ? 'Score' : 'View';
    const location = round.course.venueName || round.course.name;
    const deleteHint = swipeEnabled ? ', swipe left to delete' : '';
    return `${actionLabel || status} round at ${location}${deleteHint}`;
  };

  const cardContent = (
    <View style={styles.contentWrapper}>
      <View style={styles.content}>
        <RoundCardHeader round={round} />
        <RoundCardMeta round={round} currentUserId={currentUserId} />
      </View>
      <View style={styles.arrow}>
        <IconChevronRight size={20} color={colors.gray400} />
      </View>
    </View>
  );

  // If swipeable, use custom delete button via RoundCardActions
  if (swipeEnabled && onDelete) {
    return (
      <CardContainer
        onPress={handlePress}
        swipeable
        onDelete={handleDelete}
        accessibilityLabel={getAccessibilityLabel()}
        deleteAccessibilityName={round.course.name}
        testID={testID}
        style={styles.cardStyle}
      >
        {cardContent}
      </CardContainer>
    );
  }

  // Simple card without swipe
  return (
    <CardContainer
      onPress={handlePress}
      accessibilityLabel={getAccessibilityLabel()}
      testID={testID}
      style={styles.cardStyle}
    >
      {cardContent}
    </CardContainer>
  );
});

const styles = StyleSheet.create({
  cardStyle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  arrow: {
    marginLeft: spacing.md,
  },
});
