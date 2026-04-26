/**
 * JoinCompetitionScreen - Join a competition via invite code
 *
 * Features:
 * - Dedicated screen for joining competitions (not inline on home)
 * - Input field for invite code with validation (4-20 chars, alphanumeric + hyphens/underscores)
 * - Competition preview card on valid code (name, dates, organizer, player count)
 * - Join button adds player to competition and navigates to dashboard
 * - "Not Found" state when invite code doesn't match any competition
 * - Loading and error states
 * - Uses React Native Paper components (TextInput, Card, Button)
 *
 * Based on MVP Phase 1 specifications
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Card, Divider } from 'react-native-paper';
import { IconSearch } from '@tabler/icons-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/hooks/useAuth';
import { useCheckAchievements } from '@/hooks/achievements/useCheckAchievements';
import { useAchievementToast } from '@/context/AchievementToastContext';
import { supabase } from '@/services/supabase/client';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { PageHeader, FormInput } from '@/components/common';
import { StatusBadge, type StatusVariant } from '@/components/common/StatusBadge';
import type { HandicapSystem, CompetitionStatus, InvitationStatus } from '@/types/database.types';

type Props = NativeStackScreenProps<RootStackParamList, 'JoinCompetition'>;

/** Competition preview data type */
interface CompetitionPreview {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  organizerName: string;
  playerCount: number;
  handicapSystem: string;
  status: string;
}

/** Format date to Australian format (DD/MM/YYYY) */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/** Get handicap system display name */
const getHandicapSystemLabel = (system: string): string => {
  switch (system) {
    case 'honor':
      return 'Honour System';
    case 'whs':
      return 'World Handicap System';
    case 'gross-only':
      return 'Gross Only';
    default:
      return system;
  }
};

/** Map competition status to StatusVariant */
const getStatusVariant = (status: string): StatusVariant => {
  return status as StatusVariant;
};

/**
 * Validate invite code format
 * Must match the creation schema: 4-20 characters, letters, numbers, hyphens, underscores
 */
const validateInviteCode = (code: string): boolean => {
  if (code.length < 4 || code.length > 20) {
    return false;
  }
  const pattern = /^[A-Za-z0-9-_]+$/;
  return pattern.test(code);
};

