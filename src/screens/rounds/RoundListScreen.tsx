/**
 * RoundsScreen - Main tab screen showing active rounds to score
 *
 * Features:
 * - "Score New Round" floating button at top
 * - List of active rounds needing to be scored
 * - Links to score entry screen
 * - Pull-to-refresh for updating rounds
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { ConfirmationDialog } from '@/components/common';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { IconPlus, IconGolf } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { PageHeader, FeatureButton, Tabs } from '@/components/common';
import { RoundListCard, type RoundListCardData } from '@/components/rounds';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useScorecardStore } from '@/store/scorecardStore';
import type { RootStackParamList } from '@/navigation/types';
import type { Player, Hole, TeeBox, GameType } from '@/types';
import CreateRoundBottomSheet, { type ScoringPairsConfig } from './CreateRoundBottomSheet';
import { createScoringPairs } from '@/services/scoringPairs/scoringPairsService';

// Default holes (used when course has no hole data)
const DEFAULT_HOLES: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  number: (i + 1) as Hole['number'],
  par: ([4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4][i] || 4) as Hole['par'],
  strokeIndex: [7, 15, 1, 11, 5, 17, 9, 3, 13, 8, 16, 2, 12, 6, 18, 10, 4, 14][i] || i + 1,
  yardages: { white: 350 + i * 15 },
}));

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface PlayingPartner {
  id: string;
  name: string;
  handicap?: number;
}

type RoundTab = 'active' | 'history';

interface RoundPlayerInfo {
  id: string;
  name: string;
}

interface RoundItem {
  id: string;
  roundNumber: number;
  totalRounds: number;
  gameType: string;
  status: string;
  date?: string;
  teeTime?: string;
  isStandalone: boolean;
  competition?: {
    id: string;
    name: string;
  };
  course: {
    id: string;
    name: string;
    venueName?: string;
    city?: string;
    state?: string;
  };
  holesCompleted: number;
  totalHoles: number;
  players?: RoundPlayerInfo[];
}

export default function RoundsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const colors = useThemeColors();
  const { user, player } = useAuth();
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const [isStartingRound, setIsStartingRound] = useState(false);
  const [selectedTab, setSelectedTab] = useState<RoundTab>('active');
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [roundToDelete, setRoundToDelete] = useState<RoundListCardData | null>(null);
  const { initializeRound } = useScorecardStore();

  // Fetch standalone/practice rounds for the user (both active and historical)
  // Competition rounds are accessed via the Competitions screen
  const {
    data: rounds,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<{ active: RoundItem[]; history: RoundItem[] }>({
    queryKey: ['rounds', user?.id],
    queryFn: async () => {
      if (!user?.id) return { active: [], history: [] };

      const allRounds: RoundItem[] = [];

      // 1. Fetch standalone rounds (user's own rounds without competition)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: standaloneRounds, error: standaloneError } = await (supabase
        .from('rounds') as any)
        .select(`
          id,
          round_number,
          game_type,
          status,
          date,
          tee_time,
          courses!course_id(
            id,
            name,
            venue:venues(
              name,
              city,
              state
            )
          )
        `)
        .eq('user_id', user.id)
        .is('competition_id', null)
        .order('date', { ascending: false });

      // Collect standalone round IDs to fetch their players
      const standaloneRoundIds: string[] = [];

      if (standaloneError) {
        console.error('Error fetching standalone rounds:', standaloneError);
      } else {
        for (const round of (standaloneRounds || []) as any[]) {
          standaloneRoundIds.push(round.id);
          allRounds.push({
            id: round.id,
            roundNumber: round.round_number,
            totalRounds: 1, // Standalone rounds don't have multiple rounds
            gameType: round.game_type,
            status: round.status,
            date: round.date,
            teeTime: round.tee_time,
            isStandalone: true,
            competition: undefined,
            course: {
              id: round.courses?.id || '',
              name: round.courses?.name || 'Unknown Course',
              venueName: round.courses?.venue?.name,
              city: round.courses?.venue?.city,
              state: round.courses?.venue?.state,
            },
            holesCompleted: 0,
            totalHoles: 18,
            players: [], // Will be populated below
          });
        }
      }

      // 2. Fetch standalone rounds where user is a participant (invited by friends)
      // This shows rounds synced from friends
      // Note: round_players table may not exist if migration hasn't been applied
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: participantRounds, error: participantError } = await (supabase
          .from('round_players') as any)
          .select(`
            round:rounds!inner(
              id,
              user_id,
              round_number,
              game_type,
              status,
              date,
              tee_time,
              courses!course_id(
                id,
                name,
                venue:venues(
                  name,
                  city,
                  state
                )
              )
            )
          `)
          .eq('player_id', user.id)
          .is('round.competition_id', null)
          .neq('round.user_id', user.id); // Exclude rounds user owns (already fetched above)

        if (participantError) {
          // Table might not exist yet - this is not a critical error
          if (participantError.code !== 'PGRST205') {
            console.error('Error fetching participant rounds:', participantError);
          }
        } else {
          for (const rp of (participantRounds || []) as any[]) {
            const round = rp.round;
            if (!round) continue;

            // Check if this round is already in the list (shouldn't happen, but just in case)
            if (allRounds.some(r => r.id === round.id)) continue;

            allRounds.push({
              id: round.id,
              roundNumber: round.round_number,
              totalRounds: 1,
              gameType: round.game_type,
              status: round.status,
              date: round.date,
              teeTime: round.tee_time,
              isStandalone: true,
              competition: undefined,
              course: {
                id: round.courses?.id || '',
                name: round.courses?.name || 'Unknown Course',
                venueName: round.courses?.venue?.name,
                city: round.courses?.venue?.city,
                state: round.courses?.venue?.state,
              },
              holesCompleted: 0,
              totalHoles: 18,
              players: [], // Will be populated below
            });
          }
        }
      } catch (err) {
        // Silently ignore if round_players table doesn't exist yet
        console.log('round_players query skipped (table may not exist yet)');
      }

      // 3. Fetch players for all standalone rounds
      // Collect all standalone round IDs
      const allStandaloneRoundIds = allRounds
        .filter(r => r.isStandalone)
        .map(r => r.id);

      if (allStandaloneRoundIds.length > 0) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: roundPlayersData, error: playersError } = await (supabase
            .from('round_players') as any)
            .select(`
              round_id,
              player:players!player_id(
                id,
                name
              )
            `)
            .in('round_id', allStandaloneRoundIds);

          if (playersError) {
            if (playersError.code !== 'PGRST205') {
              console.error('Error fetching round players:', playersError);
            }
          } else if (roundPlayersData) {
            // Group players by round_id
            const playersByRound = new Map<string, RoundPlayerInfo[]>();
            for (const rp of roundPlayersData as any[]) {
              if (!rp.player) continue;
              const roundId = rp.round_id;
              if (!playersByRound.has(roundId)) {
                playersByRound.set(roundId, []);
              }
              playersByRound.get(roundId)!.push({
                id: rp.player.id,
                name: rp.player.name,
              });
            }

            // Update allRounds with player info
            for (const round of allRounds) {
              if (round.isStandalone && playersByRound.has(round.id)) {
                round.players = playersByRound.get(round.id);
              }
            }
          }
        } catch (err) {
          console.log('round_players fetch for player info skipped');
        }
      }

      // Separate into active and historical
      const active = allRounds
        .filter(r => r.status !== 'completed')
        .sort((a, b) => {
          // In-progress first
          if (a.status === 'in-progress' && b.status !== 'in-progress') return -1;
          if (b.status === 'in-progress' && a.status !== 'in-progress') return 1;
          // Then by date
          if (a.date && b.date) {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          }
          return 0;
        });

      const history = allRounds
        .filter(r => r.status === 'completed')
        .sort((a, b) => {
          // Most recent first
          if (a.date && b.date) {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          }
          return 0;
        });

      return { active, history };
    },
    enabled: !!user?.id,
  });

  const activeRounds = rounds?.active || [];
  const historyRounds = rounds?.history || [];
  const displayedRounds = selectedTab === 'active' ? activeRounds : historyRounds;

  const handleScoreRound = useCallback(
    (round: RoundItem) => {
      // Navigate to ViewRound screen for viewing details
      navigation.navigate('ViewRound', {
        roundId: round.id,
        competitionId: round.competition?.id,
      });
    },
    [navigation]
  );

  const handleOpenNewRound = useCallback(() => {
    setIsBottomSheetVisible(true);
  }, []);

  const handleCloseBottomSheet = useCallback(() => {
    setIsBottomSheetVisible(false);
  }, []);

  const queryClient = useQueryClient();

  // Delete round mutation
  const deleteRoundMutation = useMutation({
    mutationFn: async (roundId: string) => {
      // First delete related records (round_players, scoring_pairs, scorecards)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('round_players') as any).delete().eq('round_id', roundId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('scoring_pairs') as any).delete().eq('round_id', roundId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('scorecards') as any).delete().eq('round_id', roundId);

      // Then delete the round itself
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('rounds') as any)
        .delete()
        .eq('id', roundId)
        .eq('user_id', user?.id); // Only allow deleting own rounds

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rounds', user?.id] });
    },
    onError: (error) => {
      console.error('Error deleting round:', error);
      Alert.alert('Error', 'Failed to delete round. Please try again.');
    },
  });

  const handleDeleteRound = useCallback(
    (round: RoundListCardData) => {
      setRoundToDelete(round);
      setDeleteDialogVisible(true);
    },
    []
  );

  const handleConfirmDelete = useCallback(() => {
    if (roundToDelete) {
      deleteRoundMutation.mutate(roundToDelete.id);
      setDeleteDialogVisible(false);
      setRoundToDelete(null);
    }
  }, [roundToDelete, deleteRoundMutation]);

  const handleCancelDelete = useCallback(() => {
    setDeleteDialogVisible(false);
    setRoundToDelete(null);
  }, []);

  const handleStartNewRound = useCallback(
    async (
      courseId: string,
      courseName: string,
      partners: PlayingPartner[],
      selectedTee?: TeeBox,
      gameType: GameType = 'stableford',
      scoringPairsConfig?: ScoringPairsConfig
    ) => {
      if (isStartingRound) return;

      setIsStartingRound(true);
      setIsBottomSheetVisible(false);

      try {
        // Fetch course data including holes
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('id, name, holes')
          .eq('id', courseId)
          .single();

        if (courseError) {
          console.error('Error fetching course:', courseError);
        }

        // Use course holes or default holes (fallback if empty array)
        const courseHoles = (courseData as any)?.holes;
        const holes: Hole[] = courseHoles && courseHoles.length > 0 ? courseHoles : DEFAULT_HOLES;

        // Create the round in Supabase (standalone round - no competition)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: roundData, error: roundError } = await (supabase
          .from('rounds') as any)
          .insert({
            course_id: courseId,
            user_id: user?.id, // Owner of standalone round
            competition_id: null, // No competition for standalone rounds
            round_number: 1,
            date: new Date().toISOString().split('T')[0],
            game_type: gameType,
            status: 'in-progress',
            selected_tee: selectedTee ?? null, // Store the selected tee
            scoring_pairs_required: scoringPairsConfig?.enabled ?? false,
          })
          .select('id')
          .single();

        if (roundError) {
          console.error('Error creating round in Supabase:', roundError);
          throw new Error(`Failed to create round: ${roundError.message}`);
        }

        const roundId = roundData.id;

        // Create player objects for all participants
        const players: Player[] = [];

        // Add current user as the first player
        if (player) {
          players.push({
            id: player.id,
            name: player.name,
            email: player.email || '',
            phone: player.phone ?? undefined,
            handicap: player.handicap ?? 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } else if (user) {
          // Fallback if player profile not loaded
          players.push({
            id: user.id,
            name: user.email?.split('@')[0] || 'Player 1',
            email: user.email || '',
            handicap: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        // Add selected partners
        for (const partner of partners) {
          players.push({
            id: partner.id,
            name: partner.name,
            email: '',
            handicap: partner.handicap ?? 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        // Create round_players records to sync round to friends' profiles
        // This also triggers notifications to friends via database trigger
        if (user?.id) {
          const roundPlayersToInsert = [
            // Add current user (round owner) - added_by is null for self
            { round_id: roundId, player_id: user.id, added_by: null },
            // Add partners - added_by is the round owner
            ...partners.map(partner => ({
              round_id: roundId,
              player_id: partner.id,
              added_by: user.id,
            })),
          ];

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: roundPlayersError } = await (supabase
            .from('round_players') as any)
            .insert(roundPlayersToInsert);

          if (roundPlayersError) {
            // Log error but don't fail the round creation - it's not critical
            console.error('[RoundsScreen] Error creating round_players:', roundPlayersError);
          } else {
            console.log('[RoundsScreen] Created round_players records for', roundPlayersToInsert.length, 'players');
          }
        }

        // Create scoring pairs if enabled
        if (scoringPairsConfig?.enabled && scoringPairsConfig.pairs.length > 0 && user?.id) {
          try {
            // Replace 'current-user' placeholder with actual user ID
            const pairsWithRealIds = scoringPairsConfig.pairs.map(pair => ({
              scorerId: pair.scorerId === 'current-user' ? user.id : pair.scorerId,
              playerId: pair.playerId === 'current-user' ? user.id : pair.playerId,
            }));

            await createScoringPairs(roundId, pairsWithRealIds);
            console.log('[RoundsScreen] Created scoring pairs for round:', pairsWithRealIds.length, 'pairs');
          } catch (scoringPairsError) {
            // Log error but don't fail the round creation
            console.error('[RoundsScreen] Error creating scoring pairs:', scoringPairsError);
          }
        }

        console.log('[RoundsScreen] Starting round:', {
          roundId,
          course: courseName,
          selectedTee: selectedTee?.name ?? 'None',
          gameType,
          players: players.map(p => p.name),
          holes: holes.length,
        });

        // Initialize the scorecard store (not standalone - will sync to server)
        await initializeRound(roundId, players, holes, gameType, false);

        // Navigate to scorecard entry screen
        navigation.navigate('Scorecard', {
          roundId,
          competitionId: 'standalone',
        });
      } catch (error) {
        console.error('[RoundsScreen] Error starting round:', error);
        Alert.alert(
          'Error',
          'Failed to start the round. Please try again.',
          [{ text: 'OK' }]
        );
      } finally {
        setIsStartingRound(false);
      }
    },
    [navigation, player, user, initializeRound, isStartingRound]
  );

  const renderEmptyState = () => (
    <View style={[styles.emptyState, { backgroundColor: colors.gray100 }]}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.gray200 }]}>
        <IconGolf size={48} color={colors.gray400} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        {selectedTab === 'active' ? 'No Active Rounds' : 'No Completed Rounds'}
      </Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {selectedTab === 'active'
          ? 'Tap the button above to start scoring a round'
          : 'Your completed rounds will appear here'}
      </Text>
    </View>
  );

  const renderRoundItem = ({ item }: { item: RoundItem }) => (
    <RoundListCard
      round={item}
      onPress={() => handleScoreRound(item)}
      onDelete={handleDeleteRound}
      swipeEnabled={true}
      actionLabel={selectedTab === 'active' ? 'Score' : 'View'}
      currentUserId={user?.id}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Rounds" />

      {/* Sticky Header Section */}
      <View style={styles.stickyHeader}>
        {/* Score New Round Button */}
        <FeatureButton
          title="Score Social Round"
          subtitle="Start scoring a round at any course"
          icon={<IconPlus size={24} color={colors.white} strokeWidth={2.5} />}
          onPress={handleOpenNewRound}
          accessibilityLabel="Score new round"
        />

        {/* Toggle Tabs */}
        <View style={styles.tabSection}>
          <Tabs
            tabs={[
              { key: 'active', label: 'Active', count: activeRounds.length },
              { key: 'history', label: 'Completed', count: historyRounds.length },
            ]}
            selectedTab={selectedTab}
            onTabChange={setSelectedTab}
            style={styles.tabContainer}
          />

          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            {selectedTab === 'active'
              ? 'Rounds that need scoring'
              : 'Your completed rounds'}
          </Text>
        </View>
      </View>

      {/* Scrollable Rounds List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading rounds...</Text>
        </View>
      ) : (
        <FlatList
          data={displayedRounds}
          renderItem={renderRoundItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Bottom Sheet */}
      <CreateRoundBottomSheet
        visible={isBottomSheetVisible}
        onClose={handleCloseBottomSheet}
        onStartRound={handleStartNewRound}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        visible={deleteDialogVisible}
        title="Delete Round"
        message={`Are you sure you want to delete this round at ${roundToDelete?.course.name ?? 'this course'}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        loading={deleteRoundMutation.isPending}
        icon="delete"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Sticky Header
  stickyHeader: {
    paddingTop: spacing.lg,
  },
  tabSection: {
    paddingHorizontal: spacing.lg,
  },
  sectionSubtitle: {
    ...typography.small,
    marginBottom: spacing.md,
  },

  // Toggle Tabs
  tabContainer: {
    marginBottom: spacing.md,
  },

  // List
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  separator: {
    height: spacing.md,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
  },

  // Empty State
  emptyState: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h4,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
  },
});
