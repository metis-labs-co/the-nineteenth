# The Nineteenth - Project Setup Guide

> **Note**: For a quick start guide and day-to-day commands, see [docs/README.md](README.md)

## Tech Stack Decisions

- **Expo** (SDK 50+) - React Native framework
- **TypeScript** - Type safety
- **React Hook Form** - Form management
- **Zustand** - State management
- **React Navigation** - Navigation
- **React Query** - API state management
- **React Native Paper** - UI components ✅ **CHOSEN** (Material Design 3, excellent TypeScript support, comprehensive component library)
- **React Native Vector Icons** - Icons (Tabler icons included)
- **Async Storage** - Local storage
- **Expo SQLite** - Local database for offline support
- **pnpm** - Package manager ✅ **CHOSEN** (faster, more efficient than npm)

---

## Initial Setup

### 1. Create Expo Project

```bash
# Create new Expo project with TypeScript
npx create-expo-app the-nineteenth --template expo-template-blank-typescript

cd the-nineteenth
```

**Note**: The project directory is `the-nineteenth` and uses `the-nineteenth` as the package name.

### 2. Install Core Dependencies

**All dependencies are already installed.** If setting up from scratch, use:

```bash
# Navigation
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context

# State Management
pnpm add zustand

# Forms
pnpm add react-hook-form

# API & Data Fetching
pnpm add @tanstack/react-query axios

# Storage & Offline
npx expo install expo-sqlite @react-native-async-storage/async-storage

# UI Components - React Native Paper (CHOSEN)
pnpm add react-native-paper react-native-vector-icons
npx expo install react-native-safe-area-context

# Icons
pnpm add react-native-vector-icons
pnpm add -D @types/react-native-vector-icons

# Date handling
pnpm add date-fns

# Dev Dependencies
pnpm add -D @types/react @types/react-native eslint prettier eslint-config-prettier eslint-plugin-react @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-react-hooks babel-plugin-module-resolver

# Testing
pnpm add -D jest @testing-library/react-native @testing-library/jest-native jest-expo
```

### 3. Optional but Recommended (Already Installed)

```bash
# Offline support
pnpm add @react-native-community/netinfo

# Background sync
npx expo install expo-task-manager expo-background-fetch

# Camera (for profile photos)
npx expo install expo-camera expo-image-picker

# Location (for finding nearby courses)
npx expo install expo-location
```

**All of these are already in package.json.**

---

## Project Structure

```
the-nineteenth/
├── src/
│   ├── components/              # Reusable components
│   │   ├── common/             # Common UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   └── Loading.tsx
│   │   ├── competition/        # Competition-specific components
│   │   │   ├── CompetitionCard.tsx
│   │   │   ├── RoundCard.tsx
│   │   │   └── LeaderboardList.tsx
│   │   └── scorecard/          # Scorecard components
│   │       ├── HoleInput.tsx
│   │       ├── PlayerScoreCard.tsx
│   │       └── ScorecardReview.tsx
│   │
│   ├── screens/                 # Screen components
│   │   ├── admin/
│   │   │   ├── CreateCompetitionScreen.tsx
│   │   │   ├── AddRoundsScreen.tsx
│   │   │   └── AddPlayersScreen.tsx
│   │   ├── player/
│   │   │   ├── CompetitionDashboardScreen.tsx
│   │   │   ├── ScorecardScreen.tsx
│   │   │   └── LeaderboardScreen.tsx
│   │   └── auth/
│   │       └── WelcomeScreen.tsx
│   │
│   ├── navigation/              # Navigation configuration
│   │   ├── AppNavigator.tsx
│   │   ├── AdminStack.tsx
│   │   └── PlayerStack.tsx
│   │
│   ├── store/                   # Zustand stores
│   │   ├── competitionStore.ts
│   │   ├── scorecardStore.ts
│   │   ├── authStore.ts
│   │   └── offlineStore.ts
│   │
│   ├── services/                # API services
│   │   ├── api/
│   │   │   ├── client.ts       # Axios instance
│   │   │   ├── competitions.ts
│   │   │   ├── rounds.ts
│   │   │   ├── courses.ts
│   │   │   └── scorecards.ts
│   │   └── offline/
│   │       ├── database.ts     # SQLite setup
│   │       └── sync.ts         # Sync logic
│   │
│   ├── hooks/                   # Custom hooks
│   │   ├── useCompetition.ts
│   │   ├── useScorecard.ts
│   │   ├── useOffline.ts
│   │   └── useNetworkStatus.ts
│   │
│   ├── types/                   # TypeScript types
│   │   ├── competition.ts
│   │   ├── round.ts
│   │   ├── course.ts
│   │   ├── player.ts
│   │   └── scorecard.ts
│   │
│   ├── utils/                   # Utility functions
│   │   ├── scoring.ts          # Scoring calculations
│   │   ├── handicap.ts         # Handicap calculations
│   │   ├── formatting.ts       # Date/number formatting
│   │   └── validation.ts       # Form validation
│   │
│   ├── constants/               # Constants
│   │   ├── colors.ts
│   │   ├── gameTypes.ts
│   │   └── states.ts           # Australian states
│   │
│   └── assets/                  # Static assets
│       ├── images/
│       └── fonts/
│
├── __tests__/                   # Tests
├── .env                         # Environment variables
├── .env.example                 # Example env file
├── app.json                     # Expo configuration
├── babel.config.js              # Babel configuration
├── tsconfig.json                # TypeScript configuration
├── .eslintrc.js                 # ESLint configuration
├── .prettierrc                  # Prettier configuration
└── package.json
```

