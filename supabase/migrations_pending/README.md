# Held-back migrations

Files here are **not** applied by `supabase db push`. Each one breaks app
builds older than a specific release, so it ships only once that release is
the force-update minimum.

## player_column_privileges.sql

Hides other players' email, phone, Golf ID, country, age flag and push
settings at the database (column-level grants on `players`).

Requires: the app release containing `feat/player-privacy` (no `select('*')`
on `players`; own row read via `get_my_player()`), and migration
`20261008000000_player_privacy_rpcs.sql` already applied.

Steps:
1. Ship the release containing `feat/player-privacy` to the stores.
2. Once it's live, raise `app_version_config.minimum_version` to that version.
3. Rename the file into `supabase/migrations/` with a current timestamp,
   e.g. `supabase/migrations/2026MMDDhhmmss_player_column_privileges.sql`.
4. Apply it to staging first and run the smoke checks below, then prod:
   `supabase db push --project-ref <ref>`.
5. Smoke test on a current build:
   - sign in, edit profile
   - friends list and requests
   - start a round with partners, then score and submit it
   - competition players and pairings
   - league, skins and wolf screens
   - achievement leaderboard
   - export data

Pre-1.13.0 builds have no force-update gate and will break; they're expected
to be negligible by then. Check `client_diagnostics` for old app versions
first.

If it goes wrong, roll back with:
`GRANT SELECT ON players TO authenticated;`
