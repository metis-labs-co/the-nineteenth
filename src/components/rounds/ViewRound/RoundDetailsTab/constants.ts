/**
 * Constants for RoundDetailsTab components
 */

import type { CompetitionType } from '@/types/database.types';

export { GAME_TYPE_LABELS } from '@/constants/statusConfig';

export const COMPETITION_TYPE_LABELS: Record<CompetitionType, string> = {
  knockout: 'Knockout',
  event: 'Event',
};
