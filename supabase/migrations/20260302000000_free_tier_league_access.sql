-- Allow free tier users to create/join 1 league
UPDATE tier_limits SET max_leagues_owned = 1, can_create_league = TRUE, can_join_league = TRUE WHERE tier = 'free';
