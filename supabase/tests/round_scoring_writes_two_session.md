These are authored staging procedures; C3 did not connect to PostgreSQL or run any SQL. They require two independent sessions at READ COMMITTED, an administrator for fixture setup/cleanup, and the deployed A7/B1/C3 migrations plus C4/C5 adapters for client-level checks. Run only in a disposable staging database. Use verbose psql errors to capture SQLSTATE and HINT. Record before/after round, scorecard, entry, side-game, mismatch, shot-log and combination rows; a refusal must leave them unchanged.

The known pooler port is **6543**. Use the approved heredoc recipe in each session, with `SET default_transaction_read_only = off;`, `show transaction_read_only;` (must print `off`), then `BEGIN; ... COMMIT;` or `ROLLBACK;`. Do not use `PGOPTIONS` or combine `-c SET` with `--single-transaction`. For interactive lock scheduling, issue those same statements manually and stop at the stated checkpoints. Never commit migration application merely to run a dry run.

A single rollback fixture is invisible to another session. The following isolated fixture must therefore be committed, then explicitly removed. Use a fresh fixture for each schedule; a committed end cannot be undone by clearing its marker. Names and UUIDs below are exclusively fixture data; check that they do not already exist and stop on any collision. Do not apply this recipe to real players/rounds.

```bash
psql "$DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
SET default_transaction_read_only = off;
show transaction_read_only;
BEGIN;
INSERT INTO auth.users(id,email) VALUES
 ('fa000000-0000-0000-0000-000000000001','c3-lock-owner@example.com'),
 ('fa000000-0000-0000-0000-000000000002','c3-lock-organizer@example.com');
INSERT INTO players(id,name,email) VALUES
 ('fa000000-0000-0000-0000-000000000001','C3 lock owner','c3-lock-owner@example.com'),
 ('fa000000-0000-0000-0000-000000000002','C3 lock organizer','c3-lock-organizer@example.com')
 ON CONFLICT(id) DO NOTHING;
INSERT INTO clubs(id,source,name) VALUES
 ('fa000000-0000-0000-0005-000000000001','manual','C3 lock club');
INSERT INTO courses(id,club_id,name) VALUES
 ('fa000000-0000-0000-0006-000000000001','fa000000-0000-0000-0005-000000000001','C3 lock course');
INSERT INTO rounds(id,user_id,status,nine_type)
 SELECT ('fa000000-0000-0000-0001-'||lpad(i::TEXT,12,'0'))::UUID,
 'fa000000-0000-0000-0000-000000000001','in-progress',
 CASE i WHEN 4 THEN 'front9' WHEN 5 THEN 'back9' ELSE 'full' END
 FROM generate_series(1,5) i;
INSERT INTO round_players(round_id,player_id,invitation_status)
 SELECT id,'fa000000-0000-0000-0000-000000000001','accepted'
 FROM rounds WHERE id::TEXT LIKE 'fa000000-0000-0000-0001-%';
INSERT INTO scorecards(id,round_id,player_id,status,scores,total_gross)
 VALUES ('fa000000-0000-0000-0007-000000000001','fa000000-0000-0000-0001-000000000001',
 'fa000000-0000-0000-0000-000000000001','in-progress','{"1":{"strokes":4},"7":{"strokes":5}}',9);
INSERT INTO scorecards(id,round_id,player_id,status,scores,total_gross,handicap_differential)
 SELECT ('fa000000-0000-0000-0007-'||lpad(i::TEXT,12,'0'))::UUID,
 ('fa000000-0000-0000-0001-'||lpad(i::TEXT,12,'0'))::UUID,
 'fa000000-0000-0000-0000-000000000001','completed',
 (SELECT jsonb_object_agg(h::TEXT,jsonb_build_object('strokes',4))
 FROM generate_series(CASE i WHEN 4 THEN 1 ELSE 10 END,CASE i WHEN 4 THEN 9 ELSE 18 END) h),36,12
 FROM generate_series(4,5) i;
-- Entries deliberately have no parent card: their own round lock is necessary.
INSERT INTO score_entries(id,round_id,player_id,scorer_id,hole_number,strokes) VALUES
 ('fa000000-0000-0000-0008-000000000001','fa000000-0000-0000-0001-000000000003',
 'fa000000-0000-0000-0000-000000000001','fa000000-0000-0000-0000-000000000001',7,4);
INSERT INTO competitions(id,name,start_date,end_date,handicap_system,visibility,invite_code,organizer_id,status)
 VALUES ('fa000000-0000-0000-0004-000000000001','C3 lock competition',CURRENT_DATE,CURRENT_DATE,
 'honor','private','C3LOCK-001','fa000000-0000-0000-0000-000000000002','upcoming');
INSERT INTO competition_players(competition_id,player_id,status) VALUES
 ('fa000000-0000-0000-0004-000000000001','fa000000-0000-0000-0000-000000000001','accepted');
INSERT INTO rounds(id,competition_id,round_number,status,nine_type) VALUES
 ('fa000000-0000-0000-0001-000000000006','fa000000-0000-0000-0004-000000000001',1,'in-progress','full');
INSERT INTO scorecards(id,round_id,player_id,status,scores,total_gross) VALUES
 ('fa000000-0000-0000-0007-000000000006','fa000000-0000-0000-0001-000000000006',
 'fa000000-0000-0000-0000-000000000001','in-progress','{"1":{"strokes":4}}',4);
COMMIT;
SQL
```

