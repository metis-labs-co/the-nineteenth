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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import {
  SubMatchTeeTimePicker,
  parseTeeTimeToDate,
  formatDateToTeeTime,
} from '@/components/rounds/SubMatchTeeTimePicker';
import { EmptyState } from '@/components/common/EmptyState';
import { GolfBallLoader, ConfirmationDialog } from '@/components/common';
import { Tabs, type TabItem } from '@/components/common/Tabs';
import { useConfirmationDialog } from '@/hooks';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import {
  usePairings,
  useSubMatches,
  useReplaceSubMatches,
  useUpdateSubMatchResult,
  useUpdateSubMatchTeeTime,
  useUpdatePairing,
  useAutoGeneratePairings,
  useReplacePairings,
  useRoundScorecards,
  type ScorecardWithPlayer,
} from '@/hooks/rounds';
import { regenerateScoringPairsForRound } from '@/services/scoringPairs/regenerateForRound';
import { useRoundTeams } from '@/hooks/scorecard/useRoundTeams';
import { useRoundPlayers } from '@/hooks/useRoundDetails';
import { useAuth } from '@/hooks/useAuth';
import { useCompetitionLeaderboard } from '@/hooks/competitions';
import {
  formatTeeTimeForDisplay,
  generateSubMatches,
  generateTeamBalancedGroups,
  generateTeamTogetherGroups,
  pickGroupingStrategy,
} from '@/utils/pairingAlgorithm';
import type { PairingPlayer } from '@/types';
import { ScoringPairsSection } from '@/components/rounds/ViewRound/RoundDetailsTab/components';
import { getTeamColorHex } from '@/utils/teamColor';
import { calculateStablefordPoints } from '@/utils/scoring';
import { isSingleBallScore } from '@/types/database/base';
import { PICKUP_SCORE } from '@/constants/scoring';
import type { GameType, Hole, RoundStatus, SubMatch, SubMatchResult, TeamFormat } from '@/types';
import type {
  BracketSeedingStyle,
  PairingSource,
  QualifyingMetric,
  RoundFormat,
} from '@/types/database/enums';
import { EditPairingConfigSheet } from '@/components/rounds/EditPairingConfigSheet';

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
  /** Competition the round belongs to (null for standalone rounds). */
  competitionId?: string | null;
  /** True when round.scoring_pairs_required is on. Drives the read-only
   *  scoring-pair summary rendered below the shuffle action row. */
  scoringPairsEnabled?: boolean;
  /** Round lifecycle status. Forwarded to ScoringPairsSection so the
   *  read-only card knows whether editing would be allowed elsewhere. */
  roundStatus?: RoundStatus;
  /** When true, render per-side forfeit actions on upcoming/in-progress sub-matches. */
  isOrganizer?: boolean;
  /** True when round_format === 'split' (Ryder-Cup team round). */
  isSplitRound?: boolean;
  /** True when the round is a team round (drives pair-generation semantics). */
  isTeamRound?: boolean;
  /** True when the parent competition has `team_mode = 'none'` (individual
   *  competition). Forces random snake-draft groups regardless of any stray
   *  team format/flags left on the round, so the Groups tab never tries the
   *  team-together generator with no teams. */
  isIndividualCompetition?: boolean;
  /** True while the competition metadata (which determines
   *  `isIndividualCompetition`) is still loading. The one-shot auto-shuffle
   *  waits for this so it doesn't pick a stale team strategy mid-load. */
  isCompetitionInfoLoading?: boolean;
  /** Round game type — determines whether pairs-aggregate (stroke) or match-play result is shown. */
  gameType?: GameType;
  /** Round's team_format. When 'scramble' on a combined round, the shuffle
   *  keeps teammates together (one whole team per tee group) instead of
   *  the default cross-team 2+2 balance. */
  teamFormat?: TeamFormat | null;
  /** Round holes — required to compute live best-ball points contributions
   *  for split team rounds. Empty array is fine for individual rounds where
   *  no per-side aggregation is rendered. */
  holes?: Hole[];
  /** Round-level default tee time (HH:mm:ss) used as the starting point
   *  when shuffling tee groups. */
  roundTeeTime?: string | null;
  /** Round number — passed to EditPairingConfigSheet for the standings
   *  fetcher's `before` cutoff. */
  roundNumber?: number;
  /** round.round_format — drives the EditPairingConfigSheet split branch. */
  roundFormat?: RoundFormat | null;
  /** round.sub_match_size — drives the cross-team cardinality during a
   *  standings re-seed of split presets. */
  subMatchSize?: number | null;
  /** round.pairing_source / pairing_style / pairing_metric — feed the
   *  EditPairingConfigSheet's initial state and the visibility check on
   *  the "Edit pairings" button. */
  pairingSource?: PairingSource;
  pairingStyle?: BracketSeedingStyle | null;
  pairingMetric?: QualifyingMetric | null;
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
  /** Current competition position for this player (1-based). When present,
   *  rendered as a small `#N` pill alongside the name in match/sub-match
   *  cards so organisers can see the seeding context behind a pairing. */
  position?: number | null;
  /** True when this entry is the currently-logged-in user. Drives the
   *  small "You" pill next to the name in group/sub-match player rows. */
  isCurrentUser?: boolean;
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
  roundStatus,
  isOrganizer = false,
  isSplitRound = false,
  isTeamRound = false,
  isIndividualCompetition = false,
  isCompetitionInfoLoading = false,
  gameType,
  teamFormat,
  holes = [],
  roundTeeTime,
  roundNumber,
  roundFormat,
  subMatchSize,
  pairingSource = 'manual',
  pairingStyle,
  pairingMetric,
}: SubMatchesTabProps) {
  const colors = useThemeColors();
  const { user } = useAuth();
  const currentUserId = user?.id;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const handleSubMatchPress = useCallback(
    (sm: SubMatch) => {
      navigation.navigate('SubMatchDetail', {
        subMatchId: sm.id,
        roundId,
        competitionId: competitionId ?? undefined,
      });
    },
    [navigation, roundId, competitionId]
  );
  const {
    data: subMatches,
    isLoading: isSubMatchesLoading,
    refetch: refetchSubMatches,
  } = useSubMatches(isSplitRound ? roundId : undefined);
  const {
    data: pairings,
    isLoading: isPairingsLoading,
    refetch: refetchPairings,
  } = usePairings(roundId);
  const { data: players, isLoading: isPlayersLoading } = useRoundPlayers(roundId);
  const { data: scorecards } = useRoundScorecards(roundId);
  // Competition standings drive the per-player position pill on each card.
  // Skip the network round-trip entirely for standalone rounds. We don't
  // need the auto-refresh poll either — pairings are based on standings as
  // of when the round was generated, not the live leaderboard.
  const { data: competitionLeaderboard } = useCompetitionLeaderboard(
    competitionId ?? '',
    { filter: 'individuals', autoRefresh: false }
  );
  const { mutateAsync: updateSubMatchResult } = useUpdateSubMatchResult(roundId);
  const { mutateAsync: updateSubMatchTeeTime } = useUpdateSubMatchTeeTime(roundId);
  const { mutateAsync: replaceSubMatches, isPending: isReplacingSubMatches } =
    useReplaceSubMatches();
  const { mutateAsync: updatePairing } = useUpdatePairing();
  const { mutateAsync: autoGeneratePairings, isPending: isShufflingPairings } =
    useAutoGeneratePairings();
  const { mutateAsync: replacePairings, isPending: isReplacingPairings } =
    useReplacePairings();
  // The scoring-pair regen runs after a pairings shuffle through the
  // shared `regenerateScoringPairsForRound` service. Track the in-flight
  // state locally instead of the three hooks the legacy inline path used.
  const [isRegeneratingScoringPairs, setIsRegeneratingScoringPairs] =
    useState(false);

  // Edit Pairings sheet — only meaningful when we have everything the
  // sheet needs: a competition (standings input), the round number, and
  // the round_format from the preset. Visibility on the action button is
  // additionally gated on organiser + upcoming + standings-driven.
  const [showEditPairingSheet, setShowEditPairingSheet] = useState(false);
  const canEditPairings =
    !!competitionId &&
    isOrganizer &&
    roundStatus === 'upcoming' &&
    pairingSource === 'current_standings' &&
    roundNumber !== undefined &&
    !!roundFormat;
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

  // Sub-tab inside the Groups tab. Only visible when scoring pairs are
  // enabled for the round — otherwise there's only one view (groups) and
  // a sub-tab bar would be noise.
  type GroupsSubTabKey = 'groups' | 'scoringPairs';
  const [groupsSubTab, setGroupsSubTab] = useState<GroupsSubTabKey>('groups');

  const isStrokeRound = !!gameType && STROKE_GAME_TYPES.includes(gameType);
  const isBestBallRound = teamFormat === 'best-ball';

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

  // Resolved team-colour hex by player id. Each team stores an avatar
  // palette id in `teams.color`; we resolve it via getTeamColorHex with the
  // team's index as the legacy fallback. Used by the sub-match card dots
  // and the mini best-ball header so the colours match what the rest of
  // the app shows for each competition team.
  const teamColorByPlayer = useMemo(() => {
    const map = new Map<string, string>();
    teams.forEach((t, index) => {
      const hex = getTeamColorHex(t.color, index, colors);
      (t.members || []).forEach((m) => {
        if (m.player_id) map.set(m.player_id, hex);
      });
    });
    return map;
  }, [teams, colors]);

  // Competition position by player id. Driven by the individuals
  // leaderboard so we can render a `#N` pill next to each player's name.
  // Empty for standalone rounds (no competition standings to surface).
  const positionByPlayer = useMemo(() => {
    const map = new Map<string, number>();
    (competitionLeaderboard ?? []).forEach((entry) => {
      if (!entry.isTeam && entry.participantId) {
        map.set(entry.participantId, entry.position);
      }
    });
    return map;
  }, [competitionLeaderboard]);

  const playerLookup = useMemo(() => {
    const map = new Map<string, PlayerLookupEntry>();
    (players || []).forEach((p) => {
      map.set(p.id, {
        name: p.name,
        handicap: p.handicap ?? null,
        teamName: teamNameByPlayer.get(p.id) ?? null,
        position: positionByPlayer.get(p.id) ?? null,
        isCurrentUser: !!currentUserId && p.id === currentUserId,
      });
    });
    return map;
  }, [players, teamNameByPlayer, positionByPlayer, currentUserId]);

  // Refetch pairings (and sub-matches when applicable) every time the
  // screen regains focus. Returning from RoundSettings after editing the
  // pairing rules would otherwise show the stale, pre-save groups because
  // the queries inside this tab are well within their staleTime window.
  useFocusEffect(
    useCallback(() => {
      refetchPairings();
      if (isSplitRound) refetchSubMatches();
    }, [refetchPairings, refetchSubMatches, isSplitRound])
  );

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

  const handleTeeTimeCommit = useCallback(
    (selectedDate: Date) => {
      const sm = editingTeeTimeFor;
      setEditingTeeTimeFor(null);
      if (!sm) return;
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

  const handlePairingTeeTimeCommit = useCallback(
    (selectedDate: Date) => {
      const editing = editingPairingTeeTimeFor;
      setEditingPairingTeeTimeFor(null);
      if (!editing) return;
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
      const teamALabel = labelForSide(sm.team_a_player_ids, 'Team A', teamNameByPlayer);
      const teamBLabel = labelForSide(sm.team_b_player_ids, 'Team B', teamNameByPlayer);
      const winnerLabel = forfeitingSide === 'a' ? teamBLabel : teamALabel;
      const losingLabel = forfeitingSide === 'a' ? teamALabel : teamBLabel;
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
    [updateSubMatchResult, showDialog, dismissDialog, teamNameByPlayer]
  );

  // Pairings-backed "Groups" view model. Used when the round isn't a
  // split team round — a foursome is the max tee group, so any round
  // with more than 4 players needs pairings. Individual 1v1 match-play
  // rounds also flow through here (with the tab forced visible) so the
  // organiser can see "Match N: Sam vs Bob" matchups.
  const isIndividualMatchPlay =
    gameType === 'match-play' && !isTeamRound;
  const pairingGroups = useMemo<GroupViewModel[]>(() => {
    if (isSplitRound) return [];
    if (!pairings || pairings.length === 0) return [];
    return pairings.map((p, i) => {
      const players = p.playerIds
        .map((id) => playerLookup.get(id))
        .filter((pl): pl is PlayerLookupEntry => !!pl);
      const isVersusPair = isIndividualMatchPlay && players.length === 2;
      return {
        id: p.id,
        label: isVersusPair ? `Match ${i + 1}` : `Group ${i + 1}`,
        teeTime: p.teeTime,
        players,
      };
    });
  }, [isSplitRound, pairings, playerLookup, isIndividualMatchPlay]);

  // Grouping strategy is intrinsic to the round type — not a user choice.
  // Drives both which algorithm `handleShuffleGroups` dispatches to and
  // whether the Shuffle button renders at all (see action row below).
  const groupingStrategy = useMemo(
    () =>
      pickGroupingStrategy({
        teamFormat,
        isSplitRound,
        isTeamRound,
        teamCount: teams.length,
        isIndividualCompetition,
      }),
    [teamFormat, isSplitRound, isTeamRound, teams.length, isIndividualCompetition]
  );

  // Team-together (scramble) has only one valid grouping shape — teammates
  // together — so shuffling is meaningless. Hide the button entirely rather
  // than leave it clickable-but-inert.
  const showShuffleButton = groupingStrategy !== 'team-together';

  const handleShuffleGroups = useCallback(async () => {
    if (!players || players.length < 2) {
      Alert.alert('Not enough players', 'Add at least 2 players before shuffling.');
      return;
    }
    if (groupingStrategy === 'none') {
      // Split rounds derive groups from sub-matches — nothing to shuffle.
      return;
    }
    const startTime = (roundTeeTime ?? '07:00:00').substring(0, 5);
    const playerById = new Map(players.map((p) => [p.id, p]));
    try {
      // Build the per-team view up front — used by team-together and
      // team-balanced strategies, and by the scoring-pair regen below.
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

      // Capture the freshly-saved pairings so we can pipe them into the
      // group-aware scoring-pair generator below. All mutation paths
      // return the new pairing rows.
      let freshPairings: { playerIds: string[] }[] = [];

      if (groupingStrategy === 'team-together') {
        const { groups, warnings } = generateTeamTogetherGroups({
          teamPlayers: teamsWithMembers.map((t) => t.players),
          startTime,
          intervalMinutes: DEFAULT_SHUFFLE_INTERVAL_MINUTES,
        });
        if (groups.length === 0) {
          throw new Error(
            warnings[0] ?? 'Unable to generate team-together groups for this round.'
          );
        }
        const savedPairings = await replacePairings({ roundId, groups });
        freshPairings = savedPairings.map((p) => ({ playerIds: p.playerIds }));
      } else if (groupingStrategy === 'team-balanced') {
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
        // 'snake-draft' — no team context; fall back to handicap-balanced
        // snake draft across every player in the round.
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
      // Strategy preference (sub-match → group-aware → cross-team → autogen)
      // lives in `regenerateScoringPairsForRound`; same helper is used by
      // the EditPairingConfigSheet save flow so behaviour stays in lockstep.
      setIsRegeneratingScoringPairs(true);
      try {
        await regenerateScoringPairsForRound({
          roundId,
          isTeamRound,
          teamsWithMembers,
          pairings: freshPairings,
          // Shuffle only fires for non-split rounds (the button is hidden
          // when isSplitRound), so explicitly pass `[]` to skip the
          // sub-match fetch.
          subMatches: [],
          players,
          logTag: 'SubMatchesTab.shuffle',
        });
      } catch (err) {
        console.warn('[SubMatchesTab] Shuffle: scoring pair regen failed', err);
      } finally {
        setIsRegeneratingScoringPairs(false);
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
    groupingStrategy,
    isTeamRound,
    replacePairings,
    teams,
    roundId,
    roundTeeTime,
  ]);

  const isShuffling =
    isShufflingPairings ||
    isReplacingPairings ||
    isRegeneratingScoringPairs;

  // Whether any sub-match has moved past 'upcoming'. Regenerating would
  // wipe in-flight scoring, so the shuffle action is blocked in that case
  // (mirrors the RoundTypeSheet guard).
  const hasInProgressSubMatches = useMemo(
    () => (subMatches ?? []).some((sm) => sm.status !== 'upcoming'),
    [subMatches]
  );

  // Rebuild the split round's sub-matches from the current team rosters.
  // Needed when team membership changes after the round was created (e.g.
  // players added to the competition) — the stored sub-matches don't
  // auto-update, so this is the organiser's way to refresh them.
  const runShuffleSubMatches = useCallback(async () => {
    if (teams.length < 2) {
      Alert.alert(
        'Teams not ready',
        'This round needs two teams with players before sub-matches can be generated.'
      );
      return;
    }

    const startTime = (roundTeeTime ?? '07:00:00').substring(0, 5);
    const toPairingPlayers = (
      memberList: (typeof teams)[number]['members']
    ): PairingPlayer[] =>
      (memberList || [])
        .filter((m) => m.player_id)
        .map((m) => ({
          id: m.player_id,
          name: m.player?.name ?? 'Unknown',
          handicap: m.player?.handicap ?? null,
          handicapIndex: m.player?.handicap_index ?? null,
          gender: m.player?.gender ?? null,
          photoUrl: m.player?.photo_url ?? null,
        }));

    try {
      const { subMatches: generated } = generateSubMatches({
        teamAPlayers: toPairingPlayers(teams[0].members),
        teamBPlayers: toPairingPlayers(teams[1].members),
        subMatchSize: subMatchSize ?? 2,
        startTime,
        intervalMinutes: DEFAULT_SHUFFLE_INTERVAL_MINUTES,
      });

      if (generated.length === 0) {
        Alert.alert(
          'Unable to generate sub-matches',
          'Not enough players on both teams to form sub-matches.'
        );
        return;
      }

      const newSubMatches = generated.map((sm) => ({
        sortOrder: sm.sortOrder,
        teamAPlayerIds: sm.teamAPlayerIds,
        teamBPlayerIds: sm.teamBPlayerIds,
        teeTime: sm.teeTime,
        pairingId: null,
      }));

      await replaceSubMatches({ roundId, subMatches: newSubMatches });

      // Realign scoring-pair markers to the new sub-matches when the round
      // uses them. Non-blocking — a failed regen never undoes the shuffle.
      if (scoringPairsEnabled) {
        setIsRegeneratingScoringPairs(true);
        try {
          await regenerateScoringPairsForRound({
            roundId,
            isTeamRound: true,
            teamsWithMembers: teams.map((t) => ({
              name: t.name,
              players: toPairingPlayers(t.members).map((p) => ({
                id: p.id,
                name: p.name,
                handicap: p.handicap,
              })),
            })),
            pairings: [],
            subMatches: newSubMatches.map((sm) => ({
              teamAPlayerIds: sm.teamAPlayerIds,
              teamBPlayerIds: sm.teamBPlayerIds,
            })),
            players: (players ?? []).map((p) => ({ id: p.id })),
            logTag: 'SubMatchesTab.shuffleSubMatches',
          });
        } catch (err) {
          console.warn(
            '[SubMatchesTab] Shuffle sub-matches: scoring pair regen failed',
            err
          );
        } finally {
          setIsRegeneratingScoringPairs(false);
        }
      }

      refetchSubMatches();
    } catch (err) {
      Alert.alert(
        'Unable to shuffle sub-matches',
        err instanceof Error ? err.message : 'Please try again.'
      );
    }
  }, [
    teams,
    roundTeeTime,
    subMatchSize,
    replaceSubMatches,
    roundId,
    scoringPairsEnabled,
    players,
    refetchSubMatches,
  ]);

  const handleShuffleSubMatches = useCallback(() => {
    showDialog({
      title: 'Shuffle sub-matches?',
      message:
        'This rebuilds every sub-match from the current team rosters and replaces the existing pairings. Use it after adding or removing players.',
      confirmLabel: 'Shuffle',
      icon: 'shuffle-variant',
      onConfirm: () => {
        dismissDialog();
        runShuffleSubMatches();
      },
    });
  }, [showDialog, dismissDialog, runShuffleSubMatches]);

  const isShufflingSubMatches = isReplacingSubMatches || isRegeneratingScoringPairs;

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
    // Don't auto-shuffle once a round is in-progress or completed —
    // pairings are locked at that point and a silent shuffle would
    // surprise players already on course.
    if (roundStatus !== 'upcoming') return;
    if (isShuffling) return;
    if (isPairingsLoading || isPlayersLoading) return;
    if (hasTeamSource && isTeamsLoading) return;
    // Wait for the competition's team_mode to resolve before choosing a
    // grouping strategy — otherwise an individual competition could briefly
    // look team-based and the one-shot shuffle would pick team-together.
    if (competitionId && isCompetitionInfoLoading) return;
    if (!players || players.length <= 4) return;
    if (!pairings || pairings.length > 0) return;
    autoShuffledRef.current = true;
    handleShuffleGroups();
  }, [
    isSplitRound,
    isOrganizer,
    roundStatus,
    isShuffling,
    isPairingsLoading,
    isPlayersLoading,
    hasTeamSource,
    isTeamsLoading,
    competitionId,
    isCompetitionInfoLoading,
    players,
    pairings,
    handleShuffleGroups,
  ]);

  const isLoading = isSplitRound
    ? isSubMatchesLoading || isPlayersLoading
    : isPairingsLoading || isPlayersLoading;

  // Per-sub-match best-ball contributions (best-ball rounds only). For each
  // sub-match we compute, hole-by-hole, the highest stableford points among
  // each side's players and attribute them to the contributing player.
  // Returns:
  //   - bySubMatch: per-sub-match team totals + per-player contribution map
  //   - aggregate:  team totals summed across every sub-match (drives the
  //                 mini header at the top of the tab)
  //   - hasAnyScores: at least one hole has a usable score somewhere
  const bestBallData = useMemo(() => {
    if (!isBestBallRound || !subMatches || holes.length === 0) {
      return null;
    }
    const cardByPlayer = new Map<string, ScorecardWithPlayer>();
    (scorecards || []).forEach((sc) => {
      if (sc.player_id) cardByPlayer.set(sc.player_id, sc as ScorecardWithPlayer);
    });

    const bySubMatch = new Map<
      string,
      { teamAPoints: number; teamBPoints: number; perPlayer: Map<string, number> }
    >();
    let aggregateA = 0;
    let aggregateB = 0;
    let hasAnyScores = false;

    const computeBestForSide = (playerIds: string[], hole: Hole) => {
      let best: { id: string; pts: number } | null = null;
      for (const id of playerIds) {
        const sc = cardByPlayer.get(id);
        const score = sc?.scores?.[String(hole.number)];
        if (!score) continue;
        const strokes = isSingleBallScore(score) ? score.strokes : undefined;
        if (!strokes || strokes === PICKUP_SCORE) continue;
        const handicap = sc?.player?.handicap ?? 0;
        const pts = calculateStablefordPoints(strokes, handicap, hole);
        // First-equal wins (matches BestBallScoreView convention)
        if (!best || pts > best.pts) best = { id, pts };
      }
      return best;
    };

    subMatches.forEach((sm) => {
      let teamAPoints = 0;
      let teamBPoints = 0;
      const perPlayer = new Map<string, number>();

      for (const hole of holes) {
        const aBest = computeBestForSide(sm.team_a_player_ids, hole);
        if (aBest) {
          teamAPoints += aBest.pts;
          perPlayer.set(aBest.id, (perPlayer.get(aBest.id) ?? 0) + aBest.pts);
          hasAnyScores = true;
        }
        const bBest = computeBestForSide(sm.team_b_player_ids, hole);
        if (bBest) {
          teamBPoints += bBest.pts;
          perPlayer.set(bBest.id, (perPlayer.get(bBest.id) ?? 0) + bBest.pts);
          hasAnyScores = true;
        }
      }

      bySubMatch.set(sm.id, { teamAPoints, teamBPoints, perPlayer });
      aggregateA += teamAPoints;
      aggregateB += teamBPoints;
    });

    return {
      bySubMatch,
      aggregate: { teamA: aggregateA, teamB: aggregateB },
      hasAnyScores,
    };
  }, [isBestBallRound, subMatches, scorecards, holes]);

  // Sub-tab config — memoised above any early returns to keep hook order
  // stable across renders. Only actually rendered when scoring pairs are
  // enabled (guarded at the render site below).
  const groupsSubTabs = useMemo<TabItem<GroupsSubTabKey>[]>(
    () => [
      { key: 'groups', label: isSplitRound ? 'Sub-Matches' : 'Groups' },
      { key: 'scoringPairs', label: 'Scoring Pairs' },
    ],
    [isSplitRound]
  );

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

  // Sub-tab bar only appears when the round has designated markers —
  // otherwise there's nothing to switch to. When visible it lets players
  // flip between the tee-group/sub-match list and the read-only scoring
  // pair summary.
  const showGroupsSubTabs = scoringPairsEnabled && !!roundStatus;
  const activeGroupsSubTab: GroupsSubTabKey = showGroupsSubTabs
    ? groupsSubTab
    : 'groups';

  return (
    <>
      <ScrollView contentContainerStyle={styles.scroll}>
        {showGroupsSubTabs && (
          <View style={styles.subTabsRow}>
            <Tabs<GroupsSubTabKey>
              tabs={groupsSubTabs}
              selectedTab={activeGroupsSubTab}
              onTabChange={setGroupsSubTab}
              size="small"
              testID="groups-sub-tabs"
            />
          </View>
        )}

        {activeGroupsSubTab === 'groups' && (
          <>
            {(canEditPairings ||
              (!isSplitRound && isOrganizer && showShuffleButton) ||
              (isSplitRound && isTeamRound && isOrganizer)) && (
              <View style={styles.actionRow}>
                {isSplitRound && isTeamRound && isOrganizer && (() => {
                  const isLocked =
                    roundStatus !== 'upcoming' || hasInProgressSubMatches;
                  const isDisabled =
                    isShufflingSubMatches || isLocked || teams.length < 2;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.actionButtonPrimary,
                        {
                          backgroundColor: isDisabled
                            ? colors.gray300
                            : colors.primary,
                          opacity: isShufflingSubMatches ? 0.8 : 1,
                        },
                      ]}
                      onPress={handleShuffleSubMatches}
                      disabled={isDisabled}
                      accessibilityRole="button"
                      accessibilityLabel="Shuffle sub-matches"
                      accessibilityHint={
                        isLocked
                          ? 'Disabled — round has already started'
                          : teams.length < 2
                            ? 'Disabled — needs two teams'
                            : undefined
                      }
                      accessibilityState={{ disabled: isDisabled }}
                      testID="sub-matches-shuffle-button"
                    >
                      <Icon source="shuffle-variant" size={16} color={colors.white} />
                      <Text style={[styles.actionButtonLabel, { color: colors.white }]}>
                        {isShufflingSubMatches ? 'Shuffling…' : 'Shuffle sub-matches'}
                      </Text>
                    </TouchableOpacity>
                  );
                })()}
                {canEditPairings && (
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      {
                        borderWidth: 1,
                        borderColor: colors.primary,
                        backgroundColor: colors.surface,
                      },
                    ]}
                    onPress={() => setShowEditPairingSheet(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Edit pairings"
                    testID="groups-edit-pairings-button"
                  >
                    <Icon source="account-switch" size={16} color={colors.primary} />
                    <Text
                      style={[styles.actionButtonLabel, { color: colors.primary }]}
                    >
                      Edit pairings
                    </Text>
                  </TouchableOpacity>
                )}
                {!isSplitRound && isOrganizer && showShuffleButton && (() => {
                  const isLocked = roundStatus !== 'upcoming';
                  const isDisabled = isShuffling || isLocked;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.actionButtonPrimary,
                        {
                          backgroundColor: isDisabled
                            ? colors.gray300
                            : colors.primary,
                          opacity: isShuffling ? 0.8 : 1,
                        },
                      ]}
                      onPress={handleShuffleGroups}
                      disabled={isDisabled}
                      accessibilityRole="button"
                      accessibilityLabel="Shuffle groups"
                      accessibilityHint={
                        isLocked
                          ? 'Disabled — round has already started'
                          : undefined
                      }
                      accessibilityState={{ disabled: isDisabled }}
                      testID="groups-shuffle-button"
                    >
                      <Icon source="shuffle-variant" size={16} color={colors.white} />
                      <Text style={[styles.actionButtonLabel, { color: colors.white }]}>
                        {isShuffling ? 'Shuffling…' : 'Shuffle groups'}
                      </Text>
                    </TouchableOpacity>
                  );
                })()}
              </View>
            )}

            {hasSplitContent && bestBallData?.hasAnyScores && (() => {
              const firstSm = subMatches?.[0];
              const teamADotColor = firstSm
                ? teamColorByPlayer.get(firstSm.team_a_player_ids[0]) ?? colors.success
                : colors.success;
              const teamBDotColor = firstSm
                ? teamColorByPlayer.get(firstSm.team_b_player_ids[0]) ?? colors.error
                : colors.error;
              return (
                <PairsAggregateHeader
                  mode="best-ball"
                  teamATotal={bestBallData.aggregate.teamA}
                  teamBTotal={bestBallData.aggregate.teamB}
                  teamALabel={
                    firstSm
                      ? labelForSide(
                          firstSm.team_a_player_ids,
                          'Team A',
                          teamNameByPlayer
                        )
                      : 'Team A'
                  }
                  teamBLabel={
                    firstSm
                      ? labelForSide(
                          firstSm.team_b_player_ids,
                          'Team B',
                          teamNameByPlayer
                        )
                      : 'Team B'
                  }
                  teamADotColor={teamADotColor}
                  teamBDotColor={teamBDotColor}
                />
              );
            })()}

            {hasSplitContent &&
              subMatches!.map((sm, i) => (
                <SubMatchCard
                  key={sm.id}
                  index={i}
                  subMatch={sm}
                  playerLookup={playerLookup}
                  isOrganizer={isOrganizer}
                  onForfeit={handleForfeit}
                  onPress={handleSubMatchPress}
                  onEditTeeTime={
                    roundStatus === 'upcoming' ? handleOpenTeeTimeEditor : undefined
                  }
                  strokeMode={isStrokeRound}
                  netTotalByPlayer={netTotalByPlayer}
                  bestBallContribution={bestBallData?.bySubMatch.get(sm.id)}
                  teamNameByPlayer={teamNameByPlayer}
                  teamColorByPlayer={teamColorByPlayer}
                />
              ))}

            {hasGroupContent &&
              pairingGroups.map((g) => (
                <GroupCard
                  key={g.id}
                  group={g}
                  canEditTeeTime={isOrganizer}
                  onEditTeeTime={handleOpenPairingTeeTimeEditor}
                  versusMode={isIndividualMatchPlay}
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
          </>
        )}

        {activeGroupsSubTab === 'scoringPairs' && roundStatus && (
          <View style={styles.scoringPairsInline}>
            <ScoringPairsSection
              roundId={roundId}
              scoringPairsRequired
              cardBackground={colors.surface}
              roundStatus={roundStatus}
              hideTitle
              teamNameByPlayer={teamNameByPlayer}
            />
          </View>
        )}
      </ScrollView>
      <SubMatchTeeTimePicker
        visible={!!editingTeeTimeFor}
        initialTime={parseTeeTimeToDate(editingTeeTimeFor?.tee_time ?? null)}
        onCommit={handleTeeTimeCommit}
        onCancel={() => setEditingTeeTimeFor(null)}
        testID="sub-match-tee-time-picker"
      />
      <SubMatchTeeTimePicker
        visible={!!editingPairingTeeTimeFor}
        initialTime={parseTeeTimeToDate(editingPairingTeeTimeFor?.teeTime ?? null)}
        onCommit={handlePairingTeeTimeCommit}
        onCancel={() => setEditingPairingTeeTimeFor(null)}
        testID="pairing-tee-time-picker"
      />
      <ConfirmationDialog {...dialogConfig} onCancel={dismissDialog} />

      {/* Edit Pairings sheet — opened from the Groups action row. */}
      {canEditPairings && roundFormat && roundNumber !== undefined && competitionId && (
        <EditPairingConfigSheet
          visible={showEditPairingSheet}
          onDismiss={() => setShowEditPairingSheet(false)}
          roundId={roundId}
          competitionId={competitionId}
          roundNumber={roundNumber}
          presetConfig={{
            round_format: roundFormat,
            sub_match_size: subMatchSize ?? null,
          }}
          teeTime={roundTeeTime ?? null}
          isTeamRound={isTeamRound}
          teams={teams}
          players={(players ?? []).map((p) => ({ id: p.id }))}
          initial={{
            source: pairingSource,
            style: pairingStyle ?? null,
            metric: pairingMetric ?? null,
          }}
        />
      )}
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
  /** When true and the group has exactly 2 players, render a "vs"
   *  divider between them. Used to convey individual 1v1 match-play
   *  pairings as head-to-heads rather than tee groups. */
  versusMode?: boolean;
}

function GroupCard({
  group,
  canEditTeeTime = false,
  onEditTeeTime,
  versusMode = false,
}: GroupCardProps) {
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
          <React.Fragment key={`${group.id}-${i}`}>
            <View style={styles.playerRow}>
              <View style={styles.playerNameColumn}>
                <View style={styles.playerNameRow}>
                  {typeof p.position === 'number' && (
                    <PositionPill position={p.position} />
                  )}
                  <Text
                    style={[styles.playerName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {p.name}
                  </Text>
                  {p.isCurrentUser && <YouPill />}
                </View>
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
            {versusMode && group.players.length === 2 && i === 0 && (
              <View style={styles.versusRow}>
                <View style={[styles.versusLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.versusLabel, { color: colors.textSecondary }]}>
                  vs
                </Text>
                <View style={[styles.versusLine, { backgroundColor: colors.border }]} />
              </View>
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

function YouPill() {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const bg = isDark ? `${colors.primary}33` : colors.primaryLighter;
  return (
    <View
      style={[styles.youPill, { backgroundColor: bg }]}
      accessibilityLabel="You"
    >
      <Text style={[styles.youPillText, { color: colors.primary }]}>You</Text>
    </View>
  );
}

function PositionPill({ position }: { position: number }) {
  const colors = useThemeColors();
  return (
    <View
      style={[styles.positionPill, { backgroundColor: colors.surfaceVariant }]}
      accessibilityLabel={`Competition position ${position}`}
    >
      <Text style={[styles.positionPillText, { color: colors.textSecondary }]}>
        #{position}
      </Text>
    </View>
  );
}

interface PairsAggregateHeaderProps {
  teamATotal: number;
  teamBTotal: number;
  /** 'aggregate' for stroke pairs-aggregate (lower is better — net strokes).
   *  'best-ball' for best-ball stableford (higher is better — points). */
  mode: 'aggregate' | 'best-ball';
  teamALabel?: string;
  teamBLabel?: string;
  /** Resolved dot colours for each side. When omitted, falls back to the
   *  legacy success/error theme tokens. */
  teamADotColor?: string;
  teamBDotColor?: string;
}

function PairsAggregateHeader({
  teamATotal,
  teamBTotal,
  mode,
  teamALabel = 'Team A',
  teamBLabel = 'Team B',
  teamADotColor,
  teamBDotColor,
}: PairsAggregateHeaderProps) {
  const colors = useThemeColors();
  const dotA = teamADotColor ?? colors.success;
  const dotB = teamBDotColor ?? colors.error;
  const lowerWins = mode === 'aggregate';
  const leader =
    teamATotal === teamBTotal
      ? 'tied'
      : (lowerWins ? teamATotal < teamBTotal : teamATotal > teamBTotal)
        ? 'a'
        : 'b';
  const headerLabel =
    mode === 'best-ball'
      ? 'Best-Ball · sum of best stableford points per sub-match'
      : 'Pairs Aggregate · sum of all members’ net totals';
  return (
    <View
      style={[
        styles.pairsAggregateCard,
        shadows.sm,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.pairsHeader}>
        <Icon source={mode === 'best-ball' ? 'trophy-outline' : 'sigma'} size={16} color={colors.primary} />
        <Text style={[styles.pairsLabel, { color: colors.textSecondary }]}>
          {headerLabel}
        </Text>
      </View>
      <View style={styles.pairsRow}>
        <View style={styles.pairsSide}>
          <Text
            style={[
              styles.pairsPoints,
              { color: leader === 'a' ? colors.success : colors.textPrimary },
            ]}
          >
            {teamATotal}
          </Text>
          <View style={styles.pairsSideHeader}>
            <View style={[styles.pairsSideDot, { backgroundColor: dotA }]} />
            <Text style={[styles.pairsSideLabel, { color: colors.textSecondary }]}>
              {teamALabel}
            </Text>
          </View>
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
          <View style={styles.pairsSideHeader}>
            <Text style={[styles.pairsSideLabel, { color: colors.textSecondary }]}>
              {teamBLabel}
            </Text>
            <View style={[styles.pairsSideDot, { backgroundColor: dotB }]} />
          </View>
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
  /** Tapping the card body (anywhere outside an inner button) navigates
   *  to the SubMatchDetail screen. Inner touchables (forfeit, tee-time
   *  edit) handle their own taps and don't bubble up. */
  onPress?: (sm: SubMatch) => void;
  /** Tapping the tee-time pill calls this. Only passed by the parent when
   *  the round is still `upcoming` — once the round is in-progress or
   *  completed the pill renders as a static badge. */
  onEditTeeTime?: (sm: SubMatch) => void;
  /** When true, render this card as a stroke-play pairs aggregate instead of match-play result. */
  strokeMode?: boolean;
  /** Map of playerId → net stroke total (for stroke-mode display). */
  netTotalByPlayer?: Map<string, number>;
  /** When provided, render this sub-match in best-ball mode: per-player
   *  rows show their stableford contribution and the bottom strip shows
   *  the proper sub-match best-ball totals (not a sum of player totals). */
  bestBallContribution?: {
    teamAPoints: number;
    teamBPoints: number;
    perPlayer: Map<string, number>;
  };
  /** Map of playerId → team name. Used to label each side with the actual
   *  competition team rather than the generic "Team A"/"Team B" fallback. */
  teamNameByPlayer?: Map<string, string>;
  /** Map of playerId → resolved team-colour hex. Drives the per-side dot
   *  colours so each card matches the team palette assigned at the
   *  competition level. */
  teamColorByPlayer?: Map<string, string>;
}

/**
 * Pick a display label for a sub-match side. When all players on the side
 * belong to the same competition team we use that team's name; otherwise
 * we fall back to the generic A/B label so a half-tagged side never shows
 * a misleading single-team name.
 */
function labelForSide(
  playerIds: string[],
  fallback: string,
  teamNameByPlayer: Map<string, string> | undefined
): string {
  if (!teamNameByPlayer || teamNameByPlayer.size === 0) return fallback;
  const names = playerIds
    .map((id) => teamNameByPlayer.get(id))
    .filter((n): n is string => !!n);
  if (names.length === 0) return fallback;
  const allSame = names.every((n) => n === names[0]);
  if (!allSame) return fallback;
  if (names.length !== playerIds.length) return fallback;
  return names[0];
}

function SubMatchCard({
  index,
  subMatch,
  playerLookup,
  isOrganizer,
  onForfeit,
  onPress,
  onEditTeeTime,
  strokeMode = false,
  netTotalByPlayer,
  bestBallContribution,
  teamNameByPlayer,
  teamColorByPlayer,
}: SubMatchCardProps) {
  const colors = useThemeColors();
  const teeTimePillBg = useTeeTimePillBackground();
  const canEditTeeTime = isOrganizer && !!onEditTeeTime;

  const teamAPlayers = subMatch.team_a_player_ids.map(
    (id) => playerLookup.get(id) ?? { name: 'Unknown', handicap: null }
  );
  const teamBPlayers = subMatch.team_b_player_ids.map(
    (id) => playerLookup.get(id) ?? { name: 'Unknown', handicap: null }
  );

  const teamALabel = labelForSide(
    subMatch.team_a_player_ids,
    'Team A',
    teamNameByPlayer
  );
  const teamBLabel = labelForSide(
    subMatch.team_b_player_ids,
    'Team B',
    teamNameByPlayer
  );

  // Resolve each side's dot colour from the competition team's palette.
  // Falls back to the legacy success/error tokens when no map is supplied
  // (e.g. standalone rounds that don't have stored team colours).
  const teamADotColor =
    (teamColorByPlayer && teamColorByPlayer.get(subMatch.team_a_player_ids[0])) ??
    colors.success;
  const teamBDotColor =
    (teamColorByPlayer && teamColorByPlayer.get(subMatch.team_b_player_ids[0])) ??
    colors.error;

  // Sub-team net totals (stroke rounds only). Returns null if no scores yet
  // on that side — falls back to the match-play status display.
  const teamANet = strokeMode
    ? sumNets(subMatch.team_a_player_ids, netTotalByPlayer)
    : null;
  const teamBNet = strokeMode
    ? sumNets(subMatch.team_b_player_ids, netTotalByPlayer)
    : null;

  const statusText = formatStatus(subMatch);
  const resultText = formatResult(subMatch, teamALabel, teamBLabel);
  const statusColor = resultToColor(subMatch.result, colors);

  const cardStyle = [
    styles.card,
    shadows.sm,
    { backgroundColor: colors.surface, borderColor: colors.border },
  ];

  const cardBody = (
    <>
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
        <Side
          label={teamALabel}
          dotColor={teamADotColor}
          players={teamAPlayers}
          playerIds={subMatch.team_a_player_ids}
          contributionByPlayer={bestBallContribution?.perPlayer}
        />
        <View style={styles.vsDivider}>
          <View style={[styles.vsLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.vsText, { color: colors.textSecondary }]}>VS</Text>
          <View style={[styles.vsLine, { backgroundColor: colors.border }]} />
        </View>
        <Side
          label={teamBLabel}
          dotColor={teamBDotColor}
          players={teamBPlayers}
          playerIds={subMatch.team_b_player_ids}
          contributionByPlayer={bestBallContribution?.perPlayer}
        />
      </View>

      {bestBallContribution &&
      (bestBallContribution.teamAPoints > 0 || bestBallContribution.teamBPoints > 0) ? (
        <SideTotalsStrip
          icon="trophy-outline"
          teamALabel={teamALabel}
          teamBLabel={teamBLabel}
          teamAValue={bestBallContribution.teamAPoints}
          teamBValue={bestBallContribution.teamBPoints}
          unit="pts"
        />
      ) : strokeMode && teamANet !== null && teamBNet !== null ? (
        <SideTotalsStrip
          icon="sigma"
          teamALabel={teamALabel}
          teamBLabel={teamBLabel}
          teamAValue={teamANet}
          teamBValue={teamBNet}
          unit="net"
        />
      ) : (
        <View style={[styles.statusRow, { backgroundColor: colors.surfaceVariant }]}>
          <Icon source="flag-checkered" size={16} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {resultText ?? statusText}
          </Text>
        </View>
      )}

      {isOrganizer &&
        subMatch.status !== 'completed' &&
        subMatch.status !== 'forfeited' &&
        subMatch.team_a_player_ids.length > 1 &&
        subMatch.team_b_player_ids.length > 1 && (
          <View style={[styles.forfeitRow, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.forfeitButton, { borderColor: colors.border }]}
              onPress={() => onForfeit(subMatch, 'a')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Forfeit ${teamALabel}`}
            >
              <Icon source="flag-remove-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.forfeitText, { color: colors.textSecondary }]}>
                Forfeit {teamALabel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.forfeitButton, { borderColor: colors.border }]}
              onPress={() => onForfeit(subMatch, 'b')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Forfeit ${teamBLabel}`}
            >
              <Icon source="flag-remove-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.forfeitText, { color: colors.textSecondary }]}>
                Forfeit {teamBLabel}
              </Text>
            </TouchableOpacity>
          </View>
        )}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={() => onPress(subMatch)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Open Sub-Match ${index + 1} details`}
        testID={`sub-match-${subMatch.id}-card`}
      >
        {cardBody}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{cardBody}</View>;
}

interface SideProps {
  label: string;
  dotColor: string;
  players: PlayerLookupEntry[];
  /** Player ids paired with `players` (same order). Used to look up the
   *  per-player contribution when in best-ball mode. Optional — when
   *  omitted the contribution column is hidden. */
  playerIds?: string[];
  /** Per-player best-ball contribution map. When present, renders the
   *  contributed points on the right side of each row in place of the
   *  handicap. The handicap moves inline with the player name. */
  contributionByPlayer?: Map<string, number>;
}

function Side({
  label,
  dotColor,
  players,
  playerIds,
  contributionByPlayer,
}: SideProps) {
  const colors = useThemeColors();
  const showContributions = !!contributionByPlayer;
  return (
    <View style={styles.side}>
      <View style={styles.sideHeader}>
        <View style={[styles.sideDot, { backgroundColor: dotColor }]} />
        <Text style={[styles.sideLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      {players.map((p, i) => {
        const playerId = playerIds?.[i];
        const contributed =
          playerId && contributionByPlayer
            ? contributionByPlayer.get(playerId) ?? 0
            : null;
        return (
          <View key={i} style={styles.playerRow}>
            <View style={styles.playerNameRow}>
              {typeof p.position === 'number' && (
                <PositionPill position={p.position} />
              )}
              <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
                {p.name}
              </Text>
              {p.isCurrentUser && <YouPill />}
              {/* HC inline with the name when there's a score column on the
               *  right; otherwise it stays on its own column for a more
               *  spacious look (the original layout). */}
              {showContributions && p.handicap !== null && (
                <Text style={[styles.playerHandicapInline, { color: colors.textSecondary }]}>
                  HC {p.handicap}
                </Text>
              )}
            </View>
            {showContributions ? (
              <Text style={[styles.playerContribution, { color: colors.textPrimary }]}>
                {contributed}
              </Text>
            ) : (
              p.handicap !== null && (
                <Text style={[styles.playerHandicap, { color: colors.textSecondary }]}>
                  HC {p.handicap}
                </Text>
              )
            )}
          </View>
        );
      })}
    </View>
  );
}

interface SideTotalsStripProps {
  icon: string;
  teamALabel: string;
  teamBLabel: string;
  teamAValue: number;
  teamBValue: number;
  unit: 'pts' | 'net';
}

/** Bottom-of-card team-vs-team totals strip. Two equal halves separated by
 *  a vertical divider so each team's value reads as its own block instead
 *  of running together with a `·` separator. */
function SideTotalsStrip({
  icon,
  teamALabel,
  teamBLabel,
  teamAValue,
  teamBValue,
  unit,
}: SideTotalsStripProps) {
  const colors = useThemeColors();
  const lowerWins = unit === 'net';
  const aLeads =
    teamAValue !== teamBValue && (lowerWins ? teamAValue < teamBValue : teamAValue > teamBValue);
  const bLeads =
    teamAValue !== teamBValue && (lowerWins ? teamBValue < teamAValue : teamBValue > teamAValue);
  return (
    <View style={[styles.totalsStrip, { backgroundColor: colors.surfaceVariant }]}>
      <View style={styles.totalsHalf}>
        <Icon source={icon} size={14} color={colors.primary} />
        <Text
          style={[styles.totalsLabel, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {teamALabel}
        </Text>
        <Text
          style={[
            styles.totalsValue,
            { color: aLeads ? colors.success : colors.textPrimary },
          ]}
        >
          {teamAValue}
        </Text>
      </View>
      <View style={[styles.totalsDivider, { backgroundColor: colors.border }]} />
      <View style={styles.totalsHalf}>
        <Text
          style={[
            styles.totalsValue,
            { color: bLeads ? colors.success : colors.textPrimary },
          ]}
        >
          {teamBValue}
        </Text>
        <Text
          style={[styles.totalsLabel, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {teamBLabel}
        </Text>
        <Icon source={icon} size={14} color={colors.primary} />
      </View>
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

function formatResult(
  sm: SubMatch,
  teamALabel: string = 'Team A',
  teamBLabel: string = 'Team B'
): string | null {
  if (sm.status === 'forfeited') {
    if (sm.result === 'forfeit-a') return `${teamBLabel} wins by forfeit`;
    if (sm.result === 'forfeit-b') return `${teamALabel} wins by forfeit`;
    return 'Forfeited';
  }

  if (sm.status !== 'completed' || !sm.result) return null;

  const diff = sm.final_differential;
  const diffText = diff != null && diff > 0 ? ` · +${diff}` : '';

  switch (sm.result) {
    case 'a-wins':
      return `${teamALabel} won${diffText}`;
    case 'b-wins':
      return `${teamBLabel} won${diffText}`;
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
    paddingVertical: spacing.md,
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
  scoringPairsInline: {
    marginTop: spacing.sm,
  },
  subTabsRow: {
    marginBottom: spacing.sm,
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
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  playerName: {
    ...typography.body,
    flexShrink: 1,
  },
  playerTeamLabel: {
    ...typography.caption,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  playerHandicap: {
    ...typography.caption,
  },
  playerHandicapInline: {
    ...typography.caption,
    marginLeft: spacing.xs,
  },
  playerContribution: {
    ...typography.bodyBold,
  },
  totalsStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 36,
  },
  totalsHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  totalsDivider: {
    width: StyleSheet.hairlineWidth,
  },
  totalsLabel: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  totalsValue: {
    ...typography.h3,
  },
  versusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  versusLine: {
    flex: 1,
    height: 1,
  },
  versusLabel: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  youPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  youPillText: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  positionPill: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
    minWidth: 24,
    alignItems: 'center',
  },
  positionPillText: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.2,
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
    gap: spacing.md,
  },
  pairsSide: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  pairsSideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
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
    flexShrink: 1,
    textAlign: 'center',
  },
  pairsPoints: {
    ...typography.h2,
    textAlign: 'center',
  },
  pairsDash: {
    ...typography.h3,
  },
});

export default SubMatchesTab;
