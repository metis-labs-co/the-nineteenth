/**
 * SimplifiedReviewStep - Simplified review step for new 3-4 step wizard
 *
 * Changes from original ReviewStep:
 * - Removed playersData prop (players added after creation)
 * - Removed teamSettingsData prop (shows simple enableTeams toggle)
 * - Accepts SimplifiedRoundFormData which allows blank rounds
 * - Shows "Not configured" for rounds without course
 * - Added optional prizePoolData prop for prize pool summary display
 */

import React from 'react';
import { View, StyleSheet, Platform, ScrollView } from 'react-native';
import { Button, Text, Divider, Chip, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconTrophy, IconDice, IconMedal, IconDots } from '@tabler/icons-react-native';
import type {
  CompetitionDetailsFormData,
  SimplifiedRoundFormData,
  GameType,
  CompetitionType,
  PrizePoolConfigFormData,
} from '@/schemas/competition';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors, type ColorPalette } from '@/context/ThemeContext';

// Prize pool color for styling
const PRIZE_POOL_COLOR = '#059669';

// Game type labels for display
const gameTypeLabels: Record<GameType, string> = {
  stableford: 'Stableford',
  stroke: 'Stroke Play',
  'match-play': 'Match Play',
  ambrose: 'Ambrose',
  'best-ball': 'Best Ball',
  scramble: 'Scramble',
};

// Competition type labels for display
const competitionTypeLabels: Record<CompetitionType, string> = {
  event: 'Event',
  league: 'League',
};

