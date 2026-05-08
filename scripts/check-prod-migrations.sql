-- =============================================================================
-- Check applied state of migrations 20260422000000..20260508000000 in prod.
-- Read-only. Paste into the Supabase SQL editor and copy the result back.
--
-- Each row probes a unique fingerprint left by the migration (a column,
-- table, view, policy, trigger, constraint, or publication membership).
--
-- States:
--   applied     - fingerprint present
--   not_applied - fingerprint absent
--   ambiguous   - data-only migration; cannot be detected from schema alone.
--                 The probe shows the count or sample so you can judge.
-- =============================================================================

WITH probes AS (

-- 1. tee_time_reminders -- tee_time_reminder_sent table
SELECT '20260422000000' AS version, 'tee_time_reminders' AS name,
       CASE WHEN to_regclass('public.tee_time_reminder_sent') IS NOT NULL
                 AND EXISTS (SELECT 1 FROM information_schema.columns
                             WHERE table_schema='public' AND table_name='user_preferences'
                               AND column_name='push_round_reminders')
                 AND EXISTS (SELECT 1 FROM information_schema.columns
                             WHERE table_schema='public' AND table_name='courses'
                               AND column_name='timezone')
            THEN 'applied' ELSE 'not_applied' END AS state,
       'tee_time_reminder_sent table + user_preferences.push_round_reminders + courses.timezone' AS probe

UNION ALL
-- 2. update_tier_player_caps -- social=12 etc. (DATA — best-effort)
SELECT '20260422000001', 'update_tier_player_caps',
       CASE WHEN (SELECT max_players_per_competition FROM tier_limits WHERE tier::text='social') = 12
                 AND (SELECT max_players_per_competition FROM tier_limits WHERE tier::text='premium') = 40
            THEN 'applied'
            WHEN NOT EXISTS (SELECT 1 FROM tier_limits) THEN 'ambiguous'
            ELSE 'not_applied' END,
       'tier_limits social.max_players=12 AND premium.max_players=40'

UNION ALL
-- 3. reduce_free_tier_players_to_4 (DATA)
SELECT '20260422000002', 'reduce_free_tier_players_to_4',
       CASE WHEN (SELECT max_players_per_competition FROM tier_limits WHERE tier::text='free') = 4
            THEN 'applied' ELSE 'not_applied' END,
       'tier_limits free.max_players=4'

UNION ALL
-- 4. round_sub_matches -- sub_matches table + rounds.round_format
SELECT '20260422100000', 'round_sub_matches',
       CASE WHEN to_regclass('public.sub_matches') IS NOT NULL
                 AND EXISTS (SELECT 1 FROM information_schema.columns
                             WHERE table_schema='public' AND table_name='rounds'
                               AND column_name='round_format')
            THEN 'applied' ELSE 'not_applied' END,
       'sub_matches table + rounds.round_format column'

UNION ALL
-- 5. sub_match_size_expansion -- CHECK now allows up to 10
SELECT '20260422110000', 'sub_match_size_expansion',
       CASE WHEN EXISTS (
              SELECT 1 FROM pg_constraint
              WHERE conname='rounds_sub_match_size_check'
                AND conrelid='public.rounds'::regclass
                AND pg_get_constraintdef(oid) LIKE '%BETWEEN 1 AND 10%'
            )
            THEN 'applied' ELSE 'not_applied' END,
       'rounds_sub_match_size_check allows BETWEEN 1 AND 10'

UNION ALL
-- 6. round_matchup_teams -- rounds.team1_id
SELECT '20260422200000', 'round_matchup_teams',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema='public' AND table_name='rounds'
                           AND column_name='team1_id')
            THEN 'applied' ELSE 'not_applied' END,
       'rounds.team1_id column'

UNION ALL
-- 7. add_final_position_to_competition_players
SELECT '20260422210000', 'add_final_position_to_competition_players',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema='public' AND table_name='competition_players'
                           AND column_name='final_position')
            THEN 'applied' ELSE 'not_applied' END,
       'competition_players.final_position column'

