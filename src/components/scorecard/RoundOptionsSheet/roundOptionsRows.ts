export type RoundOptionKey = 'holes' | 'players' | 'tees' | 'endEarly' | 'delete';

export interface RoundOptionRow {
  key: RoundOptionKey;
  label: string;
  icon: string;
  disabled: boolean;
  caption?: string;
  destructive?: boolean;
}

export interface RoundOptionsInput {
  isOnline: boolean;
  courseHoleCount: number;
  isEnded: boolean;
  anyCardSubmitted: boolean;
  rosterEditableFormat: boolean;
  canChangeTees: boolean;
  canEndRoundEarly: boolean;
  endEarlyBlockedReason: string | null;
}

const OFFLINE = 'Needs a connection';

function lock(reasons: (string | false)[]): { disabled: boolean; caption?: string } {
  const caption = reasons.find((r): r is string => typeof r === 'string');
  return caption ? { disabled: true, caption } : { disabled: false };
}

export function getRoundOptionsRows(i: RoundOptionsInput): RoundOptionRow[] {
  const rows: RoundOptionRow[] = [];
  const offline = !i.isOnline && OFFLINE;

  if (i.courseHoleCount > 9) {
    rows.push({ key: 'holes', label: 'Holes', icon: 'flag-variant-outline',
      ...lock([offline, i.isEnded && 'Round has been ended']) });
  }
  rows.push({ key: 'players', label: 'Players', icon: 'account-multiple-outline',
    ...lock([
      offline,
      !i.rosterEditableFormat && 'Not available for this format',
      i.isEnded && 'Round has been ended',
      i.anyCardSubmitted && 'Scores have been submitted',
    ]) });
  if (i.canChangeTees) {
    rows.push({ key: 'tees', label: 'Change tees', icon: 'golf-tee', ...lock([offline]) });
  }
  rows.push({ key: 'endEarly', label: 'End round early', icon: 'flag-checkered',
    ...lock([!i.canEndRoundEarly && (i.endEarlyBlockedReason ?? 'Not available right now')]) });
  rows.push({ key: 'delete', label: 'Delete round', icon: 'trash-can-outline', destructive: true,
    ...lock([offline]) });
  return rows;
}
