# API Endpoints - The Nineteenth

**Backend:** Supabase (PostgreSQL + Supabase Client SDK)
**Authentication:** Supabase Auth (JWT tokens)

---

## Overview

The Nineteenth uses **Supabase** as the backend, which provides:
- PostgreSQL database with Row-Level Security (RLS)
- Auto-generated REST API
- Real-time subscriptions (Phase 2)
- Built-in authentication

**No custom API server needed** - all API calls go through Supabase client SDK.

---

## Supabase Client Setup

### Installation
```bash
pnpm add @supabase/supabase-js
```

### Configuration

```typescript
// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from '@types/supabase'; // Generated types

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage, // Persist auth state
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Not needed for mobile
  },
});
```

### TypeScript Types

Generate types from database schema:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
```

---

## Authentication Endpoints

### Sign Up

```typescript
// POST /auth/v1/signup
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure_password',
  options: {
    data: {
      name: 'John Doe', // Stored in auth.users.raw_user_meta_data
    },
  },
});

// Response
{
  user: {
    id: 'uuid',
    email: 'user@example.com',
    created_at: '2025-01-08T...',
  },
  session: {
    access_token: 'jwt_token',
    refresh_token: 'refresh_token',
  }
}
```

**After signup:** Create user profile in `public.users` table

```typescript
// Create profile
const { error } = await supabase.from('users').insert({
  id: data.user.id,
  name: 'John Doe',
  email: data.user.email,
});
```

### Login

```typescript
// POST /auth/v1/token
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure_password',
});

// Response
{
  user: { id: 'uuid', email: '...', ... },
  session: { access_token: 'jwt', refresh_token: '...', expires_in: 3600 }
}
```

### Logout

```typescript
// POST /auth/v1/logout
const { error } = await supabase.auth.signOut();
```

### Get Current User

```typescript
// GET /auth/v1/user (implicit via session)
const { data: { user } } = await supabase.auth.getUser();

// Response
{
  id: 'uuid',
  email: 'user@example.com',
  user_metadata: { name: 'John Doe' }
}
```

---

## Competitions

### Create Competition

```typescript
const { data, error } = await supabase
  .from('competitions')
  .insert({
    name: 'Spring Classic 2024',
    description: 'Annual spring tournament',
    start_date: '2024-03-15',
    end_date: '2024-03-15',
    handicap_system: 'honor',
    visibility: 'private',
    invite_code: await generateInviteCode(), // Custom function
    organizer_id: user.id,
  })
  .select()
  .single();

// Response
{
  id: 'uuid',
  name: 'Spring Classic 2024',
  invite_code: 'COMP-94821',
  organizer_id: 'user_uuid',
  created_at: '2025-01-08T...',
  ...
}
```

**Note:** `invite_code` should be generated using the database function:

```typescript
const { data } = await supabase.rpc('generate_invite_code');
// Returns: 'COMP-94821'
```

### Get Competition by ID

```typescript
const { data, error } = await supabase
  .from('competitions')
  .select('*')
  .eq('id', competitionId)
  .single();

// Response
{
  id: 'uuid',
  name: 'Spring Classic 2024',
  description: '...',
  start_date: '2024-03-15',
  invite_code: 'COMP-94821',
  ...
}
```

### Get Competition by Invite Code

```typescript
const { data, error } = await supabase
  .from('competitions')
  .select('*')
  .eq('invite_code', 'COMP-94821')
  .single();

// Used when player joins via code
```

### Get My Competitions (as Organizer)

```typescript
const { data, error } = await supabase
  .from('competitions')
  .select('*')
  .eq('organizer_id', user.id)
  .order('created_at', { ascending: false });

// Response: Array of competitions
```

### Get My Competitions (as Player)

```typescript
const { data, error } = await supabase
  .from('competitions')
  .select(`
    *,
    competition_players!inner(status)
  `)
  .eq('competition_players.player_id', user.id)
  .order('start_date', { ascending: false });

