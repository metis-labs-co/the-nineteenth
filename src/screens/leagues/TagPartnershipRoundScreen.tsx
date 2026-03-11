/**
 * TagPartnershipRoundScreen - Multi-step flow to tag a round to a partnership league
 *
 * Steps:
 * 1. Select scorecard(s) - eligible completed scorecards
 * 2. Confirm course/tee details
 * 3. Choose difficulty level
 * 4. Confirm and tag
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';
import { PageHeader, LoadingSpinner } from '@/components/common';
import { DifficultyLevelSelector } from '@/components/leagues/DifficultyLevelSelector';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useLeague } from '@/hooks/useLeagues';
import { useMyPartnership, useTagPartnershipRound } from '@/hooks/usePartnershipLeague';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/services/supabase/client';
import {
  calculatePartnershipTarget,
  getTargetLevels,
  calculateTargetDifferential,
} from '@/utils/partnershipTarget';
import type { DifficultyLevel, PartnershipFormat } from '@/types/database';
import type { TargetLevel } from '@/utils/partnershipTarget';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'TagPartnershipRound'>;

interface EligibleCard {
  id: string;
  playerId: string;
  totalGross: number;
  courseName: string;
  courseId: string | null;
  courseRating: number | null;
  slopeRating: number | null;
  par: number | null;
  datePlayed: string | null;
  dailyHandicap: number | null;
}

export default function TagPartnershipRoundScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { user } = useAuth();
  const { leagueId, partnershipId } = route.params;

  const { data: league } = useLeague(leagueId);
  const { data: partnership } = useMyPartnership(leagueId);
  const tagMutation = useTagPartnershipRound(leagueId);

  const [step, setStep] = useState(1);
  const [myScorecard, setMyScorecard] = useState<EligibleCard | null>(null);
  const [partnerScorecard, setPartnerScorecard] = useState<EligibleCard | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('standard');
  const [eligibleCards, setEligibleCards] = useState<EligibleCard[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);

  const format = league?.partnership_format as PartnershipFormat | undefined;
  const isScramble = format === 'scramble';

  // Determine which player is the partner
  const partnerId = useMemo(() => {
    if (!partnership || !user) return null;
    return partnership.player_1_id === user.id ? partnership.player_2_id : partnership.player_1_id;
  }, [partnership, user]);

  // Load eligible scorecards for both players
  React.useEffect(() => {
    async function loadCards() {
      if (!user || !partnerId) return;
      setIsLoadingCards(true);

      try {
        const playerIds = isScramble ? [user.id] : [user.id, partnerId];

        const { data, error } = await supabase
          .from('scorecards')
          .select(`
            id, player_id, total_gross, status, daily_handicap_used,
            course_rating_used, slope_rating_used,
            rounds!inner ( date, course_id, par, courses ( name ) )
          `)
          .in('player_id', playerIds)
          .in('status', ['completed', 'confirmed'])
          .not('total_gross', 'is', null)
          .order('created_at', { ascending: false });

        if (error) throw error;

        interface ScorecardRow {
          id: string;
          player_id: string;
          total_gross: number;
          status: string;
          daily_handicap_used: number | null;
          course_rating_used: number | null;
          slope_rating_used: number | null;
          rounds: { date: string | null; course_id: string | null; par: number | null; courses: { name: string } | null };
        }

        const cards: EligibleCard[] = ((data ?? []) as unknown as ScorecardRow[]).map((sc) => ({
          id: sc.id,
          playerId: sc.player_id,
          totalGross: sc.total_gross,
          courseName: sc.rounds?.courses?.name ?? 'Unknown',
          courseId: sc.rounds?.course_id ?? null,
          courseRating: sc.course_rating_used ?? null,
          slopeRating: sc.slope_rating_used ?? null,
          par: sc.rounds?.par ?? null,
          datePlayed: sc.rounds?.date ?? null,
          dailyHandicap: sc.daily_handicap_used ?? null,
        }));

        setEligibleCards(cards);
      } catch (err) {
        console.error('[TagPartnershipRound] Error loading cards:', err);
      } finally {
        setIsLoadingCards(false);
      }
    }

    loadCards();
  }, [user, partnerId, isScramble]);

  const myCards = useMemo(
    () => eligibleCards.filter((c) => c.playerId === user?.id),
    [eligibleCards, user]
  );

  const partnerCards = useMemo(
    () => eligibleCards.filter((c) => c.playerId === partnerId),
    [eligibleCards, partnerId]
  );

  // Calculate target and levels
  const targetLevels = useMemo((): TargetLevel[] => {
    if (!format || !myScorecard) return [];
    const hcp1 = myScorecard.dailyHandicap ?? 18;
    const hcp2 = partnerScorecard?.dailyHandicap ?? 18;
    const cr = myScorecard.courseRating ?? 72;
    const sr = myScorecard.slopeRating ?? 113;
    const par = myScorecard.par ?? 72;

    const expected = calculatePartnershipTarget(format, hcp1, hcp2, cr, sr, par);
    return getTargetLevels(format, expected);
  }, [format, myScorecard, partnerScorecard]);

  const selectedTarget = useMemo(
    () => targetLevels.find((l) => l.level === difficulty),
    [targetLevels, difficulty]
  );

  const combinedGross = useMemo(() => {
    if (isScramble) return myScorecard?.totalGross ?? 0;
    return (myScorecard?.totalGross ?? 0) + (partnerScorecard?.totalGross ?? 0);
  }, [myScorecard, partnerScorecard, isScramble]);

  const canProceedStep1 = isScramble
    ? !!myScorecard
    : !!myScorecard && !!partnerScorecard;

  const handleTag = useCallback(async () => {
    if (!partnership || !myScorecard || !selectedTarget || !user || !partnerId) return;

    const player1Id = partnership.player_1_id;
    const player2Id = partnership.player_2_id;

    try {
      await tagMutation.mutateAsync({
        leagueId,
        partnershipId,
        scorecard1Id: player1Id === user.id ? myScorecard.id : (partnerScorecard?.id ?? myScorecard.id),
        scorecard2Id: isScramble ? undefined : (player1Id === user.id ? partnerScorecard?.id : myScorecard.id),
        player1Id,
        player2Id,
        courseId: myScorecard.courseId ?? undefined,
        courseName: myScorecard.courseName,
        courseRating: myScorecard.courseRating ?? undefined,
        slopeRating: myScorecard.slopeRating ?? undefined,
        par: myScorecard.par ?? undefined,
        combinedGross,
        targetScore: selectedTarget.target,
        difficultyLevel: difficulty,
        targetDifferential: calculateTargetDifferential(combinedGross, selectedTarget.target),
        player1Handicap: player1Id === user.id ? (myScorecard.dailyHandicap ?? undefined) : (partnerScorecard?.dailyHandicap ?? undefined),
        player2Handicap: player2Id === user.id ? (myScorecard.dailyHandicap ?? undefined) : (partnerScorecard?.dailyHandicap ?? undefined),
        playedAt: myScorecard.datePlayed ?? undefined,
      });
      navigation.goBack();
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to tag round');
    }
  }, [
    partnership, myScorecard, partnerScorecard, selectedTarget, user, partnerId,
    leagueId, partnershipId, combinedGross, difficulty, isScramble,
    tagMutation, navigation,
  ]);

  function formatDate(d: string | null) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  if (isLoadingCards) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="Tag Round" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}><LoadingSpinner size="lg" /></View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title={step === 1 ? 'Select Scorecards' : step === 2 ? 'Choose Difficulty' : 'Confirm'}
        showBack
        onBack={() => step > 1 ? setStep(step - 1) : navigation.goBack()}
      />

      {/* Step Indicator */}
      <View style={styles.stepIndicator}>
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            {s > 1 && <View style={[styles.stepLine, { backgroundColor: step >= s ? colors.primary : colors.gray200 }]} />}
            <View style={[styles.stepDot, { backgroundColor: step >= s ? colors.primary : colors.gray200 }]} />
          </React.Fragment>
        ))}
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
        {step === 1 && (
          <View style={styles.form}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Your Scorecard
            </Text>
            {myCards.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No eligible completed scorecards found.
              </Text>
            ) : (
              <View style={styles.cardsList}>
                {myCards.map((card) => (
                  <TouchableOpacity
                    key={card.id}
                    onPress={() => setMyScorecard(card)}
                    style={[
                      styles.scorecardOption,
                      {
                        backgroundColor: myScorecard?.id === card.id ? colors.primaryBackground : colors.surface,
                        borderColor: myScorecard?.id === card.id ? colors.primary : colors.border,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.scorecardInfo}>
                      <Text style={[styles.scorecardCourse, { color: colors.textPrimary }]} numberOfLines={1}>
                        {card.courseName}
                      </Text>
                      <Text style={[styles.scorecardMeta, { color: colors.textSecondary }]}>
                        {formatDate(card.datePlayed)} · Gross {card.totalGross}
                      </Text>
                    </View>
                    {myScorecard?.id === card.id && (
                      <Icon source="check-circle" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {!isScramble && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: spacing.lg }]}>
                  Partner&apos;s Scorecard
                </Text>
                {partnerCards.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No eligible scorecards from your partner.
                  </Text>
                ) : (
                  <View style={styles.cardsList}>
                    {partnerCards.map((card) => (
                      <TouchableOpacity
                        key={card.id}
                        onPress={() => setPartnerScorecard(card)}
                        style={[
                          styles.scorecardOption,
                          {
                            backgroundColor: partnerScorecard?.id === card.id ? colors.primaryBackground : colors.surface,
                            borderColor: partnerScorecard?.id === card.id ? colors.primary : colors.border,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <View style={styles.scorecardInfo}>
                          <Text style={[styles.scorecardCourse, { color: colors.textPrimary }]} numberOfLines={1}>
                            {card.courseName}
                          </Text>
                          <Text style={[styles.scorecardMeta, { color: colors.textSecondary }]}>
                            {formatDate(card.datePlayed)} · Gross {card.totalGross}
                          </Text>
                        </View>
                        {partnerScorecard?.id === card.id && (
                          <Icon source="check-circle" size={20} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {step === 2 && (
          <View style={styles.form}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Choose Difficulty
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Target is calculated from combined handicaps and course data. Pick your challenge level.
            </Text>
            {targetLevels.length > 0 && (
              <DifficultyLevelSelector
                levels={targetLevels}
                selectedLevel={difficulty}
                onSelectLevel={setDifficulty}
              />
            )}
          </View>
        )}

        {step === 3 && (
          <View style={styles.form}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Confirm Round
            </Text>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Course</Text>
                <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{myScorecard?.courseName}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Combined Gross</Text>
                <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{combinedGross}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Target ({selectedTarget?.label})</Text>
                <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{selectedTarget?.target}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Differential</Text>
                <Text style={[
                  styles.summaryValue,
                  { color: combinedGross <= (selectedTarget?.target ?? 0) ? colors.success : colors.error },
                ]}>
                  {selectedTarget ? (combinedGross > selectedTarget.target ? '+' : '') + (combinedGross - selectedTarget.target) : '-'}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.footer}>
          {step < 3 ? (
            <TouchableOpacity
              onPress={() => setStep(step + 1)}
              disabled={step === 1 && !canProceedStep1}
              style={[
                styles.button,
                { backgroundColor: (step === 1 && !canProceedStep1) ? colors.gray200 : colors.primary },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, { color: (step === 1 && !canProceedStep1) ? colors.textSecondary : colors.white }]}>
                Continue
              </Text>
              <Icon source="arrow-right" size={20} color={(step === 1 && !canProceedStep1) ? colors.textSecondary : colors.white} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleTag}
              disabled={tagMutation.isPending}
              style={[styles.button, { backgroundColor: colors.primary }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, { color: colors.white }]}>
                {tagMutation.isPending ? 'Tagging...' : 'Tag Round'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepLine: {
    width: 30,
    height: 2,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  form: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
  },
  description: {
    ...typography.body,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  cardsList: {
    gap: spacing.sm,
  },
  scorecardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    gap: spacing.md,
  },
  scorecardInfo: {
    flex: 1,
  },
  scorecardCourse: {
    ...typography.bodyBold,
  },
  scorecardMeta: {
    ...typography.small,
    marginTop: 2,
  },
  summaryCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    ...typography.body,
  },
  summaryValue: {
    ...typography.bodyBold,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  button: {
    height: 52,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  buttonText: {
    ...typography.bodyBold,
  },
});
