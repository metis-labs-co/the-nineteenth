/**
 * PlayerScorecardScreen
 *
 * Displays an individual player's detailed scorecard for a round.
 * Extension of Quick Scorecard View showing:
 * - All 18 holes in rows
 * - Columns: Hole, Stroke Index, Par, Strokes, Stableford Points, Putts (optional)
 * - Front 9 / Back 9 subtotals
 * - Gross total row at bottom
 *
 * Accessible from:
 * - Single player rounds
 * - Clicking player name from ScorecardEntryScreen
 * - Clicking player name from QuickScorecardView
 */

import React, { useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useScorecardStore } from '@/store/scorecardStore';
import {
  getStrokesReceived,
  calculateStablefordPointsNet,
  getScoreColor,
} from '@/utils/scoring';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { PageHeader } from '@/components/common/PageHeader';
import type { Hole, Player, Scorecard, HoleScore } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PlayerScorecard'>;

// Pickup score constant (must match PlayerScoreCard)
const PICKUP_SCORE = 10;

interface PlayerStats {
  front9Gross: number;
  back9Gross: number;
  front9Stableford: number;
  back9Stableford: number;
  front9Putts: number;
  back9Putts: number;
  totalGross: number;
  totalStableford: number;
  totalPutts: number;
  totalPar: number;
  front9Par: number;
  back9Par: number;
}

interface HoleRowData {
  hole: Hole;
  strokes: number | undefined;
  putts: number | undefined;
  stablefordPoints: number;
  strokesReceived: number;
  isPickup: boolean;
}

