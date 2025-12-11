/**
 * API Mappers
 * Data transformation functions for API operations
 */

import type { TeamMode as DBTeamMode, PointSystemConfig } from '@/types/database.types';
import type { TeamMode, PointSystemEntry } from '@/types';

/**
 * Default point system configuration
 */
export const DEFAULT_POINT_SYSTEM: PointSystemConfig = {
  type: 'position',
  rules: {
    '1': 10,
    '2': 8,
    '3': 6,
    '4': 5,
    '5': 4,
    '6': 3,
    '7': 2,
    '8': 1,
    default: 0,
  },
  matchPlay: {
    win: 3,
    draw: 1,
    loss: 0,
  },
};

/**
 * Map app TeamMode to database TeamMode
 * Note: Schema types now match database types directly ('none', 'fixed', 'per-round')
 */
export function mapTeamModeToDb(teamMode?: TeamMode): DBTeamMode {
  if (!teamMode) return 'none';
  // Schema types now match database types directly
  if (teamMode === 'none' || teamMode === 'fixed' || teamMode === 'per-round') {
    return teamMode;
  }
  // Fallback for any legacy values
  return 'none';
}

/**
 * Map database TeamMode to app TeamMode
 * Note: Schema types now match database types directly ('none', 'fixed', 'per-round')
 */
export function mapTeamModeFromDb(dbTeamMode?: DBTeamMode): TeamMode | undefined {
  if (!dbTeamMode || dbTeamMode === 'none') return 'none';
  return dbTeamMode as TeamMode;
}

/**
 * Convert app PointSystemEntry[] to DB PointSystemConfig
 */
export function convertPointSystemToConfig(entries: PointSystemEntry[]): PointSystemConfig {
  const rules: Record<string, number> = { default: 0 };
  for (const entry of entries) {
    rules[entry.position.toString()] = entry.points;
  }
  return {
    type: 'position',
    rules,
    matchPlay: DEFAULT_POINT_SYSTEM.matchPlay,
  };
}

/**
 * Convert DB PointSystemConfig to app PointSystemEntry[]
 */
export function convertPointSystemFromConfig(config?: PointSystemConfig): PointSystemEntry[] | undefined {
  if (!config || !config.rules) return undefined;
  const entries: PointSystemEntry[] = [];
  for (const [key, value] of Object.entries(config.rules)) {
    if (key !== 'default') {
      const position = parseInt(key, 10);
      if (!isNaN(position)) {
        entries.push({ position, points: value });
      }
    }
  }
  return entries.length > 0 ? entries.sort((a, b) => a.position - b.position) : undefined;
}
