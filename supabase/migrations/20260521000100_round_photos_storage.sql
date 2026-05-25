-- =====================================================
-- Round Photos Storage Bucket
-- The Nineteenth - Golf Competition App
-- =====================================================
-- First Supabase Storage bucket in the project. Private bucket for
-- shared per-round photo albums. Access is kept consistent with the
-- round_photos table via can_view_round() / is_round_participant_any().
--
-- Object path convention:  rounds/{round_id}/{uploader_id}/{uuid}.{ext}
--   (storage.foldername(name))[1] = 'rounds'
--   (storage.foldername(name))[2] = round_id
--   (storage.foldername(name))[3] = uploader_id
--
-- Bucket is private; the client reads via createSignedUrl(s).
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'round-photos',
  'round-photos',
  false,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- Read: anyone who can see the round
CREATE POLICY "round photos read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'round-photos'
    AND can_view_round(((storage.foldername(name))[2])::uuid)
  );

-- Upload: only participants of that round, uploading into their own folder.
-- Path-based checks (not the `owner` column) so they hold at INSERT time and
-- across Supabase versions where `owner` is deprecated.
--   [2] = round_id, [3] = uploader_id
CREATE POLICY "round photos insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'round-photos'
    AND (storage.foldername(name))[3] = auth.uid()::text
    AND is_round_participant_any(((storage.foldername(name))[2])::uuid, auth.uid())
  );

-- Delete: only the uploader (their own folder segment).
CREATE POLICY "round photos delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'round-photos'
    AND (storage.foldername(name))[3] = auth.uid()::text
  );
