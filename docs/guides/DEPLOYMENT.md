# Deployment Guide

**The Nineteenth** - Mobile Golf Competition App

> Complete guide to CI/CD, mobile app builds, and deployment for iOS and Android

---

## Overview

This guide covers:
1. **Environments** - Development, Preview, Production
2. **Mobile Deployment** - iOS and Android app builds
3. **Over-the-Air Updates** - Push JS updates without app store review
4. **CI/CD Pipeline** - Automated testing and deployments
5. **Monitoring** - Error tracking and analytics

---

## Environments

### Mobile App Environments

**1. Development**
- Local development with Expo Go
- Hot reloading for rapid iteration
- No build required

**2. Preview**
- EAS Build preview builds for testing
- Distributed via TestFlight (iOS) or internal testing (Android)
- For QA and stakeholder review

**3. Production**
- App Store (iOS) + Google Play (Android)
- Official release builds
- Versioned and signed

### Backend (Supabase) Environments

**1. Development**
- Local Supabase (Docker) OR staging project
- For local testing

**2. Production**
- Supabase Cloud production project
- Live database and auth

---

## Mobile Deployment

### Prerequisites

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure EAS for your project
eas build:configure
```

### iOS Deployment

#### 1. TestFlight (Preview/Beta)

```bash
# Build for iOS (development client)
eas build --platform ios --profile preview

# Build for TestFlight
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios
```

**Configuration (`eas.json`):**
```json
{
  "build": {
    "preview": {
      "ios": {
        "simulator": false,
        "buildType": "development-client",
        "distribution": "internal"
      }
    },
    "production": {
      "ios": {
        "buildType": "release",
        "distribution": "store"
      }
    }
  }
}
```

#### 2. App Store (Production)

```bash
# Build production iOS app
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --latest
```

**Required:**
- Apple Developer account ($99/year)
- App Store Connect app created
- Certificates and provisioning profiles (EAS handles automatically)

---

### Android Deployment

#### 1. Internal Testing (Preview)

```bash
# Build for Android (development client)
eas build --platform android --profile preview

# Build for internal testing
eas build --platform android --profile production

# Submit to Google Play Internal Testing
eas submit --platform android
```

**Configuration (`eas.json`):**
```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle",
        "gradleCommand": ":app:bundleRelease"
      }
    }
  }
}
```

#### 2. Google Play (Production)

```bash
# Build production Android app (AAB format)
eas build --platform android --profile production

# Submit to Google Play
eas submit --platform android --latest
```

**Required:**
- Google Play Developer account ($25 one-time fee)
- Google Play Console app created
- Signing key (EAS generates and manages)

---

## Over-the-Air (OTA) Updates

Push JavaScript and asset updates without app store review.

### When to Use OTA

✅ **Good for OTA:**
- Bug fixes
- UI changes
- Content updates
- Feature flags

❌ **Requires new build:**
- Native code changes
- New dependencies
- Permissions changes
- Version bumps

### Publish Update

```bash
# Publish to production channel
eas update --branch production --message "Fix scorecard sync bug"

# Publish to preview channel
eas update --branch preview --message "Test new feature"
```

### Configuration

```json
// app.json
{
  "expo": {
    "updates": {
      "enabled": true,
      "fallbackToCacheTimeout": 0,
      "url": "https://u.expo.dev/[your-project-id]"
    },
    "runtimeVersion": {
      "policy": "sdkVersion"
    }
  }
}
```

### Rollback

```bash
# Rollback to previous update
eas update --branch production --message "Rollback" --republish
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

**File: `.github/workflows/main.yml`**

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    name: Test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js 18
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm type-check

      - name: Run unit tests
        run: pnpm test --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  build-preview:
    name: Build Preview
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    needs: test

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        run: pnpm install

      - name: Build iOS preview
        run: eas build --platform ios --profile preview --non-interactive

      - name: Build Android preview
        run: eas build --platform android --profile preview --non-interactive

      - name: Comment PR with QR codes
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '📱 Preview builds ready! Scan QR code in Expo Go to test.'
            })

  deploy-production:
    name: Deploy Production
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && startsWith(github.event.head_commit.message, 'Release')
    needs: test

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        run: pnpm install

      - name: Build iOS production
        run: eas build --platform ios --profile production --non-interactive --auto-submit

      - name: Build Android production
        run: eas build --platform android --profile production --non-interactive --auto-submit

      - name: Create GitHub release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          draft: false
          prerelease: false

  ota-update:
    name: OTA Update
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && !startsWith(github.event.head_commit.message, 'Release')
    needs: test

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Publish OTA update
        run: eas update --branch production --message "${{ github.event.head_commit.message }}"
