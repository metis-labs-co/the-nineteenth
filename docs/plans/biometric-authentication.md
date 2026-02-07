# Plan: Biometric Authentication (Face ID / Fingerprint Unlock)

## Overview

Add a "Quick Unlock" feature allowing users to protect app access with Face ID (iOS) or fingerprint/face unlock (Android). After initial email+password login, users can enable biometric authentication in Settings. When returning to the app after 5 minutes of inactivity, a biometric prompt gates access to the app.

This is a UI-level lock only — the Supabase session in AsyncStorage remains the source of truth for authentication. A parallel copy of the refresh token is stored in SecureStore for session recovery if the AsyncStorage session expires.

## Approach

1. Create a `biometricService` (stateless utility functions) following the existing `pushService` singleton pattern
2. Add `biometricEnabled` to the existing Zustand settings store
3. Create a `useBiometricLock` hook used directly in `RootNavigator` — no new context provider needed since only RootNavigator controls the lock state
4. Build a `BiometricLockScreen` component using existing common components (LogoHorizontal, GolfBallLoader)
5. Add a "Security" section to the existing SettingsScreen using the existing `SettingRow` component
6. Hook into AuthContext's existing `onAuthStateChange` events to sync the SecureStore refresh token

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Lock approach | UI gate in RootNavigator | Supabase manages real auth; biometric just gates the UI |
| State management | Hook in RootNavigator, not a Context | Only RootNavigator needs lock state — no descendants read it |
| SecureStore content | Refresh token only, not full session | Supabase manages its own session lifecycle; duplicating is fragile |
| Lock timeout | 5 min hardcoded constant | Simple, no settings UI needed — matches banking app conventions |
| Device fallback | `disableDeviceFallback: false` | Device passcode works as fallback for accessibility |
| No biometric hardware | Hide Security section entirely | Cleaner than showing a disabled toggle with explanation |
| Biometric toggle | Requires biometric confirmation to enable | Proves biometric works before committing to it |
| Reset to defaults | Preserves biometricEnabled | Security setting should not be accidentally reset |
| Service location | `src/services/biometric/` | Parallel to `src/services/notifications/`, not under auth |
| Login screen recovery | Deferred (Phase 2) | Ship the lock screen first; expired-session recovery adds complexity |

---

## Phase 1: Setup & Dependencies

### Step 1.1: Install Dependencies
**Status:** ⏳ Pending
**Type:** Command

**Prompt:**
```
Install expo-local-authentication and expo-secure-store packages:
pnpm add expo-local-authentication expo-secure-store
```

> **Note:** Biometric APIs require a dev client build (`eas build --profile development`). They will NOT work in Expo Go. Plan your testing accordingly — you'll need a dev build from Step 1.2 onward.

**Deliverables:**
- [ ] `package.json` updated with both dependencies
- [ ] `pnpm-lock.yaml` updated

**Dependencies:** None

---

### Step 1.2: Update app.json Permissions
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
Update `app.json` with biometric permissions and plugin configuration.

Changes to `app.json`:
1. Add to `expo.ios.infoPlist`:
   ```json
   "NSFaceIDUsageDescription": "Allow The Nineteenth to unlock the app with Face ID for quick and secure access."
   ```

2. Add to `expo.android.permissions` array:
   ```json
   "android.permission.USE_BIOMETRIC",
   "android.permission.USE_FINGERPRINT"
   ```

3. Add to `expo.plugins` array:
   ```json
   "expo-local-authentication",
   "expo-secure-store"
   ```

**Deliverables:**
- [ ] Face ID usage description added to iOS infoPlist
- [ ] Biometric permissions added to Android
- [ ] Both plugins registered

**Dependencies:** Step 1.1

---

## Phase 2: Core Service & State

### Step 2.1: Create Biometric Service
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
Create `src/services/biometric/biometricService.ts` following the exact `pushService` singleton pattern from `src/services/notifications/pushService.ts`.

The service exports a plain object of stateless utility functions. No React, no hooks, no state.

