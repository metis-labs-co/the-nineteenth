# The Nineteenth - Golf Competition App

A mobile-first React Native application for creating and managing social golf competitions in Australia.

> **Note**: For detailed configuration and setup instructions, see [PROJECT_SETUP.md](PROJECT_SETUP.md)

## 📱 Features

- **Admin**: Create competitions, add rounds, invite players
- **Player**: Join competitions, score matches on-course (entire group), view leaderboards
- **Offline-First**: Score entry works without internet connection
- **Smart Scoring**: Automatic handicap calculations for Stroke Play and Stableford
- **Australian Focus**: Built specifically for Australian golfers

## 🛠️ Tech Stack

- **Expo** (SDK 50+) - React Native framework
- **TypeScript** - Type safety
- **React Navigation** - Navigation
- **Zustand** - State management
- **React Hook Form** - Form management
- **React Query** - API state & caching
- **Expo SQLite** - Offline database
- **React Native Paper** - UI components (Material Design 3)

## 🚀 Quick Start

### Prerequisites

```bash
# Install Node.js 18+ and pnpm
node --version  # Should be 18+
pnpm --version  # Install pnpm if needed: npm install -g pnpm

# Expo CLI is not needed globally with npx

# For iOS development (Mac only)
xcode-select --install

# For Android development
# Download Android Studio from https://developer.android.com/studio
```

### Installation

```bash
# Navigate to the project directory
cd the-nineteenth

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Edit .env with your API keys
```

### Running the App

```bash
# Start the development server
npx expo start

# Run on iOS simulator (Mac only)
npx expo start --ios

# Run on Android emulator
npx expo start --android

# Run on physical device
# 1. Install Expo Go app on your phone
# 2. Scan the QR code from 'npx expo start'
```

## 📁 Project Structure

```
the-nineteenth/
├── src/
│   ├── components/       # Reusable components
│   ├── screens/          # Screen components
│   ├── navigation/       # Navigation configuration
│   ├── store/           # Zustand stores
│   │   ├── competitionStore.ts
│   │   └── scorecardStore.ts
│   ├── services/        # API services
│   ├── hooks/           # Custom hooks
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   │   └── scoring.ts   # Scoring calculations
│   └── constants/       # App constants
├── assets/              # Images, fonts, etc.
├── __tests__/          # Test files
└── app.json            # Expo configuration
```

## 🎯 Key Files Created

### Types (`src/types/index.ts`)
Complete TypeScript definitions for:
- Competition, Round, Course, Player
- Scorecard, HoleScore, Pairing
- Australian-specific types (states, game types)

### Stores (`src/store/`)
Zustand stores for state management:
- **competitionStore.ts** - Competition and round management
- **scorecardStore.ts** - Scorecard entry and group scoring

### Utils (`src/utils/scoring.ts`)
Scoring utilities:
- Handicap calculations
- Net score calculations
- Stableford points
- Statistics tracking

### Example Screen (`src/screens/player/ScorecardScreen.tsx`)
Full scorecard screen showing:
- Multi-player score entry
- Progress tracking
- Quick navigation between holes
- Submit functionality

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key_here

# Golf Course API (GolfAPI.io)
EXPO_PUBLIC_GOLFAPI_IO_URL=https://api.golfapi.io/v1
EXPO_PUBLIC_GOLFAPI_IO_KEY=your_golfapi_key_here

# Environment
NODE_ENV=development

# Feature Flags
EXPO_PUBLIC_ENABLE_OFFLINE_MODE=true
EXPO_PUBLIC_ENABLE_BACKGROUND_SYNC=true
```

### Path Aliases

The project uses path aliases for cleaner imports:

```typescript
import { Competition } from '@/types/index';
import { useScorecardStore } from '@/store/scorecardStore';
import { calculateNetScore } from '@/utils/scoring';
```

Configured in:
- `tsconfig.json` - TypeScript paths
- `babel.config.js` - Babel module resolver

## 📊 State Management

### Competition Store

```typescript
import { useCompetitionStore } from '@store/competitionStore';

function MyComponent() {
  const { 
    currentCompetition,
    loadCompetition,
    createCompetition 
  } = useCompetitionStore();

  // Use the store...
}
```

### Scorecard Store

```typescript
import { useScorecardStore } from '@store/scorecardStore';

function ScoringComponent() {
  const {
    currentHole,
    setPlayerScore,
    submitScorecard
  } = useScorecardStore();

  // Score entry logic...
}
```

## 🎨 Styling

This project uses React Native StyleSheet for styling:

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  // ... more styles
});
```

For UI components, we're using **React Native Paper** (Material Design 3):

```bash
# Already included in dependencies
# react-native-paper and react-native-vector-icons
```

