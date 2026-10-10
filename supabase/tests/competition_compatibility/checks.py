"""Real PostgreSQL tests. Called only against the runner's disposable container."""
import json
import queue
import subprocess
import threading
import time
import uuid

CONTAINER = None
DOCKER = None


class Session:
    def __init__(self, actor=None):
        if CONTAINER is None or DOCKER is None:
            raise RuntimeError('Use run.py to create and configure a disposable local container.')
        self.name = 'compat_' + uuid.uuid4().hex
        self.process = subprocess.Popen(
            DOCKER + ['exec', '-i', CONTAINER, 'psql', '-XqAt', '-U', 'postgres',
             '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose'],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, bufsize=1)
        self.lines = queue.Queue()
        def read():
            for line in self.process.stdout:
                self.lines.put(line.rstrip())
            self.lines.put(None)
        self.reader = threading.Thread(target=read, daemon=True)
        self.reader.start()
        self.query(f"SET application_name='{self.name}'; SET statement_timeout='5s'; SET client_min_messages=error;")
        if actor:
            self.query(f"BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims='{json.dumps({'sub': actor, 'role': 'authenticated'})}';")

    def send(self, sql):
        self.token = 'checkpoint_' + uuid.uuid4().hex
        self.process.stdin.write(sql + '\n\\echo ' + self.token + '\n')
        self.process.stdin.flush()

    def receive(self, timeout=8):
        lines = []
        deadline = time.monotonic() + timeout
        while True:
            line = self.lines.get(timeout=max(0.001, deadline-time.monotonic()))
            if line is None:
                raise AssertionError('\n'.join(lines))
            if line == self.token:
                return '\n'.join(lines)
            lines.append(line)

    def query(self, sql):
        self.send(sql)
        return self.receive()

    def close(self):
        if self.process.poll() is None:
            self.process.stdin.close()  # psql exits; any open transaction rolls back
            self.process.wait(timeout=8)
        self.process.stdout.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()


PLAYERS = [str(uuid.uuid4()) for _ in range(5)]
COMPETITION = str(uuid.uuid4())


def fixture():
    with Session() as db:
        # Fail on fixture collisions: tests never use existing players or rounds.
        for i, player in enumerate(PLAYERS):
            db.query(f"INSERT INTO auth.users(id,email) VALUES('{player}','compat-{player}@example.test');")
        db.query(f"""INSERT INTO competitions(id,name,start_date,end_date,handicap_system,invite_code,organizer_id)
          VALUES('{COMPETITION}','Local competition compatibility',CURRENT_DATE,CURRENT_DATE,'honor','{COMPETITION[:8]}','{PLAYERS[4]}');
          INSERT INTO competition_players(competition_id,player_id,status)
          SELECT '{COMPETITION}',id,'accepted' FROM players WHERE id IN ({','.join(repr(p) for p in PLAYERS[:4])});""")


def new_round(nine='full', social=False):
    round_id = str(uuid.uuid4())
    with Session() as db:
        if social:
            db.query(f"INSERT INTO rounds(id,user_id,status,nine_type) VALUES('{round_id}','{PLAYERS[0]}','in-progress','{nine}');")
            db.query(f"INSERT INTO round_players(round_id,player_id,invitation_status) SELECT '{round_id}',id,'accepted' FROM players WHERE id IN ({','.join(repr(p) for p in PLAYERS[:4])});")
        else:
            db.query(f"""INSERT INTO rounds(id,competition_id,round_number,status,nine_type)
              SELECT '{round_id}','{COMPETITION}',coalesce(max(round_number),0)+1,'in-progress','{nine}'
              FROM rounds WHERE competition_id='{COMPETITION}';
              INSERT INTO pairings(round_id,player_ids) VALUES
              ('{round_id}',ARRAY['{PLAYERS[0]}','{PLAYERS[1]}']::uuid[]),
              ('{round_id}',ARRAY['{PLAYERS[2]}','{PLAYERS[3]}']::uuid[]);""")
    return round_id


