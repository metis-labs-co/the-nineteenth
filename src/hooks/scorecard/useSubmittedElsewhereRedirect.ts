/**
 * When another phone submits a social round, its cards arrive as final via
 * the live merge (store.submittedElsewhere). Tell the user once and leave the
 * scoring flow for the round summary — local edits can no longer be saved.
 */
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useScorecardStore } from '@/store/scorecardStore';
import { buildPostSubmitResetState } from '@/navigation/postSubmitNavigation';

export function useSubmittedElsewhereRedirect(
  roundId: string | null | undefined,
  competitionId?: string | null
): void {
  const navigation = useNavigation();
  const submittedElsewhere = useScorecardStore((s) => s.submittedElsewhere);
  const shownRef = useRef(false);

  useEffect(() => {
    if (!submittedElsewhere || !roundId || shownRef.current) return;
    shownRef.current = true;
    Alert.alert('Round submitted', 'This round was submitted on another phone.', [
      {
        text: 'View round',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- reset state is typed for the root stack
        onPress: () => (navigation as any).reset(buildPostSubmitResetState(roundId, competitionId)),
      },
    ]);
  }, [submittedElsewhere, roundId, competitionId, navigation]);
}
