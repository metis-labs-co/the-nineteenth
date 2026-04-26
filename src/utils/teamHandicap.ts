export function averageTeamHandicap(
  members: { handicap: number | null | undefined }[]
): number {
  if (members.length === 0) return 0;
  const sum = members.reduce((acc, m) => acc + (m.handicap ?? 0), 0);
  return Math.round((sum / members.length) * 10) / 10;
}
