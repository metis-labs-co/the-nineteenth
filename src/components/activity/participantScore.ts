import type { FeedParticipant } from '@/hooks/activity';

/**
 * The score label shown for a participant on a round card / players sheet.
 * Stableford shows points; stroke-based games show gross (with net when set).
 * Returns null when the participant has no usable score.
 */
export function participantScoreLabel(p: FeedParticipant, gameType: string): string | null {
  if (gameType === 'stableford') {
    return p.total_points != null ? `${p.total_points} pts` : null;
  }
  if (p.total_gross != null && p.total_gross > 0) {
    return p.total_net != null && p.total_net > 0
      ? `${p.total_gross} (${p.total_net} net)`
      : `${p.total_gross}`;
  }
  return null;
}
