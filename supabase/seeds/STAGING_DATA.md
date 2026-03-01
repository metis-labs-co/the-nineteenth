# Staging Seed Data Reference

Quick reference for all staging user IDs, course IDs, and required data when writing seed files.

## Users (8 Staging Users)

These are real auth users in the staging Supabase project. All seed files should reference these IDs.

| # | UUID | Name | Handicap | Handicap Index | Notes |
|---|------|------|----------|----------------|-------|
| U1 | `25c171c8-c087-4d4a-b3be-545acdfe3f11` | Tom | 18.3 | 18.0 | |
| U2 | `0bfbb37e-3daa-47ee-a9bd-df30b1ac0930` | Jake | 16.0 | 15.7 | |
| U3 | `df045f29-718a-41b5-ac4a-9a8dbf26c6cb` | Chris | 11.5 | 11.2 | |
| U4 | `74e84922-d5fc-4cdb-9835-251c31784309` | Dan | 22.1 | 21.8 | |
| U5 | `e8ba6eb4-1894-422d-bbd2-485c9f141a55` | Luke | 9.3 | 9.0 | |
| U6 | `9f76496a-36bd-417a-bbb2-0c0d450a557b` | Ryan | 20.0 | 19.7 | |
| U7 | `5d7c1ffc-0ad4-486b-b069-d93d626c762f` | Alex | 6.4 | 6.2 | Low handicapper |
| U8 | `41677ffc-f9c4-490b-bc39-1f7370b36c2b` | Ben | 14.2 | 14.0 | |

### SQL Array (copy-paste ready)

```sql
user_ids UUID[] := ARRAY[
  '25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID,  -- U1 Tom (18.3)
  '0bfbb37e-3daa-47ee-a9bd-df30b1ac0930'::UUID,  -- U2 Jake (16.0)
  'df045f29-718a-41b5-ac4a-9a8dbf26c6cb'::UUID,  -- U3 Chris (11.5)
  '74e84922-d5fc-4cdb-9835-251c31784309'::UUID,  -- U4 Dan (22.1)
  'e8ba6eb4-1894-422d-bbd2-485c9f141a55'::UUID,  -- U5 Luke (9.3)
  '9f76496a-36bd-417a-bbb2-0c0d450a557b'::UUID,  -- U6 Ryan (20.0)
  '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID,  -- U7 Alex (6.4)
  '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID   -- U8 Ben (14.2)
];

handicaps NUMERIC[] := ARRAY[18.3, 16.0, 11.5, 22.1, 9.3, 20.0, 6.4, 14.2];
```

## Courses (8 Courses with Tee + Hole Data)

These courses exist in the staging DB with full hole JSONB data (18 holes with par, stroke index) and at least one tee with slope/course rating. Imported from GolfAPI.io.

| # | UUID | Course Name | Club Name |
|---|------|-------------|-----------|
| C1 | `01454eb2-24c5-4cb2-8bc7-e6a33c36b6f9` | Course 1 | GolfAPI import |
| C2 | `065d1f2b-e201-4e56-b0cb-5fc0ed16f440` | Course 2 | GolfAPI import |
| C3 | `0a074956-a253-47ed-8ba0-e83c85baf921` | Course 3 | GolfAPI import |
| C4 | `1cb4edad-d348-40b2-a9b3-82f5c396497a` | Course 4 | GolfAPI import |
| C5 | `2c09bc09-0cd9-4cf1-a73c-f83350f97a2a` | Course 5 | GolfAPI import |
| C6 | `54ecbd4c-deba-46f7-ab29-e6a4e3895fa7` | Course 6 | GolfAPI import |
| C7 | `55c4d696-d162-4fe2-8002-bfab679d704b` | Course 7 | GolfAPI import |
| C8 | `8db3fae9-6ce7-4b83-837f-df92064edba0` | Course 8 | GolfAPI import |

### SQL Array (copy-paste ready)

```sql
course_ids UUID[] := ARRAY[
  '01454eb2-24c5-4cb2-8bc7-e6a33c36b6f9'::UUID,  -- C1
  '065d1f2b-e201-4e56-b0cb-5fc0ed16f440'::UUID,  -- C2
  '0a074956-a253-47ed-8ba0-e83c85baf921'::UUID,  -- C3
  '1cb4edad-d348-40b2-a9b3-82f5c396497a'::UUID,  -- C4
  '2c09bc09-0cd9-4cf1-a73c-f83350f97a2a'::UUID,  -- C5
  '54ecbd4c-deba-46f7-ab29-e6a4e3895fa7'::UUID,  -- C6
  '55c4d696-d162-4fe2-8002-bfab679d704b'::UUID,  -- C7
  '8db3fae9-6ce7-4b83-837f-df92064edba0'::UUID   -- C8
];
```

