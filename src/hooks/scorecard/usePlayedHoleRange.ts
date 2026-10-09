/**
 * usePlayedHoleRange
 *
 * Once a round is ended early (store holesPlayed set for THIS round), the
 * scoring screens are closed after hole N (R17): hole navigation, swiping and
 * progress strips are limited to the played holes, and a current hole after
 * the end is pulled back to the last played hole.
 *
 * Maths never uses this — daily handicaps keep the planned `holes`. Until the
 * round is ended, `navigableHoles` is `holes` itself (same reference) and the
 * bounds are exactly the screens' existing `holes[0]` / last-hole fallbacks.
 */

import { useEffect, useMemo } from 'react';
import { useScorecardStore } from '@/store/scorecardStore';
import { filterPlayableHoles } from '@/utils/holeTransformers';
import { isEndedEarly } from '@/utils/roundShape';
import type { NineType } from '@/types/database/enums';
import type { Hole } from '@/types';

export interface PlayedHoleRange {
  isEnded: boolean;
  holesPlayed: number | null;
  nineType: NineType;
  /** The played holes once ended; otherwise the screen's holes unchanged. */
  navigableHoles: Hole[];
  firstHoleNumber: number;
  lastHoleNumber: number;
}

export function usePlayedHoleRange({
  roundId,
  holes,
  currentHole,
  setCurrentHole,
}: {
  roundId: string;
  holes: Hole[];
  currentHole: number;
  setCurrentHole: (hole: number) => void;
}): PlayedHoleRange {
  const { currentRoundId, holesPlayed: storeHolesPlayed, nineType } = useScorecardStore();
  const holesPlayed =
    currentRoundId === roundId && isEndedEarly({ holes_played: storeHolesPlayed })
      ? storeHolesPlayed
      : null;
  const isEnded = holesPlayed != null;

  const navigableHoles = useMemo(
    () => (holesPlayed != null ? filterPlayableHoles(holes, nineType, holesPlayed) : holes),
    [holes, nineType, holesPlayed]
  );
  const firstHoleNumber = navigableHoles[0]?.number ?? 1;
  const lastHoleNumber = navigableHoles[navigableHoles.length - 1]?.number ?? 18;

  // Keep the current hole on an actual retained hole, including sparse lists.
  useEffect(() => {
    if (!isEnded || navigableHoles.length === 0) return;
    if (currentHole > lastHoleNumber) {
      setCurrentHole(lastHoleNumber);
    } else if (!navigableHoles.some((hole) => hole.number === currentHole)) {
      setCurrentHole(firstHoleNumber);
    }
  }, [isEnded, navigableHoles, currentHole, firstHoleNumber, lastHoleNumber, setCurrentHole]);

  return { isEnded, holesPlayed, nineType, navigableHoles, firstHoleNumber, lastHoleNumber };
}
