/**
 * PointsBreakdownModal Component Tests
 *
 * Focus: the optional onRoundPress behaviour that makes each round row
 * tappable so the participant's scorecard for that round can be opened.
 */

import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import { PointsBreakdownModal } from './PointsBreakdownModal';
import type { RoundWithCourse } from '@/components/competitions/detail/types';

const rounds = [
  { id: 'round-1', round_number: 1, date: '2026-06-01', course: { name: 'Test Course' } },
] as unknown as RoundWithCourse[];

const roundPoints = [{ roundId: 'round-1', points: 8, position: 2 }];

function renderModal(props: Partial<React.ComponentProps<typeof PointsBreakdownModal>> = {}) {
  return render(
    <PointsBreakdownModal
      visible
      onClose={jest.fn()}
      participantName="Player 1"
      isTeam={false}
      totalPoints={8}
      position={2}
      roundsPlayed={1}
      roundPoints={roundPoints}
      rounds={rounds}
      {...props}
    />,
  );
}

describe('PointsBreakdownModal', () => {
  it('renders round rows as non-buttons when onRoundPress is not provided', () => {
    renderModal();
    expect(screen.getByText('Round 1')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Round 1,/ })).toBeNull();
  });

  it('calls onRoundPress with the round id when a round row is tapped', () => {
    const onRoundPress = jest.fn();
    renderModal({ onRoundPress });
    fireEvent.press(screen.getByLabelText(/Round 1,/));
    expect(onRoundPress).toHaveBeenCalledWith('round-1');
  });
});