### Additional Courses (from leagues seed, if more needed)

```sql
-- Extra courses with tee + hole data:
'81651e1c-b851-459f-ba4a-3ceecd081b30'::UUID,
'7d30f5cb-b70d-4458-a182-32dce726089c'::UUID,
'74ca722b-3d50-483d-ab44-0e3a75e24c44'::UUID
```

### Dynamic Course Data Lookup Pattern

When creating seed data that needs hole pars, stroke indexes, and tee ratings, use this pattern to read real data from the DB:

```sql
DO $$
DECLARE
  v_course_id UUID := '01454eb2-24c5-4cb2-8bc7-e6a33c36b6f9';
  v_holes JSONB;
  v_slope NUMERIC;
  v_course_rating NUMERIC;
  v_par INTEGER;
  v_stroke_index INTEGER;
  h INTEGER;
BEGIN
  -- Get hole data from course
  SELECT c.holes INTO v_holes
  FROM courses c WHERE c.id = v_course_id;

  -- Get tee ratings (pick first available tee)
  SELECT t.slope_rating, t.course_rating INTO v_slope, v_course_rating
  FROM tees t WHERE t.course_id = v_course_id
  ORDER BY t.slope_rating DESC LIMIT 1;

  -- Loop through holes
  FOR h IN 1..18 LOOP
    v_par := (v_holes->>(h-1))::jsonb->>'par';
    v_stroke_index := (v_holes->>(h-1))::jsonb->>'strokeIndex';
    -- Use v_par, v_stroke_index for score generation...
  END LOOP;
END $$;
```

## Required Data for Complete User Seeding

When seeding users for staging, ensure these tables have data:

### Minimum Required (must exist for app to work)

| Table | Per User | Notes |
|-------|----------|-------|
| `players` | 1 row | Created by auth trigger on signup. Has name, email, handicap |
| `user_subscriptions` | 1 row | Created by DB trigger. Default tier = 'free' |

### Recommended for Testing

| Table | Per User | Notes |
|-------|----------|-------|
| `user_preferences` | 1 row | Theme, distance unit, notification toggles. Created on first settings save |
| `friendships` | N rows | Pairs of users. Status: 'accepted', 'pending' |
| `favorite_courses` | 0-3 rows | Courses the user has favourited |
| `push_tokens` | 0-1 row | Expo push token for notifications. Only if testing push |
| `player_achievements` | N rows | Unlocked achievements |
| `achievement_progress` | N rows | Progress toward achievements |
| `notifications` | N rows | In-app notification history |

### Created by Game Activity (populated by competition/round seeds)

| Table | Notes |
|-------|-------|
| `competitions` | At least one user should be `organizer_id` |
| `competition_players` | Join table, status = 'accepted' |
| `rounds` | Linked to competition or standalone (`user_id`) |
| `round_players` | For standalone rounds |
| `pairings` | Groups of 2-4 player IDs per round |
| `scorecards` | One per player per round |
| `score_entries` | Per-hole scores |
| `round_results` | Calculated results (points, gross, net) |
| `teams` / `team_members` | Only for team format competitions |
| `scoring_pairs` | Only for competitive rounds with designated scorers |
| `leagues` / `league_players` / `league_rounds` | Only for league testing |
| `skins_games` / `skins_results` / `skins_payouts` | Only for skins testing |
| `wolf_games` / `wolf_hole_decisions` / `wolf_payouts` | Only for wolf testing |

## Subscription Tiers for Testing

Assign different tiers to users for testing tier-gated features:

```sql
-- Set subscription tiers for testing (run after users exist)
UPDATE user_subscriptions SET tier = 'premium', status = 'active' WHERE user_id = '25c171c8-c087-4d4a-b3be-545acdfe3f11';  -- U1 Tom
UPDATE user_subscriptions SET tier = 'social', status = 'active'  WHERE user_id = '0bfbb37e-3daa-47ee-a9bd-df30b1ac0930';  -- U2 Jake
UPDATE user_subscriptions SET tier = 'free', status = 'active'    WHERE user_id = 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb';  -- U3 Chris
UPDATE user_subscriptions SET tier = 'premium', status = 'active' WHERE user_id = '74e84922-d5fc-4cdb-9835-251c31784309';  -- U4 Dan
UPDATE user_subscriptions SET tier = 'social', status = 'active'  WHERE user_id = 'be495e0e-df74-49b0-8409-af18dce9746e';  -- U5 Luke
UPDATE user_subscriptions SET tier = 'free', status = 'active'    WHERE user_id = '9f76496a-36bd-417a-bbb2-0c0d450a557b';  -- U6 Ryan
UPDATE user_subscriptions SET tier = 'super_admin', status = 'active' WHERE user_id = '5d7c1ffc-0ad4-486b-b069-d93d626c762f'; -- U7 Alex
UPDATE user_subscriptions SET tier = 'premium', status = 'active' WHERE user_id = '41677ffc-f9c4-490b-bc39-1f7370b36c2b';  -- U8 Ben
```

