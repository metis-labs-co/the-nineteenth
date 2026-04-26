/**
 * GenerateBracketSheet - Bottom sheet for configuring and generating the bracket
 *
 * Premium organisers (advanced_round_rules) get additional controls:
 *   - 'qualifying' seeding method: bracket auto-seeded from prior round results
 *     + per-round multi-select (which rounds count as qualifying)
 *     + metric picker (Stableford points / net strokes / competition points)
 *   - Bracket style toggle: 'standard' (1vN, 2vN-1, …) or 'adjacent' (1v2, 3v4, …)
 *
 * Free / Social organisers see only the original handicap / random controls
 * — the extra rows are hidden so the flow stays identical to today.
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/context/ThemeContext';
import { useCheckFeature } from '@/context/SubscriptionContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { SegmentedButton } from '@/components/common/SegmentedButton';
import { GolfBallLoader } from '@/components/common';
import { Pill } from '@/components/common/Pill';
import type {
  SeedingMethod,
  BracketSeedingStyle,
  QualifyingMetric,
} from '@/types/database';
import type { RoundWithCourse } from '@/components/competitions/detail/types';

export interface GenerateBracketConfig {
  seedingMethod: SeedingMethod;
  bracketSeedingStyle: BracketSeedingStyle;
  qualifyingRoundIds?: string[];
  qualifyingMetric?: QualifyingMetric;
}

export interface GenerateBracketSheetProps {
  visible: boolean;
  onClose: () => void;
  playerCount: number;
  isValidCount: boolean;
  onGenerate: (config: GenerateBracketConfig) => void;
  isGenerating: boolean;
  /**
   * Rounds in this competition. Used to populate the qualifying multi-select
   * when seedingMethod === 'qualifying'. Only rounds with `status = 'completed'`
   * are offered.
   */
  rounds?: RoundWithCourse[];
}

type MethodOption = { value: SeedingMethod; label: string; icon: string };