UNION ALL
-- 8. add_name_to_rounds
SELECT '20260424000000', 'add_name_to_rounds',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema='public' AND table_name='rounds'
                           AND column_name='name')
            THEN 'applied' ELSE 'not_applied' END,
       'rounds.name column'

UNION ALL
-- 9. open_cache_writes_tees_coordinates -- new RLS policies
SELECT '20260424100000', 'open_cache_writes_tees_coordinates',
       CASE WHEN EXISTS (SELECT 1 FROM pg_policies
                         WHERE schemaname='public' AND tablename='tees'
                           AND policyname='Authenticated users can insert tees')
                 AND EXISTS (SELECT 1 FROM pg_policies
                             WHERE schemaname='public' AND tablename='hole_coordinates'
                               AND policyname='Authenticated users can insert hole coordinates')
            THEN 'applied' ELSE 'not_applied' END,
       'tees + hole_coordinates open insert policies'

UNION ALL
-- 10. multi_scorer_lock -- score_mismatches.entries column
SELECT '20260425000000', 'multi_scorer_lock',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema='public' AND table_name='score_mismatches'
                           AND column_name='entries')
            THEN 'applied' ELSE 'not_applied' END,
       'score_mismatches.entries column'

UNION ALL
-- 11. round_rules_override
SELECT '20260425100000', 'round_rules_override',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema='public' AND table_name='rounds'
                           AND column_name='rules_override')
            THEN 'applied' ELSE 'not_applied' END,
       'rounds.rules_override column'

UNION ALL
-- 12. advanced_round_rules_feature
SELECT '20260425110000', 'advanced_round_rules_feature',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema='public' AND table_name='tier_limits'
                           AND column_name='can_use_advanced_round_rules')
            THEN 'applied' ELSE 'not_applied' END,
       'tier_limits.can_use_advanced_round_rules column'

UNION ALL
-- 13. competition_rules_mode
SELECT '20260425120000', 'competition_rules_mode',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema='public' AND table_name='competitions'
                           AND column_name='per_round_rules_enabled')
            THEN 'applied' ELSE 'not_applied' END,
       'competitions.per_round_rules_enabled column'

UNION ALL
-- 14. team_color
SELECT '20260425130000', 'team_color',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema='public' AND table_name='teams'
                           AND column_name='color')
            THEN 'applied' ELSE 'not_applied' END,
       'teams.color column'

UNION ALL
-- 15. rename_shot_contribution_drive_to_tee_shot (DATA-ONLY — best-effort)
SELECT '20260425140000', 'rename_shot_contribution_drive_to_tee_shot',
       CASE WHEN NOT EXISTS (SELECT 1 FROM scorecards WHERE scores::text LIKE '%"drive"%')
            THEN 'applied' ELSE 'not_applied' END,
       'no scorecard.scores still contains "drive" key (false-positive if no scramble rounds existed)'

UNION ALL
-- 16. add_total_par_score_to_scorecards
SELECT '20260425150000', 'add_total_par_score_to_scorecards',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema='public' AND table_name='scorecards'
                           AND column_name='total_par_score')
            THEN 'applied' ELSE 'not_applied' END,
       'scorecards.total_par_score column'

UNION ALL
-- 17. round_pairing_source
SELECT '20260426000000', 'round_pairing_source',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema='public' AND table_name='rounds'
                           AND column_name='pairing_source')
            THEN 'applied' ELSE 'not_applied' END,
       'rounds.pairing_source column'

UNION ALL
-- 18. scorecards_realtime
SELECT '20260427000000', 'scorecards_realtime',
       CASE WHEN EXISTS (SELECT 1 FROM pg_publication_tables
                         WHERE pubname='supabase_realtime' AND tablename='scorecards')
            THEN 'applied' ELSE 'not_applied' END,
       'scorecards in supabase_realtime publication'

