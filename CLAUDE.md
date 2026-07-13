# The Nineteenth - Project Documentation

## Project Overview

**The Nineteenth** is a mobile-first React Native application for creating and managing social golf competitions. The app allows organizers to easily set up multi-round competitions with automatic player pairing, handicap-based scoring, and real-time leaderboards. Players can score matches on-course with offline support, tracking scores for their entire group.

### Problem Statement

Currently there isn't a product which allows you to socially create a mini golf league/competition. Existing solutions are either:
- Too complex (designed for club-level competitions)
- Too simplistic (basic scoring apps without competition management)
- Lack proper offline support for on-course scoring

This app bridges that gap by providing a lightweight, social way to organize casual golf competitions with proper scoring, handicapping, and match management.

### Core Value Proposition

1. **Create custom golf competitions in minutes** - Simple 4-step setup flow
2. **Automatic player pairing and scheduling** - Smart algorithms rotate partners
3. **On-course scoring with offline support** - Score entire group from one device
4. **Smart scoring with handicap adjustments** - Auto-calculate net scores
5. **Real-time leaderboards** - See standings update live
6. **Mobile-first experience** - Optimized for on-course use

### Target Market

**Primary Focus**: Australia (Melbourne, Sydney, Brisbane metropolitan areas)

**Initial Users**:
- Social golf groups (4-20 players)
- Weekend warriors organizing friendly competitions
- Corporate golf events
- Golf club social committees

**Future Expansion**: New Zealand, then global

---

## 📚 Documentation Structure

### Main Documentation
- **CLAUDE.md** (this file) - Project overview and quick reference
- **[PROJECT_SETUP.md](docs/PROJECT_SETUP.md)** - Complete setup and configuration guide
- **[docs/README.md](docs/README.md)** - Quick start and day-to-day commands

### Developer Guides
Detailed implementation guides for specific topics:

- **[STYLING_GUIDE.md](docs/guides/STYLING_GUIDE.md)** - React Native styling patterns, design tokens, best practices
- **[OFFLINE_ARCHITECTURE.md](docs/guides/OFFLINE_ARCHITECTURE.md)** - Offline-first implementation with SQLite and background sync
- **[ALGORITHMS.md](docs/guides/ALGORITHMS.md)** - Scoring calculations, pairing logic, handicap formulas
- **[API_INTEGRATION.md](docs/guides/API_INTEGRATION.md)** - Golf course API integration and caching
- **[DEPLOYMENT.md](docs/guides/DEPLOYMENT.md)** - CI/CD, EAS builds, app store deployments, monitoring
- **[SCORING_PAIRS.md](docs/guides/SCORING_PAIRS.md)** - Designated scoring pairs for competitive rounds
- **[SCORING_ARCHITECTURE.md](docs/guides/SCORING_ARCHITECTURE.md)** - Scoring domain map, blast-radius table, per-format invariants (read before editing scoring)
- **[SKINS_GAME.md](docs/guides/SKINS_GAME.md)** - Skins gambling side-game configuration and settlement
- **[WOLF_GAME.md](docs/guides/WOLF_GAME.md)** - Wolf strategic partner selection side-game
- **[SUBSCRIPTION_TIERS.md](docs/guides/SUBSCRIPTION_TIERS.md)** - Subscription tier system, limits, grandfathering, admin management
- **[PUSH_NOTIFICATIONS.md](docs/guides/PUSH_NOTIFICATIONS.md)** - Push notification architecture, setup, testing, troubleshooting
- **[LEAGUES.md](docs/guides/LEAGUES.md)** - Leagues feature: cross-course competition, WHS differentials, leaderboards

### Database
- **[DATABASE_SCHEMA.md](docs/database/DATABASE_SCHEMA.md)** - Complete schema with SQL tables and TypeScript types

### Features & Specifications
- **[MVP-PHASE-1.md](docs/MVP-PHASE-1.md)** - MVP feature specifications (Phase 1)

---

## Tech Stack

**All tech stack decisions finalized.** See [PROJECT_SETUP.md](docs/PROJECT_SETUP.md) for installation instructions.

### Frontend
- **Expo** (SDK 54) - React Native development framework
- **React Native** - iOS + Android native apps
- **TypeScript** - Type safety throughout
- **React Navigation** - Native navigation
- **React Query** - API state management + offline caching
- **Zustand** - Lightweight client state management
- **React Native Paper** - UI component library (Material Design 3)
- **StyleSheet API** - Component-level styling ([guide](docs/guides/STYLING_GUIDE.md))
- **pnpm** - Package manager