At the start of each writer/end transaction in A and B, use:

```sql
SET default_transaction_read_only = off;
show transaction_read_only;
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"fa000000-0000-0000-0000-000000000001","role":"authenticated"}';
```

End commands below return VOID. Snapshot commands return the original five columns. A SQL error aborts its transaction unless contained in a savepoint: use `SAVEPOINT attempt;` before an expected rejection and `ROLLBACK TO SAVEPOINT attempt;` afterward when inspecting the same transaction. Capture `current_setting('app.round_scoring_write', true)` before/after success, refusal, conflict and unique violation. It must equal the prior value (missing is represented by empty text after first use). Check that a prior context for another round/card cannot authorize a direct scoring mutation. Clients cannot call the private helpers.

1. **Existing card, writer first.** A calls the following and leaves its transaction open:

   ```sql
   SELECT * FROM write_scorecard_snapshot(
     'fa000000-0000-0000-0001-000000000001','fa000000-0000-0000-0000-000000000001',1,
     '{"scores":{"1":{"strokes":4},"7":{"strokes":5}},"total_gross":9,"expected_round_shape":{"nine_type":"full","holes_played":null}}');
   ```

   B calls `end_round_early('fa000000-0000-0000-0001-000000000001',6)`. Expect immediate `22023 / round_scorecards_busy`, no waits/deadlock and no writes. Roll back B's attempt; commit A. Retry B: the in-progress card can now end. Repeat with A submitting `status: completed`: B first gets busy, then after A commits gets `round_has_submitted_scorecards`. The rejection must preserve all state.

2. **Existing card, end first and fresh shape after wait.** A calls the same end on a fresh fixture and holds its transaction. B invokes the snapshot above with revision 1 and stale NULL shape; B should wait on the card. Commit A. B must reject `22023 / round_shape_changed` from its fresh post-lock read, with no scores/totals/status accepted and revision still 1. Repeat with a retained-only payload (`scores: {"1":{"strokes":4}}`, stale total 9): it must also reject. Repeat with omission (legacy), with explicit correct N6 plus key 7 (out_of_play), and with correct N6/retained scores/total 4 (accepted, revision 2). Re-run this schedule with resolution and handicap_patch on their existing targets, without applying snapshot terminal restrictions to them. Confirm stable generic errors have no privileged shape DETAIL.

3. **Missing card, INSERT first.** On round 2, A calls snapshot with NULL revision, full/NULL expected shape, scores 1 and 7, total 9, then holds its transaction. Its private INSERT guard owns the round lock. B's end on round 2 waits on that round lock. Commit A; B ends and trims the now-existing in-progress card, leaving revision 1 and total 9 until a fresh client write. Repeat with A creating a completed card: after A commits, B refuses submitted. Verify neither order can produce an ended card with stale shape/totals accepted.

