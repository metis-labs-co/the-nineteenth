# Authentication Flow - The Nineteenth

**Backend:** Supabase Auth
**Session Storage:** AsyncStorage (persistent sessions)
**State Management:** React Query (session/user caching) + React Context (initialization state)

---

## Overview

The app supports multiple authentication methods:

- **Email + Password** -- Traditional sign-up and sign-in
- **Email OTP (One-Time Password)** -- Passwordless sign-in via emailed 6-8 digit code (default on the Login screen)
- **Magic Link** -- Passwordless sign-in via emailed link
- **Google OAuth** -- Server-side OAuth flow via in-app browser (all platforms)
- **Apple Sign In** -- Native iOS flow via `expo-apple-authentication` (iOS only)
- **Biometric Unlock** -- Face ID / fingerprint for returning users (opt-in via settings)
- **Password Reset** -- Email-based reset flow with deep link callback
- **Email Verification** -- Confirmation email sent on sign-up; deep link handling for OTP token verification

---

## Authentication Screens

### 1. Login Screen

**Route:** `Login`
**File:** `src/screens/auth/LoginScreen.tsx`
**When:** App opens with no authenticated session (initial screen in the auth stack)

The Login screen is the default landing screen for unauthenticated users. It displays:

- App logo and branding
- **Google Sign In button** (via `SocialLoginButtons` component)
- An "or" divider
- **Email input** with two sign-in modes, toggled by the user:
  - **OTP mode (default):** Enter email, tap "Send Code", then enter the verification code
  - **Password mode:** Enter email and password, tap "Login"
- Link to toggle between OTP and password sign-in
- Link to navigate to Sign Up screen

The Login screen uses the `useAuth` hook which exposes `login`, `sendOtp`, `verifyOtp`, `loginWithApple`, and `loginWithGoogle`.

### 2. Sign Up Screen

**Route:** `Signup`
**File:** `src/screens/auth/SignupScreen.tsx`
**When:** User taps "Sign Up" from the Login screen (presented as a modal)

The Sign Up screen collects minimal information:

- **Google Sign In button** (via `SocialLoginButtons`)
- An "or" divider
- **Email** and **Password** fields (name is captured during onboarding instead)
- Password validation: 8+ characters, uppercase + lowercase, at least one number
- Terms of Service and Privacy Policy links
- Link back to Login screen

On successful email/password sign-up, if email confirmation is required, the screen transitions to a **confirmation state** that tells the user to check their inbox and click the confirmation link.

### 3. Onboarding Screen

**Route:** `Onboarding`
**File:** `src/screens/onboarding/OnboardingScreen.tsx`
**When:** User is authenticated but has not completed onboarding (`player.handicap_updated_at === null`)

A 7-step swipeable flow shown to new users after authentication:

1. Welcome
2. Name capture
3. Create Competitions overview
4. Push notification permission request
5. Handicap input (0-54)
6. Home club selection
7. Biometric setup (opt-in)

The onboarding gate is enforced by `RootNavigator`, which checks whether the player record exists and has completed setup.

### 4. Biometric Lock Screen

**File:** `src/components/biometric/BiometricLockScreen.tsx`
**When:** App resumes and biometric lock is enabled (after 5 min of inactivity or cold start)

Displays:
- App logo and lock icon
- "Unlock with Face ID" / "Unlock with Fingerprint" button
- "Use password instead" option (signs out, returning to Login)
- Error state with retry

---

## Supported Auth Methods

### Email + Password

Standard Supabase `signInWithPassword` / `signUp` flow. Sign-up stores `name`, `phone`, and `handicap` in `user_metadata` and triggers a database function to create the player profile.

### Email OTP (Default Login Method)

Uses `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })` to send a numeric code. The user enters the code and it is verified via `supabase.auth.verifyOtp({ email, token, type: 'email' })`. This creates a new account if one does not exist.

### Magic Link

Uses `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })` with the deep link `thenineteenth://auth/magic-link`. The user clicks the link in their email, which opens the app and completes authentication via the deep link handler in `AuthProvider`.

### Google OAuth

Implemented in `src/hooks/auth/useSocialAuth.ts`. Uses Supabase's server-side OAuth flow:

