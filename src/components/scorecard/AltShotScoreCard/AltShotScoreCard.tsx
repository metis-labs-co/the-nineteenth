/**
 * AltShotScoreCard
 *
 * One-ball score entry for Alt Shot (foursomes). Partners alternate shots on a
 * single ball, so this reuses TeamScoreCard's scoring logic (useTeamScoreControls)
 * and presents an Alt-Shot layout: an "ALT SHOT" badge, a tee-to-go hint, a
 * one-time "who tees first" toggle on hole 1, and a per-player shot tally.
 *
 * Contributions are NOT entered by hand. The first-tee choice (stored as hole-1
 * teeShot) plus each hole's stroke count fully determines every shot via strict
 * alternation, so the tally is derived. Storage is identical to scramble (one
 * team scorecard), so finalization is unchanged.
 */
import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { Hole, HoleScore, MultiBallHoleScore, ShotContributions } from '@/types';
import type { TeamWithMembers } from '@/types/database.types';
import { altShotTeePlayer, deriveAltShotShotCounts } from '@/utils/teamScoring';
import { useTeamScoreControls } from '@/components/scorecard/TeamScoreCard/hooks/useTeamScoreControls';

interface AltShotScoreCardProps {
  team: TeamWithMembers;
  currentHole: Hole;
  currentScore: HoleScore | MultiBallHoleScore | undefined;
  onScoreSelect: (strokes: number) => void;
  shotContributions?: ShotContributions;
  onShotContributionsChange?: (contributions: ShotContributions) => void;
  /** Player who tees the 1st hole (stored as hole-1 teeShot). Drives all
   *  derivation. Falls back to the first team member when undefined. */
  firstTeePlayerId?: string;
  disabled?: boolean;
}

export const AltShotScoreCard = React.memo(function AltShotScoreCard({
  team,
  currentHole,
  currentScore,
  onScoreSelect,
  shotContributions,
  onShotContributionsChange,
  firstTeePlayerId,
  disabled = false,
}: AltShotScoreCardProps) {
  const colors = useThemeColors();

  const {
    teamHandicap,
    strokesOnHole,
    selectedScore,
    isPickedUp,
    teamMemberNames,
    handlePickUp,
    handleDecrement,
    handleIncrement,
    handleParSelect,
  } = useTeamScoreControls({
    team,
    currentHole,
    currentScore,
    onScoreSelect,
    shotContributions,
    onShotContributionsChange,
    disabled,
  });

  const members = useMemo(() => team.members ?? [], [team.members]);
  const firstTee = firstTeePlayerId ?? members[0]?.player_id;
  const partnerId = members.find((m) => m.player_id !== firstTee)?.player_id ?? firstTee ?? '';

  // Whose tee shot is it on this hole (derived from the first-tee choice).
  const teePlayerName = useMemo(() => {
    if (members.length < 2 || !firstTee) return members[0]?.player?.name ?? '';
    const teeId = altShotTeePlayer(firstTee, partnerId, currentHole.number);
    return members.find((m) => m.player_id === teeId)?.player?.name ?? '';
  }, [members, firstTee, partnerId, currentHole.number]);

  // Per-player shot tally for this hole, DERIVED from the stroke count.
  const tally = useMemo(() => {
    if (members.length < 2 || !firstTee) {
      return members.map((m) => ({ name: m.player?.name ?? '', count: 0 }));
    }
    const counts = deriveAltShotShotCounts(firstTee, partnerId, currentHole.number, selectedScore);
    return members.map((m) => ({
      name: m.player?.name ?? '',
      count: counts[m.player_id]?.total ?? 0,
    }));
  }, [members, firstTee, partnerId, currentHole.number, selectedScore]);

  const isFirstHole = currentHole.number === 1;
  const hasScore = selectedScore !== undefined && !isPickedUp;

  const handleSelectFirstTee = (playerId: string) => {
    if (disabled || !onShotContributionsChange) return;
    onShotContributionsChange({ ...shotContributions, teeShot: playerId });
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.teamInfo}>
          <View style={styles.teamNameRow}>
            <Icon source="swap-horizontal" size={20} color={colors.primary} />
            <Text style={[styles.teamName, { color: colors.textPrimary }]} numberOfLines={1}>
              {team.name}
            </Text>
          </View>
          {teamMemberNames ? (
            <Text style={[styles.teamMemberNames, { color: colors.textSecondary }]} numberOfLines={2}>
              {teamMemberNames}
            </Text>
          ) : null}
          <View style={styles.formatRow}>
            <View style={[styles.formatBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.formatBadgeText, { color: colors.white }]}>ALT SHOT</Text>
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

      {/* First-tee chooser — only on hole 1 */}
      {isFirstHole && members.length >= 2 ? (
        <View style={styles.firstTeeRow}>
          <Text style={[styles.firstTeeLabel, { color: colors.textSecondary }]}>
            Who tees off first?
          </Text>
          <View style={styles.firstTeeButtons}>
            {members.map((m) => {
              const selected = m.player_id === firstTee;
              return (
                <TouchableOpacity
                  key={m.player_id}
                  style={[
                    styles.firstTeeButton,
                    { borderColor: colors.gray300 },
                    selected && { backgroundColor: colors.primary, borderColor: colors.primary },
                    disabled && styles.buttonDisabled,
                  ]}
                  onPress={() => handleSelectFirstTee(m.player_id)}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={`${m.player?.name ?? 'Player'} tees first`}
                >
                  <Text
                    style={[
                      styles.firstTeeButtonText,
                      { color: colors.textPrimary },
                      selected && { color: colors.white },
                    ]}
                  >
                    {m.player?.name ?? 'Player'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
            <Text style={[styles.stepperButtonText, { color: colors.textPrimary }]}>{'−'}</Text>
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

      {/* Derived per-player shot tally */}
      {hasScore && members.length >= 2 ? (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.tallyRow}>
            {tally.map((t, i) => (
              <React.Fragment key={i}>
                <Text style={[styles.tallyText, { color: colors.textSecondary }]}>
                  {t.name}
                  {' '}
                  {t.count}
                </Text>
                {i < tally.length - 1 ? (
                  <Text style={[styles.tallyText, { color: colors.textSecondary }]}>
                    {'  •  '}
                  </Text>
                ) : null}
              </React.Fragment>
            ))}
          </View>
        </>
      ) : null}
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
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  teamInfo: { flex: 1 },
  teamNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  teamName: { ...typography.bodyBold, flexShrink: 1 },
  teamMemberNames: { ...typography.caption, marginTop: 2 },
  formatRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  formatBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  formatBadgeText: { ...typography.caption, fontWeight: '700', fontSize: 10 },
  handicapLabel: { ...typography.caption },
  teeHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  teeHintText: { ...typography.caption },
  firstTeeRow: { marginTop: spacing.sm, gap: spacing.xs },
  firstTeeLabel: { ...typography.caption },
  firstTeeButtons: { flexDirection: 'row', gap: spacing.sm },
  firstTeeButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  firstTeeButtonText: { ...typography.caption, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.sm },
  controlsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionButtonContainer: { alignItems: 'center', gap: 4 },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: { ...typography.h3 },
  actionLabel: { ...typography.caption, fontSize: 10 },
  buttonDisabled: { opacity: 0.4 },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepperButton: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: { ...typography.h2 },
  scoreDisplay: { minWidth: 56, alignItems: 'center' },
  scoreDisplayText: { ...typography.h1 },
  tallyRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.sm, flexWrap: 'wrap' },
  tallyText: { ...typography.caption },
});
