# ProfileScreen

**File:** `src/screens/profile/ProfileScreen.tsx`

## Overview

The ProfileScreen serves as the user's profile hub, displaying personal information and providing navigation to account settings, statistics, and other profile-related features. Accessible via the Profile tab in bottom navigation.

## Features

- **User Info Card**: Displays avatar, name, email, and handicap
- **Menu Navigation**: Quick access to profile-related screens
- **Sign Out**: Logout functionality with error handling
- **Loading State**: Shows activity indicator while loading user data

## Navigation

| Destination | Trigger | Section |
|-------------|---------|---------|
| `EditProfile` | "Edit Profile" menu item | Account |
| `MyStatistics` | "My Statistics" menu item | Account |
| `Friends` | "Friends" menu item | Account |
| `Settings` | "Settings" menu item | App |
| Help & Support | "Help & Support" menu item | App (TODO) |

## Data Dependencies

### Hooks Used
- `useAuth()` - Get current user, player profile, logout function, loading state
- `useSafeAreaInsets()` - Safe area handling
- `useNavigation()` - Navigation actions

### Data Sources
- `player` - Player profile from auth context (name, email, handicap, photo_url)
- `user` - Supabase user object (fallback for metadata)

## Component Structure

```
ProfileScreen
├── Header ("Profile")
├── LoadingContainer (conditional)
│   └── ActivityIndicator
└── ScrollView
    ├── UserCard
    │   ├── Avatar (Image or Icon)
    │   └── UserInfo (name, email, handicap)
    ├── MenuSection (Account)
    │   └── MenuGroup
    │       ├── MenuItem (Edit Profile)
    │       ├── MenuItem (My Statistics)
    │       └── MenuItem (Friends)
    ├── MenuSection (App)
    │   └── MenuGroup
    │       ├── MenuItem (Settings)
    │       └── MenuItem (Help & Support)
    ├── MenuSection (Sign Out)
    │   └── MenuGroup
    │       └── MenuItem (Sign Out - destructive)
    └── VersionText ("The Nineteenth v0.1.0")
```

## State Management

| State | Type | Purpose |
|-------|------|---------|
| `isLoading` | `boolean` | From useAuth, controls loading indicator |

## Internal Components

### MenuItem
Memoized pressable menu row component.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `string` | required | Material Design icon name |
| `label` | `string` | required | Menu item text |
| `onPress` | `() => void` | required | Press handler |
| `showChevron` | `boolean` | `true` | Show right chevron |
| `destructive` | `boolean` | `false` | Red styling for destructive actions |

## Display Logic

### User Information Fallbacks
```typescript
displayName = player?.name || user?.user_metadata?.name || 'Guest User'
displayEmail = player?.email || user?.email || 'guest@example.com'
displayHandicap = player?.handicap // Only shown if defined
```

### Avatar Display
- Shows `Avatar.Image` if `player.photo_url` exists
- Falls back to `Avatar.Icon` with account icon

## Interactions

1. **Edit Profile**: Navigate to profile editing screen
2. **My Statistics**: Navigate to personal stats dashboard
3. **Friends**: Navigate to friends list with `fromProfile: true` param
4. **Settings**: Navigate to app settings
5. **Help & Support**: TODO - not yet implemented
6. **Sign Out**: Calls `logout()` with error handling

## Sign Out Flow

```typescript
const handleSignOut = async () => {
  try {
    await logout();
  } catch (error) {
    console.error('Sign out failed:', error);
  }
};
```

## UI Components Used

- `View`, `ScrollView`, `Pressable`, `ActivityIndicator` - React Native core
- `Text`, `Avatar`, `Icon` - React Native Paper
- `useSafeAreaInsets` - Safe area handling

## Styling Highlights

- White background cards with rounded corners
- Menu items with bottom borders and gray100 separators
- Pressed state with gray50 background
- Destructive items styled in error color (red)
- Section titles uppercase with letter spacing
- Version text centered at bottom

## Accessibility

- All menu items have `accessibilityRole="button"`
- Menu items have `accessibilityLabel` matching their label
- Loading state prevents interaction during data fetch
- Minimum touch targets via padding
