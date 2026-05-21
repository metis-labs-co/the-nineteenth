/**
 * Competition Detail — Skins tab.
 *
 * Lists every skins game (round-level + per sub-match) attached to a
 * competition's rounds. Each card shows the leading payout headline ("X
 * wins $Y") and the scope (round vs sub-match #N), plus a tap-through:
 *
 *   • round-level scope → ViewRound with `initialTab='skins'`
 *   • sub-match scope   → SubMatchDetail
 *
 * Above the cards we surface a small summary: total games, total pot
 * across active games, and the standout overall winner so far.
 */

import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { IconDice } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
  skinsColor,
} from '@/constants/theme';
import { formatCurrency } from '@/utils/currency';
import { LoadingSpinner } from '@/components/common';
import {
  useCompetitionSkinsGames,
  type CompetitionSkinsCard,
} from '@/hooks/skins';
import type { RootStackParamList } from '@/navigation/types';

interface SkinsTabProps {
  competitionId: string;
}

export function SkinsTab({ competitionId }: SkinsTabProps) {
  const colors = useThemeColors();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: cards, isLoading } = useCompetitionSkinsGames(competitionId);

  const grouped = useMemo(() => groupByRound(cards ?? []), [cards]);
  const summary = useMemo(() => buildSummary(cards ?? []), [cards]);

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <LoadingSpinner />
      </View>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <View
          style={[
            styles.emptyIcon,
            { backgroundColor: `${skinsColor}15` },
          ]}
        >
          <IconDice size={32} color={skinsColor} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          No skins games yet
        </Text>
        <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
          Skins games configured at the round or sub-match level will show up
          here with their payouts as they finalise.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SummaryCard
        gamesCount={summary.gamesCount}
        activeCount={summary.activeCount}
        completedCount={summary.completedCount}
        totalAwarded={summary.totalAwarded}
        topName={summary.topName}
        topAmount={summary.topAmount}
      />

      {grouped.map((group) => (
        <View key={group.roundId} style={styles.roundGroup}>
          <Text style={[styles.roundHeading, { color: colors.textSecondary }]}>
            {formatRoundHeading(group)}
          </Text>
          {group.cards.map((card) => (
            <GameCard
              key={card.gameId}
              card={card}
              onPress={() => {
                if (card.subMatchId) {
                  navigation.navigate('SubMatchDetail', {
                    subMatchId: card.subMatchId,
                    roundId: card.roundId,
                    competitionId,
                  });
                  return;
                }
                navigation.navigate('ViewRound', {
                  roundId: card.roundId,
                  competitionId,
                  initialTab: 'skins',
                });
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

interface SummaryCardProps {
  gamesCount: number;
  activeCount: number;
  completedCount: number;
  totalAwarded: number;
  topName: string | null;
  topAmount: number | null;
}

function SummaryCard({
  gamesCount,
  activeCount,
  completedCount,
  totalAwarded,
  topName,
  topAmount,
}: SummaryCardProps) {
  const colors = useThemeColors();
  return (
    <View
      style={[
        styles.summaryCard,
        shadows.sm,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.summaryHeader}>
        <View style={[styles.summaryIcon, { backgroundColor: `${skinsColor}20` }]}>
          <IconDice size={20} color={skinsColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>
            Skins overview
          </Text>
          <Text style={[styles.summaryMeta, { color: colors.textSecondary }]}>
            {gamesCount} {gamesCount === 1 ? 'game' : 'games'} · {activeCount} active ·{' '}
            {completedCount} completed
          </Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryStat}>
          <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>
            Total awarded
          </Text>
          <Text style={[styles.summaryStatValue, { color: colors.textPrimary }]}>
            {formatCurrency(totalAwarded)}
          </Text>
        </View>
        <View style={styles.summaryStat}>
          <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>
            Standout winner
          </Text>
          {topName && topAmount !== null ? (
            <Text style={[styles.summaryStatValue, { color: skinsColor }]} numberOfLines={1}>
              {topName} {formatNet(topAmount)}
            </Text>
          ) : (
            <Text style={[styles.summaryStatValue, { color: colors.textSecondary }]}>
              —
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

interface GameCardProps {
  card: CompetitionSkinsCard;
  onPress: () => void;
}

function GameCard({ card, onPress }: GameCardProps) {
  const colors = useThemeColors();
  const isActive = card.status === 'active';
  const isCompleted = card.status === 'completed';

  const scopeLabel =
    card.subMatchOrder !== null
      ? `Sub-match ${card.subMatchOrder}`
      : 'Round-wide';

  const headlineText =
    card.topName && card.topNetResult !== null
      ? `${card.topName} ${formatNet(card.topNetResult)}`
      : isActive
        ? 'In progress — no payouts yet'
        : 'No payouts recorded';

  const otherText =
    card.otherParticipantCount > 0 && card.topName
      ? ` · +${card.otherParticipantCount} other ${card.otherParticipantCount === 1 ? 'player' : 'players'}`
      : '';

  const potText = `${formatCurrency(card.potValue)}${
    card.potType === 'per_hole' ? '/hole' : ' total'
  }`;

  const statusColor = isActive
    ? colors.primary
    : isCompleted
      ? colors.success
      : colors.textSecondary;
  const statusText = isActive ? 'Active' : isCompleted ? 'Completed' : 'Cancelled';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Open ${scopeLabel} skins details`}
      style={[
        styles.card,
        shadows.sm,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View
            style={[
              styles.cardIcon,
              { backgroundColor: `${skinsColor}15` },
            ]}
          >
            <IconDice size={18} color={skinsColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.scopeLabel, { color: colors.textPrimary }]}>
              {scopeLabel}
            </Text>
            <Text
              style={[styles.scopeMeta, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {potText} · {card.isTeamSkins ? 'Team' : 'Individual'}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: `${statusColor}1A`, borderColor: statusColor },
          ]}
        >
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusText}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={[styles.headlineText, { color: colors.textPrimary }]}>
          {headlineText}
          {otherText ? (
            <Text style={[styles.otherText, { color: colors.textSecondary }]}>
              {otherText}
            </Text>
          ) : null}
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={[styles.viewLink, { color: skinsColor }]}>View skins details</Text>
        <Icon source="chevron-right" size={18} color={skinsColor} />
      </View>
    </TouchableOpacity>
  );
}

interface RoundGroup {
  roundId: string;
  roundNumber: number | null;
  roundName: string | null;
  cards: CompetitionSkinsCard[];
}

function groupByRound(cards: CompetitionSkinsCard[]): RoundGroup[] {
  const map = new Map<string, RoundGroup>();
  for (const card of cards) {
    const existing = map.get(card.roundId);
    if (existing) {
      existing.cards.push(card);
    } else {
      map.set(card.roundId, {
        roundId: card.roundId,
        roundNumber: card.roundNumber,
        roundName: card.roundName,
        cards: [card],
      });
    }
  }
  // Order: round-level first, then by sub-match sort order.
  for (const group of map.values()) {
    group.cards.sort((a, b) => {
      if (a.subMatchId === null && b.subMatchId !== null) return -1;
      if (a.subMatchId !== null && b.subMatchId === null) return 1;
      return (a.subMatchOrder ?? 0) - (b.subMatchOrder ?? 0);
    });
  }
  return Array.from(map.values()).sort((a, b) => {
    const an = a.roundNumber ?? Number.MAX_SAFE_INTEGER;
    const bn = b.roundNumber ?? Number.MAX_SAFE_INTEGER;
    return an - bn;
  });
}

function formatRoundHeading(group: RoundGroup): string {
  const numberPart = group.roundNumber ? `Round ${group.roundNumber}` : 'Round';
  if (group.roundName) {
    return `${numberPart.toUpperCase()} · ${group.roundName.toUpperCase()}`;
  }
  return numberPart.toUpperCase();
}

function buildSummary(cards: CompetitionSkinsCard[]) {
  let totalAwarded = 0;
  let activeCount = 0;
  let completedCount = 0;
  let topName: string | null = null;
  let topAmount: number | null = null;

  for (const card of cards) {
    if (card.status === 'active') activeCount += 1;
    if (card.status === 'completed') completedCount += 1;

    if (card.topName && card.topNetResult !== null && card.topNetResult > 0) {
      totalAwarded += card.topNetResult;
      if (topAmount === null || card.topNetResult > topAmount) {
        topAmount = card.topNetResult;
        topName = card.topName;
      }
    }
  }

  return {
    gamesCount: cards.length,
    activeCount,
    completedCount,
    totalAwarded,
    topName,
    topAmount,
  };
}

function formatNet(net: number): string {
  if (net > 0) return `wins +${formatCurrency(net)}`;
  if (net < 0) return `−${formatCurrency(Math.abs(net))}`;
  return 'breaks even';
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  loadingWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl * 1.25,
    gap: spacing.md,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typography.h4,
  },
  emptyBody: {
    ...typography.small,
    textAlign: 'center',
  },
  summaryCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    ...typography.h4,
  },
  summaryMeta: {
    ...typography.caption,
    marginTop: spacing.xs / 2,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  summaryStat: {
    flex: 1,
  },
  summaryStatLabel: {
    ...typography.caption,
    marginBottom: spacing.xs / 2,
  },
  summaryStatValue: {
    ...typography.bodyBold,
  },
  roundGroup: {
    gap: spacing.sm,
  },
  roundHeading: {
    ...typography.captionBold,
    letterSpacing: 0.5,
  },
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeLabel: {
    ...typography.bodyBold,
  },
  scopeMeta: {
    ...typography.caption,
    marginTop: spacing.xs / 2,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  statusText: {
    ...typography.captionBold,
  },
  cardBody: {
    paddingVertical: spacing.xs,
  },
  headlineText: {
    ...typography.body,
  },
  otherText: {
    ...typography.caption,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  viewLink: {
    ...typography.captionBold,
  },
});
