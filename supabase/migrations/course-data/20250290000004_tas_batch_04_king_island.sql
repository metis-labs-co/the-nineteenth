-- TAS Batch 4: King Island
-- 1 course with full hole-by-hole data (18 holes)
-- Source: golfify.io
-- Generated: 2025-12-11

-- ============================================================================
-- 1. CAPE WICKHAM LINKS
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000914',
  'manual',
  'Cape Wickham Links',
  'TAS',
  'Cape Wickham',
  'Lighthouse Road',
  NULL,
  'https://www.capewickham.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000914',
  'Cape Wickham Links',
  'World-class links course on King Island designed by Mike DeVries. Opened 2015. Ranked in Top 10 Australian courses. Spectacular ocean views with lighthouse backdrop.',
  NULL,
  NULL,
  '[
    {"hole": 1, "par": 4, "stroke_index": 9, "stroke_index_red": 12, "yards_blue": 340, "yards_red": 250},
    {"hole": 2, "par": 4, "stroke_index": 12, "stroke_index_red": 7, "yards_blue": 330, "yards_red": 259},
    {"hole": 3, "par": 3, "stroke_index": 3, "stroke_index_red": 18, "yards_blue": 170, "yards_red": 100},
    {"hole": 4, "par": 4, "stroke_index": 4, "stroke_index_red": 6, "yards_blue": 393, "yards_red": 311},
    {"hole": 5, "par": 4, "stroke_index": 14, "stroke_index_red": 13, "yards_blue": 329, "yards_red": 254},
    {"hole": 6, "par": 5, "stroke_index": 18, "stroke_index_red": 10, "yards_blue": 447, "yards_red": 327},
    {"hole": 7, "par": 3, "stroke_index": 15, "stroke_index_red": 11, "yards_blue": 137, "yards_red": 109},
    {"hole": 8, "par": 4, "stroke_index": 2, "stroke_index_red": 5, "yards_blue": 384, "yards_red": 250},
    {"hole": 9, "par": 5, "stroke_index": 8, "stroke_index_red": 3, "yards_blue": 488, "yards_red": 359},
    {"hole": 10, "par": 4, "stroke_index": 17, "stroke_index_red": 16, "yards_blue": 327, "yards_red": 294},
    {"hole": 11, "par": 3, "stroke_index": 13, "stroke_index_red": 14, "yards_blue": 136, "yards_red": 109},
    {"hole": 12, "par": 4, "stroke_index": 16, "stroke_index_red": 17, "yards_blue": 295, "yards_red": 247},
    {"hole": 13, "par": 5, "stroke_index": 7, "stroke_index_red": 4, "yards_blue": 520, "yards_red": 416},
    {"hole": 14, "par": 4, "stroke_index": 11, "stroke_index_red": 2, "yards_blue": 386, "yards_red": 338},
    {"hole": 15, "par": 5, "stroke_index": 6, "stroke_index_red": 1, "yards_blue": 532, "yards_red": 439},
    {"hole": 16, "par": 4, "stroke_index": 1, "stroke_index_red": 8, "yards_blue": 377, "yards_red": 327},
    {"hole": 17, "par": 3, "stroke_index": 10, "stroke_index_red": 15, "yards_blue": 164, "yards_red": 132},
    {"hole": 18, "par": 4, "stroke_index": 5, "stroke_index_red": 9, "yards_blue": 395, "yards_red": 233}
  ]'::jsonb,
  '[
    {"name": "Blue", "color": "blue", "rating": null, "slope": null, "par": 72, "yards": 6150},
    {"name": "Red", "color": "red", "rating": null, "slope": null, "par": 72, "yards": 4754}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();
