# Tech Stack - The Nineteenth Golf App

## Overview

Modern TypeScript-based stack optimized for mobile-first development with offline-first architecture, strong type safety, and excellent developer experience.

---

## Mobile Application (React Native)

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Expo SDK** | 54 | Managed React Native workflow with OTA updates |
| **React Native** | 0.81+ | Cross-platform mobile framework (iOS + Android) |
| **TypeScript** | 5.9+ | Type safety and developer experience |
| **pnpm** | 9+ | Fast, efficient package manager |

**Why Expo?**
- Simplified native module management
- Over-the-air updates for quick bug fixes
- Easy build and deployment with EAS
- Excellent documentation and active community
- Access to native APIs without ejecting

---

### Navigation

| Technology | Version | Purpose |
|------------|---------|---------|
| **React Navigation** | 6.x | Native stack navigation |
| **@react-navigation/native-stack** | 6.9+ | Type-safe screen navigation |
| **@react-navigation/bottom-tabs** | 6.5+ | Tab navigation for player/admin roles |
| **expo-status-bar** | ~1.11 | Status bar management |

**Why React Navigation?**
- Industry standard for React Native
- Excellent TypeScript support
- Flexible and customizable
- Great documentation and community
- Works seamlessly with Expo

---

### UI & Styling

| Technology | Version | Purpose |
|------------|---------|---------|
| **React Native Paper** | 5.x | Material Design 3 components ✅ **RECOMMENDED** |
| **React Native StyleSheet** | Built-in | Component styling with design tokens |
| **react-native-vector-icons** | 10.0+ | Icon system (Material, FontAwesome, etc.) |
| **react-native-safe-area-context** | 4.8+ | Safe area handling for notches/home indicators |
| **react-native-svg** | 14.1+ | SVG rendering support |

**Why React Native Paper? (CHOSEN)**
- ✅ Material Design 3 (Material You) out of the box
- ✅ Excellent theming with custom tokens
- ✅ Built-in dark mode support
- ✅ TypeScript-first with full type definitions
- ✅ 5x more popular than NativeBase (322K vs 63K weekly downloads)
- ✅ Superior accessibility (WCAG compliant)
- ✅ Active maintenance by Callstack
- ✅ Perfect for golf scoring app (cards, lists, buttons, FABs)

**Decision:** React Native Paper is the final choice for this project.

**Design Token System:**
- Centralized at `src/constants/theme.ts`
- Colors, spacing, typography, shadows, border radius
- Golf-specific colors (birdie, par, bogey, doubleBogey)
- Australian-specific settings (date formats, states)

---

### State & Data Management

| Technology | Version | Purpose |
|------------|---------|---------|
| **Zustand** | 4.5+ | Lightweight global state (auth, UI state, scorecard) |
| **TanStack Query** | 5.17+ | Server state caching, sync, and offline support |
| **React Hook Form** | 7.49+ | Form state and validation |
| **Zod** | (planned) | Schema validation for forms and API |

**State Management Strategy:**
- **Zustand** - Client state (current user, current hole, UI preferences)
- **TanStack Query** - Server-synced data (competitions, rounds, leaderboards)
- **React Hook Form** - Form state with validation
- **Expo SQLite** - Offline-first local database

**Why Zustand over Redux?**
- Simpler API with minimal boilerplate
- No providers needed
- Excellent TypeScript support
- Perfect size for React Native (~1KB)
- Easy to learn and maintain

**Why TanStack Query?**
- Built-in caching and synchronization
- Offline-first architecture support
- Optimistic updates for instant UI feedback
- Background refetching
- Automatic retry logic

---

### Offline Support & Local Storage

| Technology | Version | Purpose |
|------------|---------|---------|
| **Expo SQLite** | ~13.0 | Local SQLite database for offline scoring |
| **@react-native-async-storage/async-storage** | 1.21+ | Key-value storage for preferences |
| **@react-native-community/netinfo** | 11.1+ | Network status detection |
| **expo-task-manager** | ~11.6 | Background tasks |
| **expo-background-fetch** | ~12.0 | Background sync when app backgrounded |

**Offline-First Architecture:**
- ✅ Scorecard entry works completely offline (critical for on-course use)
- ✅ Competition details cached for offline viewing
- ✅ Background sync when connection returns
- ✅ Optimistic UI updates with conflict resolution
- ✅ Pending sync queue stored in SQLite

