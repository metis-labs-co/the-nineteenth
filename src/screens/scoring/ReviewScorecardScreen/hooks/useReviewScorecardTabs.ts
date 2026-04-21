/**
 * useReviewScorecardTabs - Hook for tab definitions and game type detection
 *
 * Manages dynamic tab list based on game type, skins/wolf availability,
 * and stats visibility. Also computes game type flags used across the screen.
 */

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
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
  const isBestBall = roundDetails?.team_format === 'best-ball';
  const isMatchPlayTeam = roundDetails?.team_format === 'match-play-team';

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

  // Build tabs dynamically based on game type and skins availability.
  //
  // Team format ordering rules:
  // - Scramble: Leaderboard first, no Stats (individual stats not tracked).
  // - Shamble: no Stats (same reason); order unchanged — no dedicated leaderboard tab.
  // - Best-ball / Match-play-team: Leaderboard first, Scorecard, Stats third (less prominent
  //   because individual stats are tracked but secondary to team outcome).
  const tabs = useMemo<TabItem<TabKey>[]>(() => {
    const tabList: TabItem<TabKey>[] = [];

    if (isScramble) {
      tabList.push({ key: 'leaderboard' as const, label: 'Leaderboard' });
      tabList.push({ key: 'scorecard' as const, label: 'Scorecard' });
      tabList.push({ key: 'contributions' as const, label: 'Contributions' });
    } else if (isShamble) {
      tabList.push({ key: 'scorecard' as const, label: 'Scorecard' });
      tabList.push({ key: 'contributions' as const, label: 'Team Scores' });
    } else if (isBestBall || isMatchPlayTeam) {
      tabList.push({ key: 'leaderboard' as const, label: 'Leaderboard' });
      tabList.push({ key: 'scorecard' as const, label: 'Scorecard' });
      if (hasStats) {
        tabList.push({ key: 'stats' as const, label: 'Stats' });
      }
    } else {
      // Default (stroke play, stableford, par, etc.)
      tabList.push({ key: 'scorecard' as const, label: 'Scorecard' });
      if (hasStats) {
        tabList.push({ key: 'stats' as const, label: 'Stats' });
      }
      if (isStrokePlay) {
        tabList.push({ key: 'leaderboard' as const, label: 'Leaderboard' });
      }
    }

    // Side-game tabs appended for every format
    if (hasSkinsGame) {
      tabList.push({ key: 'skins' as const, label: 'Skins' });
    }
    if (hasWolfGame) {
      tabList.push({ key: 'wolf' as const, label: 'Wolf' });
    }
    if (hasPayoutsTab) {
      tabList.push({ key: 'payouts' as const, label: 'Payouts' });
    }

    return tabList;
  }, [hasSkinsGame, hasWolfGame, hasPayoutsTab, isStrokePlay, isScramble, isShamble, isBestBall, isMatchPlayTeam, hasStats]);

  // Determine if we need to show tabs (more than just scorecard)
  const showTabs =
    isStrokePlay ||
    hasSkinsGame ||
    hasWolfGame ||
    isScramble ||
    isShamble ||
    isBestBall ||
    isMatchPlayTeam ||
    hasStats;

  // Handle tab change
  const hasUserSelectedTab = useRef(false);
  const handleTabChange = useCallback((tab: TabKey) => {
    hasUserSelectedTab.current = true;
    setActiveTab(tab);
  }, []);

  // Default active tab tracks the first tab until the user picks one manually.
  // Important for team formats where Leaderboard is first — otherwise the user
  // would land on Scorecard (the static initial state) while Leaderboard is highlighted.
  useEffect(() => {
    if (hasUserSelectedTab.current) return;
    if (tabs.length === 0) return;
    const firstKey = tabs[0].key;
    if (firstKey !== activeTab) {
      setActiveTab(firstKey);
    }
  }, [tabs, activeTab]);

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
    isBestBall,
    isMatchPlayTeam,

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