export default function JoinCompetitionScreen({ navigation }: Props) {
  const colors = useThemeColors();
  const { user, player } = useAuth();
  const playerId = user?.id ?? '';
  const { checkAndAward, isReady: isAchievementReady } = useCheckAchievements(playerId);
  const { showMultipleToasts } = useAchievementToast();

  // State
  const [inviteCode, setInviteCode] = useState('');
  const [competition, setCompetition] = useState<CompetitionPreview | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false); // Specific state for "no competition found"

  // Navigation handlers
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Format invite code as user types (auto-uppercase, filter invalid chars)
  const handleInviteCodeChange = useCallback((text: string) => {
    // Clear previous lookup state when code changes
    if (competition || notFound) {
      setCompetition(null);
      setNotFound(false);
    }
    setLookupError(null);
    setJoinError(null);

    // Auto-format: uppercase and remove invalid characters
    // Only allow letters, numbers, hyphens, and underscores (matching creation schema)
    const formatted = text.toUpperCase().replace(/[^A-Z0-9-_]/g, '');

    // Limit to 20 characters (max allowed by schema)
    if (formatted.length <= 20) {
      setInviteCode(formatted);
    }
  }, [competition, notFound]);

  // Look up competition by invite code
  const handleLookup = useCallback(async () => {
    const trimmedCode = inviteCode.trim().toUpperCase();

    // Validate format
    if (!validateInviteCode(trimmedCode)) {
      setLookupError('Invite code must be 4-20 characters (letters, numbers, hyphens, underscores)');
      return;
    }

    setIsLookingUp(true);
    setLookupError(null);
    setNotFound(false);
    setCompetition(null);

    try {
      // Fetch competition by invite code (exclude soft-deleted)
      const { data: competitionData, error: competitionError } = await supabase
        .from('competitions')
        .select(`
          id,
          name,
          description,
          start_date,
          end_date,
          handicap_system,
          status,
          organizer_id,
          players:competition_players(count)
        `)
        .eq('invite_code', trimmedCode)
        .is('deleted_at', null)
        .single();

      if (competitionError) {
        console.error('Competition lookup error:', {
          code: competitionError.code,
          message: competitionError.message,
          details: competitionError.details,
          hint: competitionError.hint,
          inviteCode: trimmedCode,
        });

        if (competitionError.code === 'PGRST116') {
          // No competition found - show dedicated "not found" UI
          setNotFound(true);
        } else {
          // Other errors - show error message
          setLookupError('Unable to look up competition. Please try again.');
        }
        return;
      }

      // Define the shape of the query result for organizer lookup
      type CompetitionLookupResult = {
        id: string;
        name: string;
        description: string | null;
        start_date: string;
        end_date: string | null;
        handicap_system: HandicapSystem;
        status: CompetitionStatus;
        organizer_id: string;
        players: { count: number }[];
      };

      const compLookup = competitionData as CompetitionLookupResult;

      // Fetch organizer name
      const { data: organizerData } = await supabase
        .from('players')
        .select('name')
        .eq('id', compLookup.organizer_id)
        .single();

      // Check if user is already a member
      if (user?.id) {
        const { data: existingMembership } = await supabase
          .from('competition_players')
          .select('player_id')
          .eq('competition_id', compLookup.id)
          .eq('player_id', user.id)
          .single();

        if (existingMembership) {
          setLookupError('You have already joined this competition.');
          return;
        }
      }

      // Set competition preview
      setCompetition({
        id: compLookup.id,
        name: compLookup.name,
        description: compLookup.description,
        startDate: compLookup.start_date,
        endDate: compLookup.end_date,
        organizerName: (organizerData as { name: string } | null)?.name ?? 'Unknown',
        playerCount: compLookup.players?.[0]?.count ?? 0,
        handicapSystem: compLookup.handicap_system,
        status: compLookup.status,
      });
    } catch (err) {
      console.error('Error looking up competition:', err);
      setLookupError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLookingUp(false);
    }
  }, [inviteCode, user?.id]);

  // Join the competition
  const handleJoin = useCallback(async () => {
    if (!competition || !user?.id || !player) {
      setJoinError('Unable to join. Please make sure you are logged in.');
      return;
    }

    // Check if competition is joinable
    if (competition.status === 'completed' || competition.status === 'cancelled') {
      setJoinError(`This competition is ${competition.status} and cannot be joined.`);
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    try {
      // Add player to competition
      const { error: insertError } = await supabase
        .from('competition_players')
        .insert({
          competition_id: competition.id,
          player_id: user.id,
          status: 'accepted' as InvitationStatus,
          invited_at: new Date().toISOString(),
          responded_at: new Date().toISOString(),
        } as unknown as never);

      if (insertError) {
        if (insertError.code === '23505') {
          // Unique constraint violation - already a member
          setJoinError('You have already joined this competition.');
        } else {
          setJoinError('Unable to join competition. Please try again.');
          console.error('Join competition error:', insertError);
        }
        return;
      }

      // Check for competition-related achievements
      if (playerId && isAchievementReady) {
        try {
          // Get the count of competitions the player is in
          const { count } = await supabase
            .from('competition_players')
            .select('*', { count: 'exact', head: true })
            .eq('player_id', playerId)
            .eq('status', 'accepted');

          const competitionCount = count ?? 0;

          const result = await checkAndAward('competition_joined', {
            competition_count: competitionCount,
            competition_id: competition.id,
          });

          if (result.hasNewRewards) {
            showMultipleToasts(result.newAchievements, result.newCosmetics);
          }
        } catch {
          // Don't fail the join if achievement check fails
        }
      }

      // Navigate to competition detail screen
      navigation.replace('CompetitionDetail', { id: competition.id });
    } catch (err) {
      console.error('Error joining competition:', err);
      setJoinError('An unexpected error occurred. Please try again.');
    } finally {
      setIsJoining(false);
    }
  }, [competition, user?.id, player, navigation, playerId, isAchievementReady, checkAndAward, showMultipleToasts]);

  // Check if lookup button should be enabled (min 4 chars per schema)
  const canLookup = inviteCode.length >= 4 && !isLookingUp;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <PageHeader
          title="Join Competition"
          showBack
          onBack={handleGoBack}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Invite Code Input */}
          <View style={styles.inputSection}>
            <FormInput
              label="Invite Code"
              floatingLabel
              placeholder="Enter invite code"
              value={inviteCode}
              onChangeText={handleInviteCodeChange}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
              error={lookupError || undefined}
              accessibilityHint="Enter the competition invite code shared by the organiser"
            />

            <TouchableOpacity
              onPress={handleLookup}
              disabled={!canLookup}
              style={[
                styles.lookupButton,
                styles.buttonContent,
                { backgroundColor: colors.primary },
                !canLookup && styles.buttonDisabled,
              ]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Look up competition"
              accessibilityHint="Looks up the competition with the entered invite code"
            >
              {isLookingUp && <ActivityIndicator size="small" color={colors.white} />}
              <Text style={[styles.buttonLabel, { color: colors.white }]}>
                {isLookingUp ? 'Looking up...' : 'Look Up'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Competition Preview Card */}
          {competition && (
            <View style={styles.previewSection}>
              <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Competition Found</Text>

              <Card style={[styles.competitionCard, { backgroundColor: colors.white }]} mode="elevated">
                <Card.Content>
                  {/* Status Badge */}
                  <View style={styles.statusRow}>
                    <StatusBadge status={getStatusVariant(competition.status)} />
                  </View>

                  {/* Competition Name */}
                  <Text style={[styles.competitionName, { color: colors.textPrimary }]}>{competition.name}</Text>

                  {/* Description (if available) */}
                  {competition.description && (
                    <Text style={[styles.competitionDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                      {competition.description}
                    </Text>
                  )}

                  {/* Details Grid */}
                  <View style={styles.detailsGrid}>
                    {/* Date */}
                    <View style={[styles.detailItem, { borderTopColor: colors.borderLight }]}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Date</Text>
                      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                        {formatDate(competition.startDate)}
                        {competition.endDate && competition.endDate !== competition.startDate && (
                          ` - ${formatDate(competition.endDate)}`
                        )}
                      </Text>
                    </View>

                    {/* Organizer */}
                    <View style={[styles.detailItem, { borderTopColor: colors.borderLight }]}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Organiser</Text>
                      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{competition.organizerName}</Text>
                    </View>

                    {/* Players */}
                    <View style={[styles.detailItem, { borderTopColor: colors.borderLight }]}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Players</Text>
                      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                        {competition.playerCount} {competition.playerCount === 1 ? 'player' : 'players'}
                      </Text>
                    </View>

                    {/* Handicap System */}
                    <View style={[styles.detailItem, { borderTopColor: colors.borderLight }]}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Handicap</Text>
                      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                        {getHandicapSystemLabel(competition.handicapSystem)}
                      </Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>

              {/* Join Error */}
              {joinError && (
                <Text style={[styles.joinError, { color: colors.error }]}>
                  {joinError}
                </Text>
              )}

              {/* Join Button */}
              <TouchableOpacity
                onPress={handleJoin}
                disabled={isJoining || competition.status === 'completed' || competition.status === 'cancelled'}
                style={[
                  styles.joinButton,
                  styles.joinButtonContent,
                  { backgroundColor: colors.success },
                  (isJoining || competition.status === 'completed' || competition.status === 'cancelled') && styles.buttonDisabled,
                ]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Join competition"
                accessibilityHint={`Join ${competition.name} competition`}
              >
                {isJoining && <ActivityIndicator size="small" color={colors.white} />}
                <Text style={[styles.buttonLabel, { color: colors.white }]}>
                  {isJoining ? 'Joining...' : 'Join Competition'}
                </Text>
              </TouchableOpacity>

              {/* Warning for non-joinable competitions */}
              {(competition.status === 'completed' || competition.status === 'cancelled') && (
                <Text style={[styles.warningText, { color: colors.warning }]}>
                  This competition is {competition.status} and cannot be joined.
                </Text>
              )}
            </View>
          )}

          {/* Not Found State - shown when invite code doesn't match any competition */}
          {notFound && (
            <View style={styles.notFoundState}>
              <View style={[styles.notFoundIconContainer, { backgroundColor: colors.warningLight }]}>
                <IconSearch size={48} color={colors.warning} />
              </View>
              <Text style={[styles.notFoundTitle, { color: colors.textPrimary }]}>
                No Competition Found
              </Text>
              <Text style={[styles.notFoundCode, { color: colors.textSecondary }]}>
                &quot;{inviteCode}&quot;
              </Text>
              <Text style={[styles.notFoundMessage, { color: colors.textSecondary }]}>
                We couldn&apos;t find a competition with this invite code. Please double-check the code and try again.
              </Text>
              <View style={[styles.notFoundHints, { backgroundColor: colors.surface }]}>
                <Text style={[styles.notFoundHintTitle, { color: colors.textPrimary }]}>
                  Tips:
                </Text>
                <Text style={[styles.notFoundHintItem, { color: colors.textSecondary }]}>
                  {'\u2022'} Check for typos in the code
                </Text>
                <Text style={[styles.notFoundHintItem, { color: colors.textSecondary }]}>
                  {'\u2022'} Ask the organiser to confirm the code
                </Text>
                <Text style={[styles.notFoundHintItem, { color: colors.textSecondary }]}>
                  {'\u2022'} The competition may have ended
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },

  // Input Section
  inputSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  lookupButton: {
    marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    gap: spacing.sm,
  },
  buttonLabel: {
    ...typography.bodyBold,
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Preview Section
  previewSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  divider: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },

  // Competition Card
  competitionCard: {
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  competitionName: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  competitionDescription: {
    ...typography.body,
    marginBottom: spacing.lg,
  },

  // Details Grid
  detailsGrid: {
    marginTop: spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  detailLabel: {
    ...typography.small,
  },
  detailValue: {
    ...typography.smallBold,
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },

  // Join Button
  joinButton: {
    marginTop: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  joinButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    gap: spacing.sm,
  },
  joinError: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
  warningText: {
    ...typography.small,
    textAlign: 'center',
    marginTop: spacing.md,
  },

  // Not Found State
  notFoundState: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  notFoundIconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  notFoundTitle: {
    ...typography.h3,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  notFoundCode: {
    ...typography.bodyBold,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  notFoundMessage: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  notFoundHints: {
    width: '100%',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  notFoundHintTitle: {
    ...typography.smallBold,
    marginBottom: spacing.sm,
  },
  notFoundHintItem: {
    ...typography.small,
    marginBottom: spacing.xs,
    paddingLeft: spacing.xs,
  },
});
