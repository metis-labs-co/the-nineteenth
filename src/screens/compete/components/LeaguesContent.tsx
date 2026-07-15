// src/screens/compete/components/LeaguesContent.tsx
import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { IconPlus, IconUsersPlus } from '@tabler/icons-react-native';
import { ConfirmationDialog, EmptyState, LoadingSpinner } from '@/components/common';
import { FeatureLockCompact, LimitIndicator } from '@/components/subscription';
import { useThemeColors } from '@/context/ThemeContext';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { useLeagues, useDeleteLeague } from '@/hooks/useLeagues';
import { isUnlimited, isNoLimit } from '@/types/subscription.types';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/types';
import type { League } from '@/types/database';
import { CompeteLeagueCard } from './CompeteLeagueCard';
import { GradientCreateCta } from './CompeteCardBits';

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
            <GradientCreateCta
              title="Create"
              subtitle="Start a league"
              icon={<IconPlus size={20} color={colors.white} strokeWidth={2.5} />}
              onPress={handleCreateLeague}
              accessibilityLabel="Create new league"
            />
          </FeatureLockCompact>
        </View>
        <View style={styles.featureButtonWrapper}>
          <FeatureLockCompact
            feature="join_league"
            onUpgradePress={handleUpgrade}
          >
            <TouchableOpacity
              style={[
                styles.joinButton,
                { backgroundColor: colors.surface, borderColor: colors.primary },
              ]}
              onPress={handleJoinLeague}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Join a league"
            >
              <IconUsersPlus size={18} color={colors.primary} strokeWidth={2.5} />
              <Text style={[styles.joinButtonText, { color: colors.primary }]}>
                Join
              </Text>
            </TouchableOpacity>
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
            <CompeteLeagueCard
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
  // Bordered style matching the comps join bar; minHeight tracks the compact
  // FeatureButton so the row stays level.
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 64,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  joinButtonText: {
    ...typography.bodyBold,
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
