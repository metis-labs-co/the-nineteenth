/**
 * Competition, Player, Team, Pairing & Knockout Query Keys
 */

// =====================================================
// COMPETITIONS
// =====================================================

export const competitionKeys = {
  all: ['competitions'] as const,
  lists: () => [...competitionKeys.all, 'list'] as const,
  list: (filters?: { status?: string; organizerId?: string }) =>
    [...competitionKeys.lists(), filters] as const,
  details: () => [...competitionKeys.all, 'detail'] as const,
  detail: (id: string) => [...competitionKeys.details(), id] as const,
} as const;

// =====================================================
// PLAYERS
// =====================================================

export const playerKeys = {
  all: ['players'] as const,
  lists: () => [...playerKeys.all, 'list'] as const,
  list: (competitionId?: string) =>
    [...playerKeys.lists(), competitionId] as const,
  details: () => [...playerKeys.all, 'detail'] as const,
  detail: (id: string) => [...playerKeys.details(), id] as const,
} as const;

// =====================================================
// TEAMS
// =====================================================

export const teamKeys = {
  all: ['teams'] as const,
  lists: () => [...teamKeys.all, 'list'] as const,
  list: (competitionId: string) => [...teamKeys.lists(), competitionId] as const,
  details: () => [...teamKeys.all, 'detail'] as const,
  detail: (id: string) => [...teamKeys.details(), id] as const,
} as const;

// =====================================================
// PAIRINGS
// =====================================================

export const pairingKeys = {
  all: ['pairings'] as const,
  lists: () => [...pairingKeys.all, 'list'] as const,
  list: (roundId: string) => [...pairingKeys.lists(), roundId] as const,
  details: () => [...pairingKeys.all, 'detail'] as const,
  detail: (id: string) => [...pairingKeys.details(), id] as const,
} as const;

// =====================================================
// KNOCKOUT
// =====================================================

export const knockoutKeys = {
  all: ['knockout'] as const,
  bracket: (competitionId: string) => [...knockoutKeys.all, 'bracket', competitionId] as const,
  match: (matchId: string) => [...knockoutKeys.all, 'match', matchId] as const,
} as const;
