# Data Fetching with TanStack Query - The Nineteenth

You are an expert in data fetching for React Native apps using TanStack Query for The Nineteenth golf competition app.

## Core Principles
- TanStack Query for server state management
- Generic API client (backend TBD)
- Optimistic updates for better UX
- Proper cache management
- Offline-first with SQLite (when needed)

## Important Note
**Backend is currently in development.** For now, use mock data or local Zustand stores. All API examples show the future implementation pattern - replace with actual endpoints when backend is ready.

## Setup

```bash
cd GolfApp
pnpm add @tanstack/react-query @tanstack/react-query-persist-client
```

### Query Client Configuration
```tsx
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/react-query-persist-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Persist cache to AsyncStorage
export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
});
```

### Provider Setup
```tsx
// App.tsx or Root component
import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, persister } from '@/lib/queryClient';

export default function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      {/* Your app components */}
    </PersistQueryClientProvider>
  );
}
```

### API Client (Generic - Backend TBD)
```tsx
// src/services/api/client.ts
import axios from 'axios';

// TODO: Update this when backend is deployed
const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'https://api.thenineteenth.com';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor when auth is implemented
apiClient.interceptors.request.use((config) => {
  // TODO: Add auth token
  // const token = await getAuthToken();
  // if (token) {
  //   config.headers.Authorization = `Bearer ${token}`;
  // }
  return config;
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Handle unauthorized
    }
    return Promise.reject(error);
  }
);
```

## Query Patterns

### Basic Query
```tsx
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import type { Competition } from '@/types';

export function useCompetitions() {
  return useQuery({
    queryKey: ['competitions'],
    queryFn: async () => {
      // TODO: Replace with actual API call when backend is ready
      // For now, return mock data or from local store
      const response = await apiClient.get<Competition[]>('/competitions');
      return response.data;
    },
  });
}

// Usage in component
function CompetitionsScreen() {
  const { data, isLoading, error, refetch } = useCompetitions();

  if (isLoading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return <CompetitionsList competitions={data} />;
}
```

### Query with Parameters
```tsx
export function useCompetition(id: string) {
  return useQuery({
    queryKey: ['competition', id],
    queryFn: async () => {
      // TODO: Replace with actual API
      const response = await apiClient.get<Competition>(`/competitions/${id}`);
      return response.data;
    },
    enabled: !!id, // Only fetch if ID exists
  });
}
```

### Query for Rounds
```tsx
export function useRounds(competitionId: string) {
  return useQuery({
    queryKey: ['rounds', competitionId],
    queryFn: async () => {
      // TODO: Replace with actual API
      const response = await apiClient.get<Round[]>(`/competitions/${competitionId}/rounds`);
      return response.data;
    },
    enabled: !!competitionId,
  });
}
```

### Query for Scorecards
```tsx
export function useScorecards(roundId: string) {
  return useQuery({
    queryKey: ['scorecards', roundId],
    queryFn: async () => {
      // TODO: Replace with actual API
      const response = await apiClient.get<Scorecard[]>(`/rounds/${roundId}/scorecards`);
      return response.data;
    },
    enabled: !!roundId,
  });
}
```

### Infinite Query (Pagination)
```tsx
import { useInfiniteQuery } from '@tanstack/react-query';

const PAGE_SIZE = 20;

export function useInfiniteCompetitions() {
  return useInfiniteQuery({
    queryKey: ['competitions', 'infinite'],
    queryFn: async ({ pageParam = 0 }) => {
      // TODO: Replace with actual API
      const response = await apiClient.get('/competitions', {
        params: {
          offset: pageParam,
          limit: PAGE_SIZE,
        },
      });

      return {
        data: response.data,
        nextCursor: response.data.length === PAGE_SIZE
          ? pageParam + PAGE_SIZE
          : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

// Usage with FlashList
function InfiniteCompetitionsList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteCompetitions();

  const flatData = data?.pages.flatMap(page => page.data) ?? [];

  return (
    <FlashList
      data={flatData}
      renderItem={({ item }) => <CompetitionCard competition={item} />}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? <Spinner /> : null
      }
    />
  );
}
```

## Mutation Patterns

