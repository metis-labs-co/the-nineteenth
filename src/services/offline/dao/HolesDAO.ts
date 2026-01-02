/**
 * Holes DAO
 *
 * Data access operations for course holes in SQLite.
 */

import type { Hole } from '@/types';
import type { HoleRow } from '../types';
import { getDb } from '../DatabaseManager';
import { TABLE_NAMES } from '../schema/tables';
import { dbLogger } from '@/utils/debugLogger';

/**
 * Save holes data for a round
 */
export async function saveHoles(roundId: string, holes: Hole[]): Promise<void> {
  const database = await getDb();

  // Validate and filter holes - skip any with missing required fields
  const validHoles = holes.filter((hole) => {
    if (hole.number == null || hole.par == null || hole.strokeIndex == null) {
      dbLogger.warn('Skipping invalid hole data', {
        roundId: roundId.substring(0, 8) + '...',
        hole: JSON.stringify(hole),
      });
      return false;
    }
    return true;
  });

  if (validHoles.length === 0) {
    dbLogger.warn('No valid holes to save', { roundId: roundId.substring(0, 8) + '...' });
    return;
  }

  for (const hole of validHoles) {
    await database.runAsync(
      `INSERT OR REPLACE INTO ${TABLE_NAMES.HOLES} (round_id, hole_number, par, stroke_index, yardage)
       VALUES (?, ?, ?, ?, ?)`,
      [roundId, hole.number, hole.par, hole.strokeIndex, hole.yardages?.white || null]
    );
  }

  dbLogger.debug('Holes saved for round', {
    roundId: roundId.substring(0, 8) + '...',
    holeCount: validHoles.length,
  });
}

/**
 * Get holes for a round
 */
export async function getHoles(roundId: string): Promise<Hole[]> {
  const database = await getDb();

  const rows = await database.getAllAsync<Pick<HoleRow, 'hole_number' | 'par' | 'stroke_index' | 'yardage'>>(
    `SELECT hole_number, par, stroke_index, yardage FROM ${TABLE_NAMES.HOLES}
     WHERE round_id = ? ORDER BY hole_number`,
    [roundId]
  );

  return rows.map((row) => ({
    number: row.hole_number as Hole['number'],
    par: row.par as Hole['par'],
    strokeIndex: row.stroke_index,
    yardages: { white: row.yardage || 0 },
  }));
}

/**
 * Delete holes for a round
 */
export async function deleteHoles(roundId: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `DELETE FROM ${TABLE_NAMES.HOLES} WHERE round_id = ?`,
    [roundId]
  );
  dbLogger.debug('Holes deleted for round', { roundId: roundId.substring(0, 8) + '...' });
}
