/**
 * finalizeRoundStatus — completes a round only when it is genuinely finished.
 *
 * @see src/services/rounds/finalizeRoundStatus.ts
 */
import { finalizeRoundStatus } from '@/services/rounds/finalizeRoundStatus';
import { supabase } from '@/services/supabase/client';

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: jest.fn() },
}));

const ROUND_ID = 'round-aaaaaaaa-0000-0000-0000-000000000000';

type ScorecardRow = { status: string; player_id: string };
type PairingRow = { player_ids: string[] };
type SubMatchRow = { status: string };
type TableError = { message: string; code?: string };

interface MockOptions {
  roundStatus?: string;
  updatedRows?: { id: string; status: string }[];
  errors?: {
    rounds?: TableError;
    scorecards?: TableError;
    sub_matches?: TableError;
    pairings?: TableError;
    update?: TableError;
  };
}

/** Wire supabase.from() per table. Returns the `update` spy. */
function setupSupabaseMocks(
  scorecards: ScorecardRow[],
  pairings: PairingRow[],
  subMatches: SubMatchRow[] = [],
  {
    roundStatus = 'in-progress',
    updatedRows = [{ id: ROUND_ID, status: 'completed' }],
    errors = {},
  }: MockOptions = {}
): jest.Mock {
  const updateSpy = jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(
        errors.update ? { data: null, error: errors.update } : { data: updatedRows, error: null }
      ),
    }),
  });

  const listTable = (rows: unknown[], error?: TableError) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue(error ? { data: null, error } : { data: rows, error: null }),
    }),
  });

  (supabase.from as jest.Mock).mockImplementation((table: string) => {
    switch (table) {
      case 'scorecards':
        return listTable(scorecards, errors.scorecards);
      case 'pairings':
        return listTable(pairings, errors.pairings);
      case 'sub_matches':
        return listTable(subMatches, errors.sub_matches);
      case 'rounds':
      default:
        return {
          // Initial fetch: .select().eq().single()
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue(
                errors.rounds
                  ? { data: null, error: errors.rounds }
                  : {
                      data: {
                        id: ROUND_ID,
                        status: roundStatus,
                        user_id: 'user-11111111',
                        competition_id: 'comp-11111111',
                      },
                      error: null,
                    }
              ),
            }),
          }),
          // Status update: .update().eq().select()
          update: updateSpy,
        };
    }
  });

  return updateSpy;
}

function makeCards(statuses: string[]): ScorecardRow[] {
  return statuses.map((status, i) => ({ status, player_id: `player-${i + 1}` }));
}

function makePairings(playerCount: number): PairingRow[] {
  const group1 = Array.from({ length: playerCount / 2 }, (_, i) => `player-${i + 1}`);
  const group2 = Array.from({ length: playerCount / 2 }, (_, i) => `player-${i + 1 + playerCount / 2}`);
  return [{ player_ids: group1 }, { player_ids: group2 }];
}

