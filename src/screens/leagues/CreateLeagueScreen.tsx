/**
 * CreateLeagueScreen - 2-step wizard to create a new league
 *
 * Step 1: Type selection + name/description
 * Step 2: Type-specific configuration
 *   - Ongoing: info only
 *   - Season: start/end date pickers
 *   - Round Limit: max rounds stepper + optional counting rounds
 *   - Ladder: challenge range picker + seeding method
 *   - Eclectic: course search, tee selector, gross/net toggle
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { FormInput, FullScreenWizard, useWizard } from '@/components/common';
import type { WizardStepConfig } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import {
  SeasonConfig,
  RoundLimitConfig,
  LadderConfig,
  EclecticConfig,
  PartnershipConfig,
  OngoingConfig,
} from './components/LeagueConfigSections';
import { useCreateLeague } from '@/hooks/useLeagues';
import { useFeatureAccess } from '@/hooks/subscription/useFeatureAccess';
import { useClubsWithCourses, useSearchClubs, useFavoriteCoursesWithClubs, sortHomeClubFirst } from '@/hooks/clubs';
import { useTeesByCourse } from '@/hooks/useTees';
import { CourseSelectionModal } from '@/components/competitionWizard/create/RoundDetailsStep/components/CourseSelectionModal';
import { TeeSelectionModal } from '@/components/competitionWizard/create/RoundDetailsStep/components/TeeSelectionModal';
import LeagueTypeSelector from '@/components/leagues/LeagueTypeSelector';
import type { LeagueType, LadderSeeding, EclecticScoring, PartnershipFormat, Tee } from '@/types/database';
import type { TeeBox } from '@/types/database/base';
import type { CourseWithFavoriteStatus, ClubCourseDisplayItem, SearchResultItem } from '@/hooks/clubs';
import type { Club } from '@/types/database.types';
import type { CreateLeagueInput } from '@/services/api/leagues';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Helper to parse DD/MM/YYYY to ISO date string
function parseDateInput(input: string): string | null {
  const parts = input.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  if (!day || !month || !year || year.length !== 4) return null;
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 2020) return null;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export default function CreateLeagueScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const createLeague = useCreateLeague();
  const { checkAccess } = useFeatureAccess();

  // Step 1: Type + Name
  const [leagueType, setLeagueType] = useState<LeagueType>('ongoing');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  // Step 2: Type-specific config
  // Season
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // Round Limit
  const [maxRounds, setMaxRounds] = useState(10);
  const [countingRounds, setCountingRounds] = useState(8);
  const [useBestOf, setUseBestOf] = useState(true);
  // Ladder
  const [challengeRange, setChallengeRange] = useState(3);
  const [ladderSeeding, setLadderSeeding] = useState<LadderSeeding>('join_order');
  // Partnership
  const [partnershipFormat, setPartnershipFormat] = useState<PartnershipFormat>('combined_stroke');
  // Eclectic
  const [courseId, setCourseId] = useState<string | null>(null);
  const [courseName, setCourseName] = useState<string | null>(null);
  const [teeId, setTeeId] = useState<string | null>(null);
  const [teeName, setTeeName] = useState<string | null>(null);
  const [eclecticScoring, setEclecticScoring] = useState<EclecticScoring>('gross');

  // Check if user can create premium league types (ladder/eclectic)
  const premiumAccess = checkAccess('create_premium_league');
  const canCreatePremium = premiumAccess.allowed;

  // Course/Tee selection for eclectic
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showTeeModal, setShowTeeModal] = useState(false);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');

  const { data: allClubs = [], isLoading: isLoadingCourses } = useClubsWithCourses({
    enabled: leagueType === 'eclectic',
  });
  const { data: searchResults = [], isLoading: isSearching } = useSearchClubs(
    courseSearchQuery,
    undefined
  );
  const { data: favoriteCourses = [] } = useFavoriteCoursesWithClubs();
  const { data: courseTees = [] } = useTeesByCourse(courseId ?? '', {
    enabled: !!courseId,
  });

  // Transform clubs to display items for CourseSelectionModal, home club first
  const displayItems: ClubCourseDisplayItem[] = useMemo(() => {
    const clubs = courseSearchQuery.length >= 2 ? searchResults : allClubs;
    return sortHomeClubFirst((clubs ?? []).map((club: SearchResultItem) => {
      const type: 'single-course' | 'multi-course-club' = club.is_multi_course
        ? 'multi-course-club'
        : 'single-course';
      return {
        type,
        club: club as Club,
        venue: club as Club,
        courses: club.courses ?? [],
        is_home: club.is_home,
      };
    }));
  }, [courseSearchQuery, searchResults, allClubs]);

  // Convert Tee[] to TeeBox[] for the TeeSelectionModal
  const availableTeeBoxes: TeeBox[] = useMemo(() => {
    return courseTees.map((tee: Tee) => ({
      name: tee.name,
      color: tee.color ?? 'white',
      totalYardage: tee.total_length ?? undefined,
      courseRating: tee.course_rating ?? undefined,
      slopeRating: tee.slope ?? undefined,
    }));
  }, [courseTees]);

  const canProceedStep1 = name.trim().length >= 2;

  const canCreateLeague = useMemo(() => {
    if (!canProceedStep1) return false;

    switch (leagueType) {
      case 'season': {
        const start = parseDateInput(startDate);
        const end = parseDateInput(endDate);
        return !!start && !!end && start < end;
      }
      case 'round_limit':
        return maxRounds > 0;
      case 'ladder':
        return challengeRange >= 1 && challengeRange <= 5;
      case 'eclectic':
        return !!courseId && (eclecticScoring === 'gross' || !!teeId);
      case 'partnership':
        return !!partnershipFormat;
      default:
        return true;
    }
  }, [canProceedStep1, leagueType, startDate, endDate, maxRounds, challengeRange, courseId, eclecticScoring, teeId, partnershipFormat]);

  const handleCreate = useCallback(async () => {
    if (!canCreateLeague) return;

    const input: CreateLeagueInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      league_type: leagueType,
      is_public: isPublic,
    };

    if (leagueType === 'season') {
      input.start_date = parseDateInput(startDate)!;
      input.end_date = parseDateInput(endDate)!;
    } else if (leagueType === 'round_limit') {
      input.max_rounds = maxRounds;
      input.counting_rounds = useBestOf ? countingRounds : undefined;
    } else if (leagueType === 'ladder') {
      input.challenge_range = challengeRange;
      input.ladder_seeding = ladderSeeding;
    } else if (leagueType === 'eclectic') {
      input.course_id = courseId!;
      input.tee_id = eclecticScoring === 'net' ? teeId! : undefined;
      input.eclectic_scoring = eclecticScoring;
    } else if (leagueType === 'partnership') {
      input.partnership_format = partnershipFormat;
    }

    try {
      const league = await createLeague.mutateAsync(input);
      navigation.replace('LeagueDetail', { id: league.id });
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create league');
    }
  }, [
    canCreateLeague, name, description, isPublic, leagueType, startDate, endDate,
    maxRounds, countingRounds, useBestOf, challengeRange, ladderSeeding,
    courseId, teeId, eclecticScoring, partnershipFormat, createLeague, navigation,
  ]);

  const handleCoursePress = useCallback(() => {
    setShowCourseModal(true);
  }, []);

  const handleCourseSelect = useCallback(
    (course: CourseWithFavoriteStatus, club: Club) => {
      const displayName =
        course.name === club.name ? club.name : `${course.name} @ ${club.name}`;
      setCourseId(course.id);
      setCourseName(displayName);
      // Reset tee when course changes
      setTeeId(null);
      setTeeName(null);
      setShowCourseModal(false);
      setCourseSearchQuery('');
    },
    []
  );

  const handleTeePress = useCallback(() => {
    if (!courseId) {
      Alert.alert('Select Course First', 'Please select a course before choosing tees.');
      return;
    }
    setShowTeeModal(true);
  }, [courseId]);

  const handleTeeSelect = useCallback(
    (teeBox: TeeBox) => {
      // Find matching Tee from the tees table to get the ID
      const matchingTee = courseTees.find((t: Tee) => t.name === teeBox.name);
      if (matchingTee) {
        setTeeId(matchingTee.id);
        setTeeName(teeBox.name);
      }
      setShowTeeModal(false);
    },
    [courseTees]
  );

  const handlePremiumPress = useCallback(() => {
    navigation.navigate('Subscription');
  }, [navigation]);

  // --- Wizard step configs ---

  const steps: WizardStepConfig[] = useMemo(() => [
    {
      key: 'type',
      title: 'League Type',
      canProceed: canProceedStep1,
      render: () => (
        <View style={styles.form}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            League Type
          </Text>
          <LeagueTypeSelector
            selectedType={leagueType}
            onSelectType={setLeagueType}
            canCreatePremium={canCreatePremium}
            onPremiumPress={handlePremiumPress}
          />

          <View style={styles.nameSection}>
            <FormInput
              label="League Name"
              floatingLabel
              placeholder="e.g. Sunday Social League"
              value={name}
              onChangeText={setName}
              maxLength={50}
              accessibilityHint="Enter a name for your league"
            />

            <FormInput
              label="Description"
              floatingLabel
              placeholder="Optional description"
              value={description}
              onChangeText={setDescription}
              maxLength={200}
              multiline
              numberOfLines={3}
              accessibilityHint="Optionally describe your league"
            />

            <TouchableOpacity
              onPress={() => setIsPublic(!isPublic)}
              style={[styles.toggleRow, { borderColor: colors.border }]}
            >
              <View style={styles.toggleTextContainer}>
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                  Public League
                </Text>
                <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
                  Allow anyone to find and join this league
                </Text>
              </View>
              <Icon
                source={isPublic ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={24}
                color={isPublic ? colors.primary : colors.gray300}
              />
            </TouchableOpacity>
          </View>
        </View>
      ),
    },
    {
      key: 'config',
      title: 'Configuration',
      canProceed: canCreateLeague,
      isSubmit: true,
      nextLabel: 'Create League',
      render: () => (
        <View style={styles.form}>
          {leagueType === 'ongoing' && <OngoingConfig />}
          {leagueType === 'season' && (
            <SeasonConfig
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          )}
          {leagueType === 'round_limit' && (
            <RoundLimitConfig
              maxRounds={maxRounds}
              countingRounds={countingRounds}
              useBestOf={useBestOf}
              onMaxRoundsChange={setMaxRounds}
              onCountingRoundsChange={setCountingRounds}
              onUseBestOfChange={setUseBestOf}
            />
          )}
          {leagueType === 'ladder' && (
            <LadderConfig
              challengeRange={challengeRange}
              seeding={ladderSeeding}
              onChallengeRangeChange={setChallengeRange}
              onSeedingChange={setLadderSeeding}
            />
          )}
          {leagueType === 'eclectic' && (
            <EclecticConfig
              courseName={courseName}
              teeName={teeName}
              scoring={eclecticScoring}
              onCoursePress={handleCoursePress}
              onTeePress={handleTeePress}
              onScoringChange={setEclecticScoring}
            />
          )}
          {leagueType === 'partnership' && (
            <PartnershipConfig
              format={partnershipFormat}
              onFormatChange={setPartnershipFormat}
            />
          )}
        </View>
      ),
    },
  ], [
    canProceedStep1, canCreateLeague, colors, leagueType, name, description, isPublic,
    canCreatePremium, handlePremiumPress, startDate, endDate, maxRounds, countingRounds,
    useBestOf, challengeRange, ladderSeeding, courseId, courseName, teeId, teeName,
    eclecticScoring, partnershipFormat, handleCoursePress, handleTeePress,
  ]);

  const wizard = useWizard({
    steps,
    onSubmit: handleCreate,
    onClose: () => navigation.goBack(),
  });

  return (
    <>
      <FullScreenWizard
        title="Create League"
        wizard={wizard}
        isSubmitting={createLeague.isPending}
        onClose={() => navigation.goBack()}
      >
        {wizard.currentStep.render()}
      </FullScreenWizard>

      {/* Course Selection Modal (for eclectic) */}
      <CourseSelectionModal
        visible={showCourseModal}
        displayItems={displayItems}
        favoriteCourses={favoriteCourses}
        courseSearchQuery={courseSearchQuery}
        isLoading={isLoadingCourses}
        isSearching={isSearching}
        onCourseSelect={handleCourseSelect}
        onSearchChange={setCourseSearchQuery}
        onClose={() => setShowCourseModal(false)}
      />

      {/* Tee Selection Modal (for eclectic net scoring) */}
      <TeeSelectionModal
        visible={showTeeModal}
        availableTees={availableTeeBoxes}
        selectedTeeName={teeName ?? undefined}
        onSelect={handleTeeSelect}
        onClose={() => setShowTeeModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  form: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
  nameSection: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    marginTop: spacing.md,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    ...typography.body,
  },
  toggleDescription: {
    ...typography.small,
    marginTop: 2,
  },
});
