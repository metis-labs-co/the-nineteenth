# LoginScreen

**File:** `src/screens/auth/LoginScreen.tsx`

## Overview

The LoginScreen provides email and password authentication for users. It features form validation, error handling, and navigation to the signup screen for new users.

## Features

- **Email/Password Login**: Standard authentication with email and password
- **Form Validation**: Real-time validation on blur and change
- **Password Visibility Toggle**: Show/hide password with eye icon
- **Error Handling**: User-friendly error messages for auth failures
- **Loading States**: Button disabled and loading indicator during auth
- **Keyboard Handling**: KeyboardAvoidingView for proper input focus

## Navigation

| Destination | Trigger |
|-------------|---------|
| `Signup` | "Sign Up" link button |
| (Auto) Main App | Successful login (handled by RootNavigator) |

## Data Dependencies

### Hooks Used
- `useAuth()` - Provides `login()` function and `isAuthenticating` state

### Authentication Flow
Navigation after successful login is handled automatically by RootNavigator's conditional rendering when `isAuthenticated` becomes true.

## Component Structure

```
LoginScreen
├── SafeAreaView
│   └── KeyboardAvoidingView
│       └── ScrollView
│           └── Container
│               ├── Logo
│               ├── Header (Welcome Back, subtitle)
│               ├── ErrorContainer (conditional)
│               ├── Form
│               │   ├── EmailInput (TextInput with validation)
│               │   ├── PasswordInput (TextInput with toggle)
│               │   └── LoginButton
│               └── SignupContainer (link to signup)
```

## State Management

| State | Type | Purpose |
|-------|------|---------|
| `email` | `string` | Email input value |
| `password` | `string` | Password input value |
| `secureTextEntry` | `boolean` | Toggle password visibility |
| `error` | `string \| null` | General auth error message |
| `emailError` | `string \| null` | Email validation error |
| `passwordError` | `string \| null` | Password validation error |

## Validation Rules

### Email Validation
- Required field
- Must match email regex pattern: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

### Password Validation
- Required field
- Minimum 6 characters

## Error Handling

### Supabase Auth Errors Handled
| Error | User Message |
|-------|--------------|
| `Invalid login credentials` | "Invalid email or password. Please try again." |
| `Email not confirmed` | "Please check your email and confirm your account." |
| Other errors | Displays original error message |

## Interactions

### Login Flow
1. User enters email and password
2. Validation runs on blur and change (after first error)
3. User taps "Login" button
4. `validateEmail()` and `validatePassword()` run
5. If valid, `login({ email, password })` is called
6. On success, RootNavigator handles navigation
7. On error, appropriate error message displayed

### Password Toggle
```typescript
<TextInput.Icon
  icon={secureTextEntry ? 'eye' : 'eye-off'}
  onPress={() => setSecureTextEntry(!secureTextEntry)}
/>
```

## UI Components Used

- `View`, `ScrollView`, `KeyboardAvoidingView` - React Native core
- `TextInput`, `Button`, `Text`, `HelperText` - React Native Paper
- `SafeAreaView` - react-native-safe-area-context
- `Logo` - Custom component

## Styling Highlights

- Centered layout with flexible scroll content
- White input backgrounds with outlined mode
- Primary color for active outlines and buttons
- Error container with red left border accent
- 48px height login button
- Platform-specific keyboard behavior (padding on iOS, height on Android)

## Accessibility

- All inputs have `accessibilityLabel` and `accessibilityHint`
- Password toggle has descriptive labels ("Show password"/"Hide password")
- Login and signup buttons have proper accessibility roles
- Form disabled during authentication
- Email keyboard type for email input
- Autocomplete hints for email and password
