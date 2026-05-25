-- Migration: 90-day purge of soft-deleted rounds/competitions + cron
--
-- Physical round-photo files: NOT cleaned up here. A raw `DELETE FROM
-- storage.objects` only removes the metadata row, never the underlying blob in
-- the storage backend, and dropping the row would lose the reference needed to
-- find the orphan later. We deliberately leave storage.objects intact when a
-- round is hard-deleted (round_photos rows cascade away). Physical cleanup is a
-- separate follow-up: a Storage-API job (Edge Function, invokable via pg_net)
-- that scans for round-photos objects with no matching round_photos row and
-- removes both the file and the row through the Storage service.

CREATE OR REPLACE FUNCTION purge_soft_deleted()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ := NOW() - INTERVAL '90 days';  -- grace period (90 days)
  v_comp_count INTEGER := 0;
BEGIN
  -- Hard delete competitions past cutoff (cascades their rounds + full tree).
  WITH del AS (
    DELETE FROM competitions
    WHERE deleted_at IS NOT NULL AND deleted_at < v_cutoff
    RETURNING id
  )
  SELECT count(*) INTO v_comp_count FROM del;

  -- Hard delete every remaining soft-deleted round past cutoff (cascades its
  -- tree). This includes standalone rounds AND competition rounds that were
  -- individually soft-deleted via soft_delete_round() — those are meant to be
  -- purged on their own timeline, leaving the live competition with one fewer
  -- round (the intended outcome of deleting a single round).
  DELETE FROM rounds WHERE deleted_at IS NOT NULL AND deleted_at < v_cutoff;

  RETURN v_comp_count;
END;
$$;

-- service_role only; never callable by app clients.
REVOKE ALL ON FUNCTION purge_soft_deleted() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purge_soft_deleted() TO service_role;

COMMENT ON FUNCTION purge_soft_deleted() IS
  'Hard-deletes rounds/competitions soft-deleted >90 days ago (FK cascade removes their trees). Physical round-photo files are left for a separate Storage-API cleanup job. Run daily by pg_cron.';

-- Schedule daily at 16:00 UTC (mirrors deactivate-expired-competitions pattern).
SELECT cron.schedule(
  'purge-soft-deleted',
  '0 16 * * *',
  $$SELECT purge_soft_deleted()$$
);
