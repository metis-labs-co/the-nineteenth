-- =====================================================
-- SEED: MATES THIS WEEK - CURRENT-WEEK ROUNDS (STAGING)
-- =====================================================
-- Populates the "Mates this week" home leaderboard for:
--   Main user: ca7c2924-39e8-4b66-bbb8-d9699adb3d65 (Example Kay, hcp 54.0)
--
-- Uses REAL staging players already friends (accepted) with the main
-- user — verified against the live friendships table 2026-06-12, so
-- NO friendship inserts are needed:
--   e5579c23-938b-4f03-b08f-b889276cfc50  Sam Kay     (hcp 8.0)
--   8a30f176-1e23-4871-843f-52a3d4c249b6  Metis       (hcp 12.0)
--   9f76496a-36bd-417a-bbb2-0c0d450a557b  Philip Kay  (hcp 0.0)
--   41677ffc-f9c4-490b-bc39-1f7370b36c2b  Noah Kay    (hcp 0.0)
--   5d7c1ffc-0ad4-486b-b069-d93d626c762f  nvl         (hcp 0.0)
--
-- Courses (verified in staging):
--   Settlers Run: 54ecbd4c-deba-46f7-ab29-e6a4e3895fa7 (par 72, slope 140, rating 72)
--   The Beach:    55d81445-9734-4fe6-afe6-5e29771ece7b (par 72, slope 138, rating 72)
--
-- Dates are computed from CURRENT_DATE so this seed always lands in
-- the CURRENT Monday-Sunday week, whenever it is run. No future dates
-- are produced (Wednesday round clamps to today early in the week).
--
-- Creates:
--   - 3 completed standalone rounds dated this week
--   - 7 completed scorecards with Stableford points
--   - Expected leaderboard: Sam Kay 38 (best of 38/33), Metis 34,
--     Example Kay 31, Philip Kay 27, Noah Kay 24, nvl 22
--
-- UUID prefix for this seed: f1 (rounds), f2 (scorecards) —
-- no collision with existing prefixes (aaaa/bbbb/1000/a0/a1/b0/b1/c0/d0/e0/r0).
-- NOTE: supabase/seeds/STAGING_DATA.md is STALE for this project — its
-- user list does not match the live staging players table.
-- =====================================================

-- =====================================================
-- STEP 0: CLEAN UP EXISTING SEED DATA (re-runnable)
-- =====================================================

DO $$
DECLARE
  seed_round_ids UUID[] := ARRAY[
    'f1000001-0000-0000-0000-000000000001'::UUID,
    'f1000002-0000-0000-0000-000000000002'::UUID,
    'f1000003-0000-0000-0000-000000000003'::UUID
  ];
BEGIN
  DELETE FROM scorecards WHERE round_id = ANY(seed_round_ids);
  DELETE FROM round_players WHERE round_id = ANY(seed_round_ids);
  DELETE FROM rounds WHERE id = ANY(seed_round_ids);
END $$;

-- =====================================================
-- STEP 1: THIS WEEK'S ROUNDS (all owned by main user, all completed)
-- =====================================================
-- Round 1: Monday this week    - Settlers Run - Example Kay + Sam Kay + nvl
-- Round 2: Wednesday this week - The Beach    - Metis + Philip + Noah
--          (clamped to CURRENT_DATE when run on Mon/Tue)
-- Round 3: Today               - The Beach    - Sam Kay solo (2nd round;
--          scores WORSE than his Monday round to prove best-of-week)

