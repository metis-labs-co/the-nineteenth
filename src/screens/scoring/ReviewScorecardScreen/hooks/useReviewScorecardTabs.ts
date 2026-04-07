/**
 * useReviewScorecardTabs - Hook for tab definitions and game type detection
 *
 * Manages dynamic tab list based on game type, skins/wolf availability,
 * and stats visibility. Also computes game type flags used across the screen.
 */

import { useMemo, useState, useCallback } from 'react';
import type { TabItem } from '@/components/common/Tabs';
import { useStatsVisibilityWithTier } from '@/hooks/useStatsVisibilityWithTier';
import { useActiveSkinsGameForRound } from '@/hooks/useSkins';
import { useWolfGameByRound } from '@/hooks/wolf';
import { useRoundDetails } from '@/hooks/useRoundDetails';
import type { PayoutsMode } from '@/utils/combinedPayouts';
import type { GameType } from '@/types';

// =====================================================
// TAB TYPES
// =====================================================

export type TabKey = 'scorecard' | 'stats' | 'leaderboard' | 'contributions' | 'skins' | 'wolf' | 'payouts';

const BASE_TABS: TabItem<TabKey>[] = [
  { key: 'scorecard', label: 'Scorecard' },
];

// =====================================================
// HOOK
// =====================================================

interface UseReviewScorecardTabsParams {
  roundId: string | undefined;
  storeGameType: GameType;
}

export function useReviewScorecardTabs({ roundId, storeGameType }: UseReviewScorecardTabsParams) {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('scorecard');

  // Fetch round details for game type fallback
  const { data: roundDetails } = useRoundDetails(roundId || '');
  const scoringPairsRequired = roundDetails?.scoring_pairs_required ?? false;

  // Use roundDetails as fallback since store's gameType may not be preserved when loading from offline
  const effectiveGameType = roundDetails?.game_type || storeGameType;

  // Game type flags
  const isStrokePlay = effectiveGameType === 'stroke';
  const isScramble = effectiveGameType === 'scramble' || roundDetails?.team_format === 'scramble';
  const isShamble = effectiveGameType === 'shamble' || roundDetails?.team_format === 'shamble';

  // Check for active skins game
  const { data: skinsGame } = useActiveSkinsGameForRound(roundId || undefined);
  const hasSkinsGame = !!skinsGame;

  // Check for active Wolf game
  const { data: wolfGame } = useWolfGameByRound(roundId || undefined);
  const hasWolfGame = !!wolfGame && wolfGame.status !== 'cancelled';

  // Check if individual games have pots (for payouts tab)
  const hasSkinsWithPot = useMemo(() => {
    if (!hasSkinsGame || !skinsGame) return false;
    if (skinsGame.is_team_skins) return false; // v1: individual skins only
    if (skinsGame.pot_value <= 0) return false;
    return true;
  }, [hasSkinsGame, skinsGame]);

  const hasWolfWithPot = useMemo(() => {
    if (!hasWolfGame || !wolfGame) return false;
    if (!wolfGame.pot_enabled || !wolfGame.pot_value_per_point || wolfGame.pot_value_per_point <= 0) return false;
    return true;
  }, [hasWolfGame, wolfGame]);

  const hasPayoutsTab = hasSkinsWithPot || hasWolfWithPot;
  const payoutsMode: PayoutsMode | null = hasSkinsWithPot && hasWolfWithPot
    ? 'combined'
    : hasSkinsWithPot
      ? 'skins-only'
      : hasWolfWithPot
        ? 'wolf-only'
        : null;

  // Stats visibility (for Stats tab)
  const statsVisibility = useStatsVisibilityWithTier();
  const hasStats =
    statsVisibility.showPutts ||
    statsVisibility.showFairwayHit ||
    statsVisibility.showGreenInRegulation ||
    statsVisibility.showBunkerShots ||
    statsVisibility.showHazards;

  // Build tabs dynamically based on game type and skins availability
  const tabs = useMemo<TabItem<TabKey>[]>(() => {
    const tabList: TabItem<TabKey>[] = [...BASE_TABS];

    // Add stats tab if any stats are enabled
    if (hasStats) {
      tabList.push({ key: 'stats' as const, label: 'Stats' });
    }

    // For scramble, keep scorecard tab as "Scorecard", add leaderboard and contributions
    if (isScramble) {
      tabList[0] = { key: 'scorecard' as const, label: 'Scorecard' };
      tabList.push({ key: 'leaderboard' as const, label: 'Leaderboard' });
      tabList.push({ key: 'contributions' as const, label: 'Contributions' });
    }

    // For shamble, keep scorecard tab as "Scorecard" and add "Team Scores" tab
    if (isShamble) {
      tabList[0] = { key: 'scorecard' as const, label: 'Scorecard' };
      tabList.push({ key: 'contributions' as const, label: 'Team Scores' });
    }

    // Add leaderboard tab for stroke play
    if (isStrokePlay) {
      tabList.push({ key: 'leaderboard' as const, label: 'Leaderboard' });
    }

    // Add skins tab if skins game exists
    if (hasSkinsGame) {
      tabList.push({ key: 'skins' as const, label: 'Skins' });
    }

    // Add wolf tab if wolf game exists
    if (hasWolfGame) {
      tabList.push({ key: 'wolf' as const, label: 'Wolf' });
    }

    // Add payouts tab if any game has a pot
    if (hasPayoutsTab) {
      tabList.push({ key: 'payouts' as const, label: 'Payouts' });
    }

    return tabList;
  }, [hasSkinsGame, hasWolfGame, hasPayoutsTab, isStrokePlay, isScramble, isShamble, hasStats]);

  // Determine if we need to show tabs (more than just scorecard)
  const showTabs = isStrokePlay || hasSkinsGame || hasWolfGame || isScramble || isShamble || hasStats;

  // Handle tab change
  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab);
  }, []);

  return {
    // Tab state
    activeTab,
    tabs,
    showTabs,
    handleTabChange,

    // Game type flags
    effectiveGameType,
    isStrokePlay,
    isScramble,
    isShamble,

    // Round details
    roundDetails,
    scoringPairsRequired,

    // Side games
    skinsGame,
    hasSkinsGame,
    wolfGame,
    hasWolfGame,
    hasPayoutsTab,
    payoutsMode,

    // Stats
    statsVisibility,
    hasStats,
  };
}
