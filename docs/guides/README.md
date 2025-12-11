# Developer Guides

**The Nineteenth** - Mobile Golf Competition App

> Comprehensive technical guides for developers

---

## Overview

This directory contains detailed implementation guides extracted from the main documentation for improved organization and token optimization.

---

## Available Guides

### [STYLING_GUIDE.md](./STYLING_GUIDE.md)
**React Native Styling Patterns and Best Practices**

Topics covered:
- StyleSheet API patterns (inline vs separate files)
- Design tokens (colors, spacing, typography, shadows)
- Dynamic and conditional styling
- Platform-specific styling (iOS vs Android)
- Component file structure
- Complete examples with best practices
- React Native vs CSS/Tailwind comparison

**When to use:** Styling components, setting up design system, understanding React Native styling

---

### [OFFLINE_ARCHITECTURE.md](./OFFLINE_ARCHITECTURE.md)
**Offline-First Implementation with Expo SQLite**

Topics covered:
- Network status detection
- Expo SQLite local database setup
- AsyncStorage for simple data
- Background sync with Expo Task Manager
- Offline-aware Zustand store
- UI indicators for sync status
- Complete offline score entry flow
- Conflict resolution strategies

**When to use:** Implementing offline features, score entry, data synchronization

---

### [ALGORITHMS.md](./ALGORITHMS.md)
**Scoring and Pairing Algorithms**

Topics covered:
- Auto-pairing logic (snake draft, rotation, balancing)
- Handicap calculation formulas
- Strokes received per hole
- Net score calculations
- Stableford points system
- Stroke Play scoring
- Leaderboard sorting and tie-breakers

**When to use:** Implementing pairing generation, score calculations, leaderboard logic

---

### [API_INTEGRATION.md](./API_INTEGRATION.md)
**Golf Course API Integration**

Topics covered:
- Australia Golf Course Finder API (Zyla Labs)
- API endpoints and parameters
- Search by location, state, or name
- API client setup with error handling
- React Query integration
- Caching strategy (Supabase + stale cache)
- Manual entry fallback
- GolfAPI.io secondary option (Phase 2)

**When to use:** Implementing course search, integrating external APIs, caching strategies

---

### [DEPLOYMENT.md](./DEPLOYMENT.md)
**CI/CD and Mobile App Deployment**

Topics covered:
- Environment setup (Development, Preview, Production)
- iOS deployment (TestFlight, App Store)
- Android deployment (Internal Testing, Google Play)
- Over-the-Air (OTA) updates with EAS
- GitHub Actions CI/CD pipeline
- Supabase deployment and migrations
- Monitoring (Sentry, analytics, performance)
- Versioning strategy and release checklist

**When to use:** Setting up deployments, CI/CD, app store submissions, monitoring

---

## Quick Navigation

| Guide | Primary Topics | Related Files |
|-------|----------------|---------------|
| **Styling** | Design tokens, StyleSheet patterns | `src/constants/theme.ts` |
| **Offline** | SQLite, sync, network detection | `src/services/offline/`, `src/store/offlineStore.ts` |
| **Algorithms** | Pairing, handicap, scoring | `src/utils/scoring.ts`, `src/utils/pairing.ts` |
| **API** | Course search, caching | `src/services/api/courses.ts` |
| **Deployment** | CI/CD, app builds, monitoring | `.github/workflows/`, `eas.json` |

---

## Related Documentation

### Main Documentation
- **[CLAUDE.md](../../CLAUDE.md)** - Project overview and quick reference
- **[PROJECT_SETUP.md](../../PROJECT_SETUP.md)** - Complete setup guide
- **[docs/README.md](../README.md)** - Quick start and daily commands

### Database
- **[DATABASE_SCHEMA.md](../database/DATABASE_SCHEMA.md)** - Complete database schema with SQL and TypeScript types

### Features
- **[MVP-PHASE-1.md](../MVP-PHASE-1.md)** - MVP feature specifications
- **[MVP-PHASE-2.md](../MVP-PHASE-2.md)** - Phase 2 features

---

## Contributing to Guides

### When to Update Guides

Update these guides when:
- ✅ Adding new styling patterns or design tokens
- ✅ Changing offline sync strategy
- ✅ Updating scoring algorithms
- ✅ Integrating new APIs
- ✅ Modifying deployment process

### How to Update

1. Edit the relevant guide file
2. Update code examples if implementation changes
3. Add new sections if introducing new patterns
4. Update cross-references if file paths change
5. Keep examples concise (1-2 per concept)

---

## Guide Principles

**These guides follow these principles:**

1. **Token-optimized** - Concise but complete
2. **Code-focused** - Implementation examples, not theory
3. **Copy-paste ready** - Examples work out of the box
4. **Cross-referenced** - Link to related docs and source files
5. **Searchable** - Clear headings and structure

---

*Last Updated: January 2025*
