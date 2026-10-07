import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HandicapHomeSection } from './HandicapHomeSection';
import { useCheckFeature } from '@/context/SubscriptionContext';
import { useHomeUiStore } from '@/store/homeUiStore';
import type { FeatureAccess } from '@/types/subscription.types';
import type { HandicapSummary } from '@/types/handicap.types';

jest.mock('@/context/SubscriptionContext', () => ({
  useCheckFeature: jest.fn(),
}));

// Isolate from the charting lib.
jest.mock(
  '@/screens/profile/HandicapHistoryScreen/components/HandicapTrendChart',
  () => ({ HandicapTrendChart: () => null }),
);

const mockUseCheckFeature = useCheckFeature as jest.MockedFunction<
  typeof useCheckFeature
>;

const allowedAccess: FeatureAccess = {
  allowed: true,
  upgradeRequired: false,
  currentValue: 0,
  limitValue: -1,
};

const lockedAccess: FeatureAccess = {
  allowed: false,
  reason: 'Handicap history requires Social',
  upgradeRequired: true,
  requiredTier: 'social',
  currentValue: 0,
  limitValue: 0,
};

function makeSummary(): HandicapSummary {
  return {
    handicapIndex: 12.4,
    totalRounds: 20,
    qualifyingRoundsCount: 8,
    rounds: [],
    combinablePairs: [],
    lastUpdated: null,
  } as unknown as HandicapSummary;
}

function setAccess(access: FeatureAccess) {
  mockUseCheckFeature.mockReturnValue(() => access);
}

describe('HandicapHomeSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useHomeUiStore.setState({ handicapUpsellDismissed: false });
  });

  it('renders the full handicap card when the feature is unlocked', () => {
    setAccess(allowedAccess);
    const { getByText, queryByText } = render(
      <HandicapHomeSection
        summary={makeSummary()}
        onPress={jest.fn()}
        onUpgradePress={jest.fn()}
      />,
    );
    expect(getByText('12.4')).toBeTruthy();
    expect(queryByText('Your in-app handicap — upgrade to unlock')).toBeNull();
  });

  it('renders the full card when unlocked even if previously dismissed', () => {
    setAccess(allowedAccess);
    useHomeUiStore.setState({ handicapUpsellDismissed: true });
    const { getByText } = render(
      <HandicapHomeSection
        summary={makeSummary()}
        onPress={jest.fn()}
        onUpgradePress={jest.fn()}
      />,
    );
    expect(getByText('12.4')).toBeTruthy();
  });

  it('renders the compact upsell row instead of the card when locked', () => {
    setAccess(lockedAccess);
    const { getByText, queryByText } = render(
      <HandicapHomeSection
        summary={makeSummary()}
        onPress={jest.fn()}
        onUpgradePress={jest.fn()}
      />,
    );
    expect(getByText('Your in-app handicap — upgrade to unlock')).toBeTruthy();
    expect(getByText('Social')).toBeTruthy();
    expect(queryByText('12.4')).toBeNull();
  });

  it('renders nothing when locked and the user has dismissed the row', () => {
    setAccess(lockedAccess);
    useHomeUiStore.setState({ handicapUpsellDismissed: true });
    const { toJSON } = render(
      <HandicapHomeSection
        summary={makeSummary()}
        onPress={jest.fn()}
        onUpgradePress={jest.fn()}
      />,
    );
    expect(toJSON()).toBeNull();
  });

  it('persists the dismissal when the row is closed', () => {
    setAccess(lockedAccess);
    const { getByLabelText, queryByText } = render(
      <HandicapHomeSection
        summary={makeSummary()}
        onPress={jest.fn()}
        onUpgradePress={jest.fn()}
      />,
    );
    fireEvent.press(getByLabelText('Hide Social Handicap'));
    expect(useHomeUiStore.getState().handicapUpsellDismissed).toBe(true);
    expect(queryByText('Your in-app handicap — upgrade to unlock')).toBeNull();
  });
});
