// src/components/scoring/ScoringPairFormationUI.tsx
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Text, ActivityIndicator, Divider, Avatar, Surface } from 'react-native-paper';
import {
  IconWand,
  IconRefresh,
  IconCheck,
  IconAlertCircle,
  IconUsers,
  IconArrowsExchange,
  IconArrowRight,
  IconArrowsRight,
  IconRotateClockwise,
  IconInfoCircle,
} from '@tabler/icons-react-native';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
  layout,
  type ColorPalette,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import {
  autoGenerateScoringPairs,
  generateCrossTeamPairs,
  validateScoringPairsCoverage,
  type UnevenTeamMetadata,
} from '@/utils/scoringPairs';
import { ScoringPairCard } from './ScoringPairCard';
import type { Player, ScoringPairWithPlayers, TeamWithMembers } from '@/types/database.types';
import type { ScoringPairCreateInput } from '@/types';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// =====================================================
// TYPES
// =====================================================

export interface ScoringPairFormationUIProps {
  /**
   * Round UUID for pair generation
   */
  roundId: string;

  /**
   * List of all available players in the round
   */
  players: Player[];

  /**
   * Existing scoring pairs (if editing) - will be displayed initially
   */
  existingPairs?: ScoringPairWithPlayers[];

  /**
   * Teams for cross-team pairing (optional, only for match play)
   */
  teams?: TeamWithMembers[];

  /**
   * Whether this is a team match play format
   */
  isTeamMatchPlay?: boolean;

  /**
   * Callback when pairs are saved
   */
  onSave: (pairs: ScoringPairCreateInput[]) => void;

  /**
   * Callback when user cancels
   */
  onCancel: () => void;

  /**
   * Test ID for testing
   */
  testID?: string;
}

/**
 * Coverage quality indicator
 */
type CoverageQuality = 'good' | 'warning' | 'error';

/**
 * Pairing type used for display badge
 */
type PairingType = 'reciprocal' | 'circular' | 'cross-team' | 'manual' | 'none';

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get initials for avatar fallback
 */
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Convert ScoringPairWithPlayers to ScoringPairCreateInput
 */
const pairsToInputFormat = (pairs: ScoringPairWithPlayers[]): ScoringPairCreateInput[] => {
  return pairs.map((pair) => ({
    scorerId: pair.scorer_id,
    playerId: pair.player_id,
  }));
};

/**
 * Check coverage quality based on player count
 */
const getCoverageQuality = (
  coveredCount: number,
  totalCount: number
): CoverageQuality => {
  if (coveredCount === totalCount) return 'good';
  if (coveredCount >= totalCount / 2) return 'warning';
  return 'error';
};

/**
 * Get player by ID from players array
 */
const getPlayerById = (players: Player[], playerId: string): Player | undefined => {
  return players.find((p) => p.id === playerId);
};

/**
 * Build the circular chain flow from pairs
 * Returns ordered list of player IDs representing the chain: A→B→C→...→A
 */
const buildCircularChainOrder = (
  pairs: ScoringPairCreateInput[],
  players: Player[]
): Player[] => {
  if (pairs.length === 0 || players.length === 0) return [];

  // Build adjacency map: scorerId -> playerId
  const scorerToPlayer = new Map<string, string>();
  for (const pair of pairs) {
    scorerToPlayer.set(pair.scorerId, pair.playerId);
  }

  // Start from first player and follow the chain
  const orderedPlayers: Player[] = [];
  const startPlayer = players[0];
  let currentId = startPlayer.id;
  const visited = new Set<string>();

  while (!visited.has(currentId) && orderedPlayers.length < players.length) {
    visited.add(currentId);
    const player = getPlayerById(players, currentId);
    if (player) {
      orderedPlayers.push(player);
    }
    const nextId = scorerToPlayer.get(currentId);
    if (!nextId) break;
    currentId = nextId;
  }

  return orderedPlayers;
};

