-- Remote force-update gate configuration.
-- One row per platform. Edited via Supabase dashboard / service role only;
-- clients have read-only access.

create table if not exists public.app_version_config (
  platform        text primary key check (platform in ('ios', 'android')),
  minimum_version text not null,
  latest_version  text not null,
  store_url       text not null,
  message         text,
  updated_at      timestamptz not null default now()
);

comment on table public.app_version_config is
  'Remote force-update gate: minimum/latest app version per platform.';
comment on column public.app_version_config.minimum_version is
  'Clients below this version are hard-blocked (must update).';
comment on column public.app_version_config.latest_version is
  'Clients below this (but at/above minimum) get a dismissable soft prompt.';

alter table public.app_version_config enable row level security;

-- Public read: anyone (signed in or not) can read the gate config.
-- Drop-then-create so the migration is idempotent (re-runnable) — Postgres
-- has no `create policy if not exists`.
drop policy if exists "app_version_config_read" on public.app_version_config;
create policy "app_version_config_read"
  on public.app_version_config
  for select
  to anon, authenticated
  using (true);

-- Seed both platforms inert (minimum == latest == current shipped version).
-- Seed/refresh store URLs. On conflict we update store_url (and bump
-- updated_at) so re-running after the rows already exist still corrects the
-- URL, but we deliberately leave minimum_version / latest_version / message
-- untouched so any dashboard tuning of those is preserved.
insert into public.app_version_config
  (platform, minimum_version, latest_version, store_url, message)
values
  ('ios',     '1.13.1', '1.13.1',
   'https://apps.apple.com/app/id6758835344', null),
  ('android', '1.13.1', '1.13.1',
   'https://play.google.com/store/apps/details?id=com.the.nineteenth.golf', null)
on conflict (platform) do update
  set store_url = excluded.store_url,
      updated_at = now();
