import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { RoundOptionsSheet } from './RoundOptionsSheet';
import type { RoundOptionRow } from './roundOptionsRows';

const rows: RoundOptionRow[] = [
  { key: 'holes', label: 'Holes', icon: 'flag-variant-outline', disabled: false },
  { key: 'players', label: 'Players', icon: 'account-multiple-outline', disabled: true, caption: 'Needs a connection' },
  { key: 'delete', label: 'Delete round', icon: 'trash-can-outline', disabled: false, destructive: true },
];

describe('RoundOptionsSheet', () => {
  it('renders rows with captions and selects enabled ones', () => {
    const onSelect = jest.fn();
    render(<RoundOptionsSheet visible onClose={jest.fn()} rows={rows} onSelect={onSelect} />);
    expect(screen.getByText('Needs a connection')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Holes'));
    expect(onSelect).toHaveBeenCalledWith('holes');
  });

  it('does not select disabled rows', () => {
    const onSelect = jest.fn();
    render(<RoundOptionsSheet visible onClose={jest.fn()} rows={rows} onSelect={onSelect} />);
    fireEvent.press(screen.getByLabelText('Players'));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