// =====================================================
// CIRCULAR CHAIN DIAGRAM COMPONENT
// =====================================================

interface CircularChainDiagramProps {
  pairs: ScoringPairCreateInput[];
  players: Player[];
  colors: ColorPalette;
}

/**
 * CircularChainDiagram - Visual representation of the circular scoring chain
 *
 * Shows the flow: A → B → C → ... → A with player names/avatars
 */
const CircularChainDiagram = React.memo(function CircularChainDiagram({
  pairs,
  players,
  colors,
}: CircularChainDiagramProps) {
  const chainOrder = useMemo(
    () => buildCircularChainOrder(pairs, players),
    [pairs, players]
  );

  if (chainOrder.length === 0) return null;

  return (
    <View style={chainDiagramStyles(colors).container}>
      {/* Header with icon */}
      <View style={chainDiagramStyles(colors).header}>
        <View style={chainDiagramStyles(colors).iconWrapper}>
          <IconRotateClockwise size={18} color={colors.info} />
        </View>
        <Text style={chainDiagramStyles(colors).title}>Circular Chain Flow</Text>
      </View>

      {/* Chain visualization */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={chainDiagramStyles(colors).chainScroll}
      >
        {chainOrder.map((player, index) => (
          <View key={player.id} style={chainDiagramStyles(colors).chainItem}>
            {/* Player chip */}
            <View style={chainDiagramStyles(colors).playerChip}>
              {player.photo_url ? (
                <Avatar.Image
                  size={28}
                  source={{ uri: player.photo_url }}
                  style={chainDiagramStyles(colors).avatar}
                />
              ) : (
                <Avatar.Text
                  size={28}
                  label={getInitials(player.name)}
                  style={[
                    chainDiagramStyles(colors).avatar,
                    { backgroundColor: colors.primary },
                  ]}
                  labelStyle={{ color: colors.textInverse, fontSize: 11 }}
                />
              )}
              <Text
                style={chainDiagramStyles(colors).playerName}
                numberOfLines={1}
              >
                {player.name.split(' ')[0]}
              </Text>
            </View>

            {/* Arrow to next (including wrap-around arrow for last item) */}
            <View style={chainDiagramStyles(colors).arrowWrapper}>
              <IconArrowRight
                size={16}
                color={index === chainOrder.length - 1 ? colors.info : colors.textTertiary}
              />
              {index === chainOrder.length - 1 && (
                <Text style={chainDiagramStyles(colors).wrapLabel}>
                  (back to {chainOrder[0]?.name.split(' ')[0]})
                </Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Help text */}
      <View style={chainDiagramStyles(colors).helpContainer}>
        <IconInfoCircle size={14} color={colors.textTertiary} />
        <Text style={chainDiagramStyles(colors).helpText}>
          With an odd number of players, each player scores one person and is scored by
          another, forming a continuous chain.
        </Text>
      </View>
    </View>
  );
});

const chainDiagramStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      marginHorizontal: layout.screenPadding,
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: `${colors.info}10`,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: `${colors.info}30`,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    iconWrapper: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: `${colors.info}20`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      ...typography.smallBold,
      color: colors.info,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    chainScroll: {
      paddingVertical: spacing.sm,
    },
    chainItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    playerChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatar: {
      marginRight: 0,
    },
    playerName: {
      ...typography.caption,
      color: colors.textPrimary,
      fontWeight: '600',
      maxWidth: 60,
    },
    arrowWrapper: {
      paddingHorizontal: spacing.sm,
      alignItems: 'center',
    },
    wrapLabel: {
      ...typography.caption,
      color: colors.info,
      fontSize: 9,
      marginTop: 2,
    },
    helpContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginTop: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: `${colors.info}20`,
    },
    helpText: {
      ...typography.caption,
      color: colors.textSecondary,
      flex: 1,
      lineHeight: 18,
    },
  });

// =====================================================
// PAIRING TYPE BADGE COMPONENT
// =====================================================

interface PairingTypeBadgeProps {
  type: PairingType;
  colors: ColorPalette;
}

/**
 * PairingTypeBadge - Visual badge showing the pairing type with appropriate styling
 */
const PairingTypeBadge = React.memo(function PairingTypeBadge({
  type,
  colors,
}: PairingTypeBadgeProps) {
  if (type === 'none') return null;

  const isCircular = type === 'circular';
  const badgeColor = isCircular ? colors.info : colors.primary;
  const badgeBackground = isCircular ? `${colors.info}15` : `${colors.primary}15`;

  const getLabel = () => {
    switch (type) {
      case 'circular':
        return 'Circular Chain';
      case 'reciprocal':
        return 'Reciprocal Pairs';
      case 'cross-team':
        return 'Cross-Team';
      case 'manual':
        return 'Manual';
      default:
        return null;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'circular':
        return <IconRotateClockwise size={12} color={badgeColor} />;
      case 'reciprocal':
        return <IconArrowsExchange size={12} color={badgeColor} />;
      case 'cross-team':
        return <IconArrowsRight size={12} color={badgeColor} />;
      default:
        return null;
    }
  };

  return (
    <View
      style={[
        badgeStyles.container,
        { backgroundColor: badgeBackground, borderColor: badgeColor },
      ]}
    >
      {getIcon()}
      <Text style={[badgeStyles.label, { color: badgeColor }]}>{getLabel()}</Text>
    </View>
  );
});

const badgeStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
  },
});