INSERT INTO rounds (id, user_id, course_id, date, game_type, status, created_at, updated_at)
VALUES
  (
    'f1000001-0000-0000-0000-000000000001',
    'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
    '54ecbd4c-deba-46f7-ab29-e6a4e3895fa7',                       -- Settlers Run
    date_trunc('week', CURRENT_DATE)::DATE,                       -- Monday
    'stableford',
    'completed',
    NOW(), NOW()
  ),
  (
    'f1000002-0000-0000-0000-000000000002',
    'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
    '55d81445-9734-4fe6-afe6-5e29771ece7b',                       -- The Beach
    LEAST(date_trunc('week', CURRENT_DATE)::DATE + 2, CURRENT_DATE), -- Wednesday (or today)
    'stableford',
    'completed',
    NOW(), NOW()
  ),
  (
    'f1000003-0000-0000-0000-000000000003',
    'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
    '55d81445-9734-4fe6-afe6-5e29771ece7b',                       -- The Beach
    CURRENT_DATE,
    'stableford',
    'completed',
    NOW(), NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  date = EXCLUDED.date,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Round participants
INSERT INTO round_players (id, round_id, player_id, added_by, created_at)
VALUES
  -- Round 1: Settlers Run (Monday): Example Kay + Sam Kay + nvl
  (gen_random_uuid(), 'f1000001-0000-0000-0000-000000000001', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NULL, NOW()),
  (gen_random_uuid(), 'f1000001-0000-0000-0000-000000000001', 'e5579c23-938b-4f03-b08f-b889276cfc50', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NOW()),
  (gen_random_uuid(), 'f1000001-0000-0000-0000-000000000001', '5d7c1ffc-0ad4-486b-b069-d93d626c762f', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NOW()),
  -- Round 2: The Beach (Wednesday): Metis + Philip Kay + Noah Kay
  (gen_random_uuid(), 'f1000002-0000-0000-0000-000000000002', '8a30f176-1e23-4871-843f-52a3d4c249b6', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NOW()),
  (gen_random_uuid(), 'f1000002-0000-0000-0000-000000000002', '9f76496a-36bd-417a-bbb2-0c0d450a557b', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NOW()),
  (gen_random_uuid(), 'f1000002-0000-0000-0000-000000000002', '41677ffc-f9c4-490b-bc39-1f7370b36c2b', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NOW()),
  -- Round 3: The Beach (today): Sam Kay solo
  (gen_random_uuid(), 'f1000003-0000-0000-0000-000000000003', 'e5579c23-938b-4f03-b08f-b889276cfc50', 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65', NOW())
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 2: SCORECARDS - ROUND 1 (Settlers Run, Monday, slope 140 / rating 72)
-- =====================================================

-- Sam Kay (hcp 8.0) - 38 points (gross 80, daily hcp 10, net 70) - week leader
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, submitted_by, ga_handicap_used, daily_handicap_used, handicap_differential, course_rating_used, slope_rating_used, synced_at, created_at, updated_at)
VALUES (
  'f2000001-0000-0000-0000-000000000001',
  'f1000001-0000-0000-0000-000000000001',
  'e5579c23-938b-4f03-b08f-b889276cfc50',
  '{
    "1": {"strokes": 4, "putts": 2},  "2": {"strokes": 5, "putts": 2},
    "3": {"strokes": 4, "putts": 1},  "4": {"strokes": 3, "putts": 1},
    "5": {"strokes": 5, "putts": 2},  "6": {"strokes": 4, "putts": 2},
    "7": {"strokes": 5, "putts": 2},  "8": {"strokes": 4, "putts": 2},
    "9": {"strokes": 6, "putts": 2},  "10": {"strokes": 4, "putts": 2},
    "11": {"strokes": 4, "putts": 1}, "12": {"strokes": 5, "putts": 2},
    "13": {"strokes": 3, "putts": 1}, "14": {"strokes": 5, "putts": 2},
    "15": {"strokes": 4, "putts": 2}, "16": {"strokes": 5, "putts": 2},
    "17": {"strokes": 5, "putts": 2}, "18": {"strokes": 5, "putts": 2}
  }'::jsonb,
  80, 70, 38,
  'completed',
  (date_trunc('week', CURRENT_DATE)::DATE + TIME '14:30')::TIMESTAMP,
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  8.0, 10, 6.5, 72.0, 140,
  (date_trunc('week', CURRENT_DATE)::DATE + TIME '14:35')::TIMESTAMP,
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  scores = EXCLUDED.scores, total_gross = EXCLUDED.total_gross,
  total_net = EXCLUDED.total_net, total_points = EXCLUDED.total_points,
  status = EXCLUDED.status, updated_at = NOW();

-- Example Kay (main user, hcp 54.0) - 31 points (gross 131, daily hcp 54, net 77)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, submitted_by, ga_handicap_used, daily_handicap_used, handicap_differential, course_rating_used, slope_rating_used, synced_at, created_at, updated_at)
VALUES (
  'f2000002-0000-0000-0000-000000000002',
  'f1000001-0000-0000-0000-000000000001',
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  '{
    "1": {"strokes": 7, "putts": 2},  "2": {"strokes": 8, "putts": 3},
    "3": {"strokes": 7, "putts": 2},  "4": {"strokes": 6, "putts": 2},
    "5": {"strokes": 8, "putts": 3},  "6": {"strokes": 7, "putts": 2},
    "7": {"strokes": 7, "putts": 2},  "8": {"strokes": 6, "putts": 2},
    "9": {"strokes": 9, "putts": 3},  "10": {"strokes": 7, "putts": 2},
    "11": {"strokes": 7, "putts": 2}, "12": {"strokes": 8, "putts": 3},
    "13": {"strokes": 6, "putts": 2}, "14": {"strokes": 8, "putts": 2},
    "15": {"strokes": 7, "putts": 2}, "16": {"strokes": 8, "putts": 3},
    "17": {"strokes": 7, "putts": 2}, "18": {"strokes": 8, "putts": 2}
  }'::jsonb,
  131, 77, 31,
  'completed',
  (date_trunc('week', CURRENT_DATE)::DATE + TIME '14:30')::TIMESTAMP,
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  54.0, 54, 47.6, 72.0, 140,
  (date_trunc('week', CURRENT_DATE)::DATE + TIME '14:35')::TIMESTAMP,
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  scores = EXCLUDED.scores, total_gross = EXCLUDED.total_gross,
  total_net = EXCLUDED.total_net, total_points = EXCLUDED.total_points,
  status = EXCLUDED.status, updated_at = NOW();

