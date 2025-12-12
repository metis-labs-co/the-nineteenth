# React Native Screens - The Nineteenth

You are an expert in building React Native screens with React Navigation for The Nineteenth golf competition app.

## Core Principles
- React Navigation (Stack, Tab navigators)
- Type-safe navigation with TypeScript
- React Native Paper for UI primitives (Text, Icon, ActivityIndicator)
- **DO NOT use Paper's Button component** - use TouchableOpacity
- `useThemeColors()` hook for all dynamic colors
- TanStack Query for data fetching
- Zustand for local state
- Offline-first architecture (especially for scorecard entry)

## Screen Structure

### Basic Screen Template
```tsx
// src/screens/player/CompetitionsScreen.tsx
import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { useCompetitions } from '@/hooks/useCompetitions';
import { CompetitionCard } from '@/components/competition/CompetitionCard';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Competitions'>;

export default function CompetitionsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { data: competitions, isLoading, error, refetch, isRefetching } = useCompetitions();

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
          Error loading competitions
        </Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
          {error.message}
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => refetch()}
        >
          <Text style={[styles.buttonText, { color: colors.white }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!competitions || competitions.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          No competitions yet
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('CreateCompetition')}
        >
          <Text style={[styles.buttonText, { color: colors.white }]}>
            Create Competition
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Competitions
        </Text>
        {competitions.map((competition) => (
          <CompetitionCard
            key={competition.id}
            competition={competition}
            onPress={() => navigation.navigate('CompetitionDetail', { id: competition.id })}
          />
        ))}
      </View>
    </ScrollView>
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
    padding: spacing.lg,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  title: {
    ...typography.h1,
  },
  errorTitle: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    ...typography.body,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  emptyTitle: {
    ...typography.h3,
    marginBottom: spacing.lg,
  },
  button: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  buttonText: {
    ...typography.bodyBold,
  },
});
```

### Screen with Route Parameters
```tsx
// src/screens/player/CompetitionDetailScreen.tsx
import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useCompetition } from '@/hooks/useCompetition';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CompetitionDetail'>;

export default function CompetitionDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const colors = useThemeColors();
  const { data: competition, isLoading, error } = useCompetition(id);

  // Set header title
  React.useLayoutEffect(() => {
    if (competition) {
      navigation.setOptions({ title: competition.name });
    }
  }, [competition, navigation]);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !competition) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
          Competition not found
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.buttonText, { color: colors.white }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {competition.name}
        </Text>
        {competition.description && (
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {competition.description}
          </Text>
        )}

        <View style={styles.row}>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Start Date
            </Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {new Date(competition.startDate).toLocaleDateString('en-AU')}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Handicap System
            </Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {competition.handicapSystem}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('Rounds', { competitionId: id })}
        >
          <Text style={[styles.buttonText, { color: colors.white }]}>View Rounds</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.outlineButton, { borderColor: colors.primary }]}
          onPress={() => navigation.navigate('Leaderboard', { competitionId: id })}
        >
          <Text style={[styles.buttonText, { color: colors.primary }]}>View Leaderboard</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    padding: spacing.lg,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  title: {
    ...typography.h1,
  },
  description: {
    ...typography.body,
  },
  errorTitle: {
    ...typography.h3,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    ...typography.small,
  },
  statValue: {
    ...typography.bodyBold,
  },
  button: {
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineButton: {
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

### Screen with Form
```tsx
// src/screens/admin/CreateCompetitionScreen.tsx
import React from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateCompetition } from '@/hooks/useCreateCompetition';
import { createCompetitionSchema } from '@/schemas/competition';
import type { CreateCompetitionInput } from '@/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateCompetition'>;