// =====================================================
// UNEVEN TEAM WARNING COMPONENT
// =====================================================

interface UnevenTeamWarningProps {
  metadata: UnevenTeamMetadata;
  colors: ColorPalette;
  players: Player[];
}

/**
 * UnevenTeamWarning - Warning banner shown when cross-team pairing has uneven teams
 *
 * Explains how the uneven team sizes were handled (wrap vs partial strategy)
 */
const UnevenTeamWarning = React.memo(function UnevenTeamWarning({
  metadata,
  colors,
  players,
}: UnevenTeamWarningProps) {
  const {
    team1Size,
    team2Size,
    strategyUsed,
    reusedPlayerIds,
    unassignedPlayerIds,
    extraPairingsCount,
  } = metadata;

  const smallerTeamSize = Math.min(team1Size, team2Size);
  const sizeDifference = Math.max(team1Size, team2Size) - smallerTeamSize;

  // Get player names for display
  const getPlayerNames = (ids: string[]): string => {
    return ids
      .map((id) => {
        const player = players.find((p) => p.id === id);
        return player?.name.split(' ')[0] || 'Unknown';
      })
      .join(', ');
  };

  const reusedPlayerNames = reusedPlayerIds.length > 0 ? getPlayerNames(reusedPlayerIds) : '';
  const unassignedPlayerNames =
    unassignedPlayerIds.length > 0 ? getPlayerNames(unassignedPlayerIds) : '';

  return (
    <View style={unevenWarningStyles(colors).container}>
      {/* Header */}
      <View style={unevenWarningStyles(colors).header}>
        <View style={unevenWarningStyles(colors).iconWrapper}>
          <IconAlertCircle size={18} color={colors.warning} />
        </View>
        <Text style={unevenWarningStyles(colors).title}>Uneven Teams Detected</Text>
      </View>

      {/* Team sizes */}
      <View style={unevenWarningStyles(colors).sizeRow}>
        <Text style={unevenWarningStyles(colors).sizeLabel}>
          Team 1: {team1Size} player{team1Size !== 1 ? 's' : ''}
        </Text>
        <Text style={unevenWarningStyles(colors).sizeSeparator}>vs</Text>
        <Text style={unevenWarningStyles(colors).sizeLabel}>
          Team 2: {team2Size} player{team2Size !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Explanation based on strategy */}
      <View style={unevenWarningStyles(colors).explanationContainer}>
        <IconInfoCircle size={14} color={colors.textTertiary} />
        <Text style={unevenWarningStyles(colors).explanationText}>
          {strategyUsed === 'wrap' ? (
            <>
              <Text style={{ fontWeight: '600' }}>Wrap strategy applied: </Text>
              {sizeDifference === 1
                ? `${reusedPlayerNames} from the smaller team will score ${extraPairingsCount} additional player.`
                : `${reusedPlayerNames} from the smaller team will score ${extraPairingsCount} additional players.`}
              {' This ensures all players from the larger team are paired.'}
            </>
          ) : (
            <>
              <Text style={{ fontWeight: '600' }}>Partial strategy applied: </Text>
              {unassignedPlayerIds.length === 1
                ? `${unassignedPlayerNames} was left unassigned.`
                : `${unassignedPlayerNames} were left unassigned.`}
              {' Only players up to the smaller team size are paired.'}
            </>
          )}
        </Text>
      </View>
    </View>
  );
});

const unevenWarningStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      marginHorizontal: layout.screenPadding,
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: `${colors.warning}10`,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: `${colors.warning}30`,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    iconWrapper: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: `${colors.warning}20`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      ...typography.smallBold,
      color: colors.warning,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sizeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      marginBottom: spacing.sm,
    },
    sizeLabel: {
      ...typography.small,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    sizeSeparator: {
      ...typography.small,
      color: colors.textTertiary,
    },
    explanationContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: `${colors.warning}20`,
    },
    explanationText: {
      ...typography.caption,
      color: colors.textSecondary,
      flex: 1,
      lineHeight: 18,
    },
  });

// =====================================================
// COMPONENT
// =====================================================

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
  const styles = createStyles(colors);

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
          <Text style={styles.emptyTitle}>No Players</Text>
          <Text style={styles.emptyMessage}>
            Add players to the round before creating scoring pairs.
          </Text>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.cancelButtonText}>Go Back</Text>
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
          <Text style={styles.emptyTitle}>Need More Players</Text>
          <Text style={styles.emptyMessage}>
            At least 2 players are required to create scoring pairs.
          </Text>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.cancelButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      {/* Header with Auto-Generate Button */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Scoring Pairs</Text>
            <PairingTypeBadge type={pairingType} colors={colors} />
          </View>
          <Text style={styles.headerSubtitle}>
            {players.length} player{players.length !== 1 ? 's' : ''}
            {pairs.length > 0 && ` • ${pairs.length} pair${pairs.length !== 1 ? 's' : ''}`}
          </Text>
        </View>

        <View style={styles.headerButtons}>
          {/* Cross-Team Button (only for team match play) */}
          {isTeamMatchPlay && teams && teams.length >= 2 && (
            <TouchableOpacity
              style={[styles.crossTeamButton, isGenerating && styles.buttonDisabled]}
              onPress={handleCrossTeamPair}
              disabled={isGenerating}
              accessibilityRole="button"
              accessibilityLabel="Generate cross-team pairs"
              accessibilityHint="Players from opposing teams will score each other"
            >
              <IconArrowsExchange size={18} color={colors.textInverse} />
              <Text style={styles.crossTeamButtonText}>Cross-Team</Text>
            </TouchableOpacity>
          )}

          {/* Auto-Generate Button */}
          <TouchableOpacity
            style={[styles.autoGenerateButton, isGenerating && styles.buttonDisabled]}
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
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <IconWand size={20} color={colors.textInverse} />
            )}
            <Text style={styles.autoGenerateButtonText}>
              {isGenerating ? 'Generating...' : 'Auto-Generate'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* Coverage Indicator */}
      <Surface
        style={[
          styles.coverageIndicator,
          coverageQuality === 'good' && styles.coverageGood,
          coverageQuality === 'warning' && styles.coverageWarning,
          coverageQuality === 'error' && styles.coverageError,
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
            <Text style={styles.coverageLabel}>Coverage:</Text>
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
          <Text style={styles.coverageStatus}>
            {coverageQuality === 'good' && 'All players covered'}
            {coverageQuality === 'warning' && 'Some players missing'}
            {coverageQuality === 'error' && 'Many players missing'}
          </Text>
        </View>
        {selectedPlayer && (
          <Text style={styles.selectionHint}>
            Tap another player to create pair
          </Text>
        )}
      </Surface>

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
          <Text style={styles.sectionTitle}>Tap to Select Players</Text>
          <Text style={styles.sectionSubtitle}>
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
            <Text style={styles.noPairsText}>
              Tap "Auto-Generate" or select players manually
            </Text>
          </View>
        ) : (
          <>
            {/* Player Selection Grid (when pairs exist) */}
            <View style={styles.playerGridCompact}>
              <Text style={[styles.sectionTitleSmall, { marginBottom: spacing.sm }]}>
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

            <Divider style={styles.sectionDivider} />

            {/* Current Pairs - Different header based on pairing type */}
            <View style={styles.pairsSectionHeader}>
              <Text style={styles.sectionTitleSmall}>
                {pairingType === 'circular'
                  ? `Chain Assignments (${pairs.length})`
                  : pairingType === 'reciprocal'
                    ? `Reciprocal Pairs (${pairs.length / 2})`
                    : `Current Pairs (${pairs.length})`}
              </Text>
              {pairingType === 'circular' && (
                <Text style={styles.pairsSectionHint}>
                  Each player scores → the next player in the chain
                </Text>
              )}
              {pairingType === 'reciprocal' && (
                <Text style={styles.pairsSectionHint}>
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
        <View style={styles.validationWarning}>
          <IconAlertCircle size={16} color={colors.warning} />
          <Text style={styles.validationText}>
            {coverage.missingPlayers.length > 0 &&
              `${coverage.missingPlayers.length} player(s) not being scored`}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={hasChanges ? handleReset : onCancel}
          accessibilityRole="button"
          accessibilityLabel={hasChanges ? 'Reset changes' : 'Cancel'}
        >
          {hasChanges && <IconRefresh size={18} color={colors.textSecondary} />}
          <Text style={styles.resetButtonText}>
            {hasChanges ? 'Reset' : 'Cancel'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, !canSave && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityLabel="Save scoring pairs"
          accessibilityHint={!canSave ? 'All players must be covered to save' : undefined}
        >
          <IconCheck size={20} color={colors.textInverse} />
          <Text style={styles.saveButtonText}>Save Pairs</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// =====================================================
// PLAYER SELECTION CHIP COMPONENT
// =====================================================

interface PlayerSelectionChipProps {
  player: Player;
  isSelected: boolean;
  isCompact?: boolean;
  onPress: () => void;
  colors: ColorPalette;
}

const PlayerSelectionChip = React.memo(function PlayerSelectionChip({
  player,
  isSelected,
  isCompact = false,
  onPress,
  colors,
}: PlayerSelectionChipProps) {
  const chipStyles = createChipStyles(colors);

  return (
    <Pressable
      style={[
        chipStyles.chip,
        isCompact && chipStyles.chipCompact,
        isSelected && chipStyles.chipSelected,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${player.name}${isSelected ? ', selected' : ''}`}
      accessibilityHint="Tap to select for pairing"
      accessibilityState={{ selected: isSelected }}
    >
      {player.photo_url ? (
        <Avatar.Image
          size={isCompact ? 28 : 32}
          source={{ uri: player.photo_url }}
          style={chipStyles.avatar}
        />
      ) : (
        <Avatar.Text
          size={isCompact ? 28 : 32}
          label={getInitials(player.name)}
          style={[chipStyles.avatar, { backgroundColor: colors.primary }]}
          labelStyle={{ color: colors.textInverse, ...typography.caption }}
        />
      )}
      <Text
        style={[
          chipStyles.name,
          isCompact && chipStyles.nameCompact,
          isSelected && { color: colors.primary },
        ]}
        numberOfLines={1}
      >
        {player.name}
      </Text>
      {isSelected && (
        <View style={chipStyles.selectedIndicator}>
          <IconCheck size={14} color={colors.primary} />
        </View>
      )}
    </Pressable>
  );
});

// =====================================================
// STYLES
// =====================================================

const createStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      color: colors.textPrimary,
    },
    headerSubtitle: {
      ...typography.small,
      color: colors.textSecondary,
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
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
      gap: spacing.xs,
      minHeight: 40,
      ...shadows.sm,
    },
    autoGenerateButtonText: {
      ...typography.smallBold,
      color: colors.textInverse,
    },
    crossTeamButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryDark,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
      gap: spacing.xs,
      minHeight: 40,
      ...shadows.sm,
    },
    crossTeamButtonText: {
      ...typography.smallBold,
      color: colors.textInverse,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    divider: {
      backgroundColor: colors.border,
    },
    coverageIndicator: {
      marginHorizontal: layout.screenPadding,
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceVariant,
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
      color: colors.textSecondary,
    },
    coverageValue: {
      ...typography.smallBold,
    },
    coverageStatus: {
      ...typography.caption,
      color: colors.textTertiary,
    },
    coverageGood: {
      backgroundColor: `${colors.success}15`,
      borderLeftWidth: 3,
      borderLeftColor: colors.success,
    },
    coverageWarning: {
      backgroundColor: `${colors.warning}15`,
      borderLeftWidth: 3,
      borderLeftColor: colors.warning,
    },
    coverageError: {
      backgroundColor: `${colors.error}15`,
      borderLeftWidth: 3,
      borderLeftColor: colors.error,
    },
    selectionHint: {
      ...typography.caption,
      color: colors.primary,
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
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    sectionTitleSmall: {
      ...typography.smallBold,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    pairsSectionHeader: {
      marginBottom: spacing.sm,
    },
    pairsSectionHint: {
      ...typography.caption,
      color: colors.textTertiary,
      marginTop: spacing.xs,
    },
    sectionSubtitle: {
      ...typography.small,
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
    sectionDivider: {
      backgroundColor: colors.border,
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
      color: colors.textTertiary,
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
      color: colors.textPrimary,
      marginTop: spacing.md,
    },
    emptyMessage: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    cancelButton: {
      marginTop: spacing.lg,
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: layout.buttonHeight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cancelButtonText: {
      ...typography.bodyBold,
      color: colors.textSecondary,
    },
    validationWarning: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${colors.warning}15`,
      paddingVertical: spacing.sm,
      gap: spacing.xs,
    },
    validationText: {
      ...typography.small,
      color: colors.warning,
    },
    actionBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: layout.screenPadding,
      paddingVertical: spacing.md,
      paddingBottom: spacing.xxl,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: spacing.md,
      backgroundColor: colors.surface,
    },
    resetButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
      minHeight: layout.buttonHeight,
    },
    resetButtonText: {
      ...typography.bodyBold,
      color: colors.textSecondary,
    },
    saveButton: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      gap: spacing.sm,
      minHeight: layout.buttonHeight,
      ...shadows.sm,
    },
    saveButtonText: {
      ...typography.bodyBold,
      color: colors.textInverse,
    },
  });

const createChipStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
      ...shadows.sm,
    },
    chipCompact: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    chipSelected: {
      backgroundColor: `${colors.primary}15`,
      borderColor: colors.primary,
      borderWidth: 2,
    },
    avatar: {
      marginRight: 0,
    },
    name: {
      ...typography.small,
      color: colors.textPrimary,
      maxWidth: 100,
    },
    nameCompact: {
      ...typography.caption,
      maxWidth: 80,
    },
    selectedIndicator: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: `${colors.primary}20`,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default ScoringPairFormationUI;
