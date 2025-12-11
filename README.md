# The Nineteenth

A mobile-first React Native app for creating and managing social golf competitions. Easily set up multi-round competitions with automatic player pairing, handicap-based scoring, and real-time leaderboards.

## Features

- **Competition Management** - Create competitions with custom formats and invite players
- **On-Course Scoring** - Score matches on-course with offline support
- **Smart Handicapping** - Automatic net score calculations
- **Live Leaderboards** - Real-time standings with pull-to-refresh
- **Offline-First** - Full functionality without internet, syncs when connected

## Tech Stack

- **Frontend**: React Native, Expo, TypeScript
- **UI**: React Native Paper (Material Design 3)
- **State**: Zustand + React Query
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Offline**: Expo SQLite + Async Storage

## Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- iOS Simulator (Mac) or Android Emulator
- [Expo Go](https://expo.dev/client) app for physical device testing

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start development server
pnpm start

# Run on iOS
pnpm ios

# Run on Android
pnpm android
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm start` | Start Expo dev server |
| `pnpm ios` | Run on iOS simulator |
| `pnpm android` | Run on Android emulator |
| `pnpm lint` | Run ESLint |
| `pnpm type-check` | Run TypeScript checks |
| `pnpm test` | Run Jest tests |
| `pnpm format` | Format code with Prettier |

## Project Structure

```
src/
├── components/     # Reusable UI components
├── screens/        # Screen components
├── navigation/     # React Navigation setup
├── services/       # API and database services
├── hooks/          # Custom React hooks
├── stores/         # Zustand state stores
├── constants/      # Theme, config, constants
├── types/          # TypeScript type definitions
└── utils/          # Utility functions

docs/               # Project documentation
supabase/           # Database migrations and config
```

## Documentation

Detailed documentation is available in the `docs/` folder:

- [Project Setup](docs/README.md) - Complete setup guide
- [Database Schema](docs/database/DATABASE_SCHEMA.md) - SQL and TypeScript types
- [Styling Guide](docs/guides/STYLING_GUIDE.md) - React Native styling patterns
- [Offline Architecture](docs/guides/OFFLINE_ARCHITECTURE.md) - Offline-first implementation
- [Algorithms](docs/guides/ALGORITHMS.md) - Scoring and pairing logic

## Environment Variables

Create a `.env` file with the following:

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## License

MIT License - see [LICENSE](LICENSE) for details
