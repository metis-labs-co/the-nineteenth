import { fetchRoundScoringShape } from '@/services/rounds/roundScoringShape';
import { RoundScoringWriteError } from '@/services/rounds/roundScoringErrors';
import { supabase } from '@/services/supabase/client';
jest.mock('@/services/supabase/client', () => ({ supabase: { from: jest.fn() } }));
const chain = {
  select: jest.fn(),
  eq: jest.fn(),
  is: jest.fn(),
  abortSignal: jest.fn(),
  maybeSingle: jest.fn(),
};
beforeEach(() => {
  jest.clearAllMocks();
  (supabase.from as jest.Mock).mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.is.mockReturnValue(chain);
  chain.abortSignal.mockReturnValue(chain);
  chain.maybeSingle.mockResolvedValue({
    data: { nine_type: 'back9', holes_played: null },
    error: null,
  });
});
afterEach(() => jest.useRealTimers());
it('reads the visible nondeleted row and preserves real NULL', async () => {
  await expect(fetchRoundScoringShape('r')).resolves.toEqual({
    nine_type: 'back9',
    holes_played: null,
  });
  expect(chain.select).toHaveBeenCalledWith('nine_type, holes_played');
  expect(chain.eq).toHaveBeenCalledWith('id', 'r');
  expect(chain.is).toHaveBeenCalledWith('deleted_at', null);
});
it.each([
  null,
  {},
  { nine_type: 'bad', holes_played: null },
  { nine_type: 'full' },
  { nine_type: 'back9', holes_played: 9 },
])('missing/invalid row %j is unavailable, never default NULL', async (data) => {
  chain.maybeSingle.mockResolvedValue({ data, error: null });
  await expect(fetchRoundScoringShape('r')).rejects.toMatchObject({
    kind: 'unavailable',
    roundId: 'r',
  });
});
it('retains SQL metadata on a failed read', async () => {
  chain.maybeSingle.mockResolvedValue({
    data: null,
    error: { code: '42501', hint: 'denied', message: 'hidden' },
  });
  await expect(fetchRoundScoringShape('r')).rejects.toMatchObject({
    kind: 'unavailable',
    sqlCode: '42501',
    sqlHint: 'denied',
  });
});
it('bounds a request ignoring abort at eight seconds and cleans its timer', async () => {
  jest.useFakeTimers();
  chain.maybeSingle.mockReturnValue(new Promise(() => {}));
  const read = fetchRoundScoringShape('r');
  const assertion = expect(read).rejects.toMatchObject({ kind: 'unavailable' });
  await jest.advanceTimersByTimeAsync(8000);
  await assertion;
  expect(chain.abortSignal.mock.calls[0][0].aborted).toBe(true);
  expect(jest.getTimerCount()).toBe(0);
});
it('cleans a successful read deadline and keeps server/local failures distinct with LOCAL accepted ID', async () => {
  jest.useFakeTimers();
  await fetchRoundScoringShape('r');
  expect(jest.getTimerCount()).toBe(0);
  const error = new RoundScoringWriteError('shape_changed', 'r', 'changed', {
    sqlCode: '22023',
    sqlHint: 'round_shape_changed',
    acceptedWrite: { scorecardId: 'local-c', serverRevision: 4 },
  });
  expect(error).toMatchObject({
    kind: 'shape_changed',
    roundId: 'r',
    acceptedWrite: { scorecardId: 'local-c', serverRevision: 4 },
    sqlCode: '22023',
  });
});