### Backend
- **Supabase** - Backend-as-a-Service (PostgreSQL + Auth + Storage + Real-time)
- **PostgreSQL 15+** - Primary database with PostGIS for course coordinates
- **Supabase Auth** - User authentication (email + magic links)
- **Supabase Storage** - File storage (avatars, course images)
- **Row-Level Security** - Multi-tenancy and data isolation

### Offline Support
- **Expo SQLite** - Local database for rounds and scorecards
- **Async Storage** - Key-value storage for preferences
- **NetInfo** - Network status detection
- **Background Fetch** - Auto-sync when connection returns

See [OFFLINE_ARCHITECTURE.md](docs/guides/OFFLINE_ARCHITECTURE.md) for complete implementation details.

### Push Notifications
- **Expo Notifications** - Cross-platform push notification support
- **Supabase Edge Functions** - Server-side push delivery via Expo Push API
- **Database Triggers** - Automatic push sending on notification events
- **User Preferences** - Category-based push notification toggles

See [PUSH_NOTIFICATIONS.md](docs/guides/PUSH_NOTIFICATIONS.md) for complete implementation details.

---

## Architecture Overview

### High-Level Architecture

**Frontend (React Native)**
- Expo + TypeScript for mobile development
- React Native Paper for UI components
- Zustand for client state management
- React Query for API data fetching and caching
- Offline-first with local SQLite database

**Backend (Supabase)**
- PostgreSQL 15+ for data storage
- Row-Level Security for multi-tenancy
- Real-time subscriptions for live updates
- Supabase Auth for user management
- PostGIS extension for geo queries

**External APIs**
- GolfAPI.io for course data (search, hole-by-hole data, tee ratings)
- See [API_INTEGRATION.md](docs/guides/API_INTEGRATION.md)

### Key Design Patterns

**Offline-First**: Score entry works without internet. Data syncs when connectivity returns.
- Critical flows work offline: view competition, enter scores, navigate holes
- Background sync with conflict resolution
- See [OFFLINE_ARCHITECTURE.md](docs/guides/OFFLINE_ARCHITECTURE.md)

**Multi-Tenancy**: Players only see competitions they're invited to via Row-Level Security policies.

**Mobile-Optimized**: Large touch targets, minimal typing, progressive disclosure, fast navigation.

---

## Data Model

### Core Entities

1. **Competition** - Competition metadata (name, dates, handicap system, invite code)
2. **Round** - Individual rounds within competitions (course, date, game type, status)
3. **Club** - Golf club/facility information (name, location, coordinates, contact details)
4. **Course** - Golf course information (name, holes, pars, stroke indexes, linked to club)
5. **Tee** - Tee box information (name, color, slope/course rating, per-hole distances)
6. **HoleCoordinate** - GPS coordinates for tees and greens (for distance calculations)
7. **Player** - Player profiles (name, email, handicap, photo, home club)
8. **CompetitionPlayer** - Join table linking players to competitions
9. **Pairing** - Player groupings for each round (2-4 players per group)
10. **ScoringPair** - Designated scorer/marker for each player in a round (optional feature for competitive rounds)
11. **Scorecard** - Hole-by-hole scores for each player in each round
12. **HoleScore** - Individual hole scores (strokes, putts, penalties, etc.)
13. **UserSubscription** - User subscription tier and payment status
14. **TierLimits** - Configuration defining limits per subscription tier
15. **SkinsGame** - Skins gambling side-game configuration (pot type, value, participants)
16. **SkinsResult** - Hole-by-hole skins outcomes (winner or carryover)
17. **SkinsPayout** - Final settlement summary for each participant
18. **CompetitionPrizePool** - Prize pool funding for competitions (allocations for skins, winner, other prizes)
19. **PoolTransaction** - Audit trail of pool transactions (draws, returns, payouts)
20. **SkinsPlayerStatistics** - Aggregate skins statistics per player (games, holes, winnings, streaks)
21. **WolfGame** - Wolf strategic partner selection side-game configuration (scoring type, pot, wolf order)
22. **WolfHoleDecision** - Hole-by-hole Wolf decisions and results (wolf, partner, outcome, points)
23. **WolfPayout** - Final Wolf settlement summary for each participant (points, winnings, net result)
24. **League** - Cross-course league competition using WHS handicap differentials
25. **LeaguePlayer** - Join table linking players to leagues
26. **LeagueRound** - Scorecards tagged to a league with handicap differential for leaderboard
27. **RoundPlayer** - Join table linking players to standalone rounds
28. **RoundResult** - Final results for each player in a round
29. **ScoreEntry** - Individual score entries for multi-scorer validation
30. **ScoreSubmissionStatus** - Tracks scorecard submission state per player
31. **ScoreMismatch** - Records scoring discrepancies between scorers
32. **KnockoutMatch** - Bracket/knockout match pairings and results
33. **PartnershipLeague** - Partnership-based league competitions
34. **PartnershipRound** - Rounds within partnership leagues

