/**
 * TeamsSection - Team roster view for team-format rounds.
 *
 * Shown on the Details tab whenever `round.is_team_round` is true. Renders
 * each team as a card with its members and handicaps so players can see
 * "who's on my team" for this round at a glance.
 *
 * Teams are pulled from `useRoundTeams`, which handles both:
 *   - Competition rounds (`teams` table keyed by `competition_id`), and
 *   - Standalone rounds (team_config JSONB on `rounds`).
 *
 * This is distinct from `GroupsSection` (physical tee-time groupings) and
 * from `SubMatchesTab` (Ryder-Cup head-to-head breakdown). A team-match
 * round can show all three: Teams = sides, Groups = tee times, Sub-Matches
 * = head-to-head pairings.
 */

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { GolfBallLoader } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useRoundTeams } from '@/hooks/scorecard/useRoundTeams';
import { getTeamColorHex } from '@/utils/teamColor';

export interface TeamsSectionProps {
  roundId: string;
  competitionId: string | null;
  cardBackground: string;
  /**
   * The currently logged-in user's player ID. When provided, their team
   * card gets a primary-coloured border and their member row shows a "You"
   * pill — same pattern as the competition Teams tab.
   */
  currentUserId?: string;
}

interface TeamMemberDisplay {
  id: string;
  name: string;
  handicap: number | null;
}

export function TeamsSection({
  roundId,
  competitionId,
  cardBackground,
  currentUserId,
}: TeamsSectionProps) {
  const colors = useThemeColors();
  const {
    teams,
    isLoading,
  } = useRoundTeams(competitionId ?? undefined, true, roundId);

  const teamViewModels = useMemo(
    () =>
      teams.map((team, teamIndex) => {
        const members: TeamMemberDisplay[] = (team.members ?? [])
          .filter((m) => !!m.player)
          .map((m) => ({
            id: m.player_id,
            name: m.player?.name ?? 'Unknown',
            handicap: m.player?.handicap ?? null,
          }));
        // Simple aggregate label — sum of handicaps. Useful for team stroke
        // play; for best-ball it's informational. Skipped if any member has
        // no handicap so we don't show a misleading total.
        const hasAllHandicaps = members.every((m) => typeof m.handicap === 'number');
        const totalHandicap = hasAllHandicaps
          ? members.reduce((sum, m) => sum + (m.handicap ?? 0), 0)
          : null;
        return {
          id: team.id,
          name: team.name,
          color: team.color,
          fallbackIndex: teamIndex,
          members,
          totalHandicap,
        };
      }),
    [teams]
  );

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Teams</Text>
        {teamViewModels.length > 0 && (
          <View style={[styles.countBadge, { backgroundColor: colors.primaryLighter }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>
              {teamViewModels.length}
            </Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View
          style={[
            styles.card,
            styles.loadingContainer,
            { backgroundColor: cardBackground, borderColor: colors.border },
          ]}
        >
          <GolfBallLoader size="sm" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading teams…
          </Text>
        </View>
      ) : teamViewModels.length === 0 ? (
        <View
          style={[
            styles.card,
            styles.emptyContainer,
            { backgroundColor: cardBackground, borderColor: colors.border },
          ]}
        >
          <Icon source="account-group-outline" size={32} color={colors.gray400} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Teams for this round will appear here once the organiser sets them up.
          </Text>
        </View>
      ) : (
        <View style={styles.teamsList}>
          {teamViewModels.map((t) => {
            const isUsersTeam =
              !!currentUserId && t.members.some((m) => m.id === currentUserId);
            return (
            <View
              key={t.id}
              style={[
                styles.card,
                {
                  backgroundColor: cardBackground,
                  borderColor: isUsersTeam ? colors.primary : colors.border,
                  borderWidth: isUsersTeam ? 2 : 1,
                },
              ]}
            >
              <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                <View style={styles.cardHeaderLeft}>
                  <View
                    style={[
                      styles.teamAccent,
                      {
                        backgroundColor: getTeamColorHex(
                          t.color,
                          t.fallbackIndex,
                          colors
                        ),
                      },
                    ]}
                  />
                  <Text style={[styles.teamName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {t.name}
                  </Text>
                </View>
                {t.totalHandicap !== null && (
                  <View style={[styles.handicapPill, { backgroundColor: colors.surfaceVariant }]}>
                    <Text style={[styles.handicapPillText, { color: colors.textSecondary }]}>
                      Team HC {t.totalHandicap}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.membersBody}>
                {t.members.length === 0 ? (
                  <Text style={[styles.emptyMembers, { color: colors.textSecondary }]}>
                    No players assigned yet
                  </Text>
                ) : (
                  t.members.map((m) => {
                    const isMe = !!currentUserId && m.id === currentUserId;
                    return (
                      <View key={m.id} style={styles.memberRow}>
                        <View
                          style={[
                            styles.memberAvatar,
                            { backgroundColor: colors.primaryLighter },
                          ]}
                        >
                          <Text
                            style={[styles.memberInitial, { color: colors.primary }]}
                          >
                            {m.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.memberNameRow}>
                          <Text
                            style={[styles.memberName, { color: colors.textPrimary }]}
                            numberOfLines={1}
                          >
                            {m.name}
                          </Text>
                          {isMe && (
                            <View
                              style={[
                                styles.youPill,
                                { backgroundColor: colors.primaryLighter },
                              ]}
                              accessibilityLabel="You"
                            >
                              <Text
                                style={[
                                  styles.youPillText,
                                  { color: colors.primaryDark },
                                ]}
                              >
                                You
                              </Text>
                            </View>
                          )}
                        </View>
                        {m.handicap !== null && (
                          <Text
                            style={[styles.memberHandicap, { color: colors.textSecondary }]}
                          >
                            HC {m.handicap}
                          </Text>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h4,
  },
  countBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  countText: {
    ...typography.captionBold,
  },
  teamsList: {
    gap: spacing.md,
  },

  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  teamAccent: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.full,
  },
  teamName: {
    ...typography.bodyBold,
    flex: 1,
  },
  handicapPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  handicapPillText: {
    ...typography.captionBold,
  },

  membersBody: {
    paddingVertical: spacing.xs,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInitial: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  memberNameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  memberName: {
    ...typography.body,
    flexShrink: 1,
  },
  youPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  youPillText: {
    ...typography.caption,
    fontWeight: '600',
  },
  memberHandicap: {
    ...typography.caption,
  },
  emptyMembers: {
    ...typography.small,
    padding: spacing.md,
    fontStyle: 'italic',
  },

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.small,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
  },
});

export default TeamsSection;
