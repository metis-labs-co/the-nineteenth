/**
 * SubMatchesTab - "who plays whom" breakdown for a round.
 *
 * Two modes share this tab:
 *   - Split team rounds: per-sub-match cards with Team A/B sides, live
 *     status, and final Ryder-Cup result. (The aggregate point total is
 *     rendered on MatchTab.)
 *   - Other rounds with more than 4 players: tee-group (pairing) cards.
 *     Organizers can shuffle groups and jump into the Scoring Pairs
 *     screen from here.
 *
 * The tab is hidden entirely when the round has ≤4 players and isn't
 * split — there's nothing to split up in that case.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { EmptyState } from '@/components/common/EmptyState';
import { GolfBallLoader, ConfirmationDialog } from '@/components/common';
import { useConfirmationDialog } from '@/hooks';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import {
  usePairings,
  useSubMatches,
  useUpdateSubMatchResult,
  useUpdateSubMatchTeeTime,
  useUpdatePairing,
  useAutoGeneratePairings,
  useReplacePairings,
  useRoundScorecards,
} from '@/hooks/rounds';
import {
  useAutoGenerateScoringPairs,
  useCreateScoringPairs,
  useGenerateTeamMatchPlayPairs,
} from '@/hooks/scoringPairs';
import { generateGroupAwareScoringPairs } from '@/utils/scoringPairs/generation';
import { useRoundTeams } from '@/hooks/scorecard/useRoundTeams';
import { useRoundPlayers } from '@/hooks/useRoundDetails';
import {
  formatTeeTimeForDisplay,
  generateTeamBalancedGroups,
} from '@/utils/pairingAlgorithm';
import type { RootStackParamList } from '@/navigation/types';
import type { GameType, SubMatch, SubMatchResult } from '@/types';

/** Parse an HH:MM(:SS) sub-match tee time into a Date for the picker. */
function parseTeeTimeToDate(teeTime: string | null): Date {
  const date = new Date();
  if (!teeTime) {
    date.setHours(7, 0, 0, 0);
    return date;
  }
  const [h, m] = teeTime.split(':').map(Number);
  date.setHours(
    Number.isFinite(h) ? h : 7,
    Number.isFinite(m) ? m : 0,
    0,
    0
  );
  return date;
}