def snapshot(round_id, player, revision='NULL', shape=True, hole=1, status='in-progress', strokes=4):
    payload = {'scores': {str(hole): {'strokes': strokes}}, 'total_gross': strokes, 'status': status}
    if shape:
        payload['expected_round_shape'] = shape if isinstance(shape, dict) else {'nine_type': 'full', 'holes_played': None}
    return f"SELECT applied,conflict,server_revision FROM write_scorecard_snapshot('{round_id}','{player}',{revision},'{json.dumps(payload)}');"


def upsert(round_id, player, hole=1, status='in-progress'):
    return f"""INSERT INTO scorecards(round_id,player_id,scores,total_gross,status)
      VALUES('{round_id}','{player}','{{"{hole}":{{"strokes":4}}}}',4,'{status}')
      ON CONFLICT(round_id,player_id) DO UPDATE SET scores=excluded.scores,
        total_gross=excluded.total_gross,status=excluded.status;"""


def entry(round_id, player, scorer, hole=1, strokes=4):
    return f"""INSERT INTO score_entries(round_id,player_id,scorer_id,hole_number,strokes)
      VALUES('{round_id}','{player}','{scorer}',{hole},{strokes})
      ON CONFLICT(round_id,player_id,hole_number,scorer_id) DO UPDATE SET strokes=excluded.strokes;"""


def independent_groups(kind, existing=False, rollback=False):
    round_id = new_round()
    def write(group):
        player, scorer = PLAYERS[group+1], PLAYERS[group]
        if kind == 'snapshot':
            return snapshot(round_id, player, '1' if existing else 'NULL')
        if kind == 'legacy snapshot':
            return snapshot(round_id, player, '1' if existing else 'NULL', shape=False)
        if kind == 'upsert':
            return upsert(round_id, player)
        return entry(round_id, player, scorer, strokes=5 if existing else 4)
    if existing:
        for group in (0, 2):
            with Session(PLAYERS[group]) as db:
                db.query(entry(round_id, PLAYERS[group+1], PLAYERS[group]) if kind == 'entry'
                         else upsert(round_id, PLAYERS[group+1]))
                db.query('COMMIT;')
    with Session(PLAYERS[0]) as a, Session(PLAYERS[2]) as b:
        a.query(write(0))  # Completed statement; keep its locks until explicit release.
        b.query(write(2))  # Must finish while A is uncommitted, without a busy retry.
        b.query('COMMIT;')
        a.query('ROLLBACK;' if rollback else 'COMMIT;')
    if rollback:
        with Session(PLAYERS[0]) as a:
            a.query(write(0))
            a.query('COMMIT;')
    table = 'score_entries' if kind == 'entry' else 'scorecards'
    with Session() as db:
        assert db.query(f"SELECT count(*) FROM {table} WHERE round_id='{round_id}';") == '2'
        assert db.query(f"SELECT holes_played IS NULL FROM rounds WHERE id='{round_id}';") == 't'
        if kind == 'entry':
            assert db.query(f"SELECT bool_and(strokes={5 if existing else 4}) FROM score_entries WHERE round_id='{round_id}';") == 't'
        else:
            revision = 2 if existing and kind.endswith('snapshot') else 1
            assert db.query(f"SELECT bool_and(revision={revision} AND total_gross=4 AND scores->'1'->>'strokes'='4') FROM scorecards WHERE round_id='{round_id}';") == 't'


def legacy_nine(nine, hole):
    round_id = new_round(nine)
    with Session(PLAYERS[0]) as a, Session(PLAYERS[2]) as b:
        a.query(snapshot(round_id, PLAYERS[1], shape=False, hole=hole))
        b.query(upsert(round_id, PLAYERS[3], hole=hole))
        b.query(entry(round_id, PLAYERS[3], PLAYERS[2], hole=hole))
        b.query('COMMIT;')
        a.query(entry(round_id, PLAYERS[1], PLAYERS[0], hole=hole))
        a.query('COMMIT;')
    with Session() as db:
        assert db.query(f"SELECT count(*) FROM scorecards WHERE round_id='{round_id}' AND scores ? '{hole}';") == '2'
        assert db.query(f"SELECT count(*) FROM score_entries WHERE round_id='{round_id}' AND hole_number={hole};") == '2'