export default function CreateCompetitionScreen({ navigation }: Props) {
  const colors = useThemeColors();
  const { control, handleSubmit, formState: { errors } } = useForm<CreateCompetitionInput>({
    resolver: zodResolver(createCompetitionSchema),
    defaultValues: {
      handicapSystem: 'honor',
      visibility: 'private',
    },
  });

  const createCompetition = useCreateCompetition();

  const onSubmit = handleSubmit((data) => {
    createCompetition.mutate(data, {
      onSuccess: (competition) => {
        navigation.navigate('CompetitionDetail', { id: competition.id });
      },
    });
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.form}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>
                  Competition Name *
                </Text>
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Enter competition name"
                  mode="outlined"
                  error={!!errors.name}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  textColor={colors.textPrimary}
                />
                {errors.name && (
                  <Text style={[styles.error, { color: colors.error }]}>
                    {errors.name.message}
                  </Text>
                )}
              </View>
            )}
          />

          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>
                  Description
                </Text>
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Enter description (optional)"
                  mode="outlined"
                  multiline
                  numberOfLines={4}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  textColor={colors.textPrimary}
                />
              </View>
            )}
          />

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: createCompetition.isPending ? colors.surfaceDisabled : colors.primary },
            ]}
            onPress={onSubmit}
            disabled={createCompetition.isPending}
          >
            <Text style={[styles.buttonText, { color: colors.white }]}>
              {createCompetition.isPending ? 'Creating...' : 'Create Competition'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  form: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    ...typography.bodyBold,
  },
  error: {
    ...typography.small,
  },
  button: {
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonText: {
    ...typography.bodyBold,
  },
});
```

### Scorecard Screen (Offline-First)
```tsx
// src/screens/player/ScorecardScreen.tsx
import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useScorecards } from '@/hooks/useScorecards';
import { useUpdateScorecard } from '@/hooks/useUpdateScorecard';
import { useScorecardStore } from '@/store/scorecardStore';
import { PlayerScoreCard } from '@/components/scorecard/PlayerScoreCard';
import { OfflineIndicator } from '@/components/common/OfflineIndicator';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Scorecard'>;

