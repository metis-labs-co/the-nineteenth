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
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useThemeColors } from '@/context/ThemeContext';
import { spacing, layout } from '@/constants/theme';
import { PageHeader, ErrorState, LoadingSpinner } from '@/components/common';
import {
  ActivityRoundCard,
  RoundComments,
  RoundCommentComposer,
} from '@/components/activity';
import { useRoundFeedCard } from '@/hooks/activity';
import type { RootStackParamList, RootStackScreenProps } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Props = RootStackScreenProps<'RoundActivity'>;

const noop = () => {};

export default function RoundActivityScreen({ route }: Props) {
  const { roundId } = route.params;
  const colors = useThemeColors();
  const navigation = useNavigation<Nav>();

  const { data: card, isLoading, isError, error, refetch } = useRoundFeedCard(roundId);

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
            <ActivityRoundCard card={card} onOpen={noop} />
            <RoundComments roundId={roundId} />
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
});
