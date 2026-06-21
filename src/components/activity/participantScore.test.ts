import { participantScoreLabel } from './participantScore';
import type { FeedParticipant } from '@/hooks/activity';

function makeParticipant(overrides: Partial<FeedParticipant> = {}): FeedParticipant {
  return {
    player_id: 'p1',
    name: 'Alex',
    photo_url: null,
    total_gross: null,
    total_net: null,
    total_points: null,
    ...overrides,
  };
}

describe('participantScoreLabel', () => {
  it('returns points label for stableford', () => {
    expect(participantScoreLabel(makeParticipant({ total_points: 32 }), 'stableford')).toBe('32 pts');
  });

  it('returns null for stableford with no points', () => {
    expect(participantScoreLabel(makeParticipant({ total_points: null }), 'stableford')).toBeNull();
  });

  it('returns gross with net for stroke play when both present', () => {
    expect(
      participantScoreLabel(makeParticipant({ total_gross: 85, total_net: 72 }), 'stroke'),
    ).toBe('85 (72 net)');
  });

  it('returns gross only when net is missing', () => {
    expect(participantScoreLabel(makeParticipant({ total_gross: 85 }), 'stroke')).toBe('85');
  });

  it('returns null when gross is missing for stroke play', () => {
    expect(participantScoreLabel(makeParticipant({ total_gross: null }), 'stroke')).toBeNull();
  });
});
