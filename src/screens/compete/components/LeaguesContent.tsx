// src/screens/compete/components/LeaguesContent.tsx
import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { IconPlus, IconUsersPlus } from '@tabler/icons-react-native';
import { FeatureButton, ConfirmationDialog, EmptyState, LoadingSpinner } from '@/components/common';
import { FeatureLockCompact, LimitIndicator } from '@/components/subscription';
import { LeagueCard } from '@/components/leagues';
import { useThemeColors } from '@/context/ThemeContext';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { useLeagues, useDeleteLeague } from '@/hooks/useLeagues';
import { isUnlimited, isNoLimit } from '@/types/subscription.types';
import { spacing } from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/types';
import type { League } from '@/types/database';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function LeaguesContent() {
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const { data: leagues, isLoading } = useLeagues();
  const deleteLeague = useDeleteLeague();
  const [leagueToDelete, setLeagueToDelete] = useState<League | null>(null);

  const { limits } = useSubscriptionContext();
  const maxLeagues = limits?.maxLeaguesOwned ?? 1;
  const hasUnlimitedLeagues = isUnlimited(maxLeagues) || isNoLimit(maxLeagues);
  const leagueCount = leagues?.length ?? 0;

  const handleCreateLeague = useCallback(() => {
    navigation.navigate('CreateLeague');
  }, [navigation]);

  const handleJoinLeague = useCallback(() => {
    navigation.navigate('JoinLeague');
  }, [navigation]);

  const handleUpgrade = useCallback(() => {
    navigation.navigate('Subscription');
  }, [navigation]);

  const handleLeaguePress = useCallback(
    (league: League) => {
      navigation.navigate('LeagueDetail', { id: league.id });
    },
    [navigation]
  );

  const handleConfirmDelete = useCallback(() => {
    if (leagueToDelete) {
      deleteLeague.mutate(leagueToDelete.id);
      setLeagueToDelete(null);
    }
  }, [leagueToDelete, deleteLeague]);

  return (
    <View>
      {/* Create + Join buttons */}
      <View style={styles.createButtonsContainer}>
        <View style={styles.featureButtonWrapper}>
          <FeatureLockCompact
            feature="create_league"
            context={{ currentCount: leagueCount }}
            onUpgradePress={handleUpgrade}
          >
            <FeatureButton
              title="Create"
              subtitle="Start a league"
              icon={<IconPlus size={20} color={colors.white} strokeWidth={2.5} />}
              onPress={handleCreateLeague}
              backgroundColor={colors.primary}
              accessibilityLabel="Create new league"
              variant="compact"
              showChevron={false}
            />
          </FeatureLockCompact>
        </View>
        <View style={styles.featureButtonWrapper}>
          <FeatureLockCompact
            feature="join_league"
            onUpgradePress={handleUpgrade}
          >
            <FeatureButton
              title="Join"
              subtitle="Public or invite code"
              icon={<IconUsersPlus size={20} color={colors.white} strokeWidth={2.5} />}
              onPress={handleJoinLeague}
              backgroundColor={colors.accent}
              accessibilityLabel="Join a league"
              variant="compact"
              showChevron={false}
            />
          </FeatureLockCompact>
        </View>
      </View>

      {/* Limit indicator */}
      {!hasUnlimitedLeagues && (
        <View style={styles.limitRow}>
          <LimitIndicator
            current={leagueCount}
            max={maxLeagues}
            label="Leagues"
            showBar={false}
            testID="leagues-limit-indicator"
          />
        </View>
      )}

      {/* My leagues list */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="lg" message="Loading leagues..." />
        </View>
      ) : !leagues || leagues.length === 0 ? (
        <EmptyState
          icon="trophy-outline"
          title="No Leagues Yet"
          message="Create a league to compete with friends across any course, or join one."
        />
      ) : (
        <View style={styles.list}>
          {leagues.map((league) => (
            <LeagueCard
              key={league.id}
              league={league}
              onPress={() => handleLeaguePress(league)}
              onDelete={setLeagueToDelete}
              swipeEnabled
            />
          ))}
        </View>
      )}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        visible={!!leagueToDelete}
        title="Delete League"
        message={`Are you sure you want to delete "${leagueToDelete?.name}"? This will remove all rounds and player data. This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleConfirmDelete}
        onCancel={() => setLeagueToDelete(null)}
        loading={deleteLeague.isPending}
        icon="delete-outline"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  createButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  featureButtonWrapper: {
    flex: 1,
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  loadingContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  // LeagueCard applies its own marginHorizontal/marginTop, so the wrapper
  // only needs bottom inset.
  list: {
    paddingBottom: spacing.lg,
  },
});
