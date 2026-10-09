/**
 * EndRoundEarlySheet — presentational confirmation for ending a social round early.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { EndRoundEarlySheet, type EndRoundEarlySheetProps } from './index';
import type { EndRoundEarlyPlan } from '@/utils/endRoundEarly';

// Render the BottomSheet as a passthrough (with its title) so children are queryable.
jest.mock('@/components/common/BottomSheet', () => {
  const { View, Text } = require('react-native');
  return {
    BottomSheet: ({
      visible,
      title,
      children,
    }: {
      visible: boolean;
      title?: string;
      children: React.ReactNode;
    }) =>
      visible ? (
        <View testID="bottom-sheet">
          <Text>{title}</Text>
          {children}
        </View>
      ) : null,
  };
});

function makePlan(overrides: Partial<EndRoundEarlyPlan> = {}): EndRoundEarlyPlan {
  return {
    holesPlayed: 6,
    plannedHoles: 18,
    nineType: 'full',
    lastHoleNumber: 6,
    removedScores: [],
    ...overrides,
  };
}

function renderSheet(overrides: Partial<EndRoundEarlySheetProps> = {}) {
  const props: EndRoundEarlySheetProps = {
    visible: true,
    plan: makePlan(),
    resultPreview: 'Dave wins 2 UP',
    loading: false,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
    ...overrides,
  };
  render(<EndRoundEarlySheet {...props} />);
  return props;
}

describe('EndRoundEarlySheet', () => {
  it('shows the title, the finishing hole, the result and the handicap line', () => {
    renderSheet();

    expect(screen.getByText('End round early')).toBeTruthy();
    expect(screen.getByText('End round after hole 6?')).toBeTruthy();
    expect(screen.getByText('Dave wins 2 UP')).toBeTruthy();
    expect(screen.getByText("This round won't count towards your handicap index.")).toBeTruthy();
    expect(screen.queryByText(/front-9/)).toBeNull();
    expect(screen.queryByText(/This is a handicap round/)).toBeNull();
  });

  it('a handicap round warns that ending early makes it a practice round (R22)', () => {
    renderSheet({ handicapRound: true });

    expect(
      screen.getByText(
        "This is a handicap round. Ending it early makes it a practice round, and it won't count towards your handicap index."
      )
    ).toBeTruthy();
    // It replaces the generic line rather than adding to it.
    expect(screen.queryByText("This round won't count towards your handicap index.")).toBeNull();
  });

  it('handicapRound={false} keeps the generic handicap line', () => {
    renderSheet({ handicapRound: false });

    expect(screen.getByText("This round won't count towards your handicap index.")).toBeTruthy();
    expect(screen.queryByText(/This is a handicap round/)).toBeNull();
  });

  it('a back-nine round ended after 6 asks about hole 15', () => {
    renderSheet({ plan: makePlan({ nineType: 'back9', plannedHoles: 9, lastHoleNumber: 15 }) });

    expect(screen.getByText('End round after hole 15?')).toBeTruthy();
  });

  it('lists the scores that will be removed', () => {
    renderSheet({
      plan: makePlan({
        removedScores: [
          { playerId: 'p2', playerName: 'Sam', holeNumber: 7 },
          { playerId: 'p1', playerName: 'Dave', holeNumber: 8 },
        ],
      }),
    });

    expect(screen.getByText('These scores will be removed:')).toBeTruthy();
    expect(screen.getByText('Sam – hole 7')).toBeTruthy();
    expect(screen.getByText('Dave – hole 8')).toBeTruthy();
  });

  it('omits the removed-scores section when nothing is removed', () => {
    renderSheet();
    expect(screen.queryByText('These scores will be removed:')).toBeNull();
  });

  it('uses display hole numbers on combo courses', () => {
    renderSheet({
      startHole: 10,
      plan: makePlan({ removedScores: [{ playerId: 'p2', playerName: 'Sam', holeNumber: 7 }] }),
    });

    expect(screen.getByText('End round after hole 15?')).toBeTruthy();
    expect(screen.getByText('Sam – hole 16')).toBeTruthy();
  });

  it('hides the result row when there is no preview', () => {
    renderSheet({ resultPreview: null });
    expect(screen.queryByText('Dave wins 2 UP')).toBeNull();
  });

  it('Keep playing cancels; End round confirms', () => {
    const props = renderSheet();

    fireEvent.press(screen.getByText('Keep playing'));
    expect(props.onCancel).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText('End round'));
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables both actions and shows progress while ending', () => {
    const props = renderSheet({ loading: true });

    expect(screen.getByText('Ending…')).toBeTruthy();
    fireEvent.press(screen.getByTestId('end-round-early-confirm'));
    fireEvent.press(screen.getByTestId('end-round-early-cancel'));
    expect(props.onConfirm).not.toHaveBeenCalled();
    expect(props.onCancel).not.toHaveBeenCalled();
  });

  it('renders nothing without a plan', () => {
    renderSheet({ plan: null });
    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });
});
