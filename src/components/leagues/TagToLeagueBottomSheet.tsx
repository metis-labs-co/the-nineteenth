/**
 * TagToLeagueBottomSheet - Tag a scorecard to leagues from ViewRoundScreen
 *
 * Shows the user's active leagues with tag/tagged state.
 * Uses existing tagging infrastructure (useTagRoundToLeague, useScorecardLeagueTags).
 */

import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ActivityIndicator, Icon, Text } from 'react-native-paper';
import { BottomSheet } from '@/components/common/BottomSheet/BottomSheet';
import { LoadingSpinner } from '@/components/common';
import { useLeagues, useScorecardLeagueTags, useTagRoundToLeague } from '@/hooks/useLeagues';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';
import type { League } from '@/types/database';

interface TagToLeagueBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  scorecardId: string;
}

export function TagToLeagueBottomSheet({ visible, onClose, scorecardId }: TagToLeagueBottomSheetProps) {
  const colors = useThemeColors();

  const { data: leagues, isLoading: isLoadingLeagues } = useLeagues();
  const { data: tags, isLoading: isLoadingTags } = useScorecardLeagueTags(
    visible ? scorecardId : undefined
  );
  const { mutate: tagRound, isPending: isTagging, variables: taggingVars, error: tagError, reset: resetTagError } = useTagRoundToLeague();

  const activeLeagues = useMemo(
    () => (leagues ?? []).filter((l) => l.status === 'active'),
    [leagues]
  );

  const taggedLeagueIds = useMemo(
    () => new Set((tags ?? []).map((t) => t.leagueId)),
    [tags]
  );

  const allTagged = activeLeagues.length > 0 && activeLeagues.every((l) => taggedLeagueIds.has(l.id));
  const isLoading = isLoadingLeagues || isLoadingTags;

  const handleTag = useCallback(
    (leagueId: string) => {
      resetTagError();
      tagRound({ leagueId, scorecardId });
    },
    [tagRound, scorecardId, resetTagError]
  );

  const handleGoToLeagues = useCallback(() => {
    onClose();
  }, [onClose]);

  const renderLeagueRow = (league: League) => {
    const isTagged = taggedLeagueIds.has(league.id);
    const isTaggingThis = isTagging && taggingVars?.leagueId === league.id;
    const hasError = tagError && taggingVars?.leagueId === league.id;

    return (
      <View
        key={league.id}
        style={[styles.row, { borderBottomColor: colors.border }]}
      >
        <View style={[styles.leagueIcon, { backgroundColor: colors.primaryLighter }]}>
          <Icon source="trophy-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.leagueInfo}>
          <Text style={[styles.leagueName, { color: colors.textPrimary }]} numberOfLines={1}>
            {league.name}
          </Text>
          {hasError && (
            <Text style={[styles.errorText, { color: colors.error }]} numberOfLines={1}>
              {(tagError as Error).message || 'Failed to tag'}
            </Text>
          )}
        </View>
        {isTaggingThis ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : isTagged ? (
          <View style={styles.taggedContainer}>
            <Icon source="check-circle" size={20} color={colors.success} />
            <Text style={[styles.taggedText, { color: colors.success }]}>Tagged</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.tagButton, { backgroundColor: colors.primary }]}
            onPress={() => handleTag(league.id)}
            activeOpacity={0.7}
            accessibilityLabel={`Tag to ${league.name}`}
            accessibilityRole="button"
          >
            <Text style={[styles.tagButtonText, { color: colors.white }]}>Tag</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      height={0.55}
      title="Tag to League"
    >
      {isLoading ? (
        <LoadingSpinner size="lg" />
      ) : activeLeagues.length === 0 ? (
        <View style={styles.centered}>
          <Icon source="trophy-outline" size={48} color={colors.gray400} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            No Active Leagues
          </Text>
          <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
            Create or join a league from the Leagues tab to start tracking your rounds.
          </Text>
          <TouchableOpacity
            style={[styles.goToLeaguesButton, { backgroundColor: colors.primary }]}
            onPress={handleGoToLeagues}
            activeOpacity={0.7}
          >
            <Text style={[styles.tagButtonText, { color: colors.white }]}>OK</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {activeLeagues.map(renderLeagueRow)}
          {allTagged && (
            <Text style={[styles.allTaggedText, { color: colors.textSecondary }]}>
              This round is tagged to all your leagues
            </Text>
          )}
        </ScrollView>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  leagueIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leagueInfo: {
    flex: 1,
  },
  leagueName: {
    ...typography.bodyBold,
  },
  errorText: {
    ...typography.caption,
    marginTop: 2,
  },
  taggedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  taggedText: {
    ...typography.captionBold,
  },
  tagButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  tagButtonText: {
    ...typography.bodyBold,
  },
  emptyTitle: {
    ...typography.h4,
  },
  emptyMessage: {
    ...typography.body,
    textAlign: 'center',
  },
  goToLeaguesButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
  },
  allTaggedText: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