// Response: Array of competitions where user is a player
```

### Update Competition

```typescript
const { data, error } = await supabase
  .from('competitions')
  .update({
    name: 'Updated Name',
    description: 'Updated description',
  })
  .eq('id', competitionId)
  .select()
  .single();
```

### Delete Competition

```typescript
const { error } = await supabase
  .from('competitions')
  .delete()
  .eq('id', competitionId);

// Cascades to rounds, scorecards, competition_players (via ON DELETE CASCADE)
```

---

## Rounds

### Create Round

```typescript
const { data, error } = await supabase
  .from('rounds')
  .insert({
    competition_id: competitionId,
    round_number: 1, // MVP: always 1
    course_id: courseId,
    date: '2024-03-15',
    game_type: 'stableford', // MVP: always stableford
    status: 'upcoming',
  })
  .select()
  .single();

// Response
{
  id: 'uuid',
  competition_id: 'comp_uuid',
  round_number: 1,
  course_id: 'course_uuid',
  date: '2024-03-15',
  game_type: 'stableford',
  status: 'upcoming',
  ...
}
```

### Get Rounds for Competition

```typescript
const { data, error } = await supabase
  .from('rounds')
  .select(`
    *,
    courses (
      name,
      state,
      city,
      holes
    )
  `)
  .eq('competition_id', competitionId)
  .order('round_number', { ascending: true });

// Response: Array of rounds with course details
[
  {
    id: 'uuid',
    round_number: 1,
    date: '2024-03-15',
    game_type: 'stableford',
    courses: {
      name: 'Royal Melbourne',
      state: 'VIC',
      holes: [...]
    }
  }
]
```

### Get Round by ID

```typescript
const { data, error } = await supabase
  .from('rounds')
  .select(`
    *,
    courses (*)
  `)
  .eq('id', roundId)
  .single();
```

### Update Round Status

```typescript
const { error } = await supabase
  .from('rounds')
  .update({ status: 'completed' })
  .eq('id', roundId);
```

---

## Courses

### Create Course (Manual Entry)

```typescript
const { data, error } = await supabase
  .from('courses')
  .insert({
    source: 'manual',
    name: 'Royal Melbourne (West)',
    state: 'VIC',
    city: 'Black Rock',
    holes: [
      { number: 1, par: 4, strokeIndex: 7 },
      { number: 2, par: 4, strokeIndex: 11 },
      // ... all 18 holes
    ],
  })
  .select()
  .single();

// Response
{
  id: 'uuid',
  name: 'Royal Melbourne (West)',
  state: 'VIC',
  holes: [...],
  ...
}
```

### Search Courses by Name

```typescript
const { data, error } = await supabase
  .from('courses')
  .select('*')
  .ilike('name', `%${searchTerm}%`)
  .limit(10);

// Response: Array of courses matching search
```

### Search Courses by State

```typescript
const { data, error } = await supabase
  .from('courses')
  .select('*')
  .eq('state', 'VIC')
  .order('name', { ascending: true });
```

### Get Course by ID

```typescript
const { data, error } = await supabase
  .from('courses')
  .select('*')
  .eq('id', courseId)
  .single();
```

---

## Players

### Add Player to Competition

```typescript
const { data, error } = await supabase
  .from('competition_players')
  .insert({
    competition_id: competitionId,
    player_id: playerId,
    status: 'accepted', // or 'invited'
    invited_at: new Date().toISOString(),
  });
```

### Join Competition (as Player)

```typescript
// First, find competition by invite code
const { data: competition, error: compError } = await supabase
  .from('competitions')
  .select('id')
  .eq('invite_code', 'COMP-94821')
  .single();

// Then add yourself
const { error } = await supabase
  .from('competition_players')
  .insert({
    competition_id: competition.id,
    player_id: user.id,
    status: 'accepted',
    responded_at: new Date().toISOString(),
  });
```

### Get Players in Competition

```typescript
const { data, error } = await supabase
  .from('competition_players')
  .select(`
    *,
    users (
      id,
      name,
      handicap,
      photo_url
    )
  `)
  .eq('competition_id', competitionId)
  .eq('status', 'accepted'); // Or all statuses

