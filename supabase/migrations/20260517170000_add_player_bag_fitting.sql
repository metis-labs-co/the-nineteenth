-- =====================================================
-- ADD CLUB FITTING DETAILS TO player_bag
-- Optional per-club metadata that golfers care about:
-- brand/model, loft, lie angle, shaft brand/model/flex/length,
-- free-text notes. All nullable — bag picker still works
-- unchanged for users who don't fill these in.
-- =====================================================

ALTER TABLE player_bag
  ADD COLUMN brand               TEXT,
  ADD COLUMN model               TEXT,
  ADD COLUMN loft_degrees        NUMERIC(4,1),
  ADD COLUMN lie_angle_degrees   NUMERIC(4,2),
  ADD COLUMN shaft_brand         TEXT,
  ADD COLUMN shaft_model         TEXT,
  ADD COLUMN shaft_flex          TEXT,
  ADD COLUMN shaft_length_inches NUMERIC(4,2),
  ADD COLUMN notes               TEXT,
  ADD COLUMN updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Sanity bounds. Deliberately loose — fittings vary, including
-- aftermarket components, so we don't want to reject reasonable values.
ALTER TABLE player_bag
  ADD CONSTRAINT player_bag_loft_range
    CHECK (loft_degrees IS NULL OR (loft_degrees >= 0 AND loft_degrees <= 80)),
  ADD CONSTRAINT player_bag_lie_range
    CHECK (lie_angle_degrees IS NULL OR (lie_angle_degrees >= 50 AND lie_angle_degrees <= 75)),
  ADD CONSTRAINT player_bag_shaft_length_range
    CHECK (shaft_length_inches IS NULL OR (shaft_length_inches >= 30 AND shaft_length_inches <= 50)),
  ADD CONSTRAINT player_bag_shaft_flex_values
    CHECK (shaft_flex IS NULL OR shaft_flex IN ('L','A','R','S','X','TX'));

-- Existing policy set is SELECT/INSERT/DELETE only. Saving fitting
-- details requires UPDATE on own rows.
CREATE POLICY player_bag_update ON player_bag FOR UPDATE
  USING (auth.uid() = player_id)
  WITH CHECK (auth.uid() = player_id);

COMMENT ON COLUMN player_bag.brand               IS 'Manufacturer, free text (e.g. "TaylorMade", "Mizuno").';
COMMENT ON COLUMN player_bag.model               IS 'Specific club model (e.g. "Stealth 2", "JPX 925 Tour").';
COMMENT ON COLUMN player_bag.loft_degrees        IS 'Loft in degrees. Driver/wood/wedge typically set; iron loft is implied by model but can be overridden.';
COMMENT ON COLUMN player_bag.lie_angle_degrees   IS 'Lie angle in degrees (e.g. 62.5). Stored absolute, not as offset.';
COMMENT ON COLUMN player_bag.shaft_brand         IS 'Shaft manufacturer (e.g. "Mitsubishi", "Project X").';
COMMENT ON COLUMN player_bag.shaft_model         IS 'Shaft model (e.g. "Tensei AV Blue", "LZ 6.0").';
COMMENT ON COLUMN player_bag.shaft_flex          IS 'Shaft flex code: L (Ladies), A (Senior), R (Regular), S (Stiff), X (X-Stiff), TX (Tour X).';
COMMENT ON COLUMN player_bag.shaft_length_inches IS 'Shaft length in inches (e.g. 45.50 for a driver).';
COMMENT ON COLUMN player_bag.notes               IS 'Free-text catch-all (grip, swing weight, fitting date, etc.).';
COMMENT ON COLUMN player_bag.updated_at          IS 'Set on each fitting edit. added_at remains the original add timestamp.';