**Types to define:**
```typescript
export type BiometricType = 'facial' | 'fingerprint' | 'none';

export interface BiometricAvailability {
  isAvailable: boolean;      // hardware exists AND biometrics enrolled
  biometricType: BiometricType;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  cancelled?: boolean;       // true when user taps cancel
}
```

**Functions to implement:**

1. `checkAvailability(): Promise<BiometricAvailability>`
   - Call `LocalAuthentication.hasHardwareAsync()` and `LocalAuthentication.isEnrolledAsync()`
   - Call `LocalAuthentication.supportedAuthenticationTypesAsync()` to determine type
   - Map Expo's `AuthenticationType` enum: `FACIAL_RECOGNITION` → 'facial', `FINGERPRINT` → 'fingerprint', default → 'none'
   - Return combined availability object

2. `authenticate(promptMessage?: string): Promise<BiometricAuthResult>`
   - Call `LocalAuthentication.authenticateAsync()` with:
     - `promptMessage`: defaults to 'Unlock The Nineteenth'
     - `cancelLabel`: 'Use Password'
     - `disableDeviceFallback`: false (allow device passcode as fallback)
     - `fallbackLabel`: 'Use Passcode'
   - Map result: `{ success: true }` or `{ success: false, error, cancelled: error === 'user_cancel' }`
   - Wrap in try/catch returning `{ success: false, error: message }`

3. `storeRefreshToken(refreshToken: string): Promise<boolean>`
   - Call `SecureStore.setItemAsync('biometric_refresh_token', refreshToken)`
   - Return true on success, false on failure (try/catch, log warning)

4. `getStoredRefreshToken(): Promise<string | null>`
   - Call `SecureStore.getItemAsync('biometric_refresh_token')`
   - Return token or null on failure

5. `clearStoredRefreshToken(): Promise<void>`
   - Call `SecureStore.deleteItemAsync('biometric_refresh_token')`
   - Silently catch errors (log warning only)

**Export as singleton object** at bottom of file (matching pushService pattern):
```typescript
export const biometricService = {
  checkAvailability,
  authenticate,
  storeRefreshToken,
  getStoredRefreshToken,
  clearStoredRefreshToken,
};
export default biometricService;
```

Also create `src/services/biometric/index.ts` barrel export following `src/services/notifications/index.ts`:
```typescript
export { biometricService, default } from './biometricService';
export type { BiometricAvailability, BiometricAuthResult, BiometricType } from './biometricService';
```

**Deliverables:**
- [ ] `src/services/biometric/biometricService.ts` created
- [ ] `src/services/biometric/index.ts` barrel export created
- [ ] All functions wrapped in try/catch with graceful error handling
- [ ] Follows pushService singleton pattern exactly

**Dependencies:** Step 1.1

---

### Step 2.2: Add Biometric Setting to Zustand Store
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
Update `src/store/settingsStore.ts` to add the biometric enabled preference.

Changes:

1. Add to `SettingsState` interface:
   ```typescript
   biometricEnabled: boolean;
   setBiometricEnabled: (enabled: boolean) => void;
   ```

2. Add to `DEFAULT_SETTINGS`:
   ```typescript
   biometricEnabled: false,
   ```

3. Add action in the store creator:
   ```typescript
   setBiometricEnabled: (enabled) => set({ biometricEnabled: enabled }),
   ```

4. Update `resetToDefaults` to **preserve biometricEnabled** (security settings should not be accidentally reset):
   ```typescript
   resetToDefaults: () => set((state) => ({ ...DEFAULT_SETTINGS, biometricEnabled: state.biometricEnabled })),
   ```

5. Add convenience hook export at the bottom of the file:
   ```typescript
   export function useBiometricSetting() {
     const biometricEnabled = useSettingsStore((state) => state.biometricEnabled);
     const setBiometricEnabled = useSettingsStore((state) => state.setBiometricEnabled);
     return { biometricEnabled, setBiometricEnabled };
   }
   ```

