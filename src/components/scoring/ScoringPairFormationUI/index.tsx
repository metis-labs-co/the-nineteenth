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

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { GolfBallLoader } from '@/components/common';
import {
  IconWand,
  IconRefresh,
  IconCheck,
  IconAlertCircle,
  IconUsers,
  IconArrowsExchange,
} from '@tabler/icons-react-native';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
  layout,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import {
  autoGenerateScoringPairs,
  generateCrossTeamPairs,
  validateScoringPairsCoverage,
  type UnevenTeamMetadata,
} from '@/utils/scoringPairs';
import { ScoringPairCard } from '../ScoringPairCard';
import type { Player } from '@/types/database.types';
import type { ScoringPairCreateInput } from '@/types';
import type { ScoringPairFormationUIProps, PairingType } from './types';
import { pairsToInputFormat, getCoverageQuality, getPlayerById } from './utils';
import {
  CircularChainDiagram,
  PairingTypeBadge,
  UnevenTeamWarning,
  PlayerSelectionChip,
} from './components';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Re-export types
export type { ScoringPairFormationUIProps, CoverageQuality, PairingType } from './types';

export const ScoringPairFormationUI = React.memo(function ScoringPairFormationUI({
  roundId,
  players,
  existingPairs = [],
  teams,
  isTeamMatchPlay = false,
  onSave,
  onCancel,
  testID,
}: ScoringPairFormationUIProps) {
  const colors = useThemeColors();

  // State - store pairs in create input format for simplicity
  const [pairs, setPairs] = useState<ScoringPairCreateInput[]>(
    existingPairs.length > 0 ? pairsToInputFormat(existingPairs) : []
  );
  const [pairingType, setPairingType] = useState<PairingType>(
    existingPairs.length > 0 ? 'manual' : 'none'
  );
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [unevenTeamMetadata, setUnevenTeamMetadata] = useState<UnevenTeamMetadata | null>(null);

  // Computed values
  const playerIds = useMemo(() => players.map((p) => p.id), [players]);

  const coverage = useMemo(
    () => validateScoringPairsCoverage(pairs, playerIds),
    [pairs, playerIds]
  );

  const coveredPlayersCount = useMemo(() => {
    const scoredPlayers = new Set(pairs.map((p) => p.playerId));
    return scoredPlayers.size;
  }, [pairs]);

  const coverageQuality = useMemo(
    () => getCoverageQuality(coveredPlayersCount, players.length),
    [coveredPlayersCount, players.length]
  );

  // Validation
  const canSave = coverage.isValid && pairs.length > 0;

  // Track whether we should show the circular chain diagram
  const showCircularChainDiagram = pairingType === 'circular' && pairs.length > 0;

  // =====================================================
  // HANDLERS
  // =====================================================

  /**
   * Handle auto-generate pairs
   */
  const handleAutoGenerate = useCallback(() => {
    if (players.length < 2) return;

    setIsGenerating(true);
    try {
      const result = autoGenerateScoringPairs(players);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setPairs(result.pairs);
      setPairingType(result.type);
      setHasChanges(true);
      setSelectedPlayer(null);
    } catch (error) {
      console.error('[ScoringPairFormationUI] Failed to generate pairs:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [players]);

  /**
   * Handle cross-team pair generation
   */
  const handleCrossTeamPair = useCallback(() => {
    if (!teams || teams.length < 2) return;

    // Get players from first two teams
    const team1Players = teams[0].members
      .map((m) => m.player)
      .filter((p): p is Player => !!p);
    const team2Players = teams[1].members
      .map((m) => m.player)
      .filter((p): p is Player => !!p);

    if (team1Players.length === 0 || team2Players.length === 0) return;

    setIsGenerating(true);
    try {
      const result = generateCrossTeamPairs(team1Players, team2Players, 'wrap');
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setPairs(result.pairs);
      setPairingType('cross-team');
      setUnevenTeamMetadata(result.metadata.hasUnevenTeams ? result.metadata : null);
      setHasChanges(true);
      setSelectedPlayer(null);
    } catch (error) {
      console.error('[ScoringPairFormationUI] Failed to generate cross-team pairs:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [teams]);

  /**
   * Handle player selection for manual pairing
   */
  const handlePlayerPress = useCallback(
    (playerId: string) => {
      if (!selectedPlayer) {
        // First selection - select this player as scorer
        setSelectedPlayer(playerId);
      } else if (selectedPlayer === playerId) {
        // Same player - deselect
        setSelectedPlayer(null);
      } else {
        // Different player - create pair (selected scores pressed)
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        // Check if this pair already exists
        const existingPairIndex = pairs.findIndex(
          (p) => p.scorerId === selectedPlayer && p.playerId === playerId
        );

        if (existingPairIndex === -1) {
          // Add new pair
          setPairs((prev) => [
            ...prev,
            { scorerId: selectedPlayer, playerId },
          ]);
          setPairingType('manual');
          setHasChanges(true);
        }

        setSelectedPlayer(null);
      }
    },
    [selectedPlayer, pairs]
  );

  /**
   * Handle removing a pair
   */
  const handleRemovePair = useCallback((scorerId: string, playerId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPairs((prev) =>
      prev.filter((p) => !(p.scorerId === scorerId && p.playerId === playerId))
    );
    setPairingType('manual');
    setHasChanges(true);
  }, []);

  /**
   * Handle reset
   */
  const handleReset = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPairs(existingPairs.length > 0 ? pairsToInputFormat(existingPairs) : []);
    setPairingType(existingPairs.length > 0 ? 'manual' : 'none');
    setUnevenTeamMetadata(null);
    setHasChanges(false);
    setSelectedPlayer(null);
  }, [existingPairs]);

  /**
   * Handle save
   */
  const handleSave = useCallback(() => {
    onSave(pairs);
  }, [pairs, onSave]);

  // =====================================================
  // RENDER
  // =====================================================

  // Empty state - no players
  if (players.length === 0) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.emptyState}>
          <IconUsers size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Players</Text>
          <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
            Add players to the round before creating scoring pairs.
          </Text>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Go Back</Text>
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
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Need More Players</Text>
          <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
            At least 2 players are required to create scoring pairs.
          </Text>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} testID={testID}>
      {/* Header with Auto-Generate Button */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Scoring Pairs</Text>
            <PairingTypeBadge type={pairingType} colors={colors} />
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {players.length} player{players.length !== 1 ? 's' : ''}
            {pairs.length > 0 && ` • ${pairs.length} pair${pairs.length !== 1 ? 's' : ''}`}
          </Text>
        </View>

        <View style={styles.headerButtons}>
          {/* Cross-Team Button (only for team match play) */}
          {isTeamMatchPlay && teams && teams.length >= 2 && (
            <TouchableOpacity
              style={[
                styles.crossTeamButton,
                { backgroundColor: colors.primaryDark },
                isGenerating && styles.buttonDisabled,
              ]}
              onPress={handleCrossTeamPair}
              disabled={isGenerating}
              accessibilityRole="button"
              accessibilityLabel="Generate cross-team pairs"
              accessibilityHint="Players from opposing teams will score each other"
            >
              <IconArrowsExchange size={18} color={colors.textInverse} />
              <Text style={[styles.crossTeamButtonText, { color: colors.textInverse }]}>Cross-Team</Text>
            </TouchableOpacity>
          )}

          {/* Auto-Generate Button */}
          <TouchableOpacity
            style={[
              styles.autoGenerateButton,
              { backgroundColor: colors.primary },
              isGenerating && styles.buttonDisabled,
            ]}
            onPress={handleAutoGenerate}
            disabled={isGenerating}
            accessibilityRole="button"
            accessibilityLabel="Auto-generate scoring pairs"
            accessibilityHint={
              players.length % 2 === 0
                ? 'Creates reciprocal pairs where players score each other'
                : 'Creates circular pairs where each player scores the next'
            }
          >
            {isGenerating ? (
              <GolfBallLoader size="sm" />
            ) : (
              <IconWand size={20} color={colors.textInverse} />
            )}
            <Text style={[styles.autoGenerateButtonText, { color: colors.textInverse }]}>
              {isGenerating ? 'Generating...' : 'Auto-Generate'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Coverage Indicator */}
      <View
        style={[
          styles.coverageIndicator,
          { backgroundColor: colors.surfaceVariant },
          coverageQuality === 'good' && { backgroundColor: `${colors.success}15`, borderLeftColor: colors.success },
          coverageQuality === 'warning' && { backgroundColor: `${colors.warning}15`, borderLeftColor: colors.warning },
          coverageQuality === 'error' && { backgroundColor: `${colors.error}15`, borderLeftColor: colors.error },
        ]}
      >
        <View style={styles.coverageContent}>
          <View style={styles.coverageLeft}>
            {coverageQuality === 'good' && (
              <IconCheck size={20} color={colors.success} />
            )}
            {coverageQuality === 'warning' && (
              <IconAlertCircle size={20} color={colors.warning} />
            )}
            {coverageQuality === 'error' && (
              <IconAlertCircle size={20} color={colors.error} />
            )}
            <Text style={[styles.coverageLabel, { color: colors.textSecondary }]}>Coverage:</Text>
          </View>
          <Text
            style={[
              styles.coverageValue,
              coverageQuality === 'good' && { color: colors.success },
              coverageQuality === 'warning' && { color: colors.warning },
              coverageQuality === 'error' && { color: colors.error },
            ]}
          >
            {coveredPlayersCount}/{players.length}
          </Text>
          <Text style={[styles.coverageStatus, { color: colors.textTertiary }]}>
            {coverageQuality === 'good' && 'All players covered'}
            {coverageQuality === 'warning' && 'Some players missing'}
            {coverageQuality === 'error' && 'Many players missing'}
          </Text>
        </View>
        {selectedPlayer && (
          <Text style={[styles.selectionHint, { color: colors.primary }]}>
            Tap another player to create pair
          </Text>
        )}
      </View>

      {/* Circular Chain Diagram - shown when circular pairing is active */}
      {showCircularChainDiagram && (
        <CircularChainDiagram pairs={pairs} players={players} colors={colors} />
      )}

      {/* Uneven Teams Warning - shown when cross-team pairing with different team sizes */}
      {unevenTeamMetadata && pairingType === 'cross-team' && (
        <UnevenTeamWarning metadata={unevenTeamMetadata} colors={colors} players={players} />
      )}

      {/* Manual Pairing - Player Selection Grid */}
      {pairs.length === 0 && (
        <View style={styles.playerGridSection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tap to Select Players</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Tap a player to select as scorer, then tap another to assign
          </Text>
          <View style={styles.playerGrid}>
            {players.map((player) => {
              const isSelected = selectedPlayer === player.id;
              return (
                <PlayerSelectionChip
                  key={player.id}
                  player={player}
                  isSelected={isSelected}
                  onPress={() => handlePlayerPress(player.id)}
                  colors={colors}
                />
              );
            })}
          </View>
        </View>
      )}

      {/* Existing Pairs List */}
      <ScrollView style={styles.pairsList} showsVerticalScrollIndicator={false}>
        {pairs.length === 0 ? (
          <View style={styles.noPairsState}>
            <IconUsers size={32} color={colors.textTertiary} />
            <Text style={[styles.noPairsText, { color: colors.textTertiary }]}>
              Tap &quot;Auto-Generate&quot; or select players manually
            </Text>
          </View>
        ) : (
          <>
            {/* Player Selection Grid (when pairs exist) */}
            <View style={styles.playerGridCompact}>
              <Text style={[styles.sectionTitleSmall, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                Add More Pairs
              </Text>
              <View style={styles.playerGrid}>
                {players.map((player) => {
                  const isSelected = selectedPlayer === player.id;
                  return (
                    <PlayerSelectionChip
                      key={player.id}
                      player={player}
                      isSelected={isSelected}
                      isCompact
                      onPress={() => handlePlayerPress(player.id)}
                      colors={colors}
                    />
                  );
                })}
              </View>
            </View>

            <Divider style={[styles.sectionDivider, { backgroundColor: colors.border }]} />

            {/* Current Pairs - Different header based on pairing type */}
            <View style={styles.pairsSectionHeader}>
              <Text style={[styles.sectionTitleSmall, { color: colors.textSecondary }]}>
                {pairingType === 'circular'
                  ? `Chain Assignments (${pairs.length})`
                  : pairingType === 'reciprocal'
                    ? `Reciprocal Pairs (${pairs.length / 2})`
                    : `Current Pairs (${pairs.length})`}
              </Text>
              {pairingType === 'circular' && (
                <Text style={[styles.pairsSectionHint, { color: colors.textTertiary }]}>
                  Each player scores → the next player in the chain
                </Text>
              )}
              {pairingType === 'reciprocal' && (
                <Text style={[styles.pairsSectionHint, { color: colors.textTertiary }]}>
                  Each pair scores ↔ each other
                </Text>
              )}
            </View>
            {pairs.map((pair, index) => {
              const scorer = getPlayerById(players, pair.scorerId);
              const scoredPlayer = getPlayerById(players, pair.playerId);
              if (!scorer || !scoredPlayer) return null;

              return (
                <View key={`${pair.scorerId}-${pair.playerId}`} style={styles.pairCardWrapper}>
                  <ScoringPairCard
                    scorerPlayer={{
                      id: scorer.id,
                      name: scorer.name,
                      email: scorer.email || '',
                      handicap: scorer.handicap ?? undefined,
                      photoUrl: scorer.photo_url ?? undefined,
                      createdAt: new Date(scorer.created_at),
                      updatedAt: new Date(scorer.updated_at),
                    }}
                    scoredPlayer={{
                      id: scoredPlayer.id,
                      name: scoredPlayer.name,
                      email: scoredPlayer.email || '',
                      handicap: scoredPlayer.handicap ?? undefined,
                      photoUrl: scoredPlayer.photo_url ?? undefined,
                      createdAt: new Date(scoredPlayer.created_at),
                      updatedAt: new Date(scoredPlayer.updated_at),
                    }}
                    showRemove
                    onRemove={() => handleRemovePair(pair.scorerId, pair.playerId)}
                    testID={`pair-${index}`}
                  />
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Validation Warning */}
      {pairs.length > 0 && !coverage.isValid && (
        <View style={[styles.validationWarning, { backgroundColor: `${colors.warning}15` }]}>
          <IconAlertCircle size={16} color={colors.warning} />
          <Text style={[styles.validationText, { color: colors.warning }]}>
            {coverage.missingPlayers.length > 0 &&
              `${coverage.missingPlayers.length} player(s) not being scored`}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={[styles.actionBar, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.resetButton, { borderColor: colors.border }]}
          onPress={hasChanges ? handleReset : onCancel}
          accessibilityRole="button"
          accessibilityLabel={hasChanges ? 'Reset changes' : 'Cancel'}
        >
          {hasChanges && <IconRefresh size={18} color={colors.textSecondary} />}
          <Text style={[styles.resetButtonText, { color: colors.textSecondary }]}>
            {hasChanges ? 'Reset' : 'Cancel'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: colors.primary },
            !canSave && styles.buttonDisabled,
          ]}
          onPress={handleSave}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityLabel="Save scoring pairs"
          accessibilityHint={!canSave ? 'All players must be covered to save' : undefined}
        >
          <IconCheck size={20} color={colors.textInverse} />
          <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>Save Pairs</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.lg,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  headerTitle: {
    ...typography.h3,
  },
  headerSubtitle: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  autoGenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
    minHeight: 40,
    ...shadows.sm,
  },
  autoGenerateButtonText: {
    ...typography.smallBold,
  },
  crossTeamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
    minHeight: 40,
    ...shadows.sm,
  },
  crossTeamButtonText: {
    ...typography.smallBold,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  divider: {},
  coverageIndicator: {
    marginHorizontal: layout.screenPadding,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
  },
  coverageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  coverageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  coverageLabel: {
    ...typography.small,
  },
  coverageValue: {
    ...typography.smallBold,
  },
  coverageStatus: {
    ...typography.caption,
  },
  selectionHint: {
    ...typography.caption,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  playerGridSection: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
  },
  playerGridCompact: {
    paddingTop: spacing.md,
  },
  sectionTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  sectionTitleSmall: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pairsSectionHeader: {
    marginBottom: spacing.sm,
  },
  pairsSectionHint: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.small,
    marginBottom: spacing.md,
  },
  sectionDivider: {
    marginVertical: spacing.md,
  },
  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pairsList: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
  },
  pairCardWrapper: {
    marginBottom: spacing.sm,
  },
  noPairsState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  noPairsText: {
    ...typography.body,
    textAlign: 'center',
  },
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
  validationWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  validationText: {
    ...typography.small,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xxl,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    minHeight: layout.buttonHeight,
  },
  resetButtonText: {
    ...typography.bodyBold,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    minHeight: layout.buttonHeight,
    ...shadows.sm,
  },
  saveButtonText: {
    ...typography.bodyBold,
  },
});

export default ScoringPairFormationUI;
