/**
 * EditRoundScreen - Edit round details
 *
 * @deprecated No longer reachable from ViewRoundScreen — round editing
 * now happens via per-field bottom sheets on the Round Details card
 * (see `src/components/rounds/ViewRound/RoundDetailsTab/sheets/`).
 * Route is kept registered as a fallback while we verify nothing else
 * relies on it; slated for removal in a follow-up PR.
 *
 * Allows organizers to edit:
 * - Course (can add course to blank rounds)
 * - Date
 * - Tee time
 * - Game type (format)
 * - Selected tee
 * - Scoring pairs required (premium only)
 * - Shuffle scoring pairs (if enabled and premium)
 * - Skins game configuration (premium only)
 */

import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { ConfirmationDialog, ErrorState, FormSection, PageHeader } from '@/components/common';
import { useConfirmationDialog } from '@/hooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Text } from 'react-native-paper';
import { LoadingSpinner } from '@/components/common';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { useAuth } from '@/hooks/useAuth';
import { useRoundDetails } from '@/hooks/useRoundDetails';
import { useActiveSkinsGameForRound } from '@/hooks/useSkins';
import { useWolfGameByRound } from '@/hooks/wolf';
import type { CourseWithFavoriteStatus } from '@/hooks/useClubs';
import type { Club } from '@/types/database.types';
import { supabase } from '@/services/supabase/client';

// Local imports
import {
  useEditRoundForm,
  useRoundSubmission,
} from './hooks';
import {
  CourseSection,
  DateTimeSection,
  GameTypeSection,
  TeesSection,
  ScoringPairsSection,
} from './components';
import { CourseSelectionModal } from '../AddRoundScreen/components';
import { SkinsSection } from '@/components/skins';
import { WolfSection } from '@/components/wolf';

type Props = NativeStackScreenProps<RootStackParamList, 'EditRound'>;

