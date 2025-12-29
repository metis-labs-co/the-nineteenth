// src/components/rounds/RoundListCard/RoundCardMeta.tsx

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { IconMapPin, IconUsers } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { StatusBadge, DateTimeDisplay, ProgressBar } from '@/components/common';
import { RoundListCardData, formatGameType } from './types';

interface RoundCardMetaProps {
  round: RoundListCardData;
  currentUserId?: string;
}

/**
 * RoundCardMeta - Course info, players, date, game type, and progress
 */
export const RoundCardMeta = React.memo(function RoundCardMeta({
  round,
  currentUserId,
}: RoundCardMetaProps) {
  const colors = useThemeColors();

  /**
   * Format course display name
   */
  const getCourseDisplayName = () => {
    if (round.course.venueName) {
      if (round.course.venueName !== round.course.name) {
        return `${round.course.venueName} (${round.course.name})`;
      }
      return round.course.venueName;
    }
    return round.course.name;
  };

  /**
   * Format players list with "You" for current user
   */
  const getPlayersDisplay = () => {
    if (!round.players) return '';
    return round.players
      .map((p) => (p.id === currentUserId ? 'You' : p.name.split(' ')[0]))
      .join(', ');
  };

  return (
    <>
      {/* Playing Partners (for standalone rounds with players) */}
      {round.isStandalone && round.players && round.players.length > 1 && (
        <View style={styles.playersRow}>
          <IconUsers size={14} color={colors.textSecondary} />
          <Text style={[styles.playersText, { color: colors.textSecondary }]}>
            {getPlayersDisplay()}
          </Text>
        </View>
      )}

      {/* Course Info */}
      <View style={styles.courseRow}>
        <IconMapPin size={16} color={colors.textSecondary} />
        <Text style={[styles.courseName, { color: colors.textSecondary }]}>
          {getCourseDisplayName()}
        </Text>
      </View>

      {/* Date and Game Type */}
      <View style={styles.detailsRow}>
        {round.date && (
          <DateTimeDisplay date={round.date} time={round.teeTime} size="md" />
        )}
        <StatusBadge
          status="completed"
          label={formatGameType(round.gameType)}
          size="sm"
        />
      </View>

      {/* Progress (if in progress) */}
      {round.status === 'in-progress' && (
        <ProgressBar
          value={round.holesCompleted}
          max={round.totalHoles}
          label={`${round.holesCompleted}/${round.totalHoles} holes`}
          style={styles.progressRow}
        />
      )}
    </>
  );
});

const styles = StyleSheet.create({
  playersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  playersText: {
    ...typography.small,
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  courseName: {
    ...typography.small,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  progressRow: {
    marginTop: spacing.sm,
  },
});
