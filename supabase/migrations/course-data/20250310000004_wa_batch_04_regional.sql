-- WA Batch 4: Regional WA
-- 1 course with full hole-by-hole data (18 holes)
-- Source: golfify.io
-- Generated: 2025-12-11

-- ============================================================================
-- 1. SPALDING PARK GOLF CLUB (Geraldton)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000960',
  'manual',
  'Spalding Park Golf Club',
  'WA',
  'Geraldton',
  'Green Street, Geraldton',
  NULL,
  NULL,
  18
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  website = EXCLUDED.website;

INSERT INTO courses (venue_id, name, description, slope_rating, course_rating, holes, tees)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000960',
  'Spalding Park Golf Club',
  'Mid West regional parkland course established in 1937. Premier course in the Geraldton area serving the Mid West region. Open guest policy.',
  113,
  72.0,
  '[
    {"hole": 1, "par": 5, "stroke_index": 6, "yards_blue": 458, "yards_red": 420},
    {"hole": 2, "par": 4, "stroke_index": 12, "stroke_index_red": 14, "yards_blue": 338, "yards_red": 277},
    {"hole": 3, "par": 4, "stroke_index": 10, "stroke_index_red": 15, "yards_blue": 340, "yards_red": 260},
    {"hole": 4, "par": 3, "stroke_index": 8, "stroke_index_red": 17, "yards_blue": 169, "yards_red": 114},
    {"hole": 5, "par": 4, "stroke_index": 16, "stroke_index_red": 11, "yards_blue": 292, "yards_red": 292},
    {"hole": 6, "par": 3, "stroke_index": 18, "yards_blue": 118, "yards_red": 105},
    {"hole": 7, "par": 4, "stroke_index": 2, "stroke_index_red": 3, "yards_blue": 378, "yards_red": 324},
    {"hole": 8, "par": 4, "stroke_index": 1, "stroke_index_red": 4, "yards_blue": 400, "yards_red": 322},
    {"hole": 9, "par": 5, "stroke_index": 14, "stroke_index_red": 10, "yards_blue": 427, "yards_red": 385},
    {"hole": 10, "par": 5, "stroke_index": 11, "stroke_index_red": 5, "yards_blue": 439, "yards_red": 430},
    {"hole": 11, "par": 4, "stroke_index": 15, "stroke_index_red": 13, "yards_blue": 296, "yards_red": 296},
    {"hole": 12, "par": 3, "stroke_index": 17, "stroke_index_red": 7, "yards_blue": 148, "yards_red": 148},
    {"hole": 13, "par": 4, "stroke_index": 4, "stroke_index_red": 2, "yards_blue": 361, "yards_red": 341},
    {"hole": 14, "par": 3, "stroke_index": 9, "stroke_index_red": 16, "yards_blue": 181, "yards_red": 125},
    {"hole": 15, "par": 4, "stroke_index": 13, "stroke_index_red": 8, "yards_blue": 310, "yards_red": 310},
    {"hole": 16, "par": 5, "stroke_index": 7, "stroke_index_red": 9, "yards_blue": 492, "yards_red": 395},
    {"hole": 17, "par": 4, "stroke_index": 5, "stroke_index_red": 12, "yards_blue": 360, "yards_red": 285},
    {"hole": 18, "par": 4, "stroke_index": 3, "stroke_index_red": 1, "yards_blue": 365, "yards_red": 355}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "gender": "mens", "rating": 72.0, "slope": 113, "par": 72, "yards": 5872},
    {"name": "Red", "color": "red", "gender": "ladies", "rating": 73.0, "slope": 113, "par": 72, "yards": 5184}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();