def completion_and_other_group():
    # The completion AFTER trigger takes the ordinary non-key UPDATE lock on
    # the round. A new group's insert and entries must remain compatible.
    round_id = new_round()
    with Session(PLAYERS[0]) as a:
        a.query(upsert(round_id, PLAYERS[1]))
        a.query('COMMIT;')
    with Session(PLAYERS[0]) as a, Session(PLAYERS[2]) as b:
        assert a.query(snapshot(round_id, PLAYERS[1], '1', status='completed')) == 't|f|2'
        b.query(upsert(round_id, PLAYERS[3]))
        b.query(entry(round_id, PLAYERS[3], PLAYERS[2]))
        b.query('COMMIT;')
        a.query('COMMIT;')
    with Session() as db:
        assert db.query(f"SELECT completion_notified FROM rounds WHERE id='{round_id}';") == 't'
        assert db.query(f"SELECT count(*) FROM notifications WHERE round_id='{round_id}' AND type='round_completed';") == '4'


def simultaneous_completion():
    round_id = new_round()
    for group in (0, 2):
        with Session(PLAYERS[group]) as db:
            db.query(upsert(round_id, PLAYERS[group+1]))
            db.query('COMMIT;')
    with Session(PLAYERS[0]) as a, Session(PLAYERS[2]) as b:
        assert a.query(snapshot(round_id, PLAYERS[1], '1', status='completed')) == 't|f|2'
        assert b.query(snapshot(round_id, PLAYERS[3], '1', status='completed')) == 't|f|2'
        b.query('COMMIT;')
        a.query('COMMIT;')
    with Session() as db:
        assert db.query(f"SELECT count(*) FROM scorecards WHERE round_id='{round_id}' AND status='completed' AND revision=2;") == '2'
        # Existing trigger counts committed cards per statement. Concurrent
        # completions can each miss the other transaction; do not hide that
        # pre-existing notification limitation behind a compatibility claim.
        assert db.query(f"SELECT completion_notified FROM rounds WHERE id='{round_id}';") == 'f'


def wait_for_lock(observer, session):
    deadline = time.monotonic() + 3
    while time.monotonic() < deadline:
        if session.process.poll() is not None:
            session.receive()
        if observer.query(f"SELECT count(*) FROM pg_stat_activity WHERE application_name='{session.name}' AND wait_event_type='Lock';") == '1':
            return
        time.sleep(0.01)
    raise AssertionError('second session never reached the expected database lock wait')


def same_card_upsert_completion():
    round_id = new_round()
    with Session(PLAYERS[0]) as a:
        a.query(upsert(round_id, PLAYERS[1]))
        a.query('COMMIT;')
    with Session(PLAYERS[0]) as a, Session(PLAYERS[0]) as b, Session() as observer:
        a.query(f"SELECT id FROM scorecards WHERE round_id='{round_id}' FOR UPDATE;")
        b.send(upsert(round_id, PLAYERS[1], status='completed'))
        wait_for_lock(observer, b)
        # B's compatible parent lock must not prevent A's completion trigger.
        assert a.query(snapshot(round_id, PLAYERS[1], '1', status='completed')) == 't|f|2'
        a.query('COMMIT;')
        b.receive()
        b.query('COMMIT;')
    with Session() as db:
        assert db.query(f"SELECT revision,status FROM scorecards WHERE round_id='{round_id}';") == '2|completed'


def expect_error(operation, hint):
    try:
        operation()
    except AssertionError as error:
        assert hint in str(error), str(error)
    else:
        raise AssertionError('Expected SQL rejection: ' + hint)


