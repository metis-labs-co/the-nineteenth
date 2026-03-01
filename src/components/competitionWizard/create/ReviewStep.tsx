import React from 'react';
import { View, StyleSheet, Platform, ScrollView } from 'react-native';
import {
  Button,
  Text,
  Divider,
  Avatar,
  Chip,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type {
  CompetitionDetailsFormData,
  TeamSettingsFormData,
  RoundDetailsFormData,
  PlayerFormData,
  GameType,
  TeamMode,
  CompetitionType,
} from '@/schemas/competition';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors, type ColorPalette } from '@/context/ThemeContext';

// Game type labels for display (values match database.types.ts)
const gameTypeLabels: Record<GameType, string> = {
  'stableford': 'Stableford',
  'stroke': 'Stroke Play',
  'par': 'Par',
  'match-play': 'Match Play',
  'best-ball': 'Best Ball',
  'scramble': 'Scramble',
  'shamble': 'Shamble',
};

// Team mode labels for display (values match database.types.ts)
const teamModeLabels: Record<TeamMode, string> = {
  'none': 'Individual Competition',
  'fixed': 'Fixed Teams',
  'per-round': 'Per-Round Teams',
};

// Competition type labels for display
const competitionTypeLabels: Record<CompetitionType, string> = {
  'event': 'Event',
  'knockout': 'Knockout',
};

