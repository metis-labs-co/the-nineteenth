/**
 * ReviewScorecardScreen - Full scorecard table showing all 18 holes for all players
 *
 * Features:
 * - Scorecard table with columns: Hole | Par | Player 1 | Player 2 | Player 3
 * - Front 9 (OUT) subtotal and Back 9 (IN) subtotal rows
 * - Totals row with gross total, net total, Stableford points per player
 * - Skins tab showing hole-by-hole results and settlement (if skins game active)
 * - Edit Scores and Submit All Scores buttons
 * - Handles online/offline submission with sync status
 * - Mismatch resolution modal for scoring pairs verification
 */

import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
  Share,
  TouchableOpacity,
} from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetInfo } from '@react-native-community/netinfo';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { OfflineIndicator } from '@/components/common/OfflineIndicator';
import { ScorecardTable, ScrambleTeamSelector, ScrambleScorecardTable, ContributionLeaderboard, ScrambleTeamLeaderboard } from '@/components/scorecard';
import { PageHeader, ConfirmationDialog, LoadingSpinner } from '@/components/common';
import { Tabs, type TabItem } from '@/components/common/Tabs';
import { SkinsResultsCard, SkinsSettlementCard } from '@/components/skins';
import { WolfResultsCard, WolfStandingsCard, WolfSettlementCard } from '@/components/wolf';
import { StrokePlayLeaderboardFull } from '@/components/scorecard/StrokePlayLeaderboardFull';
import { MismatchResolutionModal } from '@/components/scoring';
import { spacing, borderRadius, typography, shadows, wolfColor } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useActiveSkinsGameForRound, useSkinsSummary } from '@/hooks/useSkins';
import { useWolfGameByRound, useWolfSummary } from '@/hooks/wolf';
import { calculateFinalPayouts } from '@/utils/skins/payouts';
import { calculateWolfPayouts } from '@/utils/wolf/payouts';
import {
  calculateCombinedPayouts,
  buildCombinedShareMessage,
} from '@/utils/combinedPayouts';
import { formatCurrency, formatNetResult } from '@/utils/currency';
import { useAuth } from '@/hooks';
import { usePendingMismatches, useResolveMismatch, usePartnerStatus } from '@/hooks/useScoreMismatch';
import { useRoundScoringPairs } from '@/hooks/scorecard';
import { useRoundDetails } from '@/hooks/useRoundDetails';
import type { StandaloneTeamConfig } from '@/types/supabase/roundQueries';
import type { Player, HoleScore, MultiBallHoleScore } from '@/types';

import { useScoreReview, useScoreSubmission } from './hooks';
import {
  IncompleteScoresModal,
  ReviewActions,
  ReviewLoadingState,
  ReviewEmptyState,
} from './components';

type Props = NativeStackScreenProps<RootStackParamList, 'ReviewScorecard'>;

// =====================================================
// TAB TYPES
// =====================================================

type TabKey = 'scorecard' | 'leaderboard' | 'contributions' | 'skins' | 'wolf' | 'payouts';

const BASE_TABS: TabItem<TabKey>[] = [
  { key: 'scorecard', label: 'Scorecard' },
];

// Amber/gold color for skins
const SKINS_COLOR = '#f59e0b';

// =====================================================
// SKINS TAB CONTENT COMPONENT
// =====================================================

interface SkinsTabContentProps {
  skinsGameId: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
}

