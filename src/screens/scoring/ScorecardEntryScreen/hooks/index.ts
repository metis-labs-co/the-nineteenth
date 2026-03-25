/**
 * ScorecardEntryScreen Hooks - Barrel Export
 *
 * - `useScorecardDialogs` - Dialog/modal state management
 * - `useScorecardNavigation` - Hole navigation and leave confirmation
 * - `useScorecardSubmission` - Scorecard submission and deletion
 * - `useWolfIntegration` - Wolf game state, decisions, and result processing
 * - `useScoreHandlers` - Score entry, stats, multi-ball, and hole editing handlers
 */

export { useScorecardDialogs } from './useScorecardDialogs';
export type { UseScorecardDialogsReturn, ScorecardDialogState, ScorecardDialogActions } from './useScorecardDialogs';

export { useScorecardNavigation } from './useScorecardNavigation';
export type { UseScorecardNavigationParams, UseScorecardNavigationReturn } from './useScorecardNavigation';

export { useScorecardSubmission } from './useScorecardSubmission';
export type { UseScorecardSubmissionParams, UseScorecardSubmissionReturn } from './useScorecardSubmission';

export { useWolfIntegration } from './useWolfIntegration';
export type { UseWolfIntegrationReturn } from './useWolfIntegration';

export { useScoreHandlers } from './useScoreHandlers';