1. Call `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } })`
2. Open the returned URL in an in-app browser via `expo-web-browser`
3. Google redirects to Supabase callback, which redirects to the app via deep link
4. Extract `access_token` and `refresh_token` from the redirect URL fragment
5. Set the session via `supabase.auth.setSession()`

Platform-specific Google client IDs are configured via environment variables (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`).

### Apple Sign In (iOS Only)

Implemented in `src/services/auth/socialAuth.ts` and `src/hooks/auth/useSocialAuth.ts`. Uses the native iOS flow:

1. Generate a random nonce and SHA256 hash it
2. Call `AppleAuthentication.signInAsync()` with the hashed nonce, requesting full name and email scopes
3. Pass the identity token and raw nonce to `supabase.auth.signInWithIdToken({ provider: 'apple', token, nonce })`
4. On first sign-in, Apple provides the user's name; this is stored in `user_metadata`

Availability is checked at runtime via `AppleAuthentication.isAvailableAsync()` (iOS 13+).

### Biometric Unlock (Face ID / Fingerprint)

Implemented in `src/services/biometric/biometricService.ts` and `src/hooks/useBiometricLock.ts`. This is not a standalone auth method but a session-resumption mechanism:

- Uses `expo-local-authentication` for Face ID / fingerprint prompts
- Stores the Supabase refresh token in `expo-secure-store`
- On sign-in, if biometric is enabled, the refresh token is saved to SecureStore
- On `TOKEN_REFRESHED` events, the stored token is updated
- On sign-out, the stored token is cleared

**Lock behavior** (managed by `useBiometricLock` in `RootNavigator`):
- **Cold start:** Locks immediately if biometric is enabled and hardware is available
- **Warm resume:** Locks after 5 minutes of inactivity (app in background/inactive)
- **Fail-open:** If biometrics become unavailable (e.g., removed from device settings), the lock screen is bypassed

### Password Reset

Implemented in `src/hooks/auth/usePasswordReset.ts`:
- `resetPassword`: Sends a reset email via `supabase.auth.resetPasswordForEmail()` with deep link `thenineteenth://auth/reset-password`
- `updatePassword`: Updates the password for a logged-in user via `supabase.auth.updateUser({ password })`

---

## Auth State Management

### Architecture

Auth state is managed through a combination of React Context and React Query, composed by the `useAuth` hook:

```
AuthProvider (Context)          -- Singleton auth listener, isInitializing state
  useAuthSession                -- Session query (React Query)
  useAuthUser                   -- User + player profile queries
  useAuthMutations              -- Login, signup, OTP, magic link, logout mutations
  useSocialAuth                 -- Apple + Google login mutations
  usePasswordReset              -- Password reset/update mutations
  useProfileMutations           -- Profile update mutations
```

### AuthProvider (`src/context/AuthContext.tsx`)

Sets up a **single** `supabase.auth.onAuthStateChange` listener at the app level. Responsibilities:

- Updates React Query cache for session and user on every auth event
- Sets `isInitializing = false` after receiving the `INITIAL_SESSION` event
- On `SIGNED_IN`: Invalidates player profile query, logs in to RevenueCat, stores biometric refresh token, registers push notification token
- On `SIGNED_OUT`: Clears player cache, logs out of RevenueCat, clears biometric credentials, clears push registration status
- On `TOKEN_REFRESHED`: Updates the biometric refresh token in SecureStore
- Handles deep links for email confirmation / magic links (OTP token verification via `Linking`)

### useAuth Hook (`src/hooks/useAuth.ts`)

Thin composition layer that combines all focused auth hooks into a single unified API:

```typescript
const {
  // State
  user, session, player, isLoading, isInitializing, isAuthenticating, isAuthenticated, error,

  // Auth actions
  login, signup, loginWithMagicLink, sendOtp, verifyOtp, logout,

  // Social auth
  loginWithApple, loginWithGoogle, isSocialLoggingIn, isAppleAvailable,

  // Password management
  resetPassword, updatePassword,

  // Profile management
  updateProfile, refreshProfile,

  // Token management
  getToken, refreshSession,
} = useAuth();
```

For granular usage, individual hooks can be imported directly:

```typescript
import { useAuthSession } from '@/hooks/auth/useAuthSession';
import { useAuthUser } from '@/hooks/auth/useAuthUser';
```

---

## Navigation Setup

### RootNavigator (`src/navigation/RootNavigator.tsx`)

Uses conditional rendering based on auth state:

```
if isInitializing || (isAuthenticated && isLoading):
  -> Loading screen

if isAuthenticated && isLocked (biometric):
  -> BiometricLockScreen

if !isAuthenticated:
  -> Auth Stack: Login, Signup

if isAuthenticated && needsOnboarding:
  -> Onboarding screen

if isAuthenticated && onboarded:
  -> Main app (tabs + detail screens)
```

There is no separate Welcome screen. The Login screen serves as the initial landing page with app branding, social login buttons, and the email sign-in form.

---

## Session Persistence

Supabase Auth persists sessions to AsyncStorage automatically:

```typescript
// src/services/supabase/client.ts
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Not needed for mobile apps
  },
});
```

**Session lifecycle:**
1. User authenticates -> Session saved to AsyncStorage
2. App reopens -> Session loaded from AsyncStorage, `INITIAL_SESSION` event fires
3. Token nears expiry -> Auto-refreshed via refresh token, `TOKEN_REFRESHED` event fires
4. User signs out -> Session cleared from AsyncStorage, push token unregistered, biometric credentials cleared

---

## Deep Link Handling

The `AuthProvider` handles incoming deep links for auth callbacks:

- **Email confirmation:** `thenineteenth://auth/confirm` -- Extracts `token_hash` and `type` from query params, calls `supabase.auth.verifyOtp()`
- **Magic link:** `thenineteenth://auth/magic-link` -- Same OTP verification flow
- **Password reset:** `thenineteenth://auth/reset-password` -- Handled by Supabase's `PASSWORD_RECOVERY` auth event
- **Google OAuth callback:** `thenineteenth://google-auth` -- Tokens extracted from URL fragment by `useSocialAuth`

Both initial URLs (app opened via deep link) and runtime URLs (link tapped while app is running) are handled.

---

## Error Handling

### Common Auth Errors

| Error | Context | User-Facing Message |
|-------|---------|---------------------|
| `Invalid login credentials` | Email/password login | "Invalid email or password. Please try again." |
| `Email not confirmed` | Login before verification | "Please check your email and confirm your account." |
| `already registered` / `already exists` | Duplicate signup | "This email is already registered. Please login instead." |
| `weak password` | Signup validation | "Password is too weak. Please use a stronger password." |
| `rate limit` | Too many OTP requests | "Too many requests. Please wait a moment and try again." |
| `Invalid` / `expired` | OTP verification | "Invalid or expired code. Please try again." |
| `ERR_CANCELED` / `canceled` | Social login cancelled | Silently ignored (user-initiated cancellation) |

### Client-Side Validation

- **Email:** Required, must match `^[^\s@]+@[^\s@]+\.[^\s@]+$`
- **Password (login):** Required, minimum 6 characters
- **Password (signup):** Required, minimum 8 characters, must contain uppercase + lowercase + number
- **OTP code:** Required, digits only, 6-8 characters

---

## Sign-Out Flow

Sign-out is triggered from the Settings screen and performs the following in order:

1. Attempt to unregister the push notification token from the database
2. Call `supabase.auth.signOut()` which clears the session from AsyncStorage
3. The `SIGNED_OUT` auth event triggers cleanup in `AuthProvider`:
   - Clear player profile cache
   - Log out of RevenueCat
   - Clear push token registration status from AsyncStorage
   - Clear biometric refresh token from SecureStore
   - Clear push notification queries
4. `RootNavigator` detects `isAuthenticated = false` and renders the Login screen

---

## Integration Points

Authentication connects to several other systems on sign-in:

| System | Action | When |
|--------|--------|------|
| **Player Profile** | Fetch or create via `ensurePlayerProfile()` | Every login/social login/OTP verify |
| **RevenueCat** | `loginToRevenueCat(userId)` | `SIGNED_IN` event |
| **Push Notifications** | `attemptPushTokenRegistration(userId)` | `SIGNED_IN` event (non-blocking) |
| **Biometric** | Store refresh token in SecureStore | `SIGNED_IN` and `TOKEN_REFRESHED` events |
| **Onboarding** | Gate check via `player.handicap_updated_at` | Navigation rendering |

---

## Key Files

| File | Purpose |
|------|---------|
| `src/context/AuthContext.tsx` | AuthProvider with singleton auth listener |
| `src/hooks/useAuth.ts` | Unified auth hook (composes sub-hooks) |
| `src/hooks/auth/useAuthSession.ts` | Session query and token management |
| `src/hooks/auth/useAuthUser.ts` | User and player profile queries |
| `src/hooks/auth/useAuthMutations.ts` | Login, signup, OTP, magic link, logout |
| `src/hooks/auth/useSocialAuth.ts` | Apple and Google social login |
| `src/hooks/auth/usePasswordReset.ts` | Password reset and update |
| `src/hooks/auth/useProfileMutations.ts` | Profile update mutations |
| `src/hooks/auth/utils.ts` | `ensurePlayerProfile()` helper |
| `src/services/auth/socialAuth.ts` | Native Apple Sign In + Google client config |
| `src/services/biometric/biometricService.ts` | Face ID / fingerprint + SecureStore |
| `src/hooks/useBiometricLock.ts` | Lock screen orchestration |
| `src/components/biometric/BiometricLockScreen.tsx` | Lock screen UI |
| `src/components/auth/SocialLoginButtons.tsx` | Google sign-in button component |
| `src/screens/auth/LoginScreen.tsx` | Login screen (OTP + password + social) |
| `src/screens/auth/SignupScreen.tsx` | Sign-up screen (email/password + social) |
| `src/screens/onboarding/OnboardingScreen.tsx` | Post-auth onboarding flow |
| `src/navigation/RootNavigator.tsx` | Auth-gated navigation |
| `src/services/supabase/client.ts` | Supabase client with session persistence |
| `src/types/auth.ts` | TypeScript types for all auth interfaces |

---

## Testing Checklist

- [ ] Sign up with email/password (valid credentials)
- [ ] Sign up with duplicate email (shows error)
- [ ] Sign up with weak password (shows validation errors)
- [ ] Email confirmation flow (deep link opens app, verifies token)
- [ ] Login with email/password (correct credentials)
- [ ] Login with incorrect credentials (shows error)
- [ ] OTP flow: send code, enter code, verify
- [ ] OTP flow: resend code, change email
- [ ] OTP flow: expired/invalid code (shows error)
- [ ] Google sign-in (opens in-app browser, redirects back)
- [ ] Apple sign-in on iOS (native prompt, authenticates)
- [ ] Social login cancellation (no error shown)
- [ ] Session persists after app restart
- [ ] Session auto-refreshes before expiry
- [ ] Password reset email sends and deep link works
- [ ] Biometric lock on cold start (when enabled)
- [ ] Biometric lock after 5 min inactivity
- [ ] Biometric fail-open when hardware unavailable
- [ ] Sign-out clears session, push token, biometric credentials
- [ ] Onboarding shown for new users, skipped for returning users
- [ ] Protected routes redirect to login when unauthenticated

---

## Security Practices

1. **No password storage** -- Supabase handles hashing server-side
2. **HTTPS only** -- Supabase enforces TLS
3. **Secure token storage** -- Biometric refresh tokens stored in `expo-secure-store` (Keychain on iOS, Keystore on Android)
4. **Session storage** -- AsyncStorage for session persistence (encrypted on device)
5. **Row-Level Security** -- All database queries filtered by authenticated user ID
6. **Rate limiting** -- Supabase built-in rate limiting on auth endpoints
7. **No credentials in code** -- All keys via environment variables
8. **Nonce validation** -- Apple Sign In uses SHA256-hashed nonces to prevent replay attacks
9. **Ephemeral browser sessions** -- Google OAuth uses `preferEphemeralSession` to skip cookie persistence

---

*Last Updated: March 2026*