### Subscription Tiers

The app uses a **tiered subscription model** to control feature access:

| Tier | Description | Key Limits |
|------|-------------|------------|
| **Free** | Default for all users | 3 competitions, 1 league, 3 rounds, 20 social rounds, 5 friends, Stableford + Stroke Play |
| **Social** | Casual golfers | 8 competitions, 3 leagues, 5 rounds, 12 players, 15 friends, +Match Play, team formats enabled, detailed stats, handicap history, achievement leaderboard, AI competition, guest management, GPS distance |
| **Premium** | Serious organizers | 50 competitions, 50 leagues, unlimited friends, 10 rounds, 40 players, all game types (incl. Best Ball, Scramble, Shamble, Par), skins, wolf, prize pools |
| **Super Admin** | Internal team only | No limits, admin tools, never expires |

**Key Behaviors:**
- Users default to Free tier on signup (auto-created via trigger)
- Tier limits enforced at UI (warnings) and API (validation)
- **Graceful degradation**: Locked features visible but interaction blocked
- **Grandfathering**: Existing competitions accessible after downgrade

**Complete guide**: See [SUBSCRIPTION_TIERS.md](docs/guides/SUBSCRIPTION_TIERS.md) for feature limits, implementation details, and admin management.

**Complete schemas**: See [DATABASE_SCHEMA.md](docs/database/DATABASE_SCHEMA.md) for full SQL tables and TypeScript type definitions.

---

## User Roles & Features

### Admin/Organizer

**Competition Setup**:
- Create competition (name, dates, handicap system)
- Define format (rounds, courses, game types)
- Add players manually or via CSV import
- Generate invite code for players to join
- Configure scoring preferences

**Player Management**:
- Add/remove players
- Set player handicaps
- Override pairings manually
- Resolve scoring disputes

**Competition Management**:
- View dashboard with standings
- Monitor round completion
- Send notifications/reminders
- Edit details before/during event
- Download/export results

### Player

**Competition Discovery**:
- Join via invite code
- View competition details
- Accept/decline invitation
- View personal schedule and pairings

**Match Day Experience**:
- View current round details (course, partners, format)
- Enter scores for entire group (not just yourself)
- Hole-by-hole scoring with large touch targets
- Real-time net/gross calculation
- Submit scorecard after round
- Works offline with auto-sync

**Results & Stats**:
- View live leaderboard
- Personal statistics dashboard
- Match history
- Share results (future)

---

## Feature Implementation Status

### Phase 1 (MVP) - Complete
All core MVP features have been implemented:
- Authentication (email + password, magic links, password reset)
- Competition creation wizard (4-step setup)
- Multi-round competitions with multiple game types
- Player joining via invite codes
- Competition dashboard with live leaderboards
- Hole-by-hole scorecard entry with offline support
- Scorecard review and submission
- Leaderboard with real-time updates

See [MVP-PHASE-1.md](docs/MVP-PHASE-1.md) for original specifications.

### Phase 2 - Complete
All Phase 2 features have been implemented:
- Multi-round competitions
- Auto-pairing algorithm
- Multiple game types (Stroke Play, Match Play, Team formats)
- Course search API integration (GolfAPI.io)
- Real-time leaderboard updates
- Push notifications
- Background sync & auto-retry
- Detailed statistics (putts, fairways, GIR)

### Phase 3 - Implemented
- Team formats (Best Ball, Scramble, Shamble)
- Social features (friends, player comparison)
- Player statistics dashboard
- Achievements and cosmetics system

