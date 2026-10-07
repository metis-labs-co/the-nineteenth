# Runbook: Move Supabase from Singapore to Sydney

**Why:** the GA CONNECT LSP Agreement (cl. 4.4.8, 10.1.1) requires GA data to
be stored, backed up and processed in Australia only. Prod
(`bvnxfhuvocxyilhlenka`) is in Singapore (`ap-southeast-1`). See
`docs/compliance/GA_CONNECT_COMPLIANCE.md` row A1.

**Key fact:** Supabase cannot change the region of an existing project. The
move means creating a **new project in Sydney (`ap-southeast-2`)**, copying
everything into it, and repointing the app. The project ref, URL and keys
all change.

Do a full rehearsal on **staging** first (staging → new Sydney staging), then
do prod.

---

## 0. Before you start

- **Update the Supabase CLI** (installed v2.26.9; current is v2.120+):
  `brew upgrade supabase`.
- **Docker must be running.** `supabase db dump` runs `pg_dump` in a container.
- Install `psql` (`brew install libpq`).
- Consider a **custom domain** (e.g. `api.thenineteenth.golf`, a paid
  add-on) on the new project. App builds that use it never need to change
  URL again on a future move.
- Pick a low-traffic **maintenance window**. Weekday night AEST is best,
  since rounds are mostly played on weekends.

## 1. Create the Sydney project

1. Dashboard → New project → Region **Southeast Asia (Sydney) ap-southeast-2**.
   Use the same org, plan and compute size as prod.
2. Enable the same extensions as prod. Check prod with
   `select extname from pg_extension;`. Expect at least `pg_net`,
   `pg_cron` and `postgis`.
3. Write down the new project ref, URL, publishable/anon key, service-role
   key and DB connection string (Session pooler).

## 2. Configure the new project (dashboard; nothing is copied automatically)

| Area | What to copy from prod |
|---|---|
| Auth → URL configuration | Site URL and redirect allow-list (incl. `https://thenineteenth.golf/app/auth/*` and app deep links). |
| Auth → Providers | Email settings. **Apple**: same bundle ID / Services ID (native `signInWithIdToken`). **Google**: same client ID and secret. Then, in Google Cloud Console, **add** the new callback `https://<NEW_REF>.supabase.co/auth/v1/callback` to the OAuth client's authorised redirect URIs. Keep the old one until cutover is done. |
| Auth → Email templates and SMTP | Copy templates and custom SMTP settings. |
| Auth → Rate limits, sessions, MFA, hooks | Match prod. |
| Storage | Buckets `avatars` and `round-photos` come over with the schema/data dump (step 4). The files do not; see step 5. |
| Edge function secrets | `ANTHROPIC_API_KEY`, `GOLFAPI_IO_KEY` (use the **rotated** key), `RESEND_API_KEY`, `REVENUECAT_SECRET_API_KEY`, `REVENUECAT_WEBHOOK_SECRET`. The `SUPABASE_*` ones are injected automatically. Set them with `supabase secrets set --project-ref <NEW_REF> NAME=value`. |
| Vault secrets (used by push triggers) | `supabase_url` = new URL; `service_role_key` = new service-role key. Set in SQL: `select vault.create_secret('<value>', 'supabase_url');` and the same for the key. |

## 3. Deploy edge functions

```bash
for fn in delete-account export-data generate-competition golfapi-proxy \
  ingest-course-hazards notify-content-report revenuecat-webhook \
  send-support-email sync-subscription-from-revenuecat test-notification test-push; do
  supabase functions deploy "$fn" --project-ref <NEW_REF>
done
```

`supabase/config.toml` holds each function's `verify_jwt` setting, and
deploy reads it. Check the ones deployed with `--no-verify-jwt` in the past
(e.g. `revenuecat-webhook`).

## 4. Copy the database (rehearsal now, final copy at cutover)

Use the session-pooler connection strings for both projects.

```bash
OLD="postgresql://postgres.<OLD_REF>:<pw>@aws-...pooler.supabase.com:5432/postgres"
NEW="postgresql://postgres.<NEW_REF>:<pw>@aws-...pooler.supabase.com:5432/postgres"

supabase db dump --db-url "$OLD" -f roles.sql  --role-only
supabase db dump --db-url "$OLD" -f schema.sql
supabase db dump --db-url "$OLD" -f data.sql   --use-copy --data-only

psql --single-transaction --variable ON_ERROR_STOP=1 \
  --file roles.sql --file schema.sql \
  --command 'SET session_replication_role = replica' \
  --file data.sql --dbname "$NEW"
```

- Dump the schema from prod itself, not by replaying `supabase/migrations`.
  Prod's `schema_migrations` history is unreliable.
- The data dump includes `auth.users` and its password hashes, so email and
  password logins keep working. Apple and Google identities come over too.
