// src/screens/compete/hooks/useCompetitionGroups.ts
//
// Data hook for the Compete screen's Comps mode. Fetches the user's organized
// and joined competitions and returns them pre-grouped into active / upcoming /
// completed sections via groupCompetitions(), plus tier-limit info and the
// delete flow.
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { getCompetitionsOverLimit } from '@/services/subscription/grandfathering';
import { isUnlimited, isNoLimit } from '@/types/subscription.types';
import { fetchCompetitionWinner } from '@/services/competitions/winnerService';
import { useToast } from '@/context/ToastContext';
import type { TeamMode } from '@/types/database.types';
import { groupCompetitions, type CompetitionItem } from '../utils/groupCompetitions';

export type { CompetitionItem };

interface CompetitionRow {
  id: string;
  name: string;
  status: string | null;
  start_date: string | null;
  team_mode: TeamMode | null;
  rounds: { count: number }[] | null;
  players: { count: number }[] | null;
}

interface JoinedCompetitionRow {
  competition: {
    id: string;
    name: string;
    status: string | null;
    start_date: string | null;
    team_mode: TeamMode | null;
    organizer_id: string;
    deleted_at: string | null;
    rounds: { count: number }[] | null;
    players: { count: number }[] | null;
  } | null;
}

export function useCompetitionGroups() {
  const { user } = useAuth();
  const { limits, checkCanCreateCompetition, isSuperAdmin } =
    useSubscriptionContext();

  // State
  const [legacyCompetitionIds, setLegacyCompetitionIds] = useState<Set<string>>(
    new Set()
  );

  const { showToast } = useToast();

  // Delete state
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [competitionToDelete, setCompetitionToDelete] =
    useState<CompetitionItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
        .select(
          `
          id,
          name,
          status,
          start_date,
          team_mode,
          rounds:rounds(count),
          players:competition_players(count)
        `
        )
        .eq('organizer_id', user.id)
        .is('deleted_at', null)
        // NOTE: filters soft-deleted rounds from the embedded count; verify on dev that the count excludes them (PostgREST embedded-aggregate filter).
        .is('rounds.deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching organized competitions:', error);
        return [];
      }

      // Map competitions and fetch winner data for completed ones
      const competitions = await Promise.all(
        (organizedComps || []).map(async (comp: CompetitionRow) => {
          const baseCompetition: CompetitionItem = {
            id: comp.id,
            name: comp.name,
            status: comp.status || 'draft',
            startDate: comp.start_date,
            rounds: comp.rounds?.[0]?.count || 0,
            players: comp.players?.[0]?.count || 0,
            isOrganizer: true,
            teamMode: comp.team_mode ?? 'none',
          };

          // Fetch winner for completed competitions
          if (comp.status === 'completed') {
            const winner = await fetchCompetitionWinner(comp.id);
            return { ...baseCompetition, winner };
          }

          return baseCompetition;
        })
      );

      return competitions;
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
        .select(
          `
          competition:competitions!inner(
            id,
            name,
            status,
            start_date,
            team_mode,
            organizer_id,
            deleted_at,
            rounds:rounds(count),
            players:competition_players(count)
          )
        `
        )
        .eq('player_id', user.id)
        .eq('status', 'accepted')
        .is('competition.deleted_at', null)
        // NOTE: filters soft-deleted rounds from the embedded count; verify on dev that the count excludes them (PostgREST embedded-aggregate filter).
        .is('competition.rounds.deleted_at', null);

      if (error) {
        console.error('Error fetching joined competitions:', error);
        return [];
      }

      // Filter out competitions where user is the organizer
      const filtered = (playerComps || []).filter(
        (pc: JoinedCompetitionRow) =>
          pc.competition && pc.competition.organizer_id !== user.id
      );

      // Map competitions and fetch winner data for completed ones
      const competitions = await Promise.all(
        filtered.map(async (pc: JoinedCompetitionRow) => {
          // pc.competition is guaranteed to exist after the filter
          const comp = pc.competition!;
          const baseCompetition: CompetitionItem = {
            id: comp.id,
            name: comp.name,
            status: comp.status || 'draft',
            startDate: comp.start_date,
            rounds: comp.rounds?.[0]?.count || 0,
            players: comp.players?.[0]?.count || 0,
            isOrganizer: false,
            teamMode: comp.team_mode ?? 'none',
          };

          // Fetch winner for completed competitions
          if (comp.status === 'completed') {
            const winner = await fetchCompetitionWinner(comp.id);
            return { ...baseCompetition, winner };
          }

          return baseCompetition;
        })
      );

      return competitions;
    },
    enabled: !!user?.id,
  });

  // Get competition count for "My Comps" (for limit checking)
  const myCompetitionCount = myCompetitions?.length ?? 0;

  // Get tier limit info
  const maxCompetitions = limits?.maxCompetitionsOwned ?? 1;
  const hasUnlimitedCompetitions =
    isUnlimited(maxCompetitions) || isNoLimit(maxCompetitions);

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
        const overLimit = await getCompetitionsOverLimit(
          user.id,
          maxCompetitions
        );
        const legacyIds = new Set(overLimit.map((item) => item.competition.id));
        setLegacyCompetitionIds(legacyIds);
      } catch (error) {
        console.error('Error fetching grandfathered competitions:', error);
        setLegacyCompetitionIds(new Set());
      }
    }

    fetchLegacyCompetitions();
  }, [user?.id, limits, maxCompetitions, hasUnlimitedCompetitions, isSuperAdmin]);

  // Grouped sections with legacy flag applied to organizer comps
  const groups = useMemo(() => {
    const flaggedMy = myCompetitions?.map((comp) => ({
      ...comp,
      isLegacy: legacyCompetitionIds.has(comp.id),
    }));
    return groupCompetitions(flaggedMy, joinedCompetitions);
  }, [myCompetitions, joinedCompetitions, legacyCompetitionIds]);

  const isLoading = isLoadingMy || isLoadingJoined;
  const isRefetching = isRefetchingMy || isRefetchingJoined;

  const handleRefresh = useCallback(() => {
    refetchMy();
    refetchJoined();
  }, [refetchMy, refetchJoined]);

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
    const target = competitionToDelete;
    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('soft_delete_competition' as never, {
        p_competition_id: target.id,
      } as never);
      if (error) {
        console.error('Error deleting competition:', error);
        setIsDeleting(false);
        return;
      }
      setDeleteDialogVisible(false);
      setCompetitionToDelete(null);
      refetchMy();
      showToast({
        variant: 'success',
        title: 'Competition deleted',
        autoDismissMs: 6000,
        action: {
          label: 'Undo',
          onPress: async () => {
            const { error: restoreError } = await supabase.rpc('restore_competition' as never, {
              p_competition_id: target.id,
            } as never);
            if (restoreError) {
              console.error('Error restoring competition:', restoreError);
              showToast({ variant: 'error', title: "Couldn't undo", message: 'Please try again.' });
              return;
            }
            refetchMy();
          },
        },
      });
    } catch (err) {
      console.error('Error deleting competition:', err);
    } finally {
      setIsDeleting(false);
    }
  }, [competitionToDelete, user?.id, refetchMy, showToast]);

  const handleCancelDelete = useCallback(() => {
    setDeleteDialogVisible(false);
    setCompetitionToDelete(null);
  }, []);

  const hasAnyCompetitions =
    groups.active.length > 0 ||
    groups.upcoming.length > 0 ||
    groups.completed.length > 0;

  return {
    // Sections
    activeComps: groups.active,
    upcomingComps: groups.upcoming,
    completedComps: groups.completed,
    hasAnyCompetitions,

    // Loading states
    isLoading,
    isRefetching,

    // Subscription info
    myCompetitionCount,
    maxCompetitions,
    hasUnlimitedCompetitions,
    canCreateCompetition,

    // Handlers
    handleRefresh,
    handleDeleteCompetition,
    handleConfirmDelete,
    handleCancelDelete,

    // Delete dialog state
    deleteDialogVisible,
    competitionToDelete,
    isDeleting,
  };
}