### Phase 4 - Implemented
- Leagues (cross-course competition using WHS handicap differentials)
- Skins and Wolf side-games with prize pools
- Subscription tier system (Free, Social, Premium, Super Admin)
- Partnership leagues and knockout brackets
- Standalone rounds (non-competition)
- Social auth (Apple Sign-In, Google Sign-In)
- Account deletion
- League visibility (public/private)
- Push notifications with deep linking

### Current Development
- Multi-country support (Australia, UK/EU, USA)
- App Store / Google Play launch preparation

---

## Key Algorithms

### Auto-Pairing Logic
- Snake draft pattern (1-2-3-4, 8-7-6-5, 9-10-11-12)
- Balance skill levels (mix high/low handicaps)
- Rotate partners (avoid repeat pairings)
- Optimize for minimum repeats

### Handicap Calculation
- Calculate strokes received per hole based on handicap and stroke index
- Net score = gross score - strokes received
- Supports Stableford and Stroke Play

### Scoring Engine
- Stableford points: 4 (albatross), 3 (birdie), 2 (par), 1 (bogey), 0 (double+)
- Leaderboard sorting with tie-breakers
- Real-time net score calculations

**Complete implementations**: See [ALGORITHMS.md](docs/guides/ALGORITHMS.md)

---

## Styling Architecture

React Native uses **StyleSheet API** instead of CSS. Each component defines styles using JavaScript objects.

**Key Patterns**:
- Pattern 1: Styles in same file (recommended for most components)
- Pattern 2: Separate `.styles.ts` file (for large/complex components)
- Design tokens in `src/constants/theme.ts` (colors, spacing, typography, shadows)
- Platform-specific styling with `Platform.select()`

### Dark Mode Support

This app supports **light and dark themes** with automatic system preference detection.

**Theme Hooks** (from `@/context/ThemeContext`):
- `useThemeColors()` - Returns current color palette (most common)
- `useTheme()` - Returns colors + theme mode controls (setThemeMode, toggleTheme, isDark)
- `useIsDark()` - Returns boolean for dark mode check

**Color Palettes**:
- `lightColors` and `darkColors` defined in `src/constants/theme.ts`
- Colors are NOT imported directly - use the `useThemeColors()` hook instead
- Static tokens (spacing, typography, borderRadius, shadows) are still imported directly

**Component Pattern** (REQUIRED for all components):
```typescript
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';

export function MyComponent() {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Title</Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handlePress}
      >
        <Icon source="icon-name" size={20} color={colors.white} />
        <Text style={{ ...typography.bodyBold, color: colors.white }}>Button</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    height: 48,
    gap: spacing.sm,
    ...shadows.sm,
  },
});
```

**Key Color Properties**:
- `colors.background` - Screen backgrounds
- `colors.surface` - Card/container backgrounds
- `colors.textPrimary` - Main text color
- `colors.textSecondary` - Secondary text color
- `colors.primary` - Primary action color
- `colors.border` - Border colors
- `colors.error`, `colors.success`, `colors.warning` - Semantic colors
- `colors.birdie`, `colors.par`, `colors.bogey`, `colors.doubleBogey` - Golf score colors

**React Native Paper Components**:
- Paper components auto-adapt to theme via PaperProvider in App.tsx
- Use Paper for: `Text`, `ActivityIndicator`, `Divider`, `Icon`, `TextInput`
- **DO NOT use Paper's `Button` component** - use `TouchableOpacity` with explicit styling

**Modals & sheets — solid surfaces** (CRITICAL):
- The app has user-configurable `surfaceStyle` (solid/translucent) and `backdropStyle` (image/none) settings. In translucent + image mode, `colors.surface*` and `colors.background` are partially transparent so the photographic backdrop shows through.
- iOS system modals (RN `<Modal>` and React Navigation `presentation: 'modal'`) render in a separate UIWindow where the backdrop image is **not** visible — the system draws white instead, and translucent surfaces wash to white in any theme.
- **Every screen presented as `presentation: 'modal'` (or RN `<Modal>` content) must be wrapped in `<SystemModalTheme>` from `@/components/common`.** It pins the subtree to solid surfaces while preserving the user's light/dark preference.
- Sheet-styled footers/sections inside a modal screen are covered by wrapping the screen root.

**Complete guide**: See [STYLING_GUIDE.md](docs/guides/STYLING_GUIDE.md) for patterns, design tokens, and best practices (including "Modals & Sheets — Solid Surfaces").

---

## API Integration Strategy

### Golf Course Data

