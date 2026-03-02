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

import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Pressable, Animated, Dimensions } from 'react-native';
import { Text, Icon, Menu } from 'react-native-paper';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { getStrokesOnHole, calculateStablefordPoints } from '@/utils/scoring';
import type { Player, Hole, HoleScore, MultiBallHoleScore, ShotContributions } from '@/types';
import { isSingleBallScore } from '@/types/database';
import type { TeamWithMembers } from '@/types/database.types';
import { PICKUP_SCORE } from '@/constants/scoring';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;

interface TeamScoreCardProps {
  team: TeamWithMembers;
  currentHole: Hole;
  currentScore: HoleScore | MultiBallHoleScore | undefined;
  onScoreSelect: (strokes: number) => void;
  /** @deprecated Use onShotContributionsChange instead */
  onContributorSelect?: (playerId: string) => void;
  /** @deprecated Use shotContributions instead */
  selectedContributor?: string;
  /** Shot contributions for granular tracking (Drive, Approach, Putt) */
  shotContributions?: ShotContributions;
  /** Callback when shot contributions change */
  onShotContributionsChange?: (contributions: ShotContributions) => void;
  disabled?: boolean;
  /** Running total points for the team (thru previous holes) */
  runningTotalPoints?: number;
  /** Running total gross strokes for the team (thru previous holes) */
  runningTotalGross?: number;
  /** Current hole number for display */
  currentHoleNumber?: number;
}

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
  shotContributions,
  onShotContributionsChange,
  disabled = false,
  runningTotalPoints,
  runningTotalGross,
  currentHoleNumber,
}: TeamScoreCardProps) {
  const colors = useThemeColors();
  const [contributorMenuVisible, setContributorMenuVisible] = useState(false);
  const [activeShotType, setActiveShotType] = useState<'drive' | 'approach' | 'putt' | null>(null);
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  // Animate sheet when modal becomes visible
  useEffect(() => {
    if (activeShotType !== null) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      slideAnim.setValue(SHEET_HEIGHT);
    }
  }, [activeShotType, slideAnim]);

  // Close modal with animation
  const handleCloseModal = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: SHEET_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setActiveShotType(null);
    });
  }, [slideAnim]);

  // Determine if we should use the new shot contributions UI or the legacy contributor UI
  const usesShotContributions = !!onShotContributionsChange;

  // Calculate team handicap
  const teamHandicap = useMemo(
    () => calculateTeamHandicap(team.members),
    [team.members]
  );

  // Create a mock "player" for handicap calculations
  // Note: Not currently used but kept for future expansion
  const _teamAsPlayer = useMemo(
    () => ({ handicap: teamHandicap } as Player),
    [teamHandicap]
  );

  // Calculate strokes received on this hole
  const strokesOnHole = useMemo(
    () => getStrokesOnHole(teamHandicap, currentHole),
    [teamHandicap, currentHole]
  );

  // Narrow to single-ball score for accessing strokes
  const singleBallScore = currentScore && isSingleBallScore(currentScore) ? currentScore : undefined;
  const selectedScore = singleBallScore?.strokes;
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

  // Get team member names for display
  const teamMemberNames = useMemo(() => {
    if (!team.members || team.members.length === 0) return '';
    return team.members
      .map((m) => m.player?.name ?? 'Unknown')
      .join(' • ');
  }, [team.members]);

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

  // Shot contribution handlers
  const handleShotSelect = useCallback((shotType: 'drive' | 'approach' | 'putt', playerId: string | undefined) => {
    if (!onShotContributionsChange) return;
    onShotContributionsChange({
      ...shotContributions,
      [shotType]: playerId,
    });
    // Animate the close
    Animated.timing(slideAnim, {
      toValue: SHEET_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setActiveShotType(null);
    });
  }, [onShotContributionsChange, shotContributions, slideAnim]);

  const handlePlayerSelectForShot = useCallback((playerId: string) => {
    if (activeShotType) {
      handleShotSelect(activeShotType, playerId);
    }
  }, [activeShotType, handleShotSelect]);

  const handleClearShot = useCallback(() => {
    if (activeShotType) {
      handleShotSelect(activeShotType, undefined);
    }
  }, [activeShotType, handleShotSelect]);

  // Get player name for shot type
  const getShotPlayerName = useCallback((playerId: string | undefined): string => {
    if (!playerId) return 'Select player';
    const member = team.members?.find((m) => m.player_id === playerId);
    return member?.player?.name ?? 'Unknown';
  }, [team.members]);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {/* Team Header */}
      <View style={styles.header}>
        <View style={styles.teamInfo}>
          <View style={styles.teamNameRow}>
            <Icon source="account-group" size={20} color={colors.primary} />
            <Text style={[styles.teamName, { color: colors.textPrimary }]} numberOfLines={1}>
              {team.name}
            </Text>
          </View>
          {teamMemberNames && (
            <Text style={[styles.teamMemberNames, { color: colors.textSecondary }]} numberOfLines={2}>
              {teamMemberNames}
            </Text>
          )}
          <View style={styles.formatRow}>
            <View style={[styles.formatBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.formatBadgeText, { color: colors.white }]}>SCRAMBLE</Text>
            </View>
            <Text style={[styles.handicapLabel, { color: colors.textSecondary }]}>
              HC: {teamHandicap.toFixed(1)} • +{strokesOnHole} shot{strokesOnHole !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Stats Display */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {runningTotalPoints !== undefined ? runningTotalPoints + stablefordPoints : stablefordPoints}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>TEAM PTS</Text>
          </View>
        </View>
      </View>

      {/* Running Total Row */}
      {currentHoleNumber && currentHoleNumber > 1 && runningTotalGross !== undefined && (
        <View style={[styles.runningTotalRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.runningTotalText, { color: colors.textSecondary }]}>
            Thru {currentHoleNumber - 1}: {runningTotalGross} strokes • {runningTotalPoints ?? 0} pts
          </Text>
        </View>
      )}

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Score Controls */}
      <View style={styles.controlsContainer}>
        {/* Pick Up Button */}
        <View style={styles.actionButtonContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { borderColor: colors.gray300, backgroundColor: colors.surface },
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
              { borderColor: colors.gray300, backgroundColor: colors.surface },
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
              { borderColor: colors.gray300, backgroundColor: colors.surface },
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
              { borderColor: colors.gray300, backgroundColor: colors.surface },
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

      {/* Shot Contributions (new granular tracking) */}
      {usesShotContributions && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.shotContributionsContainer}>
            <Text style={[styles.shotContributionsTitle, { color: colors.textSecondary }]}>
              Shot Contributions
            </Text>

            {/* Shot type chips */}
            <View style={styles.shotChipsContainer}>
              {/* Drive */}
              <TouchableOpacity
                style={[
                  styles.shotChip,
                  { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
                  shotContributions?.drive && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                ]}
                onPress={() => setActiveShotType('drive')}
                disabled={disabled}
                activeOpacity={0.7}
              >
                <Icon source="golf-tee" size={16} color={shotContributions?.drive ? colors.primary : colors.textSecondary} />
                <View style={styles.shotChipContent}>
                  <Text style={[styles.shotChipLabel, { color: colors.textSecondary }]}>Drive</Text>
                  <Text
                    style={[
                      styles.shotChipPlayer,
                      { color: shotContributions?.drive ? colors.primary : colors.textTertiary }
                    ]}
                    numberOfLines={1}
                  >
                    {getShotPlayerName(shotContributions?.drive)}
                  </Text>
                </View>
                {shotContributions?.drive && (
                  <Icon source="check-circle" size={16} color={colors.primary} />
                )}
              </TouchableOpacity>

              {/* Approach */}
              <TouchableOpacity
                style={[
                  styles.shotChip,
                  { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
                  shotContributions?.approach && { backgroundColor: colors.success + '20', borderColor: colors.success },
                ]}
                onPress={() => setActiveShotType('approach')}
                disabled={disabled}
                activeOpacity={0.7}
              >
                <Icon source="flag" size={16} color={shotContributions?.approach ? colors.success : colors.textSecondary} />
                <View style={styles.shotChipContent}>
                  <Text style={[styles.shotChipLabel, { color: colors.textSecondary }]}>Approach</Text>
                  <Text
                    style={[
                      styles.shotChipPlayer,
                      { color: shotContributions?.approach ? colors.success : colors.textTertiary }
                    ]}
                    numberOfLines={1}
                  >
                    {getShotPlayerName(shotContributions?.approach)}
                  </Text>
                </View>
                {shotContributions?.approach && (
                  <Icon source="check-circle" size={16} color={colors.success} />
                )}
              </TouchableOpacity>

              {/* Putt */}
              <TouchableOpacity
                style={[
                  styles.shotChip,
                  { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
                  shotContributions?.putt && { backgroundColor: colors.warning + '20', borderColor: colors.warning },
                ]}
                onPress={() => setActiveShotType('putt')}
                disabled={disabled}
                activeOpacity={0.7}
              >
                <Icon source="circle-outline" size={16} color={shotContributions?.putt ? colors.warning : colors.textSecondary} />
                <View style={styles.shotChipContent}>
                  <Text style={[styles.shotChipLabel, { color: colors.textSecondary }]}>Putt</Text>
                  <Text
                    style={[
                      styles.shotChipPlayer,
                      { color: shotContributions?.putt ? colors.warning : colors.textTertiary }
                    ]}
                    numberOfLines={1}
                  >
                    {getShotPlayerName(shotContributions?.putt)}
                  </Text>
                </View>
                {shotContributions?.putt && (
                  <Icon source="check-circle" size={16} color={colors.warning} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Player Selection Modal */}
          <Modal
            visible={activeShotType !== null}
            transparent
            animationType="fade"
            onRequestClose={handleCloseModal}
          >
            <Pressable
              style={styles.modalOverlay}
              onPress={handleCloseModal}
            >
              <Animated.View
                style={[
                  styles.modalContent,
                  { backgroundColor: colors.surface },
                  { transform: [{ translateY: slideAnim }] },
                ]}
              >
                <Pressable onPress={(e) => e.stopPropagation()}>
                  <View style={styles.modalHandle}>
                    <View style={[styles.modalHandleBar, { backgroundColor: colors.gray300 }]} />
                  </View>

                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Select {activeShotType === 'drive' ? 'Drive' : activeShotType === 'approach' ? 'Approach' : 'Putt'} Contributor
                </Text>

                <ScrollView style={styles.modalPlayerList} showsVerticalScrollIndicator={false}>
                  {team.members?.map((member) => {
                    const isSelected = activeShotType === 'drive'
                      ? shotContributions?.drive === member.player_id
                      : activeShotType === 'approach'
                        ? shotContributions?.approach === member.player_id
                        : shotContributions?.putt === member.player_id;

                    const shotColor = activeShotType === 'drive'
                      ? colors.primary
                      : activeShotType === 'approach'
                        ? colors.success
                        : colors.warning;

                    return (
                      <TouchableOpacity
                        key={member.player_id}
                        style={[
                          styles.modalPlayerItem,
                          { backgroundColor: colors.surfaceVariant },
                          isSelected && { backgroundColor: shotColor + '20', borderColor: shotColor, borderWidth: 2 },
                        ]}
                        onPress={() => handlePlayerSelectForShot(member.player_id)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.modalPlayerAvatar, { backgroundColor: shotColor + '30' }]}>
                          <Text style={[styles.modalPlayerInitial, { color: shotColor }]}>
                            {(member.player?.name ?? 'U')[0].toUpperCase()}
                          </Text>
                        </View>
                        <Text style={[styles.modalPlayerName, { color: colors.textPrimary }]}>
                          {member.player?.name ?? 'Unknown'}
                        </Text>
                        {isSelected && (
                          <Icon source="check-circle" size={24} color={shotColor} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Clear selection button */}
                {((activeShotType === 'drive' && shotContributions?.drive) ||
                  (activeShotType === 'approach' && shotContributions?.approach) ||
                  (activeShotType === 'putt' && shotContributions?.putt)) && (
                  <TouchableOpacity
                    style={[styles.modalClearButton, { borderColor: colors.border }]}
                    onPress={handleClearShot}
                    activeOpacity={0.7}
                  >
                    <Icon source="close-circle-outline" size={20} color={colors.textSecondary} />
                    <Text style={[styles.modalClearText, { color: colors.textSecondary }]}>
                      Clear selection
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.modalCloseButton, { backgroundColor: colors.primary }]}
                  onPress={handleCloseModal}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalCloseText, { color: colors.white }]}>Done</Text>
                </TouchableOpacity>
                </Pressable>
              </Animated.View>
            </Pressable>
          </Modal>
        </>
      )}

      {/* Legacy Contributing Player Selector (deprecated) */}
      {!usesShotContributions && onContributorSelect && (
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
                    { borderColor: colors.gray300, backgroundColor: colors.surface },
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
  teamMemberNames: {
    ...typography.small,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  handicapLabel: {
    ...typography.small,
  },
  formatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  formatBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  formatBadgeText: {
    ...typography.captionBold,
    letterSpacing: 0.5,
  },
  runningTotalRow: {
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 1,
  },
  runningTotalText: {
    ...typography.small,
    textAlign: 'center',
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
  // Shot contributions styles
  shotContributionsContainer: {
    paddingTop: spacing.xs,
  },
  shotContributionsTitle: {
    ...typography.smallBold,
    marginBottom: spacing.md,
  },
  shotChipsContainer: {
    gap: spacing.sm,
  },
  shotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  shotChipContent: {
    flex: 1,
  },
  shotChipLabel: {
    ...typography.caption,
    marginBottom: 2,
  },
  shotChipPlayer: {
    ...typography.bodyBold,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '70%',
  },
  modalHandle: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  modalHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  modalTitle: {
    ...typography.h3,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalPlayerList: {
    maxHeight: 300,
  },
  modalPlayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  modalPlayerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPlayerInitial: {
    ...typography.h3,
    fontWeight: '600',
  },
  modalPlayerName: {
    ...typography.body,
    flex: 1,
  },
  modalClearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  modalClearText: {
    ...typography.body,
  },
  modalCloseButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  modalCloseText: {
    ...typography.bodyBold,
  },
});

export default TeamScoreCard;
