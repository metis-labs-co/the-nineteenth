# Mobile Feature Development Workflow - The Nineteenth

## Feature Implementation Flow

When implementing a new mobile feature for The Nineteenth golf competition app, follow this sequence:

### 1. **Type Definition** [TYPE]
- Define TypeScript types in `src/types/index.ts`
- Create Zod validation schemas in `src/schemas/` (will be shared with backend when built)
- Export types for use across the app

### 2. **Local State** [STATE] (if needed)
- Create Zustand store in `src/store/`
- Define state interface
- Implement actions
- Add persistence with AsyncStorage if needed

### 3. **API Hooks** [HOOK] (Mock data for now)
- Create TanStack Query hooks in `src/hooks/`
- Implement queries (useQuery, useInfiniteQuery)
- Implement mutations (useMutation) with optimistic updates
- Configure proper cache settings
- Add error handling
- **Note**: Use mock data until backend is built

### 4. **Screen Development** [SCREEN]
- Create screens in `src/screens/` directory
- Use React Navigation (Stack/Tab navigators)
- Implement data fetching with TanStack Query hooks
- Add loading states (ActivityIndicator or skeleton screens)
- Add error states with retry
- Add empty states
- Implement pull-to-refresh

### 5. **Component Extraction** [COMPONENT]
- Extract reusable components to `src/components/`
- Use React Native Paper components (Text, Icon, ActivityIndicator)
- Use TouchableOpacity for touch handling (not Pressable)
- Apply design tokens from `src/constants/theme.ts`
- Use `useThemeColors()` hook for all dynamic colors
- Optimize with React.memo
- Add proper TypeScript types

### 6. **Styling** [STYLE]
- Use React Native StyleSheet API
- Apply design tokens from `src/constants/theme.ts` (colors, spacing, typography)
- Support light/dark modes
- Handle platform-specific styling with Platform.select
- Ensure responsive design

### 7. **Offline Support** [OFFLINE] (if required)
- Implement SQLite local storage with Expo SQLite
- Set up sync queue for offline mutations
- Configure TanStack Query persistence with AsyncStorage
- Handle conflict resolution (last-write-wins or manual)

### 8. **Testing** [TEST]
- Unit tests for components and utilities
- Integration tests for hooks
- E2E tests for critical flows (scorecard entry, competition creation)

### 9. **Verification** [VERIFY]
- Run type check: `pnpm typecheck`
- Run lint check: `pnpm lint`
- Fix any errors before committing
- Ensure no regressions in existing functionality

---

## Example Flow: Scorecard Entry Feature

**User Request:** "I need to add a feature for scoring a golf round with offline support"

### 1. Type Definition
```typescript
// src/types/index.ts (types already exist)
export interface Scorecard {
  id: string;
  roundId: string;
  playerId: string;
  scores: { [holeNumber: number]: HoleScore };
  totalGross: number;
  totalNet: number;
  status: ScorecardStatus;
  submittedAt?: Date;
  submittedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HoleScore {
  strokes: number;
  putts?: number;
  fairwayHit?: boolean;
  greenInRegulation?: boolean;
  penalties?: number;
}

// src/schemas/scorecard.ts (create this)
import { z } from 'zod';

export const holeScoreSchema = z.object({
  strokes: z.number().min(1).max(20),
  putts: z.number().min(0).max(10).optional(),
  fairwayHit: z.boolean().optional(),
  greenInRegulation: z.boolean().optional(),
  penalties: z.number().min(0).optional(),
});

export const updateScorecardSchema = z.object({
  scores: z.record(z.string(), holeScoreSchema),
  status: z.enum(['not-started', 'in-progress', 'completed', 'confirmed']).optional(),
});
```

### 2. Local State (Zustand Store)
```typescript
// src/store/scorecardStore.ts (already exists, example)
import { create } from 'zustand';
import type { Scorecard, Player } from '@/types';

interface ScorecardState {
  currentHole: number;
  scorecards: Scorecard[];
  players: Player[];

  setCurrentHole: (hole: number) => void;
  setPlayerScore: (playerId: string, hole: number, strokes: number) => void;
  submitScorecard: (scorecardId: string) => Promise<void>;
}

export const useScorecardStore = create<ScorecardState>((set, get) => ({
  currentHole: 1,
  scorecards: [],
  players: [],

  setCurrentHole: (hole) => set({ currentHole: hole }),

  setPlayerScore: (playerId, hole, strokes) => {
    // Implementation
  },

  submitScorecard: async (scorecardId) => {
    // Sync with backend when ready
  },
}));
```

### 3. API Hooks
```typescript
// src/hooks/useScorecards.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useScorecardStore } from '@/store/scorecardStore';
import type { Scorecard, UpdateScorecardInput } from '@/types';

export function useScorecards(roundId: string) {
  return useQuery({
    queryKey: ['scorecards', roundId],
    queryFn: async () => {
      // TODO: Replace with actual API call
      // For now, return from local store or mock data
      const scorecards = useScorecardStore.getState().scorecards;
      return scorecards.filter(s => s.roundId === roundId);
    },
    enabled: !!roundId,
  });
}

export function useUpdateScorecard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateScorecardInput }) => {
      // TODO: API call when backend ready
      // For now, update local store
      const updatedScorecard = await updateLocalScorecard(id, updates);
      return updatedScorecard;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scorecards', data.roundId] });
    },
  });
}
```