**Primary**: GolfAPI.io
- Coverage: 42,000+ courses globally (strong Australian coverage)
- Features: Search by location/name, hole-by-hole data, tee ratings (slope/course rating)
- Data includes:
  - **Clubs**: Name, address, contact details, coordinates
  - **Courses**: Hole pars, stroke indexes, match play halves
  - **Tees**: Slope/course ratings, per-hole distances, colors
  - **GPS Coordinates**: Tee boxes and green centers for distance calculations
- Caching: Explicitly allowed by GolfAPI.io terms

**Fallback**: Manual entry by admin

**Implementation Flow**:
1. Admin searches club/course via API
2. Import full data including tees and GPS coordinates
3. Store in PostgreSQL with 30-day cache TTL
4. Auto-refresh stale course data on request

**Complete integration guide**: See [API_INTEGRATION.md](docs/guides/API_INTEGRATION.md)

---

## Design Principles

### Australian-Specific Requirements
- **Date Format**: DD/MM/YYYY (not MM/DD/YYYY)
- **Currency**: AUD for paid features
- **Timezone**: Handle AEST, AEDT, ACST, AWST
- **Terminology**: "Honour system", WHS (World Handicap System), NSW/VIC/QLD/SA/WA/TAS/NT/ACT
- **Privacy**: Default to private competitions

### Privacy & Security
- Private by default (all competitions start invite-only)
- Minimal data collection (only essentials)
- No social login required (can use email + code)
- Data ownership (users can export/delete)
- GDPR/Privacy Act compliant

