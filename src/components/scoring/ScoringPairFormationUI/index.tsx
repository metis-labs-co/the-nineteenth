/**
 * ScoringPairFormationUI - Scoring pair creation and editing interface
 *
 * @description
 * Provides a complete UI for creating and editing scoring pairs in a round.
 * Features auto-generation (reciprocal/circular), cross-team pairing for match play,
 * manual tap-to-select pairing, and coverage validation.
 *
 * @example
 * ```tsx
 * <ScoringPairFormationUI
 *   roundId="round-123"
 *   players={players}
 *   existingPairs={pairs}
 *   isTeamMatchPlay={false}
 *   onSave={(pairs) => handleSavePairs(pairs)}
 *   onCancel={() => navigation.goBack()}
 * />
 * ```
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, UIManager } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { IconUsers } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, layout } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { usePairingState } from './hooks/usePairingState';
import {
  CircularChainDiagram,
  UnevenTeamWarning,
  CoverageIndicator,
  AutoGeneratePanel,
  PairsListSection,
  ActionBar,
  ValidationWarning,
} from './components';
import type { ScoringPairFormationUIProps } from './types';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Re-export types
export type { ScoringPairFormationUIProps, CoverageQuality, PairingType } from './types';

export const ScoringPairFormationUI = React.memo(function ScoringPairFormationUI({
  roundId: _roundId,
  players,
  existingPairs = [],
  teams,
  isTeamMatchPlay = false,
  teamNameByPlayerId,
  teamIndexByPlayerId,
  teamColorByPlayerId,
  groupPlayerIds,
  subMatches,
  onSave,
  onCancel,
  testID,
}: ScoringPairFormationUIProps) {
  const colors = useThemeColors();

  // Use the pairing state hook for all state management
  const {
    pairs,
    pairingType,
    selectedPlayer,
    hasChanges,
    isGenerating,
    unevenTeamMetadata,
    coverage,
    coveredPlayersCount,
    coverageQuality,
    canSave,
    showCircularChainDiagram,
    handleAutoGenerate,
    handleCrossTeamPair,
    handlePlayerPress,
    handleRemovePair,
    handleReset,
    handleSave,
  } = usePairingState({
    players,
    existingPairs,
    teams,
    teamNameByPlayerId,
    groupPlayerIds,
    subMatches,
    onSave,
  });

  // Empty state - no players
  if (players.length === 0) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.emptyState}>
          <IconUsers size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            No Players
          </Text>
          <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
            Add players to the round before creating scoring pairs.
          </Text>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Not enough players
  if (players.length < 2) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.emptyState}>
          <IconUsers size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Need More Players
          </Text>
          <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
            At least 2 players are required to create scoring pairs.
          </Text>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} testID={testID}>
      {/* Header with Auto-Generate Button */}
      <AutoGeneratePanel
        pairingType={pairingType}
        playersCount={players.length}
        pairsCount={pairs.length}
        isTeamMatchPlay={isTeamMatchPlay}
        hasTeams={!!teams && teams.length >= 2}
        isGenerating={isGenerating}
        onAutoGenerate={handleAutoGenerate}
        onCrossTeamPair={handleCrossTeamPair}
        colors={colors}
      />

      <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Coverage Indicator */}
      <CoverageIndicator
        coveredPlayersCount={coveredPlayersCount}
        totalPlayersCount={players.length}
        coverageQuality={coverageQuality}
        selectedPlayer={selectedPlayer}
        colors={colors}
      />

      {/* Circular Chain Diagram - shown when circular pairing is active */}
      {showCircularChainDiagram && (
        <CircularChainDiagram pairs={pairs} players={players} colors={colors} />
      )}

      {/* Uneven Teams Warning - shown when cross-team pairing with different team sizes */}
      {unevenTeamMetadata && pairingType === 'cross-team' && (
        <UnevenTeamWarning metadata={unevenTeamMetadata} colors={colors} players={players} />
      )}

      {/* Main Content - Player Grid and Pairs List */}
      <PairsListSection
        players={players}
        pairs={pairs}
        pairingType={pairingType}
        selectedPlayer={selectedPlayer}
        onPlayerPress={handlePlayerPress}
        onRemovePair={handleRemovePair}
        teamNameByPlayerId={teamNameByPlayerId}
        teamIndexByPlayerId={teamIndexByPlayerId}
        teamColorByPlayerId={teamColorByPlayerId}
        colors={colors}
      />

      {/* Validation Warning */}
      {pairs.length > 0 && !coverage.isValid && (
        <ValidationWarning
          missingPlayersCount={coverage.missingPlayers.length}
          colors={colors}
        />
      )}

      {/* Action Buttons */}
      <ActionBar
        hasChanges={hasChanges}
        canSave={canSave}
        onSave={handleSave}
        onReset={handleReset}
        onCancel={onCancel}
        colors={colors}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  divider: {},
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout.screenPadding,
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    marginTop: spacing.md,
  },
  emptyMessage: {
    ...typography.body,
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    minHeight: layout.buttonHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.bodyBold,
  },
});

export default ScoringPairFormationUI;
