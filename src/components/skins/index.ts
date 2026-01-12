/**
 * Skins Components
 *
 * Components for the skins gambling side-game feature.
 */

// Configuration
export { SkinsConfigBottomSheet } from './SkinsConfigBottomSheet';
export type { SkinsConfigBottomSheetProps } from './SkinsConfigBottomSheet';

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

// Section (for Add/Edit Round screens)
export { SkinsSection } from './SkinsSection';
export type { SkinsSectionProps, SkinsEditState, PoolSourceData } from './SkinsSection';

// Statistics & Leaderboards
export { SkinsStatsCard } from './SkinsStatsCard';
export type { SkinsStatsCardProps } from './SkinsStatsCard';

export { SkinsLeaderboard } from './SkinsLeaderboard';
export type { SkinsLeaderboardProps } from './SkinsLeaderboard';

export { SkinsGameHistoryList } from './SkinsGameHistoryList';
export type { SkinsGameHistoryListProps } from './SkinsGameHistoryList';
