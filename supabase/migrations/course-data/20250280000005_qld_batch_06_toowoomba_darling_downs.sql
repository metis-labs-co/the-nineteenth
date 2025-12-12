-- QLD Batch 6: Toowoomba & Darling Downs
-- 1 course with full hole-by-hole data (most regional Darling Downs courses already in Batches 2-3 or are 9-holes/placeholder data)
-- Source: golfify.io
-- Generated: 2025-12-11

-- ============================================================================
-- 1. CITY GOLF CLUB (TOOWOOMBA)
-- ============================================================================
INSERT INTO venues (id, source, name, state, city, address, phone, website, total_holes)
VALUES (
  'f2a3b4c5-d6e7-8901-abcd-500000000869',
  'manual',
  'City Golf Club',
  'QLD',
  'Toowoomba',
  'South Street',
  NULL,
  'https://www.citygolfclub.com.au',
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
  'f2a3b4c5-d6e7-8901-abcd-500000000869',
  'City Golf Club',
  'Ross Watson designed parkland course opened 1925. Premier Toowoomba course on the Darling Downs.',
  116,
  70.0,
  '[
    {"hole": 1, "par": 4, "stroke_index": 1, "yards_white": 314},
    {"hole": 2, "par": 3, "stroke_index": 3, "yards_white": 170},
    {"hole": 3, "par": 4, "stroke_index": 5, "yards_white": 367},
    {"hole": 4, "par": 3, "stroke_index": 7, "yards_white": 181},
    {"hole": 5, "par": 4, "stroke_index": 9, "yards_white": 347},
    {"hole": 6, "par": 4, "stroke_index": 11, "yards_white": 345},
    {"hole": 7, "par": 4, "stroke_index": 13, "yards_white": 322},
    {"hole": 8, "par": 3, "stroke_index": 15, "yards_white": 132},
    {"hole": 9, "par": 4, "stroke_index": 17, "yards_white": 388},
    {"hole": 10, "par": 5, "stroke_index": 2, "yards_white": 439},
    {"hole": 11, "par": 4, "stroke_index": 4, "yards_white": 347},
    {"hole": 12, "par": 4, "stroke_index": 6, "yards_white": 364},
    {"hole": 13, "par": 4, "stroke_index": 8, "yards_white": 350},
    {"hole": 14, "par": 4, "stroke_index": 10, "yards_white": 346},
    {"hole": 15, "par": 3, "stroke_index": 12, "yards_white": 140},
    {"hole": 16, "par": 4, "stroke_index": 14, "yards_white": 367},
    {"hole": 17, "par": 5, "stroke_index": 16, "yards_white": 480},
    {"hole": 18, "par": 4, "stroke_index": 18, "yards_white": 406}
  ]'::jsonb,
  '[
    {"name": "White", "color": "white", "rating": 70.0, "slope": 116, "yards": 5805}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tees = EXCLUDED.tees,
  holes = EXCLUDED.holes,
  updated_at = NOW();
