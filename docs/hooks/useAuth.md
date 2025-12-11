# useAuth Hook Documentation

## Overview

The `useAuth` hook provides comprehensive authentication functionality for The Nineteenth golf app using Supabase Auth. It handles login, signup, session management, token refresh, and player profile management with full offline support.

## Features

- ✅ Email + password authentication
- ✅ Magic link (passwordless) authentication
- ✅ Automatic session persistence via AsyncStorage
- ✅ Real-time auth state updates
- ✅ Token auto-refresh before expiry
- ✅ Player profile management
- ✅ Password reset functionality
- ✅ Full TypeScript support
- ✅ Integrated with TanStack Query for caching
- ✅ Optimistic updates for mutations

## Installation

The hook is already set up in the project. Required dependencies:

```bash
pnpm add @supabase/supabase-js @tanstack/react-query @react-native-async-storage/async-storage
```

## Basic Usage

```tsx
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const {
    user,
    player,
    isAuthenticated,
    isLoading,
    login,
    logout,
  } = useAuth();

  // Use auth state and actions
}
```

## API Reference

### State

| Property | Type | Description |
|----------|------|-------------|
| `user` | `User \| null` | Current Supabase user object |
| `session` | `Session \| null` | Current session with access token |
| `player` | `Player \| null` | Extended player profile from database |
| `isLoading` | `boolean` | True during any loading operation |
| `isInitializing` | `boolean` | True during app startup while checking session |
| `isAuthenticating` | `boolean` | True during login/signup/magic link |
| `error` | `AuthError \| null` | Latest auth error, if any |
| `isAuthenticated` | `boolean` | True if user is logged in |

### Actions

#### login(credentials)

Login with email and password.

```tsx
const { login, isAuthenticating, error } = useAuth();

const handleLogin = async () => {
  try {
    const result = await login({
      email: 'user@example.com',
      password: 'securePassword123',
    });
    console.log('Logged in:', result.user);
  } catch (err) {
    console.error('Login failed:', err);
  }
};
```

**Parameters:**
- `credentials.email` (string) - User email
- `credentials.password` (string) - User password

**Returns:** `Promise<LoginResponse>`
```typescript
{
  user: User;
  session: Session;
  player: Player;
}
```

#### signup(credentials)

Create new account with player profile.

```tsx
const { signup } = useAuth();

const handleSignup = async () => {
  await signup({
    email: 'newuser@example.com',
    password: 'securePassword123',
    name: 'John Doe',
    phone: '+61412345678', // Optional
    handicap: 12.5, // Optional
  });
};
```

**Parameters:**
- `credentials.email` (string) - User email
- `credentials.password` (string) - User password
- `credentials.name` (string) - Full name
- `credentials.phone?` (string) - Phone number (optional)
- `credentials.handicap?` (number) - Golf handicap (optional)

**Returns:** `Promise<SignupResponse>`

#### loginWithMagicLink(credentials)

Send passwordless magic link to email.

```tsx
const { loginWithMagicLink } = useAuth();

const handleMagicLink = async () => {
  const result = await loginWithMagicLink({
    email: 'user@example.com',
    redirectTo: 'thenineteenth://auth/magic-link', // Deep link
  });
  Alert.alert('Success', result.message);
};
```

**Parameters:**
- `credentials.email` (string) - User email
- `credentials.redirectTo?` (string) - Deep link URL for mobile (optional)

**Returns:** `Promise<MagicLinkResponse>`
```typescript
{
  success: true;
  message: string;
}
```

#### logout()

Sign out current user.

```tsx
const { logout } = useAuth();

const handleLogout = async () => {
  await logout();
  // User is now logged out, auth state updated
};
```

**Returns:** `Promise<void>`

#### resetPassword(request)

Send password reset email.

```tsx
const { resetPassword } = useAuth();

const handleReset = async () => {
  const result = await resetPassword({
    email: 'user@example.com',
    redirectTo: 'thenineteenth://auth/reset-password',
  });
  Alert.alert('Success', result.message);
};
```

**Returns:** `Promise<PasswordResetResponse>`

#### updatePassword(request)

Update password (when logged in).

```tsx
const { updatePassword } = useAuth();

const handleUpdate = async () => {
  await updatePassword({
    newPassword: 'newSecurePassword123',
  });
};
```

**Returns:** `Promise<void>`

#### updateProfile(updates)

Update player profile.

```tsx
const { updateProfile } = useAuth();

const handleUpdate = async () => {
  const updatedPlayer = await updateProfile({
    name: 'John Smith',
    phone: '+61412345678',
    handicap: 11.2,
    photoUrl: 'https://...',
  });
};
```

**Parameters:**
- `updates.name?` (string) - Full name
- `updates.phone?` (string) - Phone number
- `updates.handicap?` (number) - Golf handicap
- `updates.photoUrl?` (string) - Profile photo URL

**Returns:** `Promise<Player>`

#### getToken()

Get current auth token for API calls.

