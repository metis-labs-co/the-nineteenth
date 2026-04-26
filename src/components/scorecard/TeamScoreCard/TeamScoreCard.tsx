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

import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Text, Icon, Menu } from 'react-native-paper';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { Hole, HoleScore, MultiBallHoleScore, ShotContributions } from '@/types';
import type { TeamWithMembers } from '@/types/database.types';
import type { ShotSlot } from '@/utils/teamScoring';

import { ShotContributionSheet } from './ShotContributionSheet';
import { useTeamScoreControls, SHEET_HEIGHT } from './hooks/useTeamScoreControls';

const SCREEN_HEIGHT = Dimensions.get('window').height;

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
  const [activeShotType, setActiveShotType] = useState<ShotSlot | null>(null);
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

  const {
    usesShotContributions,
    teamHandicap,
    strokesOnHole,
    selectedScore,
    isPickedUp,
    stablefordPoints,
    contributorName,
    teamMemberNames,
    handlePickUp,
    handleDecrement,
    handleIncrement,
    handleParSelect,
    handleContributorSelect,
    handlePlayerSelectForShot,
    handleClearShot,
    getShotPlayerName,
    handleCloseModal,
  } = useTeamScoreControls({
    team,
    currentHole,
    currentScore,
    onScoreSelect,
    onContributorSelect,
    selectedContributor,
    shotContributions,
    onShotContributionsChange,
    disabled,
    activeShotType,
    setActiveShotType,
    slideAnim,
  });

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
              HC: {teamHandicap.toFixed(1)} {'\u2022'} +{strokesOnHole} shot{strokesOnHole !== 1 ? 's' : ''}
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
            Thru {currentHoleNumber - 1}: {runningTotalGross} strokes {'\u2022'} {runningTotalPoints ?? 0} pts
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
            disabled={disabled || (selectedScore !== undefined && selectedScore <= 1)}
            activeOpacity={0.7}
            accessibilityLabel="Decrease score"
            accessibilityRole="button"
          >
            <Text style={[styles.stepperButtonText, { color: colors.textPrimary }]}>{'\u2212'}</Text>
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
            disabled={disabled || isPickedUp || (selectedScore !== undefined && selectedScore >= 12)}
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
          <ShotContributionSheet
            team={team}
            currentHole={currentHole}
            shotContributions={shotContributions}
            activeShotType={activeShotType}
            setActiveShotType={setActiveShotType}
            slideAnim={slideAnim}
            getShotPlayerName={getShotPlayerName}
            handlePlayerSelectForShot={handlePlayerSelectForShot}
            handleClearShot={handleClearShot}
            handleCloseModal={handleCloseModal}
            disabled={disabled}
          />
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
                  onPress={() => {
                    setContributorMenuVisible(false);
                    handleContributorSelect(member.player_id);
                  }}
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
