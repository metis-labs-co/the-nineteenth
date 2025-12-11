# The Nineteenth - Golf Competition App

A mobile-first React Native application for creating and managing social golf competitions in Australia.

> **Note**: For detailed configuration and setup instructions, see [PROJECT_SETUP.md](../PROJECT_SETUP.md)

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
- **NativeBase** - UI components (chosen for easy setup)

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
cd GolfApp

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
GolfApp/
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
# API Configuration
API_BASE_URL=http://localhost:3000/api
AUSTRALIA_GOLF_API_KEY=your_key_here
AUSTRALIA_GOLF_API_URL=https://zylalabs.com/api/3176

# Environment
NODE_ENV=development

# Feature Flags
ENABLE_OFFLINE_MODE=true
ENABLE_BACKGROUND_SYNC=true
```

### Path Aliases

The project uses path aliases for cleaner imports:

```typescript
import { Competition } from '@types/index';
import { useScorecardStore } from '@store/scorecardStore';
import { calculateNetScore } from '@utils/scoring';
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

For UI components, we're using **NativeBase** (already installed):

```bash
# Already included in dependencies
# native-base and react-native-svg
```

**Why NativeBase?** Chosen for the easiest setup and extensive pre-built components for rapid development.

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

## 🔐 Authentication (To Be Implemented)

Currently using mock authentication. Future implementation will use:
- Email + invite codes (no password for MVP)
- Magic links for passwordless login
- Optional social login (Google, Apple)

## 🌐 API Integration (To Be Implemented)

### Backend Endpoints

Expected API structure:

```typescript
// Competitions
POST   /api/competitions
GET    /api/competitions/:id
PUT    /api/competitions/:id
GET    /api/competitions/:id/leaderboard

// Rounds
POST   /api/rounds
GET    /api/rounds/:id

// Scorecards
POST   /api/scorecards
GET    /api/scorecards/:id
GET    /api/rounds/:id/scorecards

// Courses
GET    /api/courses/search
GET    /api/courses/:id
```

### API Client Setup

```typescript
// src/services/api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptors for auth, error handling, etc.
```

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
- Golf Australia (governing body)
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

For detailed configuration explanations, see [PROJECT_SETUP.md](../PROJECT_SETUP.md).

## 📚 Developer Guides

Detailed implementation guides for specific topics:

- **[STYLING_GUIDE.md](guides/STYLING_GUIDE.md)** - React Native styling patterns and best practices
- **[OFFLINE_ARCHITECTURE.md](guides/OFFLINE_ARCHITECTURE.md)** - Offline-first implementation
- **[ALGORITHMS.md](guides/ALGORITHMS.md)** - Scoring and pairing algorithms
- **[API_INTEGRATION.md](guides/API_INTEGRATION.md)** - Golf course API integration
- **[DEPLOYMENT.md](guides/DEPLOYMENT.md)** - CI/CD and deployment
- **[DATABASE_SCHEMA.md](database/DATABASE_SCHEMA.md)** - Database schema

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [NativeBase](https://nativebase.io/)
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

## 🚧 TODO / Roadmap

### MVP (Phase 1)
- [ ] Complete authentication flow
- [ ] Backend API integration
- [ ] Course search and selection
- [ ] Competition creation wizard
- [ ] Player invitation system
- [ ] Full scorecard implementation
- [ ] Leaderboard display
- [ ] Offline sync

### Phase 2
- [ ] Multi-round competitions
- [ ] Auto-pairing algorithm
- [ ] Multiple game types (Match Play, etc.)
- [ ] Email/SMS notifications
- [ ] Statistics dashboard

### Phase 3
- [ ] Team formats (Ambrose, Best Ball)
- [ ] Social features (comments, photos)
- [ ] Advanced analytics
- [ ] Export results (PDF, CSV)

---

**Last Updated**: November 2024