-- nvl (hcp 0.0) - 22 points (gross 86, daily hcp 0, net 86)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, submitted_by, ga_handicap_used, daily_handicap_used, handicap_differential, course_rating_used, slope_rating_used, synced_at, created_at, updated_at)
VALUES (
  'f2000003-0000-0000-0000-000000000003',
  'f1000001-0000-0000-0000-000000000001',
  '5d7c1ffc-0ad4-486b-b069-d93d626c762f',
  '{
    "1": {"strokes": 5, "putts": 2},  "2": {"strokes": 5, "putts": 2},
    "3": {"strokes": 5, "putts": 2},  "4": {"strokes": 4, "putts": 2},
    "5": {"strokes": 6, "putts": 3},  "6": {"strokes": 5, "putts": 2},
    "7": {"strokes": 5, "putts": 2},  "8": {"strokes": 4, "putts": 2},
    "9": {"strokes": 6, "putts": 2},  "10": {"strokes": 5, "putts": 2},
    "11": {"strokes": 4, "putts": 2}, "12": {"strokes": 5, "putts": 2},
    "13": {"strokes": 4, "putts": 2}, "14": {"strokes": 5, "putts": 2},
    "15": {"strokes": 4, "putts": 1}, "16": {"strokes": 6, "putts": 3},
    "17": {"strokes": 4, "putts": 2}, "18": {"strokes": 4, "putts": 1}
  }'::jsonb,
  86, 86, 22,
  'completed',
  (date_trunc('week', CURRENT_DATE)::DATE + TIME '14:30')::TIMESTAMP,
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  0.0, 0, 11.3, 72.0, 140,
  (date_trunc('week', CURRENT_DATE)::DATE + TIME '14:35')::TIMESTAMP,
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  scores = EXCLUDED.scores, total_gross = EXCLUDED.total_gross,
  total_net = EXCLUDED.total_net, total_points = EXCLUDED.total_points,
  status = EXCLUDED.status, updated_at = NOW();

-- =====================================================
-- STEP 3: SCORECARDS - ROUND 2 (The Beach, Wednesday, slope 138 / rating 72)
-- =====================================================

-- Metis (hcp 12.0) - 34 points (gross 89, daily hcp 15, net 74)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, submitted_by, ga_handicap_used, daily_handicap_used, handicap_differential, course_rating_used, slope_rating_used, synced_at, created_at, updated_at)
VALUES (
  'f2000004-0000-0000-0000-000000000004',
  'f1000002-0000-0000-0000-000000000002',
  '8a30f176-1e23-4871-843f-52a3d4c249b6',
  '{
    "1": {"strokes": 5, "putts": 2},  "2": {"strokes": 5, "putts": 2},
    "3": {"strokes": 5, "putts": 2},  "4": {"strokes": 4, "putts": 2},
    "5": {"strokes": 6, "putts": 3},  "6": {"strokes": 5, "putts": 2},
    "7": {"strokes": 5, "putts": 2},  "8": {"strokes": 4, "putts": 2},
    "9": {"strokes": 6, "putts": 2},  "10": {"strokes": 5, "putts": 2},
    "11": {"strokes": 5, "putts": 2}, "12": {"strokes": 5, "putts": 2},
    "13": {"strokes": 4, "putts": 1}, "14": {"strokes": 5, "putts": 2},
    "15": {"strokes": 4, "putts": 2}, "16": {"strokes": 6, "putts": 3},
    "17": {"strokes": 5, "putts": 2}, "18": {"strokes": 5, "putts": 2}
  }'::jsonb,
  89, 74, 34,
  'completed',
  (LEAST(date_trunc('week', CURRENT_DATE)::DATE + 2, CURRENT_DATE) + TIME '15:00')::TIMESTAMP,
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  12.0, 15, 13.9, 72.0, 138,
  (LEAST(date_trunc('week', CURRENT_DATE)::DATE + 2, CURRENT_DATE) + TIME '15:05')::TIMESTAMP,
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  scores = EXCLUDED.scores, total_gross = EXCLUDED.total_gross,
  total_net = EXCLUDED.total_net, total_points = EXCLUDED.total_points,
  status = EXCLUDED.status, updated_at = NOW();

