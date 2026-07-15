/**
 * Competition Detail — Skins tab.
 *
 * Lists every skins game (round-level + per sub-match) attached to a
 * competition's rounds. Each card shows the leading payout headline and the
 * scope (round vs sub-match #N), plus a tap-through:
 *
 *   • round-level scope → ViewRound with `initialTab='skins'`
 *   • sub-match scope   → SubMatchDetail
 *
 * Above the cards a dark gold hero summarises: total games, total awarded
 * across games, and the standout overall winner so far.
 */

import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { IconDice } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows, skinsColor } from '@/constants/theme';
import { formatCurrency } from '@/utils/currency';
import { HeroCard, LoadingSpinner, SectionLabel, heroPalette } from '@/components/common';
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
      <View style={[styles.emptyWrap, { borderColor: colors.border }]}>
        <View
          style={[
            styles.emptyIcon,
            { backgroundColor: `${skinsColor}24` },
          ]}
        >
          <IconDice size={22} color={skinsColor} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
          No skins games yet
        </Text>
        <Text style={[styles.emptyBody, { color: colors.textTertiary }]}>
          Skins games configured at the round or sub-match level will show up
          here with their payouts as they finalise.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SummaryHero
        gamesCount={summary.gamesCount}
        totalAwarded={summary.totalAwarded}
        topName={summary.topName}
        topAmount={summary.topAmount}
      />

      {grouped.map((group) => (
        <View key={group.roundId} style={styles.roundGroup}>
          <SectionLabel>{formatRoundHeading(group)}</SectionLabel>
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

// ============================================================================
// Summary hero (dark gold)
// ============================================================================

interface SummaryHeroProps {
  gamesCount: number;
  totalAwarded: number;
  topName: string | null;
  topAmount: number | null;
}

function SummaryHero({
  gamesCount,
  totalAwarded,
  topName,
  topAmount,
}: SummaryHeroProps) {
  return (
    <HeroCard variant="gold" padding={spacing.lg} testID="skins-summary-hero">
      <View style={styles.heroHeader}>
        <IconDice size={18} color={heroPalette.gold} />
        <Text style={[styles.heroEyebrow, { color: heroPalette.eyebrowGold }]}>
          Skins side-games
        </Text>
      </View>
      <View style={styles.heroStatsRow}>
        <View>
          <Text style={[styles.heroStatValue, { color: heroPalette.text }]}>
            {gamesCount}
          </Text>
          <Text style={[styles.heroStatLabel, { color: heroPalette.mutedGold }]}>
            GAMES
          </Text>
        </View>
        <View>
          <Text style={[styles.heroStatValue, { color: heroPalette.text }]}>
            {formatCurrency(totalAwarded)}
          </Text>
          <Text style={[styles.heroStatLabel, { color: heroPalette.mutedGold }]}>
            AWARDED
          </Text>
        </View>
        <View style={styles.heroTopWinner}>
          {topName && topAmount !== null ? (
            <>
              <Text
                style={[styles.heroWinnerName, { color: heroPalette.gold }]}
                numberOfLines={1}
              >
                {topName}
              </Text>
              <Text style={[styles.heroWinnerSub, { color: heroPalette.mutedGold }]}>
                top winner · {formatCurrency(topAmount)}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.heroWinnerName, { color: heroPalette.gold }]}>
                —
              </Text>
              <Text style={[styles.heroWinnerSub, { color: heroPalette.mutedGold }]}>
                no payouts yet
              </Text>
            </>
          )}
        </View>
      </View>
    </HeroCard>
  );
}

// ============================================================================
// Game card
// ============================================================================

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
      ? `Match ${card.subMatchOrder} skins`
      : 'Round skins';
  const chipText = `${scopeLabel} · ${card.isTeamSkins ? 'team' : 'individual'}`;

  const statusText = isActive ? 'Live' : isCompleted ? 'Final' : 'Cancelled';
  const statusColor = isActive
    ? colors.warningDark
    : isCompleted
      ? colors.textSecondary
      : colors.textTertiary;
  const statusBg = isActive ? colors.warningBackground : colors.surfaceVariant;

  const title = `${formatCurrency(card.potValue)}${
    card.potType === 'per_hole' ? ' a hole' : ' total pot'
  }`;

  const hasWinner = card.topName !== null && card.topNetResult !== null;
  const winnerName =
    card.topName ??
    (isActive ? 'No payouts yet' : 'No payouts recorded');
  const winnerSub = hasWinner
    ? card.otherParticipantCount > 0
      ? `leads · +${card.otherParticipantCount} other ${
          card.otherParticipantCount === 1 ? 'player' : 'players'
        }`
      : 'leading payout'
    : isActive
      ? 'in progress'
      : '';
  const amountText =
    card.topNetResult !== null ? formatSignedCurrency(card.topNetResult) : '—';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Open ${scopeLabel} details`}
      style={[
        styles.card,
        shadows.sm,
        { backgroundColor: colors.surface, borderColor: `${skinsColor}33` },
      ]}
    >
      <View style={styles.cardTopRow}>
        <View style={[styles.scopeChip, { backgroundColor: colors.warningBackground }]}>
          <Text style={[styles.scopeChipText, { color: colors.warningDark }]}>
            {chipText}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusText}
          </Text>
        </View>
      </View>

      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{title}</Text>

      <View style={styles.winnerRow}>
        <View
          style={[
            styles.winnerAvatar,
            { backgroundColor: hasWinner ? skinsColor : colors.surfaceVariant },
          ]}
        >
          <Text
            style={[
              styles.winnerInitials,
              { color: hasWinner ? colors.white : colors.textSecondary },
            ]}
          >
            {hasWinner ? initialsOf(winnerName) : '–'}
          </Text>
        </View>
        <View style={styles.winnerBody}>
          <Text
            style={[
              styles.winnerName,
              { color: hasWinner ? colors.textPrimary : colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {winnerName}
          </Text>
          {winnerSub ? (
            <Text
              style={[styles.winnerSub, { color: colors.textTertiary }]}
              numberOfLines={1}
            >
              {winnerSub}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.winnerAmount, { color: colors.warningDark }]}>
          {amountText}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// Data shaping (display-only grouping/counting)
// ============================================================================

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
    return `${numberPart} · ${group.roundName}`;
  }
  return numberPart;
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

function formatSignedCurrency(net: number): string {
  if (net > 0) return `+${formatCurrency(net)}`;
  if (net < 0) return `−${formatCurrency(Math.abs(net))}`;
  return formatCurrency(0);
}

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  loadingWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },

  // Empty state (dashed card)
  emptyWrap: {
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: 28,
    gap: spacing.xs,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyBody: {
    fontSize: 12.5,
    textAlign: 'center',
  },

  // Summary hero
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 14,
  },
  heroStatValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  heroStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  heroTopWinner: {
    flex: 1,
    alignItems: 'flex-end',
  },
  heroWinnerName: {
    fontSize: 15,
    fontWeight: '800',
    maxWidth: '100%',
  },
  heroWinnerSub: {
    fontSize: 11,
    marginTop: 3,
  },

  roundGroup: {
    gap: spacing.sm + 2,
  },

  // Game card
  card: {
    padding: 14,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  scopeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scopeChipText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 11,
  },
  winnerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  winnerInitials: {
    fontSize: 10,
    fontWeight: '800',
  },
  winnerBody: {
    flex: 1,
    minWidth: 0,
  },
  winnerName: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  winnerSub: {
    fontSize: 11,
    marginTop: 1,
  },
  winnerAmount: {
    fontSize: 20,
    fontWeight: '800',
  },
});

export default SkinsTab;