**Why React Native Paper?** Chosen for excellent TypeScript support, comprehensive component library, and Material Design 3 theming with dark mode.

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test -- --coverage
```

## 📝 Scripts

```bash
npx expo start       # Start Expo dev server
npx expo start --ios # Run on iOS simulator
npx expo start --android # Run on Android emulator
npx expo start --web # Run in web browser
pnpm lint            # Lint code
pnpm lint:fix        # Fix linting issues
pnpm format          # Format code with Prettier
pnpm type-check      # TypeScript type checking
pnpm test            # Run tests
```

## 🏗️ Building for Production

### iOS

```bash
# Install EAS CLI
pnpm add -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios
```

### Android

```bash
# Build for Android
eas build --platform android
```

## Authentication

Implemented using Supabase Auth:
- Email + password signup and login
- Magic links for passwordless login
- Password reset via email
- Biometric app lock (Face ID / fingerprint)

## API Integration

### Backend
All API calls go through **Supabase** (PostgreSQL + Auth + Storage + Real-time). No custom backend server.

### Golf Course API
Course data provided by **GolfAPI.io** with 42,000+ courses globally. See [API_INTEGRATION.md](guides/API_INTEGRATION.md).

## 📱 Offline Support

The app is designed to work offline for scoring:

1. **Expo SQLite** - Local database for rounds and scorecards
2. **Async Storage** - Store preferences and cached data
3. **Background Sync** - Auto-sync when connection returns

### Offline Features

- ✅ View competition details
- ✅ Score entire group
- ✅ Navigate between holes
- ✅ View cached leaderboard
- ⏳ Sync scores when back online

## 🇦🇺 Australian Specifics

### Date Formatting
```typescript
// DD/MM/YYYY format
const formattedDate = format(date, 'dd/MM/yyyy');
```

### States
```typescript
type AustralianState = 
  | 'NSW' | 'VIC' | 'QLD' 
  | 'SA'  | 'WA'  | 'TAS' 
  | 'NT'  | 'ACT';
```

### Terminology
- "Honour system" (not "honor")
- WHS (World Handicap System)
- Private competitions by default

## 🐛 Troubleshooting

### Metro Bundler Issues
```bash
# Clear cache and restart
npx expo start --clear
```

### iOS Simulator Issues
```bash
# Reset simulator
xcrun simctl erase all
```

### Android Emulator Issues
```bash
# Cold boot the emulator
# Android Studio > AVD Manager > Cold Boot Now
```

### TypeScript Errors
```bash
# Check for type errors
pnpm type-check
```

## 🔧 Configuration Files

All configuration files are included in the project root:
- **tsconfig.json** - TypeScript configuration with path aliases
- **babel.config.js** - Babel configuration with module resolver
- **.eslintrc.js** - ESLint rules for code quality
- **.prettierrc** - Prettier formatting rules
- **app.json** - Expo app configuration
- **.env.example** - Environment variables template

For detailed configuration explanations, see [PROJECT_SETUP.md](PROJECT_SETUP.md).

## 📚 Developer Guides

Detailed implementation guides for specific topics:

- **[STYLING_GUIDE.md](guides/STYLING_GUIDE.md)** - React Native styling patterns and best practices
- **[OFFLINE_ARCHITECTURE.md](guides/OFFLINE_ARCHITECTURE.md)** - Offline-first implementation
- **[ALGORITHMS.md](guides/ALGORITHMS.md)** - Scoring and pairing algorithms
- **[API_INTEGRATION.md](guides/API_INTEGRATION.md)** - Golf course API integration
- **[DEPLOYMENT.md](guides/DEPLOYMENT.md)** - CI/CD and deployment
- **[DATABASE_SCHEMA.md](database/DATABASE_SCHEMA.md)** - Database schema
- **[SCORING_PAIRS.md](guides/SCORING_PAIRS.md)** - Designated scoring pairs
- **[SKINS_GAME.md](guides/SKINS_GAME.md)** - Skins gambling side-game
- **[WOLF_GAME.md](guides/WOLF_GAME.md)** - Wolf partner selection side-game
- **[SUBSCRIPTION_TIERS.md](guides/SUBSCRIPTION_TIERS.md)** - Subscription tier system
- **[PUSH_NOTIFICATIONS.md](guides/PUSH_NOTIFICATIONS.md)** - Push notification architecture
- **[LEAGUES.md](guides/LEAGUES.md)** - Cross-course league competitions

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [React Native Paper](https://reactnativepaper.com/)
- [React Hook Form](https://react-hook-form.com/)

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Commit changes: `git commit -am 'Add my feature'`
3. Push to branch: `git push origin feature/my-feature`
4. Submit a pull request

## 📄 License

This project is private and proprietary.

## 👤 Contact

**Sam** - Project Owner & Developer

---

## Roadmap Status

### MVP (Phase 1) - Complete
- [x] Authentication flow
- [x] Backend API integration (Supabase)
- [x] Course search and selection (GolfAPI.io)
- [x] Competition creation wizard
- [x] Player invitation system
- [x] Full scorecard implementation
- [x] Leaderboard display
- [x] Offline sync

### Phase 2 - Complete
- [x] Multi-round competitions
- [x] Auto-pairing algorithm
- [x] Multiple game types (Match Play, Team formats)
- [x] Push notifications
- [x] Statistics dashboard

### Phase 3 - Complete
- [x] Team formats (Ambrose, Best Ball, Scramble, Shamble)
- [x] Social features (friends, player comparison)
- [x] Achievements and cosmetics
- [x] Leagues (cross-course competition)

### In Progress
- [ ] Skins and Wolf side-games with prize pools

---

**Last Updated**: February 2026