---

## Configuration Files

### tsconfig.json

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@screens/*": ["src/screens/*"],
      "@services/*": ["src/services/*"],
      "@store/*": ["src/store/*"],
      "@hooks/*": ["src/hooks/*"],
      "@types/*": ["src/types/*"],
      "@utils/*": ["src/utils/*"],
      "@constants/*": ["src/constants/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

### babel.config.js

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@services': './src/services',
            '@store': './src/store',
            '@hooks': './src/hooks',
            '@types': './src/types',
            '@utils': './src/utils',
            '@constants': './src/constants',
          },
        },
      ],
      // If using Tamagui:
      // [
      //   '@tamagui/babel-plugin',
      //   {
      //     components: ['tamagui'],
      //     config: './tamagui.config.ts',
      //   },
      // ],
    ],
  };
};
```

### .eslintrc.js

```javascript
module.exports = {
  root: true,
  extends: [
    'expo',
    'prettier',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
```

### .prettierrc

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

### .env.example

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
ENABLE_OFFLINE_MODE=true
ENABLE_BACKGROUND_SYNC=true
```

### app.json

**This file is now created in your project root.**

```json
{
  "expo": {
    "name": "The Nineteenth",
    "slug": "the-nineteenth",
    "version": "0.1.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1f2937"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.thenineteenth.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1f2937"
      },
      "package": "com.thenineteenth.app"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow The Nineteenth to find nearby golf courses."
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

---

## Running the Project

```bash
# Install dependencies (if needed)
pnpm install

# Start development server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android

# Run on web
npx expo start --web

# Other useful commands
pnpm lint           # Check code quality
pnpm lint:fix       # Fix linting issues
pnpm format         # Format code with Prettier
pnpm type-check     # Check TypeScript types
pnpm test           # Run tests
```

---

## Configuration Files Status

All configuration files have been created and are ready to use:

- ✅ **tsconfig.json** - TypeScript configuration with path aliases
- ✅ **babel.config.js** - Babel with module-resolver plugin
- ✅ **.eslintrc.js** - ESLint rules for code quality
- ✅ **.prettierrc** - Code formatting rules
- ✅ **app.json** - Expo app configuration
- ✅ **.env.example** - Environment variables template
- ✅ **package.json** - Updated with "the-nineteenth" as package name

## Next Steps

1. ✅ Configuration complete
2. Create `.env` file from `.env.example` and add your API keys
3. Start building your src/ folder structure (see docs/README.md)
4. Begin with core type definitions in `src/types/`
5. Set up Zustand stores in `src/store/`
6. Create reusable components in `src/components/`

---

## Tech Stack Decisions Summary

| Decision Point | Chosen Option | Reason |
|---------------|---------------|---------|
| **App Name** | The Nineteenth | Project name |
| **UI Library** | React Native Paper | Material Design 3, excellent TypeScript support |
| **Package Manager** | pnpm | Faster, more efficient |
| **Commands** | `npx expo` | Modern Expo standard |
| **Styling** | React Native StyleSheet | Native approach with design tokens |

For day-to-day development, refer to [docs/README.md](README.md).

---

## Developer Guides

Detailed implementation guides for specific topics:

- **[STYLING_GUIDE.md](docs/guides/STYLING_GUIDE.md)** - React Native styling patterns, design tokens, and best practices
- **[OFFLINE_ARCHITECTURE.md](docs/guides/OFFLINE_ARCHITECTURE.md)** - Offline-first implementation with SQLite and background sync
- **[ALGORITHMS.md](docs/guides/ALGORITHMS.md)** - Scoring calculations, pairing logic, and handicap formulas
- **[API_INTEGRATION.md](docs/guides/API_INTEGRATION.md)** - Golf course API integration and caching strategies
- **[DEPLOYMENT.md](docs/guides/DEPLOYMENT.md)** - CI/CD, EAS builds, app store submissions, and monitoring
- **[DATABASE_SCHEMA.md](docs/database/DATABASE_SCHEMA.md)** - Complete database schema with SQL and TypeScript types
- **[SCORING_PAIRS.md](guides/SCORING_PAIRS.md)** - Designated scoring pairs
- **[SKINS_GAME.md](guides/SKINS_GAME.md)** - Skins gambling side-game
- **[WOLF_GAME.md](guides/WOLF_GAME.md)** - Wolf partner selection side-game
- **[SUBSCRIPTION_TIERS.md](guides/SUBSCRIPTION_TIERS.md)** - Subscription tier system
- **[PUSH_NOTIFICATIONS.md](guides/PUSH_NOTIFICATIONS.md)** - Push notification architecture
- **[LEAGUES.md](guides/LEAGUES.md)** - Cross-course league competitions

See [CLAUDE.md](../CLAUDE.md) for project overview and complete documentation map.