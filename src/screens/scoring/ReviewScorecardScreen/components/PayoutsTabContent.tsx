import React, { useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Share,
  TouchableOpacity,
} from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { LoadingSpinner } from '@/components/common';
import { spacing, borderRadius, typography, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useSkinsSummary } from '@/hooks/useSkins';
import { useWolfSummary } from '@/hooks/wolf';
import { calculateFinalPayouts } from '@/utils/skins/payouts';
import { calculateWolfPayouts } from '@/utils/wolf/payouts';
import {
  calculateCombinedPayouts,
  buildCombinedShareMessage,
} from '@/utils/combinedPayouts';
import { formatCurrency, formatNetResult } from '@/utils/currency';
import type { PayoutsMode } from '@/utils/combinedPayouts';
import type { SkinsGameSummary } from '@/types/database/skins.types';
import type { WolfGameSummary } from '@/types/database/wolf.types';

interface PayoutsTabContentProps {
  mode: PayoutsMode;
  skinsGameId?: string;
  wolfGameId?: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
}

export function PayoutsTabContent({ mode, skinsGameId, wolfGameId, isRefreshing, onRefresh, bottomInset }: PayoutsTabContentProps) {
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
      <View style={styles.loadingContainer}>
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
  mode: PayoutsMode;
  skinsSummary: SkinsGameSummary | null;
  wolfSummary: WolfGameSummary | null;
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
      contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 100 }]}
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
      <View style={[styles.card, { backgroundColor: colors.surface }, shadows.md]}>
        {/* Header */}
        <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.titleContainer}>
            <Icon source="cash-multiple" size={24} color={colors.primary} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {titleText}
            </Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {playerCount} player{playerCount !== 1 ? 's' : ''} | {subtitleSuffix}
          </Text>
        </View>

        {/* Column Headers */}
        <View style={[styles.columnHeaders, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerCell, styles.rankCol, { color: colors.textSecondary }]}>
            #
          </Text>
          <Text style={[styles.headerCell, styles.playerCol, { color: colors.textSecondary }]}>
            Player
          </Text>
          {isCombined && (
            <Text style={[styles.headerCell, styles.skinsCol, { color: colors.textSecondary }]}>
              Skins
            </Text>
          )}
          {isCombined && (
            <Text style={[styles.headerCell, styles.wolfCol, { color: colors.textSecondary }]}>
              Wolf
            </Text>
          )}
          <Text style={[styles.headerCell, styles.totalCol, { color: colors.textSecondary }]}>
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
                styles.standingRow,
                {
                  backgroundColor: index % 2 === 0 ? colors.surface : colors.background,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View style={styles.rankCol}>
                {item.rank <= 3 ? (
                  <View style={[styles.rankBadge, { backgroundColor: `${medalColors[item.rank]}20` }]}>
                    <Text style={styles.rankEmoji}>{medals[item.rank]}</Text>
                  </View>
                ) : (
                  <View style={[styles.rankBadge, { backgroundColor: colors.surfaceVariant }]}>
                    <Text style={[styles.rankNumber, { color: colors.textSecondary }]}>{item.rank}</Text>
                  </View>
                )}
              </View>
              <View style={styles.playerCol}>
                <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
              {isCombined && (
                <Text
                  style={[
                    styles.valueText,
                    styles.skinsCol,
                    { color: item.in_skins ? getNetColor(item.skins_net) : colors.textSecondary },
                  ]}
                >
                  {item.in_skins ? formatNetResult(item.skins_net) : '--'}
                </Text>
              )}
              {isCombined && (
                <Text
                  style={[
                    styles.valueText,
                  styles.wolfCol,
                  { color: item.in_wolf ? getNetColor(item.wolf_net) : colors.textSecondary },
                ]}
              >
                {item.in_wolf ? formatNetResult(item.wolf_net) : '--'}
              </Text>
              )}
              <Text
                style={[
                  styles.valueText,
                  styles.totalCol,
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
      <View style={[styles.card, { backgroundColor: colors.surface }, shadows.md]}>
        <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.titleContainer}>
            <Icon source="handshake" size={24} color={colors.primary} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              SETTLEMENT
            </Text>
          </View>
        </View>

        {debts.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              WHO OWES WHO
            </Text>
            <View style={styles.debtList}>
              {debts.map((transaction, index) => {
                const fromName = playerNameMap[transaction.from_player_id] || 'Unknown';
                const toName = playerNameMap[transaction.to_player_id] || 'Unknown';
                return (
                  <View
                    key={`${transaction.from_player_id}-${transaction.to_player_id}-${index}`}
                    style={[styles.debtRow, { backgroundColor: colors.background, borderColor: colors.border }]}
                  >
                    <View style={styles.debtParties}>
                      <Text style={[styles.debtName, { color: colors.error }]}>{fromName}</Text>
                      <Icon source="arrow-right" size={16} color={colors.textSecondary} />
                      <Text style={[styles.debtName, { color: colors.success }]}>{toName}</Text>
                    </View>
                    <Text style={[styles.debtAmount, { color: colors.textPrimary }]}>
                      {formatCurrency(transaction.amount)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={[styles.evenCard, { backgroundColor: `${colors.success}15` }]}>
              <Icon source="check-circle" size={24} color={colors.success} />
              <Text style={[styles.evenText, { color: colors.success }]}>
                All even - no money owed!
              </Text>
            </View>
          </View>
        )}

        <Divider style={{ backgroundColor: colors.border }} />

        {/* Share Button */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.shareButton, { backgroundColor: colors.primary }]}
            onPress={handleShare}
            accessibilityLabel="Share combined results"
            accessibilityRole="button"
          >
            <Icon source="share-variant" size={20} color="#fff" />
            <Text style={[styles.shareText, { color: '#fff' }]}>Share Results</Text>
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

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    gap: spacing.xs,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.h4,
  },
  subtitle: {
    ...typography.small,
    marginLeft: 32,
  },
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  headerCell: {
    ...typography.captionBold,
    textTransform: 'uppercase',
  },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rankCol: {
    width: 40,
    alignItems: 'center',
  },
  playerCol: {
    flex: 1,
  },
  skinsCol: {
    width: 70,
    textAlign: 'right',
  },
  wolfCol: {
    width: 70,
    textAlign: 'right',
  },
  totalCol: {
    width: 80,
    textAlign: 'right',
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankEmoji: {
    fontSize: 14,
  },
  rankNumber: {
    ...typography.smallBold,
  },
  playerName: {
    ...typography.small,
  },
  valueText: {
    ...typography.small,
  },
  section: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  debtList: {
    gap: spacing.sm,
  },
  debtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  debtParties: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  debtName: {
    ...typography.small,
    fontWeight: '600',
  },
  debtAmount: {
    ...typography.bodyBold,
  },
  evenCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  evenText: {
    ...typography.bodyBold,
  },
  actions: {
    padding: spacing.lg,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    minHeight: 48,
  },
  shareText: {
    ...typography.bodyBold,
  },
  inProgressCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
});
