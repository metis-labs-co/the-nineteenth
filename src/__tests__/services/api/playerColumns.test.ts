/**
 * PUBLIC_PLAYER_COLUMNS is the only column list used to read other users'
 * players rows. It must never include a private column.
 */

import {
  PUBLIC_PLAYER_COLUMNS,
  PUBLIC_PLAYER_COLUMN_LIST,
} from '@/services/api/playerColumns';

const PRIVATE_COLUMNS = [
  'email',
  'phone',
  'golf_id',
  'country',
  'age_status',
  'age_source',
  'age_resolved_at',
  'push_enabled',
  'push_competition_updates',
  'push_friend_requests',
  'push_scorecard_updates',
  'push_league_updates',
];

describe('PUBLIC_PLAYER_COLUMNS', () => {
  it.each(PRIVATE_COLUMNS)('does not include private column %s', (column) => {
    expect(PUBLIC_PLAYER_COLUMN_LIST).not.toContain(column);
  });

  it('is not a wildcard select', () => {
    expect(PUBLIC_PLAYER_COLUMNS).not.toContain('*');
  });

  it('keeps the fields other players need for profiles and scoring', () => {
    expect(PUBLIC_PLAYER_COLUMN_LIST).toEqual(
      expect.arrayContaining(['id', 'name', 'photo_url', 'handicap', 'handicap_index', 'gender'])
    );
  });
});
