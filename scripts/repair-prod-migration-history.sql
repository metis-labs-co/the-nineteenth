-- =============================================================================
-- Mark all 36 manually-applied migrations as `applied` in
-- supabase_migrations.schema_migrations so the CLI's next `db push` won't
-- try to re-apply them.
--
-- Run in the prod (bvnxfhuvocxyilhlenka) Supabase SQL editor.
-- Idempotent — safe to re-run (ON CONFLICT DO NOTHING).
--
-- This only writes to the migration tracking table. No schema or data
-- changes — equivalent to what `supabase migration repair --status applied`
-- does, just bypassing the CLI/pooler.
-- =============================================================================

INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES
  ('20260422000000', 'tee_time_reminders',                            '{}'),
  ('20260422000001', 'update_tier_player_caps',                       '{}'),
  ('20260422000002', 'reduce_free_tier_players_to_4',                 '{}'),
  ('20260422100000', 'round_sub_matches',                             '{}'),
  ('20260422110000', 'sub_match_size_expansion',                      '{}'),
  ('20260422200000', 'round_matchup_teams',                           '{}'),
  ('20260422210000', 'add_final_position_to_competition_players',     '{}'),
  ('20260424000000', 'add_name_to_rounds',                            '{}'),
  ('20260424100000', 'open_cache_writes_tees_coordinates',            '{}'),
  ('20260425000000', 'multi_scorer_lock',                             '{}'),
  ('20260425100000', 'round_rules_override',                          '{}'),
  ('20260425110000', 'advanced_round_rules_feature',                  '{}'),
  ('20260425120000', 'competition_rules_mode',                        '{}'),
  ('20260425130000', 'team_color',                                    '{}'),
  ('20260425140000', 'rename_shot_contribution_drive_to_tee_shot',    '{}'),
  ('20260425150000', 'add_total_par_score_to_scorecards',             '{}'),
  ('20260426000000', 'round_pairing_source',                          '{}'),
  ('20260427000000', 'scorecards_realtime',                           '{}'),
  ('20260427100000', 'backfill_competition_players_accepted',         '{}'),
  ('20260427110000', 'relax_competition_players_status_in_rls',       '{}'),
  ('20260428100000', 'logged_out_push_tokens',                        '{}'),
  ('20260429000000', 'fix_friend_achievement_progress',               '{}'),
  ('20260429100000', 'add_round_display_order',                       '{}'),
  ('20260430000000', 'team_prize_pool',                               '{}'),
  ('20260430000001', 'add_sub_match_id_to_skins_games',               '{}'),
  ('20260501000000', 'create_shot_log',                               '{}'),
  ('20260501000001', 'create_hole_hazards',                           '{}'),
  ('20260501100000', 'fix_shot_log_rls_status_value',                 '{}'),
  ('20260501172242', 'create_client_diagnostics',                     '{}'),
  ('20260502170000', 'refresh_eastern_hole_coordinates',              '{}'),
  ('20260504000000', 'create_player_bag',                             '{}'),
  ('20260505000000', 'add_shot_log_from_bunker',                      '{}'),
  ('20260505000001', 'create_sand_save_views',                        '{}'),
  ('20260506000000', 'add_course_id_to_sand_save_views',              '{}'),
  ('20260507000000', 'add_shot_log_accuracy',                         '{}'),
  ('20260508000000', 'create_custom_hole_tees',                       '{}')
ON CONFLICT (version) DO NOTHING;

-- Verify: should return all 36 rows.
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version BETWEEN '20260422000000' AND '20260508000000'
ORDER BY version;
