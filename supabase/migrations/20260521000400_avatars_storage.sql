-- =====================================================
-- Avatars Storage Bucket
-- The Nineteenth - Golf Competition App
-- =====================================================
-- Public bucket for user profile photos. Public-read so PlayerAvatar can
-- render the URL directly (Avatar.Image) everywhere without signed URLs.
-- Writes are restricted to the owner's own folder.
--
-- Object path convention:  avatars/{user_id}/{uuid}.{ext}
--   (storage.foldername(name))[1] = user_id
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- Read: public (bucket is public).
CREATE POLICY "avatars read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Insert: only into the user's own folder.
--   [1] = user_id
CREATE POLICY "avatars insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update: only within the user's own folder (USING checks the old row,
-- WITH CHECK validates the new path so a row can't be moved to another folder).
CREATE POLICY "avatars update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete: only within the user's own folder.
CREATE POLICY "avatars delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
