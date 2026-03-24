/**
 * LeagueListScreen - Tab screen showing user's leagues + public browse
 *
 * Features:
 * - "My Leagues" tab: leagues the user belongs to (create, join, delete)
 * - "Browse" tab: searchable list of public leagues
 * - Pull-to-refresh
 * - Empty states
 */

import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Text, Icon, ActivityIndicator } from 'react-native-paper';
import { IconPlus } from '@tabler/icons-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { PageHeader } from '@/components/common/PageHeader';
import { FeatureButton, ConfirmationDialog } from '@/components/common';
import { EmptyState } from '@/components/common/EmptyState';
import { ScreenWelcomeModal } from '@/components/common/ScreenWelcomeModal';
import { Tabs } from '@/components/common/Tabs';
import { SearchBar } from '@/components/common/SearchBar';
import { FeatureLockCompact } from '@/components/subscription/FeatureLockCompact';
import { LimitIndicator } from '@/components/subscription/LimitIndicator';
import { useThemeColors } from '@/context/ThemeContext';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { useScreenWelcome } from '@/hooks/useScreenWelcome';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useLeagues, useDeleteLeague, usePublicLeagues } from '@/hooks/useLeagues';
import { isUnlimited, isNoLimit } from '@/types/subscription.types';
import type { League, LeagueWithPlayerCount } from '@/types/database';

import { LeagueCard } from '@/components/leagues';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TabKey = 'my' | 'browse';

export default function LeagueListScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const { data: leagues, isLoading, refetch } = useLeagues();
  const deleteLeague = useDeleteLeague();
  const [leagueToDelete, setLeagueToDelete] = useState<League | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<TabKey>('my');

  // Browse search
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const { data: publicLeagues, isLoading: isLoadingPublic, refetch: refetchPublic } = usePublicLeagues(
    debouncedSearch || undefined
  );

  // Subscription tier limits
  const { limits } = useSubscriptionContext();
  const maxLeagues = limits?.maxLeaguesOwned ?? 1;
  const hasUnlimitedLeagues = isUnlimited(maxLeagues) || isNoLimit(maxLeagues);
  const leagueCount = leagues?.length ?? 0;

  // Welcome modal
  const { isModalVisible, dismissModal, showModal, isFirstVisit, content: welcomeContent } = useScreenWelcome('leagues');

  const handleCreateLeague = useCallback(() => {
    navigation.navigate('CreateLeague');
  }, [navigation]);

  const handleJoinLeague = useCallback(() => {
    navigation.navigate('JoinLeague');
  }, [navigation]);

  const handleLeaguePress = useCallback(
    (league: League) => {
      navigation.navigate('LeagueDetail', { id: league.id });
    },
    [navigation]
  );

  const handleDeleteLeague = useCallback((league: League) => {
    setLeagueToDelete(league);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (leagueToDelete) {
      deleteLeague.mutate(leagueToDelete.id);
      setLeagueToDelete(null);
    }
  }, [leagueToDelete, deleteLeague]);

  const renderMyLeagueItem = useCallback(
    ({ item }: { item: League }) => (
      <LeagueCard
        league={item}
        onPress={() => handleLeaguePress(item)}
        onDelete={handleDeleteLeague}
        swipeEnabled
      />
    ),
    [handleLeaguePress, handleDeleteLeague]
  );

  const renderBrowseItem = useCallback(
    ({ item }: { item: LeagueWithPlayerCount }) => (
      <LeagueCard
        league={item}
        onPress={() => handleLeaguePress(item)}
        playerCount={item.player_count}
      />
    ),
    [handleLeaguePress]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Leagues"
        rightContent={
          <View style={styles.headerActions}>
            {!isFirstVisit && (
              <TouchableOpacity
                style={[styles.infoButton, { backgroundColor: colors.surfaceVariant }]}
                onPress={showModal}
                accessibilityRole="button"
                accessibilityLabel="Leagues info"
              >
                <Icon source="information-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
            )}
            <FeatureLockCompact
              feature="join_league"
              onUpgradePress={() => navigation.navigate('Subscription')}
            >
              <TouchableOpacity
                style={[styles.joinButton, { backgroundColor: colors.primaryBackground }]}
                onPress={handleJoinLeague}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Join league"
              >
                <Text style={[styles.joinButtonText, { color: colors.primary }]}>Join</Text>
              </TouchableOpacity>
            </FeatureLockCompact>
          </View>
        }
      />

      <Tabs
        tabs={[
          { key: 'my' as const, label: 'My Leagues' },
          { key: 'browse' as const, label: 'Browse' },
        ]}
        selectedTab={activeTab}
        onTabChange={setActiveTab}
        style={styles.tabs}
      />

      {activeTab === 'my' ? (
        <FlatList
          data={leagues ?? []}
          renderItem={renderMyLeagueItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            (!leagues || leagues.length === 0) && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.textPrimary} colors={[colors.textPrimary]} />
          }
          ListHeaderComponent={
            <View style={styles.headerSection}>
              <FeatureLockCompact
                feature="create_league"
                context={{ currentCount: leagues?.length ?? 0 }}
                onUpgradePress={() => navigation.navigate('Subscription')}
              >
                <FeatureButton
                  title="Create League"
                  subtitle="Compete across any course"
                  icon={<IconPlus size={24} color={colors.white} strokeWidth={2.5} />}
                  onPress={handleCreateLeague}
                  backgroundColor={colors.primary}
                  accessibilityLabel="Create new league"
                  style={styles.createButton}
                />
              </FeatureLockCompact>
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
            </View>
          }
          ListEmptyComponent={isLoading ? null : (
            <EmptyState
              icon="trophy-outline"
              title="No Leagues Yet"
              message="Create a league to compete with friends across any course, or join one with an invite code."
            />
          )}
        />
      ) : (
        <FlatList
          data={publicLeagues ?? []}
          renderItem={renderBrowseItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            (!publicLeagues || publicLeagues.length === 0) && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl refreshing={isLoadingPublic} onRefresh={refetchPublic} tintColor={colors.textPrimary} colors={[colors.textPrimary]} />
          }
          ListHeaderComponent={
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search public leagues..."
              accessibilityLabel="Search public leagues"
              hideBorder
              containerStyle={styles.searchContainer}
            />
          }
          ListEmptyComponent={
            isLoadingPublic ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <EmptyState
                icon="earth"
                title={searchQuery ? 'No Results' : 'No Public Leagues'}
                message={
                  searchQuery
                    ? 'No leagues match your search. Try a different term.'
                    : 'No public leagues yet. Check back later or create your own!'
                }
              />
            )
          }
        />
      )}

      {/* Welcome Info Modal */}
      <ScreenWelcomeModal
        visible={isModalVisible}
        content={welcomeContent}
        onDismiss={dismissModal}
        testID="leagues-welcome-modal"
      />

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
  container: {
    flex: 1,
  },
  tabs: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  listContent: {
    paddingBottom: spacing.xxxl,
  },
  emptyListContent: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  createButton: {
    marginHorizontal: 0,
    marginBottom: 0,
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  joinButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  joinButtonText: {
    ...typography.bodyBold,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxxl,
  },
});
