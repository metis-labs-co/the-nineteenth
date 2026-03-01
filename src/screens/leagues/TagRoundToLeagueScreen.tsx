/**
 * TagRoundToLeagueScreen - Select eligible scorecards to tag to a league
 *
 * Shows completed 18-hole scorecards with handicap differentials
 * that are not already tagged to this league.
 */

import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';
import { PageHeader, LoadingSpinner, EmptyState } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useEligibleScorecards, useTagRoundToLeague } from '@/hooks/useLeagues';
import type { EligibleScorecard } from '@/services/api/leagues';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TagRoute = RouteProp<RootStackParamList, 'TagRoundToLeague'>;

export default function TagRoundToLeagueScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<TagRoute>();
  const leagueId = route.params.leagueId;

  const { data: scorecards, isLoading } = useEligibleScorecards(leagueId);
  const tagMutation = useTagRoundToLeague();

  const handleTag = useCallback(
    async (scorecard: EligibleScorecard) => {
      try {
        await tagMutation.mutateAsync({
          leagueId,
          scorecardId: scorecard.id,
        });
        Alert.alert('Tagged', 'Round has been tagged to the league.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } catch (error: any) {
        Alert.alert('Error', error.message);
      }
    },
    [leagueId, tagMutation, navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: EligibleScorecard }) => {
      const date = new Date(item.created_at);
      const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

      return (
        <TouchableOpacity
          onPress={() => handleTag(item)}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.7}
          disabled={tagMutation.isPending}
          accessibilityLabel={`Tag round from ${formattedDate} with differential ${item.handicap_differential.toFixed(1)}`}
        >
          <View style={[styles.diffBadge, { backgroundColor: colors.primaryBackground }]}>
            <Text style={[styles.diffValue, { color: colors.primary }]}>
              {item.handicap_differential.toFixed(1)}
            </Text>
          </View>

          <View style={styles.cardContent}>
            <Text style={[styles.cardDate, { color: colors.textPrimary }]}>
              {formattedDate}
            </Text>
            {item.total_gross != null && (
              <Text style={[styles.cardGross, { color: colors.textSecondary }]}>
                Gross: {item.total_gross}
              </Text>
            )}
          </View>

          <Icon source="plus-circle-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      );
    },
    [colors, handleTag, tagMutation.isPending]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Tag Round"
        showBack
        onBack={() => navigation.goBack()}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="lg" />
        </View>
      ) : scorecards && scorecards.length > 0 ? (
        <FlatList
          data={scorecards}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
              Select a completed 18-hole round to tag to this league.
            </Text>
          }
        />
      ) : (
        <EmptyState
          title="No Eligible Rounds"
          message="Complete an 18-hole round first. Only submitted scorecards with a handicap differential can be tagged."
          icon="golf-tee"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  helpText: {
    ...typography.small,
    marginBottom: spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  diffBadge: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diffValue: {
    ...typography.h3,
    fontSize: 18,
  },
  cardContent: {
    flex: 1,
  },
  cardDate: {
    ...typography.body,
  },
  cardGross: {
    ...typography.caption,
    marginTop: 2,
  },
});
