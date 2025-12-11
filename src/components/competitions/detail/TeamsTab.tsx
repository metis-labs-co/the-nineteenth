/**
 * TeamsTab - List of teams in a competition
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Icon, Surface, ActivityIndicator } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { ColorPalette } from '@/context/ThemeContext';
import { TeamCard } from '@/components/teams/TeamCard';
import { EditTeamNameModal } from '@/components/teams/EditTeamNameModal';
import type { Competition, TeamWithMembers } from '@/types/database.types';

export interface TeamsTabProps {
  teams: TeamWithMembers[];
  teamMode: Competition['team_mode'];
  isLoading: boolean;
  isOrganizer: boolean;
  /** Whether the organizer can edit team names (requires premium+ subscription) */
  canEditTeamNames?: boolean;
  onManageTeams: () => void;
  onUpdateTeamName?: (teamId: string, newName: string) => void;
  colors: ColorPalette;
}

export const TeamsTab = React.memo(function TeamsTab({
  teams,
  teamMode,
  isLoading,
  isOrganizer,
  canEditTeamNames = false,
  onManageTeams,
  onUpdateTeamName,
  colors,
}: TeamsTabProps) {
  // State for edit modal
  const [editingTeam, setEditingTeam] = useState<TeamWithMembers | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleEditTeam = useCallback((team: TeamWithMembers) => {
    setEditingTeam(team);
  }, []);

  const handleCloseModal = useCallback(() => {
    setEditingTeam(null);
    setIsSaving(false);
  }, []);

  const handleSaveTeamName = useCallback(
    (newName: string) => {
      if (editingTeam && onUpdateTeamName) {
        setIsSaving(true);
        onUpdateTeamName(editingTeam.id, newName);
        // Close modal after a short delay to show feedback
        setTimeout(() => {
          handleCloseModal();
        }, 300);
      }
    },
    [editingTeam, onUpdateTeamName, handleCloseModal]
  );

  // Show empty state if team mode is 'none'
  if (teamMode === 'none') {
    return (
      <Surface style={[styles.card, { backgroundColor: colors.white }]} elevation={1}>
        <View style={styles.emptyState}>
          <Icon source="account-group-outline" size={48} color={colors.gray300} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Team Mode</Text>
          <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
            This competition doesn't use teams.
          </Text>
        </View>
      </Surface>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.teamsLoadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading teams...</Text>
      </View>
    );
  }

  return (
    <View>
      {/* Organizer Actions */}
      {isOrganizer && (
        <View style={styles.organizerActions}>
          {/* Manage Teams Button */}
          <Pressable
            style={({ pressed }) => [
              styles.manageTeamsButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.9 },
            ]}
            onPress={onManageTeams}
            accessibilityLabel="Manage teams"
            accessibilityRole="button"
          >
            <Icon source="account-group" size={20} color={colors.white} />
            <Text style={[styles.manageTeamsButtonText, { color: colors.white }]}>Manage Teams</Text>
          </Pressable>
        </View>
      )}

      {/* Teams List */}
      {teams.length === 0 ? (
        <Surface style={[styles.card, { backgroundColor: colors.white }]} elevation={1}>
          <View style={styles.emptyState}>
            <Icon source="account-group-outline" size={48} color={colors.gray300} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No teams yet</Text>
            <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
              {isOrganizer
                ? 'Create teams to organize players for this competition.'
                : "Teams haven't been created yet."}
            </Text>
          </View>
        </Surface>
      ) : (
        <View style={styles.teamsList}>
          <Text style={[styles.teamsSectionTitle, { color: colors.textSecondary }]}>
            {teams.length} {teams.length === 1 ? 'Team' : 'Teams'}
          </Text>
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              isEditable={canEditTeamNames}
              onEdit={handleEditTeam}
              initiallyExpanded={false}
              testID={`team-card-${team.id}`}
            />
          ))}
        </View>
      )}

      {/* Edit Team Name Modal */}
      <EditTeamNameModal
        visible={!!editingTeam}
        currentName={editingTeam?.name ?? ''}
        onSave={handleSaveTeamName}
        onCancel={handleCloseModal}
        loading={isSaving}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  teamsList: {
    marginTop: spacing.sm,
  },
  teamsSectionTitle: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  teamsLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  organizerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  manageTeamsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  manageTeamsButtonText: {
    ...typography.bodyBold,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyTitle: {
    ...typography.bodyBold,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    ...typography.body,
    textAlign: 'center',
  },
});

export default TeamsTab;
