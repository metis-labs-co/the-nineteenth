-- =====================================================
-- Round Photo Delete RPC
-- The Nineteenth - Golf Competition App
-- =====================================================
-- delete_round_photo(p_photo_id):
--   Soft-deletes the calling user's own round photo (sets deleted_at).
--
--   A direct client UPDATE (SET deleted_at = now()) is rejected by the
--   round_photos SELECT RLS policy (deleted_at IS NULL) the moment the row is
--   marked deleted — Postgres raises "new row violates row-level security
--   policy for round_photos". This SECURITY DEFINER function runs as the owner
--   so the soft-delete is not blocked by RLS, while still enforcing ownership
--   internally via uploader_id = auth.uid() (which remains the caller's id even
--   inside a definer function).
--
--   Returns TRUE when a row was soft-deleted, FALSE otherwise (already deleted,
--   not found, or not the uploader).
-- =====================================================

CREATE OR REPLACE FUNCTION delete_round_photo(p_photo_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE round_photos
     SET deleted_at = now()
   WHERE id = p_photo_id
     AND uploader_id = auth.uid()
     AND deleted_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;

COMMENT ON FUNCTION delete_round_photo(UUID) IS
  'Soft-deletes the caller''s own round photo (uploader_id = auth.uid()). SECURITY DEFINER to bypass the round_photos SELECT RLS policy that excludes deleted rows. Returns TRUE if a row was removed.';

GRANT EXECUTE ON FUNCTION delete_round_photo(UUID) TO authenticated;
