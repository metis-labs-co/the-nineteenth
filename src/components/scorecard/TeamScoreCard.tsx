/**
 * TeamScoreCard Component
 *
 * Displays a team's scoring interface for Scramble format.
 * Features:
 * - Team name and combined handicap display
 * - Shots received and Stableford points indicators
 * - Single score entry for the whole team
 * - Contributing player selector (who made the shot)
 * - Large touch targets for on-course use
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon, Menu } from 'react-native-paper';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { getStrokesOnHole, calculateStablefordPoints } from '@/utils/scoring';
import type { Player, Hole, HoleScore } from '@/types';
import type { TeamWithMembers } from '@/types/database.types';

interface TeamScoreCardProps {
  team: TeamWithMembers;
  currentHole: Hole;
  currentScore: HoleScore | undefined;
  onScoreSelect: (strokes: number) => void;
  onContributorSelect?: (playerId: string) => void;
  selectedContributor?: string;
  disabled?: boolean;
}

// Pick up score - represents team giving up on the hole
const PICKUP_SCORE = 10;
const MIN_SCORE = 1;
const MAX_SCORE = 12;

/**
 * Calculate combined team handicap for Scramble format
 * Common formula: (lowest handicap + highest handicap) / 2 * 0.35
 * Or simplified: Average of all handicaps * team factor
 */
function calculateTeamHandicap(members: TeamWithMembers['members']): number {
  if (!members || members.length === 0) return 0;

  const handicaps = members
    .map((m) => m.player?.handicap ?? 0)
    .filter((h): h is number => typeof h === 'number')
    .sort((a, b) => a - b);

  if (handicaps.length === 0) return 0;

  // For 2-person Scramble: 35% of low + 15% of high
  // For 4-person Scramble: 20% of low + 15% of 2nd + 10% of 3rd + 5% of high
  // Simplified: Use 25% of the sum of all handicaps
  const sum = handicaps.reduce((acc, h) => acc + h, 0);
  return Math.round((sum * 0.25) * 10) / 10;
}

