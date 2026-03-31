# OTP Verification Screen Design

## Context

The login OTP verification flow currently happens inline on the LoginScreen — after sending a code, the same screen swaps to show a single text input for the verification code. This feels abrupt and doesn't match modern auth UX patterns.

This change extracts OTP verification into a dedicated screen with a polished 6-digit input experience, native OS autofill support, and a design matching the reference screenshot provided by the user.

## Scope

- **Login OTP flow only** — signup email confirmation is unchanged
- New `OTPVerificationScreen` navigated to after successful `sendOtp()`
- New reusable `OtpInput` component for the 6-digit box input pattern
- Cleanup of OTP-related code from LoginScreen
- Navigation and type updates

## New Screen: OTPVerificationScreen

**Location:** `src/screens/auth/OTPVerificationScreen.tsx`

**Route params:**
```typescript
OTPVerification: { email: string };
```

**Layout (top to bottom, vertically centered):**
1. **Back arrow** (top-left) — navigates back to LoginScreen
2. **Email icon** — circular badge with envelope icon using `colors.primaryBackground` bg and `colors.primary` stroke
3. **"Check your email"** — h2 heading
4. **"We sent a 6-digit code to"** — body text, `colors.textSecondary`
5. **Masked email** — bold, `colors.textPrimary` (e.g., `s***@example.com`)
6. **OtpInput** — 6 digit boxes (see component spec below)
7. **Verify button** — muted/disabled when incomplete, primary when all 6 filled. Serves as fallback; auto-submit is primary mechanism
8. **Resend countdown** — "Resend code in Xs" (disabled, `colors.textTertiary`) → "Resend code" (enabled, `colors.primary`) after 30s

**Behavior:**
- Keyboard opens automatically on mount (`autoFocus`)
- When all 6 digits entered → auto-calls `verifyOtp({ email, token })`
- On success → auth state change triggers RootNavigator to show main app (existing behavior)
- On error → error message displayed above digit boxes, boxes get `colors.error` border, digits cleared for retry
- Back arrow → `navigation.goBack()` to LoginScreen
- Resend → calls `sendOtp({ email })`, resets 30s cooldown timer

**Dark mode:** All colors via `useThemeColors()`, following existing app patterns.

## New Component: OtpInput

**Location:** `src/components/common/OtpInput.tsx`

**Props:**
```typescript
interface OtpInputProps {
  length?: number;         // Default: 6
  value: string;
  onChange: (value: string) => void;
  onComplete: (code: string) => void;  // Fires when all digits entered
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;     // Default: true
}
```

**Implementation:**
- **Hidden `<TextInput>`** — positioned off-screen or transparent, captures all keyboard input
  - `maxLength={6}`
  - `keyboardType="number-pad"`
  - `textContentType="oneTimeCode"` (iOS autofill)
  - `autoComplete="one-time-code"` (Android autofill)
  - Regex filter: only accept digits (`/[^0-9]/g` removal)
- **6 visual digit boxes** — rendered as a row of `Pressable` components
  - Tapping any box focuses the hidden TextInput
  - **Filled box:** shows digit, `colors.primary` border (2px)
  - **Current (focused) box:** `colors.primary` border (2px), optionally with a blinking cursor indicator
  - **Empty box:** `colors.border` border (2px)
  - **Error state:** all boxes get `colors.error` border
  - Background: `colors.surface`
  - Border radius: `borderRadius.lg` (10px)
  - Size: 48w × 56h (thumb-friendly, 44px+ touch target)
- **Auto-submit:** when `value.length === length`, call `onComplete(value)`
- Backspace support: deleting removes the last digit naturally via the hidden input

**Export:** Add to `src/components/common/index.ts`

## Email Masking Utility

**Location:** `src/utils/formatters.ts` (or similar existing utils file)

```typescript
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (local.length <= 1) return email;
  return `${local[0]}${'*'.repeat(Math.min(local.length - 1, 5))}@${domain}`;
}
```

Examples:
- `sam@example.com` → `s**@example.com`
- `alexander@example.com` → `a*****@example.com`
- `s@example.com` → `s@example.com` (too short to mask)

## Changes to LoginScreen

**Remove:**
- `otpCode` state and `otpSent` state
- `validateOtpCode()`, `handleVerifyOtp()`, `handleBackToEmail()` functions
- The entire `{useOtp && otpSent ? (...)` JSX branch (OTP code input, verify button, resend/change email actions)
- Related styles: `otpInfoContainer`, `otpInfoText`, `otpEmailText`, `otpActionsContainer`

**Modify `handleSendOtp()`:**
```typescript
const handleSendOtp = async () => {
  setError(null);
  if (!validateEmail(email)) return;
  try {
    await sendOtp({ email });
    navigation.navigate('OTPVerification', { email });
  } catch (err) {
    // existing error handling
  }
};
```

## Navigation Changes

**`src/navigation/types.ts`:**
Add to `RootStackParamList`:
```typescript
OTPVerification: { email: string };
```

**`src/navigation/RootNavigator.tsx`:**
Register under the unauthenticated screens block (alongside Login and Signup):
```typescript
<Stack.Screen
  name="OTPVerification"
  component={OTPVerificationScreen}
  options={{ headerShown: false }}
/>
```

## States & Edge Cases

| State | Behavior |
|-------|----------|
| Empty (just navigated) | Keyboard auto-opens, first box focused with primary border |
| Partially filled | Filled boxes show digits + primary border, cursor on next empty box |
| All 6 filled | Auto-submit triggers, verify button shows spinner |
| Verifying | All inputs disabled, spinner on verify button |
| Error (invalid code) | Error message above boxes, boxes get error border, digits cleared, keyboard stays open |
| Error (rate limited) | Error message shown, resend button disabled |
| Resend cooldown | "Resend code in Xs" with countdown, disabled |
| Resend available | "Resend code" in primary color, tappable |
| Back pressed | Navigate back to LoginScreen (email still populated) |

## Supabase Configuration

Verify in Supabase Dashboard → Authentication → Email Templates that the OTP code length is set to **6 digits**. The current code validates 6-8 digits, suggesting it may be configured for longer codes. Update if needed.

## Verification Plan

1. **Login with OTP:** Enter email → tap Send Code → verify navigation to OTPVerificationScreen → enter 6-digit code → verify auto-submit → confirm authentication succeeds
2. **Error handling:** Enter wrong code → verify error state (red borders, message, clear) → retry with correct code
3. **Resend:** Wait for countdown → tap resend → verify new code sent → enter new code
4. **Back navigation:** Tap back arrow → verify return to LoginScreen with email preserved
5. **Dark mode:** Toggle theme → verify all elements render correctly in both modes
6. **OS autofill:** Copy code from email notification → verify keyboard suggestion bar offers to fill
7. **Password login:** Verify password login flow still works unchanged
8. **Social login:** Verify Apple/Google login still works unchanged
