/**
 * EndedEarlyBanner — "Ended after N of M" (+ Finish on the scoring screens).
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { EndedEarlyBanner } from './EndedEarlyBanner';
import { StyleSheet } from 'react-native';
import { formatEndedEarlyLabel } from '@/utils/roundShape';

describe('EndedEarlyBanner', () => {
  it('reads "Ended after N of M" with M from the nine type', () => {
    render(<EndedEarlyBanner holesPlayed={6} nineType="back9" />);
    expect(screen.getByText('Ended after 6 of 9')).toBeTruthy();
  });

  it('an 18-hole round ended after 9 reads "Ended after 9 of 18"', () => {
    render(<EndedEarlyBanner holesPlayed={9} nineType="full" />);
    expect(screen.getByText('Ended after 9 of 18')).toBeTruthy();
  });

  it('shows Finish only when onFinish is given, and calls it', () => {
    const onFinish = jest.fn();
    render(<EndedEarlyBanner holesPlayed={6} nineType="full" onFinish={onFinish} />);

    fireEvent.press(screen.getByLabelText('Finish'));

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Resume/)).toBeNull();
    const style = StyleSheet.flatten(screen.getByRole('button', { name: 'Finish' }).props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
    expect(style.minWidth).toBeGreaterThanOrEqual(44);
  });

  it('has no Finish action without onFinish (finish screens)', () => {
    render(<EndedEarlyBanner holesPlayed={6} nineType="full" />);
    expect(screen.queryByLabelText('Finish')).toBeNull();
    expect(screen.queryByText(/Resume/)).toBeNull();
  });
});

describe('ended-round label characterization', () => {
  it('keeps the nominal full-round denominator even for a physical nine', () => {
    expect(formatEndedEarlyLabel(6, 'full')).toBe('Ended after 6 of 18');
    expect(formatEndedEarlyLabel(6, 'back9')).toBe('Ended after 6 of 9');
  });
});
