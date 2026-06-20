/**
 * RoundComments - flat comment thread for a round (list only).
 *
 * The composer is a separate component (RoundCommentComposer) so it can be
 * pinned as a sticky footer above the keyboard.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { formatDistanceToNow } from 'date-fns';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { SectionHeader, PlayerAvatar } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { useRoundComments, useDeleteComment, useLikeComment, useUnlikeComment } from '@/hooks/activity';
import type { RoundComment } from '@/hooks/activity';

function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

export interface RoundCommentsProps {
  roundId: string;
}

export function RoundComments({ roundId }: RoundCommentsProps) {
  const colors = useThemeColors();
  const { user } = useAuth();
  const { data: comments, isLoading } = useRoundComments(roundId);
  const deleteComment = useDeleteComment();
  const likeComment = useLikeComment();
  const unlikeComment = useUnlikeComment();

  const toggleLike = useCallback(
    (comment: RoundComment) => {
      if (comment.viewer_has_liked) {
        unlikeComment.mutate({ commentId: comment.id, roundId });
      } else {
        likeComment.mutate({ commentId: comment.id, roundId });
      }
    },
    [likeComment, unlikeComment, roundId]
  );

  const confirmDelete = useCallback(
    (comment: RoundComment) => {
      Alert.alert('Delete comment', 'Remove your comment?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteComment.mutate({ commentId: comment.id, roundId }),
        },
      ]);
    },
    [deleteComment, roundId]
  );

  const items = comments ?? [];

  return (
    <View style={styles.container}>
      <SectionHeader
        title={items.length > 0 ? `Comments (${items.length})` : 'Comments'}
        icon="comment-outline"
      />

      {!isLoading && items.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          No comments yet. Be the first to say something.
        </Text>
      ) : null}

      <View style={styles.list}>
        {items.map((comment) => {
          const isOwn = comment.author_id === user?.id;
          return (
            <View key={comment.id} style={styles.commentRow}>
              <PlayerAvatar
                photoUrl={comment.author?.photo_url}
                name={comment.author?.name}
                size={32}
              />
              <View style={styles.commentBody}>
                <View style={styles.commentMeta}>
                  <Text
                    style={[styles.commentName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {comment.author?.name ?? 'Player'}
                  </Text>
                  <Text style={[styles.commentTime, { color: colors.textSecondary }]}>
                    {timeAgo(comment.created_at)}
                  </Text>
                  {isOwn ? (
                    <TouchableOpacity
                      onPress={() => confirmDelete(comment)}
                      accessibilityRole="button"
                      accessibilityLabel="Delete comment"
                      hitSlop={8}
                    >
                      <Icon source="trash-can-outline" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <Text style={[styles.commentText, { color: colors.textPrimary }]}>
                  {comment.body}
                </Text>
                <TouchableOpacity
                  style={styles.likeRow}
                  onPress={() => toggleLike(comment)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={comment.viewer_has_liked ? 'Unlike comment' : 'Like comment'}
                >
                  <Icon
                    source={comment.viewer_has_liked ? 'heart' : 'heart-outline'}
                    size={16}
                    color={comment.viewer_has_liked ? colors.error : colors.textSecondary}
                  />
                  {comment.like_count > 0 ? (
                    <Text style={[styles.likeCount, { color: colors.textSecondary }]}>
                      {comment.like_count}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  empty: {
    ...typography.small,
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
  commentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  commentBody: {
    flex: 1,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  commentName: {
    ...typography.small,
    fontWeight: '600',
    flexShrink: 1,
  },
  commentTime: {
    ...typography.caption,
    flex: 1,
  },
  commentText: {
    ...typography.small,
    marginTop: 2,
  },
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    minHeight: 44,
    alignSelf: 'flex-start',
  },
  likeCount: {
    ...typography.caption,
    fontWeight: '600',
  },
});