def end_interlocks(entry_write=False):
    round_id = new_round(social=True)
    with Session(PLAYERS[0]) as a, Session(PLAYERS[0]) as b, Session() as observer:
        a.query(entry(round_id, PLAYERS[0], PLAYERS[0], hole=7) if entry_write
                else snapshot(round_id, PLAYERS[0], hole=7))
        b.send(f"SELECT end_round_early('{round_id}',6);")
        wait_for_lock(observer, b)
        a.query('COMMIT;')
        b.receive()
        b.query('COMMIT;')
    with Session() as db:
        assert db.query(f"SELECT holes_played FROM rounds WHERE id='{round_id}';") == '6'
        assert db.query(f"SELECT count(*) FROM score_entries WHERE round_id='{round_id}' AND hole_number=7;") == '0'
        assert db.query(f"SELECT count(*) FROM scorecards WHERE round_id='{round_id}' AND scores ? '7';") == '0'


def end_first():
    round_id = new_round(social=True)
    with Session(PLAYERS[0]) as a:
        a.query(f"SELECT end_round_early('{round_id}',6);")
        for statement in (snapshot(round_id, PLAYERS[0]), entry(round_id, PLAYERS[0], PLAYERS[0])):
            with Session(PLAYERS[0]) as b:
                expect_error(lambda: b.query(statement), 'round_scoring_busy')
        a.query('COMMIT;')
    for statement, hint in (
        (snapshot(round_id, PLAYERS[0]), 'round_shape_changed'),
        (snapshot(round_id, PLAYERS[0], shape=False), 'round_shape_changed'),
        (entry(round_id, PLAYERS[0], PLAYERS[0], hole=7), 'round_score_out_of_play'),
        (snapshot(round_id, PLAYERS[0], shape={'nine_type': 'full', 'holes_played': 6}, hole=7), 'round_score_out_of_play'),
    ):
        with Session(PLAYERS[0]) as b:
            expect_error(lambda: b.query(statement), hint)
    with Session(PLAYERS[0]) as b:
        assert b.query(snapshot(round_id, PLAYERS[0], shape={'nine_type': 'full', 'holes_played': 6})) == 't|f|1'
        b.query(entry(round_id, PLAYERS[0], PLAYERS[0]))
        b.query('COMMIT;')


def existing_card_end_orders():
    round_id = new_round(social=True)
    with Session(PLAYERS[0]) as a:
        a.query(snapshot(round_id, PLAYERS[0], hole=7))
        a.query('COMMIT;')
    with Session(PLAYERS[0]) as a, Session(PLAYERS[0]) as b:
        a.query(snapshot(round_id, PLAYERS[0], '1', hole=7))
        expect_error(lambda: b.query(f"SELECT end_round_early('{round_id}',6);"), 'round_scorecards_busy')
        a.query('COMMIT;')
    with Session(PLAYERS[0]) as a, Session(PLAYERS[0]) as b, Session() as observer:
        a.query(f"SELECT end_round_early('{round_id}',6);")
        b.send(snapshot(round_id, PLAYERS[0], '2', hole=7))
        wait_for_lock(observer, b)
        a.query('COMMIT;')
        expect_error(b.receive, 'round_shape_changed')
    with Session() as db:
        assert db.query(f"SELECT revision,scores FROM scorecards WHERE round_id='{round_id}';") == '2|{}'


def entry_row_first():
    round_id = new_round(social=True)
    with Session(PLAYERS[0]) as a:
        a.query(entry(round_id, PLAYERS[0], PLAYERS[0], hole=7))
        a.query('COMMIT;')
    with Session(PLAYERS[0]) as a, Session(PLAYERS[0]) as b, Session() as observer:
        a.query(f"SELECT id FROM score_entries WHERE round_id='{round_id}' FOR UPDATE;")
        b.send(f"SELECT end_round_early('{round_id}',6);")
        wait_for_lock(observer, b)
        expect_error(lambda: a.query(f"UPDATE score_entries SET strokes=5 WHERE round_id='{round_id}';"), 'round_scoring_busy')
        b.receive()
        b.query('COMMIT;')