interface ReviewStepProps {
  competitionData: CompetitionDetailsFormData;
  teamSettingsData: TeamSettingsFormData;
  roundsData: RoundDetailsFormData[];
  playersData: PlayerFormData[];
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export default function ReviewStep({
  competitionData,
  teamSettingsData,
  roundsData,
  playersData,
  onSubmit,
  onBack,
  isSubmitting,
}: ReviewStepProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  // Format date for display (DD/MM/YYYY - Australian)
  const formatDate = (dateString: string) => {
    // Handle both DD/MM/YYYY format and ISO format
    if (dateString.includes('/')) {
      return dateString;
    }
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Format handicap system for display
  const formatHandicapSystem = (system: string) => {
    const mapping: Record<string, string> = {
      honor: 'Honour System',
      'golf-australia': 'Golf Australia Verified',
      'gross-only': 'Gross Scores Only',
    };
    return mapping[system] || system;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Step Description */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Review all details before creating your competition. You&apos;ll receive an invite code
          to share with players.
        </Text>

        {/* Competition Details */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Competition Details</Text>
          <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

          <View style={styles.itemsContainer}>
            <ReviewItem label="Name" value={competitionData.name} colors={colors} />
            {competitionData.description && (
              <ReviewItem label="Description" value={competitionData.description} colors={colors} />
            )}
            <ReviewItemWithBadge
              label="Type"
              value={competitionTypeLabels[competitionData.competitionType]}
              colors={colors}
            />
            <ReviewItem
              label="Start Date"
              value={formatDate(competitionData.startDate)}
              colors={colors}
            />
            {competitionData.competitionType === 'event' && competitionData.endDate && (
              <ReviewItem
                label="End Date"
                value={formatDate(competitionData.endDate)}
                colors={colors}
              />
            )}
            <ReviewItem
              label="Handicap System"
              value={formatHandicapSystem(competitionData.handicapSystem)}
              colors={colors}
            />
            {competitionData.inviteCode && (
              <ReviewItem label="Invite Code" value={competitionData.inviteCode} colors={colors} />
            )}
          </View>
        </View>

        {/* Team Settings */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Team Settings</Text>
          <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

          <View style={styles.itemsContainer}>
            <ReviewItemWithBadge
              label="Team Format"
              value={teamModeLabels[teamSettingsData.teamMode]}
              colors={colors}
            />
            {teamSettingsData.teamMode !== 'none' && (
              <ReviewItem
                label="Team Size"
                value={`${teamSettingsData.teamSize} players per team`}
                colors={colors}
              />
            )}
            <View style={styles.item}>
              <Text style={[styles.itemLabel, { color: colors.textSecondary }]}>Point System</Text>
              <View style={styles.pointsPreview}>
                {teamSettingsData.pointSystem.slice(0, 4).map((entry, index) => (
                  <View key={index} style={[styles.pointBadge, { backgroundColor: colors.gray100 }]}>
                    <Text style={[styles.pointPosition, { color: colors.textSecondary }]}>
                      {entry.position}{entry.position === 1 ? 'st' : entry.position === 2 ? 'nd' : entry.position === 3 ? 'rd' : 'th'}
                    </Text>
                    <Text style={[styles.pointValue, { color: colors.textPrimary }]}>{entry.points}</Text>
                  </View>
                ))}
                {teamSettingsData.pointSystem.length > 4 && (
                  <Text style={[styles.morePointsText, { color: colors.textSecondary }]}>
                    +{teamSettingsData.pointSystem.length - 4}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Rounds Details */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Rounds ({roundsData.length})
          </Text>
          <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

          <View style={styles.itemsContainer}>
            {roundsData.map((round, index) => (
              <View key={index} style={styles.roundContainer}>
                {roundsData.length > 1 && (
                  <Text style={[styles.roundNumber, { color: colors.primary }]}>Round {index + 1}</Text>
                )}
                <ReviewItem label="Course" value={round.courseName} colors={colors} />
                <ReviewItem label="Date" value={formatDate(round.date)} colors={colors} />
                {round.teeTime && (
                  <ReviewItem label="Tee Time" value={round.teeTime} colors={colors} />
                )}
                <ReviewItemWithBadge
                  label="Match Type"
                  value={gameTypeLabels[round.matchType || 'stableford']}
                  colors={colors}
                />
                {index < roundsData.length - 1 && (
                  <Divider style={[styles.roundDivider, { backgroundColor: colors.gray200 }]} />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Players */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Players ({playersData.length})</Text>
          <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

          <View style={styles.itemsContainer}>
            {playersData.map((player, index) => (
              <View key={index} style={styles.playerRow}>
                <View style={styles.playerContent}>
                  {/* Avatar */}
                  <Avatar.Text
                    size={40}
                    label={player.name.charAt(0).toUpperCase()}
                    style={[styles.avatar, { backgroundColor: colors.primary }]}
                  />

                  {/* Player Info */}
                  <View style={styles.playerInfo}>
                    <Text style={[styles.playerName, { color: colors.textPrimary }]}>{player.name}</Text>
                    <Text style={[styles.playerDetails, { color: colors.textSecondary }]}>
                      {player.email || 'No email'}
                      {player.handicap && ` • HC: ${player.handicap}`}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Important Notes */}
        <View style={[styles.warningBox, { backgroundColor: colors.gray100 }]}>
          <Text style={[styles.warningTitle, { color: colors.textPrimary }]}>Before you continue:</Text>
          <View style={styles.warningList}>
            <Text style={[styles.warningText, { color: colors.textSecondary }]}>• This competition will be created as private</Text>
            <Text style={[styles.warningText, { color: colors.textSecondary }]}>• You&apos;ll receive an invite code to share with players</Text>
            <Text style={[styles.warningText, { color: colors.textSecondary }]}>• Players can join using the invite code</Text>
            <Text style={[styles.warningText, { color: colors.textSecondary }]}>• You can edit details after creation</Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons - Sticky Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg), backgroundColor: colors.surface, borderTopColor: colors.gray200 }]}>
        <Button
          mode="outlined"
          onPress={onBack}
          style={[styles.backButton, { borderColor: colors.gray300 }]}
          contentStyle={styles.buttonContent}
          textColor={colors.textSecondary}
          disabled={isSubmitting}
          theme={{ colors: { outline: colors.gray300 } }}
        >
          Back
        </Button>
        <Button
          mode="contained"
          onPress={onSubmit}
          style={styles.createButton}
          contentStyle={styles.buttonContent}
          buttonColor={colors.primary}
          textColor={colors.white}
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Create Competition'}
        </Button>
      </View>
    </View>
  );
}

// Helper component for review items
interface ReviewItemProps {
  label: string;
  value: string;
  colors: ColorPalette;
}

function ReviewItem({ label, value, colors }: ReviewItemProps) {
  return (
    <View style={styles.item}>
      <Text style={[styles.itemLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.itemValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

// Helper component for review item with badge
function ReviewItemWithBadge({ label, value, colors }: ReviewItemProps) {
  return (
    <View style={styles.item}>
      <Text style={[styles.itemLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Chip mode="flat" style={[styles.badge, { backgroundColor: colors.primary }]} textStyle={[styles.badgeText, { color: colors.white }]}>
        {value}
      </Chip>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl + 80,
  },
  description: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  sectionTitle: {
    ...typography.bodyBold,
  },
  divider: {
    marginVertical: spacing.md,
  },
  itemsContainer: {
    gap: spacing.md,
  },
  roundContainer: {
    gap: spacing.sm,
  },
  roundNumber: {
    ...typography.smallBold,
    marginBottom: spacing.xs,
  },
  roundDivider: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pointsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 2,
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  pointBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    minWidth: 40,
  },
  pointPosition: {
    ...typography.caption,
  },
  pointValue: {
    ...typography.smallBold,
  },
  morePointsText: {
    ...typography.caption,
    marginLeft: spacing.xs,
  },
  itemLabel: {
    ...typography.body,
    flex: 1,
  },
  itemValue: {
    ...typography.body,
    flex: 2,
    textAlign: 'right',
  },
  badge: {
    height: 28,
  },
  badgeText: {
    ...typography.captionBold,
  },
  playerRow: {
    paddingVertical: spacing.sm,
  },
  playerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {},
  playerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  playerName: {
    ...typography.bodyBold,
  },
  playerDetails: {
    ...typography.small,
    marginTop: 2,
  },
  warningBox: {
    padding: spacing.lg,
    borderRadius: borderRadius.md,
  },
  warningTitle: {
    ...typography.smallBold,
  },
  warningList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  warningText: {
    ...typography.small,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  backButton: {
    flex: 1,
    borderRadius: borderRadius.md,
  },
  createButton: {
    flex: 2,
    borderRadius: borderRadius.md,
  },
  buttonContent: {
    height: 48,
  },
});