describe('finalizeRoundStatus — completion gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does NOT flip the round to completed while a group is still in-progress', async () => {
    const scorecards = makeCards([
      'completed', 'completed', 'completed', 'completed',
      'in-progress', 'in-progress', 'in-progress', 'in-progress',
    ]);
    const updateSpy = setupSupabaseMocks(scorecards, makePairings(8));

    await finalizeRoundStatus(ROUND_ID);

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('flips the round to completed once every scorecard is terminal', async () => {
    const scorecards = makeCards([
      'completed', 'completed', 'completed', 'completed',
      'completed', 'completed', 'completed', 'completed',
    ]);
    const updateSpy = setupSupabaseMocks(scorecards, makePairings(8));

    await finalizeRoundStatus(ROUND_ID);

    expect(updateSpy).toHaveBeenCalledWith({ status: 'completed' });
  });

  it('flips a single-group round to completed when its only group submits', async () => {
    const scorecards = makeCards(['completed', 'completed', 'completed', 'completed']);
    const updateSpy = setupSupabaseMocks(scorecards, [
      { player_ids: ['player-1', 'player-2', 'player-3', 'player-4'] },
    ]);

    await finalizeRoundStatus(ROUND_ID);

    expect(updateSpy).toHaveBeenCalledWith({ status: 'completed' });
  });

  it('also accepts confirmed scorecards as terminal', async () => {
    const scorecards = makeCards(['confirmed', 'confirmed', 'completed', 'completed']);
    const updateSpy = setupSupabaseMocks(scorecards, [
      { player_ids: ['player-1', 'player-2', 'player-3', 'player-4'] },
    ]);

    await finalizeRoundStatus(ROUND_ID);

    expect(updateSpy).toHaveBeenCalledWith({ status: 'completed' });
  });

  it('does NOT complete a split round while a sub-match is still open', async () => {
    const updateSpy = setupSupabaseMocks(makeCards(['completed', 'completed']), [], [
      { status: 'completed' },
      { status: 'upcoming' },
    ]);

    await finalizeRoundStatus(ROUND_ID);

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('completes a split round once every sub-match is terminal', async () => {
    const updateSpy = setupSupabaseMocks(
      makeCards(['completed', 'completed', 'completed', 'completed']),
      [],
      [{ status: 'completed' }, { status: 'forfeited' }]
    );

    await finalizeRoundStatus(ROUND_ID);

    expect(updateSpy).toHaveBeenCalledWith({ status: 'completed' });
  });
});

describe('finalizeRoundStatus — errors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // An RLS refusal (0 rows — e.g. a competition player who isn't the
  // organiser) can never succeed on retry: report "not completed".
  it('resolves false (no throw) when the status update affects 0 rows', async () => {
    setupSupabaseMocks(makeCards(['completed', 'completed']), [{ player_ids: ['player-1', 'player-2'] }], [], {
      updatedRows: [],
    });

    await expect(finalizeRoundStatus(ROUND_ID)).resolves.toBe(false);
  });

  // A network blip must not read as "not complete" (that silently dropped
  // queued finalisations): every read error throws.
  it('rejects when the round read fails', async () => {
    const updateSpy = setupSupabaseMocks(makeCards(['completed']), [{ player_ids: ['player-1'] }], [], {
      errors: { rounds: { message: 'network down', code: '08006' } },
    });

    await expect(finalizeRoundStatus(ROUND_ID)).rejects.toThrow('Failed to read the round');
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('resolves false when the round no longer exists (or is not visible)', async () => {
    const updateSpy = setupSupabaseMocks(makeCards(['completed']), [{ player_ids: ['player-1'] }], [], {
      errors: { rounds: { message: 'no rows', code: 'PGRST116' } },
    });

    await expect(finalizeRoundStatus(ROUND_ID)).resolves.toBe(false);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('rejects when the scorecards read fails', async () => {
    setupSupabaseMocks([], [{ player_ids: ['player-1'] }], [], {
      errors: { scorecards: { message: 'network down' } },
    });

    await expect(finalizeRoundStatus(ROUND_ID)).rejects.toThrow('Failed to read scorecards');
  });

  it('rejects when the sub-matches read fails', async () => {
    setupSupabaseMocks(makeCards(['completed']), [{ player_ids: ['player-1'] }], [], {
      errors: { sub_matches: { message: 'network down' } },
    });

    await expect(finalizeRoundStatus(ROUND_ID)).rejects.toThrow('Failed to read sub-matches');
  });

  it('rejects when the pairings read fails', async () => {
    const updateSpy = setupSupabaseMocks(makeCards(['completed', 'completed']), [], [], {
      errors: { pairings: { message: 'network down' } },
    });

    await expect(finalizeRoundStatus(ROUND_ID)).rejects.toThrow('Failed to read pairings');
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('rejects when the status update itself fails', async () => {
    setupSupabaseMocks(makeCards(['completed', 'completed']), [{ player_ids: ['player-1', 'player-2'] }], [], {
      errors: { update: { message: 'timeout' } },
    });

    await expect(finalizeRoundStatus(ROUND_ID)).rejects.toEqual({ message: 'timeout' });
  });
});

describe('finalizeRoundStatus — result', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves true when it completes the round', async () => {
    setupSupabaseMocks(makeCards(['completed', 'completed']), [{ player_ids: ['player-1', 'player-2'] }]);

    await expect(finalizeRoundStatus(ROUND_ID)).resolves.toBe(true);
  });

  it('resolves false while a group is still in progress', async () => {
    setupSupabaseMocks(makeCards(['completed', 'completed', 'in-progress', 'in-progress']), makePairings(4));

    await expect(finalizeRoundStatus(ROUND_ID)).resolves.toBe(false);
  });

  it('resolves false while a split round still has an open sub-match', async () => {
    setupSupabaseMocks(makeCards(['completed', 'completed']), [], [{ status: 'completed' }, { status: 'upcoming' }]);

    await expect(finalizeRoundStatus(ROUND_ID)).resolves.toBe(false);
  });

  it('resolves true for a round that is already completed, without rewriting it', async () => {
    const updateSpy = setupSupabaseMocks(
      makeCards(['completed', 'in-progress']),
      [{ player_ids: ['player-1', 'player-2'] }],
      [],
      { roundStatus: 'completed' }
    );

    await expect(finalizeRoundStatus(ROUND_ID)).resolves.toBe(true);
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