export default function PlayerScorecardScreen({ navigation, route }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { playerId, roundId } = route.params;

  const {
    currentPlayers,
    groupScorecards,
    holes: storeHoles,
    isLoading,
    isInitialized,
  } = useScorecardStore();

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Find the player
  const player = useMemo(() => {
    return currentPlayers.find((p) => p.id === playerId);
  }, [currentPlayers, playerId]);

  // Get scorecard for this player
  const scorecard = useMemo(() => {
    return groupScorecards.get(playerId);
  }, [groupScorecards, playerId]);

  // Get holes data
  const holes: Hole[] = useMemo(() => {
    if (storeHoles && storeHoles.length > 0) {
      return storeHoles;
    }

    // Default holes with standard pars and stroke indexes
    const defaultHoles: Hole[] = [];
    const pars: (3 | 4 | 5)[] = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5];
    const strokeIndexes = [7, 15, 11, 1, 5, 9, 17, 13, 3, 8, 16, 12, 2, 6, 10, 18, 14, 4];

    for (let i = 1; i <= 18; i++) {
      defaultHoles.push({
        number: i as Hole['number'],
        par: pars[i - 1],
        strokeIndex: strokeIndexes[i - 1],
        yardages: { white: 380 },
      });
    }
    return defaultHoles;
  }, [storeHoles]);

  // Calculate hole row data
  const holeRowData: HoleRowData[] = useMemo(() => {
    const handicap = player?.handicap || 0;

    return holes.map((hole) => {
      const score = scorecard?.scores[hole.number];
      const strokes = score?.strokes;
      const putts = score?.putts;
      const strokesReceived = getStrokesReceived(handicap, hole.strokeIndex);
      const isPickup = strokes !== undefined && strokes >= PICKUP_SCORE;

      let stablefordPoints = 0;
      if (strokes && strokes > 0 && !isPickup) {
        stablefordPoints = calculateStablefordPointsNet(strokes, hole.par, strokesReceived);
      }

      return {
        hole,
        strokes,
        putts,
        stablefordPoints,
        strokesReceived,
        isPickup,
      };
    });
  }, [holes, scorecard, player?.handicap]);

  // Calculate player statistics
  const playerStats: PlayerStats = useMemo(() => {
    let front9Gross = 0;
    let back9Gross = 0;
    let front9Stableford = 0;
    let back9Stableford = 0;
    let front9Putts = 0;
    let back9Putts = 0;
    let front9Par = 0;
    let back9Par = 0;

    holeRowData.forEach((data) => {
      const { hole, strokes, putts, stablefordPoints } = data;

      if (hole.number <= 9) {
        front9Par += hole.par;
        if (strokes) front9Gross += strokes;
        front9Stableford += stablefordPoints;
        if (putts) front9Putts += putts;
      } else {
        back9Par += hole.par;
        if (strokes) back9Gross += strokes;
        back9Stableford += stablefordPoints;
        if (putts) back9Putts += putts;
      }
    });

    return {
      front9Gross,
      back9Gross,
      front9Stableford,
      back9Stableford,
      front9Putts,
      back9Putts,
      totalGross: front9Gross + back9Gross,
      totalStableford: front9Stableford + back9Stableford,
      totalPutts: front9Putts + back9Putts,
      totalPar: front9Par + back9Par,
      front9Par,
      back9Par,
    };
  }, [holeRowData]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate refresh - in real app would re-fetch data
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsRefreshing(false);
  }, []);

  // Set header title dynamically
  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: player ? `${player.name}'s Scorecard` : 'Player Scorecard',
      headerShown: false, // We'll use custom header
    });
  }, [navigation, player]);

  // Render score with color coding and indicator
  const renderScore = (strokes: number | undefined, par: number, isPickup: boolean) => {
    if (strokes === undefined) {
      return <Text style={[styles.scoreCellText, { color: colors.textPrimary }]}>-</Text>;
    }

    // Pickup: show red "P"
    if (isPickup) {
      return <Text style={[styles.scoreCellText, { color: colors.error }]}>P</Text>;
    }

    const diff = strokes - par;
    const scoreColor = getScoreColor(strokes, par);

    // Eagle or better (-2 or less): double circle
    if (diff <= -2) {
      return (
        <View style={styles.scoreIndicatorContainer}>
          <View style={[styles.eagleIndicator, { borderColor: scoreColor }]}>
            <View style={[styles.birdieIndicator, { borderColor: scoreColor }]}>
              <Text style={[styles.scoreCellText, { color: scoreColor }]}>{strokes}</Text>
            </View>
          </View>
        </View>
      );
    }

    // Birdie (-1): circle around the number
    if (diff === -1) {
      return (
        <View style={styles.scoreIndicatorContainer}>
          <View style={[styles.birdieIndicator, { borderColor: scoreColor }]}>
            <Text style={[styles.scoreCellText, { color: scoreColor }]}>{strokes}</Text>
          </View>
        </View>
      );
    }

    // Par (0): just the number
    if (diff === 0) {
      return <Text style={[styles.scoreCellText, { color: scoreColor }]}>{strokes}</Text>;
    }

    // Bogey (+1): square around the number
    if (diff === 1) {
      return (
        <View style={styles.scoreIndicatorContainer}>
          <View style={[styles.bogeyIndicator, { borderColor: scoreColor }]}>
            <Text style={[styles.scoreCellText, { color: scoreColor }]}>{strokes}</Text>
          </View>
        </View>
      );
    }

    // Double bogey or worse (+2 or more): double square
    return (
      <View style={styles.scoreIndicatorContainer}>
        <View style={[styles.doubleBogeyIndicator, { borderColor: scoreColor }]}>
          <View style={[styles.bogeyIndicator, { borderColor: scoreColor }]}>
            <Text style={[styles.scoreCellText, { color: scoreColor }]}>{strokes}</Text>
          </View>
        </View>
      </View>
    );
  };

  // Render header row
  const renderHeaderRow = () => (
    <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.tableCell, styles.holeCell, styles.headerCell, { backgroundColor: colors.gray800 }]}>
        <Text style={[styles.headerText, { color: colors.textInverse }]}>Hole</Text>
      </View>
      <View style={[styles.tableCell, styles.indexCell, styles.headerCell, { backgroundColor: colors.gray800 }]}>
        <Text style={[styles.headerText, { color: colors.textInverse }]}>SI</Text>
      </View>
      <View style={[styles.tableCell, styles.parCell, styles.headerCell, { backgroundColor: colors.gray800 }]}>
        <Text style={[styles.headerText, { color: colors.textInverse }]}>Par</Text>
      </View>
      <View style={[styles.tableCell, styles.shotsCell, styles.headerCell, { backgroundColor: colors.gray800 }]}>
        <Text style={[styles.headerText, { color: colors.textInverse }]}>Shots</Text>
      </View>
      <View style={[styles.tableCell, styles.scoreCell, styles.headerCell, { backgroundColor: colors.gray800 }]}>
        <Text style={[styles.headerText, { color: colors.textInverse }]}>Score</Text>
      </View>
      <View style={[styles.tableCell, styles.stablefordCell, styles.headerCell, { backgroundColor: colors.gray800 }]}>
        <Text style={[styles.headerText, { color: colors.textInverse }]}>Pts</Text>
      </View>
      <View style={[styles.tableCell, styles.puttsCell, styles.headerCell, { backgroundColor: colors.gray800 }]}>
        <Text style={[styles.headerText, { color: colors.textInverse }]}>Putts</Text>
      </View>
    </View>
  );

  // Render hole row
  const renderHoleRow = (data: HoleRowData) => {
    const { hole, strokes, putts, stablefordPoints, strokesReceived, isPickup } = data;

    return (
      <View key={hole.number} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
        <View style={[styles.tableCell, styles.holeCell, { backgroundColor: colors.gray100 }]}>
          <Text style={[styles.holeCellText, { color: colors.textPrimary }]}>{hole.number}</Text>
        </View>
        <View style={[styles.tableCell, styles.indexCell, { backgroundColor: colors.gray50 }]}>
          <Text style={[styles.indexCellText, { color: colors.textSecondary }]}>{hole.strokeIndex}</Text>
        </View>
        <View style={[styles.tableCell, styles.parCell, { backgroundColor: colors.gray50 }]}>
          <Text style={[styles.parCellText, { color: colors.textSecondary }]}>{hole.par}</Text>
        </View>
        <View style={[styles.tableCell, styles.shotsCell, { backgroundColor: colors.primaryLighter + '30' }]}>
          <Text style={[styles.shotsCellText, { color: strokesReceived > 0 ? colors.primary : colors.textSecondary }]}>
            {strokesReceived > 0 ? strokesReceived : '-'}
          </Text>
        </View>
        <View style={[styles.tableCell, styles.scoreCell]}>
          {renderScore(strokes, hole.par, isPickup)}
        </View>
        <View style={[styles.tableCell, styles.stablefordCell]}>
          <Text
            style={[
              styles.stablefordCellText,
              { color: stablefordPoints >= 2 ? colors.success : (stablefordPoints === 0 && strokes !== undefined ? colors.error : colors.textSecondary) }
            ]}
          >
            {strokes !== undefined ? stablefordPoints : '-'}
          </Text>
        </View>
        <View style={[styles.tableCell, styles.puttsCell]}>
          <Text style={[styles.puttsCellText, { color: colors.textSecondary }]}>{putts ?? '-'}</Text>
        </View>
      </View>
    );
  };

  // Render subtotal row (OUT / IN)
  const renderSubtotalRow = (label: string, isBack9: boolean) => {
    const par = isBack9 ? playerStats.back9Par : playerStats.front9Par;
    const gross = isBack9 ? playerStats.back9Gross : playerStats.front9Gross;
    const stableford = isBack9 ? playerStats.back9Stableford : playerStats.front9Stableford;
    const putts = isBack9 ? playerStats.back9Putts : playerStats.front9Putts;

    return (
      <View style={[styles.tableRow, styles.subtotalRow, { backgroundColor: colors.gray100, borderBottomColor: colors.border }]}>
        <View style={[styles.tableCell, styles.holeCell, styles.subtotalCell, { backgroundColor: colors.gray200 }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{label}</Text>
        </View>
        <View style={[styles.tableCell, styles.indexCell, styles.subtotalCell, { backgroundColor: colors.gray200 }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>-</Text>
        </View>
        <View style={[styles.tableCell, styles.parCell, styles.subtotalCell, { backgroundColor: colors.gray200 }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{par}</Text>
        </View>
        <View style={[styles.tableCell, styles.shotsCell, styles.subtotalCell, { backgroundColor: colors.gray200 }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>-</Text>
        </View>
        <View style={[styles.tableCell, styles.scoreCell, styles.subtotalCell, { backgroundColor: colors.gray200 }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{gross || '-'}</Text>
        </View>
        <View style={[styles.tableCell, styles.stablefordCell, styles.subtotalCell, { backgroundColor: colors.gray200 }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{stableford}</Text>
        </View>
        <View style={[styles.tableCell, styles.puttsCell, styles.subtotalCell, { backgroundColor: colors.gray200 }]}>
          <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{putts || '-'}</Text>
        </View>
      </View>
    );
  };

  // Render total row
  const renderTotalRow = () => {
    const grossDiff = playerStats.totalGross - playerStats.totalPar;
    const grossDiffDisplay = grossDiff > 0 ? `+${grossDiff}` : grossDiff === 0 ? 'E' : grossDiff.toString();

    return (
      <View style={[styles.tableRow, styles.totalRow, { backgroundColor: colors.gray800 }]}>
        <View style={[styles.tableCell, styles.holeCell, styles.totalCell, { backgroundColor: colors.gray800 }]}>
          <Text style={[styles.totalLabelText, { color: colors.textInverse }]}>TOTAL</Text>
        </View>
        <View style={[styles.tableCell, styles.indexCell, styles.totalCell, { backgroundColor: colors.gray800 }]}>
          <Text style={[styles.totalText, { color: colors.textInverse }]}>-</Text>
        </View>
        <View style={[styles.tableCell, styles.parCell, styles.totalCell, { backgroundColor: colors.gray800 }]}>
          <Text style={[styles.totalText, { color: colors.textInverse }]}>{playerStats.totalPar}</Text>
        </View>
        <View style={[styles.tableCell, styles.shotsCell, styles.totalCell, { backgroundColor: colors.gray800 }]}>
          <Text style={[styles.totalText, { color: colors.textInverse }]}>{player?.handicap || '-'}</Text>
        </View>
        <View style={[styles.tableCell, styles.scoreCell, styles.totalCell, { backgroundColor: colors.gray800 }]}>
          <View style={styles.grossContainer}>
            <Text style={[styles.totalGrossText, { color: colors.textInverse }]}>{playerStats.totalGross || '-'}</Text>
            {playerStats.totalGross > 0 && (
              <Text
                style={[
                  styles.grossDiffText,
                  { color: grossDiff < 0 ? colors.successLight : (grossDiff === 0 ? colors.gray300 : colors.errorLight) }
                ]}
              >
                ({grossDiffDisplay})
              </Text>
            )}
          </View>
        </View>
        <View style={[styles.tableCell, styles.stablefordCell, styles.totalCell, styles.stablefordTotalCell, { backgroundColor: colors.primary }]}>
          <Text style={[styles.stablefordTotalText, { color: colors.textInverse }]}>{playerStats.totalStableford}</Text>
          <Text style={[styles.stablefordPtsLabel, { color: colors.primaryLighter }]}>pts</Text>
        </View>
        <View style={[styles.tableCell, styles.puttsCell, styles.totalCell, { backgroundColor: colors.gray800 }]}>
          <Text style={[styles.totalText, { color: colors.textInverse }]}>{playerStats.totalPutts || '-'}</Text>
        </View>
      </View>
    );
  };

  // Loading state
  if (isLoading || !isInitialized) {
    return (
      <SafeAreaView style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading scorecard...</Text>
      </SafeAreaView>
    );
  }

  // Player not found
  if (!player) {
    return (
      <SafeAreaView style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons
          name="account-question"
          size={64}
          color={colors.gray400}
        />
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Player Not Found</Text>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          The requested player could not be found in this round.
        </Text>
        <TouchableOpacity
          style={[styles.errorButton, { backgroundColor: colors.primary }]}
          onPress={handleGoBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={[styles.errorButtonText, { color: colors.textInverse }]}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // No scorecard data
  if (!scorecard) {
    return (
      <SafeAreaView style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons
          name="card-text-outline"
          size={64}
          color={colors.gray400}
        />
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>No Scores Yet</Text>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          {player.name} hasn't recorded any scores for this round yet.
        </Text>
        <TouchableOpacity
          style={[styles.errorButton, { backgroundColor: colors.primary }]}
          onPress={handleGoBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={[styles.errorButtonText, { color: colors.textInverse }]}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const front9Holes = holeRowData.filter((d) => d.hole.number <= 9);
  const back9Holes = holeRowData.filter((d) => d.hole.number > 9);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Custom Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={colors.textPrimary}
          />
          <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {player.name}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>HC: {player.handicap || 0}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Scorecard Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={true}
      >
        {/* Scorecard Table */}
        <Surface style={[styles.tableContainer, { backgroundColor: colors.surface }]} elevation={1}>
          {/* Header */}
          {renderHeaderRow()}

          {/* Front 9 */}
          {front9Holes.map(renderHoleRow)}
          {renderSubtotalRow('OUT', false)}

          {/* Back 9 */}
          {back9Holes.map(renderHoleRow)}
          {renderSubtotalRow('IN', true)}

          {/* Total */}
          {renderTotalRow()}
        </Surface>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  errorTitle: {
    ...typography.h2,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  errorButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  errorButtonText: {
    ...typography.bodyBold,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
    paddingVertical: spacing.xs,
  },
  backButtonText: {
    ...typography.body,
    marginLeft: spacing.xs,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h4,
    textAlign: 'center',
  },
  headerSubtitle: {
    ...typography.caption,
  },
  headerSpacer: {
    minWidth: 80,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },

  // Table
  tableContainer: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tableCell: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  headerCell: {
    paddingVertical: spacing.md,
  },
  headerText: {
    ...typography.smallBold,
    textAlign: 'center',
  },
  holeCell: {
    flex: 1.2,
  },
  holeCellText: {
    ...typography.bodyBold,
  },
  indexCell: {
    flex: 1,
  },
  indexCellText: {
    ...typography.small,
  },
  parCell: {
    flex: 1,
  },
  parCellText: {
    ...typography.body,
  },
  shotsCell: {
    flex: 1,
  },
  shotsCellText: {
    ...typography.small,
  },
  scoreCell: {
    flex: 1.4,
  },
  scoreCellText: {
    ...typography.bodyBold,
  },
  stablefordCell: {
    flex: 1.1,
  },
  stablefordCellText: {
    ...typography.body,
  },
  puttsCell: {
    flex: 1.1,
  },
  puttsCellText: {
    ...typography.body,
  },

  // Score indicators
  scoreIndicatorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  birdieIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eagleIndicator: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bogeyIndicator: {
    width: 28,
    height: 28,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doubleBogeyIndicator: {
    width: 34,
    height: 34,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Subtotals
  subtotalRow: {
  },
  subtotalCell: {
  },
  subtotalText: {
    ...typography.smallBold,
  },

  // Totals
  totalRow: {
    borderBottomWidth: 0,
  },
  totalCell: {
  },
  totalLabelText: {
    ...typography.bodyBold,
  },
  totalText: {
    ...typography.bodyBold,
  },
  grossContainer: {
    alignItems: 'center',
  },
  totalGrossText: {
    ...typography.bodyBold,
  },
  grossDiffText: {
    ...typography.caption,
    marginTop: 2,
  },
  stablefordTotalCell: {
  },
  stablefordTotalText: {
    ...typography.h4,
  },
  stablefordPtsLabel: {
    ...typography.caption,
    marginTop: 2,
  },
});
