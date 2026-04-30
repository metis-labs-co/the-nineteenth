/**
 * Permissions for managing a sub-match's settings (skins, etc.).
 *
 * - `isMember`     — current user is on team_a_player_ids OR team_b_player_ids
 * - `isOrganizer`  — current user is the competition organizer
 * - `canManageSkins` — either of the above; gate UI affordances on this
 *
 * Premium gating (creation only) is layered on top in the UI via
 * `useCanUseSkins`. View / cancel of an existing game does not require
 * Premium.
 */

import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { SubMatch } from '@/types/database/round.types';

export interface SubMatchPermissions {
  isMember: boolean;
  isOrganizer: boolean;
  canManageSkins: boolean;
}

export function useSubMatchPermissions(
  subMatch: SubMatch | null | undefined,
  competitionOrganizerId: string | null | undefined
): SubMatchPermissions {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useMemo(() => {
    if (!userId || !subMatch) {
      return { isMember: false, isOrganizer: false, canManageSkins: false };
    }

    const isMember =
      subMatch.team_a_player_ids.includes(userId) ||
      subMatch.team_b_player_ids.includes(userId);

    const isOrganizer = !!competitionOrganizerId && competitionOrganizerId === userId;

    return {
      isMember,
      isOrganizer,
      canManageSkins: isMember || isOrganizer,
    };
  }, [userId, subMatch, competitionOrganizerId]);
}
