/**
 * RoundHeader — sync banner characterization tests
 *
 * The red "N score changes not uploaded" strip on every score-entry screen is
 * derived here. It used to be fed a device-wide failure count, so one
 * unrecoverable row retained from an earlier round raised the banner on every
 * subsequent scorecard — solo rounds and local-only rounds included. These
 * tests lock the derivation: what raises the banner, what it says, and which
 * scope each number carries.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RoundHeader } from '@/components/scorecard/RoundHeader';

jest.mock('@/context/ThemeContext', () => ({
  useIsDark: () => false,
  useThemeColors: () => ({
    primary: '#16a34a',
    white: '#ffffff',
    border: '#e5e7eb',
    surface: '#ffffff',
    surfaceVariant: '#f3f4f6',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    gray200: '#e5e7eb',
    gray300: '#d1d5db',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    warningDark: '#92400e',
    info: '#3b82f6',
    infoLight: '#dbeafe',
    infoDark: '#1e40af',
    error: '#dc2626',
    errorLight: '#fee2e2',
    errorDark: '#991b1b',
  }),
}));

// Header sub-widgets each do their own data fetching; they are irrelevant here.
jest.mock('@/components/scorecard/HoleHeader/DistanceToPin', () => ({
  DistanceToPin: () => null,
}));
jest.mock('@/components/skins', () => ({ SkinsIndicator: () => null }));
jest.mock('@/components/wolf', () => ({ WolfIndicator: () => null }));

const baseProps = {
  onBack: jest.fn(),
  roundId: 'round-1',
  currentHole: 1,
  isOnline: true,
  isSyncing: false,
  pendingSyncCount: 0,
  failedSyncCount: 0,
  syncError: null,
  onSyncPress: jest.fn(),
};

describe('RoundHeader sync banner', () => {
  it('shows no banner when online with nothing retained', () => {
    const { queryByText } = render(<RoundHeader {...baseProps} />);

    expect(queryByText(/not uploaded/)).toBeNull();
    expect(queryByText('Retry')).toBeNull();
    expect(queryByText(/Offline/)).toBeNull();
  });

  it('raises the error banner for failures belonging to this round', () => {
    const { getByText } = render(<RoundHeader {...baseProps} failedSyncCount={3} />);

    expect(getByText('3 score changes not uploaded')).toBeTruthy();
    expect(getByText('Retry')).toBeTruthy();
  });

  it('uses the singular form for a single retained failure', () => {
    const { getByText } = render(<RoundHeader {...baseProps} failedSyncCount={1} />);

    expect(getByText('1 score change not uploaded')).toBeTruthy();
  });

  it('stays silent when other rounds have failures but this one does not', () => {
    // The store hands this component a round-scoped count, so failures
    // retained elsewhere on the device simply never reach it.
    const { queryByText } = render(<RoundHeader {...baseProps} failedSyncCount={0} />);

    expect(queryByText(/not uploaded/)).toBeNull();
  });

  it('prefers an explicit sync error over the retained-failure wording', () => {
    const { getByText, queryByText } = render(
      <RoundHeader {...baseProps} failedSyncCount={2} syncError="Server unreachable" />
    );

    expect(getByText('Server unreachable')).toBeTruthy();
    expect(queryByText(/not uploaded/)).toBeNull();
  });

  it('reports queue depth — not retained failures — while offline', () => {
    const { getByText } = render(
      <RoundHeader {...baseProps} isOnline={false} pendingSyncCount={2} failedSyncCount={5} />
    );

    // pendingSyncCount is device-wide and failedSyncCount is round-scoped;
    // summing them would report a count spanning two different scopes.
    expect(getByText('Offline • 2 changes pending')).toBeTruthy();
  });

  it('lets offline win over retained failures', () => {
    const { getByText, queryByText } = render(
      <RoundHeader {...baseProps} isOnline={false} failedSyncCount={4} />
    );

    expect(getByText('Offline')).toBeTruthy();
    expect(queryByText(/not uploaded/)).toBeNull();
  });

  it('lets syncing win over retained failures', () => {
    const { getByText, queryByText } = render(
      <RoundHeader {...baseProps} isSyncing failedSyncCount={4} />
    );

    expect(getByText('Syncing changes...')).toBeTruthy();
    expect(queryByText('Retry')).toBeNull();
  });

  it('invokes onSyncPress from the Retry action', () => {
    const onSyncPress = jest.fn();
    const { getByText } = render(
      <RoundHeader {...baseProps} failedSyncCount={1} onSyncPress={onSyncPress} />
    );

    fireEvent.press(getByText('Retry'));

    expect(onSyncPress).toHaveBeenCalledTimes(1);
  });
});

describe('RoundHeader end-round-early action', () => {
  it('shows a ⋮ action labelled "End round early" when allowed', () => {
    const { getByLabelText } = render(
      <RoundHeader {...baseProps} canEndRoundEarly onEndRoundEarlyPress={jest.fn()} />
    );

    expect(getByLabelText('End round early')).toBeTruthy();
  });

  it('hides the action unless canEndRoundEarly is set', () => {
    const { queryByLabelText } = render(
      <RoundHeader {...baseProps} onEndRoundEarlyPress={jest.fn()} />
    );

    expect(queryByLabelText('End round early')).toBeNull();
  });

  it('opens the sheet directly when tapped (works offline too)', () => {
    const onEndRoundEarlyPress = jest.fn();
    const { getByLabelText } = render(
      <RoundHeader
        {...baseProps}
        isOnline={false}
        canEndRoundEarly
        onEndRoundEarlyPress={onEndRoundEarlyPress}
      />
    );

    fireEvent.press(getByLabelText('End round early'));

    expect(onEndRoundEarlyPress).toHaveBeenCalledTimes(1);
  });
});

describe('RoundHeader end action gating', () => {
  it('hides the action when no callback was supplied', () => {
    const { queryByLabelText } = render(<RoundHeader {...baseProps} canEndRoundEarly />);
    expect(queryByLabelText('End round early')).toBeNull();
  });

  it('keeps the tee action and sync retry available alongside the end action', () => {
    const onChangeTeesPress = jest.fn();
    const { getByLabelText, getByText } = render(
      <RoundHeader {...baseProps} courseName="Course" selectedTee={{ name: 'Blue', color: 'blue' }}
        canChangeTees onChangeTeesPress={onChangeTeesPress}
        canEndRoundEarly onEndRoundEarlyPress={jest.fn()} failedSyncCount={1} />
    );
    expect(getByLabelText('End round early')).toBeTruthy();
    fireEvent.press(getByLabelText('Change tees'));
    expect(onChangeTeesPress).toHaveBeenCalledTimes(1);
    expect(getByText('Retry')).toBeTruthy();
  });
});

describe('RoundHeader round options entry', () => {
  it('shows ⋮ and opens the menu when onMorePress is passed', () => {
    const onMorePress = jest.fn();
    const onEndRoundEarlyPress = jest.fn();
    const { getByLabelText } = render(
      <RoundHeader
        {...baseProps}
        onMorePress={onMorePress}
        canEndRoundEarly
        onEndRoundEarlyPress={onEndRoundEarlyPress}
      />
    );
    fireEvent.press(getByLabelText('Round options'));
    expect(onMorePress).toHaveBeenCalled();
    expect(onEndRoundEarlyPress).not.toHaveBeenCalled();
  });

  it('shows ⋮ for the menu even when end-early is unavailable', () => {
    const { getByLabelText } = render(
      <RoundHeader {...baseProps} onMorePress={jest.fn()} canEndRoundEarly={false} />
    );
    expect(getByLabelText('Round options')).toBeTruthy();
  });

  it('keeps the direct end-early ⋮ without onMorePress', () => {
    const onEndRoundEarlyPress = jest.fn();
    const { getByLabelText } = render(
      <RoundHeader {...baseProps} canEndRoundEarly onEndRoundEarlyPress={onEndRoundEarlyPress} />
    );
    fireEvent.press(getByLabelText('End round early'));
    expect(onEndRoundEarlyPress).toHaveBeenCalled();
  });
});
