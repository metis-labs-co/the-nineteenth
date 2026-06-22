import { formatDisplayDate } from '@/utils/locale';

/** Local-timezone `YYYY-MM-DD` for the given date. */
export function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Human day label for a `YYYY-MM-DD` (or ISO) date string:
 * "Today" / "Tomorrow" / weekday name. Empty string for null.
 */
export function formatDayLabel(dateIso: string | null): string {
  if (!dateIso) return '';
  const today = localDateStr(new Date());
  if (dateIso === today) return 'Today';
  const tomorrow = localDateStr(new Date(Date.now() + 24 * 60 * 60 * 1000));
  if (dateIso === tomorrow) return 'Tomorrow';
  const d = new Date(`${dateIso}T00:00:00`);
  return formatDisplayDate(d, { weekday: 'long' });
}
