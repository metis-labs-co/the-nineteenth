# Common Components

Shared UI components used across the application.

---

## PageHeader

Consistent header component for all screens following Material Design 3 principles.

### Features

- ✅ Platform-specific heights (56dp Android / 44dp iOS)
- ✅ Safe area inset handling (notch, Dynamic Island)
- ✅ Platform-specific elevation (iOS shadow / Android elevation)
- ✅ Optional back button with navigation
- ✅ Up to 2 action buttons with badge indicators
- ✅ Customizable colors
- ✅ Full accessibility support
- ✅ 48dp × 48dp touch targets

### Import

```tsx
import { PageHeader } from '@/components/common';
```

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | ✅ Yes | - | Page title displayed in center |
| `showBack` | `boolean` | No | `false` | Show back button on left |
| `onBack` | `() => void` | No | - | Callback when back button pressed |
| `rightActions` | `RightAction[]` | No | `[]` | Action buttons on right (max 2) |
| `backgroundColor` | `string` | No | `colors.surface` | Custom background color |
| `titleColor` | `string` | No | `colors.textPrimary` | Custom title color |

#### RightAction Interface

```tsx
interface RightAction {
  icon: string;                    // Icon name or character
  onPress: () => void;              // Action callback
  accessibilityLabel: string;       // Accessibility label (required)
  showBadge?: boolean;              // Show badge dot indicator
}
```

### Basic Usage

```tsx
import { PageHeader } from '@/components/common';

function MyScreen() {
  return (
    <View>
      <PageHeader title="My Competitions" />
      {/* Screen content */}
    </View>
  );
}
```

### With Back Button

```tsx
import { PageHeader } from '@/components/common';
import { useNavigation } from '@react-navigation/native';

function DetailScreen() {
  const navigation = useNavigation();

  return (
    <View>
      <PageHeader
        title="Competition Details"
        showBack
        onBack={() => navigation.goBack()}
      />
      {/* Screen content */}
    </View>
  );
}
```

### With Action Buttons

```tsx
import { PageHeader } from '@/components/common';

function LeaderboardScreen() {
  const handleShare = () => {
    // Share logic
  };

  const handleRefresh = () => {
    // Refresh logic
  };

  return (
    <View>
      <PageHeader
        title="Leaderboard"
        rightActions={[
          {
            icon: '🔄',
            onPress: handleRefresh,
            accessibilityLabel: 'Refresh leaderboard',
          },
          {
            icon: '↗',
            onPress: handleShare,
            accessibilityLabel: 'Share leaderboard',
          },
        ]}
      />
      {/* Screen content */}
    </View>
  );
}
```

### Complete Example (Back + Actions)

```tsx
import { PageHeader } from '@/components/common';
import { useNavigation } from '@react-navigation/native';

function ScorecardScreen() {
  const navigation = useNavigation();

  const handleInfo = () => {
    // Show help modal
  };

  return (
    <View>
      <PageHeader
        title="Scorecard Entry"
        showBack
        onBack={() => navigation.goBack()}
        rightActions={[
          {
            icon: 'ℹ',
            onPress: handleInfo,
            accessibilityLabel: 'Show help information',
          },
        ]}
      />
      {/* Screen content */}
    </View>
  );
}
```

### Custom Styling

```tsx
import { PageHeader } from '@/components/common';
import { colors } from '@/constants/theme';

function PremiumScreen() {
  return (
    <View>
      <PageHeader
        title="Premium Features"
        backgroundColor={colors.primary}
        titleColor={colors.white}
      />
      {/* Screen content */}
    </View>
  );
}
```

### Accessibility

The PageHeader component follows WCAG accessibility guidelines:

- ✅ All interactive elements have 48dp × 48dp touch targets
- ✅ Accessibility roles set (`header`, `button`, `text`)
- ✅ Accessibility labels provided for all actions
- ✅ Hit slop areas for easier tapping
- ✅ Screen reader compatible

### Platform Differences

#### iOS
- Header height: **44dp**
- Shadow: Soft shadow with offset
- Back button: Shows "←" icon

#### Android
- Header height: **56dp**
- Elevation: Material elevation (no offset)
- Back button: Shows "←" icon

Both platforms handle safe area insets automatically (notch, Dynamic Island, status bar).

### Design Guidelines

Following the aesthetic guidelines (`/docs/design/aesthetic-guidelines.md`):

- **Spacing**: 16dp horizontal padding
- **Typography**: 20sp title (titleLarge variant)
- **Elevation**: Subtle (2dp shadow)
- **Colors**: Surface background, primary text
- **Touch targets**: Minimum 48dp × 48dp
- **Border**: Hairline bottom border

### TODO: Icon Integration

Currently using placeholder text icons (←, ↗, ⋮). Once you integrate an icon library:

1. **Install icon library:**
   ```bash
   pnpm add react-native-vector-icons
   ```

2. **Update RightAction interface:**
   ```tsx
   interface RightAction {
     icon: string;
     iconLibrary?: 'MaterialIcons' | 'Ionicons';
     // ...
   }
   ```

3. **Recommended icons:**
   - Back: `arrow-back` (MaterialIcons)
   - Share: `share` or `ios-share-outline` (Ionicons)
   - Menu: `menu` (MaterialIcons)
   - Settings: `settings` (MaterialIcons)
   - Info: `info-outline` (MaterialIcons)
   - Notifications: `notifications-outline` (Ionicons)

### Testing

When testing this component:

1. ✅ Test on both iOS and Android simulators
2. ✅ Verify safe area insets (devices with notch/Dynamic Island)
3. ✅ Test accessibility with screen reader (VoiceOver/TalkBack)
4. ✅ Verify touch targets are comfortable
5. ✅ Test back navigation works correctly
6. ✅ Test action buttons trigger callbacks

### Examples File

See `PageHeader.examples.tsx` for comprehensive usage examples including:
- Simple title only
- Back button navigation
- Single action button
- Multiple action buttons
- Badge indicators
- Custom colors
- Typical screen implementation

---

## Future Common Components

Components to be added:

- **OfflineIndicator** - Network status banner
- **ErrorState** - Reusable error display
- **EmptyState** - Empty list placeholder
- **LoadingSpinner** - Loading indicator

See `/docs/MVP-PHASE-1-PROGRESS.md` for implementation timeline.
