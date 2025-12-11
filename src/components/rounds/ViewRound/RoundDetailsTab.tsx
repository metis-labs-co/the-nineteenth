/**
 * RoundDetailsTab - Details tab for ViewRoundScreen
 *
 * Displays round information including:
 * - Course header card with icon, name, venue link, and quick stats
 * - Round details (date, tee time, format, status)
 * - Hole breakdown table with OUT/IN/TOTAL summaries
 *
 * Styled to match CourseScreen design patterns.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Icon, Avatar, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { StatusBadge, type StatusVariant } from '@/components/common/StatusBadge';
import { Pill } from '@/components/common/Pill';
import { formatDateWithWeekday, formatTeeTime } from '@/utils/formatting';
import { useSettingsStore } from '@/store/settingsStore';
import { useScoringPairs } from '@/hooks/useScoringPairs';
import type { RoundWithCourse, CompetitionSummary } from '@/hooks/useRoundDetails';
import type { RootStackParamList } from '@/navigation/types';
import type { GameType, Hole, CompetitionType, ScoringPairWithPlayers } from '@/types/database.types';

// =====================================================
// CONSTANTS
// =====================================================

const GAME_TYPE_LABELS: Record<GameType, string> = {
  stableford: 'Stableford',
  stroke: 'Stroke Play',
  'match-play': 'Match Play',
  ambrose: 'Ambrose',
  'best-ball': 'Best Ball',
  scramble: 'Scramble',
};

const COMPETITION_TYPE_LABELS: Record<CompetitionType, string> = {
  league: 'League',
  event: 'Event',
};

// =====================================================
// TYPES
// =====================================================

interface RoundDetailsTabProps {
  round: RoundWithCourse;
  isOrganizer?: boolean;
  isPremium?: boolean;
  onEditPress?: () => void;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// =====================================================
// HOLE TABLE COMPONENT
// =====================================================

interface HoleTableProps {
  holes: Hole[];
  selectedTee: string | null;
  useMetres: boolean;
}

/**
 * Converts yards to metres (1 yard = 0.9144 metres)
 */
function yardsToMetres(yards: number): number {
  return Math.round(yards * 0.9144);
}

