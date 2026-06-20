/**
 * ActivityRoundCard - one grouped-per-round card in the activity feed.
 *
 * Player-led layout: headline participant (the viewer if they played,
 * otherwise the friend whose activity it is) with their score top-right,
 * then the course row, the round photos inset below, and a like + comment
 * footer with the remaining participants as stacked avatars. Tapping the
 * card (or the comment button) opens the round's activity detail.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { PlayerAvatar } from '@/components/common';
import { formatDateWithWeekday, formatTimeAgo } from '@/utils/formatting';
import { useAuth } from '@/hooks/useAuth';
import { useLikeRound, useUnlikeRound } from '@/hooks/activity';
import type { ActivityFeedCard, FeedParticipant } from '@/hooks/activity';
import type { RootStackParamList } from '@/navigation/types';
// Import directly (not via the index) to avoid a circular dependency.
import { RoundPhotoBanner } from './RoundPhotoBanner';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Cap the stacked avatars in the footer; overflow shows a "+N" chip. */
const MAX_FOOTER_AVATARS = 4;

function participantScoreLabel(p: FeedParticipant, gameType: string): string | null {
  if (gameType === 'stableford') {
    return p.total_points != null ? `${p.total_points} pts` : null;
  }
  if (p.total_gross != null && p.total_gross > 0) {
    return p.total_net != null && p.total_net > 0
      ? `${p.total_gross} (${p.total_net} net)`
      : `${p.total_gross}`;
  }
  return null;
}

