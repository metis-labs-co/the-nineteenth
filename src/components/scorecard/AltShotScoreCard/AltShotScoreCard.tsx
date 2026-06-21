/**
 * AltShotScoreCard
 *
 * One-ball score entry for Alt Shot (foursomes). Partners alternate shots on a
 * single ball, so this reuses TeamScoreCard's scoring logic (useTeamScoreControls)
 * and the shot-attribution sheet, but presents an Alt-Shot layout: an "ALT SHOT"
 * badge, an odd/even tee-to-go hint, and a per-player shot tally. Storage is
 * identical to scramble (one team scorecard), so finalization is unchanged.
 */
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { Hole, HoleScore, MultiBallHoleScore, ShotContributions } from '@/types';
import type { TeamWithMembers } from '@/types/database.types';
import type { ShotSlot } from '@/utils/teamScoring';
import { ShotContributionSheet } from '@/components/scorecard/TeamScoreCard/ShotContributionSheet';
import {
  useTeamScoreControls,
  SHEET_HEIGHT,
} from '@/components/scorecard/TeamScoreCard/hooks/useTeamScoreControls';

interface AltShotScoreCardProps {
  team: TeamWithMembers;
  currentHole: Hole;
  currentScore: HoleScore | MultiBallHoleScore | undefined;
  onScoreSelect: (strokes: number) => void;
  shotContributions?: ShotContributions;
  onShotContributionsChange?: (contributions: ShotContributions) => void;
  disabled?: boolean;
}

export const AltShotScoreCard = React.memo(function AltShotScoreCard({
  team,
  currentHole,
  currentScore,
  onScoreSelect,
  shotContributions,
  onShotContributionsChange,
  disabled = false,
}: AltShotScoreCardProps) {
  const colors = useThemeColors();
  const [activeShotType, setActiveShotType] = useState<ShotSlot | null>(null);
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

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
    teamMemberNames,
    handlePickUp,
    handleDecrement,
    handleIncrement,
    handleParSelect,
    handlePlayerSelectForShot,
    handleClearShot,
    getShotPlayerName,
    handleCloseModal,
  } = useTeamScoreControls({
    team,
    currentHole,
    currentScore,
    shotContributions,
    onShotContributionsChange,
    disabled,
    activeShotType,
    setActiveShotType,
    slideAnim,
    onScoreSelect,
  });

  const members = team.members ?? [];

  // Tee convention: index 0 tees odd holes, index 1 tees even holes.
  const teePlayerName = useMemo(() => {
    if (members.length < 2) return members[0]?.player?.name ?? '';
    const idx = currentHole.number % 2 === 1 ? 0 : 1;
    return members[idx]?.player?.name ?? '';
  }, [members, currentHole.number]);

  // Per-player shot tally for this hole, derived from the shotContributions prop.
  const tally = useMemo(() => {
    const counts = new Map<string, number>();
    const slots = shotContributions ?? {};
    for (const key of Object.keys(slots)) {
      const pid = (slots as Record<string, string | undefined>)[key];
      if (pid) counts.set(pid, (counts.get(pid) ?? 0) + 1);
    }
    return members.map((m) => ({
      name: m.player?.name ?? '',
      count: counts.get(m.player_id) ?? 0,
    }));
  }, [shotContributions, members]);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.teamInfo}>
          <View style={styles.teamNameRow}>
            <Icon source="swap-horizontal" size={20} color={colors.primary} />
            <Text
              style={[styles.teamName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {team.name}
            </Text>
          </View>
          {teamMemberNames ? (
            <Text
              style={[styles.teamMemberNames, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {teamMemberNames}
            </Text>
          ) : null}
          <View style={styles.formatRow}>
            <View style={[styles.formatBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.formatBadgeText, { color: colors.white }]}>
                ALT SHOT
              </Text>
            </View>
            <Text style={[styles.handicapLabel, { color: colors.textSecondary }]}>
              {'HC: '}
              {teamHandicap.toFixed(1)}
              {' • +'}
              {strokesOnHole}
              {' shot'}
              {strokesOnHole !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Tee-to-go hint */}
      {teePlayerName ? (
        <View style={[styles.teeHintRow, { borderTopColor: colors.border }]}>
          <Icon source="golf-tee" size={16} color={colors.textSecondary} />
          <Text style={[styles.teeHintText, { color: colors.textSecondary }]}>
            {teePlayerName}
            {' tees (hole '}
            {currentHole.number}
            {' • '}
            {currentHole.number % 2 === 1 ? 'odd' : 'even'}
            {')'}
          </Text>
        </View>
      ) : null}

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Score controls — mirrors TeamScoreCard */}
      <View style={styles.controlsContainer}>
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

        <View style={styles.stepperContainer}>
          <TouchableOpacity
            style={[
              styles.stepperButton,
              { borderColor: colors.gray300, backgroundColor: colors.surface },
              disabled && styles.buttonDisabled,
            ]}
            onPress={handleDecrement}
            disabled={disabled || (selectedScore !== undefined && selectedScore <= 1)}
            accessibilityLabel="Decrease score"
            accessibilityRole="button"
          >
            <Text style={[styles.stepperButtonText, { color: colors.textPrimary }]}>
              {'−'}
            </Text>
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
            accessibilityLabel="Increase score"
            accessibilityRole="button"
          >
            <Text style={[styles.stepperButtonText, { color: colors.textPrimary }]}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionButtonContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { borderColor: colors.gray300, backgroundColor: colors.surface },
              selectedScore === currentHole.par && {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
              },
              disabled && styles.buttonDisabled,
            ]}
            onPress={handleParSelect}
            disabled={disabled}
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

      {/* Shot attribution + tally */}
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
          <View style={styles.tallyRow}>
            {tally.map((t, i) => (
              <Text key={i} style={[styles.tallyText, { color: colors.textSecondary }]}>
                {t.name}
                {' '}
                {t.count}
                {i < tally.length - 1 ? '  •  ' : ''}
              </Text>
            ))}
          </View>
        </>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  teamInfo: {
    flex: 1,
  },
  teamNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  teamName: {
    ...typography.bodyBold,
    flexShrink: 1,
  },
  teamMemberNames: {
    ...typography.caption,
    marginTop: 2,
  },
  formatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  formatBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  formatBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 10,
  },
  handicapLabel: {
    ...typography.caption,
  },
  teeHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  teeHintText: {
    ...typography.caption,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButtonContainer: {
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    ...typography.h3,
  },
  actionLabel: {
    ...typography.caption,
    fontSize: 10,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepperButton: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    ...typography.h2,
  },
  scoreDisplay: {
    minWidth: 56,
    alignItems: 'center',
  },
  scoreDisplayText: {
    ...typography.h1,
  },
  tallyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  tallyText: {
    ...typography.caption,
  },
});
