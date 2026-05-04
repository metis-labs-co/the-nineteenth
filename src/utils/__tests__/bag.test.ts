import { diffBag, ensurePutter, isBagFull, toggleClub } from '../bag';
import { MAX_BAG_SIZE, PUTTER_KEY, type ClubKey } from '@/constants/clubs';

describe('diffBag', () => {
  it('returns empty diff for equal bags', () => {
    const a: ClubKey[] = ['driver', 'putter', '7-iron'];
    expect(diffBag(a, a)).toEqual({ adds: [], removes: [] });
  });

  it('detects added clubs', () => {
    const prev: ClubKey[] = ['putter'];
    const next: ClubKey[] = ['putter', 'driver', '7-iron'];
    expect(diffBag(prev, next)).toEqual({ adds: ['driver', '7-iron'], removes: [] });
  });

  it('detects removed clubs', () => {
    const prev: ClubKey[] = ['putter', 'driver', '7-iron'];
    const next: ClubKey[] = ['putter'];
    expect(diffBag(prev, next)).toEqual({ adds: [], removes: ['driver', '7-iron'] });
  });

  it('detects simultaneous add + remove', () => {
    const prev: ClubKey[] = ['putter', 'driver'];
    const next: ClubKey[] = ['putter', '3-wood'];
    expect(diffBag(prev, next)).toEqual({ adds: ['3-wood'], removes: ['driver'] });
  });
});

describe('ensurePutter', () => {
  it('adds putter when missing', () => {
    expect(ensurePutter(['driver', '7-iron'])).toEqual(['putter', 'driver', '7-iron']);
  });

  it('is idempotent when putter is present', () => {
    const input: ClubKey[] = ['putter', 'driver'];
    expect(ensurePutter(input)).toEqual(['putter', 'driver']);
  });

  it('handles empty input', () => {
    expect(ensurePutter([])).toEqual(['putter']);
  });
});

describe('isBagFull', () => {
  it('returns false below the cap', () => {
    expect(isBagFull(Array(MAX_BAG_SIZE - 1).fill('driver') as ClubKey[])).toBe(false);
  });

  it('returns true at the cap', () => {
    expect(isBagFull(Array(MAX_BAG_SIZE).fill('driver') as ClubKey[])).toBe(true);
  });

  it('returns true above the cap (defensive)', () => {
    expect(isBagFull(Array(MAX_BAG_SIZE + 1).fill('driver') as ClubKey[])).toBe(true);
  });
});

describe('toggleClub', () => {
  it('adds a club not yet in the bag', () => {
    expect(toggleClub(['putter'], 'driver')).toEqual(['putter', 'driver']);
  });

  it('removes a club already in the bag', () => {
    expect(toggleClub(['putter', 'driver'], 'driver')).toEqual(['putter']);
  });

  it('refuses to remove the putter', () => {
    expect(toggleClub(['putter', 'driver'], PUTTER_KEY)).toEqual(['putter', 'driver']);
  });

  it('refuses to add when bag is full', () => {
    const full = Array(MAX_BAG_SIZE).fill('driver') as ClubKey[];
    // Use a club key not in the full set so we test the "add" branch hitting the cap.
    expect(toggleClub(full, '7-iron')).toEqual(full);
  });

  it('still removes when bag is at the cap', () => {
    // Build a 14-club bag with unique keys (matches real player_bag PK constraint).
    const full: ClubKey[] = [
      'putter',
      'driver',
      '3-wood',
      '5-wood',
      '4-hybrid',
      '5-iron',
      '6-iron',
      '7-iron',
      '8-iron',
      '9-iron',
      'pitching-wedge',
      'gap-wedge',
      'sand-wedge',
      'lob-wedge',
    ];
    expect(full.length).toBe(MAX_BAG_SIZE);
    const result = toggleClub(full, 'driver');
    expect(result).toHaveLength(MAX_BAG_SIZE - 1);
    expect(result).not.toContain('driver');
  });
});
