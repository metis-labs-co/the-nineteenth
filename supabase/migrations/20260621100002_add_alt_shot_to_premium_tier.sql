-- Allow 'alt-shot' for premium and super_admin tiers.
UPDATE tier_limits
SET allowed_game_types = array_append(allowed_game_types, 'alt-shot')
WHERE tier = 'premium'
  AND NOT ('alt-shot' = ANY(allowed_game_types));

UPDATE tier_limits
SET allowed_game_types = array_append(allowed_game_types, 'alt-shot')
WHERE tier = 'super_admin'
  AND NOT ('alt-shot' = ANY(allowed_game_types));
