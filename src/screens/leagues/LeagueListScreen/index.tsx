/**
 * LeagueListScreen - Tab screen showing user's leagues
 *
 * Features:
 * - List of leagues the user belongs to
 * - Create League button (subscription-gated)
 * - Join League button
 * - Pull-to-refresh
 * - Empty state
 */

import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { IconPlus } from '@tabler/icons-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { PageHeader } from '@/components/common/PageHeader';
import { FeatureButton } from '@/components/common';
import { EmptyState } from '@/components/common/EmptyState';
import { ScreenWelcomeModal } from '@/components/common/ScreenWelcomeModal';
import { FeatureLockCompact } from '@/components/subscription/FeatureLockCompact';
import { useThemeColors } from '@/context/ThemeContext';
import { useScreenWelcome } from '@/hooks/useScreenWelcome';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useLeagues } from '@/hooks/useLeagues';
import type { League } from '@/types/database';

import { LeagueCard } from '@/components/leagues';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LeagueListScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const { data: leagues, isLoading, refetch } = useLeagues();

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

  const renderItem = useCallback(
    ({ item }: { item: League }) => (
      <LeagueCard league={item} onPress={() => handleLeaguePress(item)} />
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

      <FlatList
        data={leagues ?? []}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          (!leagues || leagues.length === 0) && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
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

      {/* Welcome Info Modal */}
      <ScreenWelcomeModal
        visible={isModalVisible}
        content={welcomeContent}
        onDismiss={dismissModal}
        testID="leagues-welcome-modal"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});