**Deliverables:**
- [ ] `biometricEnabled` state added with `false` default
- [ ] `setBiometricEnabled` action added
- [ ] `resetToDefaults` preserves `biometricEnabled`
- [ ] `useBiometricSetting()` convenience hook exported

**Dependencies:** None

---

## Phase 3: Lock Screen & Integration

### Step 3.1: Create useBiometricLock Hook
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
Create `src/hooks/useBiometricLock.ts` — the core orchestration hook used only in RootNavigator.

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';
import { biometricService } from '@/services/biometric';

const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
```

**Interface:**
```typescript
export interface UseBiometricLockReturn {
  isLocked: boolean;
  isAuthenticating: boolean;
  unlock: () => Promise<void>;
  error: string | null;
}
```

**Hook signature:** `useBiometricLock(isAuthenticated: boolean): UseBiometricLockReturn`

**Behavior:**

1. **Cold start lock**: On mount, if `biometricEnabled && isAuthenticated`, check `biometricService.checkAvailability()`. If available, set `isLocked = true`. Use a `hasCheckedInitialLock` ref to only run once.

2. **AppState listener (warm resume)**: When `biometricEnabled && isAuthenticated`:
   - On `background`/`inactive`: record `Date.now()` in a `backgroundTimestampRef`
   - On `active`: if elapsed time > `LOCK_TIMEOUT_MS`, set `isLocked = true` and clear error
   - Clean up subscription on unmount

3. **unlock() function**:
   - Set `isAuthenticating = true`, clear error
   - Call `biometricService.authenticate('Unlock The Nineteenth')`
   - On success: `setIsLocked(false)`
   - On cancel: `setError(null)` (stay locked, no error shown)
   - On failure: `setError(result.error || 'Authentication failed')`
   - Always `setIsAuthenticating(false)` in finally

4. **Auto-trigger**: When `isLocked` becomes true, automatically call `unlock()` to immediately present the biometric prompt without requiring a button tap. Use an effect that depends only on `isLocked` to avoid re-triggering.

5. **Fail open**: If `checkAvailability()` returns `isAvailable: false` (user removed biometrics from device), skip locking entirely — don't lock the user out.

**Deliverables:**
- [ ] `src/hooks/useBiometricLock.ts` created
- [ ] Cold start and warm resume lock detection working
- [ ] Auto-trigger biometric prompt on lock
- [ ] Graceful handling of cancel, failure, and unavailable biometrics

**Dependencies:** Steps 2.1, 2.2

---

### Step 3.2: Create BiometricLockScreen Component
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
Create `src/components/biometric/BiometricLockScreen.tsx` — a full-screen overlay that blocks app access.

**Props interface:**
```typescript
interface BiometricLockScreenProps {
  onUnlock: () => Promise<void>;
  onSignOut: () => void;
  isAuthenticating: boolean;
  error: string | null;
}
```

**Layout (vertically centered):**
1. `LogoHorizontal` (from `@/components/common`) at top — `width={200}`
2. Lock icon: `Icon source="lock"` size 64 in a circular container with `colors.gray100` background
3. Status area:
   - While authenticating: `GolfBallLoader size="md"` with text "Authenticating..."
   - On error: error text in `colors.error` with retry button
   - Default: "Tap to unlock" text
4. Unlock button: `TouchableOpacity` with biometric-type-specific icon and label (e.g. "Unlock with Face ID"), `height: 56`, `backgroundColor: colors.primary`
5. "Use password instead" text button at bottom — calls `onSignOut()` prop to force full re-login (sign-out logic stays in RootNavigator, not in this component)

**Styling rules:**
- Use `useThemeColors()` for all colors
- Import `spacing`, `typography`, `borderRadius` from `@/constants/theme`
- `StyleSheet.create()` at bottom of file
- Full screen: `flex: 1`, `backgroundColor: colors.background`
- Safe area aware: use `useSafeAreaInsets()`

**Determine biometric type for icon/label:**
- Call `biometricService.checkAvailability()` on mount, store in local state
- `'facial'` → icon: `face-recognition`, label: "Face ID"
- `'fingerprint'` → icon: `fingerprint`, label: "Fingerprint"
- Default → icon: `lock`, label: "Biometric"

Also create `src/components/biometric/index.ts` barrel export:
```typescript
export { default as BiometricLockScreen } from './BiometricLockScreen';
```

**Deliverables:**
- [ ] `src/components/biometric/BiometricLockScreen.tsx` created
- [ ] `src/components/biometric/index.ts` barrel export created
- [ ] Uses existing common components (LogoHorizontal, GolfBallLoader, Icon)
- [ ] Follows project styling patterns (useThemeColors, spacing, typography)
- [ ] "Use password" fallback triggers full sign-out

**Dependencies:** Step 2.1

---

### Step 3.3: Integrate Lock into RootNavigator
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
Update `src/navigation/RootNavigator.tsx` to show the biometric lock screen when locked.

Changes:

1. Add imports:
   ```typescript
   import { useBiometricLock } from '@/hooks/useBiometricLock';
   import { BiometricLockScreen } from '@/components/biometric';
   import { supabase } from '@/services/supabase/client';
   ```

2. In `RootNavigator` component body, after the existing `useAuth()` call:
   ```typescript
   const { isLocked, isAuthenticating: isBioAuthenticating, unlock, error: bioError } = useBiometricLock(isAuthenticated);

   const handleSignOut = useCallback(() => {
     supabase.auth.signOut();
   }, []);
   ```

3. Add a new condition **after** the existing loading check and **before** the NavigationContainer return. Insert between line ~115 (`if (isInitializing || ...)`) and line ~126 (`return <NavigationContainer ...>`):
   ```typescript
   // Show biometric lock screen when app is locked
   if (isAuthenticated && isLocked) {
     return (
       <BiometricLockScreen
         onUnlock={unlock}
         onSignOut={handleSignOut}
         isAuthenticating={isBioAuthenticating}
         error={bioError}
       />
     );
   }
   ```

This renders the lock screen INSTEAD of the entire navigation tree, so no app content is visible.

**Deliverables:**
- [ ] `useBiometricLock` hook integrated
- [ ] `handleSignOut` callback passed as prop (keeps supabase import out of lock screen component)
- [ ] Lock screen renders when `isAuthenticated && isLocked`
- [ ] Lock screen renders before NavigationContainer (no app content visible)

**Dependencies:** Steps 3.1, 3.2

---

## Phase 4: Auth Flow Sync & Settings UI

### Step 4.1: Sync SecureStore in AuthContext
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
Update `src/context/AuthContext.tsx` to keep the SecureStore refresh token in sync with auth events.

Changes:

1. Add import at top:
   ```typescript
   import { biometricService } from '@/services/biometric';
   import { useSettingsStore } from '@/store/settingsStore';
   ```

2. In the `onAuthStateChange` callback, add a **new** event branch for `TOKEN_REFRESHED` (this event is not currently handled — add it after the existing `SIGNED_IN` block):
   ```typescript
   if (event === 'TOKEN_REFRESHED' && newSession?.refresh_token) {
     const biometricEnabled = useSettingsStore.getState().biometricEnabled;
     if (biometricEnabled) {
       biometricService.storeRefreshToken(newSession.refresh_token).catch((err) => {
         console.warn('[AuthProvider] Failed to update biometric refresh token:', err);
       });
     }
   }
   ```
   Note: `useSettingsStore.getState()` reads Zustand state outside React — this is the standard Zustand approach for callbacks.

3. In the existing `SIGNED_OUT` handler, add alongside the existing cleanup:
   ```typescript
   // Clear biometric credentials on sign out
   biometricService.clearStoredRefreshToken().catch((err) => {
     console.warn('[AuthProvider] Failed to clear biometric refresh token:', err);
   });
   ```

4. In the existing `SIGNED_IN` handler, store the refresh token if biometric is enabled:
   ```typescript
   // Store refresh token for biometric unlock (non-blocking)
   const biometricEnabled = useSettingsStore.getState().biometricEnabled;
   if (biometricEnabled && newSession?.refresh_token) {
     biometricService.storeRefreshToken(newSession.refresh_token).catch((err) => {
       console.warn('[AuthProvider] Failed to store biometric refresh token:', err);
     });
   }
   ```

All SecureStore operations are non-blocking (fire-and-forget with catch) to avoid disrupting the auth flow, matching the existing push token registration pattern.

**Deliverables:**
- [ ] Refresh token stored in SecureStore on SIGNED_IN (if biometric enabled)
- [ ] Refresh token updated on TOKEN_REFRESHED (if biometric enabled)
- [ ] Refresh token cleared on SIGNED_OUT (always)
- [ ] All operations non-blocking with error logging

**Dependencies:** Step 2.1

---

### Step 4.2: Add Security Section to Settings Screen
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
Update `src/screens/profile/SettingsScreen.tsx` to add a biometric toggle in a new "Security" section.

Changes:

1. Add imports:
   ```typescript
   import { biometricService } from '@/services/biometric';
   import type { BiometricAvailability } from '@/services/biometric';
   import { useBiometricSetting } from '@/store/settingsStore';
   ```

2. Add state and effects in component body:
   ```typescript
   const { biometricEnabled, setBiometricEnabled } = useBiometricSetting();
   const [biometricAvailability, setBiometricAvailability] = useState<BiometricAvailability | null>(null);
   const [isToggling, setIsToggling] = useState(false);
   const { session } = useAuth(); // already available if useAuth is imported, otherwise add import

   useEffect(() => {
     biometricService.checkAvailability().then(setBiometricAvailability);
   }, []);
   ```

3. Add toggle handler (with `isToggling` guard to prevent the Switch from visually flickering during the async biometric prompt):
   ```typescript
   const handleBiometricToggle = useCallback(async (value: boolean) => {
     if (isToggling) return;
     setIsToggling(true);
     try {
       if (value) {
         // Verify biometric works before enabling
         const result = await biometricService.authenticate(
           'Confirm your identity to enable biometric lock'
         );
         if (result.success) {
           // Store current refresh token for session recovery
           if (session?.refresh_token) {
             await biometricService.storeRefreshToken(session.refresh_token);
           }
           setBiometricEnabled(true);
         }
         // If cancelled or failed, toggle stays off (no action needed)
       } else {
         await biometricService.clearStoredRefreshToken();
         setBiometricEnabled(false);
       }
     } finally {
       setIsToggling(false);
     }
   }, [session, setBiometricEnabled, isToggling]);
   ```

4. Add Security section JSX **between** the existing "Scoring Entry" section and the "Reset Section". Only show if device has biometric hardware:
   ```tsx
   {biometricAvailability?.isAvailable && (
     <>
       <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />
       <View style={styles.section}>
         <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Security</Text>
         <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
           Protect access to your account
         </Text>
         <View
           style={[styles.settingsGroup, { backgroundColor: colors.surface }]}
           pointerEvents={isToggling ? 'none' : 'auto'}
         >
           <SettingRow
             icon={biometricAvailability.biometricType === 'facial' ? 'face-recognition' : 'fingerprint'}
             label={biometricAvailability.biometricType === 'facial' ? 'Face ID' : 'Fingerprint Lock'}
             description="Require biometric authentication to open the app"
             value={biometricEnabled}
             onValueChange={handleBiometricToggle}
             colors={colors}
           />
         </View>
       </View>
     </>
   )}
   ```

The existing `SettingRow` component (already defined in this file) is reused as-is. The existing `styles.section`, `styles.sectionTitle`, `styles.sectionDescription`, `styles.settingsGroup`, and `styles.divider` are all reused — no new styles needed.

**Deliverables:**
- [ ] Security section added between Scoring Entry and Reset sections
- [ ] Uses existing SettingRow component
- [ ] Section hidden on devices without biometric hardware
- [ ] Toggle requires biometric confirmation to enable
- [ ] Disabling clears SecureStore credentials
- [ ] No new styles needed

**Dependencies:** Steps 2.1, 2.2

---

## Critical Files

### To Modify
- `package.json` — Add expo-local-authentication, expo-secure-store
- `app.json` — Face ID description, biometric permissions, plugins
- `src/store/settingsStore.ts` — Add biometricEnabled state + useBiometricSetting hook
- `src/context/AuthContext.tsx` — Sync refresh token to SecureStore on auth events
- `src/navigation/RootNavigator.tsx` — Show BiometricLockScreen when locked
- `src/screens/profile/SettingsScreen.tsx` — Add Security section with biometric toggle

### To Create
- `src/services/biometric/biometricService.ts` — Biometric + SecureStore utility functions
- `src/services/biometric/index.ts` — Barrel export
- `src/hooks/useBiometricLock.ts` — Lock state management hook
- `src/components/biometric/BiometricLockScreen.tsx` — Lock screen UI
- `src/components/biometric/index.ts` — Barrel export

### Reference (do not modify)
- `src/services/notifications/pushService.ts` — Pattern reference for biometric service
- `src/services/notifications/index.ts` — Pattern reference for barrel export
- `src/hooks/useAuth.ts` — Provides session data for settings toggle
- `src/components/common/LogoHorizontal.tsx` — Reuse in lock screen
- `src/components/common/GolfBallLoader.tsx` — Reuse in lock screen

---

## Edge Cases & Error Handling

| Scenario | Handling |
|----------|----------|
| Device has no biometric hardware | Security section hidden in Settings; lock never triggers |
| User removes biometrics from device | `checkAvailability()` returns false → skip lock (fail open) |
| SecureStore write fails | Log warning, disable biometric setting, show alert |
| User cancels biometric prompt | Stay locked, show "Try Again" button, no error message |
| Biometric auth fails (wrong face/finger) | Show error, allow retry via button |
| App backgrounded < 5 min | No lock on resume |
| App backgrounded > 5 min | Lock on resume, auto-trigger biometric prompt |
| Cold start with biometric enabled | Lock immediately, auto-trigger biometric prompt |
| Deep link triggers brief background | Elapsed time < 5 min → no lock (handled naturally by timeout) |
| "Use password" tapped on lock screen | Calls `onSignOut` prop → `supabase.auth.signOut()` in RootNavigator → auth state change → login screen |

---

## Deferred (Phase 2)

- **Login screen biometric button**: When Supabase session fully expires but SecureStore has a refresh token, show Face ID button on login screen for session recovery. Deferred because it adds complexity around expired refresh tokens and error states.
- **Configurable lock timeout**: Not needed for now — 5 min is standard.
- **Per-action biometric gates**: (e.g., require Face ID to delete a competition) — separate feature if needed.

---

## Verification

How to test the complete feature:

1. **Build dev client**: `eas build --profile development --platform ios` (Face ID requires dev build, not Expo Go)
2. **iOS Simulator biometric testing**: Simulator menu → Features → Face ID → Enrolled, then Features → Face ID → Matching/Non-Matching Face
3. **Type check**: `pnpm type-check` passes with no errors
4. **Test enabling**: Settings → Security → toggle on → Face ID prompt → confirm → toggle shows enabled
5. **Test cold start lock**: Force-quit app → reopen → biometric prompt appears → authenticate → app unlocks
6. **Test warm resume lock**: Background app → wait 5+ min → reopen → biometric prompt → authenticate → app unlocks
7. **Test short background**: Background app → reopen within 5 min → no lock prompt
8. **Test cancel**: On biometric prompt, tap cancel → lock screen stays with "Try Again" button
9. **Test password fallback**: On lock screen, tap "Use password" → signed out → login screen
10. **Test disable**: Settings → Security → toggle off → SecureStore cleared → no lock on resume
11. **Test no biometrics**: On device without biometrics → Security section not shown in Settings
