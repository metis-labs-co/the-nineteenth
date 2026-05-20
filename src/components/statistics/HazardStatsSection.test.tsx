/**
 * HazardStatsSection Component Tests
 *
 * Focus: the empty-state message must reflect reality. When hazard tracking
 * is enabled but no data has been recorded for the rounds in scope, the
 * section must NOT tell the user to enable a setting they already have on.
 */

import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { HazardStatsSection } from './HazardStatsSection';
import type { HazardStats } from '@/hooks/playerStatistics';

// FeatureLock requires SubscriptionProvider, which is irrelevant to the
// empty-state message under test — render its children directly.
jest.mock('@/components/subscription', () => ({
  FeatureLock: ({ children }: { children: React.ReactNode }) => children,
}));

const emptyStats: HazardStats = {
  waterCount: 0,
  obCount: 0,
  lateralCount: 0,
  lostBallCount: 0,
  totalHazards: 0,
  averageHazardsPerRound: null,
  holesWithHazards: 0,
  totalHolesTracked: 0,
};

const statsWithData: HazardStats = {
  waterCount: 2,
  obCount: 1,
  lateralCount: 0,
  lostBallCount: 0,
  totalHazards: 3,
  averageHazardsPerRound: 1.5,
  holesWithHazards: 2,
  totalHolesTracked: 18,
};

describe('HazardStatsSection empty state', () => {
  it('does NOT prompt to enable settings when tracking is already enabled', () => {
    render(<HazardStatsSection hazardStats={emptyStats} trackingEnabled />);
    expect(screen.queryByText(/Enable hazard tracking in Settings/i)).toBeNull();
    expect(screen.getByText(/No hazards recorded/i)).toBeTruthy();
  });

  it('prompts to enable settings when tracking is disabled', () => {
    render(<HazardStatsSection hazardStats={emptyStats} trackingEnabled={false} />);
    expect(screen.getByText(/Enable hazard tracking in Settings/i)).toBeTruthy();
  });

  it('renders hazard stats when data exists', () => {
    render(<HazardStatsSection hazardStats={statsWithData} trackingEnabled />);
    expect(screen.queryByText(/No hazards recorded/i)).toBeNull();
    expect(screen.queryByText(/Enable hazard tracking in Settings/i)).toBeNull();
    // Total hazards summary value
    expect(screen.getByText('Total Hazards')).toBeTruthy();
  });
});