function HoleTable({ holes, selectedTee, useMetres }: HoleTableProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();

  const headerBg = isDark ? colors.gray200 : colors.gray100;
  const rowBg = isDark ? colors.gray100 : colors.white;
  const altRowBg = isDark ? colors.gray50 : colors.gray50;
  const totalRowBg = isDark ? colors.primary + '30' : colors.primaryLighter;

  // Sort holes by number
  const sortedHoles = useMemo(
    () => [...holes].sort((a, b) => a.number - b.number),
    [holes]
  );

  // Split into front 9 and back 9
  const frontNine = sortedHoles.filter((h) => h.number <= 9);
  const backNine = sortedHoles.filter((h) => h.number > 9);

  // Calculate totals
  const frontPar = frontNine.reduce((sum, h) => sum + h.par, 0);
  const backPar = backNine.reduce((sum, h) => sum + h.par, 0);
  const totalPar = frontPar + backPar;

  const frontYardage = frontNine.reduce(
    (sum, h) => sum + (selectedTee && h.yardages?.[selectedTee] ? h.yardages[selectedTee] : 0),
    0
  );
  const backYardage = backNine.reduce(
    (sum, h) => sum + (selectedTee && h.yardages?.[selectedTee] ? h.yardages[selectedTee] : 0),
    0
  );
  const totalYardage = frontYardage + backYardage;

  // Convert to display distance based on user preference
  const formatDistance = (yards: number | undefined | null): string | number => {
    if (!yards) return '-';
    return useMetres ? yardsToMetres(yards) : yards;
  };

  const renderHoleRow = (hole: Hole, index: number) => {
    const yardage = selectedTee ? hole.yardages?.[selectedTee] : undefined;
    const displayDistance = formatDistance(yardage);
    const bgColor = index % 2 === 0 ? rowBg : altRowBg;

    return (
      <View key={hole.number} style={[styles.tableRow, { backgroundColor: bgColor }]}>
        <View style={[styles.tableCell, styles.holeCellWide]}>
          <Text style={[styles.holeNumber, { color: colors.textPrimary }]}>{hole.number}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCenter]}>
          <Text style={[styles.cellText, { color: colors.textPrimary }]}>{hole.par}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCenter]}>
          <Text style={[styles.cellText, { color: colors.textPrimary }]}>{hole.strokeIndex}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCenter]}>
          <Text style={[styles.cellText, { color: yardage ? colors.textPrimary : colors.textTertiary }]}>
            {displayDistance}
          </Text>
        </View>
      </View>
    );
  };

  const renderTotalRow = (label: string, par: number, yardage: number) => {
    const displayDistance = formatDistance(yardage);
    return (
      <View key={label} style={[styles.tableRow, styles.totalRow, { backgroundColor: totalRowBg }]}>
        <View style={[styles.tableCell, styles.holeCellWide]}>
          <Text style={[styles.totalLabel, { color: colors.primary }]}>{label}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCenter]}>
          <Text style={[styles.totalValue, { color: colors.primary }]}>{par}</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCenter]}>
          <Text style={[styles.totalValue, { color: colors.primary }]}>-</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCenter]}>
          <Text style={[styles.totalValue, { color: yardage ? colors.primary : colors.textTertiary }]}>
            {displayDistance}
          </Text>
        </View>
      </View>
    );
  };

  // Distance column header based on user preference
  const distanceHeader = useMetres ? 'Mtrs' : 'Yds';

  return (
    <View style={[styles.tableContainer, { borderColor: colors.border }]}>
      {/* Header */}
      <View style={[styles.tableHeader, { backgroundColor: headerBg }]}>
        <View style={[styles.tableCell, styles.holeCellWide]}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>Hole</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCenter]}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>Par</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCenter]}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>SI</Text>
        </View>
        <View style={[styles.tableCell, styles.cellCenter]}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>{distanceHeader}</Text>
        </View>
      </View>

      {/* Front Nine */}
      {frontNine.map((hole, index) => renderHoleRow(hole, index))}
      {frontNine.length > 0 && renderTotalRow('OUT', frontPar, frontYardage)}

      {/* Back Nine */}
      {backNine.map((hole, index) => renderHoleRow(hole, index))}
      {backNine.length > 0 && renderTotalRow('IN', backPar, backYardage)}

      {/* Total */}
      {holes.length > 0 && (
        <View style={[styles.tableRow, styles.grandTotalRow, { backgroundColor: colors.primary }]}>
          <View style={[styles.tableCell, styles.holeCellWide]}>
            <Text style={[styles.grandTotalLabel, { color: colors.white }]}>TOTAL</Text>
          </View>
          <View style={[styles.tableCell, styles.cellCenter]}>
            <Text style={[styles.grandTotalValue, { color: colors.white }]}>{totalPar}</Text>
          </View>
          <View style={[styles.tableCell, styles.cellCenter]}>
            <Text style={[styles.grandTotalValue, { color: colors.white }]}>-</Text>
          </View>
          <View style={[styles.tableCell, styles.cellCenter]}>
            <Text style={[styles.grandTotalValue, { color: totalYardage ? colors.white : colors.gray300 }]}>
              {formatDistance(totalYardage)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// =====================================================
// SCORING PAIRS SECTION COMPONENT
// =====================================================

interface ScoringPairsSectionProps {
  roundId: string;
  scoringPairsRequired: boolean;
  isPremium: boolean;
  cardBackground: string;
  onManagePress?: () => void;
}

/**
 * Get initials for avatar fallback
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function ScoringPairsSection({
  roundId,
  scoringPairsRequired,
  isPremium,
  cardBackground,
  onManagePress,
}: ScoringPairsSectionProps) {
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();

  // Fetch scoring pairs for this round
  const { data: scoringPairs, isLoading } = useScoringPairs(roundId);

  // Group pairs to show reciprocal pairs once (A↔B instead of A→B and B→A)
  const displayPairs = useMemo((): { pairs: ScoringPairWithPlayers[]; type: 'reciprocal' | 'circular' } => {
    if (!scoringPairs || scoringPairs.length === 0) {
      return { pairs: [], type: 'circular' };
    }

    // Check if pairs are reciprocal (every A→B has a B→A)
    const pairMap = new Map<string, ScoringPairWithPlayers>();
    for (const pair of scoringPairs) {
      pairMap.set(`${pair.scorer_id}-${pair.player_id}`, pair);
    }

    const isReciprocal = scoringPairs.every((pair) =>
      pairMap.has(`${pair.player_id}-${pair.scorer_id}`)
    );

    if (isReciprocal) {
      // Show each pair only once
      const seen = new Set<string>();
      const grouped: ScoringPairWithPlayers[] = [];

      for (const pair of scoringPairs) {
        const key = [pair.scorer_id, pair.player_id].sort().join('-');
        if (!seen.has(key)) {
          seen.add(key);
          grouped.push(pair);
        }
      }
      return { pairs: grouped, type: 'reciprocal' };
    }

    return { pairs: scoringPairs, type: 'circular' };
  }, [scoringPairs]);

  const handleUpgradePress = () => {
    navigation.navigate('Subscription');
  };

  // Not premium - show locked state
  if (!isPremium) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Scoring Pairs
        </Text>
        <Pressable
          style={[styles.lockedCard, { backgroundColor: cardBackground, borderColor: colors.border }]}
          onPress={handleUpgradePress}
        >
          <View style={styles.lockedContent}>
            <View style={[styles.lockedIconContainer, { backgroundColor: colors.gray200 }]}>
              <Icon source="lock" size={24} color={colors.gray500} />
            </View>
            <View style={styles.lockedTextContainer}>
              <View style={styles.lockedLabelRow}>
                <Text style={[styles.lockedLabel, { color: colors.textSecondary }]}>
                  Scoring Pairs
                </Text>
                <View style={[styles.premiumBadge, { backgroundColor: colors.warning }]}>
                  <Text style={styles.premiumBadgeText}>Premium</Text>
                </View>
              </View>
              <Text style={[styles.lockedDescription, { color: colors.textTertiary }]}>
                Upgrade to designate who scores each player
              </Text>
            </View>
          </View>
          <Icon source="chevron-right" size={24} color={colors.gray400} />
        </Pressable>
      </View>
    );
  }

  // Premium user - show scoring pairs section
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Scoring Pairs
        </Text>
        {onManagePress && (
          <Pressable
            style={[styles.editButton, { backgroundColor: colors.primaryLighter }]}
            onPress={onManagePress}
            accessibilityLabel="Manage scoring pairs"
            accessibilityRole="button"
          >
            <Icon source="cog" size={16} color={colors.primary} />
            <Text style={[styles.editButtonText, { color: colors.primary }]}>Manage</Text>
          </Pressable>
        )}
      </View>

      <View style={[styles.scoringPairsCard, { backgroundColor: cardBackground, borderColor: colors.border }]}>
        {/* Status Row */}
        <View style={styles.scoringPairsStatusRow}>
          <View style={styles.scoringPairsStatusLeft}>
            <View style={[
              styles.scoringPairsIconContainer,
              { backgroundColor: scoringPairsRequired ? colors.primaryLighter : colors.gray200 }
            ]}>
              <Icon
                source="account-switch"
                size={20}
                color={scoringPairsRequired ? colors.primary : colors.gray500}
              />
            </View>
            <View style={styles.scoringPairsStatusText}>
              <Text style={[styles.scoringPairsLabel, { color: colors.textPrimary }]}>
                {scoringPairsRequired ? 'Enabled' : 'Disabled'}
              </Text>
              <Text style={[styles.scoringPairsDescription, { color: colors.textSecondary }]}>
                {scoringPairsRequired
                  ? 'Designated markers score each player'
                  : 'Players can score themselves'}
              </Text>
            </View>
          </View>
          <Pill
            label={scoringPairsRequired ? 'Required' : 'Optional'}
            variant={scoringPairsRequired ? 'primary' : 'default'}
            size="sm"
          />
        </View>

        {/* Pairs List (only show if enabled and has pairs) */}
        {scoringPairsRequired && (
          <>
            <View style={[styles.scoringPairsDivider, { backgroundColor: colors.border }]} />

            {isLoading ? (
              <View style={styles.scoringPairsLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.scoringPairsLoadingText, { color: colors.textSecondary }]}>
                  Loading pairs...
                </Text>
              </View>
            ) : displayPairs.pairs.length > 0 ? (
              <View style={styles.scoringPairsList}>
                <View style={styles.scoringPairsListHeader}>
                  <Text style={[styles.scoringPairsListTitle, { color: colors.textSecondary }]}>
                    {displayPairs.type === 'reciprocal' ? 'Reciprocal Pairs' : 'Circular Chain'}
                  </Text>
                  <Text style={[styles.scoringPairsCount, { color: colors.textTertiary }]}>
                    {displayPairs.pairs.length} {displayPairs.pairs.length === 1 ? 'pair' : 'pairs'}
                  </Text>
                </View>
                {displayPairs.pairs.map((pair, index) => (
                  <View
                    key={pair.id}
                    style={[
                      styles.scoringPairRow,
                      { backgroundColor: colors.gray50 },
                      index === displayPairs.pairs.length - 1 && styles.scoringPairRowLast,
                    ]}
                  >
                    {/* Scorer */}
                    <View style={styles.scoringPairPlayer}>
                      {pair.scorer?.photo_url ? (
                        <Avatar.Image size={32} source={{ uri: pair.scorer.photo_url }} />
                      ) : (
                        <Avatar.Text
                          size={32}
                          label={getInitials(pair.scorer?.name || '?')}
                          style={{ backgroundColor: colors.primary }}
                          labelStyle={{ color: colors.white, fontSize: 12 }}
                        />
                      )}
                      <Text
                        style={[styles.scoringPairName, { color: colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {pair.scorer?.name || 'Unknown'}
                      </Text>
                    </View>

                    {/* Arrow */}
                    <View style={styles.scoringPairArrow}>
                      <Icon
                        source={displayPairs.type === 'reciprocal' ? 'swap-horizontal' : 'arrow-right'}
                        size={18}
                        color={colors.textTertiary}
                      />
                    </View>

                    {/* Player being scored */}
                    <View style={styles.scoringPairPlayer}>
                      {pair.player?.photo_url ? (
                        <Avatar.Image size={32} source={{ uri: pair.player.photo_url }} />
                      ) : (
                        <Avatar.Text
                          size={32}
                          label={getInitials(pair.player?.name || '?')}
                          style={{ backgroundColor: colors.primary }}
                          labelStyle={{ color: colors.white, fontSize: 12 }}
                        />
                      )}
                      <Text
                        style={[styles.scoringPairName, { color: colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {pair.player?.name || 'Unknown'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.scoringPairsEmpty}>
                <Icon source="account-question" size={24} color={colors.gray400} />
                <Text style={[styles.scoringPairsEmptyText, { color: colors.textSecondary }]}>
                  No scoring pairs assigned yet
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export const RoundDetailsTab = React.memo(function RoundDetailsTab({
  round,
  isOrganizer = false,
  isPremium = false,
  onEditPress,
}: RoundDetailsTabProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const navigation = useNavigation<NavigationProp>();
  const distanceUnit = useSettingsStore((state) => state.distanceUnit);
  const useMetres = distanceUnit === 'metres';

  const cardBackground = isDark ? colors.gray100 : colors.white;
  const holes = round.course?.holes || [];

  // Get selected tee from round, or fall back to course default/first available
  const { totalPar, selectedTeeName } = useMemo(() => {
    const courseHoles = round.course?.holes || [];

    // Priority: round.selected_tee > first course tee > first yardage key
    let teeName: string | null = null;
    if (round.selected_tee?.name) {
      teeName = round.selected_tee.name;
    } else if (round.course?.tees?.[0]?.name) {
      teeName = round.course.tees[0].name;
    } else if (courseHoles[0]?.yardages) {
      teeName = Object.keys(courseHoles[0].yardages)[0] || null;
    }

    const par = courseHoles.reduce((sum, hole) => sum + (hole.par || 0), 0);

    return { totalPar: par, selectedTeeName: teeName };
  }, [round.course?.holes, round.course?.tees, round.selected_tee]);

  // Location comes from the venue
  const venue = round.course?.venue;
  const location = [venue?.city, venue?.state].filter(Boolean).join(', ');

  // Navigate to venue
  const handleVenuePress = () => {
    if (venue?.id) {
      navigation.navigate('Venue', { venueId: venue.id });
    }
  };

  // Navigate to course
  const handleCoursePress = () => {
    if (round.course) {
      navigation.navigate('Course', { courseId: round.course.id });
    }
  };

  // Navigate to competition
  const handleCompetitionPress = () => {
    if (round.competition?.id) {
      navigation.navigate('CompetitionDetail', { id: round.competition.id });
    }
  };

  return (
    <View style={styles.container}>
      {/* Course Header Card */}
      <Pressable
        style={[styles.headerCard, { backgroundColor: cardBackground, borderColor: colors.border }]}
        onPress={handleCoursePress}
        disabled={!round.course}
      >
        <View style={styles.headerTop}>
          <View style={[styles.courseIconLarge, { backgroundColor: colors.primaryLighter }]}>
            <Icon source="golf" size={32} color={colors.primary} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.courseName, { color: colors.textPrimary }]}>
              {round.course?.name || 'Course TBD'}
            </Text>

            {/* Venue Link */}
            {venue && (
              <Pressable style={styles.venueLink} onPress={handleVenuePress}>
                <Icon source="map-marker" size={16} color={colors.primary} />
                <Text style={[styles.venueLinkText, { color: colors.primary }]}>
                  {location || venue.name}
                </Text>
                <Icon source="chevron-right" size={16} color={colors.primary} />
              </Pressable>
            )}
          </View>

          {/* Chevron to indicate tappable */}
          {round.course && (
            <View style={styles.courseChevron}>
              <Icon source="chevron-right" size={24} color={colors.gray400} />
            </View>
          )}
        </View>

        {/* Quick Stats */}
        <View style={[styles.quickStats, { borderTopColor: colors.border }]}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{holes.length || '-'}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Holes</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{totalPar || '-'}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Par</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {round.course?.slope_rating || '-'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Slope</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {round.course?.course_rating || '-'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>CR</Text>
          </View>
        </View>
      </Pressable>

      {/* Competition Card - Only show if round belongs to a competition */}
      {round.competition && (
        <Pressable
          style={[styles.competitionCard, { backgroundColor: cardBackground, borderColor: colors.border }]}
          onPress={handleCompetitionPress}
        >
          <View style={[styles.competitionIconContainer, { backgroundColor: colors.primaryLighter }]}>
            <Icon source="trophy" size={24} color={colors.primary} />
          </View>
          <View style={styles.competitionInfo}>
            <Text style={[styles.competitionLabel, { color: colors.textSecondary }]}>
              Competition
            </Text>
            <Text style={[styles.competitionName, { color: colors.textPrimary }]} numberOfLines={1}>
              {round.competition.name}
            </Text>
          </View>
          <View style={styles.competitionRight}>
            <Pill
              label={COMPETITION_TYPE_LABELS[round.competition.competition_type]}
              variant="primary"
              size="sm"
            />
            <Icon source="chevron-right" size={24} color={colors.gray400} />
          </View>
        </Pressable>
      )}

      {/* Round Details Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Round Details
          </Text>
          {isOrganizer && onEditPress && (
            <Pressable
              style={[styles.editButton, { backgroundColor: colors.primaryLighter }]}
              onPress={onEditPress}
              accessibilityLabel="Edit round details"
              accessibilityRole="button"
            >
              <Icon source="pencil" size={16} color={colors.primary} />
              <Text style={[styles.editButtonText, { color: colors.primary }]}>Edit</Text>
            </Pressable>
          )}
        </View>

        <View style={[styles.detailsCard, { backgroundColor: cardBackground, borderColor: colors.border }]}>
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Icon source="calendar" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Date</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                {formatDateWithWeekday(round.date)}
              </Text>
            </View>
          </View>

          <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Icon source="clock-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Tee Time</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                {formatTeeTime(round.tee_time)}
              </Text>
            </View>
          </View>

          <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Icon source="trophy-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Format</Text>
              <Pill
                label={GAME_TYPE_LABELS[round.game_type]}
                variant="primary"
                size="md"
              />
            </View>
          </View>

          <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Icon source="golf-tee" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Tee</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                {round.selected_tee?.name || 'Not set'}
              </Text>
            </View>
          </View>

          <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Icon source="flag-checkered" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status</Text>
              <StatusBadge status={round.status as StatusVariant} size="md" />
            </View>
          </View>
        </View>
      </View>

      {/* Scoring Pairs Section - Premium Feature */}
      <ScoringPairsSection
        roundId={round.id}
        scoringPairsRequired={round.scoring_pairs_required}
        isPremium={isPremium}
        cardBackground={cardBackground}
        onManagePress={isOrganizer ? onEditPress : undefined}
      />

      {/* Hole Breakdown Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Hole Breakdown
        </Text>

        {holes.length > 0 ? (
          <HoleTable holes={holes} selectedTee={selectedTeeName} useMetres={useMetres} />
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: cardBackground, borderColor: colors.border }]}>
            <Icon source="flag" size={32} color={colors.gray400} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No hole information available for this course
            </Text>
          </View>
        )}
      </View>
    </View>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },

  // Header Card
  headerCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
  },
  courseIconLarge: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  courseName: {
    ...typography.h3,
  },
  venueLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  venueLinkText: {
    ...typography.small,
  },
  courseChevron: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },

  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: spacing.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
  },
  statLabel: {
    ...typography.caption,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: spacing.xs,
  },

  // Competition Card
  competitionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    ...shadows.sm,
  },
  competitionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  competitionInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  competitionLabel: {
    ...typography.caption,
  },
  competitionName: {
    ...typography.bodyBold,
    marginTop: 2,
  },
  competitionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  // Section
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  editButtonText: {
    ...typography.smallBold,
  },

  // Details Card
  detailsCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
    marginLeft: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    ...typography.body,
  },
  detailValue: {
    ...typography.bodyBold,
  },
  detailDivider: {
    height: 1,
    marginHorizontal: spacing.md,
  },

  // Hole Table
  tableContainer: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  totalRow: {
    paddingVertical: spacing.sm,
  },
  grandTotalRow: {
    paddingVertical: spacing.md,
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: spacing.xs,
  },
  holeCellWide: {
    flex: 1.5,
  },
  cellCenter: {
    alignItems: 'center',
  },
  headerText: {
    ...typography.captionBold,
    textTransform: 'uppercase',
  },
  holeNumber: {
    ...typography.bodyBold,
  },
  cellText: {
    ...typography.body,
  },
  totalLabel: {
    ...typography.smallBold,
  },
  totalValue: {
    ...typography.smallBold,
  },
  grandTotalLabel: {
    ...typography.bodyBold,
  },
  grandTotalValue: {
    ...typography.bodyBold,
  },

  // Empty States
  emptyCard: {
    padding: spacing.xxl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyText: {
    ...typography.body,
    marginTop: spacing.md,
    textAlign: 'center',
  },

  // Scoring Pairs Section - Locked State
  lockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    ...shadows.sm,
  },
  lockedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  lockedIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedTextContainer: {
    flex: 1,
  },
  lockedLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  lockedLabel: {
    ...typography.bodyBold,
  },
  lockedDescription: {
    ...typography.small,
    marginTop: 2,
  },
  premiumBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  premiumBadgeText: {
    ...typography.caption,
    color: '#ffffff',
    fontWeight: '600',
  },

  // Scoring Pairs Section - Premium State
  scoringPairsCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  scoringPairsStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  scoringPairsStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  scoringPairsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoringPairsStatusText: {
    flex: 1,
  },
  scoringPairsLabel: {
    ...typography.bodyBold,
  },
  scoringPairsDescription: {
    ...typography.small,
    marginTop: 2,
  },
  scoringPairsDivider: {
    height: 1,
    marginHorizontal: spacing.md,
  },
  scoringPairsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  scoringPairsLoadingText: {
    ...typography.small,
  },
  scoringPairsList: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  scoringPairsListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  scoringPairsListTitle: {
    ...typography.captionBold,
    textTransform: 'uppercase',
  },
  scoringPairsCount: {
    ...typography.caption,
  },
  scoringPairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  scoringPairRowLast: {
    marginBottom: 0,
  },
  scoringPairPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  scoringPairName: {
    ...typography.small,
    fontWeight: '500',
    flex: 1,
  },
  scoringPairArrow: {
    paddingHorizontal: spacing.sm,
  },
  scoringPairsEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  scoringPairsEmptyText: {
    ...typography.small,
  },
});

export default RoundDetailsTab;
