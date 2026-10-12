import { deleteRoundIntents, deleteScorecardsByRound } from './ScorecardDAO';
import { TABLE_NAMES } from '../schema/tables';

const mockRunAsync = jest.fn();
const mockGetAllAsync = jest.fn();

jest.mock('../DatabaseManager', () => ({
  getDb: jest.fn(() => Promise.resolve({ runAsync: mockRunAsync, getAllAsync: mockGetAllAsync })),
  isValidUUID: jest.fn(() => true),
}));

const deleteSql = `DELETE FROM ${TABLE_NAMES.PENDING_SYNCS} WHERE id = ?`;

beforeEach(() => jest.clearAllMocks());

describe('deleteScorecardsByRound pending syncs', () => {
  it('removes scorecard queue items for the round only, leaving round-level items', async () => {
    mockGetAllAsync.mockImplementation(async (sql: string) =>
      sql.includes(TABLE_NAMES.PENDING_SYNCS)
        ? [
            { id: 1, data: JSON.stringify({ roundId: 'r' }) },
            { id: 2, data: JSON.stringify({ id: 'r', action: 'end_early' }) },
            { id: 3, data: JSON.stringify({ roundId: 'other' }) },
          ]
        : []
    );
    await deleteScorecardsByRound('r');
    expect(mockRunAsync).toHaveBeenCalledWith(deleteSql, [1]);
    expect(mockRunAsync).not.toHaveBeenCalledWith(deleteSql, [2]);
    expect(mockRunAsync).not.toHaveBeenCalledWith(deleteSql, [3]);
  });
});

describe('deleteRoundIntents', () => {
  it("removes only 'round' queue items for this round", async () => {
    mockGetAllAsync.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (!sql.includes(TABLE_NAMES.PENDING_SYNCS)) return [];
      const rows = [
        { id: 1, type: 'round', data: JSON.stringify({ id: 'r', action: 'end_early' }) },
        { id: 2, type: 'round', data: JSON.stringify({ id: 'other' }) },
        { id: 3, type: 'scorecard', data: JSON.stringify({ id: 'r', roundId: 'r' }) },
        { id: 4, type: 'round', data: 'not json' },
      ];
      return sql.includes('type = ?') ? rows.filter((row) => row.type === params?.[0]) : rows;
    });
    await deleteRoundIntents('r');
    expect(mockRunAsync).toHaveBeenCalledTimes(1);
    expect(mockRunAsync).toHaveBeenCalledWith(deleteSql, [1]);
  });
});