4. **Missing card, end first / destination move.** A ends round 2 and holds its round lock. B's missing-card snapshot must fail immediately `22023 / round_scoring_busy`. After A commits, repeating the stale NULL snapshot must fail `round_shape_changed`; rebuilding with N6 and retained totals succeeds. Repeat using an existing card from another unended fixture moved into round 2: while A holds the destination round, B gets busy; after commit an unbound protected move into the ended destination fails. Repeat with an unended competition destination to prove INSERT/move interlocks are not skipped by competition classification and ordinary scorer RLS is preserved.

5. **Entry write first.** A INSERTs/UPDATEs hole 7 on round 3 and holds its transaction. The private trigger locks the round, despite there being no parent scorecard. B's end waits on the round lock; commit A. B then ends and deletes hole 7. Verify no surviving out-of-play entry. Repeat with a retained hole 1: it survives. A guard must never silently trim-and-accept a rejected batch.

6. **Entry row first, end locks round before deletion.** A takes `SELECT * FROM score_entries WHERE id='fa000000-0000-0000-0008-000000000001' FOR UPDATE;` and holds it. B starts end on round 3; it owns the round and blocks deleting the entry. A now UPDATEs that row: its round `FOR UPDATE NOWAIT` must immediately fail `22023 / round_scoring_busy`. Roll back A so the existing row lock is released. B completes; commit B and verify hole 7 is deleted. This is a genuine row-first versus round-first schedule; an uncontended single-session test cannot prove it.

7. **End first, entry batch.** A ends round 3 and holds its transaction. B's entry INSERT/UPDATE must reject busy immediately. Commit A; resubmitting hole 7 must reject `round_score_out_of_play`, including UPDATE and moving an existing entry from a different round. Retained hole 1 succeeds if its existing RLS permits it. On the real C4 upload boundary, first commit a snapshot, then have the other device end before trailing entries: entry rejection must retain the accepted snapshot revision, leave SQLite/queue unsynced, durably repair, and prepare a new snapshot plus entries. Never claim this SQL-only task proves queue/CAS behavior.

8. **Completion notification / no SHARE upgrade deadlock.** Use competition round 6. As fixture admin, B locks its round `FOR UPDATE` and holds the transaction. A uses the actual ordinary-scorer snapshot RPC with revision 1, expected full/NULL, retained score and `status: completed`; it owns the card and may wait when the existing completion notification updates the round. B tries locking that card `FOR UPDATE NOWAIT`: raw SQL reports `55P03`, showing the opposite lock order. Roll back B; A must complete without a new SHARE-to-UPDATE deadlock, and its RPC should never fail for lacking round UPDATE rights. This manual round lock demonstrates notification compatibility; B1 correctly refuses real early ending of competition rounds. For social submission versus actual end, use schedules 1/2 and B1's `round_scorecards_busy` classification.

8a. **Actual upsert versus completing snapshot, existing conflict first.** Fresh competition round6/card6 is the ordinary scorer's own card; that scorer has no round UPDATE rights. A explicitly locks card6 `FOR UPDATE` to pause at the snapshot's existing card-first checkpoint. B executes the actual retained Quick Score operation, using a savepoint:

   ```sql
   SAVEPOINT upsert_attempt;
   INSERT INTO scorecards(round_id,player_id,scores,total_gross,status)
   VALUES('fa000000-0000-0000-0001-000000000006','fa000000-0000-0000-0000-000000000001',
     '{"1":{"strokes":5}}',5,'completed')
   ON CONFLICT(round_id,player_id) DO UPDATE SET
     scores=EXCLUDED.scores,total_gross=EXCLUDED.total_gross,status=EXCLUDED.status;
   ```

   B can acquire the round but must immediately reject `22023 / round_scoring_busy` at the private fresh conflict-card NOWAIT statement, before ON CONFLICT waits on A's card. `ROLLBACK TO SAVEPOINT upsert_attempt;` releases the locks acquired by this failed statement. A now performs its actual completing snapshot RPC with revision1/fullNULL, score1=4 and statuscompleted, and must finish its existing completion-notification round UPDATE. Commit A and roll back B. This uses the actual upsert and actual notification, not merely a manual round lock. For an overlapping notification checkpoint, instead have fixture-admin B own the round before A starts that completing RPC: A waits for B in notify; B invokes the actual upsert and must fail immediately on A's card, then B rolls back to release the earlier round lock, allowing A to finish. The earlier round lock survives rollback-to-savepoint and needs the full B rollback. No cycle or privileged caller write bypass is allowed.

