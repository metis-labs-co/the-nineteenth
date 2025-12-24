/**
 * CompetitionsListScreen - List of user's competitions
 *
 * Shows all competitions the user has created or joined.
 * Features:
 * - Toggle between "My Comps" (organized) and "Joined Comps" (participating)
 * - Create new competition button with tier limit enforcement
 * - Join competition button (navigate to JoinCompetitionScreen)
 * - Pull-to-refresh
 * - Tier badge in header
 * - LimitIndicator showing competition count
 * - Legacy indicator for grandfathered competitions
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LoadingSpinner, ConfirmationDialog } from '@/components/common';
import { Text, Icon } from 'react-native-paper';
import { IconPlus, IconSparkles } from '@tabler/icons-react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { EmptyState, Tabs, FilterPill, FeatureButton } from '@/components/common';
import { PageHeader } from '@/components/common/PageHeader';
import { CompetitionListCard } from '@/components/competitions';
import { LimitIndicator } from '@/components/subscription';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getCompetitionsOverLimit } from '@/services/subscription/grandfathering';
import { isUnlimited, isNoLimit } from '@/types/subscription.types';

type TabValue = 'my' | 'joined';
type StatusFilter = 'active' | 'completed';

interface CompetitionItem {
  id: string;
  name: string;
  status: string;
  rounds: number;
  players: number;
  isOrganizer: boolean;
  startDate: string | null;
  /** Whether this competition is grandfathered (over tier limit) */
  isLegacy?: boolean;
}

