# User Preferences System

## Overview

The Nineteenth uses a centralized `user_preferences` table to store all user settings and preferences. This enables cross-device synchronization - when a user logs in on a new device, their preferences are automatically loaded from the database.

## Architecture

### Data Flow

```
User Changes Setting
        │
        ▼
┌─────────────────────────┐
│  React Component        │
│  (SettingsScreen, etc.) │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  TanStack Query Hook    │
│  (usePushNotifications) │
│  - Optimistic updates   │
│  - Cache management     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Supabase Client        │
│  user_preferences table │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  PostgreSQL Database    │
│  + Row Level Security   │
└─────────────────────────┘
```

### Storage Strategy

| Preference Type | Storage Location | Sync Behavior |
|-----------------|------------------|---------------|
| Push notifications | `user_preferences` table | Real-time sync to database |
| Theme mode | Local AsyncStorage | Local only (for now) |
| Distance units | Local AsyncStorage | Local only (for now) |
| Scoring visibility | Local AsyncStorage | Local only (for now) |

## Database Schema

### Table: `user_preferences`

```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES players(id) ON DELETE CASCADE,

  -- Display & UI Preferences
  theme_mode TEXT NOT NULL DEFAULT 'system'
    CHECK (theme_mode IN ('light', 'dark', 'system')),
  distance_unit TEXT NOT NULL DEFAULT 'metres'
    CHECK (distance_unit IN ('yards', 'metres')),

  -- Scoring Entry Display Preferences
  show_putts BOOLEAN NOT NULL DEFAULT TRUE,
  show_fairway_hit BOOLEAN NOT NULL DEFAULT FALSE,
  show_gir BOOLEAN NOT NULL DEFAULT FALSE,

  -- Push Notification Preferences
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  push_competition_updates BOOLEAN NOT NULL DEFAULT TRUE,
  push_friend_requests BOOLEAN NOT NULL DEFAULT TRUE,
  push_scorecard_updates BOOLEAN NOT NULL DEFAULT TRUE,

  -- Feature Toggles
  round_timer_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  debug_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE,

  -- Flexible Extension
  custom_settings JSONB NOT NULL DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Auto-Creation Trigger

When a new player is created, their preferences row is automatically created:

```sql
CREATE OR REPLACE FUNCTION create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_user_preferences
  AFTER INSERT ON players
  FOR EACH ROW EXECUTE FUNCTION create_user_preferences();
```

### Row Level Security

Users can only access their own preferences:

```sql
-- View own preferences
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Update own preferences
CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);
```

## TypeScript Types

### UserPreferences Interface

```typescript
// src/types/database/player.types.ts

export interface UserPreferences {
  id: string;
  user_id: string;

  // Display & UI preferences
  theme_mode: 'light' | 'dark' | 'system';
  distance_unit: 'yards' | 'metres';

  // Scoring entry display preferences
  show_putts: boolean;
  show_fairway_hit: boolean;
  show_gir: boolean;

  // Push notification preferences
  push_enabled: boolean;
  push_competition_updates: boolean;
  push_friend_requests: boolean;
  push_scorecard_updates: boolean;

  // Feature toggles
  round_timer_enabled: boolean;
  debug_mode_enabled: boolean;

  // Flexible extension
  custom_settings: Record<string, unknown>;

  // Metadata
  created_at: string;
  updated_at: string;
}
```

## Push Notification Preferences

Push notification preferences are currently the only preferences synced to the database.

### Reading Preferences

```typescript
import { usePushNotifications } from '@/hooks/usePushNotifications';

function NotificationSettings() {
  const { preferences, isLoading } = usePushNotifications();

  if (isLoading) return <LoadingSpinner />;

  return (
    <View>
      <Text>Push Enabled: {preferences?.pushEnabled ? 'Yes' : 'No'}</Text>
      <Text>Competition Updates: {preferences?.pushCompetitionUpdates ? 'Yes' : 'No'}</Text>
    </View>
  );
}
```

### Updating Preferences

```typescript
import { usePushNotifications } from '@/hooks/usePushNotifications';

function NotificationToggle() {
  const { preferences, updatePreferences, isUpdating } = usePushNotifications();

  const handleToggle = async (enabled: boolean) => {
    await updatePreferences({ pushEnabled: enabled });
  };

  return (
    <Switch
      value={preferences?.pushEnabled}
      onValueChange={handleToggle}
      disabled={isUpdating}
    />
  );
}
```

### Lightweight Hook

For components that only need to read preferences (no mutations):

```typescript
import { usePushPreferences } from '@/hooks/usePushNotifications';

