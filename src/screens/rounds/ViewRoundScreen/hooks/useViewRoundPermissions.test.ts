import { renderHook } from '@testing-library/react-native';
import type { User } from '@supabase/supabase-js';
import type { RoundWithCourse, ScorecardWithPlayer, RoundPlayer } from '@/hooks/useRoundDetails';
import { useViewRoundPermissions } from './useViewRoundPermissions';

const USER_ID = 'user-1';
const user = { id: USER_ID } as User;

// Minimal round factory — only the fields the hook reads matter.
function makeRound(overrides: Partial<RoundWithCourse> = {}): RoundWithCourse {
  return {
    id: 'round-1',
    user_id: USER_ID,
    competition_id: null,
    status: 'upcoming',
    nine_type: 'full',
    course: { id: 'course-1', name: 'Pebble Beach' },
    ...overrides,
  } as unknown as RoundWithCourse;
}

const playingRoster: RoundPlayer[] = [{ id: USER_ID } as RoundPlayer];

function setup(round: RoundWithCourse | undefined) {
  return renderHook(() =>
    useViewRoundPermissions({
      user,
      round,
      scorecards: [] as ScorecardWithPlayer[],
      roundPlayers: playingRoster,
      competitionInfo: null,
      isStandalone: round?.competition_id == null,
    })
  );
}

describe('useViewRoundPermissions — roundReadyToScore', () => {
  it('is true when a course has been selected', () => {
    const { result } = setup(makeRound({ course: { id: 'c1', name: 'Course' } as RoundWithCourse['course'] }));
    expect(result.current.roundReadyToScore).toBe(true);
  });

  it('is false when the course is still TBD (no course selected)', () => {
    const { result } = setup(makeRound({ course: null }));
    expect(result.current.roundReadyToScore).toBe(false);
  });

  it('is false when the round is undefined', () => {
    const { result } = setup(undefined);
    expect(result.current.roundReadyToScore).toBe(false);
  });
});