export interface SimplifiedReviewStepProps {
  competitionData: CompetitionDetailsFormData;
  roundsData: SimplifiedRoundFormData[];
  prizePoolData?: PrizePoolConfigFormData;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export default function SimplifiedReviewStep({
  competitionData,
  roundsData,
  prizePoolData,
  onSubmit,
  onBack,
  isSubmitting,
}: SimplifiedReviewStepProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  // Calculate prize pool values for display
  const hasPrizePool = !!prizePoolData;
  const fundingLabel =
    prizePoolData?.fundingType === 'per_player' ? 'Per Player' : 'Fixed Total';

  // Format currency
  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  // Format date for display (DD/MM/YYYY - Australian)
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
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

  // Count configured rounds
  const configuredRounds = roundsData.filter((r) => r.isConfigured || !!r.courseId).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Step Description */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Review all details before creating your competition. You can add players and configure
          rounds after creation.
        </Text>

        {/* Competition Details */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Competition Details
          </Text>
          <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

          <View style={styles.itemsContainer}>
            <ReviewItem label="Name" value={competitionData.name} colors={colors} />
            {competitionData.description && (
              <ReviewItem
                label="Description"
                value={competitionData.description}
                colors={colors}
              />
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
              <ReviewItem
                label="Invite Code"
                value={competitionData.inviteCode}
                colors={colors}
              />
            )}
            <ReviewItemWithBadge
              label="Teams"
              value={competitionData.enableTeams ? 'Team Competition' : 'Individual'}
              colors={colors}
            />
          </View>
        </View>

        {/* Rounds Details */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Rounds ({roundsData.length})
            </Text>
            {configuredRounds < roundsData.length && (
              <View style={[styles.warningBadge, { backgroundColor: colors.warningLight }]}>
                <Icon source="alert-circle-outline" size={14} color={colors.warning} />
                <Text style={[styles.warningBadgeText, { color: colors.warning }]}>
                  {roundsData.length - configuredRounds} not configured
                </Text>
              </View>
            )}
          </View>
          <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

          <View style={styles.itemsContainer}>
            {roundsData.map((round, index) => {
              const isConfigured = round.isConfigured || !!round.courseId;

              return (
                <View key={index} style={styles.roundContainer}>
                  <View style={styles.roundHeader}>
                    <Text style={[styles.roundNumber, { color: colors.primary }]}>
                      Round {index + 1}
                    </Text>
                    {isConfigured ? (
                      <View
                        style={[styles.statusBadge, { backgroundColor: colors.successLight }]}
                      >
                        <Icon source="check-circle" size={12} color={colors.success} />
                        <Text style={[styles.statusText, { color: colors.success }]}>
                          Configured
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.statusBadge, { backgroundColor: colors.gray100 }]}>
                        <Icon source="clock-outline" size={12} color={colors.gray500} />
                        <Text style={[styles.statusText, { color: colors.gray500 }]}>
                          Not configured
                        </Text>
                      </View>
                    )}
                  </View>

                  {isConfigured ? (
                    <>
                      {round.courseName && (
                        <ReviewItem label="Course" value={round.courseName} colors={colors} />
                      )}
                      <ReviewItem
                        label="Date"
                        value={formatDate(round.date)}
                        colors={colors}
                      />
                      {round.teeTime && (
                        <ReviewItem label="Tee Time" value={round.teeTime} colors={colors} />
                      )}
                      <ReviewItemWithBadge
                        label="Match Type"
                        value={gameTypeLabels[(round.matchType as GameType) || 'stableford']}
                        colors={colors}
                      />
                    </>
                  ) : (
                    <View
                      style={[styles.notConfiguredBox, { backgroundColor: colors.gray50 }]}
                    >
                      <Icon source="information-outline" size={16} color={colors.textSecondary} />
                      <Text style={[styles.notConfiguredText, { color: colors.textSecondary }]}>
                        Configure this round in competition settings after creation
                      </Text>
                    </View>
                  )}

                  {index < roundsData.length - 1 && (
                    <Divider
                      style={[styles.roundDivider, { backgroundColor: colors.gray200 }]}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Prize Pool Details (if configured) */}
        {hasPrizePool && prizePoolData && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.prizePoolIcon, { backgroundColor: `${PRIZE_POOL_COLOR}20` }]}>
                  <IconTrophy size={18} color={PRIZE_POOL_COLOR} />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Prize Pool</Text>
              </View>
              <Chip
                mode="flat"
                style={[styles.badge, { backgroundColor: PRIZE_POOL_COLOR }]}
                textStyle={[styles.badgeText, { color: colors.white }]}
              >
                {fundingLabel}
              </Chip>
            </View>
            <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

            <View style={styles.itemsContainer}>
              <ReviewItem
                label="Amount"
                value={formatCurrency(prizePoolData.fundingAmount)}
                colors={colors}
              />
              {prizePoolData.fundingType === 'per_player' && (
                <View style={[styles.perPlayerNote, { backgroundColor: colors.gray50 }]}>
                  <Text style={[styles.perPlayerNoteText, { color: colors.textSecondary }]}>
                    Total calculated when players are added
                  </Text>
                </View>
              )}

              {/* Allocation breakdown */}
              <View style={styles.allocationContainer}>
                {prizePoolData.skinsAllocationPercent > 0 && (
                  <View style={styles.allocationRow}>
                    <View style={styles.allocationLabel}>
                      <View style={[styles.colorDot, { backgroundColor: '#8B5CF6' }]} />
                      <IconDice size={14} color="#8B5CF6" />
                      <Text style={[styles.allocationText, { color: colors.textPrimary }]}>
                        Skins Games
                      </Text>
                    </View>
                    <Text style={[styles.allocationValue, { color: colors.textSecondary }]}>
                      {prizePoolData.skinsAllocationPercent}%
                    </Text>
                  </View>
                )}
                {prizePoolData.winnerAllocationPercent > 0 && (
                  <View style={styles.allocationRow}>
                    <View style={styles.allocationLabel}>
                      <View style={[styles.colorDot, { backgroundColor: '#F59E0B' }]} />
                      <IconMedal size={14} color="#F59E0B" />
                      <Text style={[styles.allocationText, { color: colors.textPrimary }]}>
                        Winner Prizes
                      </Text>
                    </View>
                    <Text style={[styles.allocationValue, { color: colors.textSecondary }]}>
                      {prizePoolData.winnerAllocationPercent}%
                    </Text>
                  </View>
                )}
                {prizePoolData.otherAllocationPercent > 0 && (
                  <View style={styles.allocationRow}>
                    <View style={styles.allocationLabel}>
                      <View style={[styles.colorDot, { backgroundColor: '#6B7280' }]} />
                      <IconDots size={14} color="#6B7280" />
                      <Text style={[styles.allocationText, { color: colors.textPrimary }]}>
                        Other
                      </Text>
                    </View>
                    <Text style={[styles.allocationValue, { color: colors.textSecondary }]}>
                      {prizePoolData.otherAllocationPercent}%
                    </Text>
                  </View>
                )}
              </View>

              {prizePoolData.autoSplitSkins && prizePoolData.skinsAllocationPercent > 0 && (
                <View style={[styles.autoSplitNote, { backgroundColor: colors.infoLight }]}>
                  <Icon source="dice-6" size={14} color={colors.info} />
                  <Text style={[styles.autoSplitNoteText, { color: colors.infoDark }]}>
                    Skins auto-split across {roundsData.length} round{roundsData.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Important Notes */}
        <View style={[styles.infoBox, { backgroundColor: colors.infoLight }]}>
          <Icon source="information" size={20} color={colors.info} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: colors.info }]}>After creation:</Text>
            <View style={styles.infoList}>
              <Text style={[styles.infoText, { color: colors.info }]}>
                • Add players from the competition details screen
              </Text>
              <Text style={[styles.infoText, { color: colors.info }]}>
                • Configure any unconfigured rounds
              </Text>
              <Text style={[styles.infoText, { color: colors.info }]}>
                • Share the invite code with players to join
              </Text>
              {competitionData.enableTeams && (
                <Text style={[styles.infoText, { color: colors.info }]}>
                  • Set up team assignments and format
                </Text>
              )}
              {hasPrizePool && (
                <Text style={[styles.infoText, { color: colors.info }]}>
                  • Prize pool will be locked once first round starts
                </Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons - Sticky Footer */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, spacing.lg),
            backgroundColor: colors.surface,
            borderTopColor: colors.gray200,
          },
        ]}
      >
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
      <Chip
        mode="flat"
        style={[styles.badge, { backgroundColor: colors.primary }]}
        textStyle={[styles.badgeText, { color: colors.white }]}
      >
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.bodyBold,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  warningBadgeText: {
    ...typography.caption,
    fontWeight: '500',
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
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  roundNumber: {
    ...typography.smallBold,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '500',
  },
  notConfiguredBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  notConfiguredText: {
    ...typography.small,
    flex: 1,
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...typography.smallBold,
    marginBottom: spacing.sm,
  },
  infoList: {
    gap: spacing.xs,
  },
  infoText: {
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
  // Prize pool styles
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  prizePoolIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  perPlayerNote: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  perPlayerNoteText: {
    ...typography.caption,
    textAlign: 'center',
  },
  allocationContainer: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  allocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  allocationLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  allocationText: {
    ...typography.small,
  },
  allocationValue: {
    ...typography.small,
  },
  autoSplitNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  autoSplitNoteText: {
    ...typography.caption,
    flex: 1,
  },
});

export { SimplifiedReviewStep };