export const TeamScoreCard = React.memo(function TeamScoreCard({
  team,
  currentHole,
  currentScore,
  onScoreSelect,
  onContributorSelect,
  selectedContributor,
  disabled = false,
}: TeamScoreCardProps) {
  const colors = useThemeColors();
  const [contributorMenuVisible, setContributorMenuVisible] = useState(false);

  // Calculate team handicap
  const teamHandicap = useMemo(
    () => calculateTeamHandicap(team.members),
    [team.members]
  );

  // Create a mock "player" for handicap calculations
  const teamAsPlayer = useMemo(
    () => ({ handicap: teamHandicap } as Player),
    [teamHandicap]
  );

  // Calculate strokes received on this hole
  const strokesOnHole = useMemo(
    () => getStrokesOnHole(teamHandicap, currentHole),
    [teamHandicap, currentHole]
  );

  const selectedScore = currentScore?.strokes;
  const isPickedUp = selectedScore === PICKUP_SCORE;

  // Max score before pickup is par + 2 (double bogey)
  const maxScoreBeforePickup = currentHole.par + 2;

  // Calculate Stableford points for current score
  const stablefordPoints = useMemo(() => {
    if (!selectedScore || isPickedUp) return 0;
    return calculateStablefordPoints(selectedScore, teamHandicap, currentHole);
  }, [selectedScore, teamHandicap, currentHole, isPickedUp]);

  // Get selected contributor name
  const contributorName = useMemo(() => {
    if (!selectedContributor) return 'Select who made the shot';
    const member = team.members?.find((m) => m.player_id === selectedContributor);
    return member?.player?.name ?? 'Unknown';
  }, [selectedContributor, team.members]);

  const handlePickUp = useCallback(() => {
    if (!disabled) {
      onScoreSelect(PICKUP_SCORE);
    }
  }, [disabled, onScoreSelect]);

  const handleDecrement = useCallback(() => {
    if (!disabled) {
      if (isPickedUp) {
        onScoreSelect(maxScoreBeforePickup);
      } else {
        const newScore = selectedScore ? Math.max(MIN_SCORE, selectedScore - 1) : currentHole.par;
        onScoreSelect(newScore);
      }
    }
  }, [disabled, selectedScore, currentHole.par, onScoreSelect, isPickedUp, maxScoreBeforePickup]);

  const handleIncrement = useCallback(() => {
    if (!disabled && !isPickedUp) {
      const newScore = selectedScore ? Math.min(MAX_SCORE, selectedScore + 1) : currentHole.par;
      onScoreSelect(newScore);
    }
  }, [disabled, selectedScore, currentHole.par, onScoreSelect, isPickedUp]);

  const handleParSelect = useCallback(() => {
    if (!disabled) {
      onScoreSelect(currentHole.par);
    }
  }, [disabled, currentHole.par, onScoreSelect]);

  const handleContributorSelect = useCallback((playerId: string) => {
    setContributorMenuVisible(false);
    onContributorSelect?.(playerId);
  }, [onContributorSelect]);

  return (
    <View style={[styles.card, { backgroundColor: colors.white }]}>
      {/* Team Header */}
      <View style={styles.header}>
        <View style={styles.teamInfo}>
          <View style={styles.teamNameRow}>
            <Icon source="account-group" size={20} color={colors.primary} />
            <Text style={[styles.teamName, { color: colors.textPrimary }]} numberOfLines={1}>
              {team.name}
            </Text>
          </View>
          <Text style={[styles.handicapLabel, { color: colors.textSecondary }]}>
            Team HC: {teamHandicap.toFixed(1)} • {team.members?.length ?? 0} players
          </Text>
        </View>

        {/* Stats Display */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{strokesOnHole}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>SHOTS</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stablefordPoints}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>PTS</Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Score Controls */}
      <View style={styles.controlsContainer}>
        {/* Pick Up Button */}
        <View style={styles.actionButtonContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { borderColor: colors.gray300, backgroundColor: colors.white },
              isPickedUp && { backgroundColor: colors.primary, borderColor: colors.primary },
              disabled && styles.buttonDisabled,
            ]}
            onPress={handlePickUp}
            disabled={disabled}
            activeOpacity={0.7}
            accessibilityLabel="Pick up ball"
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.actionButtonText,
                { color: colors.textPrimary },
                isPickedUp && { color: colors.white },
              ]}
            >
              P
            </Text>
          </TouchableOpacity>
          <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>PICK UP</Text>
        </View>

        {/* Score Stepper */}
        <View style={styles.stepperContainer}>
          <TouchableOpacity
            style={[
              styles.stepperButton,
              { borderColor: colors.gray300, backgroundColor: colors.white },
              disabled && styles.buttonDisabled,
            ]}
            onPress={handleDecrement}
            disabled={disabled || (selectedScore !== undefined && selectedScore <= MIN_SCORE)}
            activeOpacity={0.7}
            accessibilityLabel="Decrease score"
            accessibilityRole="button"
          >
            <Text style={[styles.stepperButtonText, { color: colors.textPrimary }]}>−</Text>
          </TouchableOpacity>

          <View style={styles.scoreDisplay}>
            <Text style={[styles.scoreDisplayText, { color: colors.textPrimary }]}>
              {isPickedUp ? 'P' : (selectedScore ?? '-')}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.stepperButton,
              { borderColor: colors.gray300, backgroundColor: colors.white },
              (disabled || isPickedUp) && styles.buttonDisabled,
            ]}
            onPress={handleIncrement}
            disabled={disabled || isPickedUp || (selectedScore !== undefined && selectedScore >= MAX_SCORE)}
            activeOpacity={0.7}
            accessibilityLabel="Increase score"
            accessibilityRole="button"
          >
            <Text style={[styles.stepperButtonText, { color: colors.textPrimary }, isPickedUp && styles.disabledText]}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Par Button */}
        <View style={styles.actionButtonContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { borderColor: colors.gray300, backgroundColor: colors.white },
              selectedScore === currentHole.par && { backgroundColor: colors.primary, borderColor: colors.primary },
              disabled && styles.buttonDisabled,
            ]}
            onPress={handleParSelect}
            disabled={disabled}
            activeOpacity={0.7}
            accessibilityLabel={`Score par ${currentHole.par}`}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.actionButtonText,
                { color: colors.textPrimary },
                selectedScore === currentHole.par && { color: colors.white },
              ]}
            >
              {currentHole.par}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>PAR</Text>
        </View>
      </View>

      {/* Contributing Player Selector */}
      {onContributorSelect && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.contributorContainer}>
            <Text style={[styles.contributorLabel, { color: colors.textSecondary }]}>
              Contributed by:
            </Text>
            <Menu
              visible={contributorMenuVisible}
              onDismiss={() => setContributorMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  style={[
                    styles.contributorButton,
                    { borderColor: colors.gray300, backgroundColor: colors.white },
                  ]}
                  onPress={() => setContributorMenuVisible(true)}
                  disabled={disabled}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.contributorText,
                      { color: selectedContributor ? colors.textPrimary : colors.textTertiary },
                    ]}
                    numberOfLines={1}
                  >
                    {contributorName}
                  </Text>
                  <Icon source="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              }
            >
              {team.members?.map((member) => (
                <Menu.Item
                  key={member.player_id}
                  onPress={() => handleContributorSelect(member.player_id)}
                  title={member.player?.name ?? 'Unknown'}
                  leadingIcon={selectedContributor === member.player_id ? 'check' : undefined}
                />
              ))}
            </Menu>
          </View>
        </>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  teamInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  teamNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  teamName: {
    ...typography.h3,
    flexShrink: 1,
  },
  handicapLabel: {
    ...typography.body,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
  },
  statLabel: {
    ...typography.small,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    marginVertical: spacing.lg,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  actionButtonContainer: {
    alignItems: 'center',
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 28,
    fontWeight: '600',
  },
  actionLabel: {
    ...typography.caption,
    fontWeight: '600',
    marginTop: spacing.sm,
    letterSpacing: 0.5,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepperButton: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonText: {
    fontSize: 32,
    fontWeight: '400',
  },
  scoreDisplay: {
    width: 56,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreDisplayText: {
    fontSize: 40,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  disabledText: {
    opacity: 0.4,
  },
  contributorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  contributorLabel: {
    ...typography.body,
  },
  contributorButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    minHeight: 44,
  },
  contributorText: {
    ...typography.body,
    flex: 1,
    marginRight: spacing.sm,
  },
});

export default TeamScoreCard;
