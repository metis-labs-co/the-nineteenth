import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { CompetitionNotificationSettings } from './CompetitionNotificationSettings';

describe('CompetitionNotificationSettings', () => {
  it('optimistically updates and persists a toggle', async () => {
    let resolveUpdate: (() => void) | undefined;
    const onUpdate = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveUpdate = resolve;
        })
    );
    render(
      <CompetitionNotificationSettings
        round_reminders_enabled
        results_summary_enabled
        onUpdate={onUpdate}
        onError={jest.fn()}
      />
    );

    fireEvent.press(screen.getByTestId('competition-notification-round-reminders'));

    expect(
      screen.getByTestId('competition-notification-round-reminders').props
        .accessibilityState
    ).toEqual({ checked: false, disabled: true });
    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith('round_reminders_enabled', false)
    );
    await act(async () => resolveUpdate?.());
    expect(
      screen.getByTestId('competition-notification-round-reminders').props
        .accessibilityState
    ).toEqual({ checked: false, disabled: false });
  });

  it('rolls back and reports a failed update', async () => {
    const onError = jest.fn();
    render(
      <CompetitionNotificationSettings
        round_reminders_enabled
        results_summary_enabled
        onUpdate={jest.fn().mockRejectedValue(new Error('offline'))}
        onError={onError}
      />
    );

    fireEvent.press(screen.getByTestId('competition-notification-results-summary'));

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        'Could not update results summary. Please try again.'
      )
    );
    expect(
      screen.getByTestId('competition-notification-results-summary').props
        .accessibilityState
    ).toEqual({ checked: true, disabled: false });
  });

  it('keeps the other toggle interactive while one update is pending', async () => {
    const resolvers: (() => void)[] = [];
    const onUpdate = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolvers.push(resolve);
        })
    );
    render(
      <CompetitionNotificationSettings
        round_reminders_enabled
        results_summary_enabled
        onUpdate={onUpdate}
        onError={jest.fn()}
      />
    );

    fireEvent.press(screen.getByTestId('competition-notification-round-reminders'));
    fireEvent.press(screen.getByTestId('competition-notification-results-summary'));
    expect(onUpdate).toHaveBeenCalledTimes(2);
    expect(onUpdate).toHaveBeenNthCalledWith(1, 'round_reminders_enabled', false);
    expect(onUpdate).toHaveBeenNthCalledWith(2, 'results_summary_enabled', false);

    await act(async () => resolvers.forEach((resolve) => resolve()));
  });

  it('blocks a second write to the same toggle while it is pending', async () => {
    let resolveUpdate: (() => void) | undefined;
    const onUpdate = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveUpdate = resolve;
        })
    );
    render(
      <CompetitionNotificationSettings
        round_reminders_enabled
        results_summary_enabled
        onUpdate={onUpdate}
        onError={jest.fn()}
      />
    );

    const toggle = screen.getByTestId('competition-notification-round-reminders');
    fireEvent.press(toggle);
    fireEvent.press(toggle);
    expect(onUpdate).toHaveBeenCalledTimes(1);

    await act(async () => resolveUpdate?.());
  });
});
