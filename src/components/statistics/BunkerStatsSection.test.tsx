/**
 * BunkerStatsSection Component Tests
 *
 * Focus: the empty-state message must reflect reality. When bunker tracking
 * is enabled but no data has been recorded for the rounds in scope, the
 * section must NOT tell the user to enable a setting they already have on.
 */

import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { BunkerStatsSection } from './BunkerStatsSection';
import type { BunkerStats } from '@/hooks/playerStatistics';

// FeatureLock requires SubscriptionProvider, which is irrelevant to the
// empty-state message under test — render its children directly.
jest.mock('@/components/subscription', () => ({
  FeatureLock: ({ children }: { children: React.ReactNode }) => children,
}));

const emptyStats: BunkerStats = {
  totalBunkerShots: 0,
  holesWithBunkers: 0,
  totalHolesTracked: 0,
  averageBunkerShotsPerRound: null,
  holesWithBunkersPercentage: null,
  sandSavePercentage: null,
  sandSaves: 0,
  sandSaveAttempts: 0,
};

const statsWithData: BunkerStats = {
  totalBunkerShots: 3,
  holesWithBunkers: 2,
  totalHolesTracked: 18,
  averageBunkerShotsPerRound: 1.5,
  holesWithBunkersPercentage: 11.1,
  sandSavePercentage: null,
  sandSaves: 0,
  sandSaveAttempts: 0,
};

describe('BunkerStatsSection empty state', () => {
  it('does NOT prompt to enable settings when tracking is already enabled', () => {
    render(<BunkerStatsSection bunkerStats={emptyStats} trackingEnabled />);
    expect(screen.queryByText(/Enable bunker tracking in Settings/i)).toBeNull();
    expect(screen.getByText(/No bunker shots recorded/i)).toBeTruthy();
  });

  it('prompts to enable settings when tracking is disabled', () => {
    render(<BunkerStatsSection bunkerStats={emptyStats} trackingEnabled={false} />);
    expect(screen.getByText(/Enable bunker tracking in Settings/i)).toBeTruthy();
  });

  it('renders bunker stats when data exists', () => {
    render(<BunkerStatsSection bunkerStats={statsWithData} trackingEnabled />);
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.queryByText(/Enable bunker tracking in Settings/i)).toBeNull();
    expect(screen.queryByText(/No bunker shots recorded/i)).toBeNull();
  });
});
