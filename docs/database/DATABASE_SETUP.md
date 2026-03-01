# Database Setup Guide

## Quick Start

This guide will help you set up the Supabase database for The Nineteenth golf app.

## Prerequisites

- Supabase account (free tier works for development)
- Supabase CLI (optional, for local development)

## Setup Options

### Option 1: Supabase Cloud (Recommended for MVP)

**Step 1: Create Supabase Project**

1. Go to [https://supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in:
   - **Name**: the-nineteenth
   - **Database Password**: (save this securely)
   - **Region**: Choose closest to Australia (e.g., Sydney)
4. Click "Create new project"

**Step 2: Apply Migration**

1. Navigate to SQL Editor in Supabase Dashboard
2. Click "New query"
3. Copy entire contents of `supabase/migrations/20250109000000_mvp_phase_1_schema.sql`
4. Paste into SQL Editor
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. Wait for "Success. No rows returned" message

**Step 3: Verify Tables Created**

1. Go to "Table Editor" in Supabase Dashboard
2. You should see 7 tables:
   - players
   - competitions
   - courses
   - rounds
   - competition_players
   - pairings
   - scorecards

**Step 4: Get API Keys**

1. Go to "Project Settings" → "API"
2. Copy the following to your `.env` file:
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

**Step 5: Test Connection**

```typescript
// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey);

// Test query
const { data, error } = await supabase.from('courses').select('*');
console.log('Courses:', data);
```

---

### Option 2: Local Development (Advanced)

**Step 1: Install Supabase CLI**

```bash
npm install -g supabase
```

**Step 2: Initialize Supabase**

```bash
# In project root
supabase init
```

**Step 3: Start Local Supabase**

```bash
# Requires Docker Desktop running
supabase start
```

This will output:
```
API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
publishable key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
secret key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Step 4: Apply Migration**

```bash
# Copy migration to supabase folder
supabase db reset
```

**Step 5: Access Local Studio**

Open http://localhost:54323 to access Supabase Studio locally.

**Step 6: Configure Environment**

```bash
# .env.development
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key-from-supabase-start>
```

---

## Verify Installation

### Test Database Functions

```sql
-- Test Stableford calculation
SELECT calculate_stableford_points(5, 4, 12, 7);
-- Should return: 2 (par)

-- Test invite code generation
INSERT INTO competitions (name, start_date, handicap_system, organizer_id)
VALUES ('Test Competition', '2025-02-15', 'honor', 'your-user-id')
RETURNING invite_code;
-- Should return something like: COMP-12345
```

### Test RLS Policies

```sql
-- As authenticated user
SET ROLE authenticated;
SET request.jwt.claim.sub = '<your-user-id>';

-- Should only see your competitions
SELECT * FROM competitions;

-- Should only see players in your competitions
SELECT * FROM players;
```

---

## Sample Data (Optional)

To populate with test data for development:

```sql
-- Insert sample course
INSERT INTO courses (name, state, city, holes, source) VALUES
(
  'Royal Melbourne Golf Club',
  'VIC',
  'Black Rock',
  '[
    {"number": 1, "par": 4, "strokeIndex": 7},
    {"number": 2, "par": 4, "strokeIndex": 3},
    {"number": 3, "par": 3, "strokeIndex": 15},
    {"number": 4, "par": 4, "strokeIndex": 1},
    {"number": 5, "par": 5, "strokeIndex": 11},
    {"number": 6, "par": 3, "strokeIndex": 17},
    {"number": 7, "par": 4, "strokeIndex": 5},
    {"number": 8, "par": 4, "strokeIndex": 9},
    {"number": 9, "par": 4, "strokeIndex": 13},
    {"number": 10, "par": 4, "strokeIndex": 8},
    {"number": 11, "par": 4, "strokeIndex": 4},
    {"number": 12, "par": 3, "strokeIndex": 16},
    {"number": 13, "par": 4, "strokeIndex": 2},
    {"number": 14, "par": 5, "strokeIndex": 12},
    {"number": 15, "par": 3, "strokeIndex": 18},
    {"number": 16, "par": 4, "strokeIndex": 6},
    {"number": 17, "par": 4, "strokeIndex": 10},
    {"number": 18, "par": 4, "strokeIndex": 14}
  ]'::jsonb,
  'manual'
)
RETURNING *;
```

---

## Common Issues

### Issue: Migration fails with "extension postgis does not exist"

**Solution:**
```sql
-- Run this first in SQL Editor
CREATE EXTENSION IF NOT EXISTS postgis;

-- Then run the full migration
```

### Issue: RLS policies blocking queries

**Solution:**
- Make sure you're authenticated (signed in)
- Check that user ID matches policy conditions
- Use Supabase secret key for admin operations (backend only)

### Issue: Local Supabase won't start

**Solution:**
- Make sure Docker Desktop is running
- Check port 54321-54323 aren't already in use
- Run `supabase stop` then `supabase start` again

---

## Next Steps

After database setup:

1. **Create Supabase Client** - `src/services/supabase.ts`
2. **Set up Authentication** - Use Supabase Auth for user signup/login
3. **Create API Hooks** - Use TanStack Query for data fetching
4. **Build UI Components** - Start with competition creation flow

See:
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Full schema documentation
- [MVP-PHASE-1.md](./MVP-PHASE-1.md) - Feature requirements
- [CLAUDE.md](../CLAUDE.md) - Complete project overview

---

## Environment Variables

Your `.env` file should have:

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Environment
NODE_ENV=development

# Feature Flags
EXPO_PUBLIC_ENABLE_OFFLINE_MODE=true
EXPO_PUBLIC_ENABLE_BACKGROUND_SYNC=true
```

**Important:** Never commit `.env` to version control!

---

## Database Backup

### Supabase Cloud

Automatic backups are included in paid plans. Free tier:
- Daily snapshots (7 days retention)
- Download backups from Dashboard → Database → Backups

### Local Development

```bash
# Export schema
supabase db dump -f schema.sql

# Export data
supabase db dump --data-only -f data.sql
```

---

## Monitoring

### Supabase Dashboard

Monitor:
- **Database** → Query performance, slow queries
- **API** → Request logs, error rates
- **Auth** → User signups, login activity
- **Storage** → File uploads (Phase 2)

### Useful Queries

```sql
-- Active connections
SELECT COUNT(*) FROM pg_stat_activity;

-- Slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

*Last Updated: February 2026*
