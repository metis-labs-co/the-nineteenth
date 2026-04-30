/**
 * PrizePoolDualConfig
 *
 * Tabs-driven UI that hosts an Individual and a Team `PrizePoolSection`
 * side by side. Used by the wizard's prize pool step and the unified
 * `EditPrizePoolBottomSheet`. Controlled component — drafts and edit
 * state come from the parent.
 *
 * When `teamModeAllowed=false`, the team tab is rendered disabled with
 * an inline banner. If `initialTab='team'` while disabled, the component
 * falls back to 'individual' on first render.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Tabs, type TabItem } from '@/components/common/Tabs';
import { spacing } from '@/constants/theme';
import {
  PrizePoolSection,
  type PrizePoolConfig,
  type PrizePoolEditState,
} from './PrizePoolSection';
import type { CompetitionPrizePool } from '@/types/database/prizePool.types';

// ============================================================================
// Types
// ============================================================================

export type PoolTabKey = 'individual' | 'team';

export interface PrizePoolDualConfigProps {
  /** Number of players (used for individual placements + per-player funding math) */
  playerCount: number;
  /** Number of teams (used for team placement cap) */
  teamCount: number;
  /** Number of rounds (passed through to PrizePoolSection) */
  roundCount: number;
  /** When false, the team tab is disabled and a banner explains why */
  teamModeAllowed: boolean;
  /** Tab the consumer wants to land on first; falls back to 'individual' if disabled */
  initialTab?: PoolTabKey;

  /** Existing individual pool (or null) — drives PrizePoolSection's initial state */
  individualPool: CompetitionPrizePool | null;
  /** Existing team pool (or null) */
  teamPool: CompetitionPrizePool | null;
  /** Lock / hasExistingPool state for the individual side */
  individualEditState?: PrizePoolEditState;
  /** Lock / hasExistingPool state for the team side */
  teamEditState?: PrizePoolEditState;

  /** Notified when the user changes the individual draft (null = disabled) */
  onIndividualChange: (config: PrizePoolConfig | null) => void;
  /** Notified when the user changes the team draft (null = disabled) */
  onTeamChange: (config: PrizePoolConfig | null) => void;

  /** Premium upgrade prompt handler */
  onUpgradePress: () => void;
  /** Forwarded to PrizePoolSection.hideToggle (true = no internal toggle) */
  hideToggles?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function PrizePoolDualConfig({
  playerCount,
  teamCount,
  roundCount,
  teamModeAllowed,
  initialTab = 'individual',
  individualPool,
  teamPool,
  individualEditState,
  teamEditState,
  onIndividualChange,
  onTeamChange,
  onUpgradePress,
  hideToggles = false,
}: PrizePoolDualConfigProps) {
  const [selectedTab, setSelectedTab] = useState<PoolTabKey>(
    initialTab === 'team' && !teamModeAllowed ? 'individual' : initialTab
  );

  // If teamModeAllowed flips to false while the team tab is selected, fall back.
  useEffect(() => {
    if (!teamModeAllowed && selectedTab === 'team') {
      setSelectedTab('individual');
    }
  }, [teamModeAllowed, selectedTab]);

  const tabs: TabItem<PoolTabKey>[] = [
    { key: 'individual', label: 'Individual' },
    { key: 'team', label: 'Team' },
  ];

  // Individual-only competitions hide the tab strip entirely — there's only
  // one editor to show, so the tabs would be noise.
  if (!teamModeAllowed) {
    return (
      <View style={styles.container}>
        <PrizePoolSection
          pool={individualPool}
          playerCount={playerCount}
          teamCount={teamCount}
          targetType="individual"
          roundCount={roundCount}
          onPoolChange={onIndividualChange}
          onUpgradePress={onUpgradePress}
          editState={individualEditState}
          hideToggle={hideToggles}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Tabs<PoolTabKey>
        tabs={tabs}
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
      />

      {selectedTab === 'individual' && (
        <PrizePoolSection
          pool={individualPool}
          playerCount={playerCount}
          teamCount={teamCount}
          targetType="individual"
          roundCount={roundCount}
          onPoolChange={onIndividualChange}
          onUpgradePress={onUpgradePress}
          editState={individualEditState}
          hideToggle={hideToggles}
        />
      )}

      {selectedTab === 'team' && (
        <PrizePoolSection
          pool={teamPool}
          playerCount={playerCount}
          teamCount={teamCount}
          targetType="team"
          roundCount={roundCount}
          onPoolChange={onTeamChange}
          onUpgradePress={onUpgradePress}
          editState={teamEditState}
          hideToggle={hideToggles}
        />
      )}
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
});

export default PrizePoolDualConfig;
