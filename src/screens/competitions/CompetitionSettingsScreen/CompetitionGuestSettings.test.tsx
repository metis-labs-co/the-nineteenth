import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { CompetitionGuestSettings } from './CompetitionGuestSettings';

describe('CompetitionGuestSettings', () => {
  it('persists an optimistic toggle', async () => {
    const onUpdate = jest.fn().mockResolvedValue(undefined);
    render(
      <CompetitionGuestSettings allowGuests onUpdate={onUpdate} onError={jest.fn()} />
    );

    fireEvent.press(screen.getByTestId('competition-allow-guests'));

    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(false));
    expect(screen.getByTestId('competition-allow-guests').props.accessibilityState.checked)
      .toBe(false);
  });

  it('rolls back a failed update', async () => {
    const onError = jest.fn();
    render(
      <CompetitionGuestSettings
        allowGuests
        onUpdate={jest.fn().mockRejectedValue(new Error('offline'))}
        onError={onError}
      />
    );

    fireEvent.press(screen.getByTestId('competition-allow-guests'));

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        'Could not update guest access. Please try again.'
      )
    );
    expect(screen.getByTestId('competition-allow-guests').props.accessibilityState.checked)
      .toBe(true);
  });
});
