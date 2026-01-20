/**
 * LeaderboardRow - Individual player/team row for table-based leaderboards
 *
 * Shared component used by StablefordLeaderboard and StrokePlayLeaderboard
 * Handles:
 * - Position display with trophy for first place
 * - Player/team name with team members
 * - Handicap display
 * - Score display (customizable columns)
 * - Current user highlighting
 * - Tied position indicator
 */

import React from 'react';
import { View, Pressable } from 'react-native';
import { Text, Tooltip } from 'react-native-paper';
import { IconTrophy, IconAlertTriangle } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import {
  type RoundLeaderboardEntry,
  isTeamEntry,
} from '@/hooks/useRoundLeaderboard';
import {
  getEntryName,
  getEntryId,
  getEntryHandicap,
  isCurrentUserEntry,
} from './leaderboardUtils';
import { styles } from './RoundLeaderboard.styles';

export interface LeaderboardRowProps {
  /** The leaderboard entry data */
  entry: RoundLeaderboardEntry;
  /** Current user ID for highlighting */
  currentUserId?: string;
  /** Whether this entry is tied with the previous */
  isTied: boolean;
  /** Primary score to display */
  scoreDisplay: string;
  /** Score column header label */
  scoreLabel: string;
  /** Secondary score (e.g., gross for stroke play) */
  secondaryScore?: string;
  /** Secondary score label */
  secondaryLabel?: string;
}

export const LeaderboardRow = React.memo(function LeaderboardRow({
  entry,
  currentUserId,
  isTied,
  scoreDisplay,
  scoreLabel,
  secondaryScore,
  secondaryLabel,
}: LeaderboardRowProps) {
  const colors = useThemeColors();

  const isCurrentUser = isCurrentUserEntry(entry, currentUserId);
  const isFirstPlace = entry.position === 1;
  const name = getEntryName(entry);
  const handicap = getEntryHandicap(entry);
  const id = getEntryId(entry);

  // Build accessibility label
  const bypassedText = entry.bypassed ? ', unverified submission' : '';
  const accessibilityLabel = `Position ${entry.position}${isTied ? ' tied' : ''}: ${name}, Handicap ${handicap}, ${scoreDisplay} ${scoreLabel}${secondaryScore ? `, ${secondaryScore} ${secondaryLabel}` : ''}${bypassedText}`;

  return (
    <View
      key={id}
      style={[
        styles.tableRow,
        { borderBottomColor: colors.borderLight },
        isCurrentUser && { backgroundColor: `${colors.primary}15` },
        isFirstPlace && { backgroundColor: `${colors.warning}10` },
      ]}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
    >
      {/* Position */}
      <View style={[styles.cell, styles.positionCol]}>
        {isFirstPlace ? (
          <IconTrophy size={18} color={colors.warning} />
        ) : (
          <Text
            style={[
              styles.positionText,
              { color: colors.textSecondary },
              isCurrentUser && { color: colors.primary },
            ]}
          >
            {entry.position}
            {isTied && <Text style={styles.tiedIndicator}>T</Text>}
          </Text>
        )}
      </View>

      {/* Name */}
      <View style={[styles.cell, styles.nameCol]}>
        <View style={styles.nameRow}>
          <Text
            style={[
              styles.nameText,
              { color: colors.textPrimary },
              isCurrentUser && { color: colors.primary, fontWeight: '600' },
            ]}
            numberOfLines={1}
          >
            {isCurrentUser ? 'You' : name}
          </Text>
          {entry.bypassed && (
            <Tooltip title="Submitted without partner verification">
              <Pressable
                accessibilityLabel="Unverified submission"
                accessibilityHint="This scorecard was submitted without partner verification"
              >
                <IconAlertTriangle
                  size={14}
                  color={colors.warning}
                  style={styles.bypassIcon}
                />
              </Pressable>
            </Tooltip>
          )}
        </View>
        {isTeamEntry(entry) && entry.members.length > 0 && (
          <Text
            style={[styles.membersText, { color: colors.textTertiary }]}
            numberOfLines={1}
          >
            {entry.members.map((m) => m.playerName).join(', ')}
          </Text>
        )}
      </View>

      {/* Handicap */}
      <View style={[styles.cell, styles.handicapCol]}>
        <Text
          style={[
            styles.handicapText,
            { color: colors.textSecondary },
            isCurrentUser && { color: colors.primary },
          ]}
        >
          {handicap}
        </Text>
      </View>

      {/* Primary Score */}
      <View style={[styles.cell, styles.scoreCol]}>
        <Text
          style={[
            styles.scoreText,
            { color: colors.textPrimary },
            isCurrentUser && { color: colors.primary },
            isFirstPlace && { color: colors.warningDark },
          ]}
        >
          {scoreDisplay}
        </Text>
      </View>

      {/* Secondary Score (optional) */}
      {secondaryScore !== undefined && (
        <View style={[styles.cell, styles.grossCol]}>
          <Text
            style={[
              styles.grossText,
              { color: colors.textSecondary },
              isCurrentUser && { color: colors.primary },
            ]}
          >
            {secondaryScore}
          </Text>
        </View>
      )}
    </View>
  );
});