### Basic Mutation
```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CompetitionCreateInput } from '@/types';

export function useCreateCompetition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newCompetition: CompetitionCreateInput) => {
      // TODO: Replace with actual API
      const response = await apiClient.post<Competition>(
        '/competitions',
        newCompetition
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
    },
  });
}

// Usage
function CreateCompetitionScreen() {
  const mutation = useCreateCompetition();
  const navigation = useNavigation();

  const handleSubmit = (data: CompetitionCreateInput) => {
    mutation.mutate(data, {
      onSuccess: (competition) => {
        navigation.navigate('CompetitionDetail', { id: competition.id });
      },
      onError: (error) => {
        Alert.alert('Error', error.message);
      },
    });
  };

  return (
    <Button
      onPress={handleSubmit}
      isLoading={mutation.isPending}
      isDisabled={mutation.isPending}
    >
      Create Competition
    </Button>
  );
}
```

### Update Scorecard with Optimistic Update
```tsx
export function useUpdateScorecard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates
    }: {
      id: string;
      updates: Partial<Scorecard>
    }) => {
      // TODO: Replace with actual API
      const response = await apiClient.put<Scorecard>(
        `/scorecards/${id}`,
        updates
      );
      return response.data;
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['scorecard', id] });

      // Snapshot previous value
      const previousScorecard = queryClient.getQueryData(['scorecard', id]);

      // Optimistically update
      queryClient.setQueryData(['scorecard', id], (old: Scorecard) => ({
        ...old,
        ...updates,
      }));

      return { previousScorecard };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousScorecard) {
        queryClient.setQueryData(
          ['scorecard', variables.id],
          context.previousScorecard
        );
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['scorecard', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['scorecards', data?.roundId] });
    },
  });
}
```

### Delete Mutation
```tsx
export function useDeleteCompetition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // TODO: Replace with actual API
      await apiClient.delete(`/competitions/${id}`);
    },
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['competition', id] });
      // Invalidate list
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
    },
  });
}
```

## Offline Support with SQLite

### Save Scorecard Offline
```tsx
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabase('thenineteenth.db');

export function useSaveScorecardOffline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scorecard: Scorecard) => {
      // Save to SQLite immediately
      await saveToSQLite(scorecard);

      // Try to sync with backend
      try {
        const response = await apiClient.put(
          `/scorecards/${scorecard.id}`,
          scorecard
        );
        return response.data;
      } catch (error) {
        // If offline, queue for later sync
        await queueForSync(scorecard);
        return scorecard;
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['scorecard', data.id], data);
    },
  });
}

// Helper functions
async function saveToSQLite(scorecard: Scorecard) {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `INSERT OR REPLACE INTO scorecards
         (id, roundId, playerId, scores, totalGross, totalNet, status, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          scorecard.id,
          scorecard.roundId,
          scorecard.playerId,
          JSON.stringify(scorecard.scores),
          scorecard.totalGross,
          scorecard.totalNet,
          scorecard.status,
          0, // Not synced yet
        ],
        () => resolve(true),
        (_, error) => reject(error)
      );
    });
  });
}
```

## Error Handling

### Query Error Boundary
```tsx
import { useQuery } from '@tanstack/react-query';
import { Box, Text, Button } from 'native-base';

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <Box flex={1} justifyContent="center" alignItems="center" p={4}>
      <Text fontSize="xl" fontWeight="600" mb={2}>
        Error loading data
      </Text>
      <Text color="gray.600" mb={4}>
        {error.message}
      </Text>
      <Button onPress={resetErrorBoundary}>Try Again</Button>
    </Box>
  );
}
```

### Manual Error Handling
```tsx
const { error, refetch } = useCompetitions();

if (error) {
  return (
    <Box flex={1} justifyContent="center" alignItems="center" p={4}>
      <Text fontSize="lg" mb={4}>
        Failed to load competitions
      </Text>
      <Text color="gray.600" mb={4}>
        {error.message}
      </Text>
      <Button onPress={() => refetch()}>Retry</Button>
    </Box>
  );
}
```

## Loading States

### Query Loading
```tsx
const { data, isLoading, isFetching, isRefetching } = useCompetitions();

// Initial load
if (isLoading) return <Spinner size="lg" />;

