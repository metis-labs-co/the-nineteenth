import { pullOnOpenIfSocial } from '@/hooks/scorecard/pullOnOpenIfSocial';
import { useScorecardStore } from '@/store/scorecardStore';
import { resetFailedSyncsForRound } from '@/services/offline/database';
import { manualSync, retryFailedSyncs } from '@/services/offline/sync';

jest.mock('@/services/offline/database', () => ({
  ...jest.requireActual('@/services/offline/database'),
  resetFailedSyncsForRound: jest.fn(() => Promise.resolve(0)),
}));
jest.mock('@/services/offline/sync', () => ({
  ...jest.requireActual('@/services/offline/sync'),
  manualSync: jest.fn(() => Promise.resolve(true)),
  retryFailedSyncs: jest.fn(() => Promise.resolve(true)),
}));

describe('pullOnOpenIfSocial', () => {
  const pull = jest.fn(() => Promise.resolve([]));
  beforeEach(() => {
    pull.mockClear();
    (resetFailedSyncsForRound as jest.Mock).mockClear().mockResolvedValue(0);
    (manualSync as jest.Mock).mockClear();
    (retryFailedSyncs as jest.Mock).mockClear();
    useScorecardStore.setState({ pullServerScorecards: pull, currentRoundId: 'r-1' } as never);
  });

  it('pulls and reports handled in a social round', async () => {
    useScorecardStore.setState({ scoringMode: 'social' } as never);
    await expect(pullOnOpenIfSocial()).resolves.toBe(true);
    expect(pull).toHaveBeenCalledTimes(1);
  });

  it('leaves standard rounds to the existing hydrate', async () => {
    useScorecardStore.setState({ scoringMode: 'standard' } as never);
    await expect(pullOnOpenIfSocial()).resolves.toBe(false);
    expect(pull).not.toHaveBeenCalled();
    expect(resetFailedSyncsForRound).not.toHaveBeenCalled();
    expect(manualSync).not.toHaveBeenCalled();
  });

  it('never throws when the pull fails (opening offline)', async () => {
    useScorecardStore.setState({ scoringMode: 'social' } as never);
    pull.mockRejectedValueOnce(new Error('offline'));
    await expect(pullOnOpenIfSocial()).resolves.toBe(true);
    expect(resetFailedSyncsForRound).not.toHaveBeenCalled();
    expect(manualSync).not.toHaveBeenCalled();
  });

  it('after a successful pull, re-queues only this round\'s retained failures and drains normally', async () => {
    useScorecardStore.setState({ scoringMode: 'social' } as never);
    (resetFailedSyncsForRound as jest.Mock).mockResolvedValue(2);
    await pullOnOpenIfSocial();
    expect(resetFailedSyncsForRound).toHaveBeenCalledWith('r-1');
    expect(manualSync).toHaveBeenCalledTimes(1);
    expect(retryFailedSyncs).not.toHaveBeenCalled(); // device-wide + adopt mode: never here
  });

  it('skips the drain when the round had nothing retained', async () => {
    useScorecardStore.setState({ scoringMode: 'social' } as never);
    await pullOnOpenIfSocial();
    expect(resetFailedSyncsForRound).toHaveBeenCalledWith('r-1');
    expect(manualSync).not.toHaveBeenCalled();
  });

  it('never throws when re-queueing fails', async () => {
    useScorecardStore.setState({ scoringMode: 'social' } as never);
    (resetFailedSyncsForRound as jest.Mock).mockRejectedValue(new Error('db'));
    await expect(pullOnOpenIfSocial()).resolves.toBe(true);
  });
});
