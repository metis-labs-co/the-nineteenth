/**
 * HomeActivityHeroCard - rich activity card for the Home "From your friends"
 * preview (single hero or carousel item). Read-only: tapping opens the
 * round's activity detail where likes/comments live.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { PlayerAvatar } from '@/components/common';
import type { HomeActivityPreviewCard } from '@/hooks/activity';

const MAX_AVATARS = 3;

function firstNames(card: HomeActivityPreviewCard): string {
  const names = card.participants.map((p) => p.name.split(' ')[0]);
  if (names.length === 0) return '';
  if (names.length <= 2) return names.join(' & ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

/** Leader's headline score: top Stableford points, else lowest gross. */
function leaderScore(card: HomeActivityPreviewCard): string | null {
  if (card.game_type === 'stableford') {
    const pts = card.participants
      .map((p) => p.total_points)
      .filter((v): v is number => v != null);
    return pts.length ? `${Math.max(...pts)} pts` : null;
  }
  const gross = card.participants
    .map((p) => p.total_gross)
    .filter((v): v is number => v != null && v > 0);
  return gross.length ? `${Math.min(...gross)}` : null;
}

function shortAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

export interface HomeActivityHeroCardProps {
  card: HomeActivityPreviewCard;
  onPress: (roundId: string) => void;
}

export const HomeActivityHeroCard = React.memo(function HomeActivityHeroCard({
  card,
  onPress,
}: HomeActivityHeroCardProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();
  // Darker, less glaring pill background in dark mode.
  const pillBackground = isDark ? `${colors.primary}33` : colors.primaryLighter;

  const title = card.club_name || card.course_name;
  const subtitle = [firstNames(card), shortAgo(card.activity_at)]
    .filter(Boolean)
    .join(' · ');
  const score = leaderScore(card);
  const shownAvatars = card.participants.slice(0, MAX_AVATARS);
  const extraAvatars = card.participants.length - shownAvatars.length;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(card.round_id)}
      accessibilityRole="button"
      accessibilityLabel={`${firstNames(card)} at ${title}`}
      style={[
        styles.card,
        shadows.sm,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.stack}>
          {shownAvatars.map((p, i) => (
            <View
              key={p.player_id}
              style={[
                styles.avatarRing,
                { borderColor: colors.surface },
                i > 0 && styles.avatarOverlap,
              ]}
            >
              <PlayerAvatar photoUrl={p.photo_url} name={p.name} size={28} />
            </View>
          ))}
          {extraAvatars > 0 ? (
            <View
              style={[
                styles.avatarRing,
                styles.avatarOverlap,
                styles.extra,
                { borderColor: colors.surface, backgroundColor: colors.surfaceVariant },
              ]}
            >
              <Text style={[styles.extraText, { color: colors.textSecondary }]}>
                +{extraAvatars}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
          {!!subtitle && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {card.coverPhotoUrl ? (
          <Image
            source={{ uri: card.coverPhotoUrl }}
            style={[styles.thumb, { backgroundColor: colors.surfaceVariant }]}
            accessibilityLabel="Round photo"
          />
        ) : null}
      </View>

      <View style={styles.metaRow}>
        {score ? (
          <View style={[styles.pill, { backgroundColor: pillBackground }]}>
            <Text style={[styles.pillText, { color: colors.primary }]}>{score}</Text>
          </View>
        ) : null}
        {card.like_count > 0 ? (
          <View style={styles.meta}>
            <Icon source="heart" size={14} color={colors.error} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {card.like_count}
            </Text>
          </View>
        ) : null}
        {card.comment_count > 0 ? (
          <View style={styles.meta}>
            <Icon source="comment-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {card.comment_count}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stack: {
    flexDirection: 'row',
  },
  avatarRing: {
    borderRadius: 999,
    borderWidth: 2,
  },
  avatarOverlap: {
    marginLeft: -10,
  },
  extra: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraText: {
    ...typography.caption,
    fontWeight: '700',
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.bodyBold,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  thumb: {
    width: 46,
    height: 46,
    borderRadius: borderRadius.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  pillText: {
    ...typography.caption,
    fontWeight: '800',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
