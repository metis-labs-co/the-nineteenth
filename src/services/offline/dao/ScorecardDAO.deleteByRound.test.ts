import { deleteScorecardsByRound } from './ScorecardDAO';
import { TABLE_NAMES } from '../schema/tables';

const mockRunAsync = jest.fn();
const mockGetAllAsync = jest.fn();

jest.mock('../DatabaseManager', () => ({
  getDb: jest.fn(() => Promise.resolve({ runAsync: mockRunAsync, getAllAsync: mockGetAllAsync })),
  isValidUUID: jest.fn(() => true),
}));

describe('deleteScorecardsByRound pending syncs', () => {
  it('removes scorecard and round-level queue items for the round only', async () => {
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
    const sql = `DELETE FROM ${TABLE_NAMES.PENDING_SYNCS} WHERE id = ?`;
    expect(mockRunAsync).toHaveBeenCalledWith(sql, [1]);
    expect(mockRunAsync).toHaveBeenCalledWith(sql, [2]);
    expect(mockRunAsync).not.toHaveBeenCalledWith(sql, [3]);
  });
});
