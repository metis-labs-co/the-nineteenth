// src/screens/competitions/hooks/useCompetitionsList.ts
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { getCompetitionsOverLimit } from '@/services/subscription/grandfathering';
import { isUnlimited, isNoLimit } from '@/types/subscription.types';
import { fetchCompetitionWinner } from '@/services/competitions/winnerService';
import type { CompetitionWinnerInfo } from '@/components/competitions/CompetitionListCard';
import { useToast } from '@/context/ToastContext';

export type TabValue = 'my' | 'joined';
export type StatusFilter = 'active' | 'completed';

export interface CompetitionItem {
  id: string;
  name: string;
  status: string;
  rounds: number;
  players: number;
  isOrganizer: boolean;
  startDate: string | null;
  /** Whether this competition is grandfathered (over tier limit) */
  isLegacy?: boolean;
  /** Winner information (only for completed competitions) */
  winner?: CompetitionWinnerInfo;
}

interface CompetitionRow {
  id: string;
  name: string;
  status: string | null;
  start_date: string | null;
  rounds: { count: number }[] | null;
  players: { count: number }[] | null;
}

interface JoinedCompetitionRow {
  competition: {
    id: string;
    name: string;
    status: string | null;
    start_date: string | null;
    organizer_id: string;
    deleted_at: string | null;
    rounds: { count: number }[] | null;
    players: { count: number }[] | null;
  } | null;
}

export function useCompetitionsList() {
  const { user } = useAuth();
  const { limits, checkCanCreateCompetition, isSuperAdmin } =
    useSubscriptionContext();

  // State
  const [activeTab, setActiveTab] = useState<TabValue>('my');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
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
  const hasUnlimitedCompetitions =
    isUnlimited(maxCompetitions) || isNoLimit(maxCompetitions);

  // Check if user can create a new competition
  const canCreateAccess = useMemo(
    () => checkCanCreateCompetition(myCompetitionCount),
    [checkCanCreateCompetition, myCompetitionCount]
  );
  const canCreateCompetition = canCreateAccess.allowed;

  // Default to "Joined" tab on first load if user has no created comps but has joined comps
  const hasInitializedTab = useRef(false);
  useEffect(() => {
    if (hasInitializedTab.current) return;
    if (isLoadingMy || isLoadingJoined) return;

    if ((myCompetitions?.length ?? 0) === 0 && (joinedCompetitions?.length ?? 0) > 0) {
      setActiveTab('joined');
    }
    hasInitializedTab.current = true;
  }, [isLoadingMy, isLoadingJoined, myCompetitions, joinedCompetitions]);

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

  // Sort competitions by status priority, then by date
  const sortCompetitions = useCallback(
    (competitions: CompetitionItem[]): CompetitionItem[] => {
      // Status priority: active/in_progress first, then upcoming, then draft
      const statusPriority: Record<string, number> = {
        active: 0,
        in_progress: 0,
        'in-progress': 0,
        upcoming: 1,
        draft: 2,
        completed: 3,
        cancelled: 4,
      };

      return [...competitions].sort((a, b) => {
        const statusA = a.status?.toLowerCase() || 'draft';
        const statusB = b.status?.toLowerCase() || 'draft';

        // First sort by status priority
        const priorityA = statusPriority[statusA] ?? 5;
        const priorityB = statusPriority[statusB] ?? 5;

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        // Then sort by start date (earliest first for active/upcoming, most recent first for completed)
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;

        // For completed competitions, show most recent first
        if (statusA === 'completed') {
          return dateB - dateA;
        }

        // For active/upcoming, show earliest first
        return dateA - dateB;
      });
    },
    []
  );

  // Current list based on active tab and status filter (with legacy flag)
  const currentCompetitions = useMemo(() => {
    const baseList = activeTab === 'my' ? myCompetitions : joinedCompetitions;
    const filtered = filterByStatus(baseList);
    const sorted = sortCompetitions(filtered);

    // Add isLegacy flag for grandfathered competitions (only for "My Comps")
    if (activeTab === 'my' && legacyCompetitionIds.size > 0) {
      return sorted.map((comp) => ({
        ...comp,
        isLegacy: legacyCompetitionIds.has(comp.id),
      }));
    }

    return sorted;
  }, [
    activeTab,
    myCompetitions,
    joinedCompetitions,
    filterByStatus,
    sortCompetitions,
    legacyCompetitionIds,
  ]);

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

  // Get empty state content based on active tab and filter
  const getEmptyStateContent = useCallback(
    (
      onCreateCompetition: () => void,
      onJoinCompetition: () => void
    ): {
      title: string;
      message: string;
      actionLabel: string;
      onAction: () => void;
    } => {
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
          onAction: onCreateCompetition,
        };
      }
      return {
        title: 'No Competitions Joined',
        message: 'Join a competition using an invite code from an organiser.',
        actionLabel: 'Join Competition',
        onAction: onJoinCompetition,
      };
    },
    [activeTab, myCompetitions, joinedCompetitions, statusFilter]
  );

  return {
    // Tab state
    activeTab,
    setActiveTab,

    // Filter state
    statusFilter,
    setStatusFilter,

    // Data
    myCompetitions,
    joinedCompetitions,
    currentCompetitions,

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
    getEmptyStateContent,

    // Delete dialog state
    deleteDialogVisible,
    competitionToDelete,
    isDeleting,
  };
}
