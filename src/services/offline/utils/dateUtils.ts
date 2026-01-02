/**
 * Date Utilities for SQLite
 *
 * Handles date serialization to/from SQLite ISO strings.
 */

/**
 * Convert Date to SQLite-compatible ISO string
 */
export function toSQLiteDate(date: Date): string {
  return date.toISOString();
}

/**
 * Convert SQLite ISO string to Date
 */
export function fromSQLiteDate(isoString: string): Date {
  return new Date(isoString);
}

/**
 * Get current timestamp as SQLite-compatible ISO string
 */
export function nowSQLite(): string {
  return new Date().toISOString();
}

/**
 * Parse optional date from SQLite (returns undefined if null/empty)
 */
export function fromSQLiteDateOptional(isoString: string | null | undefined): Date | undefined {
  if (!isoString) return undefined;
  return new Date(isoString);
}