function SkinsTabContent({ skinsGameId, isRefreshing, onRefresh, bottomInset }: SkinsTabContentProps) {
  const colors = useThemeColors();
  const {
    data: summary,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useSkinsSummary(skinsGameId);

  const handleRefresh = useCallback(async () => {
    await refetchSummary();
    onRefresh();
  }, [refetchSummary, onRefresh]);

  // Loading state
  if (isSummaryLoading || !summary) {
    return (
      <View style={styles.skinsLoadingContainer}>
        <LoadingSpinner size="md" message="Loading skins results..." fullScreen={false} />
      </View>
    );
  }

  const { game, results, payouts, current_carryover, holes_completed } = summary;

  // Empty state - no results yet
  if (results.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={[styles.skinsEmptyContainer, { paddingBottom: bottomInset + 100 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.textPrimary}
            colors={[colors.textPrimary]}
          />
        }
      >
        <View style={[styles.skinsEmptyCard, { backgroundColor: colors.surface }]}>
          <Icon source="dice-outline" size={48} color={SKINS_COLOR} />
          <Text style={[typography.h3, { color: colors.textPrimary, marginTop: spacing.md }]}>
            No Skins Results Yet
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
            Skins results will appear here as you complete each hole.
            {'\n'}Keep scoring to see who wins each skin!
          </Text>
          <View style={[styles.skinsEmptyConfig, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[typography.small, { color: colors.textSecondary }]}>
              ${game.pot_value} {game.pot_type === 'per_hole' ? 'per hole' : 'total'} • {game.scoring_type === 'gross' ? 'Gross' : 'Net'} scoring
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Calculate unsettled carryover (carryover from last completed hole if not all 18)
  const unsettledCarryover = holes_completed < 18 ? current_carryover : 0;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.skinsScrollContent, { paddingBottom: bottomInset + 100 }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.textPrimary}
          colors={[colors.textPrimary]}
        />
      }
      showsVerticalScrollIndicator={true}
    >
      {/* Skins Results Table */}
      <SkinsResultsCard
        results={results}
        potType={game.pot_type}
        potValue={game.pot_value}
        scoringType={game.scoring_type}
        testID="skins-results-card"
      />

      {/* Settlement Card (show when game is complete or has payouts) */}
      {(game.status === 'completed' || payouts.length > 0) && (
        <View style={styles.settlementContainer}>
          <SkinsSettlementCard
            payouts={payouts}
            game={game}
            unsettledCarryover={unsettledCarryover}
            testID="skins-settlement-card"
          />
        </View>
      )}

      {/* In-Progress Info */}
      {game.status === 'active' && holes_completed < 18 && (
        <View style={[styles.inProgressCard, { backgroundColor: colors.surface }]}>
          <View style={styles.inProgressHeader}>
            <Icon source="golf" size={20} color={SKINS_COLOR} />
            <Text style={[typography.bodyBold, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
              Game In Progress
            </Text>
          </View>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
            {holes_completed} of 18 holes completed
            {current_carryover > 0 && ` • $${current_carryover.toFixed(2)} carryover`}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// =====================================================
// WOLF TAB CONTENT COMPONENT
// =====================================================

interface WolfTabContentProps {
  wolfGameId: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
}

function WolfTabContent({ wolfGameId, isRefreshing, onRefresh, bottomInset }: WolfTabContentProps) {
  const colors = useThemeColors();
  const {
    data: summary,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useWolfSummary(wolfGameId);

  const handleRefresh = useCallback(async () => {
    await refetchSummary();
    onRefresh();
  }, [refetchSummary, onRefresh]);

  // Loading state
  if (isSummaryLoading || !summary) {
    return (
      <View style={styles.wolfLoadingContainer}>
        <LoadingSpinner size="md" message="Loading Wolf results..." fullScreen={false} />
      </View>
    );
  }

  const { game, decisions, payouts, standings, holes_completed } = summary;

  // Empty state - no decisions yet
  if (decisions.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={[styles.wolfEmptyContainer, { paddingBottom: bottomInset + 100 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.textPrimary}
            colors={[colors.textPrimary]}
          />
        }
      >
        <View style={[styles.wolfEmptyCard, { backgroundColor: colors.surface }]}>
          <Icon source="dog-side" size={48} color={wolfColor} />
          <Text style={[typography.h3, { color: colors.textPrimary, marginTop: spacing.md }]}>
            No Wolf Results Yet
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
            Wolf results will appear here as you complete each hole.
            {'\n'}The Wolf player must decide and scores must be recorded!
          </Text>
          <View style={[styles.wolfEmptyConfig, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[typography.small, { color: colors.textSecondary }]}>
              {game.scoring_type === 'gross' ? 'Gross' : 'Net'} scoring • {game.participants.length} players
              {game.pot_enabled && game.pot_value_per_point ? ` • $${game.pot_value_per_point}/pt` : ''}
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.wolfScrollContent, { paddingBottom: bottomInset + 100 }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.textPrimary}
          colors={[colors.textPrimary]}
        />
      }
      showsVerticalScrollIndicator={true}
    >
      {/* Wolf Results Table - Hole by hole breakdown */}
      <WolfResultsCard
        wolfGame={game}
        decisions={decisions}
        testID="wolf-results-card"
      />

      {/* Wolf Standings Card */}
      {standings.length > 0 && (
        <View style={styles.wolfSectionContainer}>
          <WolfStandingsCard
            standings={standings}
            potEnabled={game.pot_enabled}
            testID="wolf-standings-card"
          />
        </View>
      )}

      {/* Settlement Card (show when game is complete and pot is enabled) */}
      {game.pot_enabled && (game.status === 'completed' || payouts.length > 0) && game.pot_value_per_point && (
        <View style={styles.wolfSectionContainer}>
          <WolfSettlementCard
            payouts={payouts}
            potValue={game.pot_value_per_point}
            currency={game.currency}
            testID="wolf-settlement-card"
          />
        </View>
      )}

      {/* In-Progress Info */}
      {game.status === 'active' && holes_completed < 18 && (
        <View style={[styles.inProgressCard, { backgroundColor: colors.surface }]}>
          <View style={styles.inProgressHeader}>
            <Icon source="dog-side" size={20} color={wolfColor} />
            <Text style={[typography.bodyBold, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
              Game In Progress
            </Text>
          </View>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
            {holes_completed} of 18 holes completed
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// =====================================================
// LEADERBOARD TAB CONTENT COMPONENT
// =====================================================

interface LeaderboardTabContentProps {
  players: import('@/types').Player[];
  holes: import('@/types').Hole[];
  getPlayerScore: (playerId: string, holeNumber: number) => import('@/types').HoleScore | import('@/types').MultiBallHoleScore | undefined;
  currentUserId?: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
}

function LeaderboardTabContent({
  players,
  holes,
  getPlayerScore,
  currentUserId,
  isRefreshing,
  onRefresh,
  bottomInset,
}: LeaderboardTabContentProps) {
  const colors = useThemeColors();

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.leaderboardScrollContent, { paddingBottom: bottomInset + 100 }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.textPrimary}
          colors={[colors.textPrimary]}
        />
      }
      showsVerticalScrollIndicator={true}
    >
      <StrokePlayLeaderboardFull
        players={players}
        holes={holes}
        getPlayerScore={getPlayerScore}
        currentUserId={currentUserId}
        testID="stroke-play-leaderboard-full"
      />
    </ScrollView>
  );
}

// =====================================================
// PAYOUTS TAB CONTENT COMPONENT
// =====================================================

interface PayoutsTabContentProps {
  mode: import('@/utils/combinedPayouts').PayoutsMode;
  skinsGameId?: string;
  wolfGameId?: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
}

function PayoutsTabContent({ mode, skinsGameId, wolfGameId, isRefreshing, onRefresh, bottomInset }: PayoutsTabContentProps) {
  const {
    data: skinsSummary,
    isLoading: isLoadingSkins,
    refetch: refetchSkins,
  } = useSkinsSummary(mode !== 'wolf-only' ? skinsGameId : undefined);
  const {
    data: wolfSummary,
    isLoading: isLoadingWolf,
    refetch: refetchWolf,
  } = useWolfSummary(mode !== 'skins-only' ? wolfGameId : undefined);

  const handleRefresh = useCallback(async () => {
    const promises: Promise<unknown>[] = [];
    if (mode !== 'wolf-only') promises.push(refetchSkins());
    if (mode !== 'skins-only') promises.push(refetchWolf());
    await Promise.all(promises);
    onRefresh();
  }, [refetchSkins, refetchWolf, onRefresh, mode]);

  // Loading state
  const isLoading =
    (mode !== 'wolf-only' && (isLoadingSkins || !skinsSummary)) ||
    (mode !== 'skins-only' && (isLoadingWolf || !wolfSummary));

  if (isLoading) {
    return (
      <View style={styles.payoutsLoadingContainer}>
        <LoadingSpinner size="md" message="Loading payouts..." fullScreen={false} />
      </View>
    );
  }

  return (
    <PayoutsTabContentLoaded
      mode={mode}
      skinsSummary={skinsSummary ?? null}
      wolfSummary={wolfSummary ?? null}
      isRefreshing={isRefreshing}
      onRefresh={handleRefresh}
      bottomInset={bottomInset}
    />
  );
}

// Separate loaded component to use useMemo with non-null data
function PayoutsTabContentLoaded({
  mode,
  skinsSummary,
  wolfSummary,
  isRefreshing,
  onRefresh,
  bottomInset,
}: {
  mode: import('@/utils/combinedPayouts').PayoutsMode;
  skinsSummary: import('@/types/database/skins.types').SkinsGameSummary | null;
  wolfSummary: import('@/types/database/wolf.types').WolfGameSummary | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
}) {
  const colors = useThemeColors();
  const isCombined = mode === 'combined';

  // Build player name map from available summaries
  const playerNameMap = useMemo((): Record<string, string> => {
    const map: Record<string, string> = {};
    skinsSummary?.game.participants?.forEach((p) => {
      if (p.name) map[p.id] = p.name;
    });
    wolfSummary?.game.participants?.forEach((p) => {
      if (p.name && !map[p.id]) map[p.id] = p.name;
    });
    return map;
  }, [skinsSummary, wolfSummary]);

  // Compute skins net results (skip if wolf-only)
  const skinsEntries = useMemo(() => {
    if (!skinsSummary || mode === 'wolf-only') return [];
    const participants = skinsSummary.game.participant_ids.map((id) => ({ id }));
    const payouts = calculateFinalPayouts(skinsSummary.game, skinsSummary.results, participants);
    return payouts.map((p) => ({
      player_id: p.player_id,
      net_result: p.net_result,
    }));
  }, [skinsSummary, mode]);

  // Extract wolf net results (skip if skins-only)
  const wolfEntries = useMemo(() => {
    if (!wolfSummary || mode === 'skins-only') return [];
    if (wolfSummary.standings.length > 0 && wolfSummary.game.pot_enabled && wolfSummary.game.pot_value_per_point) {
      const standingsMap: Record<string, number> = {};
      for (const s of wolfSummary.standings) {
        standingsMap[s.player_id] = s.total_points;
      }
      const wolfPayouts = calculateWolfPayouts(standingsMap, wolfSummary.game.pot_value_per_point);
      return Object.entries(wolfPayouts).map(([player_id, p]) => ({
        player_id,
        net_result: p.netResult,
      }));
    }
    return wolfSummary.standings
      .filter((s) => s.net_result != null)
      .map((s) => ({
        player_id: s.player_id,
        net_result: s.net_result!,
      }));
  }, [wolfSummary, mode]);

  // Merge into combined standings
  const { standings, debts } = useMemo(
    () => calculateCombinedPayouts(skinsEntries, wolfEntries, playerNameMap),
    [skinsEntries, wolfEntries, playerNameMap]
  );

  const playerCount = standings.length;
  const isInProgress =
    (skinsSummary?.game.status === 'active') || (wolfSummary?.game.status === 'active');

  const titleText = mode === 'skins-only'
    ? 'SKINS PAYOUTS'
    : mode === 'wolf-only'
      ? 'WOLF PAYOUTS'
      : 'COMBINED PAYOUTS';

  const subtitleSuffix = isCombined ? 'Skins + Wolf' : mode === 'skins-only' ? 'Skins' : 'Wolf';

  // Share handler
  const handleShare = useCallback(async () => {
    try {
      const message = buildCombinedShareMessage(
        standings,
        debts,
        skinsSummary ? { pot_value: skinsSummary.game.pot_value } : null,
        wolfSummary?.game.pot_value_per_point
          ? { pot_value_per_point: wolfSummary.game.pot_value_per_point }
          : null,
        playerNameMap,
        mode
      );
      await Share.share({ message, title: titleText });
    } catch {
      // User cancelled share
    }
  }, [standings, debts, skinsSummary, wolfSummary, playerNameMap, mode, titleText]);

  const getNetColor = (value: number): string => {
    if (value > 0) return colors.success;
    if (value < 0) return colors.error;
    return colors.textSecondary;
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.payoutsScrollContent, { paddingBottom: bottomInset + 100 }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.textPrimary}
          colors={[colors.textPrimary]}
        />
      }
      showsVerticalScrollIndicator={true}
    >
      {/* Standings Card */}
      <View style={[styles.payoutsCard, { backgroundColor: colors.surface }, shadows.md]}>
        {/* Header */}
        <View style={[styles.payoutsCardHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.payoutsTitleContainer}>
            <Icon source="cash-multiple" size={24} color={colors.primary} />
            <Text style={[styles.payoutsTitle, { color: colors.textPrimary }]}>
              {titleText}
            </Text>
          </View>
          <Text style={[styles.payoutsSubtitle, { color: colors.textSecondary }]}>
            {playerCount} player{playerCount !== 1 ? 's' : ''} | {subtitleSuffix}
          </Text>
        </View>

        {/* Column Headers */}
        <View style={[styles.payoutsColumnHeaders, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
          <Text style={[styles.payoutsHeaderCell, styles.payoutsRankCol, { color: colors.textSecondary }]}>
            #
          </Text>
          <Text style={[styles.payoutsHeaderCell, styles.payoutsPlayerCol, { color: colors.textSecondary }]}>
            Player
          </Text>
          {isCombined && (
            <Text style={[styles.payoutsHeaderCell, styles.payoutsSkinsCol, { color: colors.textSecondary }]}>
              Skins
            </Text>
          )}
          {isCombined && (
            <Text style={[styles.payoutsHeaderCell, styles.payoutsWolfCol, { color: colors.textSecondary }]}>
              Wolf
            </Text>
          )}
          <Text style={[styles.payoutsHeaderCell, styles.payoutsTotalCol, { color: colors.textSecondary }]}>
            {isCombined ? 'Total' : 'Net'}
          </Text>
        </View>

        {/* Standings Rows */}
        {standings.map((item, index) => {
          const medalColors: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };
          const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

          return (
            <View
              key={item.player_id}
              style={[
                styles.payoutsStandingRow,
                {
                  backgroundColor: index % 2 === 0 ? colors.surface : colors.background,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View style={styles.payoutsRankCol}>
                {item.rank <= 3 ? (
                  <View style={[styles.payoutsRankBadge, { backgroundColor: `${medalColors[item.rank]}20` }]}>
                    <Text style={styles.payoutsRankEmoji}>{medals[item.rank]}</Text>
                  </View>
                ) : (
                  <View style={[styles.payoutsRankBadge, { backgroundColor: colors.surfaceVariant }]}>
                    <Text style={[styles.payoutsRankNumber, { color: colors.textSecondary }]}>{item.rank}</Text>
                  </View>
                )}
              </View>
              <View style={styles.payoutsPlayerCol}>
                <Text style={[styles.payoutsPlayerName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
              {isCombined && (
                <Text
                  style={[
                    styles.payoutsValueText,
                    styles.payoutsSkinsCol,
                    { color: item.in_skins ? getNetColor(item.skins_net) : colors.textSecondary },
                  ]}
                >
                  {item.in_skins ? formatNetResult(item.skins_net) : '--'}
                </Text>
              )}
              {isCombined && (
                <Text
                  style={[
                    styles.payoutsValueText,
                  styles.payoutsWolfCol,
                  { color: item.in_wolf ? getNetColor(item.wolf_net) : colors.textSecondary },
                ]}
              >
                {item.in_wolf ? formatNetResult(item.wolf_net) : '--'}
              </Text>
              )}
              <Text
                style={[
                  styles.payoutsValueText,
                  styles.payoutsTotalCol,
                  { fontWeight: '600', color: getNetColor(item.total_net) },
                ]}
              >
                {formatNetResult(item.total_net)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Combined Settlement Card */}
      <View style={[styles.payoutsCard, { backgroundColor: colors.surface }, shadows.md]}>
        <View style={[styles.payoutsCardHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.payoutsTitleContainer}>
            <Icon source="handshake" size={24} color={colors.primary} />
            <Text style={[styles.payoutsTitle, { color: colors.textPrimary }]}>
              SETTLEMENT
            </Text>
          </View>
        </View>

        {debts.length > 0 ? (
          <View style={styles.payoutsSection}>
            <Text style={[styles.payoutsSectionTitle, { color: colors.textSecondary }]}>
              WHO OWES WHO
            </Text>
            <View style={styles.payoutsDebtList}>
              {debts.map((transaction, index) => {
                const fromName = playerNameMap[transaction.from_player_id] || 'Unknown';
                const toName = playerNameMap[transaction.to_player_id] || 'Unknown';
                return (
                  <View
                    key={`${transaction.from_player_id}-${transaction.to_player_id}-${index}`}
                    style={[styles.payoutsDebtRow, { backgroundColor: colors.background, borderColor: colors.border }]}
                  >
                    <View style={styles.payoutsDebtParties}>
                      <Text style={[styles.payoutsDebtName, { color: colors.error }]}>{fromName}</Text>
                      <Icon source="arrow-right" size={16} color={colors.textSecondary} />
                      <Text style={[styles.payoutsDebtName, { color: colors.success }]}>{toName}</Text>
                    </View>
                    <Text style={[styles.payoutsDebtAmount, { color: colors.textPrimary }]}>
                      {formatCurrency(transaction.amount)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.payoutsSection}>
            <View style={[styles.payoutsEvenCard, { backgroundColor: `${colors.success}15` }]}>
              <Icon source="check-circle" size={24} color={colors.success} />
              <Text style={[styles.payoutsEvenText, { color: colors.success }]}>
                All even - no money owed!
              </Text>
            </View>
          </View>
        )}

        <Divider style={{ backgroundColor: colors.border }} />

        {/* Share Button */}
        <View style={styles.payoutsActions}>
          <TouchableOpacity
            style={[styles.payoutsShareButton, { backgroundColor: colors.primary }]}
            onPress={handleShare}
            accessibilityLabel="Share combined results"
            accessibilityRole="button"
          >
            <Icon source="share-variant" size={20} color="#fff" />
            <Text style={[styles.payoutsShareText, { color: '#fff' }]}>Share Results</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* In-Progress Note */}
      {isInProgress && (
        <View style={[styles.inProgressCard, { backgroundColor: colors.surface }]}>
          <Icon source="information-outline" size={20} color={colors.primary} />
          <Text style={[typography.small, { color: colors.textSecondary, flex: 1, marginLeft: spacing.sm }]}>
            Standings update as holes are completed
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function ReviewScorecardScreen({ navigation, route }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const netInfo = useNetInfo();
  const isOnline = netInfo.isConnected ?? true;

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('scorecard');
  const [selectedTeamIndex, setSelectedTeamIndex] = useState(0);

  // Authentication
  const { player } = useAuth();
  const currentUserId = player?.id;

  // Review state and data
  const {
    holes,
    tablePlayerData,
    currentPlayers,
    groupScorecards,
    currentRoundId,
    gameType,
    getPlayerScore,
    incompleteHoles,
    showIncompleteModal,
    setShowIncompleteModal,
    validateScores,
    setCurrentHole,
    resetRound,
    submitScorecards,
  } = useScoreReview({ routeHoles: route.params?.holes });

  // Get round ID from route params or store
  const roundId = route.params?.roundId || currentRoundId;

  // Fetch round details to check if scoring pairs are required
  const { data: roundDetails } = useRoundDetails(roundId || '');
  const scoringPairsRequired = roundDetails?.scoring_pairs_required ?? false;
  const holeCount = holes.length || 18;

  // Scoring pairs hook for mismatch detection
  const { scoringPairsEnabled, myScorer } = useRoundScoringPairs(
    roundId || undefined,
    currentUserId,
    scoringPairsRequired,
    false, // isTeamRound
    currentPlayers
  );

  // Mismatch hooks
  const { data: mismatches = [], isLoading: _mismatchesLoading } = usePendingMismatches(roundId || undefined);
  const { mutateAsync: resolveMismatch, isPending: isResolving } = useResolveMismatch();
  const { data: partnerStatus } = usePartnerStatus(roundId || undefined, currentUserId, holeCount);

  // Check for active skins game
  const { data: skinsGame } = useActiveSkinsGameForRound(roundId || undefined);
  const hasSkinsGame = !!skinsGame;

  // Check for active Wolf game
  const { data: wolfGame } = useWolfGameByRound(roundId || undefined);
  const hasWolfGame = !!wolfGame && wolfGame.status !== 'cancelled';

  // Check if individual games have pots (for payouts tab)
  const hasSkinsWithPot = useMemo(() => {
    if (!hasSkinsGame || !skinsGame) return false;
    if (skinsGame.is_team_skins) return false; // v1: individual skins only
    if (skinsGame.pot_value <= 0) return false;
    return true;
  }, [hasSkinsGame, skinsGame]);

  const hasWolfWithPot = useMemo(() => {
    if (!hasWolfGame || !wolfGame) return false;
    if (!wolfGame.pot_enabled || !wolfGame.pot_value_per_point || wolfGame.pot_value_per_point <= 0) return false;
    return true;
  }, [hasWolfGame, wolfGame]);

  const hasPayoutsTab = hasSkinsWithPot || hasWolfWithPot;
  const payoutsMode: import('@/utils/combinedPayouts').PayoutsMode | null = hasSkinsWithPot && hasWolfWithPot
    ? 'combined'
    : hasSkinsWithPot
      ? 'skins-only'
      : hasWolfWithPot
        ? 'wolf-only'
        : null;

  // Check if this is a stroke play round (for leaderboard tab)
  // Use roundDetails as fallback since store's gameType may not be preserved when loading from offline
  const effectiveGameType = roundDetails?.game_type || gameType;
  const isStrokePlay = effectiveGameType === 'stroke';

  // Check if this is a scramble round
  const isScramble = effectiveGameType === 'scramble' || roundDetails?.team_format === 'scramble';

  // Check if this is a shamble round
  const isShamble = effectiveGameType === 'shamble' || roundDetails?.team_format === 'shamble';

  // Calculate team handicap for scramble rounds
  const _teamHandicap = useMemo(() => {
    if (!isScramble || currentPlayers.length === 0) return 0;
    const handicaps = currentPlayers
      .map((p) => p.handicap ?? 0)
      .sort((a, b) => a - b);
    if (handicaps.length === 0) return 0;
    // Scramble formula: 25% of sum of all handicaps
    const sum = handicaps.reduce((acc, h) => acc + h, 0);
    return Math.round((sum * 0.25) * 10) / 10;
  }, [isScramble, currentPlayers]);

  // Get team score for a hole (for scramble, all players have the same score)
  const getTeamScoreForHole = useCallback(
    (holeNumber: number) => {
      if (currentPlayers.length === 0) return undefined;
      // For scramble, all players have the same score, so just get the first one
      return getPlayerScore(currentPlayers[0].id, holeNumber);
    },
    [currentPlayers, getPlayerScore]
  );

  // Extract teams from team_config for multi-team scramble rounds
  const scrambleTeams = useMemo(() => {
    if (!isScramble) return [];

    // Check for standalone team config from round details
    const teamConfig = (roundDetails as unknown as { team_config?: StandaloneTeamConfig })?.team_config;
    if (teamConfig?.teams && teamConfig.teams.length > 0) {
      return teamConfig.teams;
    }

    // Fallback: treat all players as one team
    const allPlayerIds = currentPlayers.map((p) => p.id);
    if (allPlayerIds.length > 0) {
      return [{
        id: 'default-team',
        name: 'Team',
        memberIds: allPlayerIds,
      }];
    }

    return [];
  }, [isScramble, roundDetails, currentPlayers]);

  // Get players for a specific team by index
  const getScrambleTeamPlayersByIndex = useCallback((teamIndex: number): Player[] => {
    if (!isScramble || scrambleTeams.length === 0) return [];

    const team = scrambleTeams[teamIndex];
    if (!team) return [];

    // Filter currentPlayers to only team members
    return team.memberIds
      .map((id) => currentPlayers.find((p) => p.id === id))
      .filter((p): p is Player => p !== undefined);
  }, [isScramble, scrambleTeams, currentPlayers]);

  // Get team handicap for a specific team by index
  const getScrambleTeamHandicapByIndex = useCallback((teamIndex: number): number => {
    const teamPlayers = getScrambleTeamPlayersByIndex(teamIndex);
    if (teamPlayers.length === 0) return 0;
    const handicaps = teamPlayers
      .map((p) => p.handicap ?? 0)
      .sort((a, b) => a - b);
    const sum = handicaps.reduce((acc, h) => acc + h, 0);
    return Math.round((sum * 0.25) * 10) / 10;
  }, [getScrambleTeamPlayersByIndex]);

  // Get team score for a specific team by index
  const getScrambleTeamScoreByIndex = useCallback((teamIndex: number, holeNumber: number): HoleScore | MultiBallHoleScore | undefined => {
    const team = scrambleTeams[teamIndex];
    if (!team) return undefined;

    // Find score from any team member (they should all have the same team score)
    for (const playerId of team.memberIds) {
      const score = getPlayerScore(playerId, holeNumber);
      if (score) return score;
    }
    return undefined;
  }, [scrambleTeams, getPlayerScore]);

  // Build tabs dynamically based on game type and skins availability
  const tabs = useMemo<TabItem<TabKey>[]>(() => {
    const tabList: TabItem<TabKey>[] = [...BASE_TABS];

    // For scramble, keep scorecard tab as "Scorecard", add leaderboard and contributions
    if (isScramble) {
      tabList[0] = { key: 'scorecard' as const, label: 'Scorecard' };
      tabList.push({ key: 'leaderboard' as const, label: 'Leaderboard' });
      tabList.push({ key: 'contributions' as const, label: 'Contributions' });
    }

    // For shamble, keep scorecard tab as "Scorecard" and add "Team Scores" tab
    if (isShamble) {
      tabList[0] = { key: 'scorecard' as const, label: 'Scorecard' };
      tabList.push({ key: 'contributions' as const, label: 'Team Scores' });
    }

    // Add leaderboard tab for stroke play
    if (isStrokePlay) {
      tabList.push({ key: 'leaderboard' as const, label: 'Leaderboard' });
    }

    // Add skins tab if skins game exists
    if (hasSkinsGame) {
      tabList.push({ key: 'skins' as const, label: 'Skins' });
    }

    // Add wolf tab if wolf game exists
    if (hasWolfGame) {
      tabList.push({ key: 'wolf' as const, label: 'Wolf' });
    }

    // Add payouts tab if any game has a pot
    if (hasPayoutsTab) {
      tabList.push({ key: 'payouts' as const, label: 'Payouts' });
    }

    return tabList;
  }, [hasSkinsGame, hasWolfGame, hasPayoutsTab, isStrokePlay, isScramble, isShamble]);

  // Determine if we need to show tabs (more than just scorecard)
  const showTabs = isStrokePlay || hasSkinsGame || hasWolfGame || isScramble || isShamble;

  // Submission and sync logic
  const {
    isSubmitting,
    isRefreshing,
    pendingSyncs,
    syncError,
    handleSubmit,
    handleSyncPress,
    handleRefresh,
    getOfflineStatus,
    showMismatchModal,
    setShowMismatchModal,
    dialogConfig,
    dismissDialog,
  } = useScoreSubmission({
    isOnline,
    competitionId: route.params?.competitionId,
    routeRoundId: route.params?.roundId,
    currentRoundId,
    playerCount: currentPlayers.length,
    scorecardCount: groupScorecards.size,
    validateScores,
    setShowIncompleteModal,
    submitScorecards,
    resetRound,
    navigation,
    // Scoring pairs mismatch detection
    scoringPairsEnabled,
    currentUserId,
    holeCount,
  });

  // Handle mismatch resolution
  const handleResolveMismatch = useCallback(
    async (
      mismatchId: string,
      score: number,
      mismatchRoundId: string,
      playerId: string,
      holeNumber: number
    ) => {
      if (!currentUserId) {
        return { alreadyResolved: false };
      }
      const result = await resolveMismatch({
        mismatchId,
        resolvedScore: score,
        resolvedBy: currentUserId,
        roundId: mismatchRoundId,
        playerId,
        holeNumber,
      });
      return result;
    },
    [currentUserId, resolveMismatch]
  );

  // Navigation handlers
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleEditScores = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleIncompleteHolePress = useCallback(
    (holeNumber: number) => {
      setShowIncompleteModal(false);
      setCurrentHole(holeNumber);
      navigation.goBack();
    },
    [navigation, setCurrentHole, setShowIncompleteModal]
  );

  // Handle hole press to navigate back to that hole
  const handleHolePress = useCallback(
    (holeNumber: number) => {
      setCurrentHole(holeNumber);
      navigation.goBack();
    },
    [navigation, setCurrentHole]
  );

  // Handle tab change
  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab);
  }, []);

  // Loading state
  if (currentPlayers.length === 0) {
    return <ReviewLoadingState />;
  }

  // Empty state
  if (groupScorecards.size === 0) {
    return <ReviewEmptyState onEnterScores={handleEditScores} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <PageHeader title="Scorecard" showBack onBack={handleGoBack} />

      {/* Offline Indicator */}
      <OfflineIndicator
        status={getOfflineStatus()}
        pendingSyncs={pendingSyncs}
        errorMessage={syncError || undefined}
        onSyncPress={handleSyncPress}
        isSyncing={isSubmitting}
      />

      {/* Tab Navigation - show if leaderboard (stroke play) or skins game exists */}
      {showTabs && (
        <View style={styles.tabContainer}>
          <Tabs
            tabs={tabs}
            selectedTab={activeTab}
            onTabChange={handleTabChange}
            size="medium"
            testID="review-scorecard-tabs"
          />
        </View>
      )}

      {/* Tab Content */}
      {activeTab === 'scorecard' && (
        /* Scorecard Content - Different view for scramble vs individual */
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.textPrimary]}
              tintColor={colors.textPrimary}
            />
          }
          showsVerticalScrollIndicator={true}
        >
          {isScramble ? (
            <>
              {/* Team selector */}
              <ScrambleTeamSelector
                teams={scrambleTeams}
                selectedIndex={selectedTeamIndex}
                onSelectTeam={setSelectedTeamIndex}
                getTeamPlayers={getScrambleTeamPlayersByIndex}
              />
              {/* Selected team's scorecard */}
              <ScrambleScorecardTable
                holes={holes}
                teamName={scrambleTeams[selectedTeamIndex]?.name || 'Team'}
                teamHandicap={getScrambleTeamHandicapByIndex(selectedTeamIndex)}
                getTeamScore={(holeNumber) => getScrambleTeamScoreByIndex(selectedTeamIndex, holeNumber)}
                onHolePress={handleHolePress}
              />
            </>
          ) : (
            <ScorecardTable
              players={tablePlayerData}
              holes={holes}
              screenWidth={screenWidth}
              onHolePress={handleHolePress}
              gameType={effectiveGameType}
            />
          )}
        </ScrollView>
      )}

      {activeTab === 'contributions' && (isScramble || isShamble) && (
        /* Contributions Content - Scramble or Shamble */
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.textPrimary]}
              tintColor={colors.textPrimary}
            />
          }
          showsVerticalScrollIndicator={true}
        >
          {isScramble && (
            <ScrambleTeamSelector
              teams={scrambleTeams}
              selectedIndex={selectedTeamIndex}
              onSelectTeam={setSelectedTeamIndex}
              getTeamPlayers={getScrambleTeamPlayersByIndex}
            />
          )}
          <ContributionLeaderboard
            players={isScramble ? getScrambleTeamPlayersByIndex(selectedTeamIndex) : currentPlayers}
            getTeamScore={isScramble ? (holeNumber) => getScrambleTeamScoreByIndex(selectedTeamIndex, holeNumber) : getTeamScoreForHole}
            totalHoles={holes.length}
            showOnlyDrives={isShamble}
            getPlayerScore={isShamble ? getPlayerScore : undefined}
            holes={isShamble ? holes : undefined}
          />
        </ScrollView>
      )}

      {activeTab === 'leaderboard' && isScramble && (
        /* Scramble Team Leaderboard */
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.leaderboardScrollContent, { paddingBottom: insets.bottom + 100 }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.textPrimary}
              colors={[colors.textPrimary]}
            />
          }
          showsVerticalScrollIndicator={true}
        >
          <ScrambleTeamLeaderboard
            teams={scrambleTeams}
            players={currentPlayers}
            holes={holes}
            getTeamScore={getScrambleTeamScoreByIndex}
            currentUserId={currentUserId}
            testID="scramble-team-leaderboard"
          />
        </ScrollView>
      )}

      {activeTab === 'leaderboard' && !isScramble && (
        /* Stroke Play Leaderboard Content */
        <LeaderboardTabContent
          players={currentPlayers}
          holes={holes}
          getPlayerScore={getPlayerScore}
          currentUserId={currentUserId}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          bottomInset={insets.bottom}
        />
      )}

      {activeTab === 'skins' && skinsGame && (
        /* Skins Content */
        <SkinsTabContent
          skinsGameId={skinsGame.id}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          bottomInset={insets.bottom}
        />
      )}

      {activeTab === 'wolf' && wolfGame && (
        /* Wolf Content */
        <WolfTabContent
          wolfGameId={wolfGame.id}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          bottomInset={insets.bottom}
        />
      )}

      {activeTab === 'payouts' && hasPayoutsTab && payoutsMode && (
        /* Payouts Content */
        <PayoutsTabContent
          mode={payoutsMode}
          skinsGameId={skinsGame?.id}
          wolfGameId={wolfGame?.id}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          bottomInset={insets.bottom}
        />
      )}

      {/* Action Buttons */}
      <ReviewActions
        isOnline={isOnline}
        isSubmitting={isSubmitting}
        onEditScores={handleEditScores}
        onSubmit={handleSubmit}
        isAllComplete={incompleteHoles.length === 0}
      />

      {/* Incomplete Scores Modal */}
      <IncompleteScoresModal
        visible={showIncompleteModal}
        incompleteHoles={incompleteHoles}
        onClose={() => setShowIncompleteModal(false)}
        onHolePress={handleIncompleteHolePress}
      />

      {/* Mismatch Resolution Modal */}
      <MismatchResolutionModal
        visible={showMismatchModal}
        mismatches={mismatches}
        currentUserId={currentUserId ?? ''}
        partnerName={partnerStatus?.partnerName ?? myScorer?.name ?? 'Partner'}
        onResolve={handleResolveMismatch}
        onClose={() => setShowMismatchModal(false)}
        isOnline={isOnline}
        isResolving={isResolving}
      />

      {/* Confirmation/Alert Dialog */}
      <ConfirmationDialog {...dialogConfig} onCancel={dismissDialog} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  // Tab styles
  tabContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  // Skins tab styles
  skinsLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  skinsScrollContent: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  skinsEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  skinsEmptyCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  skinsEmptyConfig: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  settlementContainer: {
    marginTop: spacing.md,
  },
  inProgressCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  inProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Leaderboard tab styles
  leaderboardScrollContent: {
    flexGrow: 1,
  },
  // Wolf tab styles
  wolfLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  wolfScrollContent: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  wolfEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  wolfEmptyCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  wolfEmptyConfig: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  wolfSectionContainer: {
    marginTop: spacing.md,
  },
  // Payouts tab styles
  payoutsLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  payoutsScrollContent: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  payoutsCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  payoutsCardHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    gap: spacing.xs,
  },
  payoutsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  payoutsTitle: {
    ...typography.h4,
  },
  payoutsSubtitle: {
    ...typography.small,
    marginLeft: 32,
  },
  payoutsColumnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  payoutsHeaderCell: {
    ...typography.captionBold,
    textTransform: 'uppercase',
  },
  payoutsStandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  payoutsRankCol: {
    width: 40,
    alignItems: 'center',
  },
  payoutsPlayerCol: {
    flex: 1,
  },
  payoutsSkinsCol: {
    width: 70,
    textAlign: 'right',
  },
  payoutsWolfCol: {
    width: 70,
    textAlign: 'right',
  },
  payoutsTotalCol: {
    width: 80,
    textAlign: 'right',
  },
  payoutsRankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payoutsRankEmoji: {
    fontSize: 14,
  },
  payoutsRankNumber: {
    ...typography.smallBold,
  },
  payoutsPlayerName: {
    ...typography.small,
  },
  payoutsValueText: {
    ...typography.small,
  },
  payoutsSection: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  payoutsSectionTitle: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  payoutsDebtList: {
    gap: spacing.sm,
  },
  payoutsDebtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  payoutsDebtParties: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  payoutsDebtName: {
    ...typography.small,
    fontWeight: '600',
  },
  payoutsDebtAmount: {
    ...typography.bodyBold,
  },
  payoutsEvenCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  payoutsEvenText: {
    ...typography.bodyBold,
  },
  payoutsActions: {
    padding: spacing.lg,
  },
  payoutsShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    minHeight: 48,
  },
  payoutsShareText: {
    ...typography.bodyBold,
  },
});
