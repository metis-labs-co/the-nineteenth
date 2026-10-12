import { create18Holes } from '@/__tests__/utils/testFixtures';
import { findBackfillGaps, formatHoleRange, getStandaloneMaxPlayers, isRosterEditableFormat } from './roundRoster';

const base = { gameType: 'stableford' as const, teamFormat: null, hasSkins: false, hasWolf: false, scoringPairsEnabled: false, isMultiBall: false };
const s = (strokes: number) => ({ strokes });

describe('getStandaloneMaxPlayers', () => {
  it.each(['stableford', 'stroke', 'par'] as const)('is 4 for %s', (g) => {
    expect(getStandaloneMaxPlayers(g)).toBe(4);
  });
});

describe('isRosterEditableFormat', () => {
  it('allows plain individual formats', () => {
    expect(isRosterEditableFormat(base)).toBe(true);
    expect(isRosterEditableFormat({ ...base, gameType: 'stroke' })).toBe(true);
    expect(isRosterEditableFormat({ ...base, gameType: 'par' })).toBe(true);
  });
  it.each([
    ['match play', { gameType: 'match-play' as const }],
    ['team format', { teamFormat: 'best-ball' as const }],
    ['skins', { hasSkins: true }],
    ['wolf', { hasWolf: true }],
    ['scoring pairs', { scoringPairsEnabled: true }],
    ['multi-ball', { isMultiBall: true }],
  ])('blocks %s', (_label, override) => {
    expect(isRosterEditableFormat({ ...base, ...override })).toBe(false);
  });
});

describe('findBackfillGaps', () => {
  const players = [{ id: 'a', name: 'Sam' }, { id: 'b', name: 'Dave' }];
  it('reports holes a late joiner is missing up to the furthest scored hole', () => {
    const scorecards = new Map<string, { scores: Record<number, { strokes: number }> }>([
      ['a', { scores: { 1: s(4), 2: s(5), 3: s(4) } }],
      ['b', { scores: { 3: s(5) } }],
    ] as [string, { scores: Record<number, { strokes: number }> }][]);
    expect(findBackfillGaps({ holes: create18Holes(), nineType: 'full', players, scorecards: scorecards as any }))
      .toEqual([{ playerId: 'b', playerName: 'Dave', holes: [1, 2] }]);
  });
  it('is empty when everyone is level', () => {
    const scorecards = new Map<string, { scores: Record<number, { strokes: number }> }>([
      ['a', { scores: { 1: s(4) } }],
      ['b', { scores: { 1: s(4) } }],
    ] as [string, { scores: Record<number, { strokes: number }> }][]);
    expect(findBackfillGaps({ holes: create18Holes(), nineType: 'full', players, scorecards: scorecards as any })).toEqual([]);
  });
  it('treats a pickup as scored and respects back 9', () => {
    const scorecards = new Map<string, { scores: Record<number, { strokes: number }> }>([
      ['a', { scores: { 10: s(4), 11: s(10) } }],
      ['b', { scores: { 10: s(4) } }],
    ] as [string, { scores: Record<number, { strokes: number }> }][]);
    expect(findBackfillGaps({ holes: create18Holes(), nineType: 'back9', players, scorecards: scorecards as any }))
      .toEqual([{ playerId: 'b', playerName: 'Dave', holes: [11] }]);
  });
});

describe('formatHoleRange', () => {
  it('compresses runs', () => {
    expect(formatHoleRange([1, 2, 3, 5])).toBe('1–3, 5');
    expect(formatHoleRange([7])).toBe('7');
  });
});
