import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GameHistoryRow } from './GameHistoryRow';
import type { CombinedGameHistoryEntry } from '@/hooks/useGameResults';

const entry: CombinedGameHistoryEntry = {
  id: 'g1',
  gameType: 'wolf',
  roundId: 'r1',
  competitionId: 'c1',
  courseName: 'The Beach',
  competitionName: 'Winter Cup',
  date: '2026-10-01',
  netResult: 12.5,
  completedAt: '2026-10-01T10:00:00Z',
};

describe('GameHistoryRow', () => {
  it('passes the entry to onPress', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<GameHistoryRow entry={entry} onPress={onPress} />);
    fireEvent.press(getByRole('button', { name: /Wolf, The Beach.*Opens round/ }));
    expect(onPress).toHaveBeenCalledWith(entry);
  });

  it('is disabled without onPress', () => {
    const { getByRole } = render(<GameHistoryRow entry={entry} />);
    expect(getByRole('button').props.accessibilityState?.disabled).toBe(true);
  });
});
