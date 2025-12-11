// src/components/teams/TeamFormationUI.tsx
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
import { IconWand, IconRefresh, IconCheck, IconAlertCircle, IconUsers } from '@tabler/icons-react-native';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
  layout,
  type ColorPalette,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useAutoGenerateTeams } from '@/hooks/useTeams';
import type { Player, TeamWithMembers } from '@/types/database.types';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// =====================================================
// TYPES
// =====================================================

export interface TeamFormationUIProps {
  /**
   * Competition UUID for team generation
   */
  competitionId: string;

  /**
   * List of all available players in the competition
   */
  players: Player[];

  /**
   * Existing teams (if editing) - will be displayed initially
   */
  existingTeams?: TeamWithMembers[];

  /**
   * Team size (2-4 players per team)
   */
  teamSize: 2 | 3 | 4;

  /**
   * Callback when teams are saved
   */
  onSave: (teams: TeamWithMembers[]) => void;

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
 * Handicap balance quality indicator
 */
type BalanceQuality = 'good' | 'fair' | 'poor';

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Calculate average handicap for a team
 */
const calculateTeamHandicap = (members: { player?: Player }[]): number => {
  const handicaps = members
    .map((m) => m.player?.handicap ?? 0)
    .filter((h): h is number => typeof h === 'number');

  if (handicaps.length === 0) return 0;
  return handicaps.reduce((sum, h) => sum + h, 0) / handicaps.length;
};

/**
 * Calculate handicap spread across all teams
 * Returns the difference between highest and lowest team average
 */
const calculateHandicapSpread = (teams: TeamWithMembers[]): number => {
  if (teams.length < 2) return 0;

  const averages = teams.map((team) => calculateTeamHandicap(team.members));
  const maxAvg = Math.max(...averages);
  const minAvg = Math.min(...averages);

  return maxAvg - minAvg;
};

/**
 * Determine balance quality based on handicap spread
 */
const getBalanceQuality = (spread: number): BalanceQuality => {
  if (spread <= 3) return 'good';
  if (spread <= 6) return 'fair';
  return 'poor';
};

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
 * Check if all players are assigned to teams
 */
const areAllPlayersAssigned = (teams: TeamWithMembers[], totalPlayers: number): boolean => {
  const assignedCount = teams.reduce((sum, team) => sum + team.members.length, 0);
  return assignedCount >= totalPlayers;
};

// =====================================================
// COMPONENT
// =====================================================

/**
 * TeamFormationUI - Team creation and editing interface
 *
 * @description
 * Provides a complete UI for creating and editing teams in a competition.
 * Features auto-generation, manual member swapping, and handicap balance indicators.
 *
 * @example
 * ```tsx
 * <TeamFormationUI
 *   competitionId="comp-123"
 *   players={players}
 *   existingTeams={teams}
 *   teamSize={4}
 *   onSave={(teams) => handleSaveTeams(teams)}
 *   onCancel={() => navigation.goBack()}
 * />
 * ```
 */
export const TeamFormationUI = React.memo(function TeamFormationUI({
  competitionId,
  players,
  existingTeams = [],
  teamSize,
  onSave,
  onCancel,
  testID,
}: TeamFormationUIProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  // State
  const [teams, setTeams] = useState<TeamWithMembers[]>(existingTeams);
  const [selectedPlayer, setSelectedPlayer] = useState<{
    teamIndex: number;
    memberIndex: number;
    playerId: string;
  } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Mutations
  const { mutate: generateTeams, isPending: isGenerating } = useAutoGenerateTeams();

  // Computed values
  const handicapSpread = useMemo(() => calculateHandicapSpread(teams), [teams]);
  const balanceQuality = useMemo(() => getBalanceQuality(handicapSpread), [handicapSpread]);
  const allPlayersAssigned = useMemo(
    () => areAllPlayersAssigned(teams, players.length),
    [teams, players.length]
  );

  // Validation
  const canSave = teams.length > 0 && allPlayersAssigned;

  // =====================================================
  // HANDLERS
  // =====================================================

  /**
   * Handle auto-generate teams
   */
  const handleAutoGenerate = useCallback(() => {
    generateTeams(
      { competitionId, teamSize },
      {
        onSuccess: (generatedTeams) => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setTeams(generatedTeams);
          setHasChanges(true);
          setSelectedPlayer(null);
        },
        onError: (error) => {
          console.error('[TeamFormationUI] Failed to generate teams:', error);
        },
      }
    );
  }, [competitionId, teamSize, generateTeams]);

  /**
   * Handle player selection for swapping
   */
  const handlePlayerPress = useCallback(
    (teamIndex: number, memberIndex: number, playerId: string) => {
      if (!selectedPlayer) {
        // First selection - select this player
        setSelectedPlayer({ teamIndex, memberIndex, playerId });
      } else if (selectedPlayer.teamIndex === teamIndex && selectedPlayer.memberIndex === memberIndex) {
        // Same player - deselect
        setSelectedPlayer(null);
      } else {
        // Different player - swap them
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        setTeams((prevTeams) => {
          const newTeams = [...prevTeams];

          // Get the two players
          const player1 = newTeams[selectedPlayer.teamIndex].members[selectedPlayer.memberIndex];
          const player2 = newTeams[teamIndex].members[memberIndex];

          // Swap them
          newTeams[selectedPlayer.teamIndex] = {
            ...newTeams[selectedPlayer.teamIndex],
            members: newTeams[selectedPlayer.teamIndex].members.map((m, i) =>
              i === selectedPlayer.memberIndex ? player2 : m
            ),
          };
          newTeams[teamIndex] = {
            ...newTeams[teamIndex],
            members: newTeams[teamIndex].members.map((m, i) => (i === memberIndex ? player1 : m)),
          };

          return newTeams;
        });

        setHasChanges(true);
        setSelectedPlayer(null);
      }
    },
    [selectedPlayer]
  );

  /**
   * Handle reset to original teams
   */
  const handleReset = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTeams(existingTeams);
    setHasChanges(false);
    setSelectedPlayer(null);
  }, [existingTeams]);

  /**
   * Handle save
   */
  const handleSave = useCallback(() => {
    onSave(teams);
  }, [teams, onSave]);

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
            Add players to the competition before creating teams.
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
          <Text style={styles.headerTitle}>Team Formation</Text>
          <Text style={styles.headerSubtitle}>
            {players.length} players, {teamSize} per team
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.autoGenerateButton, isGenerating && styles.buttonDisabled]}
          onPress={handleAutoGenerate}
          disabled={isGenerating}
          accessibilityRole="button"
          accessibilityLabel="Auto-generate teams"
          accessibilityHint="Creates balanced teams automatically"
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

      <Divider style={styles.divider} />

      {/* Handicap Balance Indicator */}
      {teams.length > 1 && (
        <Surface style={[styles.balanceIndicator, styles[`balance_${balanceQuality}`]]}>
          <View style={styles.balanceContent}>
            <View style={styles.balanceLeft}>
              {balanceQuality === 'good' && (
                <IconCheck size={20} color={colors.success} />
              )}
              {balanceQuality === 'fair' && (
                <IconAlertCircle size={20} color={colors.warning} />
              )}
              {balanceQuality === 'poor' && (
                <IconAlertCircle size={20} color={colors.error} />
              )}
              <Text style={styles.balanceLabel}>Handicap Balance:</Text>
            </View>
            <Text
              style={[
                styles.balanceValue,
                balanceQuality === 'good' && { color: colors.success },
                balanceQuality === 'fair' && { color: colors.warning },
                balanceQuality === 'poor' && { color: colors.error },
              ]}
            >
              {balanceQuality === 'good' && 'Good'}
              {balanceQuality === 'fair' && 'Fair'}
              {balanceQuality === 'poor' && 'Poor'}
            </Text>
            <Text style={styles.spreadValue}>
              ({handicapSpread.toFixed(1)} spread)
            </Text>
          </View>
          {selectedPlayer && (
            <Text style={styles.swapHint}>
              Tap another player to swap
            </Text>
          )}
        </Surface>
      )}

      {/* Teams List */}
      <ScrollView style={styles.teamsList} showsVerticalScrollIndicator={false}>
        {teams.length === 0 ? (
          <View style={styles.noTeamsState}>
            <IconUsers size={32} color={colors.textTertiary} />
            <Text style={styles.noTeamsText}>
              Tap "Auto-Generate" to create balanced teams
            </Text>
          </View>
        ) : (
          teams.map((team, teamIndex) => (
            <TeamFormationCard
              key={team.id}
              team={team}
              teamIndex={teamIndex}
              selectedPlayer={selectedPlayer}
              onPlayerPress={handlePlayerPress}
              colors={colors}
            />
          ))
        )}
      </ScrollView>

      {/* Validation Warning */}
      {teams.length > 0 && !allPlayersAssigned && (
        <View style={styles.validationWarning}>
          <IconAlertCircle size={16} color={colors.warning} />
          <Text style={styles.validationText}>
            Not all players are assigned to teams
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
          accessibilityLabel="Save teams"
          accessibilityHint={!canSave ? 'All players must be assigned to save' : undefined}
        >
          <IconCheck size={20} color={colors.textInverse} />
          <Text style={styles.saveButtonText}>Save Teams</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// =====================================================
// TEAM FORMATION CARD COMPONENT
// =====================================================

interface TeamFormationCardProps {
  team: TeamWithMembers;
  teamIndex: number;
  selectedPlayer: {
    teamIndex: number;
    memberIndex: number;
    playerId: string;
  } | null;
  onPlayerPress: (teamIndex: number, memberIndex: number, playerId: string) => void;
  colors: ColorPalette;
}

const TeamFormationCard = React.memo(function TeamFormationCard({
  team,
  teamIndex,
  selectedPlayer,
  onPlayerPress,
  colors,
}: TeamFormationCardProps) {
  const styles = createCardStyles(colors);
  const teamHandicap = calculateTeamHandicap(team.members);

  return (
    <Surface style={styles.card}>
      {/* Team Header */}
      <View style={styles.cardHeader}>
        <Text style={styles.teamName}>{team.name}</Text>
        <View style={styles.handicapBadge}>
          <Text style={styles.handicapLabel}>Avg HC:</Text>
          <Text style={styles.handicapValue}>{teamHandicap.toFixed(1)}</Text>
        </View>
      </View>

      {/* Members */}
      <View style={styles.membersList}>
        {team.members.map((member, memberIndex) => {
          const player = member.player;
          if (!player) return null;

          const isSelected =
            selectedPlayer?.teamIndex === teamIndex &&
            selectedPlayer?.memberIndex === memberIndex;
          const isSwapTarget =
            selectedPlayer !== null &&
            (selectedPlayer.teamIndex !== teamIndex ||
              selectedPlayer.memberIndex !== memberIndex);

          return (
            <Pressable
              key={player.id}
              style={[
                styles.memberRow,
                isSelected && styles.memberRowSelected,
                isSwapTarget && styles.memberRowSwapTarget,
              ]}
              onPress={() => onPlayerPress(teamIndex, memberIndex, player.id)}
              accessibilityRole="button"
              accessibilityLabel={`${player.name}, Handicap ${player.handicap ?? 'N/A'}${
                isSelected ? ', selected for swap' : ''
              }`}
              accessibilityHint="Tap to select for swapping"
            >
              {player.photo_url ? (
                <Avatar.Image
                  size={36}
                  source={{ uri: player.photo_url }}
                  style={styles.avatar}
                />
              ) : (
                <Avatar.Text
                  size={36}
                  label={getInitials(player.name)}
                  style={[styles.avatar, { backgroundColor: colors.primary }]}
                  labelStyle={{ color: colors.textInverse, ...typography.captionBold }}
                />
              )}

              <View style={styles.memberInfo}>
                <Text style={styles.memberName} numberOfLines={1}>
                  {player.name}
                </Text>
              </View>

              <View style={styles.memberHandicap}>
                <Text style={styles.memberHandicapLabel}>HC:</Text>
                <Text style={styles.memberHandicapValue}>
                  {player.handicap ?? 'N/A'}
                </Text>
              </View>

              {isSelected && (
                <View style={styles.selectedIndicator}>
                  <IconCheck size={16} color={colors.primary} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </Surface>
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
      alignItems: 'center',
      paddingHorizontal: layout.screenPadding,
      paddingVertical: spacing.lg,
    },
    headerLeft: {
      flex: 1,
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
    autoGenerateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      gap: spacing.sm,
      minHeight: layout.buttonHeight,
      ...shadows.sm,
    },
    autoGenerateButtonText: {
      ...typography.smallBold,
      color: colors.textInverse,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    divider: {
      backgroundColor: colors.border,
    },
    balanceIndicator: {
      marginHorizontal: layout.screenPadding,
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceVariant,
    },
    balanceContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    balanceLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    balanceLabel: {
      ...typography.small,
      color: colors.textSecondary,
    },
    balanceValue: {
      ...typography.smallBold,
    },
    spreadValue: {
      ...typography.caption,
      color: colors.textTertiary,
    },
    swapHint: {
      ...typography.caption,
      color: colors.primary,
      marginTop: spacing.xs,
      fontStyle: 'italic',
    },
    balance_good: {
      backgroundColor: `${colors.success}15`,
      borderLeftWidth: 3,
      borderLeftColor: colors.success,
    },
    balance_fair: {
      backgroundColor: `${colors.warning}15`,
      borderLeftWidth: 3,
      borderLeftColor: colors.warning,
    },
    balance_poor: {
      backgroundColor: `${colors.error}15`,
      borderLeftWidth: 3,
      borderLeftColor: colors.error,
    },
    teamsList: {
      flex: 1,
      paddingHorizontal: layout.screenPadding,
      paddingTop: spacing.md,
    },
    noTeamsState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxxl,
      gap: spacing.md,
    },
    noTeamsText: {
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

const createCardStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.md,
      overflow: 'hidden',
      ...shadows.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.surfaceVariant,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    teamName: {
      ...typography.h4,
      color: colors.textPrimary,
    },
    handicapBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryLighter,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      gap: spacing.xs,
    },
    handicapLabel: {
      ...typography.caption,
      color: colors.primaryDark,
    },
    handicapValue: {
      ...typography.captionBold,
      color: colors.primaryDark,
    },
    membersList: {
      paddingVertical: spacing.sm,
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      minHeight: 52,
      borderRadius: borderRadius.md,
      marginHorizontal: spacing.sm,
      marginVertical: spacing.xs,
    },
    memberRowSelected: {
      backgroundColor: `${colors.primary}20`,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    memberRowSwapTarget: {
      backgroundColor: colors.surfaceVariant,
    },
    avatar: {
      marginRight: spacing.md,
    },
    memberInfo: {
      flex: 1,
    },
    memberName: {
      ...typography.body,
      color: colors.textPrimary,
    },
    memberHandicap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    memberHandicapLabel: {
      ...typography.caption,
      color: colors.textTertiary,
    },
    memberHandicapValue: {
      ...typography.smallBold,
      color: colors.textPrimary,
    },
    selectedIndicator: {
      marginLeft: spacing.sm,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: `${colors.primary}20`,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default TeamFormationUI;
