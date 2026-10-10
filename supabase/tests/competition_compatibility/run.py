#!/usr/bin/env python3
"""Create, test and remove a local-only disposable Supabase PostgreSQL container.

No DB URL, credentials, host ports, network access or repository mounts are used.
Requires the pinned image to be cached; this script never pulls images.
"""
import json
from pathlib import Path
import subprocess
import sys
import time
import uuid

sys.dont_write_bytecode = True
import checks

ROOT = Path(__file__).resolve().parents[3]
IMAGE = 'public.ecr.aws/supabase/postgres:17.4.1.043'


def command(args, **kwargs):
    result = subprocess.run(args, text=True, capture_output=True, **kwargs)
    if result.returncode:
        raise RuntimeError(result.stderr or result.stdout)
    return result.stdout


def main():
    # Refuse remote Docker endpoints as well as remote PostgreSQL connections.
    context = json.loads(command(['docker', 'context', 'inspect']))[0]
    endpoint = context['Endpoints']['docker']['Host']
    if not endpoint.startswith('unix://'):
        raise RuntimeError('This test requires a local Docker Unix socket.')
    docker = ['docker', '--host', endpoint]
    container = 'round-scoring-compat-' + uuid.uuid4().hex[:12]
    command(docker + ['run', '--detach', '--pull=never', '--network=none',
                     '--name', container, '--env', 'POSTGRES_PASSWORD=disposable-test-only', IMAGE])
    try:
        def sql(source, user='postgres', migration=False):
            return command(docker + ['exec', '-i', '--env', 'PGPASSWORD=disposable-test-only',
                container, 'psql', '-XqAt', '-U', user, '-d', 'postgres', '-v', 'ON_ERROR_STOP=1']
                + (['--single-transaction', '-f', '-'] if migration else []), input=source)

        deadline = time.monotonic() + 45
        while True:
            try:
                # The entrypoint briefly starts a temporary server while
                # installing platform schemas. SELECT 1 alone is too early.
                if command(docker + ['exec', container, 'cat', '/proc/1/comm']).strip() not in ('postgres', '.postgres-wrapp'):
                    raise RuntimeError('Container initialization still running')
                sql('SELECT 1;')
                break
            except RuntimeError:
                if time.monotonic() >= deadline:
                    raise
                time.sleep(0.2)
        print(sql('SELECT version();').strip(), flush=True)
        sql((Path(__file__).parent / 'bootstrap.sql').read_text(), 'supabase_admin')
        paths = sorted((ROOT / 'supabase/migrations').glob('*.sql'))
        # Two historical replay adjustments, unrelated to scoring. Keep SQL
        # bodies unchanged and make both exceptions visible in the output.
        retro = next(p for p in paths if p.name == '20251231000000_retroactive_achievements.sql')
        paths.remove(retro)
        paths.insert(next(i for i, p in enumerate(paths) if p.name.startswith('20260118')), retro)
        skipped = '20260502170000_refresh_eastern_hole_coordinates.sql'
        print('SETUP: achievement backfill deferred until home_club_id rename; '
              'production-course coordinates data correction omitted.', flush=True)
        applied = 0
        for path in paths:
            if path.name == skipped:
                continue
            try:
                sql(path.read_text(), migration=True)
            except RuntimeError as error:
                raise RuntimeError(f'{path.name}: {error}') from error
            applied += 1
        print(f'PASS: {applied} repository migrations replayed', flush=True)
        checks.CONTAINER = container
        checks.DOCKER = docker
        checks.main()
        for name in ('round_scoring_writes_verify.sql', 'end_round_early_verify.sql',
                     'full_scorecards_only_handicap.verify.sql'):
            try:
                sql((ROOT / 'supabase/tests' / name).read_text())
            except RuntimeError as error:
                raise RuntimeError(f'{name}: {error}') from error
            print('PASS:', name, flush=True)
        # Compare ordinary writes with the exact pre-C3 snapshot RPC and no
        # C3 guards, on the same real schema/RLS/notification triggers. This
        # distinguishes compatibility from unrelated pre-existing behavior.
        sql('DROP TRIGGER scorecards_a_round_scoring_write ON scorecards; '
            'DROP TRIGGER score_entries_round_scoring_write ON score_entries;')
        sql((ROOT / 'supabase/migrations/20260714000000_scorecard_optimistic_concurrency.sql').read_text(), migration=True)
        print('CONTROL: pre-C3 snapshot RPC/guards (A7/B1 remain)', flush=True)
        checks.main(end_checks=False)
    finally:
        # Only remove the uniquely named container created above, with its
        # anonymous test volumes. No user database or existing container.
        command(docker + ['rm', '--force', '--volumes', container])


if __name__ == '__main__':
    main()