// Response
[
  {
    competition_id: 'uuid',
    player_id: 'user_uuid',
    status: 'accepted',
    users: {
      id: 'user_uuid',
      name: 'John Doe',
      handicap: 12,
    }
  },
  ...
]
```

### Remove Player from Competition

```typescript
const { error } = await supabase
  .from('competition_players')
  .delete()
  .eq('competition_id', competitionId)
  .eq('player_id', playerId);
```

---

## Scorecards

### Create Scorecard

```typescript
const { data, error } = await supabase
  .from('scorecards')
  .insert({
    round_id: roundId,
    player_id: playerId,
    scores: {}, // Empty initially
    total_gross: 0,
    total_net: 0,
    total_points: 0,
    status: 'not-started',
  })
  .select()
  .single();
```

### Update Scorecard (Add Scores)

```typescript
const { data, error } = await supabase
  .from('scorecards')
  .update({
    scores: {
      '1': { strokes: 4 },
      '2': { strokes: 3 },
      '3': { strokes: 5 },
      // ... all holes
    },
    status: 'in-progress',
  })
  .eq('id', scorecardId)
  .select()
  .single();
```

### Submit Scorecard

```typescript
// Calculate totals before submitting
const totalGross = calculateTotalGross(scores);
const totalNet = calculateTotalNet(scores, handicap, holes);
const totalPoints = calculateStablefordPoints(scores, handicap, holes);

const { data, error } = await supabase
  .from('scorecards')
  .update({
    scores: completedScores,
    total_gross: totalGross,
    total_net: totalNet,
    total_points: totalPoints,
    status: 'completed',
    submitted_at: new Date().toISOString(),
    submitted_by: user.id,
  })
  .eq('id', scorecardId)
  .select()
  .single();
```

### Get Scorecard for Player in Round

```typescript
const { data, error } = await supabase
  .from('scorecards')
  .select(`
    *,
    users (
      name,
      handicap
    )
  `)
  .eq('round_id', roundId)
  .eq('player_id', playerId)
  .maybeSingle(); // May not exist yet

// Response
{
  id: 'uuid',
  round_id: 'round_uuid',
  player_id: 'player_uuid',
  scores: { '1': { strokes: 4 }, ... },
  total_gross: 82,
  total_net: 70,
  total_points: 36,
  status: 'completed',
  users: {
    name: 'John Doe',
    handicap: 12
  }
}
```

### Get All Scorecards for Round

```typescript
const { data, error } = await supabase
  .from('scorecards')
  .select(`
    *,
    users (
      name,
      handicap,
      photo_url
    )
  `)
  .eq('round_id', roundId)
  .order('total_points', { ascending: false }); // Highest points first (Stableford)

// Used for leaderboard
```

---

## Leaderboard

### Get Leaderboard for Competition

```typescript
// For single-round competitions (MVP)
const { data: leaderboard, error } = await supabase
  .from('scorecards')
  .select(`
    *,
    users (
      id,
      name,
      handicap,
      photo_url
    )
  `)
  .eq('round_id', roundId)
  .eq('status', 'completed')
  .order('total_points', { ascending: false }); // Stableford: higher is better

// Transform into leaderboard format
const leaderboardData = leaderboard.map((card, index) => ({
  position: index + 1,
  playerId: card.player_id,
  playerName: card.users.name,
  handicap: card.users.handicap,
  totalGross: card.total_gross,
  totalNet: card.total_net,
  totalPoints: card.total_points,
  isCurrentPlayer: card.player_id === user.id,
}));

// Response
[
  {
    position: 1,
    playerId: 'uuid',
    playerName: 'Mike Johnson',
    handicap: 8,
    totalPoints: 42,
    totalGross: 77,
    totalNet: 69,
  },
  {
    position: 2,
    playerName: 'Sarah Miller',
    handicap: 18,
    totalPoints: 39,
    ...
  },
  ...
]
```

### Get Player's Position in Leaderboard

```typescript
// Get all completed scorecards, sorted by points
const { data: scorecards } = await supabase
  .from('scorecards')
  .select('player_id, total_points')
  .eq('round_id', roundId)
  .eq('status', 'completed')
  .order('total_points', { ascending: false });

