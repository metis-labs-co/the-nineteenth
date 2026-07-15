/**
 * BracketTab - Main bracket tab for knockout competitions
 *
 * Shows the bracket visualization with:
 * - Champion gold banner once the final is decided
 * - Toggle between main and consolation brackets
 * - Stage pager buttons with match cards for each stage
 * - "Seed & generate" hero when the bracket is not yet generated
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { HeroCard, heroPalette } from '@/components/common';
import { heroCtaBlueGradient } from '@/components/common/HeroCard';
import { useKnockoutBracket, useGenerateBracket } from '@/hooks/useKnockoutBracket';
import { isValidPlayerCount, getStageName } from '@/utils/bracketGeneration';
import { BracketToggle } from './BracketToggle';
import { BracketStageIndicator } from './BracketStageIndicator';
import { BracketStageView } from './BracketStageView';
import { GenerateBracketSheet, type GenerateBracketConfig } from './GenerateBracketSheet';
import type {
  BracketType,
  KnockoutConfig,
  KnockoutMatchWithPlayers,
} from '@/types/database';
import type { RoundWithCourse } from '@/components/competitions/detail/types';

export interface BracketTabProps {
  competitionId: string;
  knockoutConfig: KnockoutConfig | null;
  playerCount: number;
  currentUserId?: string;
  isOrganizer: boolean;
  /** Competition rounds — used by the generate sheet to offer qualifying-round selection. */
  rounds?: RoundWithCourse[];
  onMatchPress?: (match: KnockoutMatchWithPlayers) => void;
}