### Offline-First
- **Score entry must work offline** (non-negotiable)
- Sync transparently (don't interrupt user flow)
- Clear offline state (users know what's synced)
- Conflict resolution (last-write-wins with manual override)

### Mobile-First UX
- Large touch targets (minimum 44x44px)
- Thumb-friendly (key actions at bottom)
- Minimal typing (tap to select)
- Progressive disclosure (don't overwhelm)
- Fast navigation (max 3 taps to any feature)

### Performance Targets
- Initial load: < 2s on 4G
- Time to interactive: < 3s
- Scorecard render: < 100ms
- Offline score save: Instant
- Leaderboard update: Real-time (< 1s)

---

## Development Setup

### Prerequisites

```bash
# Node.js 18+
node --version

# pnpm package manager
npm install -g pnpm

# Expo CLI (via npx, no global install needed)
npx expo --version
```

### Quick Start

```bash
# Navigate to project
cd the-nineteenth

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start Expo dev server
npx expo start

# Run on iOS (Mac only)
npx expo start --ios

# Run on Android
npx expo start --android
```

**Complete setup guide**: See [PROJECT_SETUP.md](docs/PROJECT_SETUP.md) for detailed installation and configuration.

### Environment Variables

```bash
# .env

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

---

## Testing Strategy

### Unit Tests
- **Coverage target**: 80%+
- **Focus**: Scoring calculations, handicap algorithms, pairing generation, offline sync logic

### Integration Tests
- API endpoints, database operations, external API integrations

### E2E Tests (Playwright)
- Critical flows: Create competition, add players, enter scores, view leaderboard, offline score entry + sync

### Manual Testing
- Device testing (iOS/Android), offline scenarios, network throttling, multi-user concurrent scoring

---

## Deployment

**Complete deployment guide**: See [DEPLOYMENT.md](docs/guides/DEPLOYMENT.md)

### Environments

**Mobile App**:
1. Development - Local with Expo Go
2. Preview - EAS Build preview for testing
3. Production - App Store + Google Play

**Backend (Supabase)**:
1. Development - Local (Docker) or staging
2. Production - Supabase Cloud

### Quick Deployment Commands

```bash
# Build preview
eas build --platform ios --profile preview
eas build --platform android --profile preview

# Build production
eas build --platform ios --profile production
eas build --platform android --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android

# OTA update (JS/assets only)
eas update --branch production --message "Fix scorecard sync bug"
```

### Monitoring
- **Error tracking**: Sentry (React Native + Supabase)
- **Analytics**: Supabase Analytics + custom events
- **Performance**: Expo Application Services metrics
- **Database**: Supabase Dashboard (queries, connections)

---

## Success Metrics

### MVP Validation (Phase 1)
- 10 active competitions
- 50+ unique players
- 100+ rounds completed
- 500+ scorecards submitted
- < 5% error rate on score submission
- 80%+ mobile usage

### Growth Metrics (Phase 2+)
- Monthly active users (MAU)
- Competition completion rate
- Average players per competition
- Net Promoter Score (NPS)
- Offline usage percentage

---

## Project Timeline

### Phase 1: MVP (6 weeks)
- Week 1-2: Database design + API skeleton
- Week 3-4: Admin flow (competition setup)
- Week 5-6: Player flow (scoring) + offline support
- Testing + bug fixes

### Phase 2: Multi-Round (4 weeks)
- Week 1: Auto-pairing algorithm
- Week 2: Multiple game types
- Week 3: Notifications + invites
- Week 4: Statistics + polish

### Phase 3: Enhancement (6 weeks)
- Week 1-2: Team formats
- Week 3-4: Social features
- Week 5-6: Analytics dashboard

---

## Resources & References

### Design Inspiration
- **MiScore** - Leading golf scoring app
- **GolfNow** - Course booking + scoring
- **The Grint** - Social golf with handicap tracking
- **18Birdies** - GPS + scoring

### API Documentation
- GolfAPI.io: https://www.golfapi.io/

### Technical Resources
- React Query: https://tanstack.com/query
- React Navigation: https://reactnavigation.org/
- Zustand: https://zustand-demo.pmnd.rs/
- Expo Docs: https://docs.expo.dev/

---

## Contact & Team

**Project Owner**: Sam
**Role**: Full-stack developer
**Tech Stack**: TypeScript, React Native, Node.js, PostgreSQL
**Location**: Australia

---

## Quick Reference

### Documentation Map

| Topic | File | Description |
|-------|------|-------------|
| **Overview** | CLAUDE.md | Project overview (this file) |
| **Setup** | PROJECT_SETUP.md | Complete installation guide |
| **Quick Start** | docs/README.md | Daily commands and workflows |
| **Styling** | docs/guides/STYLING_GUIDE.md | React Native styling patterns |
| **Offline** | docs/guides/OFFLINE_ARCHITECTURE.md | Offline-first implementation |
| **Algorithms** | docs/guides/ALGORITHMS.md | Scoring and pairing logic |
| **API** | docs/guides/API_INTEGRATION.md | Golf course API integration |
| **Deployment** | docs/guides/DEPLOYMENT.md | CI/CD and app deployment |
| **Scoring Pairs** | docs/guides/SCORING_PAIRS.md | Designated scoring pairs feature |
| **Skins Game** | docs/guides/SKINS_GAME.md | Skins gambling side-game feature |
| **Wolf Game** | docs/guides/WOLF_GAME.md | Wolf partner selection side-game |
| **Subscriptions** | docs/guides/SUBSCRIPTION_TIERS.md | Tier system and feature limits |
| **Push Notifications** | docs/guides/PUSH_NOTIFICATIONS.md | Push notification architecture |
| **Leagues** | docs/guides/LEAGUES.md | Cross-course league competitions |
| **Database** | docs/database/DATABASE_SCHEMA.md | SQL + TypeScript schemas |
| **MVP Phase 1** | docs/MVP-PHASE-1.md | MVP specifications |

### Tech Stack Quick Reference

| Component | Choice | Files |
|-----------|--------|-------|
| App Name | The Nineteenth | `app.json`, `package.json` |
| Package Manager | pnpm | All install commands |
| UI Library | React Native Paper | Already installed |
| Styling | React Native StyleSheet | `src/constants/theme.ts` |
| Path Aliases | Configured | `tsconfig.json`, `babel.config.js` |
| Code Quality | ESLint + Prettier | `.eslintrc.js`, `.prettierrc` |

### Common Commands

```bash
# Development
npx expo start                  # Start dev server
npx expo start --ios            # Run on iOS
npx expo start --android        # Run on Android

# Code Quality
pnpm lint                       # Lint code
pnpm type-check                 # TypeScript check
pnpm format                     # Format with Prettier
pnpm test                       # Run tests

# Database
supabase start                  # Local Supabase
supabase db reset               # Reset database
supabase migration new          # Create migration

# Deployment
eas build --platform ios        # Build iOS
eas build --platform android    # Build Android
eas update --branch production  # OTA update
```

### Project Status
- ✅ Phase 1 (MVP) complete
- ✅ Phase 2 features complete
- ✅ Phase 3 features complete
- ✅ Phase 4 features complete (leagues, skins, wolf, subscriptions, partnerships, knockouts)
- 🔄 Multi-country support & app store launch prep

---

*Last Updated: March 2026*
