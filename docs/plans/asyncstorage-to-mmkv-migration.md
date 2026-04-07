# Migrate AsyncStorage to MMKV

## Context

Switching from `@react-native-async-storage/async-storage` (async, slow, SQLite-backed) to `react-native-mmkv` (synchronous, ~30x faster, memory-mapped files). This simplifies code (no async/await for simple flags), eliminates hydration delays in Zustand stores, and improves performance.

## Scope

- **1 new file** created (`src/lib/storage.ts`)
- **12 source files** modified
- **4 test/config files** updated
- **1 package** installed, **1 package** removed

## Current AsyncStorage Usage

| Category | Files | Count |
|----------|-------|-------|
| Zustand persist stores | settingsStore, themeStore, subscriptionStore, screenInfoStore | 4 |
| Supabase auth session | supabase/client.ts | 1 |
| Direct key-value flags | AuthContext, SkinsDisclaimerModal, WolfDisclaimerModal, useUserLocation, useUserCountry, useCountryMismatchPrompt, pushNotifications/helpers, pushNotificationTest | 8 |
| Test files | jest.setup.js, settingsStore.test, SkinsDisclaimerModal.test, usePushNotifications.test | 4 |

---

## Implementation Steps

### Step 1: Install & Configure

- `pnpm add react-native-mmkv`
- Add `"react-native-mmkv"` to `plugins` array in `app.json`
- Run `npx expo prebuild` to regenerate native projects

### Step 2: Create Storage Utility

Create `src/lib/storage.ts` with:

1. **Default MMKV instance** - single instance for all storage
2. **Zustand adapter** - synchronous `StateStorage` for `createJSONStorage()`
3. **Supabase adapter** - async wrapper (Supabase requires Promise-based interface)
4. **Convenience helpers** - `storage.getString()`, `storage.setString()`, `storage.getBoolean()`, `storage.delete()` etc.

### Step 3: Update Test Mock (jest.setup.js)

Replace the AsyncStorage mock with MMKV mock + `@/lib/storage` mock so tests pass as we migrate source files.

### Step 4: Migrate Zustand Stores (4 files)

Each store: replace `AsyncStorage` import with `zustandMMKVStorage` from `@/lib/storage`.

Files:
- `src/store/settingsStore.ts`
- `src/store/themeStore.ts`
- `src/store/subscriptionStore.ts`
- `src/store/screenInfoStore.ts`

**Benefit**: Stores hydrate synchronously on launch - no more flash of default values.

### Step 5: Migrate Supabase Client (1 file)

`src/services/supabase/client.ts` - replace `storage: AsyncStorage` with `storage: supabaseMMKVStorage`.

**Note**: Existing users will need to re-login after this update (session stored in AsyncStorage won't be found in MMKV). Acceptable for current user base size.

### Step 6: Migrate Direct Usage (8 files)

Convert async get/set/remove calls to synchronous MMKV calls. Remove `async`/`await`/`try-catch` wrappers from simple flag operations.

Files:
- `src/context/AuthContext.tsx` - push token registration flag
- `src/components/skins/SkinsDisclaimerModal.tsx` - disclaimer accepted flag
- `src/components/wolf/WolfDisclaimerModal.tsx` - disclaimer accepted flag
- `src/hooks/useUserLocation.ts` - GPS permission asked flag
- `src/hooks/useUserCountry.ts` - country cache with TTL (most complex - uses multiSet/multiGet)
- `src/hooks/useCountryMismatchPrompt.ts` - dismissed country flag
- `src/hooks/pushNotifications/helpers.ts` - push token registration
- `src/utils/pushNotificationTest.ts` - dev utility

**Important**: Exported functions change from `Promise<T>` to `T` return types. Must audit all callers and remove `await`.

### Step 7: Update Test Files (3 files)

- `src/__tests__/store/settingsStore.test.ts`
- `src/__tests__/components/skins/SkinsDisclaimerModal.test.tsx`
- `src/__tests__/hooks/usePushNotifications.test.tsx`

Replace AsyncStorage mocks with storage module mocks, remove `await` from sync calls.

### Step 8: Cleanup

- `pnpm remove @react-native-async-storage/async-storage`
- Remove any remaining AsyncStorage references
- Verify with `grep -r "async-storage\|AsyncStorage" src/`

---

## Verification

- [ ] `pnpm type-check` passes (catch Promise/sync mismatches)
- [ ] `pnpm test` passes
- [ ] App builds on iOS and Android
- [ ] Settings persist across app restart (change distance unit, kill app, reopen)
- [ ] Theme preference persists across restart
- [ ] Auth session persists across restart (login, kill app, reopen)
- [ ] Skins/Wolf disclaimer shows once, doesn't reappear after acceptance
