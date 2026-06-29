-- Consolidate round-completion notifications to a single push per player
--
-- Problem: when a round finished, the organiser received one notification PER
-- player rather than a single "Round Complete". Two triggers fire on the same
-- scorecard transition (status -> 'completed'):
--
--   1. trigger_notify_round_completed  -> notify_round_completed()
--        Sends ONE "Round Complete" notification to every player. (correct)
--
--   2. on_scorecard_submitted          -> notify_scorecard_submitted()
--        Sends a SEPARATE "<player> submitted their scorecard for Round N"
--        notification to the ORGANISER, once per non-organiser scorecard.
--
-- The Nineteenth's primary scoring model is one device scoring the whole group:
-- the organiser submits everyone's cards at once, so every scorecard flips to
-- 'completed' together and trigger #2 fires N times -> the organiser gets N
-- per-player pushes plus the single "Round Complete". (Confirmed in prod: an
-- organiser received 7 'scorecard_submitted' notifications for one round while
-- every other player received only the single 'round_completed'.)
--
-- Fix: remove trigger #2 so the organiser receives only the single
-- "Round Complete" that trigger #1 already sends to everyone. We drop the
-- trigger but keep the notify_scorecard_submitted() function defined so the
-- behaviour can be re-introduced later (e.g. gated to genuine multi-device /
-- multi-scorer rounds) by simply re-creating the trigger.

DROP TRIGGER IF EXISTS on_scorecard_submitted ON scorecards;

COMMENT ON FUNCTION notify_scorecard_submitted IS
  'Notifies the competition organiser when a non-organiser scorecard is '
  'completed. Intentionally NOT wired to a trigger as of migration '
  '20260629010000: in the single-device group-scoring model it produced one '
  'push per player when the organiser submitted the whole group. Players still '
  'receive a single "Round Complete" via notify_round_completed(). Re-create '
  'the on_scorecard_submitted trigger if per-submission notifications are '
  'wanted for multi-device rounds.';