export function GenerateBracketSheet({
  visible,
  onClose,
  playerCount,
  isValidCount,
  onGenerate,
  isGenerating,
  rounds = [],
}: GenerateBracketSheetProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const checkFeature = useCheckFeature();
  const hasAdvancedRules = checkFeature('advanced_round_rules').allowed;

  const [seedingMethod, setSeedingMethod] = useState<SeedingMethod>('handicap');
  const [bracketStyle, setBracketStyle] = useState<BracketSeedingStyle>('standard');
  const [qualifyingRoundIds, setQualifyingRoundIds] = useState<string[]>([]);
  const [qualifyingMetric, setQualifyingMetric] = useState<QualifyingMetric>('competition_points');

  const methodOptions: MethodOption[] = useMemo(() => {
    const base: MethodOption[] = [
      { value: 'handicap', label: 'By Handicap', icon: 'sort-ascending' },
      { value: 'random', label: 'Random', icon: 'shuffle-variant' },
    ];
    if (hasAdvancedRules) {
      base.push({ value: 'qualifying', label: 'Qualifying', icon: 'trophy-outline' });
    }
    return base;
  }, [hasAdvancedRules]);

  const qualifyingEligibleRounds = useMemo(
    () => rounds.filter((r) => r.status === 'completed'),
    [rounds]
  );

  const canGenerate =
    isValidCount &&
    !isGenerating &&
    (seedingMethod !== 'qualifying' || qualifyingRoundIds.length > 0);

  const handleGenerate = () => {
    if (!canGenerate) return;
    onGenerate({
      seedingMethod,
      bracketSeedingStyle: bracketStyle,
      qualifyingRoundIds:
        seedingMethod === 'qualifying' ? qualifyingRoundIds : undefined,
      qualifyingMetric:
        seedingMethod === 'qualifying' ? qualifyingMetric : undefined,
    });
  };

  const toggleQualifyingRound = (roundId: string) => {
    setQualifyingRoundIds((prev) =>
      prev.includes(roundId) ? prev.filter((id) => id !== roundId) : [...prev, roundId]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: insets.bottom + spacing.lg,
            },
          ]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.gray300 }]} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Title */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Generate Bracket
            </Text>

            {/* Player count info */}
            <View style={[styles.infoRow, { backgroundColor: colors.surfaceVariant }]}>
              <Icon
                source={isValidCount ? 'check-circle' : 'alert-circle'}
                size={20}
                color={isValidCount ? colors.success : colors.warning}
              />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {isValidCount
                  ? `${playerCount} players — ready to generate`
                  : `${playerCount} players — need exactly 4, 8, 16, or 32 players`}
              </Text>
            </View>

            {/* Seeding method */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Seeding Method
            </Text>
            <SegmentedButton<SeedingMethod>
              value={seedingMethod}
              onValueChange={setSeedingMethod}
              buttons={methodOptions}
              style={styles.seedingToggle}
            />
            <Text style={[styles.seedingHint, { color: colors.textDisabled }]}>
              {seedingMethod === 'handicap'
                ? 'Lowest handicap = seed #1. Ensures top players don\'t meet until later rounds.'
                : seedingMethod === 'random'
                ? 'Players are randomly seeded. Fair for casual competitions.'
                : 'Top qualifier = seed #1. Seeds come from the individual standings across the rounds you select below.'}
            </Text>

            {/* Qualifying-specific controls */}
            {seedingMethod === 'qualifying' && (
              <View style={styles.qualifyingBlock}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  Qualifying Rounds
                </Text>
                {qualifyingEligibleRounds.length === 0 ? (
                  <View style={[styles.emptyRoundsCard, { backgroundColor: colors.surfaceVariant }]}>
                    <Icon source="information-outline" size={18} color={colors.textSecondary} />
                    <Text style={[styles.emptyRoundsText, { color: colors.textSecondary }]}>
                      No completed rounds yet. Complete at least one qualifying round before generating the bracket.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.roundList}>
                    {qualifyingEligibleRounds.map((round) => {
                      const selected = qualifyingRoundIds.includes(round.id);
                      return (
                        <TouchableOpacity
                          key={round.id}
                          onPress={() => toggleQualifyingRound(round.id)}
                          style={[
                            styles.roundRow,
                            {
                              borderColor: selected ? colors.primary : colors.border,
                              backgroundColor: selected
                                ? colors.surfaceVariant
                                : colors.surface,
                            },
                          ]}
                          activeOpacity={0.7}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: selected }}
                        >
                          <Icon
                            source={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                            size={20}
                            color={selected ? colors.primary : colors.textSecondary}
                          />
                          <View style={styles.roundRowText}>
                            <Text style={[styles.roundLabel, { color: colors.textPrimary }]}>
                              {round.name || `Round ${round.round_number}`}
                            </Text>
                            <Text style={[styles.roundSubLabel, { color: colors.textSecondary }]}>
                              {round.course?.name ?? 'Course not set'} · {round.game_type}
                            </Text>
                          </View>
                          {round.rules_override?.template_id && (
                            <Pill label="Custom rules" variant="info" size="sm" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: spacing.lg }]}>
                  Qualifying Metric
                </Text>
                <SegmentedButton<QualifyingMetric>
                  value={qualifyingMetric}
                  onValueChange={setQualifyingMetric}
                  buttons={[
                    { value: 'competition_points', label: 'Points' },
                    { value: 'stableford_points', label: 'Stableford' },
                    { value: 'net_strokes', label: 'Net' },
                  ]}
                  style={styles.seedingToggle}
                />
                <Text style={[styles.seedingHint, { color: colors.textDisabled }]}>
                  {qualifyingMetric === 'competition_points'
                    ? 'Competition points earned across qualifying rounds (honors per-round rules).'
                    : qualifyingMetric === 'stableford_points'
                    ? 'Cumulative Stableford points across qualifying rounds.'
                    : 'Lowest total net strokes across qualifying rounds wins seed #1.'}
                </Text>
              </View>
            )}

            {/* Bracket style (Premium only) */}
            {hasAdvancedRules && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  Bracket Style
                </Text>
                <SegmentedButton<BracketSeedingStyle>
                  value={bracketStyle}
                  onValueChange={setBracketStyle}
                  buttons={[
                    { value: 'standard', label: 'Standard', icon: 'arrange-send-backward' },
                    { value: 'adjacent', label: 'Adjacent', icon: 'arrow-left-right' },
                  ]}
                  style={styles.seedingToggle}
                />
                <Text style={[styles.seedingHint, { color: colors.textDisabled }]}>
                  {bracketStyle === 'standard'
                    ? 'Classic bracket (1vN, 2vN-1, …). Top seed rewarded; favourites meet late.'
                    : 'Adjacent pairings (1v2, 3v4, …). Every match is closely-matched — ideal for social play.'}
                </Text>
              </>
            )}

            {/* Generate button */}
            <TouchableOpacity
              style={[
                styles.generateButton,
                {
                  backgroundColor: canGenerate ? colors.primary : colors.gray300,
                },
              ]}
              onPress={handleGenerate}
              disabled={!canGenerate}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Generate bracket"
            >
              {isGenerating ? (
                <GolfBallLoader size="sm" />
              ) : (
                <>
                  <Icon source="tournament" size={20} color={colors.white} />
                  <Text style={[styles.generateButtonText, { color: colors.white }]}>
                    Generate Bracket
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Warning */}
            <Text style={[styles.warning, { color: colors.textDisabled }]}>
              This will create all rounds and match slots. Players cannot be added or removed after bracket generation.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
    ...shadows.lg,
  },
  scrollContent: {
    paddingBottom: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  infoText: {
    ...typography.body,
    flex: 1,
  },
  sectionLabel: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  seedingToggle: {
    marginBottom: spacing.sm,
  },
  seedingHint: {
    ...typography.caption,
    marginBottom: spacing.xl,
  },
  qualifyingBlock: {
    marginBottom: spacing.md,
  },
  emptyRoundsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  emptyRoundsText: {
    ...typography.small,
    flex: 1,
  },
  roundList: {
    gap: spacing.xs,
  },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  roundRowText: {
    flex: 1,
  },
  roundLabel: {
    ...typography.bodyBold,
  },
  roundSubLabel: {
    ...typography.caption,
    marginTop: 2,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  generateButtonText: {
    ...typography.bodyBold,
  },
  warning: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