**Critical Offline Flows:**
1. View competition details and schedule
2. Enter scores for entire group hole-by-hole
3. Navigate between holes (1-18)
4. View cached leaderboard (stale data acceptable)
5. Auto-sync scores when connection restored

---

### Forms & Validation

| Technology | Version | Purpose |
|------------|---------|---------|
| **React Hook Form** | 7.49+ | Form state management with minimal re-renders |
| **Zod** | (planned) | TypeScript-first schema validation |

**Form Strategy:**
- Uncontrolled inputs for better performance
- Schema validation with Zod
- TypeScript inference from schemas
- Material Design form components from React Native Paper

---

### Backend & Database

| Technology | Purpose |
|------------|---------|
| **Supabase** | PostgreSQL database + Auth + Storage + Real-time |
| **Supabase Auth** | User authentication (email + magic links) |
| **Supabase Storage** | File storage (avatars, course images) |
| **PostgreSQL 15+** | Relational database with PostGIS for golf courses |
| **Row-Level Security (RLS)** | Multi-tenancy and data isolation |
| **Supabase Realtime** | Live leaderboard updates |

**Why Supabase?**
- ✅ PostgreSQL with full SQL power
- ✅ Built-in authentication
- ✅ Real-time subscriptions for live leaderboards
- ✅ Generous free tier (perfect for MVP)
- ✅ Auto-generated TypeScript types
- ✅ Row-Level Security for data isolation
- ✅ Geographic queries with PostGIS (find nearby courses)
- ✅ Hosted and managed (no DevOps needed)

**Database Features:**
- Generated TypeScript types synced to codebase
- Row-Level Security policies for private competitions
- Real-time subscriptions for leaderboard updates
- Automatic backups and point-in-time recovery
- Connection pooling (pgBouncer)

---

### Media & Camera

| Technology | Version | Purpose |
|------------|---------|---------|
| **expo-image-picker** | ~14.7 | Photo selection and camera access |
| **expo-camera** | ~14.0 | Camera API for profile photos (Phase 2) |

---

### Location & Maps

| Technology | Version | Purpose |
|------------|---------|---------|
| **expo-location** | ~16.5 | GPS for finding nearby golf courses |

**Golf Course Integration:**
- Search courses by GPS coordinates
- Filter by Australian state (NSW, VIC, QLD, SA, WA, TAS, NT, ACT)
- Store course data in Supabase with PostGIS
- Cache course details in SQLite for offline access

---

### Development Tools

| Tool | Purpose |
|------|---------|
| **ESLint** | Code quality and consistency |
| **Prettier** | Code formatting |
| **TypeScript ESLint** | TypeScript-specific linting |
| **@expo/metro-runtime** | Hot reload and fast refresh |

**Code Quality Configuration:**
- ESLint config at `.eslintrc.js`
- Prettier config at `.prettierrc`
- TypeScript config at `tsconfig.json`
- Path aliases configured in `babel.config.js`

---

## Project Structure

```
GolfApp/
├── src/
│   ├── components/          # Reusable components
│   │   ├── common/         # Generic UI components (Button, Card, etc.)
│   │   ├── competition/    # Competition-specific components
│   │   ├── scorecard/      # Scorecard entry components
│   │   └── layout/         # Layout components (Header, etc.)
│   │
│   ├── screens/            # Screen components
│   │   ├── player/         # Player-facing screens
│   │   ├── admin/          # Organizer/admin screens
│   │   └── auth/           # Authentication screens
│   │
│   ├── navigation/         # React Navigation setup
│   │   ├── AppNavigator.tsx
│   │   ├── types.ts        # Navigation type definitions
│   │   └── linking.ts      # Deep linking config
│   │
│   ├── hooks/              # Custom React hooks
│   │   ├── useCompetition.ts  # TanStack Query hooks
│   │   ├── useScorecard.ts
│   │   └── useNetworkStatus.ts
│   │
│   ├── store/              # Zustand stores
│   │   ├── authStore.ts
│   │   ├── scorecardStore.ts
│   │   └── offlineStore.ts
│   │
│   ├── services/           # External services
│   │   ├── api/
│   │   │   ├── supabase.ts    # Supabase client
│   │   │   ├── competitions.ts
│   │   │   └── scorecards.ts
│   │   └── offline/
│   │       ├── database.ts    # SQLite setup
│   │       └── sync.ts        # Background sync
│   │
│   ├── types/              # TypeScript types
│   │   ├── database.ts     # Supabase generated types
│   │   ├── competition.ts
│   │   └── scorecard.ts
│   │
│   ├── utils/              # Utility functions
│   │   ├── scoring.ts      # Golf scoring calculations
│   │   ├── handicap.ts     # Handicap calculations
│   │   └── formatting.ts   # Australian date formats
│   │
│   └── constants/          # App constants
│       ├── theme.ts        # Design tokens
│       ├── gameTypes.ts
│       └── australianStates.ts
│
├── assets/                 # Static assets
├── __tests__/             # Test files
├── .env                   # Environment variables
├── app.json              # Expo configuration
├── babel.config.js       # Babel + path aliases
├── tsconfig.json         # TypeScript config
└── package.json          # Dependencies
```