// Find player's position
const position = scorecards.findIndex(s => s.player_id === playerId) + 1;
const pointsBehindLeader = scorecards[0].total_points - scorecards[position - 1].total_points;

// Response
{
  position: 4,
  pointsBehindLeader: 6
}
```

---

## Real-Time Subscriptions (Phase 2)

### Subscribe to Leaderboard Updates

```typescript
import { useQueryClient } from '@tanstack/react-query';

// Subscribe to scorecard changes
const channel = supabase
  .channel('leaderboard')
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'scorecards',
      filter: `round_id=eq.${roundId}`,
    },
    (payload) => {
      console.log('Scorecard changed:', payload);

      // Invalidate React Query cache to refetch leaderboard
      queryClient.invalidateQueries(['leaderboard', competitionId]);
    }
  )
  .subscribe();

// Cleanup on unmount
return () => {
  supabase.removeChannel(channel);
};
```

---

## Database Functions (RPC)

### Generate Invite Code

```typescript
const { data: inviteCode, error } = await supabase.rpc('generate_invite_code');

// Returns: 'COMP-94821'
```

### Calculate Stableford Points

```typescript
const { data: points, error } = await supabase.rpc('calculate_stableford_points', {
  strokes: 5,
  par: 4,
  handicap_strokes: 1, // Strokes received on this hole
});

// Returns: 1 (5 - 1 = 4 = bogey = 1 point)
```

---

## Error Handling

### Supabase Error Format

```typescript
{
  error: {
    message: 'duplicate key value violates unique constraint "unique_round_player"',
    details: '...',
    hint: '...',
    code: '23505'
  }
}
```

### Common Error Codes

| Code | Meaning | Example |
|------|---------|---------|
| `23505` | Unique constraint violation | Duplicate scorecard for player |
| `23503` | Foreign key violation | Invalid course_id |
| `42501` | Insufficient privilege | RLS policy denied access |
| `PGRST116` | Not found | No row matching query |

### Example Error Handling

```typescript
const { data, error } = await supabase
  .from('competitions')
  .insert({ ... });

if (error) {
  if (error.code === '23505') {
    // Duplicate invite code
    return { error: 'Competition code already exists' };
  } else if (error.code === '42501') {
    // RLS denied access
    return { error: 'You do not have permission to create this competition' };
  } else {
    // Generic error
    return { error: error.message };
  }
}
```

---

## TanStack Query Hooks (Recommended Pattern)

### Example: useCompetition Hook

```typescript
// src/hooks/useCompetition.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@services/supabase';

export function useCompetition(competitionId: string) {
  return useQuery({
    queryKey: ['competition', competitionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', competitionId)
        .single();

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCompetition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newCompetition: CompetitionInsert) => {
      const { data, error } = await supabase
        .from('competitions')
        .insert(newCompetition)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate competitions list
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
    },
  });
}
```

### Usage in Component

```typescript
import { useCompetition, useCreateCompetition } from '@hooks/useCompetition';

function CompetitionScreen({ competitionId }) {
  const { data: competition, isLoading, error } = useCompetition(competitionId);
  const createCompetition = useCreateCompetition();

  const handleCreate = async () => {
    await createCompetition.mutateAsync({
      name: 'New Competition',
      organizer_id: user.id,
      ...
    });
  };

  if (isLoading) return <ActivityIndicator />;
  if (error) return <Text>Error: {error.message}</Text>;

  return <View>...</View>;
}
```

---

## Environment Variables

```bash
# .env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key_here
```

**Important:** Use `EXPO_PUBLIC_` prefix for variables accessible in React Native code.

---

## Next Steps

1. Set up Supabase project at https://supabase.com
2. Run migrations from [database-schema.sql](./database-schema.sql)
3. Copy project URL and publishable key to `.env`
4. Generate TypeScript types: `npx supabase gen types`
5. Create TanStack Query hooks for each resource
6. Implement offline sync logic (Expo SQLite + queue)

---

*Last Updated: January 2025*
