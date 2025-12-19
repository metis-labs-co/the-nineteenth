/**
 * GeneratedPreview - Competition preview from AI generation
 *
 * Displays a summary of the AI-generated competition configuration
 * with sections for competition details, rounds, teams, and players.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '@/constants/theme';
import type { GeneratedCompetition } from '@/hooks/useGenerateAICompetition';
import { GAME_TYPE_LABELS } from '@/constants/statusConfig';

interface GeneratedPreviewProps {
  competition: GeneratedCompetition;
  onCreateCompetition: () => void;
  onEditManually: () => void;
  isCreating?: boolean;
}

const HANDICAP_LABELS: Record<string, string> = {
  honor: 'Honour System',
  'golf-australia': 'Golf Australia',
  'gross-only': 'Gross Only',
};

const TEAM_MODE_LABELS: Record<string, string> = {
  none: 'Individual',
  fixed: 'Fixed Teams',
  'per-round': 'Rotating Teams',
};

export function GeneratedPreview({
  competition,
  onCreateCompetition,
  onEditManually,
  isCreating = false,
}: GeneratedPreviewProps) {
  const colors = useThemeColors();

  // Check for issues that need user attention
  const roundsWithMissingCourses = competition.rounds.filter(
    (r) => r.courseNotFound || !r.courseId
  );
  const hasWarnings =
    roundsWithMissingCourses.length > 0 ||
    (competition.validationErrors && competition.validationErrors.length > 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Competition Details Card */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.cardHeader}>
          <Icon source="trophy" size={20} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Competition Details
          </Text>
        </View>

        <View style={styles.cardContent}>
          <Text style={[styles.competitionName, { color: colors.textPrimary }]}>
            {competition.name}
          </Text>

          {competition.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {competition.description}
            </Text>
          )}

          <View style={styles.detailsGrid}>
            <DetailItem
              label="Type"
              value={
                competition.competitionType === 'event' ? 'Event' : 'League'
              }
              colors={colors}
            />
            <DetailItem
              label="Dates"
              value={
                competition.endDate
                  ? `${competition.startDate} - ${competition.endDate}`
                  : competition.startDate
              }
              colors={colors}
            />
            <DetailItem
              label="Handicap"
              value={HANDICAP_LABELS[competition.handicapSystem]}
              colors={colors}
            />
            <DetailItem
              label="Format"
              value={
                competition.teamMode !== 'none'
                  ? `${TEAM_MODE_LABELS[competition.teamMode]} (${competition.teamSize} per team)`
                  : 'Individual'
              }
              colors={colors}
            />
          </View>
        </View>
      </View>

      {/* Rounds Card */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.cardHeader}>
          <Icon source="golf" size={20} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Rounds ({competition.rounds.length})
          </Text>
        </View>

        <View style={styles.cardContent}>
          {competition.rounds.map((round, index) => (
            <View key={index}>
              {index > 0 && <Divider style={styles.divider} />}
              <View style={styles.roundItem}>
                <View style={styles.roundHeader}>
                  <Text
                    style={[styles.roundNumber, { color: colors.primary }]}
                  >
                    R{round.roundNumber}
                  </Text>
                  <View style={styles.roundDetails}>
                    <Text
                      style={[styles.courseName, { color: colors.textPrimary }]}
                    >
                      {round.venueName} - {round.courseName}
                    </Text>
                    <Text
                      style={[styles.roundMeta, { color: colors.textSecondary }]}
                    >
                      {round.date} •{' '}
                      {GAME_TYPE_LABELS[round.gameType] || round.gameType}
                      {round.teeTime && ` • ${round.teeTime}`}
                    </Text>
                  </View>
                </View>
                {round.courseNotFound && (
                  <View
                    style={[
                      styles.warningBadge,
                      { backgroundColor: colors.warningLight },
                    ]}
                  >
                    <Icon source="alert" size={14} color={colors.warning} />
                    <Text
                      style={[styles.warningText, { color: colors.warning }]}
                    >
                      Course not found - select manually
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Teams Card (if teams enabled) */}
      {competition.teams && competition.teams.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <Icon source="account-group" size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Teams ({competition.teams.length})
            </Text>
          </View>

          <View style={styles.cardContent}>
            {competition.teams.map((team, index) => {
              const teamPlayers = team.playerIds
                .map((id) => competition.players.find((p) => p.id === id))
                .filter((p): p is NonNullable<typeof p> => p !== undefined);

              return (
                <View key={index}>
                  {index > 0 && <Divider style={styles.divider} />}
                  <View style={styles.teamItem}>
                    <Text
                      style={[styles.teamName, { color: colors.textPrimary }]}
                    >
                      {team.name}
                    </Text>
                    <Text
                      style={[
                        styles.teamPlayers,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {teamPlayers
                        .map(
                          (p) =>
                            `${p.name}${p.handicap !== null ? ` (${p.handicap})` : ''}`
                        )
                        .join(', ')}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Players Card */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.cardHeader}>
          <Icon source="account-multiple" size={20} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Players ({competition.players.length})
          </Text>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.playersGrid}>
            {competition.players.map((player, index) => (
              <View
                key={index}
                style={[
                  styles.playerChip,
                  { backgroundColor: colors.gray100 },
                ]}
              >
                <Text
                  style={[styles.playerName, { color: colors.textPrimary }]}
                >
                  {player.name}
                </Text>
                {player.handicap !== null && (
                  <Text
                    style={[
                      styles.playerHandicap,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {player.handicap}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Assumptions/Warnings */}
      {(competition.assumptions?.length || competition.validationErrors?.length) && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <Icon source="information" size={20} color={colors.info} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              AI Notes
            </Text>
          </View>

          <View style={styles.cardContent}>
            {competition.assumptions?.map((assumption, index) => (
              <View key={`a-${index}`} style={styles.noteItem}>
                <Icon source="lightbulb" size={16} color={colors.info} />
                <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                  {assumption}
                </Text>
              </View>
            ))}
            {competition.validationErrors?.map((error, index) => (
              <View key={`e-${index}`} style={styles.noteItem}>
                <Icon source="alert" size={16} color={colors.warning} />
                <Text style={[styles.noteText, { color: colors.warning }]}>
                  {error}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[
            styles.secondaryButton,
            { borderColor: colors.primary },
          ]}
          onPress={onEditManually}
          disabled={isCreating}
        >
          <Icon source="pencil" size={20} color={colors.primary} />
          <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
            Edit Manually
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            { backgroundColor: hasWarnings ? colors.warning : colors.primary },
            isCreating && { opacity: 0.7 },
          ]}
          onPress={onCreateCompetition}
          disabled={isCreating}
        >
          {isCreating ? (
            <Text style={[styles.primaryButtonText, { color: colors.white }]}>
              Creating...
            </Text>
          ) : (
            <>
              <Icon
                source={hasWarnings ? 'alert-circle' : 'check'}
                size={20}
                color={colors.white}
              />
              <Text style={[styles.primaryButtonText, { color: colors.white }]}>
                {hasWarnings ? 'Create Anyway' : 'Create Competition'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

interface DetailItemProps {
  label: string;
  value: string;
  colors: ReturnType<typeof useThemeColors>;
}

function DetailItem({ label, value, colors }: DetailItemProps) {
  return (
    <View style={styles.detailItem}>
      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    borderRadius: borderRadius.lg,
    ...shadows.sm,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  cardTitle: {
    ...typography.bodyBold,
  },
  cardContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  competitionName: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.body,
    marginBottom: spacing.md,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  detailItem: {
    minWidth: '45%',
  },
  detailLabel: {
    ...typography.caption,
    marginBottom: 2,
  },
  detailValue: {
    ...typography.body,
  },
  divider: {
    marginVertical: spacing.sm,
  },
  roundItem: {
    gap: spacing.xs,
  },
  roundHeader: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  roundNumber: {
    ...typography.bodyBold,
    width: 28,
  },
  roundDetails: {
    flex: 1,
  },
  courseName: {
    ...typography.body,
  },
  roundMeta: {
    ...typography.small,
    marginTop: 2,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginLeft: 40,
    marginTop: spacing.xs,
  },
  warningText: {
    ...typography.caption,
  },
  teamItem: {
    gap: 2,
  },
  teamName: {
    ...typography.bodyBold,
  },
  teamPlayers: {
    ...typography.small,
  },
  playersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  playerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  playerName: {
    ...typography.small,
  },
  playerHandicap: {
    ...typography.caption,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  noteText: {
    ...typography.small,
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
  },
  secondaryButtonText: {
    ...typography.bodyBold,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  primaryButtonText: {
    ...typography.bodyBold,
  },
});

export default GeneratedPreview;
