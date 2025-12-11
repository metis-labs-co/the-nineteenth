# Authentication Flow - The Nineteenth

**Backend:** Supabase Auth
**Storage:** AsyncStorage (persistent sessions)
**MVP Scope:** Email + Password only

---

## Overview

Phase 1 MVP uses simple email/password authentication via Supabase Auth. No magic links, no social login, no password reset.

**Deferred to Phase 2:**
- Magic link authentication
- Social login (Google, Apple)
- Password reset flow
- Email verification
- Biometric authentication (Face ID / Touch ID)

---

## Authentication Screens

### 1. Welcome Screen (Initial Load)

**Route:** `/welcome`
**When:** App first opens, no authenticated session

```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│            🏌️ Trophy Icon           │
│                                     │
│         The Nineteenth              │
│   Golf Competition Management       │
│                                     │
│                                     │
│   ┌───────────────────────────┐   │
│   │       Get Started          │   │ ← Navigate to Login
│   └───────────────────────────┘   │
│                                     │
│   ┌───────────────────────────┐   │
│   │   Already have an account? │   │ ← Navigate to Login
│   │          Sign In           │   │
│   └───────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

**Logic:**
```typescript
useEffect(() => {
  // Check for existing session on mount
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      navigate('Home'); // Already logged in
    } else {
      navigate('Welcome'); // Show welcome screen
    }
  });

  // Listen for auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (event === 'SIGNED_IN') {
        navigate('Home');
      } else if (event === 'SIGNED_OUT') {
        navigate('Welcome');
      }
    }
  );

  return () => subscription.unsubscribe();
}, []);
```

---

### 2. Sign Up Screen

**Route:** `/signup`

```
┌─────────────────────────────────────┐
│  ← Back           Sign Up           │
├─────────────────────────────────────┤
│                                     │
│   Create Your Account               │
│   Join or create golf competitions  │
│                                     │
│   Name *                            │
│   ┌───────────────────────────────┐│
│   │ John Doe                      ││
│   └───────────────────────────────┘│
│                                     │
│   Email *                           │
│   ┌───────────────────────────────┐│
│   │ john@example.com              ││
│   └───────────────────────────────┘│
│                                     │
│   Password *                        │
│   ┌───────────────────────────────┐│
│   │ ••••••••                      ││
│   └───────────────────────────────┘│
│   At least 8 characters             │
│                                     │
│   ┌───────────────────────────────┐│
│   │       Create Account          ││ ← Submit
│   └───────────────────────────────┘│
│                                     │
│   Already have an account? Sign In  │ ← Navigate to Login
│                                     │
└─────────────────────────────────────┘
```

**Implementation:**

```typescript
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { supabase } from '@services/supabase';
import { useNavigation } from '@react-navigation/native';

export function SignUpScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async () => {
    setLoading(true);
    setError('');

    // Validation
    if (!name || !email || !password) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name, // Store in user_metadata
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Create profile in public.users table
    const { error: profileError } = await supabase.from('users').insert({
      id: authData.user.id,
      name,
      email,
    });

    if (profileError) {
      setError('Failed to create profile: ' + profileError.message);
      setLoading(false);
      return;
    }

    // Success - navigate to home (auth state listener will handle)
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Create Your Account
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Join or create golf competitions
      </Text>

      <TextInput
        label="Name *"
        value={name}
        onChangeText={setName}
        mode="outlined"
        style={styles.input}
        autoCapitalize="words"
        autoComplete="name"
      />

      <TextInput
        label="Email *"
        value={email}
        onChangeText={setEmail}
        mode="outlined"
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />

      <TextInput
        label="Password *"
        value={password}
        onChangeText={setPassword}
        mode="outlined"
        style={styles.input}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
      />
      <HelperText type="info" visible={true}>
        At least 8 characters
      </HelperText>

      {error && (
        <HelperText type="error" visible={true}>
          {error}
        </HelperText>
      )}

      <Button
        mode="contained"
        onPress={handleSignUp}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        Create Account
      </Button>

      <Button
        mode="text"
        onPress={() => navigation.navigate('Login')}
        style={styles.linkButton}
      >
        Already have an account? Sign In
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
    opacity: 0.7,
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 24,
  },
  linkButton: {
    marginTop: 16,
  },
});
```

---

### 3. Login Screen

**Route:** `/login`

```
┌─────────────────────────────────────┐
│  ← Back            Sign In          │
├─────────────────────────────────────┤
│                                     │
│   Welcome Back                      │
│   Sign in to your account           │
│                                     │
│   Email *                           │
│   ┌───────────────────────────────┐│
│   │ john@example.com              ││
│   └───────────────────────────────┘│
│                                     │
│   Password *                        │
│   ┌───────────────────────────────┐│
│   │ ••••••••                      ││
│   └───────────────────────────────┘│
│                                     │
│   ┌───────────────────────────────┐│
│   │          Sign In              ││ ← Submit
│   └───────────────────────────────┘│
│                                     │
│   Don't have an account? Sign Up    │ ← Navigate to Sign Up
│                                     │
└─────────────────────────────────────┘
```

**Implementation:**

```typescript
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { supabase } from '@services/supabase';
import { useNavigation } from '@react-navigation/native';

