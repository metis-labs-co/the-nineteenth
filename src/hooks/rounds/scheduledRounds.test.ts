import { mapRowToScheduledRoundDetail } from './scheduledRounds';

describe('mapRowToScheduledRoundDetail', () => {
  it('maps embedded snake_case tee rows to the camelCase TeeBox shape', () => {
    // Raw row as PostgREST returns it: tees embedded from the normalized
    // `tees` table, whose men's-slope column is `slope` (NOT `slope_rating`).
    const raw = {
      id: 'round-1',
      user_id: 'owner-1',
      course_id: 'course-1',
      date: '2026-07-10',
      tee_time: '08:00:00',
      status: 'scheduled',
      game_type: 'stroke_play',
      nine_type: null,
      selected_tee: null,
      is_team_round: false,
      team_format: null,
      courses: {
        id: 'course-1',
        name: 'Cobram Barooga',
        holes: [],
        num_holes: 18,
        tees_from_table: [
          {
            id: 'tee-1',
            name: 'White',
            color: '#FFFFFF',
            slope: 128,
            course_rating: 71.2,
          },
        ],
      },
      round_players: [],
    };

    const result = mapRowToScheduledRoundDetail(raw);

    expect(result.course?.tees).toHaveLength(1);
    const tee = result.course!.tees![0];
    // The scoring wizard reads .slopeRating / .courseRating (TeeBox shape).
    expect(tee.slopeRating).toBe(128);
    expect(tee.courseRating).toBe(71.2);
    expect(tee.name).toBe('White');
  });

  it('returns null tees when the course has no tee-table rows', () => {
    const raw = {
      id: 'round-2',
      course_id: 'course-2',
      status: 'scheduled',
      game_type: 'stroke_play',
      courses: {
        id: 'course-2',
        name: 'Legacy Course',
        holes: [],
        num_holes: 18,
        tees_from_table: [],
      },
      round_players: [],
    };

    const result = mapRowToScheduledRoundDetail(raw);
    expect(result.course?.tees).toBeNull();
  });
});