8b. **Actual upsert first / completing snapshot second.** On fresh competition round6, B executes the same upsert and holds the successful transaction. Its round and existing conflict-card locks are both acquired before update; notification uses B's already-held round lock. A calls the actual completing snapshot with revision1/fullNULL, statuscompleted and fresh retained scores. It waits for the existing card, without holding a round lock. Commit B; A proceeds and reads fresh shape, then completes with revision2 and its existing notification behavior. Upsert still leaves revision1 unchanged (pre-existing direct-write semantics). Roll back or commit A deliberately, compare state and repeat the ordinary competition INSERT case with no preexisting card. Neither path may fail for lacking round UPDATE permission.

8c. **Initially absent pair becomes a conflict.** Use fresh round2, or fixture-admin remove the disposable competition card6 before this case. B's initial authorized lookup confirms no target card; pause B after that lookup. A creates the card through a guarded snapshot with NULL revision/fullNULL. While A is uncommitted, B's actual upsert must fail immediately on the round lock, even though its statement cannot yet see A's card. Commit A. In a fresh A transaction, lock the now-existing card at the completing-snapshot card-first checkpoint. B resumes its upsert prepared from the initial missing lookup: after obtaining the round it must see the newly committed card in the fresh private statement and reject busy rather than wait on the conflict row. Roll back B's failed statement; A's real completing snapshot then finishes notification. Repeat with A committing the creation between B's initial absent lookup and B's INSERT, with no subsequent A card lock: upsert takes the newly visible conflict lock and succeeds. These cases cover a committed conflict appearing after an initial probe and an uncommitted conflict; a single old visibility probe is not sufficient. No second guarded INSERT into the same round can commit a new pair while B owns the round.

8d. **Metadata transfer cannot fill the post-probe gap.** On fresh social round1, the owner card belongs to player1 and player2 has no card. B first probes `(round1, player2)` and sees missing. A transfers card1 to player2 with only `player_id` plus normal timestamps; the guard must take the round even though this remains metadata and needs no shape context. Hold A's transaction: B's actual upsert for player2 fails busy at the round, not a unique-index/card wait. A then uses the actual completing snapshot for player2 inside that transaction; its existing RLS owner permissions and metadata fields/revision remain valid. Commit A; B retries using a fresh lookup and succeeds. Repeat with A committing the transfer after B's initial probe but before B obtains the round, then A locks the transferred card at the completion checkpoint: B's fresh conflict-card lock rejects busy. Reverse order: B successfully INSERTs player2 first and holds its round lock; A's transfer of card1 to player2 must fail NOWAIT before altering that unique key, releasing its statement changes; B's completion and commit remain possible. After B rolls back its disposable INSERT, ordinary transfer must succeed and preserve every protected scoring/status/handicap/revision value. Include an id-key change and a soft-deleted conflicting row; primary-key and round/player conflicts both use NOWAIT without exposing row contents. Pure timestamp/delete/restore updates must keep working with a soft-deleted parent without joining this key-change lock branch. No lifecycle RPC is rewritten.

9. **Combination first.** As fixture admin, A inserts the complete submitted front4/back5 pair:

   ```sql
   INSERT INTO handicap_combined_rounds(player_id,front_scorecard_id,back_scorecard_id,course_id,
     combined_gross,handicap_differential,course_rating_used,slope_rating_used,effective_date)
   VALUES('fa000000-0000-0000-0000-000000000001','fa000000-0000-0000-0007-000000000004',
     'fa000000-0000-0000-0007-000000000005','fa000000-0000-0000-0006-000000000001',72,12,72,113,NOW());
   ```

   In A, set front4's unended card back to in-progress to isolate representative legacy combined history, then leave the transaction open. B ends front4: immediate `round_scorecards_busy`. Commit A; B retries and gets `round_has_combined_scorecards`. Compare the complete combination JSON unchanged. Without the legacy status change, after commit the submitted hint takes precedence.

