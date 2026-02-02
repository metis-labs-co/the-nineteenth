/**
 * Wolf Components
 *
 * Components for the Wolf strategic partner selection side-game.
 * Wolf is a gambling game where a rotating "Wolf" player chooses to
 * partner with another player or go alone against the pack.
 */

// Configuration
export { WolfConfigBottomSheet } from './WolfConfigBottomSheet';
export type { WolfConfigBottomSheetProps } from './WolfConfigBottomSheet';

// Disclaimer
export {
  WolfDisclaimerModal,
  hasAcceptedWolfDisclaimer,
  clearWolfDisclaimerAcceptance,
} from './WolfDisclaimerModal';
export type { WolfDisclaimerModalProps } from './WolfDisclaimerModal';

// Section (for Add/Edit Round screens)
export { WolfSection, WOLF_COLOR } from './WolfSection';
export type { WolfSectionProps, WolfEditState } from './WolfSection';

// Indicator (for scorecard header)
export { WolfIndicator } from './WolfIndicator';
export type { WolfIndicatorProps } from './WolfIndicator';

// Decision Modal (for partner selection during play)
export { WolfDecisionModal } from './WolfDecisionModal';
export type { WolfDecisionModalProps } from './WolfDecisionModal';

// Decision Prompt (for scorecard content)
export { WolfDecisionPrompt } from './WolfDecisionPrompt';
export type { WolfDecisionPromptProps } from './WolfDecisionPrompt';

// Results Card (for ViewRoundScreen)
export { WolfResultsCard } from './WolfResultsCard';
export type { WolfResultsCardProps } from './WolfResultsCard';

// Standings Card (for ViewRoundScreen)
export { WolfStandingsCard } from './WolfStandingsCard';
export type { WolfStandingsCardProps } from './WolfStandingsCard';

// Settlement Card (for ViewRoundScreen - pot enabled only)
export { WolfSettlementCard } from './WolfSettlementCard';
export type { WolfSettlementCardProps } from './WolfSettlementCard';
