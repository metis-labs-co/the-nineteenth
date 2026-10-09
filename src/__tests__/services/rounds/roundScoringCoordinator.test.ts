import {
  withRoundScoringWrite,
  getRoundEndPrerequisite,
} from '@/services/rounds/roundScoringCoordinator';
import { getPendingSyncByEntityKey } from '@/services/offline/database';
jest.mock('@/services/offline/database', () => ({ getPendingSyncByEntityKey: jest.fn() }));
it('serializes one round while other rounds progress and releases after failure', async () => {
  let release!: () => void;
  const events: string[] = [];
  const first = withRoundScoringWrite('r', async () => {
    events.push('first');
    await new Promise<void>((r) => {
      release = r;
    });
    throw new Error('fail');
  });
  const outcome = expect(first).rejects.toThrow('fail');
  const second = withRoundScoringWrite('r', async () => {
    events.push('second');
    return 2;
  });
  await withRoundScoringWrite('other', async () => {
    events.push('other');
  });
  expect(events).toEqual(['first', 'other']);
  release();
  await outcome;
  await expect(second).resolves.toBe(2);
  expect(events).toEqual(['first', 'other', 'second']);
});
it('reads a live failed or foreign prerequisite on each lookup', async () => {
  (getPendingSyncByEntityKey as jest.Mock)
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce({ status: 'failed', data: { userId: 'foreign' } });
  await expect(getRoundEndPrerequisite('r')).resolves.toBeNull();
  await expect(getRoundEndPrerequisite('r')).resolves.toMatchObject({ status: 'failed' });
  expect(getPendingSyncByEntityKey).toHaveBeenLastCalledWith('round:r:end_early');
});