-- Philip Kay (hcp 0.0) - 27 points (gross 81, daily hcp 0, net 81)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, submitted_by, ga_handicap_used, daily_handicap_used, handicap_differential, course_rating_used, slope_rating_used, synced_at, created_at, updated_at)
VALUES (
  'f2000005-0000-0000-0000-000000000005',
  'f1000002-0000-0000-0000-000000000002',
  '9f76496a-36bd-417a-bbb2-0c0d450a557b',
  '{
    "1": {"strokes": 4, "putts": 2},  "2": {"strokes": 5, "putts": 2},
    "3": {"strokes": 5, "putts": 2},  "4": {"strokes": 3, "putts": 1},
    "5": {"strokes": 5, "putts": 2},  "6": {"strokes": 4, "putts": 2},
    "7": {"strokes": 5, "putts": 2},  "8": {"strokes": 4, "putts": 2},
    "9": {"strokes": 6, "putts": 2},  "10": {"strokes": 4, "putts": 2},
    "11": {"strokes": 5, "putts": 2}, "12": {"strokes": 5, "putts": 2},
    "13": {"strokes": 3, "putts": 1}, "14": {"strokes": 5, "putts": 2},
    "15": {"strokes": 4, "putts": 2}, "16": {"strokes": 6, "putts": 3},
    "17": {"strokes": 4, "putts": 2}, "18": {"strokes": 4, "putts": 2}
  }'::jsonb,
  81, 81, 27,
  'completed',
  (LEAST(date_trunc('week', CURRENT_DATE)::DATE + 2, CURRENT_DATE) + TIME '15:00')::TIMESTAMP,
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  0.0, 0, 7.4, 72.0, 138,
  (LEAST(date_trunc('week', CURRENT_DATE)::DATE + 2, CURRENT_DATE) + TIME '15:05')::TIMESTAMP,
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  scores = EXCLUDED.scores, total_gross = EXCLUDED.total_gross,
  total_net = EXCLUDED.total_net, total_points = EXCLUDED.total_points,
  status = EXCLUDED.status, updated_at = NOW();

-- Noah Kay (hcp 0.0) - 24 points (gross 84, daily hcp 0, net 84)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, submitted_by, ga_handicap_used, daily_handicap_used, handicap_differential, course_rating_used, slope_rating_used, synced_at, created_at, updated_at)
VALUES (
  'f2000006-0000-0000-0000-000000000006',
  'f1000002-0000-0000-0000-000000000002',
  '41677ffc-f9c4-490b-bc39-1f7370b36c2b',
  '{
    "1": {"strokes": 5, "putts": 2},  "2": {"strokes": 5, "putts": 2},
    "3": {"strokes": 4, "putts": 2},  "4": {"strokes": 4, "putts": 2},
    "5": {"strokes": 5, "putts": 2},  "6": {"strokes": 4, "putts": 2},
    "7": {"strokes": 5, "putts": 2},  "8": {"strokes": 4, "putts": 2},
    "9": {"strokes": 6, "putts": 2},  "10": {"strokes": 5, "putts": 2},
    "11": {"strokes": 5, "putts": 2}, "12": {"strokes": 5, "putts": 2},
    "13": {"strokes": 3, "putts": 1}, "14": {"strokes": 5, "putts": 2},
    "15": {"strokes": 4, "putts": 2}, "16": {"strokes": 6, "putts": 3},
    "17": {"strokes": 4, "putts": 2}, "18": {"strokes": 5, "putts": 2}
  }'::jsonb,
  84, 84, 24,
  'completed',
  (LEAST(date_trunc('week', CURRENT_DATE)::DATE + 2, CURRENT_DATE) + TIME '15:00')::TIMESTAMP,
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  0.0, 0, 9.8, 72.0, 138,
  (LEAST(date_trunc('week', CURRENT_DATE)::DATE + 2, CURRENT_DATE) + TIME '15:05')::TIMESTAMP,
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  scores = EXCLUDED.scores, total_gross = EXCLUDED.total_gross,
  total_net = EXCLUDED.total_net, total_points = EXCLUDED.total_points,
  status = EXCLUDED.status, updated_at = NOW();

