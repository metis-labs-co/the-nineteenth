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
import { Icon, Text } from 'react-native-paper';

import { Tabs, type TabItem } from '@/components/common/Tabs';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography } from '@/constants/theme';
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
  const colors = useThemeColors();

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
    { key: 'team', label: 'Team', disabled: !teamModeAllowed },
  ];

  return (
    <View style={styles.container}>
      <Tabs<PoolTabKey>
        tabs={tabs}
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
      />

      {!teamModeAllowed && selectedTab === 'individual' && (
        <View
          style={[
            styles.banner,
            { backgroundColor: colors.infoLight, borderColor: colors.info },
          ]}
        >
          <Icon source="information-outline" size={18} color={colors.infoDark} />
          <Text style={[styles.bannerText, { color: colors.infoDark }]}>
            Team prize pool requires Fixed Teams. Enable teams on the
            competition to configure one.
          </Text>
        </View>
      )}

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

      {selectedTab === 'team' && teamModeAllowed && (
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
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  bannerText: {
    ...typography.small,
    flex: 1,
  },
});

export default PrizePoolDualConfig;
