// src/components/teams/TeamFormationUI.tsx
import React, { useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  UIManager,
} from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { GolfBallLoader } from '@/components/common';
import { IconWand, IconUsers } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import type { Player, TeamWithMembers } from '@/types/database.types';

// Local imports
import { useTeamFormation } from './useTeamFormation';
import { TeamFormationCard } from './TeamFormationCard';
import { TeamBalanceIndicator } from './TeamBalanceIndicator';
import { TeamFormationActions } from './TeamFormationActions';
import { createStyles } from './TeamFormationUI.styles';

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

  // Use custom hook for all team formation logic
  const {
    teams,
    selectedPlayer,
    hasChanges,
    isGenerating,
    handicapSpread,
    balanceQuality,
    allPlayersAssigned,
    canSave,
    handleAutoGenerate,
    handlePlayerPress,
    handleReset,
  } = useTeamFormation({
    competitionId,
    teamSize,
    existingTeams,
    totalPlayers: players.length,
  });

  /**
   * Handle save - wraps the teams with the onSave callback
   */
  const handleSave = useCallback(() => {
    onSave(teams);
  }, [teams, onSave]);

  // =====================================================
  // RENDER - Empty state
  // =====================================================

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

  // =====================================================
  // RENDER - Main UI
  // =====================================================

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
            <GolfBallLoader size="sm" />
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
        <TeamBalanceIndicator
          balanceQuality={balanceQuality}
          handicapSpread={handicapSpread}
          showSwapHint={selectedPlayer !== null}
        />
      )}

      {/* Teams List */}
      <ScrollView style={styles.teamsList} showsVerticalScrollIndicator={false}>
        {teams.length === 0 ? (
          <View style={styles.noTeamsState}>
            <IconUsers size={32} color={colors.textTertiary} />
            <Text style={styles.noTeamsText}>
              Tap &quot;Auto-Generate&quot; to create balanced teams
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
            />
          ))
        )}
      </ScrollView>

      {/* Action Buttons */}
      <TeamFormationActions
        hasChanges={hasChanges}
        canSave={canSave}
        allPlayersAssigned={allPlayersAssigned}
        teamsExist={teams.length > 0}
        onReset={handleReset}
        onCancel={onCancel}
        onSave={handleSave}
      />
    </View>
  );
});

export default TeamFormationUI;