export default function ScorecardScreen({ route, navigation }: Props) {
  const { roundId } = route.params;
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { data: scorecards, isLoading, error } = useScorecards(roundId);
  const updateScorecard = useUpdateScorecard();
  const { currentHole, setCurrentHole } = useScorecardStore();

  const handleScoreUpdate = (scorecardId: string, strokes: number) => {
    updateScorecard.mutate({
      id: scorecardId,
      updates: {
        scores: {
          [currentHole]: { strokes },
        },
      },
    });
  };

  const handleSubmitAll = () => {
    Alert.alert(
      'Submit Scorecards',
      'Are you sure you want to submit all scorecards?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: () => {
            // Submit all scorecards
            navigation.goBack();
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
          Error loading scorecards
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.buttonText, { color: colors.white }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* IMPORTANT: OfflineIndicator for offline support */}
      <OfflineIndicator />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        <View style={styles.content}>
          {/* Hole Header */}
          <View style={styles.holeHeader}>
            <Text style={[styles.holeNumber, { color: colors.textPrimary }]}>
              Hole {currentHole}
            </Text>
            <Text style={[styles.holePar, { color: colors.textSecondary }]}>
              Par 4 • 425m
            </Text>
          </View>

          {/* Player Scorecards */}
          {scorecards?.map((scorecard) => (
            <PlayerScoreCard
              key={scorecard.id}
              scorecard={scorecard}
              currentHole={currentHole}
              onScoreUpdate={(strokes) => handleScoreUpdate(scorecard.id, strokes)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Fixed Bottom Navigation */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.surface,
            paddingBottom: insets.bottom,
            borderTopColor: colors.border,
          },
        ]}
      >
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
            <Text style={[styles.buttonText, { color: colors.primary }]}>Previous</Text>
          </TouchableOpacity>

          {currentHole === 18 ? (
            <TouchableOpacity
              style={[styles.navButton, { backgroundColor: colors.primary }]}
              onPress={handleSubmitAll}
            >
              <Text style={[styles.buttonText, { color: colors.white }]}>Submit All</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.navButton, { backgroundColor: colors.primary }]}
              onPress={() => setCurrentHole(currentHole + 1)}
            >
              <Text style={[styles.buttonText, { color: colors.white }]}>Next Hole</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
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
    padding: spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  holeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  holeNumber: {
    fontSize: 32,
    fontWeight: '700',
  },
  holePar: {
    ...typography.body,
  },
  errorTitle: {
    ...typography.h3,
    marginBottom: spacing.lg,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    borderTopWidth: 1,
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
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  buttonText: {
    ...typography.bodyBold,
  },
});
```

## React Navigation Setup

### Navigation Types
```tsx
// src/navigation/types.ts
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

export type RootStackParamList = {
  // Auth
  Login: undefined;

  // Main
  MainTabs: undefined;

  // Competitions
  Competitions: undefined;
  CompetitionDetail: { id: string };
  CreateCompetition: undefined;

  // Rounds
  Rounds: { competitionId: string };
  RoundDetail: { id: string };

  // Scorecard
  Scorecard: { roundId: string };

  // Leaderboard
  Leaderboard: { competitionId: string };
};

export type TabParamList = {
  Home: undefined;
  Competitions: undefined;
  Profile: undefined;
};

// Screen props types
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type TabScreenProps<T extends keyof TabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<TabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
```

### Stack Navigator
```tsx
// src/navigation/RootNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@/store/authStore';
import { useThemeColors } from '@/context/ThemeContext';

// Screens
import LoginScreen from '@/screens/auth/LoginScreen';
import MainTabNavigator from './MainTabNavigator';
import CompetitionDetailScreen from '@/screens/player/CompetitionDetailScreen';
import CreateCompetitionScreen from '@/screens/admin/CreateCompetitionScreen';
import ScorecardScreen from '@/screens/player/ScorecardScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user } = useAuthStore();
  const colors = useThemeColors();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
        }}
      >
        {!user ? (
          // Auth Stack
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          // Main Stack
          <>
            <Stack.Screen
              name="MainTabs"
              component={MainTabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CompetitionDetail"
              component={CompetitionDetailScreen}
              options={{ title: 'Competition' }}
            />
            <Stack.Screen
              name="CreateCompetition"
              component={CreateCompetitionScreen}
              options={{ title: 'Create Competition' }}
            />
            <Stack.Screen
              name="Scorecard"
              component={ScorecardScreen}
              options={{ title: 'Scorecard' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### Tab Navigator
```tsx
// src/navigation/MainTabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';

// Screens
import HomeScreen from '@/screens/player/HomeScreen';
import CompetitionsScreen from '@/screens/player/CompetitionsScreen';
import ProfileScreen from '@/screens/player/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const colors = useThemeColors();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon source="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Competitions"
        component={CompetitionsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon source="trophy" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon source="account" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
```

## Data Fetching Patterns

### Basic Query with Loading/Error States
```tsx
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['competitions'],
  queryFn: fetchCompetitions,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

if (isLoading) return <LoadingState />;
if (error) return <ErrorState error={error} onRetry={refetch} />;
if (!data || data.length === 0) return <EmptyState />;

return <CompetitionsList competitions={data} />;
```

### Infinite Query with FlashList
```tsx
import { FlashList } from '@shopify/flash-list';

const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useInfiniteQuery({
  queryKey: ['competitions'],
  queryFn: ({ pageParam = 0 }) => fetchCompetitions(pageParam),
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});

const flatData = data?.pages.flatMap(page => page.data) ?? [];

return (
  <FlashList
    data={flatData}
    renderItem={({ item }) => <CompetitionCard competition={item} />}
    estimatedItemSize={120}
    onEndReached={() => {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }}
    onEndReachedThreshold={0.5}
    ListFooterComponent={isFetchingNextPage ? <ActivityIndicator /> : null}
  />
);
```

## State Management with Zustand

### Store Definition
```tsx
// src/store/scorecardStore.ts
import { create } from 'zustand';
import type { Scorecard, Player } from '@/types';

interface ScorecardState {
  currentHole: number;
  scorecards: Scorecard[];
  players: Player[];

  setCurrentHole: (hole: number) => void;
  updateScore: (scorecardId: string, hole: number, strokes: number) => void;
  reset: () => void;
}

export const useScorecardStore = create<ScorecardState>((set) => ({
  currentHole: 1,
  scorecards: [],
  players: [],

  setCurrentHole: (hole) => set({ currentHole: hole }),

  updateScore: (scorecardId, hole, strokes) =>
    set((state) => ({
      scorecards: state.scorecards.map((sc) =>
        sc.id === scorecardId
          ? {
              ...sc,
              scores: {
                ...sc.scores,
                [hole]: { strokes },
              },
            }
          : sc
      ),
    })),

  reset: () => set({ currentHole: 1, scorecards: [], players: [] }),
}));
```

## Loading States

### Custom Loading Component
```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  message: {
    ...typography.body,
  },
});
```

## Accessibility

### Basic Labels
```tsx
<TouchableOpacity
  onPress={handleSubmit}
  accessibilityLabel="Submit scorecard"
  accessibilityHint="Submits scores for all players in the group"
  accessibilityRole="button"
>
  <Text>Submit</Text>
</TouchableOpacity>
```

### Screen Reader Announcements
```tsx
import { AccessibilityInfo } from 'react-native';

useEffect(() => {
  if (data) {
    AccessibilityInfo.announceForAccessibility('Competitions loaded successfully');
  }
}, [data]);
```

## Best Practices

1. **Navigation**: Use React Navigation with TypeScript types
2. **UI Components**: Use React Native Paper for Text, Icon, ActivityIndicator
3. **Buttons**: Use TouchableOpacity with explicit styling (NOT Paper Button)
4. **Theme Colors**: Always use `useThemeColors()` hook
5. **Data Fetching**: Use TanStack Query for server state
6. **Local State**: Use Zustand for client state
7. **Always Handle States**: Loading, error, empty states
8. **Pull-to-Refresh**: On all list screens
9. **Type Safety**: Proper TypeScript types for routes and params
10. **Accessibility**: Add labels and hints
11. **Keyboard Handling**: KeyboardAvoidingView and dismissal
12. **Safe Areas**: Use useSafeAreaInsets for proper spacing
13. **Offline Support**: Scorecard entry screens MUST include OfflineIndicator
14. **Performance**: Use React.memo, useCallback, FlashList
15. **Testing**: Test on both iOS and Android
16. **Australian Formats**: DD/MM/YYYY dates, Australian states

## File Structure

```
src/
├── screens/
│   ├── auth/
│   │   └── LoginScreen.tsx
│   ├── admin/
│   │   ├── CreateCompetitionScreen.tsx
│   │   └── ManagePlayersScreen.tsx
│   └── player/
│       ├── HomeScreen.tsx
│       ├── CompetitionsScreen.tsx
│       ├── CompetitionDetailScreen.tsx
│       ├── ScorecardScreen.tsx
│       └── LeaderboardScreen.tsx
├── navigation/
│   ├── RootNavigator.tsx
│   ├── MainTabNavigator.tsx
│   └── types.ts
├── components/
│   ├── common/
│   │   ├── ErrorState.tsx
│   │   ├── EmptyState.tsx
│   │   ├── LoadingState.tsx
│   │   └── OfflineIndicator.tsx
│   ├── competition/
│   │   └── CompetitionCard.tsx
│   └── scorecard/
│       └── PlayerScoreCard.tsx
└── hooks/
    ├── useCompetitions.ts
    ├── useCompetition.ts
    ├── useScorecards.ts
    └── useUpdateScorecard.ts
```
