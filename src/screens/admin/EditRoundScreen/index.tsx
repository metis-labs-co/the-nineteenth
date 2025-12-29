/**
 * EditRoundScreen - Edit round details
 *
 * Allows organizers to edit:
 * - Date
 * - Tee time
 * - Game type (format)
 * - Selected tee
 * - Scoring pairs required (premium only)
 * - Shuffle scoring pairs (if enabled and premium)
 */

import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Text, Icon } from 'react-native-paper';
import { LoadingSpinner } from '@/components/common';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useIsPremium, useSubscriptionContext } from '@/context/SubscriptionContext';
import { roundKeys } from '@/hooks/queryKeys';

// Local imports
import {
  fetchRoundWithCourse,
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

type Props = NativeStackScreenProps<RootStackParamList, 'EditRound'>;

export default function EditRoundScreen({ navigation, route }: Props) {
  const { roundId, competitionId } = route.params;
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const isPremium = useIsPremium();
  const { limits } = useSubscriptionContext();

  // Fetch round data
  const {
    data: round,
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: roundKeys.detail(roundId),
    queryFn: () => fetchRoundWithCourse(roundId),
    enabled: !!roundId,
  });

  // Form state management
  const {
    formData,
    isDirty,
    availableTees,
    setDate,
    setTeeTime,
    clearTeeTime,
    setGameType,
    setSelectedTee,
    setScoringPairsRequired,
    getSelectedDate,
    getSelectedTime,
  } = useEditRoundForm({ round });

  // Submission handling
  const {
    handleSubmit,
    handleShuffleScoringPairs,
    isSubmitting,
    isShuffling,
  } = useRoundSubmission({
    roundId,
    competitionId,
    formData,
    onSuccess: () => navigation.goBack(),
  });

  // Navigation handlers
  const handleBack = useCallback(() => {
    if (isDirty) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  }, [navigation, isDirty]);

  const handleUpgradePress = useCallback(() => {
    navigation.navigate('Subscription');
  }, [navigation]);

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }, styles.centerContent]}>
        <LoadingSpinner size="lg" message="Loading round..." />
      </View>
    );
  }

  // Error state
  if (fetchError || !round) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }, styles.centerContent]}>
        <Icon source="alert-circle-outline" size={64} color={colors.error} />
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Unable to load round</Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
          {fetchError?.message || 'Round not found'}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.errorBackButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go Back"
        >
          <Text style={[styles.errorBackButtonText, { color: colors.textOnColored }]}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top, backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleBack}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <Icon source="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Edit Round</Text>
        <View style={styles.headerSpacer} />
      </View>

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

        {/* Course Info (Read-only) */}
        <CourseSection courseName={round.courses?.name || 'Unknown Course'} />

        {/* Form Section */}
        <View
          style={[
            styles.formSection,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
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
        </View>

        {/* Scoring Pairs Section */}
        <ScoringPairsSection
          isPremium={isPremium}
          scoringPairsRequired={formData.scoringPairsRequired}
          onToggle={setScoringPairsRequired}
          onShuffle={handleShuffleScoringPairs}
          onUpgradePress={handleUpgradePress}
          isSubmitting={isSubmitting}
          isShuffling={isShuffling}
        />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
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
  errorTitle: {
    ...typography.h3,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  errorBackButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  errorBackButtonText: {
    ...typography.bodyBold,
  },
  formSection: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    ...shadows.sm,
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
