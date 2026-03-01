/**
 * TeamFormationSection - Team formation for team game types
 *
 * Handles the team toggle card and inline team formation display
 * for Best Ball (auto-show), Scramble/Shamble/Match Play (toggle).
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { IconCheck, IconUsers } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { TeamFormationInline } from '@/components/scoring';
import type { GameType } from '@/types/database.types';
import type { PlayingPartner, ScrambleTeam } from '../../types';

interface TeamFormationSectionProps {
  selectedMatchType: GameType;
  selectedPartners: PlayingPartner[];
  teams: ScrambleTeam[];
  teamsLocked: boolean;
  splitIntoTeams: boolean;
  onShuffleTeams: () => void;
  onSplitIntoTeamsChange: (enabled: boolean) => void;
}

export const TeamFormationSection = memo(function TeamFormationSection({
  selectedMatchType,
  selectedPartners,
  teams,
  teamsLocked,
  splitIntoTeams,
  onShuffleTeams,
  onSplitIntoTeamsChange,
}: TeamFormationSectionProps) {
  const colors = useThemeColors();

  return (
    <>
      {/* Best Ball: Always show teams (no toggle) when there are partners */}
      {selectedMatchType === 'best-ball' && selectedPartners.length >= 1 && teams.length > 0 && (
        <>
          <View style={[styles.teamsDivider, { backgroundColor: colors.border }]} />
          <View style={styles.teamsFormation}>
            <TeamFormationInline
              teams={teams}
              onShuffle={onShuffleTeams}
              locked={teamsLocked}
            />
          </View>
        </>
      )}

      {/* Scramble/Shamble/Match Play: Show toggle for 3+ total players (2+ partners) */}
      {(selectedMatchType === 'scramble' || selectedMatchType === 'shamble' || selectedMatchType === 'match-play') && selectedPartners.length >= 2 && (
        <>
          <View style={[styles.teamsDivider, { backgroundColor: colors.border }]} />

          {/* Split into Teams Toggle */}
          <TouchableOpacity
            style={[
              styles.teamsToggle,
              {
                backgroundColor: colors.surface,
                borderColor: splitIntoTeams ? colors.primary : colors.border,
              },
            ]}
            onPress={() => onSplitIntoTeamsChange(!splitIntoTeams)}
            activeOpacity={0.7}
          >
            <View style={styles.teamsToggleContent}>
              <View
                style={[
                  styles.teamsIconContainer,
                  { backgroundColor: splitIntoTeams ? colors.primaryLighter : colors.gray100 },
                ]}
              >
                <IconUsers
                  size={20}
                  color={splitIntoTeams ? colors.primary : colors.gray400}
                />
              </View>
              <View style={styles.teamsToggleText}>
                <Text style={[styles.teamsToggleLabel, { color: colors.textPrimary }]}>
                  Split into Teams
                </Text>
                <Text style={[styles.teamsToggleDescription, { color: colors.textSecondary }]}>
                  {splitIntoTeams
                    ? teams.length > 0
                      ? `${teams.map((t) => t.members.length).join(' vs ')} split`
                      : 'Players divided into teams'
                    : selectedMatchType === 'match-play'
                      ? 'Individual match play (no teams)'
                      : 'All players as one team (default)'}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: splitIntoTeams ? colors.primary : colors.surface,
                  borderColor: splitIntoTeams ? colors.primary : colors.gray300,
                },
              ]}
            >
              {splitIntoTeams && <IconCheck size={14} color={colors.white} />}
            </View>
          </TouchableOpacity>

          {/* Team Formation Display (when split is enabled) */}
          {splitIntoTeams && teams.length > 0 && (
            <View style={styles.teamsFormation}>
              <TeamFormationInline
                teams={teams}
                onShuffle={onShuffleTeams}
                locked={teamsLocked}
              />
            </View>
          )}
        </>
      )}
    </>
  );
});

const styles = StyleSheet.create({
  teamsDivider: {
    height: 1,
    marginVertical: spacing.lg,
  },
  teamsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  teamsToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  teamsIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamsToggleText: {
    flex: 1,
  },
  teamsToggleLabel: {
    ...typography.bodyBold,
  },
  teamsToggleDescription: {
    ...typography.small,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamsFormation: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
});