export const BracketTab = React.memo(function BracketTab({
  competitionId,
  knockoutConfig,
  playerCount,
  currentUserId,
  isOrganizer,
  rounds,
  onMatchPress,
}: BracketTabProps) {
  const colors = useThemeColors();
  const [activeBracket, setActiveBracket] = useState<BracketType>('main');
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [showGenerateSheet, setShowGenerateSheet] = useState(false);

  const bracketGenerated = knockoutConfig?.bracketGenerated ?? false;
  const configPlayerCount = knockoutConfig?.playerCount ?? playerCount;

  const { bracketData, isLoading } = useKnockoutBracket(
    competitionId,
    configPlayerCount,
    bracketGenerated
  );

  const { mutate: generateBracket, isPending: isGenerating } = useGenerateBracket();

  // Get active bracket stages
  const activeStages = useMemo(() => {
    if (!bracketData) return [];
    return activeBracket === 'main'
      ? bracketData.mainBracket
      : bracketData.consolationBracket;
  }, [bracketData, activeBracket]);

  const hasConsolation = (bracketData?.consolationBracket?.length ?? 0) > 0;

  // Champion of the main bracket — the winner of the decided final
  const champion = useMemo(() => {
    const mainBracket = bracketData?.mainBracket;
    if (!mainBracket || mainBracket.length === 0) return null;
    const finalMatch = mainBracket[mainBracket.length - 1]?.matches?.[0];
    if (!finalMatch || finalMatch.status !== 'completed' || !finalMatch.winner_id) {
      return null;
    }
    if (finalMatch.winner) return finalMatch.winner;
    return finalMatch.player1?.id === finalMatch.winner_id
      ? finalMatch.player1
      : finalMatch.player2 ?? null;
  }, [bracketData]);

  // Current active stage
  const currentStage = activeStages[activeStageIndex] ?? null;

  const handleStagePress = useCallback((stage: number) => {
    const idx = activeStages.findIndex(s => s.stage === stage);
    if (idx >= 0) setActiveStageIndex(idx);
  }, [activeStages]);

  const handleBracketToggle = useCallback((value: BracketType) => {
    setActiveBracket(value);
    setActiveStageIndex(0);
  }, []);

  const handleGenerate = useCallback((config: GenerateBracketConfig) => {
    generateBracket(
      {
        competitionId,
        seedingMethod: config.seedingMethod,
        bracketSeedingStyle: config.bracketSeedingStyle,
        qualifyingRoundIds: config.qualifyingRoundIds,
        qualifyingMetric: config.qualifyingMetric,
      },
      {
        onSuccess: () => setShowGenerateSheet(false),
      }
    );
  }, [competitionId, generateBracket]);

  // --- Not yet generated state ---
  if (!bracketGenerated) {
    const validCount = isValidPlayerCount(playerCount);
    // Seeds are only assigned when the bracket is generated (seeding method is
    // chosen in the generate sheet), so no seeds list can be shown here yet.
    const totalStages = validCount ? Math.round(Math.log2(playerCount)) : 0;
    const stageNames = validCount
      ? Array.from({ length: totalStages }, (_, i) => getStageName(i, totalStages, 'main'))
      : [];
    const stagesText =
      stageNames.length > 1
        ? `${stageNames.slice(0, -1).join(', ')} and ${stageNames[stageNames.length - 1]}`
        : stageNames[0] ?? '';

    return (
      <View>
        <HeroCard variant="blue" padding={22}>
          <View style={[styles.heroIconSquare, { backgroundColor: heroPalette.iconTintBlue }]}>
            <Icon source="tournament" size={26} color={heroPalette.eyebrowBlue} />
          </View>
          <Text style={styles.heroTitle}>Seed & generate the bracket</Text>
          <Text style={[styles.heroDescription, { color: heroPalette.mutedBlue }]}>
            {validCount
              ? `${playerCount} players will be seeded when the bracket is generated. Draws the ${stagesText} automatically.`
              : `Need exactly 4, 8, 16, or 32 players. Currently ${playerCount} players.`}
          </Text>
          {isOrganizer && (
            <TouchableOpacity
              onPress={() => validCount && setShowGenerateSheet(true)}
              disabled={!validCount}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Generate bracket"
              accessibilityState={{ disabled: !validCount }}
              style={!validCount && styles.generateCtaDisabled}
            >
              <LinearGradient
                colors={heroCtaBlueGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.generateCta}
              >
                <Text style={styles.generateCtaText}>Generate bracket</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </HeroCard>

        <GenerateBracketSheet
          visible={showGenerateSheet}
          onClose={() => setShowGenerateSheet(false)}
          playerCount={playerCount}
          isValidCount={validCount}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          rounds={rounds}
        />
      </View>
    );
  }

  // --- Loading state ---
  if (isLoading) {
    return (
      <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
          Loading bracket...
        </Text>
      </View>
    );
  }

  // --- No data ---
  if (!bracketData || activeStages.length === 0) {
    return (
      <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Icon source="alert-circle-outline" size={48} color={colors.gray300} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          No bracket data
        </Text>
      </View>
    );
  }

  // --- Bracket view ---
  return (
    <View>
      {/* Champion banner (final decided) */}
      {champion && (
        <HeroCard variant="gold" padding={spacing.lg + 2} style={styles.championBanner}>
          <View style={styles.championRow}>
            <View
              style={[styles.championIconSquare, { backgroundColor: heroPalette.iconTintGold }]}
            >
              <Icon source="trophy-outline" size={24} color={heroPalette.gold} />
            </View>
            <View style={styles.championTextBlock}>
              <Text style={[styles.championEyebrow, { color: heroPalette.eyebrowGold }]}>
                Champion
              </Text>
              <Text style={styles.championName} numberOfLines={1}>
                {champion.name}
              </Text>
            </View>
          </View>
        </HeroCard>
      )}

      {/* Bracket toggle (main/consolation) */}
      <BracketToggle
        value={activeBracket}
        onValueChange={handleBracketToggle}
        hasConsolation={hasConsolation}
        style={styles.toggle}
      />

      {/* Stage pager buttons */}
      <BracketStageIndicator
        stages={activeStages.map(s => ({ stage: s.stage, stageName: s.stageName }))}
        activeStage={currentStage?.stage ?? 0}
        onStagePress={handleStagePress}
      />

      {/* Stage matches */}
      {currentStage && (
        <BracketStageView
          stage={currentStage}
          currentUserId={currentUserId}
          onMatchPress={onMatchPress}
        />
      )}

      {/* Navigation hint */}
      {activeStages.length > 1 && (
        <View style={styles.navHint}>
          <Text style={[styles.navHintText, { color: colors.textTertiary }]}>
            Tap a stage above to navigate
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  toggle: {
    marginBottom: spacing.md - 2,
  },
  // Not-generated hero (design L626-631)
  heroIconSquare: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: heroPalette.text,
    marginTop: spacing.lg,
  },
  heroDescription: {
    fontSize: 13,
    lineHeight: 19.5,
    marginTop: spacing.sm,
  },
  generateCta: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg + 2,
  },
  generateCtaDisabled: {
    opacity: 0.5,
  },
  generateCtaText: {
    fontSize: 15,
    fontWeight: '700',
    color: heroPalette.text,
  },
  // Champion banner (design L645-648)
  championBanner: {
    marginBottom: spacing.md + 2,
  },
  championRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md + 2,
  },
  championIconSquare: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  championTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  championEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  championName: {
    fontSize: 18,
    fontWeight: '800',
    color: heroPalette.text,
    marginTop: 2,
  },
  emptyCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.bodyBold,
    marginTop: spacing.sm,
  },
  emptyMessage: {
    ...typography.body,
    textAlign: 'center',
  },
  navHint: {
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  navHintText: {
    fontSize: 11,
  },
});