---

## Backend Architecture (Supabase)

### Database Schema

**Core Tables:**
- `competitions` - Competition metadata
- `rounds` - Individual rounds within competitions
- `courses` - Golf course data (cached from API + manual entry)
- `players` - Player profiles with handicaps
- `competition_players` - Join table for competition membership
- `pairings` - Player groupings per round
- `scorecards` - Individual player scores per round
- `leaderboard_cache` - Computed leaderboard (materialized view)

**Row-Level Security Policies:**
- Players can only view competitions they're invited to
- Organizers have full access to their competitions
- Scorecards can be submitted by any player in the group
- Leaderboards are publicly readable within competition

### Real-time Features

**Live Leaderboard Updates:**
```typescript
// Subscribe to leaderboard changes
supabase
  .channel('leaderboard')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'scorecards',
    filter: `round_id=eq.${roundId}`
  }, (payload) => {
    // Invalidate TanStack Query cache
    queryClient.invalidateQueries(['leaderboard', competitionId]);
  })
  .subscribe();
```

### Authentication Strategy

**Phase 1 (MVP):**
- Email + invite code (passwordless)
- Magic link authentication
- No social login required

**Phase 2:**
- Optional Google/Apple sign-in
- Biometric authentication (Face ID / Touch ID)

---

## API Integration

### Golf Course Data API

**Primary: Australia Golf Course Finder API (Zyla Labs)**
- Search Australian golf courses by name or GPS
- Basic course info (name, location, contact)
- Stored in Supabase for caching
- Manual entry fallback for missing courses

**Future: GolfAPI.io**
- Hole-by-hole scorecard data
- Slope ratings and course ratings
- Multiple tee boxes with yardages

---

## Performance Optimization

### Mobile Performance

| Strategy | Implementation |
|----------|----------------|
| **List Virtualization** | FlashList for competitions/leaderboards |
| **Image Optimization** | expo-image with caching |
| **Code Splitting** | Lazy load screens with React.lazy |
| **Memoization** | React.memo for score cards |
| **Optimistic Updates** | TanStack Query mutations |

### Database Performance

| Strategy | Implementation |
|----------|----------------|
| **Indexing** | B-tree indexes on frequently queried columns |
| **Materialized Views** | Leaderboard calculations cached |
| **Connection Pooling** | pgBouncer (Supabase built-in) |
| **Query Optimization** | Use Supabase query builder for efficiency |

---

## Deployment

### Mobile App Deployment

| Platform | Tool | Process |
|----------|------|---------|
| **iOS** | EAS Build | Build → TestFlight → App Store |
| **Android** | EAS Build | Build → Internal Testing → Google Play |
| **OTA Updates** | Expo Updates | Push JS/asset updates without app store review |

### Backend Deployment

**Supabase Hosting:**
- Managed PostgreSQL database
- Auto-scaling
- Daily backups
- Point-in-time recovery
- CDN for static assets

---

## Development Environment

### Required Tools

- **Node.js** 18+ (LTS)
- **pnpm** 9+ (`npm install -g pnpm`)
- **Expo CLI** (via `npx expo`)
- **Supabase CLI** (optional, for local dev)

**Platform-Specific:**
- **Xcode** 15+ (Mac only, for iOS development)
- **Android Studio** (for Android development)

### Recommended VS Code Extensions

- ESLint
- Prettier
- TypeScript + JavaScript
- Expo Tools
- Supabase (syntax highlighting for SQL)

---

## Technology Decisions

### Why Supabase over Custom Backend?

**Pros:**
- ✅ Faster time to market (no backend coding needed)
- ✅ Built-in authentication
- ✅ Real-time subscriptions out of the box
- ✅ Generous free tier for MVP validation
- ✅ Auto-generated TypeScript types
- ✅ Hosted and managed (no DevOps)
- ✅ PostgreSQL with full SQL power

