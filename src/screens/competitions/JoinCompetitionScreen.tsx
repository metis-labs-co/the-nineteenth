/**
 * JoinCompetitionScreen - Join a competition via invite code
 *
 * Features:
 * - Dedicated screen for joining competitions (not inline on home)
 * - Input field for invite code with validation (COMP-XXXXX format)
 * - Competition preview card on valid code (name, dates, organizer, player count)
 * - Join button adds player to competition and navigates to dashboard
 * - Loading, error, and empty states
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
} from 'react-native';
import { Button, Card, Divider } from 'react-native-paper';
import { IconSearch } from '@tabler/icons-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/hooks/useAuth';
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
      return 'Honor System';
    case 'golf-australia':
      return 'Golf Australia';
    case 'gross-only':
      return 'Gross Only';
    default:
      return system;
  }
};

/** Map competition status to StatusVariant */
const getStatusVariant = (status: string): StatusVariant => {
  // 'in-progress' competitions show as 'active' in the badge
  if (status === 'in-progress') return 'active';
  return status as StatusVariant;
};

/** Validate invite code format (COMP-XXXXX) */
const validateInviteCode = (code: string): boolean => {
  const pattern = /^COMP-\d{5}$/;
  return pattern.test(code.toUpperCase());
};

export default function JoinCompetitionScreen({ navigation }: Props) {
  const colors = useThemeColors();
  const { user, player } = useAuth();

  // State
  const [inviteCode, setInviteCode] = useState('');
  const [competition, setCompetition] = useState<CompetitionPreview | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [hasLookedUp, setHasLookedUp] = useState(false);

  // Navigation handlers
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Format invite code as user types (auto-uppercase, auto-add dash)
  const handleInviteCodeChange = useCallback((text: string) => {
    // Clear previous lookup state when code changes
    if (competition) {
      setCompetition(null);
      setHasLookedUp(false);
    }
    setLookupError(null);
    setJoinError(null);

    // Auto-format: uppercase and add dash after COMP
    let formatted = text.toUpperCase();

    // If user types "COMP" followed by digits without dash, insert dash
    if (formatted.length > 4 && formatted.startsWith('COMP') && formatted[4] !== '-') {
      formatted = 'COMP-' + formatted.slice(4);
    }

    // Limit to 10 characters (COMP-XXXXX)
    if (formatted.length <= 10) {
      setInviteCode(formatted);
    }
  }, [competition]);

  // Look up competition by invite code
  const handleLookup = useCallback(async () => {
    const trimmedCode = inviteCode.trim().toUpperCase();

    // Validate format
    if (!validateInviteCode(trimmedCode)) {
      setLookupError('Invalid code format. Please enter a code like COMP-12345');
      return;
    }

    setIsLookingUp(true);
    setLookupError(null);
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
          setLookupError('No competition found with this invite code. Please check the code and try again.');
        } else {
          setLookupError('Unable to look up competition. Please try again.');
        }
        setHasLookedUp(true);
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
          setHasLookedUp(true);
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

      setHasLookedUp(true);
    } catch (err) {
      console.error('Error looking up competition:', err);
      setLookupError('An unexpected error occurred. Please try again.');
      setHasLookedUp(true);
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
      const { error: joinError } = await supabase
        .from('competition_players')
        .insert({
          competition_id: competition.id,
          player_id: user.id,
          status: 'accepted' as InvitationStatus,
          invited_at: new Date().toISOString(),
          responded_at: new Date().toISOString(),
        } as unknown as never);

      if (joinError) {
        if (joinError.code === '23505') {
          // Unique constraint violation - already a member
          setJoinError('You have already joined this competition.');
        } else {
          setJoinError('Unable to join competition. Please try again.');
          console.error('Join competition error:', joinError);
        }
        return;
      }

      // Navigate to competition detail screen
      navigation.replace('CompetitionDetail', { id: competition.id });
    } catch (err) {
      console.error('Error joining competition:', err);
      setJoinError('An unexpected error occurred. Please try again.');
    } finally {
      setIsJoining(false);
    }
  }, [competition, user?.id, player, navigation]);

  // Check if lookup button should be enabled
  const canLookup = inviteCode.length >= 10 && !isLookingUp;

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
              placeholder="COMP-12345"
              value={inviteCode}
              onChangeText={handleInviteCodeChange}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
              error={lookupError || undefined}
              accessibilityHint="Enter the competition invite code in format COMP-12345"
            />

            <Button
              mode="contained"
              onPress={handleLookup}
              disabled={!canLookup}
              loading={isLookingUp}
              style={[styles.lookupButton, { backgroundColor: colors.primary }]}
              contentStyle={styles.buttonContent}
              labelStyle={[styles.buttonLabel, { color: colors.white }]}
              accessibilityLabel="Look up competition"
              accessibilityHint="Looks up the competition with the entered invite code"
            >
              {isLookingUp ? 'Looking up...' : 'Look Up'}
            </Button>
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
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Organizer</Text>
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
              <Button
                mode="contained"
                onPress={handleJoin}
                disabled={isJoining || competition.status === 'completed' || competition.status === 'cancelled'}
                loading={isJoining}
                style={[styles.joinButton, { backgroundColor: colors.success }]}
                contentStyle={styles.joinButtonContent}
                labelStyle={[styles.buttonLabel, { color: colors.white }]}
                accessibilityLabel="Join competition"
                accessibilityHint={`Join ${competition.name} competition`}
              >
                {isJoining ? 'Joining...' : 'Join Competition'}
              </Button>

              {/* Warning for non-joinable competitions */}
              {(competition.status === 'completed' || competition.status === 'cancelled') && (
                <Text style={[styles.warningText, { color: colors.warning }]}>
                  This competition is {competition.status} and cannot be joined.
                </Text>
              )}
            </View>
          )}

          {/* Empty state after lookup with no results */}
          {hasLookedUp && !competition && !lookupError && (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconContainer, { backgroundColor: colors.gray200 }]}>
                <IconSearch size={48} color={colors.gray400} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Competition Found</Text>
              <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
                Please check the invite code and try again.
              </Text>
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
    height: 48,
  },
  buttonLabel: {
    ...typography.bodyBold,
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
    height: 52,
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

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
    paddingTop: spacing.huge,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyMessage: {
    ...typography.body,
    textAlign: 'center',
  },
});