export function LoginScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    // Validation
    if (!email || !password) {
      setError('Email and password are required');
      setLoading(false);
      return;
    }

    // Sign in with Supabase Auth
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Success - navigate to home (auth state listener will handle)
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Welcome Back
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Sign in to your account
      </Text>

      <TextInput
        label="Email *"
        value={email}
        onChangeText={setEmail}
        mode="outlined"
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />

      <TextInput
        label="Password *"
        value={password}
        onChangeText={setPassword}
        mode="outlined"
        style={styles.input}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
      />

      {error && (
        <HelperText type="error" visible={true}>
          {error}
        </HelperText>
      )}

      <Button
        mode="contained"
        onPress={handleLogin}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        Sign In
      </Button>

      <Button
        mode="text"
        onPress={() => navigation.navigate('SignUp')}
        style={styles.linkButton}
      >
        Don't have an account? Sign Up
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
    opacity: 0.7,
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 24,
  },
  linkButton: {
    marginTop: 16,
  },
});
```

---

## Auth State Management

### Zustand Auth Store

```typescript
// src/store/authStore.ts
import { create } from 'zustand';
import { supabase } from '@services/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;

  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
}));
```

### Auth Provider (Root Component)

```typescript
// App.tsx or _layout.tsx
import React, { useEffect } from 'react';
import { supabase } from '@services/supabase';
import { useAuthStore } from '@store/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const { setUser, setSession } = useAuthStore();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return <NavigationContainer>{/* Routes */}</NavigationContainer>;
}
```

---

## Navigation Setup

### Root Navigator

```typescript
// src/navigation/RootNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@store/authStore';

import WelcomeScreen from '@screens/auth/WelcomeScreen';
import LoginScreen from '@screens/auth/LoginScreen';
import SignUpScreen from '@screens/auth/SignUpScreen';
import HomeScreen from '@screens/HomeScreen';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { user } = useAuthStore();

  return (
    <Stack.Navigator>
      {user ? (
        // Authenticated stack
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          {/* Other authenticated screens */}
        </>
      ) : (
        // Unauthenticated stack
        <>
          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
```

---

## Session Persistence

Supabase Auth automatically persists sessions to AsyncStorage:

```typescript
// Configured in src/services/supabase.ts
export const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage, // Persist sessions
    autoRefreshToken: true, // Auto-refresh before expiry
    persistSession: true,   // Save session across app restarts
  },
});
```

**Session Lifecycle:**
1. User logs in → Session saved to AsyncStorage
2. App reopens → Session loaded from AsyncStorage
3. Token expires (60 min) → Auto-refreshed with refresh token
4. User logs out → Session cleared from AsyncStorage

---

## Protected Routes

### Require Auth Hook

```typescript
// src/hooks/useRequireAuth.ts
import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@store/authStore';

export function useRequireAuth() {
  const { user } = useAuthStore();
  const navigation = useNavigation();

  useEffect(() => {
    if (!user) {
      navigation.navigate('Login');
    }
  }, [user, navigation]);

  return user;
}
```

**Usage:**

```typescript
function CreateCompetitionScreen() {
  const user = useRequireAuth(); // Redirect to login if not authenticated

  if (!user) return null; // Or loading spinner

  return <View>{/* Protected content */}</View>;
}
```

---

## Error Handling

### Common Auth Errors

| Error Code | Message | Handling |
|------------|---------|----------|
| `invalid_credentials` | Invalid login credentials | Show "Email or password incorrect" |
| `email_not_confirmed` | Email not verified | Show "Please verify your email" (Phase 2) |
| `user_already_exists` | Email already registered | Show "Account with this email already exists" |
| `weak_password` | Password too weak | Show "Password must be at least 8 characters" |

### Error Display

```typescript
const getErrorMessage = (error: AuthError) => {
  switch (error.message) {
    case 'Invalid login credentials':
      return 'Email or password is incorrect';
    case 'User already registered':
      return 'An account with this email already exists';
    case 'Password should be at least 8 characters':
      return 'Password must be at least 8 characters long';
    default:
      return error.message;
  }
};
```

---

## Logout Flow

### Logout Button (Settings Screen)

```typescript
import { Button } from 'react-native-paper';
import { useAuthStore } from '@store/authStore';

function SettingsScreen() {
  const { signOut } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await signOut();
    // Auth state change listener will navigate to Welcome
    setLoading(false);
  };

  return (
    <View>
      <Button mode="outlined" onPress={handleLogout} loading={loading}>
        Sign Out
      </Button>
    </View>
  );
}
```

---

## Phase 2 Enhancements (Deferred)

### Password Reset

```typescript
// Send reset email
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'https://yourdomain.com/reset-password',
});

// User clicks link → Opens app → Reset password screen
const { error } = await supabase.auth.updateUser({
  password: newPassword,
});
```

### Magic Link Login

```typescript
// Send magic link
const { error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com',
});

// User clicks link → Auto-login
```

### Social Login

```typescript
// Google
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
});

// Apple
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'apple',
});
```

### Email Verification

```typescript
// On signup, Supabase sends verification email
// User clicks link → Email verified

// Check if verified
const { data: { user } } = await supabase.auth.getUser();
if (user?.email_confirmed_at) {
  // Verified
}
```

---

## Testing Checklist

- [ ] Sign up with valid email/password
- [ ] Sign up with duplicate email (error handling)
- [ ] Sign up with weak password (error handling)
- [ ] Login with correct credentials
- [ ] Login with incorrect credentials (error handling)
- [ ] Session persists after app restart
- [ ] Session auto-refreshes before expiry
- [ ] Logout clears session
- [ ] Protected routes redirect to login
- [ ] Auth state updates trigger navigation

---

## Security Best Practices

1. **Never store passwords** - Supabase handles hashing
2. **Use HTTPS only** - Supabase enforces this
3. **Secure token storage** - AsyncStorage is encrypted on iOS/Android
4. **Row-Level Security** - All database queries filtered by user ID
5. **Rate limiting** - Supabase provides built-in rate limiting
6. **No credentials in code** - Use environment variables

---

*Last Updated: January 2025*
