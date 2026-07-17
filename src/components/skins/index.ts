/**
 * Skins Components
 *
 * Components for the skins gambling side-game feature.
 */

// Configuration
export { SkinsConfigBottomSheet } from './SkinsConfigBottomSheet';
export type { SkinsConfigBottomSheetProps } from './SkinsConfigBottomSheet';
export { SubMatchSkinsConfigSheet } from './SubMatchSkinsConfigSheet';
export type {
  SubMatchSkinsConfigSheetProps,
  SubMatchSkinsPlayer,
  SubMatchSkinsTeam,
} from './SubMatchSkinsConfigSheet';

// Disclaimer
export {
  SkinsDisclaimerModal,
  hasAcceptedSkinsDisclaimer,
  clearSkinsDisclaimerAcceptance,
} from './SkinsDisclaimerModal';
export type { SkinsDisclaimerModalProps } from './SkinsDisclaimerModal';

// Indicator
export { SkinsIndicator } from './SkinsIndicator';
export type { SkinsIndicatorProps } from './SkinsIndicator';

// Results
export { SkinsResultsCard } from './SkinsResultsCard';
export type { SkinsResultsCardProps } from './SkinsResultsCard';

// Settlement
export { SkinsSettlementCard } from './SkinsSettlementCard';
export type { SkinsSettlementCardProps } from './SkinsSettlementCard';

// Current standings (in-progress games)
export { SkinsCurrentStandingsCard } from './SkinsCurrentStandingsCard';
export type { SkinsCurrentStandingsCardProps } from './SkinsCurrentStandingsCard';

// Section (for Add/Edit Round screens)
export { SkinsSection } from './SkinsSection';
export type { SkinsSectionProps, SkinsEditState } from './SkinsSection';

// Statistics & Leaderboards
export { SkinsStatsCard } from './SkinsStatsCard';
export type { SkinsStatsCardProps } from './SkinsStatsCard';

export { SkinsLeaderboard } from './SkinsLeaderboard';
export type { SkinsLeaderboardProps } from './SkinsLeaderboard';

export { SkinsGameHistoryList } from './SkinsGameHistoryList';
export type { SkinsGameHistoryListProps } from './SkinsGameHistoryList';