UNION ALL
-- 19. backfill_competition_players_accepted (DATA-ONLY — best-effort)
SELECT '20260427100000', 'backfill_competition_players_accepted',
       CASE WHEN NOT EXISTS (SELECT 1 FROM competition_players WHERE status IS DISTINCT FROM 'accepted')
            THEN 'applied' ELSE 'not_applied' END,
       'no competition_players row with status != accepted (false-positive if all rows already accepted)'

UNION ALL
-- 20. relax_competition_players_status_in_rls -- new SELECT policy body lacks "= 'accepted'"
SELECT '20260427110000', 'relax_competition_players_status_in_rls',
       CASE WHEN EXISTS (
              SELECT 1 FROM pg_policies
              WHERE schemaname='public' AND tablename='scorecards'
                AND policyname='Users can view scorecards'
                AND qual NOT LIKE '%status%=%accepted%'
            )
            THEN 'applied' ELSE 'not_applied' END,
       'scorecards SELECT policy no longer filters cp.status = accepted'

UNION ALL
-- 21. logged_out_push_tokens
SELECT '20260428100000', 'logged_out_push_tokens',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema='public' AND table_name='push_tokens'
                           AND column_name='last_user_id')
            THEN 'applied' ELSE 'not_applied' END,
       'push_tokens.last_user_id column'

UNION ALL
-- 22. fix_friend_achievement_progress
SELECT '20260429000000', 'fix_friend_achievement_progress',
       CASE WHEN EXISTS (SELECT 1 FROM pg_trigger
                         WHERE tgname='friendships_sync_achievements'
                           AND tgrelid='public.friendships'::regclass)
            THEN 'applied' ELSE 'not_applied' END,
       'friendships_sync_achievements trigger on friendships'

UNION ALL
-- 23. add_round_display_order
SELECT '20260429100000', 'add_round_display_order',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema='public' AND table_name='rounds'
                           AND column_name='display_order')
                 AND EXISTS (SELECT 1 FROM pg_proc
                             WHERE proname='reorder_competition_rounds')
            THEN 'applied' ELSE 'not_applied' END,
       'rounds.display_order column + reorder_competition_rounds() function'

UNION ALL
-- 24. team_prize_pool
SELECT '20260430000000', 'team_prize_pool',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema='public' AND table_name='competition_prize_pools'
                           AND column_name='target_type')
                 AND EXISTS (SELECT 1 FROM pg_proc WHERE proname='settle_team_prize_pool')
            THEN 'applied' ELSE 'not_applied' END,
       'competition_prize_pools.target_type + settle_team_prize_pool() function'

UNION ALL
-- 25. add_sub_match_id_to_skins_games
SELECT '20260430000001', 'add_sub_match_id_to_skins_games',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema='public' AND table_name='skins_games'
                           AND column_name='sub_match_id')
            THEN 'applied' ELSE 'not_applied' END,
       'skins_games.sub_match_id column'

UNION ALL
-- 26. create_shot_log
SELECT '20260501000000', 'create_shot_log',
       CASE WHEN to_regclass('public.shot_log') IS NOT NULL
            THEN 'applied' ELSE 'not_applied' END,
       'shot_log table'

UNION ALL
-- 27. create_hole_hazards
SELECT '20260501000001', 'create_hole_hazards',
       CASE WHEN to_regclass('public.hole_hazards') IS NOT NULL
            THEN 'applied' ELSE 'not_applied' END,
       'hole_hazards table'

UNION ALL
-- 28. fix_shot_log_rls_status_value -- policy now uses 'in-progress' (hyphen)
SELECT '20260501100000', 'fix_shot_log_rls_status_value',
       CASE WHEN to_regclass('public.shot_log') IS NULL THEN 'not_applied'
            WHEN EXISTS (
              SELECT 1 FROM pg_policies
              WHERE schemaname='public' AND tablename='shot_log' AND policyname='shot_log_insert'
                AND with_check LIKE '%in-progress%'
            )
            THEN 'applied' ELSE 'not_applied' END,
       'shot_log_insert policy uses ''in-progress'' (hyphen) not ''in_progress'''