-- =====================================================
-- STEP 4: SCORECARDS - ROUND 3 (The Beach, today, Sam Kay's 2nd round)
-- =====================================================
-- 33 points < his Monday 38: the leaderboard must show 38, proving
-- best-round-per-player aggregation.

-- Sam Kay (hcp 8.0) - 33 points (gross 85, daily hcp 10, net 75)
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, total_net, total_points, status, submitted_at, submitted_by, ga_handicap_used, daily_handicap_used, handicap_differential, course_rating_used, slope_rating_used, synced_at, created_at, updated_at)
VALUES (
  'f2000007-0000-0000-0000-000000000007',
  'f1000003-0000-0000-0000-000000000003',
  'e5579c23-938b-4f03-b08f-b889276cfc50',
  '{
    "1": {"strokes": 4, "putts": 2},  "2": {"strokes": 5, "putts": 2},
    "3": {"strokes": 5, "putts": 2},  "4": {"strokes": 3, "putts": 1},
    "5": {"strokes": 5, "putts": 2},  "6": {"strokes": 4, "putts": 2},
    "7": {"strokes": 5, "putts": 2},  "8": {"strokes": 4, "putts": 2},
    "9": {"strokes": 6, "putts": 2},  "10": {"strokes": 5, "putts": 2},
    "11": {"strokes": 4, "putts": 2}, "12": {"strokes": 5, "putts": 2},
    "13": {"strokes": 4, "putts": 2}, "14": {"strokes": 5, "putts": 2},
    "15": {"strokes": 4, "putts": 1}, "16": {"strokes": 6, "putts": 3},
    "17": {"strokes": 5, "putts": 2}, "18": {"strokes": 6, "putts": 2}
  }'::jsonb,
  85, 75, 33,
  'completed',
  (CURRENT_DATE + TIME '11:30')::TIMESTAMP,
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
  8.0, 10, 10.6, 72.0, 138,
  (CURRENT_DATE + TIME '11:35')::TIMESTAMP,
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  scores = EXCLUDED.scores, total_gross = EXCLUDED.total_gross,
  total_net = EXCLUDED.total_net, total_points = EXCLUDED.total_points,
  status = EXCLUDED.status, updated_at = NOW();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- 1. Simulate the Mates This Week leaderboard (expect:
--    Sam Kay 38, Metis 34, Example Kay 31, Philip Kay 27, Noah Kay 24, nvl 22)
SELECT p.name,
       MAX(s.total_points) AS best_points,
       COUNT(*) AS rounds_this_week
FROM scorecards s
JOIN rounds r ON r.id = s.round_id AND r.deleted_at IS NULL
JOIN players p ON p.id = s.player_id
WHERE s.status IN ('completed', 'confirmed')
  AND r.date >= date_trunc('week', CURRENT_DATE)::DATE
  AND r.date <  date_trunc('week', CURRENT_DATE)::DATE + 7
  AND s.player_id IN (
    'ca7c2924-39e8-4b66-bbb8-d9699adb3d65',
    'e5579c23-938b-4f03-b08f-b889276cfc50',
    '8a30f176-1e23-4871-843f-52a3d4c249b6',
    '9f76496a-36bd-417a-bbb2-0c0d450a557b',
    '41677ffc-f9c4-490b-bc39-1f7370b36c2b',
    '5d7c1ffc-0ad4-486b-b069-d93d626c762f'
  )
GROUP BY p.name
ORDER BY best_points DESC, p.name;

-- 2. Round dates all land inside the current Mon-Sun week
SELECT id, date, status,
       date >= date_trunc('week', CURRENT_DATE)::DATE
   AND date < date_trunc('week', CURRENT_DATE)::DATE + 7 AS in_current_week
FROM rounds
WHERE id::TEXT LIKE 'f100000%';
