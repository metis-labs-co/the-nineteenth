import { summarizeInvitations, startBlockReason } from '@/utils/invitationSummary';

const p = (id: string, status: 'pending' | 'accepted' | 'declined') => ({
  player_id: id,
  invitation_status: status,
});

describe('summarizeInvitations', () => {
  it('counts by status', () => {
    expect(
      summarizeInvitations([p('a', 'accepted'), p('b', 'pending'), p('c', 'declined'), p('d', 'pending')])
    ).toEqual({ accepted: 1, pending: 2, declined: 1, activeCount: 3 });
  });
});

describe('startBlockReason', () => {
  it('allows start when accepted players satisfy the preset minimum', () => {
    expect(startBlockReason('individual_stableford', [p('a', 'accepted')])).toBeNull();
  });

  it('blocks start when kept players fall below the minimum', () => {
    expect(startBlockReason('team_match_play', [p('a', 'accepted'), p('b', 'accepted'), p('c', 'declined'), p('d', 'declined')]))
      .toBe('Team Match Play needs at least 4 players — add 2 more');
  });

  it('counts pending players toward the requirement (keep-or-drop resolves them at start)', () => {
    expect(startBlockReason('team_match_play', [p('a', 'accepted'), p('b', 'accepted'), p('c', 'pending'), p('d', 'pending')]))
      .toBeNull();
  });
});
