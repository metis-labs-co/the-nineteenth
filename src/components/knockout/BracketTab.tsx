/**
 * BracketTab - Main bracket tab for knockout competitions
 *
 * Shows the bracket visualization with:
 * - Toggle between main and consolation brackets
 * - Swipeable stage pager with stage indicators
 * - Match cards for each stage
 * - Generate bracket button when bracket not yet generated
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useKnockoutBracket, useGenerateBracket } from '@/hooks/useKnockoutBracket';
import { isValidPlayerCount } from '@/utils/bracketGeneration';
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

    return (
      <View>
        <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
          <Icon source="tournament" size={48} color={colors.gray300} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Bracket not generated
          </Text>
          <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
            {validCount
              ? `${playerCount} players ready. Generate the bracket to create match-ups.`
              : `Need exactly 4, 8, 16, or 32 players. Currently ${playerCount} players.`}
          </Text>
          {isOrganizer && (
            <TouchableOpacity
              style={[
                styles.generateCtaButton,
                { backgroundColor: validCount ? colors.primary : colors.gray300 },
              ]}
              onPress={() => validCount && setShowGenerateSheet(true)}
              disabled={!validCount}
              activeOpacity={0.7}
            >
              <Icon source="tournament" size={20} color={colors.white} />
              <Text style={[styles.generateCtaText, { color: colors.white }]}>
                Generate Bracket
              </Text>
            </TouchableOpacity>
          )}
        </View>

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
      <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
          Loading bracket...
        </Text>
      </View>
    );
  }

  // --- No data ---
  if (!bracketData || activeStages.length === 0) {
    return (
      <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
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
      {/* Bracket toggle (main/consolation) */}
      <BracketToggle
        value={activeBracket}
        onValueChange={handleBracketToggle}
        hasConsolation={hasConsolation}
        style={styles.toggle}
      />

      {/* Stage indicators */}
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
          <Text style={[styles.navHintText, { color: colors.textDisabled }]}>
            Tap a stage above to navigate
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  toggle: {
    marginBottom: spacing.sm,
  },
  emptyCard: {
    borderRadius: borderRadius.lg,
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
  generateCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 44,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  generateCtaText: {
    ...typography.bodyBold,
  },
  navHint: {
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  navHintText: {
    ...typography.caption,
  },
});