UNION ALL
-- 29. create_client_diagnostics
SELECT '20260501172242', 'create_client_diagnostics',
       CASE WHEN to_regclass('public.client_diagnostics') IS NOT NULL
            THEN 'applied' ELSE 'not_applied' END,
       'client_diagnostics table'

UNION ALL
-- 30. refresh_eastern_hole_coordinates (DATA — ambiguous)
SELECT '20260502170000', 'refresh_eastern_hole_coordinates',
       CASE WHEN (SELECT COUNT(*) FROM hole_coordinates
                  WHERE course_id IN (
                    '1675ce13-eedb-4079-8f05-4cb20fcd4245'::uuid,
                    'a58e1ef6-4b30-4b81-b2a2-2ad050588291'::uuid,
                    '56b68500-a412-4b25-99c1-dedb4f753548'::uuid,
                    '41b5a1e5-b88b-48f4-8b52-5d843c595fde'::uuid,
                    '7f8314bc-bc75-4b7c-acff-c969ad1f5b61'::uuid,
                    '00a3e80c-8c1a-4fda-9f3d-9ec326e891a6'::uuid)) > 0
            THEN 'ambiguous' ELSE 'not_applied' END,
       'hole_coordinates rows for the 6 Eastern course IDs (cannot prove fresh data — manual check needed)'

UNION ALL
-- 31. create_player_bag
SELECT '20260504000000', 'create_player_bag',
       CASE WHEN to_regclass('public.player_bag') IS NOT NULL
            THEN 'applied' ELSE 'not_applied' END,
       'player_bag table'

UNION ALL
-- 32. add_shot_log_from_bunker
SELECT '20260505000000', 'add_shot_log_from_bunker',
       CASE WHEN to_regclass('public.shot_log') IS NULL THEN 'not_applied'
            WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema='public' AND table_name='shot_log'
                           AND column_name='from_bunker')
            THEN 'applied' ELSE 'not_applied' END,
       'shot_log.from_bunker column + detect-bunker trigger'

UNION ALL
-- 33. create_sand_save_views
SELECT '20260505000001', 'create_sand_save_views',
       CASE WHEN to_regclass('public.v_sand_save_attempts') IS NOT NULL
                 AND to_regclass('public.v_sand_saves') IS NOT NULL
            THEN 'applied' ELSE 'not_applied' END,
       'v_sand_save_attempts + v_sand_saves views'

UNION ALL
-- 34. add_course_id_to_sand_save_views
SELECT '20260506000000', 'add_course_id_to_sand_save_views',
       CASE WHEN to_regclass('public.v_sand_saves') IS NULL THEN 'not_applied'
            WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema='public' AND table_name='v_sand_saves'
                           AND column_name='course_id')
            THEN 'applied' ELSE 'not_applied' END,
       'v_sand_saves.course_id column'

UNION ALL
-- 35. add_shot_log_accuracy
SELECT '20260507000000', 'add_shot_log_accuracy',
       CASE WHEN to_regclass('public.shot_log') IS NULL THEN 'not_applied'
            WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema='public' AND table_name='shot_log'
                           AND column_name='accuracy_meters')
            THEN 'applied' ELSE 'not_applied' END,
       'shot_log.accuracy_meters column'

UNION ALL
-- 36. create_custom_hole_tees
SELECT '20260508000000', 'create_custom_hole_tees',
       CASE WHEN to_regclass('public.custom_hole_tees') IS NOT NULL
            THEN 'applied' ELSE 'not_applied' END,
       'custom_hole_tees table'

)
SELECT version, name, state, probe FROM probes ORDER BY version;
