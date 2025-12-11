# SignupScreen

**File:** `src/screens/auth/SignupScreen.tsx`

## Overview

The SignupScreen handles user registration with name, email, and password fields. Features comprehensive validation, password confirmation, and email confirmation flow support.

## Features

- **Full Registration Form**: Name, email, password, and confirm password fields
- **Strong Validation**: Email format, password strength, and confirmation matching
- **Password Visibility Toggles**: Independent toggles for both password fields
- **Email Confirmation Flow**: Dedicated success screen when email verification required
- **Error Handling**: Handles duplicate emails, weak passwords, and other auth errors
- **Terms Notice**: Privacy policy and terms of service acknowledgment

## Navigation

| Destination | Trigger |
|-------------|---------|
| Previous (Login) | Back button or "Login" link |
| (Auto) Main App | Successful signup without email confirmation |
| Email Confirmation View | Signup requires email confirmation |

## Data Dependencies

### Hooks Used
- `useAuth()` - Provides `signup()` function and `isAuthenticating` state

### Authentication Result
```typescript
interface SignupResult {
  emailConfirmationRequired: boolean;
  // ... other properties
}
```

## Component Structure

### Main Registration Form
```
SignupScreen
├── SafeAreaView
│   ├── PageHeader ("Sign Up")
│   └── KeyboardAvoidingView
│       └── ScrollView
│           └── Container
│               ├── Header ("Create Account", subtitle)
│               ├── ErrorContainer (conditional)
│               ├── Form
│               │   ├── NameInput
│               │   ├── EmailInput
│               │   ├── PasswordInput (with strength hint)
│               │   ├── ConfirmPasswordInput
│               │   └── SignUpButton
│               ├── LoginContainer (link)
│               └── TermsContainer
```

### Email Confirmation View
```
SignupScreen (emailConfirmationSent === true)
├── SafeAreaView
│   ├── PageHeader ("Check Your Email")
│   └── ConfirmationContainer
│       ├── ConfirmationIcon (email emoji)
│       ├── ConfirmationTitle
│       ├── ConfirmationMessage
│       ├── ConfirmationEmail (highlighted)
│       ├── ConfirmationInstructions
│       ├── GoToLoginButton
│       └── ConfirmationHint (spam folder note)
```

## State Management

| State | Type | Purpose |
|-------|------|---------|
| `name` | `string` | Name input value |
| `email` | `string` | Email input value |
| `password` | `string` | Password input value |
| `confirmPassword` | `string` | Password confirmation value |
| `secureTextEntry` | `boolean` | Toggle password visibility |
| `secureConfirmEntry` | `boolean` | Toggle confirm password visibility |
| `error` | `string \| null` | General auth error |
| `emailConfirmationSent` | `boolean` | Shows confirmation view |
| `nameError` | `string \| null` | Name validation error |
| `emailError` | `string \| null` | Email validation error |
| `passwordError` | `string \| null` | Password validation error |
| `confirmPasswordError` | `string \| null` | Confirm password error |

## Validation Rules

### Name Validation
- Required field
- Minimum 2 characters

### Email Validation
- Required field
- Must match email regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

### Password Validation
- Required field
- Minimum 8 characters
- Must contain uppercase letter
- Must contain lowercase letter
- Must contain at least one number

### Confirm Password Validation
- Required field
- Must match password field exactly

## Error Handling

### Supabase Auth Errors Handled
| Error | User Message |
|-------|--------------|
| `already registered` / `already exists` | "This email is already registered. Please login instead." |
| `weak password` | "Password is too weak. Please use a stronger password." |
| `invalid email` | "Please enter a valid email address." |
| Other errors | Displays original error message |

## Interactions

### Registration Flow
1. User fills all form fields
2. Validation runs on blur and change (after first error)
3. User taps "Sign Up" button
4. All validators run simultaneously
5. If valid, `signup({ email, password, name })` is called
6. On success:
   - If `emailConfirmationRequired`: Show confirmation view
   - Otherwise: RootNavigator handles navigation
7. On error: Display appropriate message

### Password Change Effect
When password changes, confirm password is re-validated if filled:
```typescript
onChangeText={(text) => {
  setPassword(text);
  if (passwordError) validatePassword(text);
  if (confirmPassword) validateConfirmPassword(confirmPassword);
}}
```

### Email Confirmation View
When `emailConfirmationSent === true`:
- Shows success view with email icon
- Displays the user's email address
- Provides "Go to Login" button
- Includes spam folder hint

## UI Components Used

- `View`, `ScrollView`, `KeyboardAvoidingView` - React Native core
- `TextInput`, `Button`, `Text`, `HelperText` - React Native Paper
- `SafeAreaView` - react-native-safe-area-context
- `PageHeader` - Custom component

## Styling Highlights

- PageHeader with back navigation
- White input backgrounds with outlined mode
- Password hint shown below field when typing
- Circular icon container for confirmation view
- Primary color highlights for email in confirmation
- Terms text with caption typography
- 48px height signup button

## Accessibility

- All inputs have `accessibilityLabel` and `accessibilityHint`
- Password hints describe strength requirements
- Independent password toggles with descriptive labels
- Back button accessible via PageHeader
- Form disabled during authentication
- Autocomplete hints: `name`, `email`, `password-new`
- Keyboard types: default for name, email-address for email
