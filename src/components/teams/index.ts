// src/components/teams/index.ts
export { TeamCard } from './TeamCard';
export type { TeamCardProps } from './TeamCard';

export { TeamFormationUI } from './TeamFormationUI';
export type { TeamFormationUIProps } from './TeamFormationUI';

export { TeamFormationCard } from './TeamFormationCard';
export { TeamBalanceIndicator } from './TeamBalanceIndicator';
export { TeamFormationActions } from './TeamFormationActions';

export { useTeamFormation } from './useTeamFormation';
export type { SelectedPlayerState } from './useTeamFormation';

export {
  calculateTeamHandicap,
  calculateHandicapSpread,
  getBalanceQuality,
  getInitials,
  areAllPlayersAssigned,
  swapPlayers,
} from './teamAlgorithms';
export type { BalanceQuality } from './teamAlgorithms';

export { EditTeamNameModal } from './EditTeamNameModal';
export type { EditTeamNameModalProps } from './EditTeamNameModal';
