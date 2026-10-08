/**
 * requestSyncDrain — debounced, coalesced requests to drain the sync queue.
 *
 * @see src/services/offline/sync/drain.ts
 */
import {
  requestSyncDrain,
  registerSyncDrainHandler,
  SYNC_DRAIN_DEBOUNCE_MS,
  __resetSyncDrainForTests,
} from '@/services/offline/sync/drain';
import { getIsOnline, getIsSyncing } from '@/services/offline/sync/networkState';

jest.mock('@/services/offline/sync/networkState', () => ({
  getIsOnline: jest.fn(),
  getIsSyncing: jest.fn(),
}));

describe('requestSyncDrain', () => {
  let handler: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    __resetSyncDrainForTests();
    (getIsOnline as jest.Mock).mockReturnValue(true);
    (getIsSyncing as jest.Mock).mockReturnValue(false);
    handler = jest.fn().mockResolvedValue(true);
    registerSyncDrainHandler(handler);
  });

  afterEach(() => {
    __resetSyncDrainForTests();
    jest.useRealTimers();
  });

  it('runs one drain after the debounce, however many requests arrive', () => {
    requestSyncDrain('app-start');
    requestSyncDrain('round-finalize-queued');

    jest.advanceTimersByTime(SYNC_DRAIN_DEBOUNCE_MS - 1);
    expect(handler).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('drops requests made offline', () => {
    (getIsOnline as jest.Mock).mockReturnValue(false);

    requestSyncDrain('foreground');
    jest.advanceTimersByTime(SYNC_DRAIN_DEBOUNCE_MS);

    expect(handler).not.toHaveBeenCalled();
  });

  it('skips the drain when the connection drops before the debounce ends', () => {
    requestSyncDrain('foreground');
    (getIsOnline as jest.Mock).mockReturnValue(false);
    jest.advanceTimersByTime(SYNC_DRAIN_DEBOUNCE_MS);

    expect(handler).not.toHaveBeenCalled();
  });

  it('waits for a running drain to finish, then drains', () => {
    (getIsSyncing as jest.Mock).mockReturnValue(true);
    requestSyncDrain('round-finalize-queued');
    jest.advanceTimersByTime(SYNC_DRAIN_DEBOUNCE_MS);
    expect(handler).not.toHaveBeenCalled();

    (getIsSyncing as jest.Mock).mockReturnValue(false);
    jest.advanceTimersByTime(SYNC_DRAIN_DEBOUNCE_MS);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does nothing before the sync service has registered a handler', () => {
    __resetSyncDrainForTests();

    requestSyncDrain('app-start');

    expect(() => jest.advanceTimersByTime(SYNC_DRAIN_DEBOUNCE_MS)).not.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });

  it('logs, never throws, when the drain rejects', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    handler.mockRejectedValue(new Error('boom'));

    requestSyncDrain('foreground');
    jest.advanceTimersByTime(SYNC_DRAIN_DEBOUNCE_MS);
    await Promise.resolve();
    await Promise.resolve();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
