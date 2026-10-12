import { cancelPendingScorecardSync, debouncedQueueScorecardSync } from './scorecardSyncDebounce';

jest.mock('@/services/offline/sync', () => ({
  queueScorecardSync: jest.fn(), getIsOnline: jest.fn(() => false), manualSync: jest.fn(),
}));

describe('cancelPendingScorecardSync', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('cancels only the named card', () => {
    const a = jest.fn(() => undefined);
    const b = jest.fn(() => undefined);
    debouncedQueueScorecardSync('a', a);
    debouncedQueueScorecardSync('b', b);
    expect(cancelPendingScorecardSync('a')).toBe(true);
    jest.advanceTimersByTime(2500);
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });

  it('returns false when nothing is pending', () => {
    expect(cancelPendingScorecardSync('none')).toBe(false);
  });
});
