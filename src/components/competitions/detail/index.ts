/**
 * Competition Detail Tab Components
 *
 * Reusable tab components for the CompetitionDetailScreen
 */

export { DetailsTab } from './DetailsTab';
export type { DetailsTabProps } from './DetailsTab';

export { RoundsTab } from './RoundsTab';
export type { RoundsTabProps } from './RoundsTab';

export { PlayersTab } from './PlayersTab';
export type { PlayersTabProps } from './PlayersTab';

export { TeamsTab } from './TeamsTab';
export type { TeamsTabProps } from './TeamsTab';

export { StatsTab } from './StatsTab';
export type { StatsTabProps } from './StatsTab';

export { PayoutsTab } from './PayoutsTab';
export type { PayoutsTabProps } from './PayoutsTab';

// Note: LeaderboardTab has been moved to @/components/leaderboard
export { LeaderboardTab } from '@/components/leaderboard';
export type { LeaderboardTabProps } from '@/components/leaderboard';

// Note: BracketTab lives in @/components/knockout
export { BracketTab } from '@/components/knockout';
export type { BracketTabProps } from '@/components/knockout';

// Re-export types
export type {
  RoundWithCourse,
  CompetitionPlayer,
  CompetitionData,
  RoundStatusConfig,
} from './types';

export {
  HANDICAP_SYSTEM_LABELS,
  GAME_TYPE_LABELS,
  getRoundStatusConfig,
} from './types';