export default function CompetitionsListScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { limits, checkCanCreateCompetition, isSuperAdmin } = useSubscriptionContext();

  // Toggle state
  const [activeTab, setActiveTab] = useState<TabValue>('my');

  // Status filter - default to 'active' which shows upcoming and in-progress
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  // Delete confirmation dialog state
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [competitionToDelete, setCompetitionToDelete] = useState<CompetitionItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Track legacy (grandfathered) competition IDs
  const [legacyCompetitionIds, setLegacyCompetitionIds] = useState<Set<string>>(new Set());

  // Fetch competitions where user is the organizer
  const {
    data: myCompetitions,
    isLoading: isLoadingMy,
    refetch: refetchMy,
    isRefetching: isRefetchingMy,
  } = useQuery<CompetitionItem[]>({
    queryKey: ['myCompetitions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: organizedComps, error } = await supabase
        .from('competitions')
        .select(`
          id,
          name,
          status,
          start_date,
          rounds:rounds(count),
          players:competition_players(count)
        `)
        .eq('organizer_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching organized competitions:', error);
        return [];
      }

      return (organizedComps || []).map((comp: any) => ({
        id: comp.id,
        name: comp.name,
        status: comp.status || 'draft',
        startDate: comp.start_date,
        rounds: comp.rounds?.[0]?.count || 0,
        players: comp.players?.[0]?.count || 0,
        isOrganizer: true,
      }));
    },
    enabled: !!user?.id,
  });

  // Fetch competitions where user is a player (not organizer)
  const {
    data: joinedCompetitions,
    isLoading: isLoadingJoined,
    refetch: refetchJoined,
    isRefetching: isRefetchingJoined,
  } = useQuery<CompetitionItem[]>({
    queryKey: ['joinedCompetitions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: playerComps, error } = await supabase
        .from('competition_players')
        .select(`
          competition:competitions!inner(
            id,
            name,
            status,
            start_date,
            organizer_id,
            deleted_at,
            rounds:rounds(count),
            players:competition_players(count)
          )
        `)
        .eq('player_id', user.id)
        .eq('status', 'accepted')
        .is('competition.deleted_at', null);

      if (error) {
        console.error('Error fetching joined competitions:', error);
        return [];
      }

      // Filter out competitions where user is the organizer
      return (playerComps || [])
        .filter((pc: any) => pc.competition && pc.competition.organizer_id !== user.id)
        .map((pc: any) => ({
          id: pc.competition.id,
          name: pc.competition.name,
          status: pc.competition.status || 'draft',
          startDate: pc.competition.start_date,
          rounds: pc.competition.rounds?.[0]?.count || 0,
          players: pc.competition.players?.[0]?.count || 0,
          isOrganizer: false,
        }));
    },
    enabled: !!user?.id,
  });

  // Filter competitions by status
  const filterByStatus = useCallback(
    (competitions: CompetitionItem[] | undefined): CompetitionItem[] => {
      if (!competitions) return [];

      return competitions.filter((comp) => {
        const status = comp.status?.toLowerCase();

        if (statusFilter === 'active') {
          // Show upcoming, active, in-progress, and draft (hide completed and cancelled)
          return status !== 'completed' && status !== 'cancelled';
        } else {
          // Show only completed
          return status === 'completed';
        }
      });
    },
    [statusFilter]
  );

  // Get competition count for "My Comps" (for limit checking)
  const myCompetitionCount = myCompetitions?.length ?? 0;

  // Get tier limit info
  const maxCompetitions = limits?.maxCompetitionsOwned ?? 1;
  const hasUnlimitedCompetitions = isUnlimited(maxCompetitions) || isNoLimit(maxCompetitions);

  // Check if user can create a new competition
  const canCreateAccess = useMemo(
    () => checkCanCreateCompetition(myCompetitionCount),
    [checkCanCreateCompetition, myCompetitionCount]
  );
  const canCreateCompetition = canCreateAccess.allowed;

  // Fetch grandfathered (legacy) competition IDs when limits or competitions change
  useEffect(() => {
    async function fetchLegacyCompetitions() {
      if (!user?.id || !limits || hasUnlimitedCompetitions || isSuperAdmin) {
        setLegacyCompetitionIds(new Set());
        return;
      }

      try {
        const overLimit = await getCompetitionsOverLimit(user.id, maxCompetitions);
        const legacyIds = new Set(overLimit.map((item) => item.competition.id));
        setLegacyCompetitionIds(legacyIds);
      } catch (error) {
        console.error('Error fetching grandfathered competitions:', error);
        setLegacyCompetitionIds(new Set());
      }
    }

    fetchLegacyCompetitions();
  }, [user?.id, limits, maxCompetitions, hasUnlimitedCompetitions, isSuperAdmin]);

  // Current list based on active tab and status filter (with legacy flag)
  const currentCompetitions = useMemo(() => {
    const baseList = activeTab === 'my' ? myCompetitions : joinedCompetitions;
    const filtered = filterByStatus(baseList);

    // Add isLegacy flag for grandfathered competitions (only for "My Comps")
    if (activeTab === 'my' && legacyCompetitionIds.size > 0) {
      return filtered.map((comp) => ({
        ...comp,
        isLegacy: legacyCompetitionIds.has(comp.id),
      }));
    }

    return filtered;
  }, [activeTab, myCompetitions, joinedCompetitions, filterByStatus, legacyCompetitionIds]);

  const isLoading = activeTab === 'my' ? isLoadingMy : isLoadingJoined;
  const isRefetching = activeTab === 'my' ? isRefetchingMy : isRefetchingJoined;

  // Handlers
  const handleRefresh = useCallback(() => {
    if (activeTab === 'my') {
      refetchMy();
    } else {
      refetchJoined();
    }
  }, [activeTab, refetchMy, refetchJoined]);

  const handleCreateCompetition = useCallback(() => {
    navigation.navigate('CreateCompetition');
  }, [navigation]);

  const handleCreateWithAI = useCallback(() => {
    navigation.navigate('AICompetition');
  }, [navigation]);

  const handleJoinCompetition = useCallback(() => {
    navigation.navigate('JoinCompetition');
  }, [navigation]);

  const handleUpgrade = useCallback(() => {
    navigation.navigate('Subscription');
  }, [navigation]);

  const handleViewCompetition = useCallback(
    (competition: CompetitionItem) => {
      navigation.navigate('CompetitionDetail', { id: competition.id });
    },
    [navigation]
  );

  const handleDeleteCompetition = useCallback(
    (competition: CompetitionItem) => {
      if (!user?.id) return;
      setCompetitionToDelete(competition);
      setDeleteDialogVisible(true);
    },
    [user?.id]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!competitionToDelete || !user?.id) return;

    setIsDeleting(true);
    try {
      // Soft delete - set deleted_at timestamp
      // Type assertion needed because the generated Supabase types
      // restrict Update to 'never' for competitions table
      const { error } = await (supabase
        .from('competitions') as ReturnType<typeof supabase.from>)
        .update({ deleted_at: new Date().toISOString() } as Record<string, string>)
        .eq('id', competitionToDelete.id)
        .eq('organizer_id', user.id);

      if (error) {
        console.error('Error deleting competition:', error);
        // Keep dialog open and show error
        setIsDeleting(false);
        return;
      }

      // Success - close dialog and refetch
      setDeleteDialogVisible(false);
      setCompetitionToDelete(null);
      refetchMy();
    } catch (err) {
      console.error('Error deleting competition:', err);
    } finally {
      setIsDeleting(false);
    }
  }, [competitionToDelete, user?.id, refetchMy]);

  const handleCancelDelete = useCallback(() => {
    setDeleteDialogVisible(false);
    setCompetitionToDelete(null);
  }, []);

  // Get empty state content based on active tab and filter
  const getEmptyStateContent = () => {
    // Check if there are any competitions at all for this tab
    const baseList = activeTab === 'my' ? myCompetitions : joinedCompetitions;
    const hasAnyCompetitions = baseList && baseList.length > 0;

    // If filtered to empty but has competitions, show filter-specific message
    if (hasAnyCompetitions) {
      if (statusFilter === 'completed') {
        return {
          title: 'No Completed Competitions',
          message: 'Competitions will appear here once they are finished.',
          actionLabel: 'View Active',
          onAction: () => setStatusFilter('active'),
        };
      }
      return {
        title: 'No Active Competitions',
        message: 'All your competitions have been completed.',
        actionLabel: 'View Completed',
        onAction: () => setStatusFilter('completed'),
      };
    }

    // No competitions at all
    if (activeTab === 'my') {
      return {
        title: 'No Competitions Created',
        message: 'Create your first competition to get started.',
        actionLabel: 'Create Competition',
        onAction: handleCreateCompetition,
      };
    }
    return {
      title: 'No Competitions Joined',
      message: 'Join a competition using an invite code from an organiser.',
      actionLabel: 'Join Competition',
      onAction: handleJoinCompetition,
    };
  };

  const emptyState = getEmptyStateContent();

  // Header right content - just Join button
  const headerRightContent = (
    <View style={styles.headerActions}>
      <TouchableOpacity
        style={[styles.joinButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
        onPress={handleJoinCompetition}
        accessibilityRole="button"
        accessibilityLabel="Join competition"
      >
        <Text style={[styles.joinButtonText, { color: colors.primary }]}>Join</Text>
      </TouchableOpacity>
    </View>
  );

  // Create competition buttons section
  const createButtonsSection = (
    <View style={styles.createButtonsContainer}>
      <View style={styles.featureButtonWrapper}>
        <FeatureButton
          title="Create"
          subtitle="Step-by-step wizard"
          icon={<IconPlus size={20} color={colors.white} strokeWidth={2.5} />}
          onPress={canCreateCompetition ? handleCreateCompetition : handleUpgrade}
          backgroundColor={colors.primary}
          disabled={false}
          accessibilityLabel="Create new competition"
          variant="compact"
          showChevron={false}
        />
      </View>

      <View style={styles.featureButtonWrapper}>
        <FeatureButton
          title="AI Create"
          subtitle="Describe in English"
          icon={<IconSparkles size={20} color={colors.white} strokeWidth={2.5} />}
          onPress={canCreateCompetition ? handleCreateWithAI : handleUpgrade}
          backgroundColor="#7c3aed"
          disabled={false}
          accessibilityLabel="Create competition with AI"
          variant="compact"
          showChevron={false}
        />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <PageHeader title="Competitions" rightContent={headerRightContent} />

      {/* Create Competition Buttons */}
      {createButtonsSection}

      {/* Toggle Tabs */}
      <Tabs
        tabs={[
          { key: 'my', label: 'My Comps', count: myCompetitions?.length || 0 },
          { key: 'joined', label: 'Joined', count: joinedCompetitions?.length || 0 },
        ]}
        selectedTab={activeTab}
        onTabChange={setActiveTab}
        style={styles.tabContainer}
      />

      {/* Status Filter + Limit Indicator */}
      <View style={styles.filterRow}>
        <View style={styles.filterContainer}>
          <FilterPill
            label="Active"
            selected={statusFilter === 'active'}
            onPress={() => setStatusFilter('active')}
            accessibilityLabel="Show active and upcoming competitions"
          />
          <FilterPill
            label="Completed"
            selected={statusFilter === 'completed'}
            onPress={() => setStatusFilter('completed')}
            accessibilityLabel="Show completed competitions"
          />
        </View>

        {/* Limit Indicator - only show for "My Comps" tab */}
        {activeTab === 'my' && !hasUnlimitedCompetitions && (
          <View style={styles.limitIndicatorContainer}>
            <LimitIndicator
              current={myCompetitionCount}
              max={maxCompetitions}
              label="Competitions"
              showBar={false}
              testID="competition-limit-indicator"
            />
          </View>
        )}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            colors={[colors.textPrimary]}
            tintColor={colors.textPrimary}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner size="lg" message="Loading competitions..." />
          </View>
        ) : !currentCompetitions || currentCompetitions.length === 0 ? (
          <EmptyState
            icon="trophy-outline"
            title={emptyState.title}
            message={emptyState.message}
            actionLabel={emptyState.actionLabel}
            onAction={emptyState.onAction}
          />
        ) : (
          <View style={styles.list}>
            {currentCompetitions.map((competition) => (
              <View key={competition.id} style={styles.competitionCardWrapper}>
                {/* Legacy badge for grandfathered competitions */}
                {competition.isLegacy && (
                  <View
                    style={[styles.legacyBadge, { backgroundColor: colors.warning + '20' }]}
                    accessibilityLabel="Legacy competition - grandfathered from previous subscription"
                  >
                    <Icon source="history" size={12} color={colors.warning} />
                    <Text style={[styles.legacyBadgeText, { color: colors.warning }]}>
                      Legacy
                    </Text>
                  </View>
                )}
                <CompetitionListCard
                  competition={competition}
                  onPress={handleViewCompetition}
                  onDelete={handleDeleteCompetition}
                  swipeEnabled={activeTab === 'my'}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        visible={deleteDialogVisible}
        title="Delete Competition"
        message={`Are you sure you want to delete "${competitionToDelete?.name ?? 'this competition'}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        loading={isDeleting}
        icon="delete"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  joinButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  joinButtonText: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  createButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  featureButtonWrapper: {
    flex: 1,
  },
  tabContainer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  limitIndicatorContainer: {
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
  competitionCardWrapper: {
    position: 'relative',
  },
  legacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  legacyBadgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
