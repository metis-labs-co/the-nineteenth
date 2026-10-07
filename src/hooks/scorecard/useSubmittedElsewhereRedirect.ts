/**
 * When another phone submits a social round, its cards arrive as final via
 * the live merge (store.submittedElsewhereRoundId). Tell the user once and
 * leave the scoring flow for the round summary — local edits can no longer be
 * saved.
 *
 * Only the focused screen alerts (Entry stays mounted beneath Review), only for
 * this screen's round, and the flag is cleared as the alert is shown so no
 * other mount — or a later round — can raise it again.
 */
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useScorecardStore } from '@/store/scorecardStore';
import { buildPostSubmitResetState } from '@/navigation/postSubmitNavigation';

export function useSubmittedElsewhereRedirect(
  roundId: string | null | undefined,
  competitionId?: string | null
): void {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const submittedElsewhereRoundId = useScorecardStore((s) => s.submittedElsewhereRoundId);
  const shownRef = useRef(false);

  useEffect(() => {
    if (!roundId || !isFocused || shownRef.current) return;
    if (submittedElsewhereRoundId !== roundId) return;
    shownRef.current = true;
    useScorecardStore.setState({ submittedElsewhereRoundId: null });
    Alert.alert('Round submitted', 'This round was submitted on another phone.', [
      {
        text: 'View round',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- reset state is typed for the root stack
        onPress: () => (navigation as any).reset(buildPostSubmitResetState(roundId, competitionId)),
      },
    ]);
  }, [submittedElsewhereRoundId, isFocused, roundId, competitionId, navigation]);
}
