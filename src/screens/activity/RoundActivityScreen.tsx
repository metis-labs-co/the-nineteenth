/**
 * RoundActivityScreen - a single round's social detail (likes + comments).
 *
 * Renders the round card (participants + scores) and the comment thread.
 * Reachable from the activity feed and from like/comment notification deep
 * links. Works for any round the viewer can see (including a friend's
 * competition round) because all data comes from SECURITY DEFINER RPCs
 * rather than the rounds RLS policy.
 *
 * Photos live on the round itself (ViewRound), not here, so the comment
 * flow never surfaces an image picker.
 *
 * The "View full round" link only shows for participants: ViewRound reads
 * rounds/round_players/scorecards under normal RLS, which hides non-friend
 * co-players' scorecards and the round_players rows from a friend who
 * didn't play, so it would render an incomplete round for them.
 */

import { AgeLock } from '@/components/common';
import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useThemeColors } from '@/context/ThemeContext';
import { spacing, layout, typography, borderRadius } from '@/constants/theme';
import { PageHeader, ErrorState, LoadingSpinner } from '@/components/common';
import {
  ActivityRoundCard,
  RoundComments,
  RoundCommentComposer,
} from '@/components/activity';
import { useRoundFeedCard } from '@/hooks/activity';
import { useAuth } from '@/hooks/useAuth';
import { useOpenRound } from '@/navigation/openRound';
import type { RootStackParamList, RootStackScreenProps } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Props = RootStackScreenProps<'RoundActivity'>;

const noop = () => {};

export default function RoundActivityScreen({ route }: Props) {
  const { roundId } = route.params;
  const colors = useThemeColors();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const openRound = useOpenRound();

  const { data: card, isLoading, isError, error, refetch } = useRoundFeedCard(roundId);
  const viewerPlayed = !!user?.id && !!card?.participants.some((p) => p.player_id === user.id);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        variant="centered"
        title={card?.club_name ?? card?.course_name ?? 'Round'}
        showBack
        onBack={() => navigation.goBack()}
      />

      {isLoading ? (
        <View style={styles.centered}>
          <LoadingSpinner size="lg" />
        </View>
      ) : isError || !card ? (
        <ErrorState
          error={error ?? 'Could not load this round.'}
          onRetry={() => refetch()}
        />
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <ActivityRoundCard card={card} onOpen={noop} enablePlayerProfileLink />
            {viewerPlayed ? (
              <TouchableOpacity
                style={[
                  styles.viewRoundLink,
                  { backgroundColor: colors.surface, borderColor: colors.borderLight },
                ]}
                onPress={() =>
                  openRound({ roundId: card.round_id, competitionId: card.competition_id })
                }
                accessibilityRole="button"
                accessibilityLabel="View full round"
                testID="round-activity-view-round"
              >
                <Icon source="golf" size={18} color={colors.primary} />
                <Text style={[styles.viewRoundText, { color: colors.primary }]}>
                  View full round
                </Text>
                <Icon source="chevron-right" size={18} color={colors.primary} />
              </TouchableOpacity>
            ) : null}
            {/* Belt-and-braces: this route is unregistered for restricted
                users, but it IS registered during the cold-start window
                before the profile resolves, which is exactly when a tapped
                push notification lands here. */}
            <AgeLock>
              <RoundComments roundId={roundId} />
            </AgeLock>
          </ScrollView>
          <RoundCommentComposer roundId={roundId} />
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: layout.screenPadding,
    paddingBottom: spacing.xxl,
  },
  viewRoundLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  viewRoundText: {
    ...typography.bodyBold,
    flex: 1,
  },
});
