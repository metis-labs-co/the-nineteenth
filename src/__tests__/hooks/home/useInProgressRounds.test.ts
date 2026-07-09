import {
  isTerminalScorecardStatus,
  shouldShowInProgressRound,
} from '@/hooks/home/useInProgressRounds';

describe('isTerminalScorecardStatus', () => {
  it('treats completed and confirmed as terminal', () => {
    expect(isTerminalScorecardStatus('completed')).toBe(true);
    expect(isTerminalScorecardStatus('confirmed')).toBe(true);
  });

  it('treats in-progress / not-started / nullish as non-terminal', () => {
    expect(isTerminalScorecardStatus('in-progress')).toBe(false);
    expect(isTerminalScorecardStatus('not-started')).toBe(false);
    expect(isTerminalScorecardStatus(null)).toBe(false);
    expect(isTerminalScorecardStatus(undefined)).toBe(false);
  });
});

describe('shouldShowInProgressRound', () => {
  const terminal = new Set<string>(['r-done']);

  it('hides a competition round the user has personally finished', () => {
    // The reported bug: organiser submitted their own group, round stays
    // in-progress waiting on others, but they have nothing left to score.
    const round = { id: 'r-done', competition_id: 'comp-1' };
    expect(shouldShowInProgressRound(round, terminal)).toBe(false);
  });

  it('keeps a competition round the user has NOT finished', () => {
    const round = { id: 'r-open', competition_id: 'comp-1' };
    expect(shouldShowInProgressRound(round, terminal)).toBe(true);
  });

  it('keeps a standalone round even when the user card is terminal', () => {
    // The owner scores the whole group from one device, so their own card
    // being terminal does not mean the round is finished.
    const round = { id: 'r-done', competition_id: null };
    expect(shouldShowInProgressRound(round, terminal)).toBe(true);
  });

  it('keeps a competition round when the user has no scorecard yet', () => {
    const round = { id: 'r-none', competition_id: 'comp-1' };
    expect(shouldShowInProgressRound(round, terminal)).toBe(true);
  });
});