## Friendships Setup

Make all 8 users friends with each other for full testing:

```sql
-- Create friendships between all users (28 pairs for 8 users)
-- Only insert if not already friends
INSERT INTO friendships (requester_id, addressee_id, status, created_at, updated_at)
SELECT u1, u2, 'accepted', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'
FROM (
  VALUES
    ('25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID, '0bfbb37e-3daa-47ee-a9bd-df30b1ac0930'::UUID),
    ('25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID, 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb'::UUID),
    ('25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID, '74e84922-d5fc-4cdb-9835-251c31784309'::UUID),
    ('25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID, 'be495e0e-df74-49b0-8409-af18dce9746e'::UUID),
    ('25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID, '9f76496a-36bd-417a-bbb2-0c0d450a557b'::UUID),
    ('25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID, '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID),
    ('25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID, '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID),
    ('0bfbb37e-3daa-47ee-a9bd-df30b1ac0930'::UUID, 'df045f29-718a-41b5-ac4a-9a8dbf26c6cb'::UUID),
    ('0bfbb37e-3daa-47ee-a9bd-df30b1ac0930'::UUID, '74e84922-d5fc-4cdb-9835-251c31784309'::UUID),
    ('0bfbb37e-3daa-47ee-a9bd-df30b1ac0930'::UUID, 'be495e0e-df74-49b0-8409-af18dce9746e'::UUID),
    ('0bfbb37e-3daa-47ee-a9bd-df30b1ac0930'::UUID, '9f76496a-36bd-417a-bbb2-0c0d450a557b'::UUID),
    ('0bfbb37e-3daa-47ee-a9bd-df30b1ac0930'::UUID, '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID),
    ('0bfbb37e-3daa-47ee-a9bd-df30b1ac0930'::UUID, '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID),
    ('df045f29-718a-41b5-ac4a-9a8dbf26c6cb'::UUID, '74e84922-d5fc-4cdb-9835-251c31784309'::UUID),
    ('df045f29-718a-41b5-ac4a-9a8dbf26c6cb'::UUID, 'be495e0e-df74-49b0-8409-af18dce9746e'::UUID),
    ('df045f29-718a-41b5-ac4a-9a8dbf26c6cb'::UUID, '9f76496a-36bd-417a-bbb2-0c0d450a557b'::UUID),
    ('df045f29-718a-41b5-ac4a-9a8dbf26c6cb'::UUID, '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID),
    ('df045f29-718a-41b5-ac4a-9a8dbf26c6cb'::UUID, '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID),
    ('74e84922-d5fc-4cdb-9835-251c31784309'::UUID, 'be495e0e-df74-49b0-8409-af18dce9746e'::UUID),
    ('74e84922-d5fc-4cdb-9835-251c31784309'::UUID, '9f76496a-36bd-417a-bbb2-0c0d450a557b'::UUID),
    ('74e84922-d5fc-4cdb-9835-251c31784309'::UUID, '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID),
    ('74e84922-d5fc-4cdb-9835-251c31784309'::UUID, '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID),
    ('be495e0e-df74-49b0-8409-af18dce9746e'::UUID, '9f76496a-36bd-417a-bbb2-0c0d450a557b'::UUID),
    ('be495e0e-df74-49b0-8409-af18dce9746e'::UUID, '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID),
    ('be495e0e-df74-49b0-8409-af18dce9746e'::UUID, '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID),
    ('9f76496a-36bd-417a-bbb2-0c0d450a557b'::UUID, '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID),
    ('9f76496a-36bd-417a-bbb2-0c0d450a557b'::UUID, '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID),
    ('5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID, '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID)
) AS t(u1, u2)
ON CONFLICT DO NOTHING;
```

## UUID Patterns for Seed Data

Use these patterns to avoid collision with existing seeds:

| Prefix Pattern | Used By |
|----------------|---------|
| `aaaa****` | seed-courses.sql |
| `bbbb****` | seed-courses.sql |
| `1000****` | seed-courses.sql |
| `a1b2c3d4` | seed_eastern_golf_club.sql |
| `c0000001` | seed-comprehensive-rounds.sql (competitions) |
| `r0000001` - `r0000005` | seed-comprehensive-rounds.sql (rounds) |
| `a1000001` - `a2000002` | seed-comprehensive-rounds.sql (comp players) |
| `bbbbb001` - `bbbbb003` | seed-leagues.sql (leagues) |

**Safe patterns for new seeds**: `d0000***`, `e0000***`, `f0000***`
