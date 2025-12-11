/**
 * AddRoundScreen - Add a new round to an existing competition
 *
 * Allows organizers to add rounds with:
 * - Course selection
 * - Date selection
 * - Tee time (optional)
 * - Game type selection (Stableford, Stroke Play, Match Play)
 * - Team round configuration (if competition supports teams)
 * - Team format selection (Best Ball, Scramble, etc.)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Text,
  TextInput,
  Button,
  Surface,
  Icon,
} from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useIsPremium, useSubscriptionContext } from '@/context/SubscriptionContext';
import { useTeams } from '@/hooks/useTeams';
import { RoundGameTypeSelector } from '@/components/competitionWizard/create';

// Local imports
import { useAddRoundForm } from './hooks';
import {
  CourseSelectionModal,
  DateTimeFields,
  TeamRoundSection,
  ScoringPairsSection,
  ScoringPairsPromptModal,
} from './components';

type Props = NativeStackScreenProps<RootStackParamList, 'AddRound'>;

export default function AddRoundScreen({ navigation, route }: Props) {
  const { competitionId } = route.params;
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const isPremium = useIsPremium();
  const { limits } = useSubscriptionContext();

  // Modal state
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [showScoringPairsPrompt, setShowScoringPairsPrompt] = useState(false);
  const [createdRoundId, setCreatedRoundId] = useState<string | null>(null);

  // Fetch teams for team pairing preview
  const { data: teams = [] } = useTeams(competitionId);

  // Form hook
  const form = useAddRoundForm({
    competitionId,
    onSuccess: (roundId, scoringPairsRequired) => {
      if (scoringPairsRequired) {
        setCreatedRoundId(roundId);
        setShowScoringPairsPrompt(true);
      } else {
        navigation.goBack();
      }
    },
  });

  // Handle navigation
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Handle course selection
  const handleCourseSelect = useCallback(
    (course: any) => {
      form.handleCourseSelect(course);
      setShowCourseModal(false);
      setCourseSearchQuery('');
    },
    [form]
  );

  // Handle scoring pairs prompt responses
  const handleConfigureScoringPairsNow = useCallback(() => {
    setShowScoringPairsPrompt(false);
    if (createdRoundId) {
      navigation.replace('ScoringPairs', { roundId: createdRoundId, competitionId });
    }
  }, [createdRoundId, competitionId, navigation]);

  const handleConfigureScoringPairsLater = useCallback(() => {
    setShowScoringPairsPrompt(false);
    navigation.goBack();
  }, [navigation]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top, backgroundColor: colors.white, borderBottomColor: colors.gray200 },
        ]}
      >
        <Pressable
          style={styles.headerButton}
          onPress={handleBack}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <Icon source="close" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Add Round</Text>
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
          Add a new round to your competition. Select a course and date to get started.
        </Text>

        {/* Form Section */}
        <Surface style={[styles.formSection, { backgroundColor: colors.white }]} elevation={1}>
          {/* Course Selection */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Course *</Text>
            <Pressable onPress={() => setShowCourseModal(true)}>
              <TextInput
                mode="outlined"
                value={form.formData.courseName}
                placeholder="Select a course"
                editable={false}
                pointerEvents="none"
                error={!!form.errors.course}
                style={[styles.input, { backgroundColor: colors.white }]}
                outlineColor={form.errors.course ? colors.error : colors.gray300}
                activeOutlineColor={form.errors.course ? colors.error : colors.primary}
                right={
                  <TextInput.Icon
                    icon="chevron-down"
                    onPress={() => setShowCourseModal(true)}
                    color={colors.gray400}
                  />
                }
              />
            </Pressable>
            {form.errors.course && (
              <Text style={[styles.errorText, { color: colors.error }]}>{form.errors.course}</Text>
            )}
          </View>

          {/* Date and Time Fields */}
          <DateTimeFields
            date={form.formData.date}
            teeTime={form.formData.teeTime}
            dateError={form.errors.date}
            onDateChange={form.handleDateChange}
            onTimeChange={form.handleTimeChange}
            onClearTime={form.clearTeeTime}
            getSelectedDate={form.getSelectedDate}
            getSelectedTime={form.getSelectedTime}
            disabled={form.isPending}
          />

          {/* Game Type Selection */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Game Type *</Text>
            <RoundGameTypeSelector
              value={form.formData.gameType}
              onChange={form.handleGameTypeChange}
              disabled={form.isPending}
              allowedGameTypes={limits?.allowedGameTypes}
              onUpgradePress={() => navigation.navigate('Subscription')}
            />
          </View>

          {/* Team Round Section - Only shown if competition supports teams */}
          {form.supportsTeams && (
            <TeamRoundSection
              isTeamRound={form.formData.isTeamRound}
              teamFormat={form.formData.teamFormat}
              teams={teams}
              teamFormatError={form.errors.teamFormat}
              onTeamRoundToggle={form.handleTeamRoundToggle}
              onTeamFormatChange={form.handleTeamFormatChange}
              disabled={form.isPending}
            />
          )}

          {/* Scoring Pairs Section */}
          <ScoringPairsSection
            isPremium={isPremium}
            scoringPairsRequired={form.formData.scoringPairsRequired}
            isTeamMatchPlay={form.isTeamMatchPlay}
            onToggle={form.handleScoringPairsToggle}
            onUpgradePress={() => navigation.navigate('Subscription')}
            disabled={form.isPending}
          />

          {/* Info box for non-team competitions */}
          {!form.supportsTeams && (
            <View style={[styles.infoBox, { backgroundColor: colors.gray100 }]}>
              <Icon source="information-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Team rounds are not available for this competition. Enable team mode in competition
                settings to use team formats.
              </Text>
            </View>
          )}
        </Surface>
      </ScrollView>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.white, borderTopColor: colors.gray200 },
        ]}
      >
        <Button
          mode="outlined"
          onPress={handleBack}
          style={[styles.cancelButton, { borderColor: colors.gray300 }]}
          contentStyle={styles.buttonContent}
          textColor={colors.textSecondary}
          disabled={form.isPending}
          theme={{ colors: { outline: colors.gray300 } }}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={form.handleSubmit}
          loading={form.isPending}
          disabled={form.isPending}
          style={styles.saveButton}
          contentStyle={styles.buttonContent}
          buttonColor={colors.primary}
          textColor={colors.white}
        >
          Add Round
        </Button>
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

      {/* Scoring Pairs Configuration Prompt Modal */}
      <ScoringPairsPromptModal
        visible={showScoringPairsPrompt}
        onConfigureNow={handleConfigureScoringPairsNow}
        onConfigureLater={handleConfigureScoringPairsLater}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
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
  formSection: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.smallBold,
    marginBottom: spacing.xs,
  },
  input: {},
  errorText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  infoText: {
    ...typography.small,
    flex: 1,
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
    borderRadius: borderRadius.md,
  },
  saveButton: {
    flex: 2,
    borderRadius: borderRadius.md,
  },
  buttonContent: {
    height: 48,
  },
});
