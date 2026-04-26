import { parseShotContributions } from './HoleScoreDAO';

describe('parseShotContributions', () => {
  it('maps the legacy `drive` key to `teeShot` for old offline rows', () => {
    const raw = JSON.stringify({ drive: 'player-1', putt: 'player-2' });
    const parsed = parseShotContributions(raw);

    expect(parsed.teeShot).toBe('player-1');
    expect(parsed.putt).toBe('player-2');
    expect((parsed as { drive?: string }).drive).toBeUndefined();
  });

  it('does not overwrite an existing teeShot when both keys are present', () => {
    const raw = JSON.stringify({
      drive: 'legacy-player',
      teeShot: 'new-player',
    });
    const parsed = parseShotContributions(raw);

    expect(parsed.teeShot).toBe('new-player');
    expect((parsed as { drive?: string }).drive).toBeUndefined();
  });

  it('passes through new-shape contributions unchanged', () => {
    const raw = JSON.stringify({
      teeShot: 'p1',
      secondShot: 'p2',
      approach: 'p3',
      putt: 'p4',
    });
    const parsed = parseShotContributions(raw);

    expect(parsed).toEqual({
      teeShot: 'p1',
      secondShot: 'p2',
      approach: 'p3',
      putt: 'p4',
    });
  });
});
