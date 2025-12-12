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

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import {
  Text,
  TextInput,
  Icon,
  Divider,
} from 'react-native-paper';
import { LoadingSpinner } from '@/components/common';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useIsPremium, useSubscriptionContext } from '@/context/SubscriptionContext';
import { roundKeys, scoringPairsKeys } from '@/hooks/queryKeys';
import { RoundGameTypeSelector } from '@/components/competitionWizard/create';
import type { GameType, TeeBox } from '@/types/database.types';

import { TeeSelector } from './components';
import { fetchRoundWithCourse, updateRound, shuffleScoringPairs } from './hooks';
import {
  parseAustralianDate,
  formatAustralianDate,
  formatTime,
  parseTime,
  parseISODate,
} from './utils';
import type { RoundFormData } from './types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditRound'>;

export default function EditRoundScreen({ navigation, route }: Props) {
  const { roundId, competitionId } = route.params;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const colors = useThemeColors();
  const isPremium = useIsPremium();
  const { limits } = useSubscriptionContext();

  // Form state
  const [formData, setFormData] = useState<RoundFormData>({
    date: '',
    teeTime: '',
    gameType: 'stableford',
    selectedTee: null,
    scoringPairsRequired: false,
  });

  // Original values for dirty check
  const [originalData, setOriginalData] = useState<RoundFormData | null>(null);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

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

  // Populate form when data loads
  useEffect(() => {
    if (round) {
      const parsedDate = parseISODate(round.date);
      const data: RoundFormData = {
        date: parsedDate ? formatAustralianDate(parsedDate) : '',
        teeTime: round.tee_time || '',
        gameType: round.game_type,
        selectedTee: round.selected_tee,
        scoringPairsRequired: round.scoring_pairs_required,
      };
      setFormData(data);
      setOriginalData(data);
    }
  }, [round]);

  // Check if form is dirty
  const isDirty = useMemo(() => {
    if (!originalData) return false;
    return (
      formData.date !== originalData.date ||
      formData.teeTime !== originalData.teeTime ||
      formData.gameType !== originalData.gameType ||
      formData.selectedTee?.name !== originalData.selectedTee?.name ||
      formData.scoringPairsRequired !== originalData.scoringPairsRequired
    );
  }, [formData, originalData]);

  // Get available tees from course
  const availableTees = useMemo(() => {
    return round?.courses?.tees || [];
  }, [round?.courses?.tees]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const parsedDate = parseAustralianDate(formData.date);
      if (!parsedDate) {
        throw new Error('Invalid date format');
      }

      await updateRound(roundId, {
        date: format(parsedDate, 'yyyy-MM-dd'),
        tee_time: formData.teeTime || null,
        game_type: formData.gameType,
        selected_tee: formData.selectedTee,
        scoring_pairs_required: formData.scoringPairsRequired,
      });
    },
    onSuccess: () => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
      if (competitionId) {
        queryClient.invalidateQueries({ queryKey: ['competition', competitionId, 'details'] });
      }
      navigation.goBack();
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to update round');
    },
  });

  // Shuffle scoring pairs mutation
  const shuffleMutation = useMutation({
    mutationFn: () => shuffleScoringPairs(roundId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scoringPairsKeys.list(roundId) });
      Alert.alert(
        'Scoring Pairs Shuffled',
        'Existing scoring pairs have been cleared. New pairs will be auto-generated when players view the round.',
        [{ text: 'OK' }]
      );
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to shuffle scoring pairs');
    },
  });

  // Handlers
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

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'set' && date) {
      setFormData((prev) => ({ ...prev, date: formatAustralianDate(date) }));
    }
  };

  const handleDatePickerDismiss = () => {
    setShowDatePicker(false);
  };

  const handleTimeChange = (event: DateTimePickerEvent, time?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (event.type === 'set' && time) {
      setFormData((prev) => ({ ...prev, teeTime: formatTime(time) }));
    }
  };

  const handleTimePickerDismiss = () => {
    setShowTimePicker(false);
  };

  const clearTeeTime = () => {
    setFormData((prev) => ({ ...prev, teeTime: '' }));
  };

  const handleGameTypeChange = useCallback((gameType: GameType) => {
    setFormData((prev) => ({ ...prev, gameType }));
  }, []);

  const handleTeeSelect = useCallback((tee: TeeBox) => {
    setFormData((prev) => ({ ...prev, selectedTee: tee }));
  }, []);

  const handleScoringPairsToggle = useCallback((value: boolean) => {
    setFormData((prev) => ({ ...prev, scoringPairsRequired: value }));
  }, []);

  const handleShuffleScoringPairs = useCallback(() => {
    Alert.alert(
      'Shuffle Scoring Pairs',
      'This will clear all existing scoring pairs and generate new random ones. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Shuffle',
          style: 'destructive',
          onPress: () => shuffleMutation.mutate(),
        },
      ]
    );
  }, [shuffleMutation]);

  const handleSubmit = useCallback(() => {
    if (!formData.date) {
      Alert.alert('Error', 'Please select a date');
      return;
    }
    updateMutation.mutate();
  }, [formData.date, updateMutation]);

  // Get selected date for picker
  const getSelectedDate = () => {
    if (formData.date) {
      return parseAustralianDate(formData.date) || new Date();
    }
    return new Date();
  };

  // Get selected time for picker
  const getSelectedTime = () => {
    if (formData.teeTime) {
      return parseTime(formData.teeTime) || new Date();
    }
    return new Date();
  };

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
        <View style={[styles.courseInfoSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.courseInfoRow}>
            <View style={[styles.courseIcon, { backgroundColor: colors.primaryLighter }]}>
              <Icon source="golf" size={24} color={colors.primary} />
            </View>
            <View style={styles.courseDetails}>
              <Text style={[styles.courseLabel, { color: colors.textSecondary }]}>Course</Text>
              <Text style={[styles.courseName, { color: colors.textPrimary }]}>
                {round.courses?.name || 'Unknown Course'}
              </Text>
            </View>
          </View>
        </View>

        {/* Form Section */}
        <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Date Selection */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Date *</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
              <TextInput
                mode="outlined"
                value={formData.date}
                placeholder="Select a date"
                editable={false}
                pointerEvents="none"
                style={[styles.input, { backgroundColor: colors.surface }]}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.textPrimary}
                placeholderTextColor={colors.textTertiary}
                right={
                  <TextInput.Icon
                    icon="calendar"
                    onPress={() => setShowDatePicker(true)}
                    color={colors.primary}
                  />
                }
              />
            </TouchableOpacity>

            {/* Date Picker */}
            {showDatePicker &&
              (Platform.OS === 'ios' ? (
                <View
                  style={[styles.datePickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={[styles.datePickerHeader, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={handleDatePickerDismiss} style={styles.doneButton}>
                      <Text style={[styles.doneButtonText, { color: colors.primary }]}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={getSelectedDate()}
                    mode="date"
                    display="spinner"
                    onChange={handleDateChange}
                  />
                </View>
              ) : (
                <DateTimePicker
                  value={getSelectedDate()}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                />
              ))}
          </View>

          {/* Tee Time (Optional) */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Tee Time (Optional)</Text>
            <TouchableOpacity onPress={() => setShowTimePicker(true)} activeOpacity={0.7}>
              <TextInput
                mode="outlined"
                value={formData.teeTime}
                placeholder="Select tee time"
                editable={false}
                pointerEvents="none"
                style={[styles.input, { backgroundColor: colors.surface }]}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.textPrimary}
                placeholderTextColor={colors.textTertiary}
                right={
                  formData.teeTime ? (
                    <TextInput.Icon icon="close" onPress={clearTeeTime} color={colors.textTertiary} />
                  ) : (
                    <TextInput.Icon
                      icon="clock-outline"
                      onPress={() => setShowTimePicker(true)}
                      color={colors.primary}
                    />
                  )
                }
              />
            </TouchableOpacity>

            {/* Time Picker */}
            {showTimePicker &&
              (Platform.OS === 'ios' ? (
                <View
                  style={[styles.datePickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={[styles.datePickerHeader, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={handleTimePickerDismiss} style={styles.doneButton}>
                      <Text style={[styles.doneButtonText, { color: colors.primary }]}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={getSelectedTime()}
                    mode="time"
                    display="spinner"
                    onChange={handleTimeChange}
                    minuteInterval={5}
                  />
                </View>
              ) : (
                <DateTimePicker
                  value={getSelectedTime()}
                  mode="time"
                  display="default"
                  onChange={handleTimeChange}
                  minuteInterval={5}
                />
              ))}
          </View>

          {/* Game Type Selection */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Format *</Text>
            <RoundGameTypeSelector
              value={formData.gameType}
              onChange={handleGameTypeChange}
              disabled={updateMutation.isPending}
              allowedGameTypes={limits?.allowedGameTypes}
              onUpgradePress={() => navigation.navigate('Subscription')}
            />
          </View>

          {/* Tee Selection */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Tee</Text>
            <TeeSelector
              tees={availableTees}
              selectedTee={formData.selectedTee}
              onSelect={handleTeeSelect}
              disabled={updateMutation.isPending}
            />
          </View>
        </View>

        {/* Scoring Pairs Section - Premium Only */}
        <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Scoring Pairs</Text>

          {isPremium ? (
            <>
              {/* Toggle */}
              <View style={styles.toggleContainer}>
                <View style={styles.toggleContent}>
                  <View style={[styles.toggleIcon, { backgroundColor: colors.primaryLighter }]}>
                    <Icon source="account-switch" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.toggleTextContainer}>
                    <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                      Require Scoring Pairs
                    </Text>
                    <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
                      Specify which players score each other
                    </Text>
                  </View>
                </View>
                <Switch
                  value={formData.scoringPairsRequired}
                  onValueChange={handleScoringPairsToggle}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={formData.scoringPairsRequired ? colors.primary : colors.surfaceVariant}
                  disabled={updateMutation.isPending}
                />
              </View>

              {/* Shuffle Button - Only show if scoring pairs are enabled */}
              {formData.scoringPairsRequired && (
                <>
                  <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
                  <TouchableOpacity
                    style={[styles.shuffleButton, { borderColor: colors.border }]}
                    onPress={handleShuffleScoringPairs}
                    disabled={shuffleMutation.isPending}
                    activeOpacity={0.7}
                  >
                    <Icon
                      source="shuffle-variant"
                      size={20}
                      color={shuffleMutation.isPending ? colors.textDisabled : colors.primary}
                    />
                    <Text
                      style={[
                        styles.shuffleButtonText,
                        { color: shuffleMutation.isPending ? colors.textDisabled : colors.primary },
                      ]}
                    >
                      {shuffleMutation.isPending ? 'Shuffling...' : 'Shuffle Scoring Pairs'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.shuffleHint, { color: colors.textSecondary }]}>
                    Clear existing pairs and generate new random assignments
                  </Text>
                </>
              )}
            </>
          ) : (
            // Locked for non-premium
            <TouchableOpacity
              style={styles.lockedContainer}
              onPress={() => navigation.navigate('Subscription')}
              activeOpacity={0.7}
            >
              <View style={styles.toggleContent}>
                <View style={[styles.toggleIcon, { backgroundColor: colors.surfaceVariant }]}>
                  <Icon source="lock" size={24} color={colors.textSecondary} />
                </View>
                <View style={styles.toggleTextContainer}>
                  <View style={styles.lockedLabelRow}>
                    <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>
                      Require Scoring Pairs
                    </Text>
                    <View style={[styles.premiumBadge, { backgroundColor: colors.warning }]}>
                      <Text style={[styles.premiumBadgeText, { color: colors.textOnColored }]}>Premium</Text>
                    </View>
                  </View>
                  <Text style={[styles.toggleDescription, { color: colors.textTertiary }]}>
                    Upgrade to Premium to assign designated markers
                  </Text>
                </View>
              </View>
              <Icon source="chevron-right" size={24} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
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
            updateMutation.isPending && styles.buttonDisabled,
          ]}
          disabled={updateMutation.isPending}
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
            (updateMutation.isPending || !isDirty) && { backgroundColor: colors.surfaceVariant },
          ]}
          disabled={updateMutation.isPending || !isDirty}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Save Changes"
          accessibilityState={{ disabled: updateMutation.isPending || !isDirty }}
        >
          {updateMutation.isPending ? (
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
    height: 56, // Match BottomSheet HEADER_HEIGHT for consistency
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

  // Course Info Section
  courseInfoSection: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    ...shadows.sm,
  },
  courseInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseDetails: {
    flex: 1,
    marginLeft: spacing.md,
  },
  courseLabel: {
    ...typography.caption,
  },
  courseName: {
    ...typography.bodyBold,
    marginTop: 2,
  },

  // Form Section
  formSection: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    ...shadows.sm,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.smallBold,
    marginBottom: spacing.xs,
  },
  input: {},
  datePickerContainer: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    ...shadows.sm,
  },
  doneButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  doneButtonText: {
    ...typography.bodyBold,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    borderBottomWidth: 1,
  },

  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  toggleIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    ...typography.bodyBold,
  },
  toggleDescription: {
    ...typography.small,
    marginTop: 2,
  },

  // Locked state
  lockedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lockedLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  premiumBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  premiumBadgeText: {
    ...typography.caption,
    fontWeight: '600',
  },

  // Shuffle button
  divider: {
    marginVertical: spacing.md,
  },
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  shuffleButtonText: {
    ...typography.bodyBold,
  },
  shuffleHint: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // Footer
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
