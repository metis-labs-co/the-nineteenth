import { saveScoreEntry, saveScoreEntries } from '@/services/scoreMismatch/entries';
import { fromTable } from '@/services/scoreMismatch/types';
jest.mock('@/services/scoreMismatch/types', () => ({ fromTable: jest.fn() }));
const entry = {
  roundId: 'round',
  playerId: 'player',
  holeNumber: 10,
  scorerId: 'scorer',
  score: { strokes: 5 },
};
function respond(error: unknown) {
  const response = { error, data: null };
  const builder = {
    upsert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn(async () => response),
    then: (resolve: (value: unknown) => void) => resolve(response),
  };
  (fromTable as jest.Mock).mockReturnValue(builder);
}
it.each([
  'round_shape_changed',
  'round_score_out_of_play',
  'round_scoring_busy',
  'invalid_round_shape',
])('preserves %s through single and batch entry writers', async (hint) => {
  respond({ code: '22023', hint, message: 'guard refused' });
  await expect(
    saveScoreEntry(entry.roundId, entry.playerId, entry.holeNumber, entry.scorerId, entry.score)
  ).rejects.toMatchObject({ sqlCode: '22023', sqlHint: hint, roundId: 'round' });
  await expect(saveScoreEntries([entry])).rejects.toMatchObject({
    sqlCode: '22023',
    sqlHint: hint,
    roundId: 'round',
  });
});
it('keeps ordinary unrelated database errors under the existing entry failure contract', async () => {
  respond({ code: '42501', message: 'ordinary denied entry' });
  await expect(saveScoreEntries([entry])).rejects.toMatchObject({ code: 'DATABASE' });
});