/** Format a Date as HH:MM:SS for persistence. */
function formatDateToTeeTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}:00`;
}

/**
 * Theme-aware background for the tee-time pill. In light mode the
 * existing `primaryLighter` tint reads well against white surfaces. In
 * dark mode that same token is too bright against the darker surface,
 * so we substitute a low-alpha primary tint that keeps the pill visible
 * without washing out the card.
 */
function useTeeTimePillBackground(): string {
  const colors = useThemeColors();
  const isDark = useIsDark();
  return isDark ? `${colors.primary}33` : colors.primaryLighter;
}

interface SubMatchesTabProps {
  roundId: string;
  /** Competition the round belongs to (null for standalone rounds). Needed
   *  to navigate to the ScoringPairs screen — standalone rounds skip the
   *  Scoring Pairs button entirely. */
  competitionId?: string | null;
  /** True when round.scoring_pairs_required is on. When false the
   *  Scoring pairs action button on this tab renders disabled so the
   *  settings-screen toggle stays the single source of truth. */
  scoringPairsEnabled?: boolean;
  /** When true, render per-side forfeit actions on upcoming/in-progress sub-matches. */
  isOrganizer?: boolean;
  /** True when round_format === 'split' (Ryder-Cup team round). */
  isSplitRound?: boolean;
  /** True when the round is a team round (drives pair-generation semantics). */
  isTeamRound?: boolean;
  /** Round game type — determines whether pairs-aggregate (stroke) or match-play result is shown. */
  gameType?: GameType;
  /** Round-level default tee time (HH:mm:ss) used as the starting point
   *  when shuffling tee groups. */
  roundTeeTime?: string | null;
}

/** Stroke-based game types for pairs-aggregate display. */
const STROKE_GAME_TYPES: GameType[] = ['stroke', 'stableford', 'par'];
/** Default tee time interval when auto-generating pairings from this tab. */
const DEFAULT_SHUFFLE_INTERVAL_MINUTES = 8;

interface PlayerLookupEntry {
  name: string;
  handicap: number | null;
  /** Team the player belongs to on this round, if any. Only set for team
   *  rounds; shown in a small italic label under the player's name. */
  teamName?: string | null;
}

interface GroupViewModel {
  id: string;
  label: string;
  teeTime: string | null;
  players: PlayerLookupEntry[];
}

export function SubMatchesTab({
  roundId,
  competitionId,
  scoringPairsEnabled = true,
  isOrganizer = false,
  isSplitRound = false,
  isTeamRound = false,
  gameType,
  roundTeeTime,
}: SubMatchesTabProps) {
  const colors = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: subMatches, isLoading: isSubMatchesLoading } = useSubMatches(
    isSplitRound ? roundId : undefined
  );
  const { data: pairings, isLoading: isPairingsLoading } = usePairings(roundId);
  const { data: players, isLoading: isPlayersLoading } = useRoundPlayers(roundId);
  const { data: scorecards } = useRoundScorecards(roundId);
  const { mutateAsync: updateSubMatchResult } = useUpdateSubMatchResult(roundId);
  const { mutateAsync: updateSubMatchTeeTime } = useUpdateSubMatchTeeTime(roundId);
  const { mutateAsync: updatePairing } = useUpdatePairing();
  const { mutateAsync: autoGeneratePairings, isPending: isShufflingPairings } =
    useAutoGeneratePairings();
  const { mutateAsync: replacePairings, isPending: isReplacingPairings } =
    useReplacePairings();
  const { mutateAsync: autoGenerateScoringPairs, isPending: isShufflingPairs } =
    useAutoGenerateScoringPairs();
  const { mutateAsync: generateTeamPairs, isPending: isShufflingTeamPairs } =
    useGenerateTeamMatchPlayPairs();
  const { mutateAsync: createScoringPairs, isPending: isSavingScoringPairs } =
    useCreateScoringPairs();
  // Fetch teams whenever a competition exists (or the round carries
  // standalone team config). Players can belong to competition-level
  // teams even when the round's scoring format is individual — those
  // team labels still need to appear under each name in the Groups
  // view — so we don't gate the fetch on `isTeamRound`. Individual
  // competitions just return an empty teams list.
  const hasTeamSource = !!competitionId || isTeamRound;
  const { teams, isLoading: isTeamsLoading } = useRoundTeams(
    competitionId ?? undefined,
    hasTeamSource,
    roundId
  );
  const { dialogConfig, showDialog, dismissDialog } = useConfirmationDialog();

  // When non-null, the native time picker is mounted for the sub-match
  // with this id. Only one picker is ever on screen at a time.
  const [editingTeeTimeFor, setEditingTeeTimeFor] = useState<SubMatch | null>(null);
  // Analogous state for the Groups view — pairings aren't sub-matches
  // but share the same inline edit flow.
  const [editingPairingTeeTimeFor, setEditingPairingTeeTimeFor] = useState<
    { pairingId: string; teeTime: string | null } | null
  >(null);

  const isStrokeRound = !!gameType && STROKE_GAME_TYPES.includes(gameType);

  // Team membership by player id — lets us annotate group rows with
  // the player's team (small italic label under the name). Populated
  // whenever `teams` has data, regardless of round format, so individual
  // rounds inside a team competition still show team tags.
  const teamNameByPlayer = useMemo(() => {
    const map = new Map<string, string>();
    teams.forEach((t) => {
      (t.members || []).forEach((m) => {
        if (m.player_id) map.set(m.player_id, t.name);
      });
    });
    return map;
  }, [teams]);

  const playerLookup = useMemo(() => {
    const map = new Map<string, PlayerLookupEntry>();
    (players || []).forEach((p) => {
      map.set(p.id, {
        name: p.name,
        handicap: p.handicap ?? null,
        teamName: teamNameByPlayer.get(p.id) ?? null,
      });
    });
    return map;
  }, [players, teamNameByPlayer]);

  // Per-player net stroke totals — source of truth for the pairs-aggregate
  // display. Derived on the fly so we don't need to back-fill
  // sub_matches.team_a/b_net_total on every score change.
  const netTotalByPlayer = useMemo(() => {
    const map = new Map<string, number>();
    (scorecards || []).forEach((sc) => {
      if (sc.player?.id && typeof sc.total_net === 'number') {
        map.set(sc.player.id, sc.total_net);
      }
    });
    return map;
  }, [scorecards]);

  const handleOpenTeeTimeEditor = useCallback((sm: SubMatch) => {
    setEditingTeeTimeFor(sm);
  }, []);

  const handleTeeTimeChange = useCallback(
    (_event: unknown, selectedDate: Date | undefined) => {
      const sm = editingTeeTimeFor;
      setEditingTeeTimeFor(null);
      if (!sm || !selectedDate) return;
      updateSubMatchTeeTime({
        subMatchId: sm.id,
        teeTime: formatDateToTeeTime(selectedDate),
      }).catch((err: unknown) => {
        Alert.alert(
          'Unable to update tee time',
          err instanceof Error ? err.message : 'Please try again.'
        );
      });
    },
    [editingTeeTimeFor, updateSubMatchTeeTime]
  );

  const handleOpenPairingTeeTimeEditor = useCallback(
    (pairingId: string, teeTime: string | null) => {
      setEditingPairingTeeTimeFor({ pairingId, teeTime });
    },
    []
  );

  const handlePairingTeeTimeChange = useCallback(
    (_event: unknown, selectedDate: Date | undefined) => {
      const editing = editingPairingTeeTimeFor;
      setEditingPairingTeeTimeFor(null);
      if (!editing || !selectedDate) return;
      updatePairing({
        pairingId: editing.pairingId,
        roundId,
        data: { teeTime: formatDateToTeeTime(selectedDate) },
      }).catch((err: unknown) => {
        Alert.alert(
          'Unable to update tee time',
          err instanceof Error ? err.message : 'Please try again.'
        );
      });
    },
    [editingPairingTeeTimeFor, updatePairing, roundId]
  );

  const handleForfeit = useCallback(
    (sm: SubMatch, forfeitingSide: 'a' | 'b') => {
      const winnerLabel = forfeitingSide === 'a' ? 'Team B' : 'Team A';
      const losingLabel = forfeitingSide === 'a' ? 'Team A' : 'Team B';
      showDialog({
        title: 'Mark as forfeited',
        message: `${losingLabel} forfeits this sub-match — ${winnerLabel} will receive 1 point.`,
        confirmLabel: 'Forfeit',
        cancelLabel: 'Cancel',
        icon: 'flag-remove-outline',
        confirmVariant: 'destructive',
        onConfirm: async () => {
          dismissDialog();
          try {
            await updateSubMatchResult({
              subMatchId: sm.id,
              status: 'forfeited',
              result: forfeitingSide === 'a' ? 'forfeit-a' : 'forfeit-b',
              finalDifferential: null,
            });
          } catch (err) {
            Alert.alert(
              'Unable to forfeit',
              err instanceof Error ? err.message : 'Please try again.'
            );
          }
        },
      });
    },
    [updateSubMatchResult, showDialog, dismissDialog]
  );

  // Pairings-backed "Groups" view model. Used when the round isn't a
  // split team round — a foursome is the max tee group, so any round
  // with more than 4 players needs pairings.
  const pairingGroups = useMemo<GroupViewModel[]>(() => {
    if (isSplitRound) return [];
    if (!pairings || pairings.length === 0) return [];
    return pairings.map((p, i) => ({
      id: p.id,
      label: `Group ${i + 1}`,
      teeTime: p.teeTime,
      players: p.playerIds
        .map((id) => playerLookup.get(id))
        .filter((pl): pl is PlayerLookupEntry => !!pl),
    }));
  }, [isSplitRound, pairings, playerLookup]);

  const handleShuffleGroups = useCallback(async () => {
    if (!players || players.length < 2) {
      Alert.alert('Not enough players', 'Add at least 2 players before shuffling.');
      return;
    }
    const startTime = (roundTeeTime ?? '07:00:00').substring(0, 5);
    const playerById = new Map(players.map((p) => [p.id, p]));
    try {
      // Team-balanced path: if the round sits inside a team setup (teams
      // have been defined at the competition or round level) we snake-
      // draft each team separately so every physical group ends up with
      // the same share of each side — e.g. 4v4 → two groups of 2+2.
      const teamsWithMembers = teams
        .map((t) => ({
          name: t.name,
          players: (t.members || [])
            .map((m) => playerById.get(m.player_id))
            .filter((p): p is NonNullable<typeof p> => !!p)
            .map((p) => ({
              id: p.id,
              name: p.name,
              handicap: p.handicap ?? null,
            })),
        }))
        .filter((t) => t.players.length > 0);
      const coveredPlayerIds = new Set(
        teamsWithMembers.flatMap((t) => t.players.map((p) => p.id))
      );
      const everyPlayerHasTeam = players.every((p) => coveredPlayerIds.has(p.id));
      const useTeamBalanced =
        teamsWithMembers.length >= 2 && everyPlayerHasTeam;

      // Capture the freshly-saved pairings so we can pipe them into the
      // group-aware scoring-pair generator below. Both mutation paths
      // return the new pairing rows.
      let freshPairings: { playerIds: string[] }[] = [];

      if (useTeamBalanced) {
        const { groups, warnings } = generateTeamBalancedGroups({
          teamPlayers: teamsWithMembers.map((t) => t.players),
          groupSize: 4,
          startTime,
          intervalMinutes: DEFAULT_SHUFFLE_INTERVAL_MINUTES,
        });
        if (groups.length === 0) {
          throw new Error(
            warnings[0] ?? 'Unable to generate balanced groups for this round.'
          );
        }
        const savedPairings = await replacePairings({ roundId, groups });
        freshPairings = savedPairings.map((p) => ({ playerIds: p.playerIds }));
      } else {
        const { pairings: savedPairings } = await autoGeneratePairings({
          roundId,
          playerIds: players.map((p) => p.id),
          options: {
            startTime,
            intervalMinutes: DEFAULT_SHUFFLE_INTERVAL_MINUTES,
            groupSize: 4,
          },
        });
        freshPairings = savedPairings.map((p) => ({ playerIds: p.playerIds }));
      }

      // Regenerate scoring pairs so markers align with the new groups.
      // Non-blocking: a failure here doesn't undo the pairing shuffle.
      //
      // When we know the tee groups AND who's on which team, we use the
      // group-aware generator: every pair respects group boundaries (a
      // scorer can only mark someone in their foursome), and within each
      // group we prefer cross-team reciprocal pairs so team A always
      // scores team B where possible. Leftover/uneven groups fall back
      // to same-team pairs with a warning surfaced in the console.
      //
      // Fallbacks:
      //   - No teams defined → legacy cross-team-or-handicap auto-gen.
      try {
        const teamByPlayerId = new Map<string, string>();
        teamsWithMembers.forEach((t) => {
          t.players.forEach((p) => {
            teamByPlayerId.set(p.id, t.name);
          });
        });

        const hasGroupContext = freshPairings.length > 0 && teamByPlayerId.size > 0;

        if (hasGroupContext) {
          const result = generateGroupAwareScoringPairs(
            freshPairings,
            teamByPlayerId
          );
          if (result.warnings.length > 0) {
            console.info('[SubMatchesTab] Group-aware pairs warnings', result.warnings);
          }
          if (result.pairs.length > 0) {
            await createScoringPairs({ roundId, pairs: result.pairs });
          }
        } else {
          const teamA = teams[0]?.members?.filter((m) => m.player_id) ?? [];
          const teamB = teams[1]?.members?.filter((m) => m.player_id) ?? [];
          if (isTeamRound && teamA.length > 0 && teamB.length > 0) {
            await generateTeamPairs({
              roundId,
              team1Players: teamA.map((m) => ({ id: m.player_id })),
              team2Players: teamB.map((m) => ({ id: m.player_id })),
            });
          } else {
            await autoGenerateScoringPairs({
              roundId,
              players: players.map((p) => ({ id: p.id })),
            });
          }
        }
      } catch (err) {
        console.warn('[SubMatchesTab] Shuffle: scoring pair regen failed', err);
      }
    } catch (err) {
      Alert.alert(
        'Unable to shuffle groups',
        err instanceof Error ? err.message : 'Please try again.'
      );
    }
  }, [
    players,
    autoGeneratePairings,
    autoGenerateScoringPairs,
    createScoringPairs,
    generateTeamPairs,
    isTeamRound,
    replacePairings,
    teams,
    roundId,
    roundTeeTime,
  ]);

  const handleOpenScoringPairs = useCallback(() => {
    navigation.navigate('ScoringPairs', {
      roundId,
      competitionId: competitionId ?? '',
    });
  }, [navigation, roundId, competitionId]);

  const isShuffling =
    isShufflingPairings ||
    isReplacingPairings ||
    isShufflingPairs ||
    isShufflingTeamPairs ||
    isSavingScoringPairs;

  // Auto-shuffle on first visit: when the organizer lands on the Groups
  // tab and no pairings exist yet, silently run a shuffle so the tab is
  // immediately useful. Gated by a ref so it only fires once per mount —
  // if the shuffle clears on delete or the organizer resets state, they
  // can re-shuffle manually.
  //
  // Wait for teams to finish loading when the round has a team source
  // (competition or standalone team-config) — otherwise the auto-shuffle
  // can fire before `teams` arrives and fall back to the handicap-only
  // snake draft instead of the team-balanced generator.
  const autoShuffledRef = useRef(false);
  useEffect(() => {
    if (autoShuffledRef.current) return;
    if (isSplitRound) return;
    if (!isOrganizer) return;
    if (isShuffling) return;
    if (isPairingsLoading || isPlayersLoading) return;
    if (hasTeamSource && isTeamsLoading) return;
    if (!players || players.length <= 4) return;
    if (!pairings || pairings.length > 0) return;
    autoShuffledRef.current = true;
    handleShuffleGroups();
  }, [
    isSplitRound,
    isOrganizer,
    isShuffling,
    isPairingsLoading,
    isPlayersLoading,
    hasTeamSource,
    isTeamsLoading,
    players,
    pairings,
    handleShuffleGroups,
  ]);

  const isLoading = isSplitRound
    ? isSubMatchesLoading || isPlayersLoading
    : isPairingsLoading || isPlayersLoading;

  // Overall team totals for stroke rounds (pairs-aggregate): sum of member
  // nets per side across every sub-match. Defined before early returns to
  // keep hook order stable across renders.
  const pairsAggregateTotals = useMemo(() => {
    if (!isStrokeRound || !subMatches) return null;
    let teamA = 0;
    let teamB = 0;
    let countedPlayers = 0;
    subMatches.forEach((sm) => {
      sm.team_a_player_ids.forEach((id) => {
        const n = netTotalByPlayer.get(id);
        if (typeof n === 'number') {
          teamA += n;
          countedPlayers += 1;
        }
      });
      sm.team_b_player_ids.forEach((id) => {
        const n = netTotalByPlayer.get(id);
        if (typeof n === 'number') {
          teamB += n;
          countedPlayers += 1;
        }
      });
    });
    return { teamA, teamB, hasAnyScores: countedPlayers > 0 };
  }, [isStrokeRound, subMatches, netTotalByPlayer]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <GolfBallLoader size="md" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {isSplitRound ? 'Loading sub-matches…' : 'Loading groups…'}
        </Text>
      </View>
    );
  }

  const hasSplitContent = isSplitRound && !!subMatches && subMatches.length > 0;
  const hasGroupContent = !isSplitRound && pairingGroups.length > 0;
  const showEmpty = !hasSplitContent && !hasGroupContent;

  return (
    <>
      <ScrollView contentContainerStyle={styles.scroll}>
        {!isSplitRound && isOrganizer && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.actionButtonPrimary,
                {
                  backgroundColor: isShuffling ? colors.gray300 : colors.primary,
                  opacity: isShuffling ? 0.8 : 1,
                },
              ]}
              onPress={handleShuffleGroups}
              disabled={isShuffling}
              accessibilityRole="button"
              accessibilityLabel="Shuffle groups"
              testID="groups-shuffle-button"
            >
              <Icon source="shuffle-variant" size={16} color={colors.white} />
              <Text style={[styles.actionButtonLabel, { color: colors.white }]}>
                {isShuffling ? 'Shuffling…' : 'Shuffle groups'}
              </Text>
            </TouchableOpacity>
            {!!competitionId && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.actionButtonSecondary,
                  {
                    borderColor: scoringPairsEnabled
                      ? colors.border
                      : colors.gray300,
                    backgroundColor: colors.surface,
                    opacity: scoringPairsEnabled ? 1 : 0.5,
                  },
                ]}
                onPress={handleOpenScoringPairs}
                disabled={!scoringPairsEnabled}
                accessibilityRole="button"
                accessibilityLabel={
                  scoringPairsEnabled
                    ? 'Open scoring pairs'
                    : 'Scoring pairs disabled — enable on the round settings screen'
                }
                accessibilityState={{ disabled: !scoringPairsEnabled }}
                testID="groups-scoring-pairs-button"
              >
                <Icon
                  source="account-switch"
                  size={16}
                  color={scoringPairsEnabled ? colors.primary : colors.gray500}
                />
                <Text
                  style={[
                    styles.actionButtonLabel,
                    {
                      color: scoringPairsEnabled
                        ? colors.primary
                        : colors.gray500,
                    },
                  ]}
                >
                  Scoring pairs
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {hasSplitContent && pairsAggregateTotals?.hasAnyScores && (
          <PairsAggregateHeader
            teamATotal={pairsAggregateTotals.teamA}
            teamBTotal={pairsAggregateTotals.teamB}
          />
        )}

        {hasSplitContent &&
          subMatches!.map((sm, i) => (
            <SubMatchCard
              key={sm.id}
              index={i}
              subMatch={sm}
              playerLookup={playerLookup}
              isOrganizer={isOrganizer}
              onForfeit={handleForfeit}
              onEditTeeTime={handleOpenTeeTimeEditor}
              strokeMode={isStrokeRound}
              netTotalByPlayer={netTotalByPlayer}
            />
          ))}

        {hasGroupContent &&
          pairingGroups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              canEditTeeTime={isOrganizer}
              onEditTeeTime={handleOpenPairingTeeTimeEditor}
            />
          ))}

        {showEmpty && (
          <EmptyState
            icon="golf"
            title={isSplitRound ? 'No Sub-Matches' : 'No Groups'}
            message={
              isSplitRound
                ? 'Sub-matches will appear here once the organiser splits the round.'
                : isOrganizer
                  ? 'Tap Shuffle groups to create balanced tee groups.'
                  : 'Tee groups will appear here once the organiser creates them.'
            }
            compact
          />
        )}
      </ScrollView>
      {editingTeeTimeFor && (
        <DateTimePicker
          testID="sub-match-tee-time-picker"
          value={parseTeeTimeToDate(editingTeeTimeFor.tee_time)}
          mode="time"
          is24Hour={false}
          display="spinner"
          minuteInterval={1}
          onChange={handleTeeTimeChange}
        />
      )}
      {editingPairingTeeTimeFor && (
        <DateTimePicker
          testID="pairing-tee-time-picker"
          value={parseTeeTimeToDate(editingPairingTeeTimeFor.teeTime)}
          mode="time"
          is24Hour={false}
          display="spinner"
          minuteInterval={1}
          onChange={handlePairingTeeTimeChange}
        />
      )}
      <ConfirmationDialog {...dialogConfig} onCancel={dismissDialog} />
    </>
  );
}

interface GroupCardProps {
  group: GroupViewModel;
  /** When true, the tee-time pill becomes a tap target that opens a
   *  time picker (organizer-only). Non-organizers still see the pill
   *  but can't change it. */
  canEditTeeTime?: boolean;
  onEditTeeTime?: (pairingId: string, teeTime: string | null) => void;
}

function GroupCard({ group, canEditTeeTime = false, onEditTeeTime }: GroupCardProps) {
  const colors = useThemeColors();
  const teeTimePillBg = useTeeTimePillBackground();
  const pillEditable = canEditTeeTime && !!onEditTeeTime;

  const pillLabel = group.teeTime
    ? formatTeeTimeForDisplay(group.teeTime.substring(0, 5))
    : 'Set tee time';
  const pillBody = (
    <>
      <Icon source="clock-outline" size={14} color={colors.primary} />
      <Text style={[styles.teeTimeText, { color: colors.primary }]}>
        {pillLabel}
      </Text>
      {pillEditable && (
        <Icon source="pencil-outline" size={12} color={colors.primary} />
      )}
    </>
  );

  return (
    <View
      style={[
        styles.card,
        shadows.sm,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.cardHeaderLeft}>
          <Icon source="account-group" size={18} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            {group.label}
          </Text>
        </View>
        {pillEditable ? (
          <TouchableOpacity
            style={[styles.teeTimePill, { backgroundColor: teeTimePillBg }]}
            onPress={() => onEditTeeTime?.(group.id, group.teeTime)}
            accessibilityRole="button"
            accessibilityLabel={`Edit tee time for ${group.label}`}
            accessibilityHint="Opens a time picker"
            testID={`group-${group.id}-tee-time-edit`}
          >
            {pillBody}
          </TouchableOpacity>
        ) : group.teeTime ? (
          <View style={[styles.teeTimePill, { backgroundColor: teeTimePillBg }]}>
            {pillBody}
          </View>
        ) : null}
      </View>
      <View style={styles.sidesContainer}>
        {group.players.map((p, i) => (
          <View key={`${group.id}-${i}`} style={styles.playerRow}>
            <View style={styles.playerNameColumn}>
              <Text
                style={[styles.playerName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {p.name}
              </Text>
              {p.teamName && (
                <Text
                  style={[styles.playerTeamLabel, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {p.teamName}
                </Text>
              )}
            </View>
            {p.handicap !== null && (
              <Text style={[styles.playerHandicap, { color: colors.textSecondary }]}>
                HC {p.handicap}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function PairsAggregateHeader({ teamATotal, teamBTotal }: { teamATotal: number; teamBTotal: number }) {
  const colors = useThemeColors();
  const leader =
    teamATotal === teamBTotal ? 'tied' : teamATotal < teamBTotal ? 'a' : 'b';
  return (
    <View
      style={[
        styles.pairsAggregateCard,
        shadows.sm,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.pairsHeader}>
        <Icon source="sigma" size={16} color={colors.primary} />
        <Text style={[styles.pairsLabel, { color: colors.textSecondary }]}>
          Pairs Aggregate · sum of all members’ net totals
        </Text>
      </View>
      <View style={styles.pairsRow}>
        <View style={styles.pairsSide}>
          <View style={[styles.pairsSideDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.pairsSideLabel, { color: colors.textSecondary }]}>Team A</Text>
          <Text
            style={[
              styles.pairsPoints,
              { color: leader === 'a' ? colors.success : colors.textPrimary },
            ]}
          >
            {teamATotal}
          </Text>
        </View>
        <Text style={[styles.pairsDash, { color: colors.textSecondary }]}>vs</Text>
        <View style={styles.pairsSide}>
          <Text
            style={[
              styles.pairsPoints,
              { color: leader === 'b' ? colors.success : colors.textPrimary },
            ]}
          >
            {teamBTotal}
          </Text>
          <Text style={[styles.pairsSideLabel, { color: colors.textSecondary }]}>Team B</Text>
          <View style={[styles.pairsSideDot, { backgroundColor: colors.error }]} />
        </View>
      </View>
    </View>
  );
}

interface SubMatchCardProps {
  index: number;
  subMatch: SubMatch;
  playerLookup: Map<string, PlayerLookupEntry>;
  isOrganizer: boolean;
  onForfeit: (sm: SubMatch, forfeitingSide: 'a' | 'b') => void;
  /** Tapping the tee-time pill calls this. Only wired up for organizers on
   *  upcoming sub-matches — once scoring starts, the pill is informational. */
  onEditTeeTime?: (sm: SubMatch) => void;
  /** When true, render this card as a stroke-play pairs aggregate instead of match-play result. */
  strokeMode?: boolean;
  /** Map of playerId → net stroke total (for stroke-mode display). */
  netTotalByPlayer?: Map<string, number>;
}

function SubMatchCard({
  index,
  subMatch,
  playerLookup,
  isOrganizer,
  onForfeit,
  onEditTeeTime,
  strokeMode = false,
  netTotalByPlayer,
}: SubMatchCardProps) {
  const colors = useThemeColors();
  const teeTimePillBg = useTeeTimePillBackground();
  const canEditTeeTime = isOrganizer && subMatch.status === 'upcoming' && !!onEditTeeTime;

  const teamAPlayers = subMatch.team_a_player_ids.map(
    (id) => playerLookup.get(id) ?? { name: 'Unknown', handicap: null }
  );
  const teamBPlayers = subMatch.team_b_player_ids.map(
    (id) => playerLookup.get(id) ?? { name: 'Unknown', handicap: null }
  );

  // Sub-team net totals (stroke rounds only). Returns null if no scores yet
  // on that side — falls back to the match-play status display.
  const teamANet = strokeMode
    ? sumNets(subMatch.team_a_player_ids, netTotalByPlayer)
    : null;
  const teamBNet = strokeMode
    ? sumNets(subMatch.team_b_player_ids, netTotalByPlayer)
    : null;

  const statusText = formatStatus(subMatch);
  const resultText = formatResult(subMatch);
  const statusColor = resultToColor(subMatch.result, colors);

  return (
    <View
      style={[
        styles.card,
        shadows.sm,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.cardHeaderLeft}>
          <Icon source="trophy-outline" size={18} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Sub-Match {index + 1}
          </Text>
        </View>
        {(() => {
          const label = subMatch.tee_time
            ? formatTeeTimeForDisplay(subMatch.tee_time.substring(0, 5))
            : 'Set tee time';
          const pillBody = (
            <>
              <Icon source="clock-outline" size={14} color={colors.primary} />
              <Text style={[styles.teeTimeText, { color: colors.primary }]}>
                {label}
              </Text>
              {canEditTeeTime && (
                <Icon source="pencil-outline" size={12} color={colors.primary} />
              )}
            </>
          );
          if (canEditTeeTime) {
            return (
              <TouchableOpacity
                style={[styles.teeTimePill, { backgroundColor: teeTimePillBg }]}
                onPress={() => onEditTeeTime?.(subMatch)}
                accessibilityRole="button"
                accessibilityLabel={`Edit tee time for Sub-Match ${index + 1}`}
                accessibilityHint="Opens a time picker"
                testID={`sub-match-${subMatch.id}-tee-time-edit`}
              >
                {pillBody}
              </TouchableOpacity>
            );
          }
          if (!subMatch.tee_time) return null;
          return (
            <View style={[styles.teeTimePill, { backgroundColor: teeTimePillBg }]}>
              {pillBody}
            </View>
          );
        })()}
      </View>

      <View style={styles.sidesContainer}>
        <Side label="Team A" dotColor={colors.success} players={teamAPlayers} />
        <View style={styles.vsDivider}>
          <View style={[styles.vsLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.vsText, { color: colors.textSecondary }]}>VS</Text>
          <View style={[styles.vsLine, { backgroundColor: colors.border }]} />
        </View>
        <Side label="Team B" dotColor={colors.error} players={teamBPlayers} />
      </View>

      {strokeMode && teamANet !== null && teamBNet !== null ? (
        <View style={[styles.statusRow, { backgroundColor: colors.surfaceVariant }]}>
          <Icon source="sigma" size={16} color={colors.primary} />
          <Text style={[styles.statusText, { color: colors.textPrimary }]}>
            Team A {teamANet} · Team B {teamBNet}
          </Text>
        </View>
      ) : (
        <View style={[styles.statusRow, { backgroundColor: colors.surfaceVariant }]}>
          <Icon source="flag-checkered" size={16} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {resultText ?? statusText}
          </Text>
        </View>
      )}

      {isOrganizer && subMatch.status !== 'completed' && subMatch.status !== 'forfeited' && (
        <View style={[styles.forfeitRow, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.forfeitButton, { borderColor: colors.border }]}
            onPress={() => onForfeit(subMatch, 'a')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Forfeit Team A"
          >
            <Icon source="flag-remove-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.forfeitText, { color: colors.textSecondary }]}>
              Forfeit Team A
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.forfeitButton, { borderColor: colors.border }]}
            onPress={() => onForfeit(subMatch, 'b')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Forfeit Team B"
          >
            <Icon source="flag-remove-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.forfeitText, { color: colors.textSecondary }]}>
              Forfeit Team B
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

interface SideProps {
  label: string;
  dotColor: string;
  players: PlayerLookupEntry[];
}

function Side({ label, dotColor, players }: SideProps) {
  const colors = useThemeColors();
  return (
    <View style={styles.side}>
      <View style={styles.sideHeader}>
        <View style={[styles.sideDot, { backgroundColor: dotColor }]} />
        <Text style={[styles.sideLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      {players.map((p, i) => (
        <View key={i} style={styles.playerRow}>
          <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
            {p.name}
          </Text>
          {p.handicap !== null && (
            <Text style={[styles.playerHandicap, { color: colors.textSecondary }]}>
              HC {p.handicap}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

function formatStatus(sm: SubMatch): string {
  switch (sm.status) {
    case 'upcoming':
      return 'Upcoming';
    case 'in-progress':
      return 'In progress';
    case 'completed':
      return 'Completed';
    case 'forfeited':
      return 'Forfeited';
    default:
      return sm.status;
  }
}

function formatResult(sm: SubMatch): string | null {
  if (sm.status === 'forfeited') {
    if (sm.result === 'forfeit-a') return 'Team B wins by forfeit';
    if (sm.result === 'forfeit-b') return 'Team A wins by forfeit';
    return 'Forfeited';
  }

  if (sm.status !== 'completed' || !sm.result) return null;

  const diff = sm.final_differential;
  const diffText = diff != null && diff > 0 ? ` · +${diff}` : '';

  switch (sm.result) {
    case 'a-wins':
      return `Team A won${diffText}`;
    case 'b-wins':
      return `Team B won${diffText}`;
    case 'halved':
      return 'Halved';
    default:
      return null;
  }
}

/**
 * Sum the net totals of the given player IDs. Returns `null` if no player
 * on the list has a net score yet — the caller falls back to the match-play
 * status display.
 */
function sumNets(
  playerIds: string[],
  netTotalByPlayer?: Map<string, number>
): number | null {
  if (!netTotalByPlayer || netTotalByPlayer.size === 0) return null;
  let total = 0;
  let any = false;
  playerIds.forEach((id) => {
    const n = netTotalByPlayer.get(id);
    if (typeof n === 'number') {
      total += n;
      any = true;
    }
  });
  return any ? total : null;
}

function resultToColor(result: SubMatchResult | null, colors: ReturnType<typeof useThemeColors>): string {
  if (!result) return colors.textSecondary;
  if (result === 'halved') return colors.warning ?? colors.textSecondary;
  if (result === 'a-wins' || result === 'forfeit-b') return colors.success;
  if (result === 'b-wins' || result === 'forfeit-a') return colors.error;
  return colors.textSecondary;
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.md,
    gap: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  actionButtonPrimary: {
    // Filled primary button — background comes from theme at render time.
  },
  actionButtonSecondary: {
    borderWidth: 1,
  },
  actionButtonLabel: {
    ...typography.captionBold,
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.small,
  },
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.bodyBold,
  },
  teeTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  teeTimeText: {
    ...typography.captionBold,
  },
  sidesContainer: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  side: {
    gap: spacing.xs,
  },
  sideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sideDot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
  },
  sideLabel: {
    ...typography.captionBold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  playerNameColumn: {
    flex: 1,
  },
  playerName: {
    ...typography.body,
  },
  playerTeamLabel: {
    ...typography.caption,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  playerHandicap: {
    ...typography.caption,
  },
  vsDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  vsLine: {
    flex: 1,
    height: 1,
  },
  vsText: {
    ...typography.smallBold,
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  statusText: {
    ...typography.bodyBold,
  },
  forfeitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  forfeitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  forfeitText: {
    ...typography.caption,
    fontWeight: '500',
  },

  pairsAggregateCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  pairsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pairsLabel: {
    ...typography.caption,
    letterSpacing: 0.3,
  },
  pairsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  pairsSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pairsSideDot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
  },
  pairsSideLabel: {
    ...typography.captionBold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  pairsPoints: {
    ...typography.h2,
  },
  pairsDash: {
    ...typography.h3,
  },
});

export default SubMatchesTab;