export default function EditRoundScreen({ navigation, route }: Props) {
  const { roundId, competitionId } = route.params;
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { limits } = useSubscriptionContext();
  const { user } = useAuth();

  // Confirmation dialog state
  const { dialogConfig, showDialog, dismissDialog } = useConfirmationDialog();

  // Course selection modal state
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');

  // Fetch round data (shared hook ensures consistent cache shape with ViewRoundScreen)
  const {
    data: round,
    isLoading,
    error: fetchError,
  } = useRoundDetails(roundId);

  // Fetch existing skins game for this round
  const { data: activeSkinsGame, isLoading: isLoadingSkins } = useActiveSkinsGameForRound(roundId);

  // Fetch existing Wolf game for this round
  const { data: activeWolfGame, isLoading: isLoadingWolf } = useWolfGameByRound(roundId);

  // Prepare existing skins game data for the form
  const existingSkinsGame = useMemo(() => {
    if (!activeSkinsGame) return null;
    return {
      id: activeSkinsGame.id,
      pot_type: activeSkinsGame.pot_type,
      pot_value: activeSkinsGame.pot_value,
      currency: activeSkinsGame.currency,
      scoring_type: activeSkinsGame.scoring_type,
    };
  }, [activeSkinsGame]);

  // Prepare existing Wolf game data for the form
  const existingWolfGame = useMemo(() => {
    if (!activeWolfGame) return null;
    return {
      id: activeWolfGame.id,
      scoring_type: activeWolfGame.scoring_type,
      blind_wolf_enabled: activeWolfGame.blind_wolf_enabled,
      pot_enabled: activeWolfGame.pot_enabled,
      pot_value_per_point: activeWolfGame.pot_value_per_point,
      currency: activeWolfGame.currency,
      wolf_order: activeWolfGame.wolf_order ?? [],
    };
  }, [activeWolfGame]);

  // Fetch competition players for skins participant IDs
  const { data: competitionPlayers } = useQuery({
    queryKey: ['competition', competitionId, 'players'],
    queryFn: async (): Promise<string[]> => {
      if (!competitionId) return [];
      const { data, error } = await supabase
        .from('competition_players')
        .select('player_id')
        .eq('competition_id', competitionId);
      if (error) {
        console.error('[EditRoundScreen] Failed to fetch competition players:', error);
        return [];
      }
      return (data as { player_id: string }[]).map((p) => p.player_id);
    },
    enabled: !!competitionId,
    staleTime: 5 * 60 * 1000,
  });

  // Form state management
  const {
    formData,
    isDirty,
    availableTees,
    skinsEditState,
    wolfEditState,
    setDate,
    setTeeTime,
    clearTeeTime,
    setGameType,
    setSelectedTee,
    setScoringPairsRequired,
    setCourse,
    setSkinsEnabled,
    setSkinsConfig,
    setWolfEnabled,
    setWolfConfig,
    getSelectedDate,
    getSelectedTime,
  } = useEditRoundForm({ round, competitionId, existingSkinsGame, existingWolfGame });

  // Submission handling
  const {
    handleSubmit,
    handleShuffleScoringPairs,
    isSubmitting,
    isShuffling,
    dialogConfig: submissionDialogConfig,
    dismissDialog: dismissSubmissionDialog,
  } = useRoundSubmission({
    roundId,
    competitionId,
    formData,
    skinsEditState,
    wolfEditState,
    userId: user?.id,
    participantIds: competitionPlayers ?? [],
    onSuccess: () => navigation.goBack(),
  });

  // Navigation handlers
  const handleBack = useCallback(() => {
    if (isDirty) {
      showDialog({
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Are you sure you want to leave?',
        confirmLabel: 'Leave',
        confirmVariant: 'destructive',
        icon: 'alert-outline',
        onConfirm: () => {
          dismissDialog();
          navigation.goBack();
        },
      });
    } else {
      navigation.goBack();
    }
  }, [navigation, isDirty, showDialog, dismissDialog]);

  const handleUpgradePress = useCallback(() => {
    navigation.navigate('Subscription');
  }, [navigation]);

  // Course selection handler
  const handleCourseSelect = useCallback(
    (course: CourseWithFavoriteStatus, _club: Club) => {
      setCourse(course);
      setShowCourseModal(false);
      setCourseSearchQuery('');
    },
    [setCourse]
  );

  // Loading state
  if (isLoading || isLoadingSkins || isLoadingWolf) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }, styles.centerContent]}>
        <LoadingSpinner size="lg" message="Loading round..." />
      </View>
    );
  }

  // Error state
  if (fetchError || !round) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ErrorState
          error={fetchError?.message || 'Round not found'}
          title="Unable to load round"
          onRetry={() => navigation.goBack()}
          retryLabel="Go Back"
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <PageHeader
        title="Edit Round"
        variant="centered"
        showBack
        onBack={handleBack}
        backIcon="close"
        skipTopInset
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Description */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Update round details below. Changes will apply to all players.
        </Text>

        {/* Course Selection */}
        <CourseSection
          courseName={formData.courseName}
          onPress={() => setShowCourseModal(true)}
          disabled={isSubmitting}
        />

        {/* Form Section */}
        <FormSection style={{ borderWidth: 1, borderColor: colors.border }}>
          <DateTimeSection
            date={formData.date}
            teeTime={formData.teeTime}
            onDateChange={setDate}
            onTeeTimeChange={setTeeTime}
            onClearTeeTime={clearTeeTime}
            getSelectedDate={getSelectedDate}
            getSelectedTime={getSelectedTime}
            disabled={isSubmitting}
          />

          <GameTypeSection
            value={formData.gameType}
            onChange={setGameType}
            disabled={isSubmitting}
            allowedGameTypes={limits?.allowedGameTypes}
            onUpgradePress={handleUpgradePress}
          />

          <TeesSection
            tees={availableTees}
            selectedTee={formData.selectedTee}
            onSelectTee={setSelectedTee}
            disabled={isSubmitting}
          />
        </FormSection>

        {/* Scoring Pairs Section */}
        <ScoringPairsSection
          scoringPairsRequired={formData.scoringPairsRequired}
          onToggle={setScoringPairsRequired}
          onShuffle={handleShuffleScoringPairs}
          onUpgradePress={handleUpgradePress}
          isSubmitting={isSubmitting}
          isShuffling={isShuffling}
        />

        {/* Skins Game Section - Only for competition rounds */}
        {competitionId && (
          <FormSection style={{ borderWidth: 1, borderColor: colors.border }}>
            <SkinsSection
              skinsEnabled={formData.skinsEnabled}
              skinsConfig={formData.skinsConfig}
              editState={skinsEditState}
              onSkinsEnabledChange={setSkinsEnabled}
              onSkinsConfigChange={setSkinsConfig}
              onUpgradePress={handleUpgradePress}
              disabled={isSubmitting}
            />

            {/* Wolf Game Section (3-4 players only, not team rounds) */}
            {!round?.is_team_round && (
              <WolfSection
                wolfEnabled={formData.wolfEnabled}
                wolfConfig={formData.wolfConfig}
                editState={wolfEditState}
                onWolfEnabledChange={setWolfEnabled}
                onWolfConfigChange={setWolfConfig}
                onUpgradePress={handleUpgradePress}
                disabled={isSubmitting}
                participantCount={competitionPlayers?.length ?? 0}
              />
            )}
          </FormSection>
        )}
      </ScrollView>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + spacing.md,
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleBack}
          style={[
            styles.cancelButton,
            { borderColor: colors.border },
            isSubmitting && styles.buttonDisabled,
          ]}
          disabled={isSubmitting}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
            Cancel
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSubmit}
          style={[
            styles.saveButton,
            { backgroundColor: colors.primary },
            (isSubmitting || !isDirty) && { backgroundColor: colors.surfaceVariant },
          ]}
          disabled={isSubmitting || !isDirty}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Save Changes"
          accessibilityState={{ disabled: isSubmitting || !isDirty }}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.textOnColored} size="small" />
          ) : (
            <Text
              style={[
                styles.saveButtonText,
                { color: !isDirty ? colors.textDisabled : colors.textOnColored },
              ]}
            >
              Save Changes
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Course Selection Modal */}
      <CourseSelectionModal
        visible={showCourseModal}
        onClose={() => {
          setShowCourseModal(false);
          setCourseSearchQuery('');
        }}
        onSelect={handleCourseSelect}
        searchQuery={courseSearchQuery}
        onSearchQueryChange={setCourseSearchQuery}
      />

      {/* Confirmation Dialog - Unsaved changes */}
      <ConfirmationDialog {...dialogConfig} onCancel={dismissDialog} />

      {/* Confirmation Dialog - Submission/shuffle dialogs */}
      <ConfirmationDialog {...submissionDialogConfig} onCancel={dismissSubmissionDialog} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  description: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.bodyBold,
  },
  saveButton: {
    flex: 2,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    ...typography.bodyBold,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