/** The viewer if they played in the round, otherwise the first participant. */
function headlineParticipant(
  participants: FeedParticipant[],
  viewerId: string | undefined,
): FeedParticipant | null {
  if (participants.length === 0) return null;
  return participants.find((p) => p.player_id === viewerId) ?? participants[0];
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
  const { user } = useAuth();
  const likeRound = useLikeRound();
  const unlikeRound = useUnlikeRound();

  const toggleLike = useCallback(() => {
    if (card.viewer_has_liked) unlikeRound.mutate(card.round_id);
    else likeRound.mutate(card.round_id);
  }, [card.viewer_has_liked, card.round_id, likeRound, unlikeRound]);

  const handleOpen = useCallback(() => onOpen(card.round_id), [onOpen, card.round_id]);

  const competitionId = card.competition_id;
  const isCompetition = !!competitionId;

  const headline = headlineParticipant(card.participants, user?.id);
  const isViewer = !!headline && headline.player_id === user?.id;
  const scoreLabel = headline ? participantScoreLabel(headline, card.game_type) : null;
  const others = headline
    ? card.participants.filter((p) => p.player_id !== headline.player_id)
    : card.participants;
  const stackedAvatars = others.slice(0, MAX_FOOTER_AVATARS);
  const overflowCount = others.length - stackedAvatars.length;

  const handleViewCompetition = useCallback(() => {
    if (competitionId) navigation.navigate('Leaderboard', { competitionId });
  }, [navigation, competitionId]);

  const courseId = card.course_id;
  const clubId = card.club_id;
  const handleOpenCourse = useCallback(() => {
    if (courseId) navigation.navigate('Course', { courseId, clubId: clubId ?? undefined });
  }, [navigation, courseId, clubId]);

  const headlinePlayerId = headline?.player_id;
  const handleOpenScorecard = useCallback(() => {
    if (headlinePlayerId) {
      navigation.navigate('PlayerScorecard', {
        playerId: headlinePlayerId,
        roundId: card.round_id,
      });
    }
  }, [navigation, headlinePlayerId, card.round_id]);

  const handleOpenProfile = useCallback(() => {
    if (headlinePlayerId) {
      navigation.navigate('PlayerDetail', { id: headlinePlayerId });
    }
  }, [navigation, headlinePlayerId]);

  const courseTitle = card.club_name || card.course_name;
  const courseSubtitle = [formatDateWithWeekday(card.round_date), card.club_location]
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
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleOpen}
        style={styles.content}
        accessibilityRole="button"
        accessibilityLabel={
          headline ? `${headline.name} played a round at ${courseTitle}` : `Round at ${courseTitle}`
        }
      >
        {headline ? (
          <View style={styles.playerRow}>
            <TouchableOpacity
              style={styles.playerTap}
              onPress={handleOpenProfile}
              accessibilityRole="button"
              accessibilityLabel={`View ${headline.name}'s profile`}
            >
              <PlayerAvatar photoUrl={headline.photo_url} name={headline.name} size={40} />
              <View style={styles.playerText}>
                <View style={styles.nameRow}>
                  <Text
                    style={[styles.playerName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {headline.name}
                  </Text>
                  {isViewer ? (
                    <View style={[styles.youPill, { borderColor: colors.primary }]}>
                      <Text style={[styles.youPillText, { color: colors.primary }]}>YOU</Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  style={[styles.subtitle, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  played a round · {formatTimeAgo(card.activity_at)}
                </Text>
              </View>
            </TouchableOpacity>
            {scoreLabel ? (
              <TouchableOpacity
                onPress={handleOpenScorecard}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`View ${headline?.name ?? 'player'}'s scorecard`}
              >
                <Text style={[styles.score, { color: colors.primary }]}>{scoreLabel}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <View style={styles.courseRow}>
          <TouchableOpacity
            style={styles.courseTap}
            onPress={handleOpenCourse}
            disabled={!courseId}
            accessibilityRole={courseId ? 'button' : undefined}
            accessibilityLabel={courseId ? `View ${courseTitle} details` : undefined}
          >
            <View style={[styles.courseIcon, { backgroundColor: colors.surfaceVariant }]}>
              <Icon source="flag" size={18} color={colors.primary} />
            </View>
            <View style={styles.courseText}>
              <Text style={[styles.courseTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {courseTitle}
              </Text>
              {!!courseSubtitle && (
                <Text
                  style={[styles.subtitle, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {courseSubtitle}
                </Text>
              )}
            </View>
          </TouchableOpacity>
          {isCompetition ? (
            <View style={[styles.tag, { backgroundColor: compPillBackground }]}>
              <Text style={[styles.tagText, { color: colors.primary }]}>Comp</Text>
            </View>
          ) : null}
        </View>

        {/* Inset rounded photo; gated on the feed payload so photo-less cards skip the
            banner (and its query) entirely. If the banner's own cache disagrees mid-
            invalidation it renders null inside this margin until the feed refetches. */}
        {card.photos.length > 0 ? (
          <View style={styles.photo}>
            <RoundPhotoBanner roundId={card.round_id} />
          </View>
        ) : null}
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
            View competition leaderboard
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

        {stackedAvatars.length > 0 ? (
          <View
            style={styles.avatarStack}
            testID="footer-avatar-stack"
            accessibilityLabel={`Played with ${others.map((p) => p.name).join(', ')}`}
          >
            {stackedAvatars.map((p, index) => (
              <View
                key={p.player_id}
                style={[
                  styles.avatarRing,
                  { borderColor: colors.surface },
                  index > 0 && styles.avatarOverlap,
                ]}
              >
                <PlayerAvatar photoUrl={p.photo_url} name={p.name} size={24} />
              </View>
            ))}
            {overflowCount > 0 ? (
              <View
                style={[
                  styles.avatarRing,
                  styles.avatarOverlap,
                  styles.overflowChip,
                  { borderColor: colors.surface, backgroundColor: colors.surfaceVariant },
                ]}
              >
                <Text style={[styles.overflowText, { color: colors.textSecondary }]}>
                  +{overflowCount}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
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
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  playerTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  playerText: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  playerName: {
    ...typography.bodyBold,
    flexShrink: 1,
  },
  youPill: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
  },
  youPillText: {
    ...typography.caption,
    fontWeight: '700',
  },
  score: {
    ...typography.h4,
    fontWeight: '700',
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  courseTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  courseIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseText: {
    flex: 1,
  },
  courseTitle: {
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
  photo: {
    marginTop: spacing.md,
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
    minHeight: 44,
    paddingVertical: spacing.xs,
  },
  footerLabel: {
    ...typography.small,
    fontWeight: '600',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  avatarRing: {
    borderWidth: 2,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  avatarOverlap: {
    marginLeft: -spacing.sm,
  },
  overflowChip: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
