/**
 * SQLite Table Definitions
 *
 * CREATE TABLE statements and table names for offline database.
 */

export const TABLE_NAMES = {
  SCORECARDS: 'scorecards',
  HOLE_SCORES: 'hole_scores',
  HOLES: 'holes',
  PENDING_SYNCS: 'pending_syncs',
} as const;

/**
 * CREATE TABLE statement for scorecards
 */
export const CREATE_SCORECARDS_TABLE = `
  CREATE TABLE IF NOT EXISTS ${TABLE_NAMES.SCORECARDS} (
    id TEXT PRIMARY KEY,
    round_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    player_handicap INTEGER DEFAULT 0,
    total_gross INTEGER DEFAULT 0,
    total_net INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    status TEXT DEFAULT 'in-progress',
    submitted_at TEXT,
    submitted_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    is_synced INTEGER DEFAULT 0,
    is_standalone INTEGER DEFAULT 0
  );
`;

/**
 * CREATE TABLE statement for hole_scores
 * Note: strokes can be NULL for multi-ball scores (stored in ball_scores instead)
 */
export const CREATE_HOLE_SCORES_TABLE = `
  CREATE TABLE IF NOT EXISTS ${TABLE_NAMES.HOLE_SCORES} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scorecard_id TEXT NOT NULL,
    hole_number INTEGER NOT NULL,
    strokes INTEGER,
    putts INTEGER,
    fairway_hit INTEGER,
    green_in_regulation INTEGER,
    penalties INTEGER DEFAULT 0,
    ball_scores TEXT,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (scorecard_id) REFERENCES ${TABLE_NAMES.SCORECARDS}(id),
    UNIQUE(scorecard_id, hole_number)
  );
`;

/**
 * CREATE TABLE statement for holes (course data)
 */
export const CREATE_HOLES_TABLE = `
  CREATE TABLE IF NOT EXISTS ${TABLE_NAMES.HOLES} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    round_id TEXT NOT NULL,
    hole_number INTEGER NOT NULL,
    par INTEGER NOT NULL,
    stroke_index INTEGER NOT NULL,
    yardage INTEGER,
    UNIQUE(round_id, hole_number)
  );
`;

/**
 * CREATE TABLE statement for pending_syncs
 */
export const CREATE_PENDING_SYNCS_TABLE = `
  CREATE TABLE IF NOT EXISTS ${TABLE_NAMES.PENDING_SYNCS} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    action TEXT NOT NULL,
    data TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    retry_count INTEGER DEFAULT 0
  );
`;

/**
 * All table creation statements in order
 */
export const ALL_CREATE_TABLES = [
  CREATE_SCORECARDS_TABLE,
  CREATE_HOLE_SCORES_TABLE,
  CREATE_HOLES_TABLE,
  CREATE_PENDING_SYNCS_TABLE,
];