// Background refetch (show existing data)
return (
  <Box flex={1}>
    {isFetching && <ProgressBar />}
    <CompetitionsList competitions={data} />
  </Box>
);
```

### Pull-to-Refresh
```tsx
import { RefreshControl, ScrollView } from 'react-native';

function CompetitionsList() {
  const { data, refetch, isRefetching } = useCompetitions();

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
        />
      }
    >
      {data.map(competition => (
        <CompetitionCard key={competition.id} competition={competition} />
      ))}
    </ScrollView>
  );
}
```

## Prefetching

### Prefetch on Navigation
```tsx
import { useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

function CompetitionListItem({ competition }: { competition: Competition }) {
  const queryClient = useQueryClient();
  const navigation = useNavigation();

  const handlePress = () => {
    // Prefetch detail before navigation
    queryClient.prefetchQuery({
      queryKey: ['competition', competition.id],
      queryFn: () => fetchCompetition(competition.id),
    });

    navigation.navigate('CompetitionDetail', { id: competition.id });
  };

  return <CompetitionCard onPress={handlePress} competition={competition} />;
}
```

## Dependent Queries

### Sequential Queries
```tsx
function RoundWithScorecards({ id }: { id: string }) {
  const { data: round } = useRound(id);

  const { data: scorecards } = useQuery({
    queryKey: ['scorecards', round?.id],
    queryFn: () => fetchScorecards(round.id),
    enabled: !!round?.id, // Only fetch when round loaded
  });

  return <View>{/* Render */}</View>;
}
```

## Best Practices

1. **Use query keys wisely** - Structure: ['resource', id, ...filters]
2. **Enable/disable queries** - Use `enabled` option
3. **Optimistic updates** - For better UX on mutations (especially for scorecard entry)
4. **Proper error handling** - Show retry options
5. **Loading states** - Use Spinner or skeleton screens
6. **Invalidate carefully** - Don't over-invalidate
7. **Prefetch on navigation** - Better perceived performance
8. **Offline support** - Use SQLite for scorecard entry
9. **Persist queries** - For offline support
10. **Type safety** - Use TypeScript generics with your types from `src/types/index.ts`

## Query Key Patterns

```typescript
// Competition lists
['competitions']
['competitions', { status: 'active' }]

// Individual competitions
['competition', id]
['competition', id, 'rounds']

// Rounds
['rounds', competitionId]
['round', roundId]

// Scorecards
['scorecards', roundId]
['scorecard', scorecardId]

// Players
['players', competitionId]
['player', playerId]

// User-specific
['user', userId, 'competitions']

// Infinite queries
['competitions', 'infinite']
['competitions', 'infinite', { filter }]
```

## Golf-Specific Patterns

### Scorecard Entry (Offline-First)
```tsx
// Must work offline - critical for on-course scoring
export function useUpdateScorecardScore() {
  return useMutation({
    mutationFn: async (update: {
      scorecardId: string;
      hole: number;
      score: HoleScore
    }) => {
      // Save locally first (instant)
      await saveScoreLocally(update);

      // Try to sync with backend (can fail if offline)
      try {
        const response = await apiClient.put(
          `/scorecards/${update.scorecardId}/holes/${update.hole}`,
          update.score
        );
        return response.data;
      } catch {
        // Queue for background sync
        await queueForBackgroundSync(update);
        return update; // Return local data
      }
    },
  });
}
```

## Mock Data Pattern (Until Backend is Ready)

```tsx
// src/services/api/mockData.ts
import type { Competition, Round, Scorecard } from '@/types';

export const mockCompetitions: Competition[] = [
  {
    id: '1',
    name: 'Spring Championship 2025',
    description: 'Annual spring golf competition',
    startDate: new Date('2025-03-01'),
    handicapSystem: 'honor',
    visibility: 'private',
    inviteCode: 'SPRING2025',
    organizerId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // ... more mock data
];

// Use in hooks temporarily
export function useCompetitions() {
  return useQuery({
    queryKey: ['competitions'],
    queryFn: async () => {
      // TODO: Replace with actual API
      // return (await apiClient.get('/competitions')).data;

      // For now, return mock data
      return new Promise(resolve => {
        setTimeout(() => resolve(mockCompetitions), 500);
      });
    },
  });
}
```