**Cons:**
- ⚠️ Vendor lock-in (mitigated by PostgreSQL compatibility)
- ⚠️ Less control over infrastructure

**Decision:** Supabase is perfect for MVP and Phase 1. Can migrate to self-hosted if needed.

### Why React Native Paper over NativeBase?

**Comparison:**

| Feature | React Native Paper | NativeBase |
|---------|-------------------|------------|
| Downloads/week | 322,000+ | 63,000 |
| Design System | Material Design 3 | Custom/Bootstrap-inspired |
| TypeScript | First-class support | Good support |
| Accessibility | WCAG compliant | Basic support |
| Dark Mode | Built-in MD3 themes | Manual theming |
| Maintenance | Active (Callstack) | Less active |
| Golf App Fit | ✅ Excellent | ⚠️ Good |

**Decision:** React Native Paper for better design, community, and accessibility.

### Why Expo over Bare React Native?

**Pros:**
- ✅ Faster development cycle
- ✅ OTA updates for quick bug fixes
- ✅ Managed native modules (no Xcode/Android Studio diving)
- ✅ Excellent documentation
- ✅ EAS Build for cloud builds

**Cons:**
- ⚠️ Slightly larger app size
- ⚠️ Limited to Expo-supported native modules (rare limitation)

**Decision:** Expo's benefits far outweigh the cons for this app.

---

## Australian-Specific Considerations

### Localization

| Aspect | Implementation |
|--------|----------------|
| **Date Format** | DD/MM/YYYY (e.g., 25/12/2024) |
| **States** | NSW, VIC, QLD, SA, WA, TAS, NT, ACT |
| **Timezone** | AEST, AEDT, ACST, AWST handling |
| **Terminology** | "Honour system" (not "honor") |
| **Handicap System** | WHS (World Handicap System) |
| **Privacy** | Australian Privacy Principles (APP) compliant |

### Golf Course Data

- Focus on Australian courses first
- PostGIS for geographic queries (find courses within X km)
- Manual entry for courses not in API
- Store Australian state in enum type

---

## Security & Privacy

### Data Protection

- **Encryption at rest** - Supabase encrypts all data
- **Encryption in transit** - HTTPS/TLS for all API calls
- **Row-Level Security** - Competition data isolated per organizer
- **Secure token storage** - expo-secure-store for auth tokens
- **Private by default** - All competitions start as invite-only

### Authentication Security

- Email verification required
- Magic link expiration (15 minutes)
- Rate limiting on auth endpoints (Supabase built-in)
- No password storage (passwordless auth)

---

## Testing Strategy

### Unit Tests (Jest)

- Scoring calculations (handicap, net scores, Stableford points)
- Date formatting utilities
- Validation schemas

### Component Tests (React Native Testing Library)

- UI component behavior
- User interactions
- Accessibility compliance

### Integration Tests

- API calls to Supabase
- Offline sync logic
- Form submission flows

### E2E Tests (Detox - Phase 2)

- Create competition flow
- Scorecard entry flow
- Leaderboard updates

---

## Success Metrics

### MVP Validation (Phase 1)

- ✅ 10+ active competitions
- ✅ 50+ unique players
- ✅ 100+ rounds completed
- ✅ 500+ scorecards submitted
- ✅ < 5% error rate on score submission
- ✅ 80%+ mobile usage
- ✅ < 2s average scorecard load time

### Performance Targets

- **Initial load**: < 2s on 4G
- **Time to interactive**: < 3s
- **Scorecard render**: < 100ms
- **Offline score save**: Instant
- **Leaderboard update**: < 1s

---

## Migration Path (If Needed)

### From Supabase to Self-Hosted

If needed in the future:

1. **Database**: PostgreSQL dump from Supabase → migrate to AWS RDS
2. **Auth**: Implement custom JWT auth with same user table schema
3. **Storage**: Migrate to S3
4. **Real-time**: Implement WebSockets or Server-Sent Events

**Risk**: Low - PostgreSQL is portable, types remain the same

---

## Version History

- **v0.1** (Current) - Initial tech stack with Supabase + React Native Paper
- **v0.2** (Next) - Add Zod validation and E2E testing

---

## References

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Paper](https://callstack.github.io/react-native-paper/)
- [Supabase Documentation](https://supabase.com/docs)
- [TanStack Query](https://tanstack.com/query)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [React Navigation](https://reactnavigation.org/)

---

*Last Updated: January 2025*
*The Nineteenth - Golf Competition Management App*
