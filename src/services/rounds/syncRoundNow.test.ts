import { syncRoundNow } from './syncRoundNow';
import { manualSync, queueScorecardSync } from '@/services/offline/sync';
import { hasUnsyncedScorecardsForRound } from '@/services/offline/database';
import { cancelPendingScorecardSync } from '@/store/scorecardSyncDebounce';

jest.mock('@/services/offline/sync', () => ({ manualSync: jest.fn(), queueScorecardSync: jest.fn() }));
jest.mock('@/services/offline/database', () => ({ hasUnsyncedScorecardsForRound: jest.fn() }));
jest.mock('@/store/scorecardSyncDebounce', () => ({ cancelPendingScorecardSync: jest.fn() }));
jest.mock('@/services/offline/roundPersistenceBarrier', () => ({
  captureRoundPersistenceSource: jest.fn(() => ({})),
  withRoundPersistence: (_s: unknown, work: (lease: unknown) => Promise<unknown>) => work('lease'),
}));

const card = { id: 'c1', roundId: 'r', status: 'in-progress' } as never;

it('re-queues pending cards, syncs and reports success', async () => {
  (cancelPendingScorecardSync as jest.Mock).mockReturnValue(true);
  (manualSync as jest.Mock).mockResolvedValue(true);
  (hasUnsyncedScorecardsForRound as jest.Mock).mockResolvedValue(false);
  await expect(syncRoundNow('r', [card])).resolves.toBe(true);
  expect(queueScorecardSync).toHaveBeenCalledWith(card, 'update', { lease: 'lease' });
});

it('reports false when the sync times out', async () => {
  (manualSync as jest.Mock).mockReturnValue(new Promise(() => undefined));
  (hasUnsyncedScorecardsForRound as jest.Mock).mockResolvedValue(true);
  await expect(syncRoundNow('r', [card], 10)).resolves.toBe(false);
});