def ordinary_permissions():
    round_id = new_round()
    with Session(PLAYERS[0]) as a:
        assert a.query(f"UPDATE rounds SET name='forbidden' WHERE id='{round_id}' RETURNING id;") == ''
        expect_error(lambda: a.query(f"SELECT end_round_early('{round_id}',6);"), '42501')
    outsider = str(uuid.uuid4())
    with Session() as db:
        db.query(f"INSERT INTO auth.users(id,email) VALUES('{outsider}','{outsider}@example.test');")
    with Session(outsider) as a:
        expect_error(lambda: a.query(snapshot(round_id, PLAYERS[1])), '42501')


def competition_end_during_scoring():
    for kind in ('snapshot', 'entry'):
        round_id = new_round()
        with Session(PLAYERS[0]) as a, Session(PLAYERS[2]) as b:
            a.query(snapshot(round_id, PLAYERS[1]) if kind == 'snapshot'
                    else entry(round_id, PLAYERS[1], PLAYERS[0]))
            # Keep the ordinary writer's parent lock until B has been rejected.
            # A lock-first end would time out instead of returning this error.
            expect_error(lambda: b.query(f"SELECT end_round_early('{round_id}',6);"),
                         '42501: Only social rounds can be ended early')
            a.query('COMMIT;')
        with Session() as db:
            assert db.query(f"SELECT holes_played IS NULL FROM rounds WHERE id='{round_id}';") == 't'
            if kind == 'snapshot':
                assert db.query(f"SELECT revision,total_gross,scores->'1'->>'strokes' FROM scorecards WHERE round_id='{round_id}';") == '1|4|4'
            else:
                assert db.query(f"SELECT strokes FROM score_entries WHERE round_id='{round_id}';") == '4'


def reclassification():
    round_id = new_round()
    with Session(PLAYERS[0]) as a, Session() as b, Session() as observer:
        a.query(snapshot(round_id, PLAYERS[1], hole=7))
        b.send(f"UPDATE rounds SET competition_id=NULL,user_id='{PLAYERS[0]}' WHERE id='{round_id}';")
        wait_for_lock(observer, b)
        a.query('COMMIT;')
        b.receive()
    with Session(PLAYERS[0]) as a:
        a.query(f"SELECT end_round_early('{round_id}',6);")
        a.query('COMMIT;')
    with Session() as db:
        assert db.query(f"SELECT scores FROM scorecards WHERE round_id='{round_id}';") == '{}'


def main(end_checks=True):
    global PLAYERS, COMPETITION
    PLAYERS = [str(uuid.uuid4()) for _ in range(5)]
    COMPETITION = str(uuid.uuid4())
    fixture()
    failures = []
    for kind in ('snapshot', 'legacy snapshot', 'upsert', 'entry'):
        for existing in (False, True):
            label = f'two ordinary groups: {kind}, {"update" if existing else "insert"}'
            try:
                independent_groups(kind, existing, rollback=True)
                print('PASS', label, flush=True)
            except Exception as error:
                failures.append(label)
                print('FAIL', label, str(error), flush=True)
    cases = [
        ('legacy front9 payload outside planned nine', lambda: legacy_nine('front9', 10)),
        ('legacy back9 payload outside planned nine', lambda: legacy_nine('back9', 1)),
        ('completion notification and independent group', completion_and_other_group),
        ('simultaneous independent completed snapshots persist', simultaneous_completion),
        ('same-card legacy upsert waits while snapshot completes', same_card_upsert_completion),
        ('ordinary scorer permissions and outsider denial', ordinary_permissions),
    ]
    if end_checks:
        cases += [
        ('competition end rejected before waiting on ordinary scoring', competition_end_during_scoring),
        ('missing card writer first, end waits and trims', end_interlocks),
        ('entry writer first, end waits and deletes', lambda: end_interlocks(True)),
        ('end first refuses stale writes and accepts fresh retry', end_first),
        ('existing card versus end, both orders', existing_card_end_orders),
        ('entry row-first versus end avoids deadlock', entry_row_first),
        ('competition reclassification waits for admitted insert before ending', reclassification),
        ]
    for label, check in cases:
        try:
            check()
            print('PASS', label, flush=True)
        except Exception as error:
            failures.append(label)
            print('FAIL', label, str(error), flush=True)
    if failures:
        raise SystemExit(f'{len(failures)} failed checks')


