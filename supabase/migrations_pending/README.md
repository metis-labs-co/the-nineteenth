# Held-back migrations

Files here are **not** applied by `supabase db push`. Each one breaks app
builds older than a specific release, so it ships only once that release is
the force-update minimum (`app_version_config.minimum_version`).

To release one:
1. Ship the app release it depends on and wait until it's live in both stores.
2. Raise `app_version_config.minimum_version` to that version.
3. Apply the file to staging, smoke-test, then apply it to prod by hand
   (psql or the SQL editor). Don't use `supabase db push`: the migration
   history table is out of date, so a push would replay already-applied files.
4. Move the file into `supabase/migrations/` with the apply date as its
   timestamp, and note the rollback in its header.

Nothing is held right now. The last one, `player_column_privileges.sql`, was
applied to prod on 2026-10-14 as
`supabase/migrations/20261014000000_player_column_privileges.sql`.
