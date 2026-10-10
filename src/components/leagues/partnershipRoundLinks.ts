/**
 * Opening the round(s) behind a tagged partnership round.
 *
 * A partnership round holds one or two scorecards. They're usually from the
 * same round; when they aren't, the player picks which one to open.
 */

import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useOpenRound, type RoundLinkInput } from '@/navigation/openRound';
import type { PartnershipRound } from '@/types/database';

/** Distinct rounds behind a partnership round, in scorecard order. */
export function getPartnershipRoundLinks(round: PartnershipRound): RoundLinkInput[] {
  const links: RoundLinkInput[] = [];
  if (round.round_1_id) {
    links.push({ roundId: round.round_1_id, competitionId: round.round_1_competition_id });
  }
  if (round.round_2_id && round.round_2_id !== round.round_1_id) {
    links.push({ roundId: round.round_2_id, competitionId: round.round_2_competition_id });
  }
  return links;
}

/** Returns a handler that opens a partnership round, or null if it has no visible round. */
export function usePartnershipRoundOpener() {
  const openRound = useOpenRound();
  return useCallback(
    (round: PartnershipRound, beforeOpen?: () => void) => {
      const links = getPartnershipRoundLinks(round);
      if (links.length === 0) return;
      const open = (link: RoundLinkInput) => {
        beforeOpen?.();
        openRound(link);
      };
      if (links.length === 1) {
        open(links[0]);
        return;
      }
      Alert.alert('Open scorecard', 'These scorecards are from different rounds.', [
        { text: 'First scorecard', onPress: () => open(links[0]) },
        { text: 'Second scorecard', onPress: () => open(links[1]) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [openRound],
  );
}
