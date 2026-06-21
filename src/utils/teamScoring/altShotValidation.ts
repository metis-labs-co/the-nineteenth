/**
 * Alt Shot requires exactly 2 players per team (foursomes is a pair format).
 * Split rounds enforce this via sub_match_size=2; combined rounds use
 * competition teams of arbitrary size, so they need this check.
 */
export interface AltShotTeamShape {
  id: string;
  memberIds: string[];
}

export function validateAltShotPairs(
  teams: AltShotTeamShape[]
): { teamId: string; size: number }[] {
  return teams
    .filter((t) => t.memberIds.length !== 2)
    .map((t) => ({ teamId: t.id, size: t.memberIds.length }));
}
