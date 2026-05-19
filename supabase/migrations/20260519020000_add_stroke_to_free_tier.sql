-- Migration: Add 'stroke' to the free tier's allowed_game_types.
-- Stroke Play moves down from social to free so casual players can run
-- a straight gross/net scoring competition without subscribing.

UPDATE tier_limits
SET allowed_game_types = array_append(allowed_game_types, 'stroke')
WHERE tier = 'free'
  AND NOT ('stroke' = ANY(allowed_game_types));