function NotificationBadge({ userId }: { userId: string }) {
  const { preferences, isLoading } = usePushPreferences(userId);

  if (!preferences?.pushEnabled) {
    return <Icon name="bell-off" />;
  }

  return <Icon name="bell" />;
}
```

## Helper Functions (Database)

### Get All Preferences

```sql
-- Returns all preferences for a user
SELECT * FROM get_user_preferences('user-uuid-here');
```

### Update Preferences

```sql
-- Partial update - only updates provided fields
SELECT * FROM update_user_preferences(
  p_user_id := 'user-uuid-here',
  p_push_enabled := false,
  p_theme_mode := 'dark'
);
```

### Check Push Eligibility

Used by Edge Functions to determine if a notification should be sent:

```sql
-- Returns TRUE if notification should be sent
SELECT should_send_push('user-uuid-here', 'competition_player_joined');
```

## Migration from Players Table

Previously, push notification preferences were stored directly on the `players` table. The migration:

1. **Created** the `user_preferences` table
2. **Migrated** existing data from `players` to `user_preferences`
3. **Updated** helper functions to use the new table
4. **Kept** old columns on `players` for backward compatibility (to be removed later)

### Client Code Changes

```typescript
// BEFORE (querying players table)
const { data } = await supabase
  .from('players')
  .select('push_enabled, push_competition_updates, ...')
  .eq('id', userId)
  .single();

// AFTER (querying user_preferences table)
const { data } = await supabase
  .from('user_preferences')
  .select('push_enabled, push_competition_updates, ...')
  .eq('user_id', userId)  // Note: 'user_id' not 'id'
  .single();
```

## Future Expansion

### Adding New Preferences

1. **Add column** to the database:
   ```sql
   ALTER TABLE user_preferences
   ADD COLUMN new_preference BOOLEAN DEFAULT FALSE;
   ```

2. **Update TypeScript type**:
   ```typescript
   export interface UserPreferences {
     // ... existing fields
     new_preference: boolean;
   }
   ```

3. **Update helper functions** if needed

### Using custom_settings JSONB

For preferences that don't warrant a schema change:

```typescript
// Store
await supabase
  .from('user_preferences')
  .update({
    custom_settings: {
      ...existingSettings,
      preferred_tee: 'blue',
      scorecard_layout: 'compact'
    }
  })
  .eq('user_id', userId);

// Read
const { data } = await supabase
  .from('user_preferences')
  .select('custom_settings')
  .eq('user_id', userId)
  .single();

const preferredTee = data?.custom_settings?.preferred_tee ?? 'white';
```

## Offline Behavior

Currently, push notification preferences require network connectivity to update. The mutation will fail if offline.

For local-only settings (theme, distance units, scoring visibility), the `settingsStore` and `themeStore` use Zustand with AsyncStorage persistence, providing full offline support.

### Future: Full Offline Sync

A future enhancement could implement:
1. Zustand stores as local cache
2. Background sync to database when online
3. Conflict resolution (last-write-wins)
4. Hydration from database on login

## Related Files

| File | Purpose |
|------|---------|
| `supabase/migrations/20251229000000_user_preferences.sql` | Database migration |
| `src/types/database/player.types.ts` | TypeScript types |
| `src/types/database/schema.ts` | Database schema types |
| `src/hooks/usePushNotifications.ts` | Push preferences hook |
| `src/store/settingsStore.ts` | Local settings (distance, scoring visibility) |
| `src/store/themeStore.ts` | Local theme preference |
| `src/screens/profile/SettingsScreen.tsx` | Settings UI |
| `src/screens/profile/NotificationSettingsScreen.tsx` | Push notification UI |

## Troubleshooting

### Preferences Not Saving

1. **Check authentication**: User must be logged in
2. **Check RLS policies**: User can only update their own preferences
3. **Check network**: Database writes require connectivity
4. **Check logs**: Look for Supabase errors in console

### Preferences Not Loading

1. **Verify row exists**: Check if `user_preferences` row was created
2. **Check trigger**: The auto-creation trigger should create row on player insert
3. **Manual creation**: If needed, insert row manually:
   ```sql
   INSERT INTO user_preferences (user_id) VALUES ('user-uuid') ON CONFLICT DO NOTHING;
   ```

### Type Errors

If TypeScript shows `never` type errors when querying `user_preferences`:
- The Supabase types may need regeneration
- Use explicit type assertions as a workaround:
  ```typescript
  const { data } = await (supabase as any)
    .from('user_preferences')
    .select('...')
    .single() as { data: YourType | null; error: Error | null };
  ```
