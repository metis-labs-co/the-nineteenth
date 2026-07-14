/**
 * Tests for getCompetitions — must return competitions the user ORGANIZES and
 * ones they've JOINED as an accepted player (audit bug #2). The previous
 * implementation returned organizer-only competitions.
 */

import { getCompetitions } from './competitions';

// Mock the supabase client with per-table chainable query builders.
// (jest.mock is hoisted above the import by babel-jest.)
jest.mock('@/services/supabase/client', () => ({
  supabase: { auth: { getUser: jest.fn() }, from: jest.fn() },
}));

const mockSupabase = require('@/services/supabase/client').supabase;

type Row = Record<string, unknown>;

function makeDbComp(overrides: Row = {}): Row {
  return {
    id: 'comp-1',
    name: 'Comp 1',
    description: null,
    start_date: '2026-07-01',
    end_date: null,
    handicap_system: 'whs',
    visibility: 'private',
    invite_code: 'ABC123',
    organizer_id: 'org-user',
    status: 'upcoming',
    team_mode: null,
    team_size: null,
    point_system: null,
    max_players: null,
    lock_at_capacity: true,
    organizer_is_player: true,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    deleted_at: null,
    ...overrides,
  };
}

/** Chainable query builder whose terminal `.is()` resolves to {data,error}. */
function queryBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, jest.Mock> = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    is: jest.fn(() => Promise.resolve(result)),
  };
  return builder;
}

function wireTables(opts: {
  organized?: { data: unknown; error: unknown };
  joined?: { data: unknown; error: unknown };
}) {
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'competitions') return queryBuilder(opts.organized ?? { data: [], error: null });
    if (table === 'competition_players') return queryBuilder(opts.joined ?? { data: [], error: null });
    return queryBuilder({ data: [], error: null });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'me' } } });
});

describe('getCompetitions', () => {
  it('returns an empty list when there is no authenticated user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    expect(await getCompetitions()).toEqual([]);
  });

  it('includes competitions the user has JOINED as an accepted player', async () => {
    wireTables({
      organized: { data: [], error: null },
      joined: { data: [{ competition: makeDbComp({ id: 'joined-1', name: 'Joined One' }) }], error: null },
    });

    const result = await getCompetitions();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'joined-1', name: 'Joined One' });
  });

  it('unions organizer + joined competitions', async () => {
    wireTables({
      organized: { data: [makeDbComp({ id: 'org-1', name: 'Organized' })], error: null },
      joined: { data: [{ competition: makeDbComp({ id: 'joined-1', name: 'Joined' }) }], error: null },
    });

    const ids = (await getCompetitions()).map((c) => c.id).sort();
    expect(ids).toEqual(['joined-1', 'org-1']);
  });

  it('de-duplicates a competition that appears as both organizer and player', async () => {
    wireTables({
      organized: { data: [makeDbComp({ id: 'dup', name: 'Dup' })], error: null },
      joined: { data: [{ competition: makeDbComp({ id: 'dup', name: 'Dup' }) }], error: null },
    });

    const result = await getCompetitions();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('dup');
  });

  it('tolerates null competition rows in the joined result', async () => {
    wireTables({
      organized: { data: [makeDbComp({ id: 'org-1' })], error: null },
      joined: { data: [{ competition: null }], error: null },
    });

    const result = await getCompetitions();
    expect(result.map((c) => c.id)).toEqual(['org-1']);
  });

  it('throws when the organizer query errors', async () => {
    wireTables({ organized: { data: null, error: { message: 'boom' } } });
    await expect(getCompetitions()).rejects.toThrow('Failed to fetch competitions: boom');
  });

  it('throws when the joined query errors', async () => {
    wireTables({
      organized: { data: [], error: null },
      joined: { data: null, error: { message: 'join boom' } },
    });
    await expect(getCompetitions()).rejects.toThrow('Failed to fetch competitions: join boom');
  });
});
