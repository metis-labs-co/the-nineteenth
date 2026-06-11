/**
 * JoinLeagueScreen - Join a league
 *
 * Public mode: search public leagues, tap to view & join (LeagueDetail).
 * Private mode: enter an invite code (LGE-xxxxx).
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Text, Icon, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { PageHeader, FormInput } from '@/components/common';
import { SegmentedButton } from '@/components/common/SegmentedButton';
import { SearchBar } from '@/components/common/SearchBar';
import { EmptyState } from '@/components/common/EmptyState';
import { LeagueCard } from '@/components/leagues';
import { useThemeColors } from '@/context/ThemeContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useJoinLeague, usePublicLeagues } from '@/hooks/useLeagues';
import type { League, LeagueWithPlayerCount } from '@/types/database';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type JoinMode = 'public' | 'private';

export default function JoinLeagueScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const joinLeague = useJoinLeague();

  const [mode, setMode] = useState<JoinMode>('public');

  // Public search
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const { data: publicLeagues, isLoading: isLoadingPublic } = usePublicLeagues(
    debouncedSearch || undefined
  );

  // Private invite code
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCodeChange = useCallback((text: string) => {
    setError(null);
    const formatted = text.toUpperCase().replace(/[^A-Z0-9-_]/g, '');
    if (formatted.length <= 20) {
      setInviteCode(formatted);
    }
  }, []);

  const canJoin = inviteCode.length >= 4;

  const handleJoin = useCallback(async () => {
    if (!canJoin) return;
    setError(null);
    try {
      const league = await joinLeague.mutateAsync(inviteCode.trim());
      navigation.replace('LeagueDetail', { id: league.id });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join league');
    }
  }, [canJoin, inviteCode, joinLeague, navigation]);

  const handleLeaguePress = useCallback(
    (league: League) => {
      navigation.navigate('LeagueDetail', { id: league.id });
    },
    [navigation]
  );

  const renderPublicLeague = useCallback(
    ({ item }: { item: LeagueWithPlayerCount }) => (
      <LeagueCard
        league={item}
        onPress={() => handleLeaguePress(item)}
        playerCount={item.player_count}
      />
    ),
    [handleLeaguePress]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <PageHeader
          title="Join League"
          showBack
          onBack={() => navigation.goBack()}
        />

        <View style={styles.toggleContainer}>
          <SegmentedButton<JoinMode>
            value={mode}
            onValueChange={setMode}
            buttons={[
              { value: 'public', label: 'Public', icon: 'earth' },
              { value: 'private', label: 'Private', icon: 'lock-outline' },
            ]}
          />
        </View>

        {mode === 'public' ? (
          <FlatList
            data={publicLeagues ?? []}
            renderItem={renderPublicLeague}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              (!publicLeagues || publicLeagues.length === 0) && styles.emptyListContent,
            ]}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search public leagues..."
                accessibilityLabel="Search public leagues"
                hideBorder
                containerStyle={styles.searchContainer}
              />
            }
            ListEmptyComponent={
              isLoadingPublic ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : (
                <EmptyState
                  icon="earth"
                  title={searchQuery ? 'No Results' : 'No Public Leagues'}
                  message={
                    searchQuery
                      ? 'No leagues match your search. Try a different term.'
                      : 'No public leagues yet. Check back later or ask a friend for an invite code.'
                  }
                />
              )
            }
          />
        ) : (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.inputSection}>
              <FormInput
                label="Invite Code"
                floatingLabel
                placeholder="Enter invite code (e.g. LGE-12345)"
                value={inviteCode}
                onChangeText={handleCodeChange}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={20}
                error={error || undefined}
                autoFocus
                accessibilityHint="Enter the league invite code shared by the creator"
              />

              <TouchableOpacity
                onPress={handleJoin}
                disabled={!canJoin || joinLeague.isPending}
                style={[
                  styles.joinButton,
                  { backgroundColor: canJoin ? colors.primary : colors.gray200 },
                ]}
                activeOpacity={0.7}
                accessibilityLabel="Join league"
              >
                <Text
                  style={[
                    styles.joinButtonText,
                    { color: canJoin ? colors.white : colors.textSecondary },
                  ]}
                >
                  {joinLeague.isPending ? 'Joining...' : 'Join League'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.helpBox, { backgroundColor: colors.surface }]}>
              <Icon source="information-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                Ask the league creator for the invite code. It starts with &quot;LGE-&quot; followed by 5 digits.
              </Text>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  toggleContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.xxxl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxxl,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  inputSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  joinButton: {
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    ...shadows.sm,
  },
  joinButtonText: {
    ...typography.bodyBold,
  },
  helpBox: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xxl,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  helpText: {
    ...typography.small,
    flex: 1,
    lineHeight: 20,
  },
});
