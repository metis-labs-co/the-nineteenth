import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { CompetitionHero } from './CompetitionHero';

describe('CompetitionHero', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-10T12:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('shows the upcoming countdown and competitor team', () => {
    render(
      <CompetitionHero
        status="upcoming"
        startDate="2025-01-15"
        isOrganizer={false}
        teamName="Wales"
      />
    );

    expect(screen.getByText('5d')).toBeTruthy();
    expect(screen.getByText('You’re playing for Wales')).toBeTruthy();
  });

  it('offers the active round to an organizer', () => {
    const onPrimaryAction = jest.fn();
    render(
      <CompetitionHero
        status="in-progress"
        startDate="2025-01-01"
        isOrganizer
        liveRoundName="Round 2 is live"
        onPrimaryAction={onPrimaryAction}
      />
    );

    fireEvent.press(screen.getByLabelText('Open active round'));
    expect(screen.getByText('Round 2 is live')).toBeTruthy();
    expect(onPrimaryAction).toHaveBeenCalledTimes(1);
  });

  it('links completed competitions to final results', () => {
    const onPrimaryAction = jest.fn();
    render(
      <CompetitionHero
        status="completed"
        startDate="2025-01-01"
        isOrganizer={false}
        onPrimaryAction={onPrimaryAction}
      />
    );

    expect(screen.getByText('Final results are ready')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('View results'));
    expect(onPrimaryAction).toHaveBeenCalledTimes(1);
  });
});
