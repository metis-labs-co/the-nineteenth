import type { RoundWithCourse } from '@/components/competitions/detail/types';
import type { RoundItem } from '../types';

/**
 * Bridges the in-progress carousel's RoundWithCourse shape into the RoundItem
 * the delete flow (useRoundActions) expects. Only the fields the confirm
 * dialog and delete mutation read are meaningful.
 */
export function inProgressRoundToItem(round: RoundWithCourse): RoundItem {
  return {
    id: round.id,
    course: {
      id: round.course?.id ?? '',
      name: round.course?.name ?? 'Unknown Course',
    },
    competition: round.competition ?? undefined,
    status: round.status,
    gameType: round.game_type,
    isStandalone: !round.competition_id,
    roundNumber: round.round_number ?? 1,
    totalRounds: 1,
    holesCompleted: 0,
    totalHoles: 18,
  };
}