```

---

## Supabase Deployment

### Database Migrations

**Create Migration:**
```bash
# Create new migration
supabase migration new add_leaderboard_cache

# Edit migration file
code supabase/migrations/20250109000001_add_leaderboard_cache.sql
```

**Apply to Production:**
```bash
# Link to Supabase project
supabase link --project-ref your-project-ref

# Push migration
supabase db push
```

### Environment Variables

**Supabase Dashboard:**
1. Go to Project Settings → API
2. Copy Project URL and publishable key
3. Update `.env` files for each environment

**Environment Files:**
```bash
# .env.development
EXPO_PUBLIC_SUPABASE_URL=https://dev-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=dev_publishable_key

# .env.production
EXPO_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=prod_publishable_key
```

---

## Monitoring

### 1. Error Tracking (Sentry)

**Setup:**
```bash
# Install Sentry
npx expo install sentry-expo

# Initialize
npx sentry-wizard -i reactNative -p ios android
```

**Configuration:**
```typescript
// App.tsx
import * as Sentry from 'sentry-expo';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enableInExpoDevelopment: false,
  debug: false,
});
```

**Usage:**
```typescript
try {
  await syncScorecard();
} catch (error) {
  Sentry.captureException(error);
  console.error('Sync failed:', error);
}
```

---

### 2. Analytics (Supabase Analytics + Custom Events)

**Track Events:**
```typescript
// src/services/analytics.ts
import { supabase } from '@services/supabase';

export async function trackEvent(
  eventName: string,
  properties?: Record<string, any>
) {
  await supabase.from('analytics_events').insert({
    event_name: eventName,
    properties,
    user_id: (await supabase.auth.getUser()).data.user?.id,
    timestamp: new Date().toISOString(),
  });
}

// Usage
trackEvent('scorecard_submitted', {
  round_id: roundId,
  total_points: 36,
});
```

---

### 3. Performance Monitoring (Expo Application Services)

**EAS Metrics:**
- Build times
- Build success rate
- Update downloads
- Crash-free sessions

**View Metrics:**
```bash
# Open EAS dashboard
eas open
```

---

### 4. Database Monitoring (Supabase Dashboard)

**Key Metrics:**
- Query performance
- Connection count
- Database size
- Table sizes

**Slow Query Detection:**
```sql
-- View slow queries
SELECT *
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## Versioning Strategy

### Semantic Versioning

```
MAJOR.MINOR.PATCH

1.0.0 - Initial MVP release
1.1.0 - New features (backward compatible)
1.1.1 - Bug fixes
2.0.0 - Breaking changes
```

**Update `app.json`:**
```json
{
  "expo": {
    "version": "1.2.0",
    "ios": {
      "buildNumber": "12"
    },
    "android": {
      "versionCode": 12
    }
  }
}
```

---

## Release Checklist

### Pre-Release

- [ ] All tests passing
- [ ] Type check passes
- [ ] Lint check passes
- [ ] Update version in `app.json`
- [ ] Update `CHANGELOG.md`
- [ ] Test on real devices (iOS + Android)
- [ ] Review Sentry for recent errors
- [ ] Database migration ready (if needed)

### Release

- [ ] Create release branch: `release/v1.2.0`
- [ ] Run full test suite
- [ ] Build iOS production: `eas build --platform ios --profile production`
- [ ] Build Android production: `eas build --platform android --profile production`
- [ ] Submit to App Store: `eas submit --platform ios`
- [ ] Submit to Google Play: `eas submit --platform android`
- [ ] Tag release: `git tag v1.2.0`
- [ ] Push tags: `git push --tags`

### Post-Release

- [ ] Monitor Sentry for errors
- [ ] Check analytics for crashes
- [ ] Monitor app store reviews
- [ ] Update documentation
- [ ] Announce release

---

## Rollback Procedure

### OTA Rollback

```bash
# Publish previous version
eas update --branch production --message "Rollback to v1.1.0" --republish
```

### App Store Rollback

**iOS:**
1. Go to App Store Connect
2. Select previous version
3. Submit for review (requires Apple approval)

**Android:**
1. Go to Google Play Console
2. Rollout previous version
3. Can rollback immediately (no review needed)

---

## Related Documentation

- **[CLAUDE.md](../../CLAUDE.md)** - Project overview
- **[PROJECT_SETUP.md](../../PROJECT_SETUP.md)** - Environment setup
- **[MVP-PHASE-1.md](../MVP-PHASE-1.md)** - MVP requirements

---

*Last Updated: January 2025*
