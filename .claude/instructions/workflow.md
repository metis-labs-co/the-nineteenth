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
- Use NativeBase components as building blocks
- Apply design tokens from `src/constants/theme.ts`
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
import { ScrollView, StyleSheet } from 'react-native';
import { Box, VStack, HStack, Text, Button, Spinner } from 'native-base';
import { useScorecards } from '@/hooks/useScorecards';
import { useScorecardStore } from '@/store/scorecardStore';
import { PlayerScoreCard } from '@/components/scorecard/PlayerScoreCard';

export default function ScorecardScreen({ route }) {
  const { roundId } = route.params;
  const { data: scorecards, isLoading, error, refetch } = useScorecards(roundId);
  const { currentHole, setCurrentHole } = useScorecardStore();

  if (isLoading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Spinner size="lg" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" p={4}>
        <Text fontSize="lg" mb={4}>Error loading scorecards</Text>
        <Button onPress={() => refetch()}>Retry</Button>
      </Box>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <VStack space={4} p={4}>
        <Text fontSize="2xl" fontWeight="bold">
          Hole {currentHole}
        </Text>

        {scorecards.map((scorecard) => (
          <PlayerScoreCard
            key={scorecard.id}
            scorecard={scorecard}
            currentHole={currentHole}
          />
        ))}

        <HStack space={2} justifyContent="space-between">
          <Button
            flex={1}
            isDisabled={currentHole === 1}
            onPress={() => setCurrentHole(currentHole - 1)}
          >
            Previous Hole
          </Button>
          <Button
            flex={1}
            isDisabled={currentHole === 18}
            onPress={() => setCurrentHole(currentHole + 1)}
          >
            Next Hole
          </Button>
        </HStack>
      </VStack>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
});
```

### 5. Component Extraction
```typescript
// src/components/scorecard/PlayerScoreCard.tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import { Box, HStack, VStack, Text, Pressable } from 'native-base';
import { colors, spacing } from '@/constants/theme';
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
  const currentScore = scorecard.scores[currentHole];
  const scoreButtons = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <Box style={styles.card}>
      <VStack space={3}>
        <HStack justifyContent="space-between" alignItems="center">
          <VStack>
            <Text fontSize="lg" fontWeight="600">
              {scorecard.player?.name}
            </Text>
            <Text fontSize="sm" color="gray.600">
              HC: {scorecard.player?.handicap || 0}
            </Text>
          </VStack>
          <Box style={styles.scoreDisplay}>
            <Text fontSize="2xl" fontWeight="bold">
              {currentScore?.strokes || '-'}
            </Text>
          </Box>
        </HStack>

        <HStack space={2} flexWrap="wrap">
          {scoreButtons.map((strokes) => (
            <Pressable
              key={strokes}
              style={[
                styles.scoreButton,
                currentScore?.strokes === strokes && styles.scoreButtonActive,
              ]}
              onPress={() => onScoreUpdate?.(strokes)}
            >
              <Text
                fontSize="lg"
                fontWeight="bold"
                color={currentScore?.strokes === strokes ? 'white' : 'gray.700'}
              >
                {strokes}
              </Text>
            </Pressable>
          ))}
        </HStack>
      </VStack>
    </Box>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.gray300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreDisplay: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.gray100,
    borderWidth: 2,
    borderColor: colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
