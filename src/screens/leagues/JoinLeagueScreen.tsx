/**
 * JoinLeagueScreen - Join a league via invite code
 *
 * Follows the JoinCompetitionScreen pattern.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { PageHeader, FormInput } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useJoinLeague } from '@/hooks/useLeagues';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function JoinLeagueScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const joinLeague = useJoinLeague();

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

          {/* Help text */}
          <View style={[styles.helpBox, { backgroundColor: colors.surface }]}>
            <Icon source="information-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
              Ask the league creator for the invite code. It starts with &quot;LGE-&quot; followed by 5 digits.
            </Text>
          </View>
        </ScrollView>
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
