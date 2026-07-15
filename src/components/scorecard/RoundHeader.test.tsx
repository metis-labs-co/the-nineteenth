/**
 * RoundHeader characterization tests
 *
 * Locks the behavioural contract of the shared score-entry header BEFORE the
 * Score & Round visual redesign (see docs/plans/competition-detail-redesign.md
 * Part 2, S0): title fallback chain, change-tees online gating, offline-status
 * derivation, and the scoring-pairs banner. Purely behavioural — no styling
 * assertions, so a visual restyle must keep these green untouched.
 */

import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import { RoundHeader, type RoundHeaderProps } from './RoundHeader';
import type { TeeBox } from '@/types';

jest.mock('@/components/common', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    PageHeader: ({ title, subtitle, onBack, rightContent }: any) => (
      <View testID="page-header">
        <Text testID="page-header-title">{title}</Text>
        {subtitle ? <View testID="page-header-subtitle">{subtitle}</View> : null}
        {rightContent ? <View testID="page-header-right">{rightContent}</View> : null}
        <TouchableOpacity testID="page-header-back" onPress={onBack}>
          <Text>back</Text>
        </TouchableOpacity>
      </View>
    ),
    OfflineIndicator: ({ status, pendingSyncs }: any) => (
      <Text testID="offline-indicator">{`${status}:${pendingSyncs}`}</Text>
    ),
    ConfirmationDialog: () => null,
  };
});

jest.mock('@/components/skins', () => ({
  SkinsIndicator: () => null,
}));

jest.mock('@/components/wolf', () => ({
  WolfIndicator: () => null,
}));

jest.mock('@/components/scorecard/HoleHeader/DistanceToPin', () => ({
  DistanceToPin: () => {
    const { Text } = require('react-native');
    return <Text testID="distance-to-pin">dtp</Text>;
  },
}));

const whiteTee: TeeBox = {
  name: 'White',
  color: 'white',
} as TeeBox;

function makeProps(overrides: Partial<RoundHeaderProps> = {}): RoundHeaderProps {
  return {
    onBack: jest.fn(),
    roundId: 'round-1',
    currentHole: 5,
    isOnline: true,
    isSyncing: false,
    pendingSyncCount: 0,
    onSyncPress: jest.fn(),
    ...overrides,
  };
}

describe('RoundHeader (characterization)', () => {
  describe('title fallback chain', () => {
    it('prefers the club name', () => {
      render(
        <RoundHeader
          {...makeProps({ clubName: 'Pennard GC', courseName: 'Links Course' })}
        />
      );
      expect(screen.getByTestId('page-header-title')).toHaveTextContent('Pennard GC');
    });

    it('falls back to the course name when there is no club', () => {
      render(<RoundHeader {...makeProps({ courseName: 'Links Course' })} />);
      expect(screen.getByTestId('page-header-title')).toHaveTextContent('Links Course');
    });

    it('falls back to titleFallback (default "Score Entry") when neither is set', () => {
      render(<RoundHeader {...makeProps()} />);
      expect(screen.getByTestId('page-header-title')).toHaveTextContent('Score Entry');
    });
  });

  describe('change-tees online gating', () => {
    const teeProps = {
      courseName: 'Links Course',
      selectedTee: whiteTee,
      canChangeTees: true,
    };

    it('calls onChangeTeesPress when online', () => {
      const onChangeTeesPress = jest.fn();
      const onChangeTeesBlockedOffline = jest.fn();
      render(
        <RoundHeader
          {...makeProps({
            ...teeProps,
            isOnline: true,
            onChangeTeesPress,
            onChangeTeesBlockedOffline,
          })}
        />
      );
      fireEvent.press(screen.getByTestId('round-header-change-tees'));
      expect(onChangeTeesPress).toHaveBeenCalledTimes(1);
      expect(onChangeTeesBlockedOffline).not.toHaveBeenCalled();
    });

    it('calls onChangeTeesBlockedOffline (not onChangeTeesPress) when offline', () => {
      const onChangeTeesPress = jest.fn();
      const onChangeTeesBlockedOffline = jest.fn();
      render(
        <RoundHeader
          {...makeProps({
            ...teeProps,
            isOnline: false,
            onChangeTeesPress,
            onChangeTeesBlockedOffline,
          })}
        />
      );
      fireEvent.press(screen.getByTestId('round-header-change-tees'));
      expect(onChangeTeesPress).not.toHaveBeenCalled();
      expect(onChangeTeesBlockedOffline).toHaveBeenCalledTimes(1);
    });

    it('renders no change-tees pressable when canChangeTees is false', () => {
      render(
        <RoundHeader
          {...makeProps({ courseName: 'Links Course', selectedTee: whiteTee })}
        />
      );
      expect(screen.queryByTestId('round-header-change-tees')).toBeNull();
    });
  });

  describe('offline status derivation', () => {
    it('derives "offline" when not online (even while syncing)', () => {
      render(<RoundHeader {...makeProps({ isOnline: false, isSyncing: true })} />);
      expect(screen.getByTestId('offline-indicator')).toHaveTextContent('offline:0');
    });

    it('derives "syncing" when online and syncing', () => {
      render(
        <RoundHeader
          {...makeProps({ isSyncing: true, pendingSyncCount: 2, failedSyncCount: 1 })}
        />
      );
      // pendingSyncs = pendingSyncCount + failedSyncCount
      expect(screen.getByTestId('offline-indicator')).toHaveTextContent('syncing:3');
    });

    it('derives "error" when online with failed syncs', () => {
      render(<RoundHeader {...makeProps({ failedSyncCount: 2 })} />);
      expect(screen.getByTestId('offline-indicator')).toHaveTextContent('error:2');
    });

    it('derives "error" when online with a sync error message', () => {
      render(<RoundHeader {...makeProps({ syncError: 'boom' })} />);
      expect(screen.getByTestId('offline-indicator')).toHaveTextContent('error:0');
    });

    it('derives "online" when connected with nothing pending', () => {
      render(<RoundHeader {...makeProps()} />);
      expect(screen.getByTestId('offline-indicator')).toHaveTextContent('online:0');
    });
  });

  describe('scoring-pairs banner', () => {
    it('lists the players being scored when enabled', () => {
      render(
        <RoundHeader
          {...makeProps({
            scoringPairsEnabled: true,
            playersToScore: [
              { id: 'p1', name: 'Alex' },
              { id: 'p2', name: 'Ravi' },
            ] as any,
          })}
        />
      );
      expect(screen.getByText(/Scoring for:/)).toBeTruthy();
      expect(screen.getByText(/Alex, Ravi/)).toBeTruthy();
    });

    it('renders no banner when disabled or empty', () => {
      render(<RoundHeader {...makeProps({ scoringPairsEnabled: true })} />);
      expect(screen.queryByText(/Scoring for:/)).toBeNull();
    });
  });

  describe('GPS distance badge', () => {
    it('renders DistanceToPin only when courseId is provided', () => {
      const { rerender } = render(<RoundHeader {...makeProps()} />);
      expect(screen.queryByTestId('distance-to-pin')).toBeNull();

      rerender(<RoundHeader {...makeProps({ courseId: 'course-1' })} />);
      expect(screen.getByTestId('distance-to-pin')).toBeTruthy();
    });
  });
});