10. **End first / combination fresh recheck.** On a fresh fixture, administrator first changes front4's unended card to in-progress and commits. A ends front4 and holds the transaction. B attempts the combination INSERT above. If A7's earlier check passed before the end was visible, B must wait on B1's `FOR SHARE` card locks and then re-read; commit A. B rejects `22023`, stores no combination, and existing history remains unchanged. Repeat with front/back statuses in-progress independently to isolate B1's submitted guard. Restore fresh complete completed/confirmed pairs as a positive control. Same-N retry after a correctly ended card is submitted/confirmed must still succeed with no re-run of trims, including when the round remains in-progress or is completed.

11. **Stats and identity interlocks.** A holds an existing ended card while changing only one of the seven valid stats; simultaneous B1 end on a fresh unended variant must refuse busy. If ending commits first, an old modal's extra keys/stale retained strokes/stale aggregates must fail; a fresh retained-only stats delta succeeds on completed/confirmed cards. Test absence/JSON null and unchanged unsupported old stats; reject invalid changed numeric/boolean/direction/hazard values, penalties, pickup flags, contribution/stroke/unknown/multi-ball changes and adding absent holes. Exercise real placeholder linking and account deletion on disposable ended cards: player_id transfer preserves every scoring field and revision. Soft delete/restore must work after the parent is deleted. A combined player+score/total write still fails. No admin/definer role bypass exists.

12. **Context/authorization and late clients.** Exercise owner, accepted participant, ordinary competition scorer, unauthorized outsider and helper denial. Use an already soft-deleted unique scorecard to force snapshot's missing-row INSERT/unique-conflict branch; verify prior context restoration. RPC patches must return false for hidden/missing targets, preserve omitted optional fields, and leave revision unchanged on confirmed/completed cards. Attempt wrong card/round/player bindings and malformed/present-NULL shapes. Simulate a timed-out client request settling late while another device ends; subsequent stale writes remain rejected by server guards and C4 must reprepare rather than relabel. Native persistence and accepted-revision queue repair are separately owned and require their own device/client QA.

After both sessions finish/roll back, run fixture-only cleanup as administrator. This commits deletion of disposable data; inspect each ID first. Delete any combinations referencing the fixture cards before rounds, then rounds/cards/entries via existing cascades, followed by the fixture competition/course/club/users. No cleanup touches real data:

```bash
psql "$DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
SET default_transaction_read_only = off;
show transaction_read_only;
BEGIN;
DELETE FROM handicap_combined_rounds WHERE front_scorecard_id IN
 ('fa000000-0000-0000-0007-000000000004','fa000000-0000-0000-0007-000000000005')
 OR back_scorecard_id IN
 ('fa000000-0000-0000-0007-000000000004','fa000000-0000-0000-0007-000000000005');
DELETE FROM rounds WHERE id IN
 ('fa000000-0000-0000-0001-000000000001','fa000000-0000-0000-0001-000000000002',
  'fa000000-0000-0000-0001-000000000003','fa000000-0000-0000-0001-000000000004',
  'fa000000-0000-0000-0001-000000000005','fa000000-0000-0000-0001-000000000006');
DELETE FROM competitions WHERE id='fa000000-0000-0000-0004-000000000001';
DELETE FROM courses WHERE id='fa000000-0000-0000-0006-000000000001';
DELETE FROM clubs WHERE id='fa000000-0000-0000-0005-000000000001';
DELETE FROM auth.users WHERE id IN
 ('fa000000-0000-0000-0000-000000000001','fa000000-0000-0000-0000-000000000002');
COMMIT;
SQL
```

Capture actual server version/isolation level, SQLSTATE/HINT, lock behavior, complete before/after state and successful cleanup in the rollout report. Catalog/static/Jest checks cannot replace this evidence. Schema/trigger drift may require first-run fixture adjustments; stop and review unexpected behavior before rollout.
