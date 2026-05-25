/**
 * ActivityRoundCard - one grouped-per-round card in the activity feed.
 *
 * Shows the round's photos as a full-width cover (single image or carousel,
 * tap to view full-screen — same treatment as the round screen), the
 * course/club, date, every participant + their score, and an interactive
 * like + comment footer. Tapping the card (or the comment button) opens the
 * round's activity detail.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { PlayerAvatar } from '@/components/common';
import { formatDateWithWeekday } from '@/utils/formatting';
import { useLikeRound, useUnlikeRound } from '@/hooks/activity';
import type { ActivityFeedCard, FeedParticipant } from '@/hooks/activity';
import type { RootStackParamList } from '@/navigation/types';
// Import directly (not via the index) to avoid a circular dependency.
import { RoundPhotoBanner } from './RoundPhotoBanner';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Competition rounds can have large fields — cap the inline player list. */
const MAX_COMPETITION_PARTICIPANTS = 3;

function participantScoreLabel(p: FeedParticipant, gameType: string): string {
  if (gameType === 'stableford') {
    return p.total_points != null ? `${p.total_points} pts` : '–';
  }
  if (p.total_gross != null && p.total_gross > 0) {
    return p.total_net != null && p.total_net > 0
      ? `${p.total_gross} (${p.total_net})`
      : `${p.total_gross}`;
  }
  return '–';
}

export interface ActivityRoundCardProps {
  card: ActivityFeedCard;
  onOpen: (roundId: string) => void;
}

export const ActivityRoundCard = React.memo(function ActivityRoundCard({
  card,
  onOpen,
}: ActivityRoundCardProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();
  // Darker, less glaring "Comp" pill background in dark mode.
  const compPillBackground = isDark ? `${colors.primary}33` : colors.primaryLighter;
  const navigation = useNavigation<Nav>();
  const likeRound = useLikeRound();
  const unlikeRound = useUnlikeRound();

  const toggleLike = useCallback(() => {
    if (card.viewer_has_liked) unlikeRound.mutate(card.round_id);
    else likeRound.mutate(card.round_id);
  }, [card.viewer_has_liked, card.round_id, likeRound, unlikeRound]);

  const handleOpen = useCallback(() => onOpen(card.round_id), [onOpen, card.round_id]);

  const competitionId = card.competition_id;
  const isCompetition = !!competitionId;
  const shownParticipants = isCompetition
    ? card.participants.slice(0, MAX_COMPETITION_PARTICIPANTS)
    : card.participants;
  const hiddenCount = card.participants.length - shownParticipants.length;

  const handleViewCompetition = useCallback(() => {
    if (competitionId) navigation.navigate('Leaderboard', { competitionId });
  }, [navigation, competitionId]);

  const headerTitle = card.club_name || card.course_name;
  const subtitle = [formatDateWithWeekday(card.round_date), card.club_location]
    .filter(Boolean)
    .join(' · ');

  return (
    <View
      style={[
        styles.card,
        shadows.sm,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
    >
      {/* Round photos as a flush cover (renders nothing when there are none) */}
      <RoundPhotoBanner roundId={card.round_id} rounded={false} />

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleOpen}
        style={styles.content}
        accessibilityRole="button"
        accessibilityLabel={`Round at ${headerTitle}`}
      >
        <View style={styles.headerRow}>
          <View style={[styles.courseIcon, { backgroundColor: colors.surfaceVariant }]}>
            <Icon source="golf" size={20} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {headerTitle}
            </Text>
            {!!subtitle && (
              <Text
                style={[styles.subtitle, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            )}
          </View>
          {card.competition_id ? (
            <View style={[styles.tag, { backgroundColor: compPillBackground }]}>
              <Text style={[styles.tagText, { color: colors.primary }]}>Comp</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.participants}>
          {shownParticipants.map((p) => (
            <View key={p.player_id} style={styles.participantRow}>
              <PlayerAvatar photoUrl={p.photo_url} name={p.name} size={26} />
              <Text
                style={[styles.participantName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {p.name}
              </Text>
              <Text style={[styles.participantScore, { color: colors.textSecondary }]}>
                {participantScoreLabel(p, card.game_type)}
              </Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>

      {isCompetition ? (
        <TouchableOpacity
          style={styles.compLink}
          onPress={handleViewCompetition}
          accessibilityRole="button"
          accessibilityLabel="View competition leaderboard"
        >
          <Icon source="trophy-outline" size={16} color={colors.primary} />
          <Text style={[styles.compLinkText, { color: colors.primary }]}>
            {hiddenCount > 0
              ? `+${hiddenCount} more · View competition leaderboard`
              : 'View competition leaderboard'}
          </Text>
          <Icon source="chevron-right" size={18} color={colors.primary} />
        </TouchableOpacity>
      ) : null}

      <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
        <TouchableOpacity
          style={styles.footerButton}
          onPress={toggleLike}
          accessibilityRole="button"
          accessibilityLabel={card.viewer_has_liked ? 'Unlike round' : 'Like round'}
        >
          <Icon
            source={card.viewer_has_liked ? 'heart' : 'heart-outline'}
            size={20}
            color={card.viewer_has_liked ? colors.error : colors.textSecondary}
          />
          <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>
            {card.like_count > 0 ? String(card.like_count) : 'Like'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerButton}
          onPress={handleOpen}
          accessibilityRole="button"
          accessibilityLabel="View comments"
        >
          <Icon source="comment-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>
            {card.comment_count > 0 ? String(card.comment_count) : 'Comment'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  courseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  tagText: {
    ...typography.caption,
    fontWeight: '600',
  },
  participants: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  participantName: {
    ...typography.small,
    flex: 1,
  },
  participantScore: {
    ...typography.small,
    fontWeight: '600',
  },
  compLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  compLinkText: {
    ...typography.small,
    fontWeight: '600',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 32,
    paddingVertical: spacing.xs,
  },
  footerLabel: {
    ...typography.small,
    fontWeight: '600',
  },
});
