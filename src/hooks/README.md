# Authentication Hook - Quick Start

## Overview

The `useAuth` hook provides complete authentication functionality for The Nineteenth using Supabase Auth with TanStack Query integration.

## Quick Start

```tsx
import { useAuth } from '@/hooks/useAuth';

function LoginScreen() {
  const { login, isAuthenticating } = useAuth();

  const handleLogin = async () => {
    await login({
      email: 'user@example.com',
      password: 'password123',
    });
  };

  return (
    <Button onPress={handleLogin} loading={isAuthenticating}>
      Login
    </Button>
  );
}
```

## What's Included

### Files Created

```
src/
├── hooks/
│   ├── useAuth.ts                 # Main authentication hook
│   ├── useAuth.examples.tsx       # Complete usage examples
│   ├── queryKeys.ts               # TanStack Query key definitions
│   └── README.md                  # This file
├── services/
│   └── supabase/
│       └── client.ts              # Supabase client configuration
└── types/
    └── auth.ts                    # Authentication type definitions

docs/
└── hooks/
    └── useAuth.md                 # Complete documentation
```

### Dependencies Installed

- `@supabase/supabase-js@2.80.0` - Supabase client library

## Features

✅ **Login Methods**
- Email + password
- Magic link (passwordless)

✅ **Account Management**
- User signup with player profile
- Password reset
- Password update
- Profile updates

✅ **Session Management**
- Automatic session persistence (AsyncStorage)
- Auto-refresh tokens before expiry
- Real-time auth state updates

✅ **Developer Experience**
- Full TypeScript support
- TanStack Query integration
- Optimistic updates
- Centralized query keys
- Comprehensive error handling

## Basic Usage

### Login
```tsx
const { login } = useAuth();

await login({
  email: 'user@example.com',
  password: 'password123',
});
```

### Signup
```tsx
const { signup } = useAuth();

await signup({
  email: 'new@example.com',
  password: 'password123',
  name: 'John Doe',
  handicap: 12.5, // Optional
});
```

### Logout
```tsx
const { logout } = useAuth();

await logout();
```

### Check Auth Status
```tsx
const { isAuthenticated, user, player } = useAuth();

if (isAuthenticated) {
  console.log('User:', user.email);
  console.log('Player:', player.name);
}
```

### Get Auth Token for API Calls
```tsx
const { getToken } = useAuth();

const token = await getToken();

fetch('https://api.example.com/data', {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

## Query Keys

All query keys are centralized in `src/hooks/queryKeys.ts`:

```typescript
import { authKeys } from '@/hooks/queryKeys';

// Use in queries
useQuery({
  queryKey: authKeys.session(),
  queryFn: () => getSession(),
});

// Invalidate specific data
queryClient.invalidateQueries({
  queryKey: authKeys.player(userId)
});
```

## Complete Examples

See `src/hooks/useAuth.examples.tsx` for:

1. **LoginScreen** - Email/password + magic link
2. **SignupScreen** - Account creation with profile
3. **ProfileScreen** - View and edit profile
4. **ProtectedRoute** - Route guard component
5. **PasswordResetScreen** - Password recovery
6. **useAuthGuard** - Custom navigation guard hook
7. **DataFetchingExample** - Using auth token in API calls

## Environment Setup

Create `.env` file with:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key_here
```

## Cache Strategy

### On Login
```typescript
// Sets session, user, and player in cache
queryClient.setQueryData(authKeys.session(), session);
queryClient.setQueryData(authKeys.user(), user);
queryClient.setQueryData(authKeys.player(user.id), player);
```

### On Logout
```typescript
// Clears all auth-related cache
queryClient.setQueryData(authKeys.session(), null);
queryClient.setQueryData(authKeys.user(), null);
queryClient.removeQueries({ queryKey: authKeys.player('') });
```

### On Profile Update
```typescript
// Optimistically updates cache
queryClient.setQueryData(authKeys.player(user.id), updatedPlayer);
```

## Offline Support

- ✅ Sessions persist across app restarts via AsyncStorage
- ✅ Session checks work offline (from cache)
- ✅ Tokens auto-refresh when connection restored
- ⚠️ Login/signup requires network connection

## Error Handling

Errors are automatically captured in hook state:

```tsx
const { error, login } = useAuth();

// Automatic error state
if (error) {
  Alert.alert('Error', error.message);
}

// Or handle manually
try {
  await login({ email, password });
} catch (err) {
  Alert.alert('Login Failed', err.message);
}
```

## TypeScript Support

All types are exported from `@/types/auth`:

```typescript
import type {
  LoginCredentials,
  SignupCredentials,
  MagicLinkCredentials,
  PasswordResetRequest,
  ProfileUpdateInput,
  UseAuthReturn,
} from '@/types/auth';
```

## Next Steps

1. **Configure Supabase**
   - Create Supabase project
   - Add environment variables to `.env`
   - Run database migrations

2. **Implement Screens**
   - Copy examples from `useAuth.examples.tsx`
   - Customize UI to match app design
   - Add navigation logic

3. **Replace TODOs**
   - Search for `TODO:` comments in `useAuth.ts`
   - Replace mock API calls with actual Supabase queries
   - Test with real backend

4. **Add Player Profile Trigger**
   - Create database trigger to auto-create player profile on signup
   - See migration files in `supabase/migrations/`

## Documentation

For complete documentation, see:
- **Full API Reference:** `docs/hooks/useAuth.md`
- **Usage Examples:** `src/hooks/useAuth.examples.tsx`
- **Type Definitions:** `src/types/auth.ts`
- **Query Keys:** `src/hooks/queryKeys.ts`

## Integration Points

### With Navigation
```tsx
// Listen to auth state and navigate
const { isAuthenticated } = useAuth();

useEffect(() => {
  if (isAuthenticated) {
    navigation.navigate('Home');
  } else {
    navigation.navigate('Login');
  }
}, [isAuthenticated]);
```

### With API Client
```tsx
// Add token to all API requests
import { getCurrentSession } from '@/services/supabase/client';

apiClient.interceptors.request.use(async (config) => {
  const session = await getCurrentSession();
  if (session) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});
```

### With Protected Routes
```tsx
function App() {
  return (
    <ProtectedRoute>
      <HomeScreen />
    </ProtectedRoute>
  );
}
```

## Common Patterns

### Loading State
```tsx
const { isLoading, isInitializing } = useAuth();

if (isInitializing) {
  return <SplashScreen />;
}

if (isLoading) {
  return <LoadingIndicator />;
}
```

### Conditional Rendering
```tsx
const { isAuthenticated, user, player } = useAuth();

return (
  <View>
    {isAuthenticated ? (
      <Text>Welcome, {player?.name}!</Text>
    ) : (
      <Text>Please log in</Text>
    )}
  </View>
);
```

### Profile Updates
```tsx
const { player, updateProfile } = useAuth();

const handleSave = async (updates) => {
  const updatedPlayer = await updateProfile(updates);
  Alert.alert('Success', 'Profile updated!');
};
```

## Support

For issues or questions:
- Check `docs/hooks/useAuth.md` for detailed documentation
- Review examples in `src/hooks/useAuth.examples.tsx`
- See Supabase Auth docs: https://supabase.com/docs/guides/auth
