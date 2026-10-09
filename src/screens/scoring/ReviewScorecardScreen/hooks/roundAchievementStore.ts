/**
 * The scoring-store fields useScoreSubmission.checkRoundAchievements reads.
 * Separate from roundAchievementEvent.ts so the payload builder's tests don't
 * load the store.
 */
import { useScorecardStore } from '@/store/scorecardStore';

type ScorecardStoreState = ReturnType<typeof useScorecardStore.getState>;

export interface RoundAchievementStoreInputs {
  holes: ScorecardStoreState['holes'];
  gameType: ScorecardStoreState['gameType'];
  userScorecard: ReturnType<ScorecardStoreState['groupScorecards']['get']>;
  /** The round was ended early (store holesPlayed set, B3b). */
  endedEarly: boolean;
}

export function readRoundAchievementStore(playerId: string): RoundAchievementStoreInputs {
  const { holes, gameType, groupScorecards, holesPlayed } = useScorecardStore.getState();
  return {
    holes,
    gameType,
    userScorecard: groupScorecards.get(playerId),
    // resetRound clears holesPlayed only after checkRoundAchievements has run.
    endedEarly: holesPlayed != null,
  };
}