### 4. Screen Implementation
```typescript
// src/screens/player/ScorecardScreen.tsx
import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useScorecards } from '@/hooks/useScorecards';
import { useScorecardStore } from '@/store/scorecardStore';
import { PlayerScoreCard } from '@/components/scorecard/PlayerScoreCard';
import { ErrorState, OfflineIndicator } from '@/components/common';

export default function ScorecardScreen({ route }) {
  const { roundId } = route.params;
  const colors = useThemeColors();
  const { data: scorecards, isLoading, error, refetch } = useScorecards(roundId);
  const { currentHole, setCurrentHole } = useScorecardStore();

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorState error={error.message} onRetry={refetch} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <OfflineIndicator />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.holeTitle, { color: colors.textPrimary }]}>
          Hole {currentHole}
        </Text>

        {scorecards.map((scorecard) => (
          <PlayerScoreCard
            key={scorecard.id}
            scorecard={scorecard}
            currentHole={currentHole}
          />
        ))}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.navButton,
              { borderColor: colors.primary },
              currentHole === 1 && { opacity: 0.5 },
            ]}
            onPress={() => setCurrentHole(currentHole - 1)}
            disabled={currentHole === 1}
          >
            <Text style={[styles.buttonText, { color: colors.primary }]}>
              Previous Hole
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.navButton,
              { backgroundColor: colors.primary },
              currentHole === 18 && { opacity: 0.5 },
            ]}
            onPress={() => setCurrentHole(currentHole + 1)}
            disabled={currentHole === 18}
          >
            <Text style={[styles.buttonText, { color: colors.white }]}>
              Next Hole
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  holeTitle: {
    ...typography.h1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  navButton: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    ...typography.bodyBold,
  },
});
```

### 5. Component Extraction
```typescript
// src/components/scorecard/PlayerScoreCard.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { Scorecard } from '@/types';

interface PlayerScoreCardProps {
  scorecard: Scorecard;
  currentHole: number;
  onScoreUpdate?: (strokes: number) => void;
}

export const PlayerScoreCard = React.memo(function PlayerScoreCard({
  scorecard,
  currentHole,
  onScoreUpdate,
}: PlayerScoreCardProps) {
  const colors = useThemeColors();
  const currentScore = scorecard.scores[currentHole];
  const scoreButtons = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.playerName, { color: colors.textPrimary }]}>
            {scorecard.player?.name}
          </Text>
          <Text style={[styles.handicap, { color: colors.textSecondary }]}>
            HC: {scorecard.player?.handicap || 0}
          </Text>
        </View>
        <View style={[styles.scoreDisplay, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.scoreText, { color: colors.textPrimary }]}>
            {currentScore?.strokes || '-'}
          </Text>
        </View>
      </View>

      <View style={styles.buttonGrid}>
        {scoreButtons.map((strokes) => {
          const isActive = currentScore?.strokes === strokes;
          return (
            <TouchableOpacity
              key={strokes}
              style={[
                styles.scoreButton,
                {
                  backgroundColor: isActive ? colors.primary : colors.surfaceVariant,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onScoreUpdate?.(strokes)}
            >
              <Text style={[
                styles.scoreButtonText,
                { color: isActive ? colors.white : colors.textPrimary },
              ]}>
                {strokes}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  playerName: {
    ...typography.bodyBold,
  },
  handicap: {
    ...typography.small,
  },
  scoreDisplay: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    ...typography.h2,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  scoreButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreButtonText: {
    ...typography.bodyBold,
  },
});
```

---

## File Structure Best Practices

```
src/
├── components/         # Reusable components
│   ├── common/        # Generic UI components
│   ├── competition/   # Competition-specific
│   ├── scorecard/     # Scorecard-specific
│   └── player/        # Player-specific
├── screens/           # Screen components
│   ├── admin/         # Organizer screens
│   └── player/        # Player screens
├── hooks/             # TanStack Query hooks
├── store/             # Zustand stores
├── services/          # API and offline services
├── types/             # TypeScript types
├── schemas/           # Zod validation schemas
├── utils/             # Utility functions
└── constants/         # Design tokens, constants
```

---

## Golf-Specific Considerations

### Handicap Calculations
- Implement in `src/utils/scoring.ts`
- Support stroke play and Stableford
- Handle different handicap systems

### Offline-First for Scoring
- Store scores locally in Expo SQLite
- Sync when connection returns
- Handle conflicts (last-write-wins)

### Multi-Player Scoring
- One device can score for entire group
- Update all player scorecards simultaneously
- Show visual feedback for each player

### Australian Golf Specifics
- Date format: DD/MM/YYYY
- Australian states for course search
- Golf Australia terminology

---

## Testing Checklist

- [ ] Works on iOS and Android
- [ ] Handles loading states gracefully
- [ ] Handles error states with retry
- [ ] Handles empty states
- [ ] Pull-to-refresh works
- [ ] Forms validate properly
- [ ] Optimistic updates work
- [ ] Accessibility labels present
- [ ] Works offline (for scorecard entry)
- [ ] Keyboard dismissal works
- [ ] Touch targets are 48dp minimum
