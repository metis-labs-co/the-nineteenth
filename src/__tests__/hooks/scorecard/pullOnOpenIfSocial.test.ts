import { pullOnOpenIfSocial } from '@/hooks/scorecard/pullOnOpenIfSocial';
import { useScorecardStore } from '@/store/scorecardStore';

describe('pullOnOpenIfSocial', () => {
  const pull = jest.fn(() => Promise.resolve([]));
  beforeEach(() => {
    pull.mockClear();
    useScorecardStore.setState({ pullServerScorecards: pull } as never);
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
  });

  it('never throws when the pull fails (opening offline)', async () => {
    useScorecardStore.setState({ scoringMode: 'social' } as never);
    pull.mockRejectedValueOnce(new Error('offline'));
    await expect(pullOnOpenIfSocial()).resolves.toBe(true);
  });
});