```tsx
const { getToken } = useAuth();

const fetchData = async () => {
  const token = await getToken();

  const response = await fetch('https://api.example.com/data', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};
```

**Returns:** `Promise<string | null>`

#### refreshSession()

Manually refresh session and token.

```tsx
const { refreshSession } = useAuth();

const handleRefresh = async () => {
  const newSession = await refreshSession();
};
```

**Returns:** `Promise<Session | null>`

#### refreshProfile()

Manually refetch player profile.

```tsx
const { refreshProfile } = useAuth();

const handleRefresh = async () => {
  await refreshProfile();
};
```

**Returns:** `Promise<void>`

## Query Key Structure

The hook uses centralized query keys from `src/hooks/queryKeys.ts`:

```typescript
// Session
authKeys.session() // ['auth', 'session']

// User
authKeys.user() // ['auth', 'user']

// Player profile
authKeys.player(userId) // ['auth', 'player', userId]
```

## Cache Invalidation Strategy

### On Login
```typescript
// Updates cache with new data
queryClient.setQueryData(authKeys.session(), session);
queryClient.setQueryData(authKeys.user(), user);
queryClient.setQueryData(authKeys.player(user.id), player);
```

### On Logout
```typescript
// Clears all auth data
queryClient.setQueryData(authKeys.session(), null);
queryClient.setQueryData(authKeys.user(), null);
queryClient.removeQueries({ queryKey: authKeys.player('') });
```

### On Profile Update
```typescript
// Optimistically updates player cache
queryClient.setQueryData(authKeys.player(user.id), updatedPlayer);
```

## Auth State Listener

The hook automatically listens to Supabase auth events:

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  // SIGNED_IN - User logged in
  // SIGNED_OUT - User logged out
  // TOKEN_REFRESHED - Session token refreshed
  // USER_UPDATED - User metadata updated
  // PASSWORD_RECOVERY - Password reset link clicked
});
```

## Offline Behavior

### Session Persistence
- Sessions are stored in AsyncStorage via Supabase client
- Sessions persist across app restarts
- Tokens auto-refresh 60 seconds before expiry

### Offline Actions
- Login/signup requires network connection
- Session check works offline (from cache)
- Profile updates queue for sync when online

## Error Handling

```tsx
const { login, error } = useAuth();

// Error is automatically captured in state
if (error) {
  console.error('Auth error:', error.message);
}

// Or handle errors manually
try {
  await login({ email, password });
} catch (err) {
  Alert.alert('Login Failed', err.message);
}
```

## Usage Examples

### Login Screen
```tsx
function LoginScreen() {
  const { login, isAuthenticating, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    await login({ email, password });
  };

  return (
    <View>
      <TextInput value={email} onChangeText={setEmail} />
      <TextInput value={password} onChangeText={setPassword} secureTextEntry />
      <Button onPress={handleLogin} loading={isAuthenticating} />
      {error && <Text>{error.message}</Text>}
    </View>
  );
}
```

### Protected Route
```tsx
function ProtectedRoute({ children }) {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
}
```

### Profile Screen
```tsx
function ProfileScreen() {
  const { user, player, updateProfile, logout } = useAuth();

  const handleUpdate = async () => {
    await updateProfile({
      name: 'John Smith',
      handicap: 11.2,
    });
  };

  return (
    <View>
      <Text>{user?.email}</Text>
      <Text>{player?.name}</Text>
      <Text>Handicap: {player?.handicap}</Text>
      <Button onPress={handleUpdate}>Update Profile</Button>
      <Button onPress={logout}>Logout</Button>
    </View>
  );
}
```

## Integration with API Client

The hook provides `getToken()` for authenticated API calls:

```typescript
// src/services/api/client.ts
import { getCurrentSession } from '@/services/supabase/client';

const apiClient = axios.create({
  baseURL: 'https://api.example.com',
});

// Add auth token to all requests
apiClient.interceptors.request.use(async (config) => {
  const session = await getCurrentSession();

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }

  return config;
});
```

## Environment Variables

Required environment variables in `.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## TypeScript Support

The hook is fully typed. Import types from:

```typescript
import type {
  LoginCredentials,
  SignupCredentials,
  MagicLinkCredentials,
  PasswordResetRequest,
  PasswordUpdateRequest,
  ProfileUpdateInput,
  UseAuthReturn,
} from '@/types/auth';
```

## Additional Hooks

### useSession()
Lightweight hook for accessing only session data:

```tsx
import { useSession } from '@/hooks/useAuth';

const session = useSession();
```

### useUser()
Lightweight hook for accessing only user data:

```tsx
import { useUser } from '@/hooks/useAuth';

const user = useUser();
```

## Notes

- All TODO comments in the hook indicate where actual Supabase queries should be added when backend is ready
- The hook currently returns mock data in some places - replace with actual API calls
- Session auto-refresh happens 60 seconds before token expiry
- Player profile creation on signup should ideally be handled by a database trigger (see migration files)

## Related Documentation

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [TanStack Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [AsyncStorage Docs](https://react-native-async-storage.github.io/async-storage/)
