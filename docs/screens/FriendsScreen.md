# FriendsScreen

**File:** `src/screens/social/FriendsScreen.tsx`

## Overview

Social hub for managing golf friends. Displays friends list with profiles, handles friend requests, and provides search functionality to add new friends.

## Features

- **Friends List**: Cards with photo, name, email, handicap
- **Friend Requests**: Pending requests with accept/decline
- **Add Friend Modal**: Search players by name
- **Pull-to-Refresh**: Refresh friends and requests
- **Navigation to Profile**: Tap friend to view stats
- **Remove Friends**: Remove or cancel pending requests

## Navigation

| Destination | Trigger | Condition |
|-------------|---------|-----------|
| Previous screen | Back button | When `fromProfile: true` |
| `PlayerDetail` | Tap friend card | View friend's profile |

## Route Parameters

```typescript
type Props = {
  route: {
    params?: {
      fromProfile?: boolean; // Show back button
    }
  }
}
```

## Data Dependencies

### Hooks Used
- `useFriends()` - Fetch friends list
- `useFriendRequests()` - Fetch pending requests
- `useSearchPlayers(query)` - Search for players
- `useAddFriend()` - Send friend request
- `useAcceptFriendRequest()` - Accept request
- `useDeclineFriendRequest()` - Decline request
- `useRemoveFriend()` - Remove friend

### Data Types
```typescript
interface Friend {
  id: string;
  name: string;
  email: string;
  photo_url: string | null;
  handicap: number | null;
  friendship_id: string;
  friendship_status: 'pending' | 'accepted';
}

interface FriendRequest {
  id: string;
  requester: {
    name: string;
    email: string;
    photo_url: string | null;
  };
}

interface PlayerSearchResult {
  id: string;
  name: string;
  email: string;
  photo_url: string | null;
  handicap: number | null;
  is_friend: boolean;
  has_pending_request: boolean;
  request_direction: 'sent' | 'received' | null;
}
```

## Component Structure

```
FriendsScreen
├── Header
│   ├── HeaderLeft
│   │   ├── BackButton (conditional)
│   │   └── Title ("Friends")
│   └── AddFriendButton
├── ScrollView (with RefreshControl)
│   ├── FriendRequestsSection (conditional)
│   │   ├── SectionHeader with Badge
│   │   └── RequestCards
│   └── FriendsListSection
│       └── FriendCards or EmptyState
└── AddFriendModal
    ├── ModalHeader
    ├── SearchContainer
    │   └── SearchInput
    └── SearchResults
        └── SearchResultCards or Prompts
```

## State Management

| State | Type | Purpose |
|-------|------|---------|
| `showAddModal` | `boolean` | Add friend modal visibility |
| `acceptingRequestId` | `string \| null` | Currently accepting request |
| `decliningRequestId` | `string \| null` | Currently declining request |

### Add Friend Modal State
| State | Type | Purpose |
|-------|------|---------|
| `searchQuery` | `string` | Search input value |
| `addingPlayerId` | `string \| null` | Currently adding player |

## Internal Components

### FriendCard
Memoized friend card with:
- Avatar (image or icon)
- Name with pending badge
- Email and handicap
- Remove/cancel button

### FriendRequestCard
Memoized request card with:
- Requester avatar and info
- Accept button (green checkmark)
- Decline button (gray X)

### SearchResultCard
Memoized search result with:
- Player avatar and info
- Status badge (Friends, Request Sent, Respond)
- Add button (if no existing relationship)

### AddFriendModal
Full-screen modal with:
- Search input with clear button
- Minimum 2 character requirement
- Loading, results, and empty states

## Interactions

### Friend Actions
- **View Profile**: Tap card → `PlayerDetail`
- **Remove**: Tap remove icon → `removeFriend.mutateAsync()`

### Request Actions
- **Accept**: Tap checkmark → `acceptRequest.mutateAsync()`
- **Decline**: Tap X → `declineRequest.mutateAsync()`

### Search/Add Actions
- **Search**: Type 2+ characters → `useSearchPlayers()`
- **Add Friend**: Tap + icon → `addFriend.mutateAsync()`
- **Clear Search**: Tap X in input

## Search Result States

| Condition | Display |
|-----------|---------|
| Already friends | "Friends" badge |
| Request sent | "Request Sent" badge |
| Request received | "Respond" badge |
| No relationship | Add button |

## Empty States

### No Friends
- Icon: `account-group-outline`
- Title: "No friends yet"
- Message about tracking scores
- "Add Friend" action button

### No Search Results
- Icon: `account-question`
- Message with search query

### Search Prompt
- Icon: `account-search`
- "Enter at least 2 characters to search"

## UI Components Used

- `View`, `ScrollView`, `RefreshControl`, `Pressable`, `Modal`, `TextInput`, `FlatList`, `ActivityIndicator`, `KeyboardAvoidingView` - React Native core
- `Text`, `Avatar`, `Icon`, `Button`, `Badge`, `Divider` - React Native Paper
- `SafeAreaView` - react-native-safe-area-context
- `EmptyState`, `ErrorState` - Custom components

## Styling Highlights

- White header with border bottom
- Primary-lighter circular add button
- Friend cards with 56px avatars
- Pending friends have faded avatars
- Amber pending badge
- Request buttons: green accept, gray decline
- Modal with page sheet presentation
- Search input with gray50 background
- Status badges with rounded full radius

## Accessibility

- Back button with proper role and label
- Friend cards with descriptive labels and hints
- Remove buttons with context-aware labels
- Request action buttons with labels
- Search input with accessibility label
- Add friend button with label
- Hit slop on small touch targets