- **Check afterwards; these are easy to lose:**
  - **Triggers on `auth.users`** (the signup trigger that creates the player
    row and the Free subscription). The schema dump may not include objects
    in the `auth` schema. Compare `select tgname from pg_trigger where
    tgrelid = 'auth.users'::regclass;` on both projects and recreate any
    that are missing from their migration files.
  - **pg_cron jobs:** `deactivate-expired-competitions`, `purge-soft-deleted`,
    `send-tee-time-reminders`. Compare `select jobname, schedule from
    cron.job;` and recreate missing jobs with the SQL from their migrations.
  - **Realtime publication:** `select * from pg_publication_tables where
    pubname = 'supabase_realtime';` should match prod.
  - **Row counts:** compare counts for key tables (`players`, `scorecards`,
    `hole_scores`, `competitions`, `rounds`, `user_subscriptions`).
  - **Sequences:** the `--use-copy` data dump sets them, but spot-check one.
- Write the migration repair record:
  `supabase migration repair --status applied <every version> --project-ref <NEW_REF>`.
  `scripts/repair-prod-migration-history.sh` does the same thing for prod.

## 5. Copy storage files

The dump copies the `storage.objects` rows but not the files. Copy each
object in `avatars` and `round-photos` from old to new. Two options:

- Use Supabase Storage's S3-compatible endpoint. Create S3 access keys in
  each project (Storage → S3 Connection) and run `rclone sync`.
- Or write a small Node script (pattern: `scripts/transfer-prod-to-staging.ts`)
  that calls `storage.from(bucket).list` / `download` on the old project and
  `upload` on the new one.

Then **rewrite stored URLs.** `getPublicUrl` results are saved as full
`https://<OLD_REF>.supabase.co/storage/...` URLs in `photo_url` /
`avatar_url` columns:

```sql
update players set photo_url = replace(photo_url, '<OLD_REF>.supabase.co', '<NEW_REF>.supabase.co')
where photo_url like '%<OLD_REF>.supabase.co%';
-- repeat for every table/column that stores storage URLs
-- (grep migrations for photo_url / avatar_url)
```

## 6. Repoint external services

- **RevenueCat:** add a webhook to
  `https://<NEW_REF>.supabase.co/functions/v1/revenuecat-webhook` with the
  same auth header. Delete the old one after cutover.
- **Website** (thenineteenth.golf auth confirm/reset pages): if they call
  Supabase, update their URL and key.
- **Resend:** no change needed (sending only).
- **Expo push:** no change needed. Tokens are in the DB.

## 7. Point the app at Sydney

1. `eas.json` production profile: `EXPO_PUBLIC_SUPABASE_URL` and
   `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` → new project. Update the
   gitignored `.env.production` too, because `eas update` reads it (see the
   `eas update` env gotcha).
2. Build and submit a new store release, but **don't release it yet**.
3. Old app builds keep talking to Singapore until users update. Step 8
   handles that with the force-update gate.

## 8. Cutover (maintenance window)

1. **Freeze old prod.** In the **old** DB, set `app_version_config`
   `minimum_version` to the new release. Every 1.13.0+ client then blocks
   and asks the user to update. Builds older than 1.13.0 have no gate, so
   they're stopped by step 2.
2. Run step 4 again (**final** copy, into a freshly reset new DB or using
   data-only into truncated tables), then step 5 (incremental storage sync
   plus the URL rewrite). Straight after the final dump, **pause the old
   project** (Dashboard → Settings → Pause) so nothing can write to it.
3. Run the checks in step 4.
4. Release the new build in the stores. Optionally also send an OTA
   (`eas update`) to clients on the same runtime version, since
   `EXPO_PUBLIC_*` values are compiled into the JS bundle.
5. Set `app_version_config` in the **new** DB to its normal values.
6. Smoke test against the new project:
   - email login, Apple login and Google login
   - signup creates a player and a Free subscription
   - course search (`golfapi-proxy`)
   - start a round offline → sync
   - push notification arrives
   - RevenueCat sandbox purchase updates the tier
   - avatar shows and uploads
   - export-data and delete-account work

**Sessions:** the new project has different JWT signing keys, so existing
sessions are invalid and **every user has to sign in again** once. Mention
it in the release notes. Ask Supabase support whether the legacy JWT secret
can be carried over if you want to avoid this.

**Offline scores:** unsynced scorecards on a device sync to whichever
project that build points at. The freeze in step 8.1 makes old clients
update before they can sync, so queued scores land in Sydney. Row IDs are
kept by the dump, so the upserts line up.

## 9. After cutover

- Keep the Singapore project paused (from step 8.2), not deleted, for
  ~30 days as a rollback, then take a final backup and delete it.
  Deleting it is what actually moves the data out of Singapore.
- Remove the old Google OAuth redirect URI and the old RevenueCat webhook.
- Update docs and memory that name the old ref:
  - `CLAUDE.md`
  - the staging/prod refs in `scripts/*`
  - `scripts/wipe-staging.ts`
  - the prod guards in `scripts/transfer-*.ts`
- Privacy policy: hosting becomes "Sydney, Australia". Publish it.
- Update `GA_CONNECT_COMPLIANCE.md` row A1 and add a change-log entry.
- Re-link the CLI: `supabase link --project-ref <NEW_REF>`.
