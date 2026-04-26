-- =====================================================
-- Migration: Team Colour
-- =====================================================
-- Adds a stored, organiser-editable colour to each team. Colour is sourced
-- from the same 12-colour palette used by player avatars (see
-- src/constants/avatars.ts). The column stores the avatar id (e.g.
-- 'avatar-green'), not a hex value, so palette tweaks propagate through
-- the app without a data migration.
--
-- Render sites consume the colour via getTeamColorHex() in
-- src/utils/teamColor.ts, which falls back to the legacy index-based
-- theme colour when this column is NULL — ensuring no existing comp
-- breaks during rollout.
--
-- Backfill: assigns one of the 12 palette ids to every existing team,
-- walking declaration order partitioned by competition_id (ordered by
-- created_at). The first team in each comp gets 'avatar-green', the
-- second 'avatar-blue', and so on. Teams beyond the 12th wrap; this is
-- only relevant in pathological cases (max teams ≈ playerCount / 2 ≈ 6
-- in practice).
-- =====================================================

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS color TEXT;

WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY competition_id ORDER BY created_at) - 1 AS rn
  FROM teams
  WHERE color IS NULL
),
palette(idx, color_id) AS (
  VALUES
    (0,  'avatar-green'),
    (1,  'avatar-blue'),
    (2,  'avatar-navy'),
    (3,  'avatar-teal'),
    (4,  'avatar-purple'),
    (5,  'avatar-violet'),
    (6,  'avatar-red'),
    (7,  'avatar-orange'),
    (8,  'avatar-gold'),
    (9,  'avatar-pink'),
    (10, 'avatar-slate'),
    (11, 'avatar-charcoal')
)
UPDATE teams
SET color = palette.color_id
FROM ordered, palette
WHERE teams.id = ordered.id
  AND palette.idx = (ordered.rn % 12);
