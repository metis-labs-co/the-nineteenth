/**
 * Merge-on-open for social rounds: pull every server card and merge it per
 * hole (last edit wins), even when this phone already has scores — that is
 * how a phone that was off picks up holes entered elsewhere. Returns false for
 * standard rounds so the caller keeps its existing hydrate.
 */
import { useScorecardStore } from '@/store/scorecardStore';
import { roundDataLogger } from '@/utils/debugLogger';

export async function pullOnOpenIfSocial(): Promise<boolean> {
  const store = useScorecardStore.getState();
  if (store.scoringMode !== 'social') return false;
  try {
    await store.pullServerScorecards();
  } catch (error) {
    roundDataLogger.warn('Social round pull on open failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return true;
}
