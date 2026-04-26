// src/components/teams/index.ts
export { TeamCard } from './TeamCard';
export type { TeamCardProps } from './TeamCard';

export { TeamBalanceIndicator } from './TeamBalanceIndicator';

export {
  calculateTeamHandicap,
  calculateHandicapSpread,
  getBalanceQuality,
  getInitials,
  areAllPlayersAssigned,
  swapPlayers,
} from './teamAlgorithms';
export type { BalanceQuality } from './teamAlgorithms';

export { EditTeamModal } from './EditTeamModal';
export type { EditTeamModalProps } from './EditTeamModal';

export { MoveToTeamSheet } from './MoveToTeamSheet';
export type { MoveToTeamSheetProps } from './MoveToTeamSheet';
