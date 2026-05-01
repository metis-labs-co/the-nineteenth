/**
 * SubMatchDetailScreen
 *
 * Tap-through detail view for a sub-match. Shows the sub-match's read-only
 * info card and a Skins card from which a competition organiser or any
 * sub-match member can configure / cancel a skins game scoped to this
 * sub-match. Designed to host other per-sub-match settings in future.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { PageHeader, LoadingSpinner, ErrorState } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import {
  useSubMatches,
  useRoundPlayers,
  useRoundDetails,
  useTeams,
  useSubMatchPermissions,
  useUpdateSubMatchTeeTime,
} from '@/hooks/rounds';
import { useCompetitionInfo } from '@/hooks/competitions';
import {
  SubMatchTeeTimePicker,
  parseTeeTimeToDate,
  formatDateToTeeTime,
} from '@/components/rounds/SubMatchTeeTimePicker';
import { SubMatchInfoCard } from './sections/SubMatchInfoCard';
import { SubMatchSkinsCard } from './sections/SubMatchSkinsCard';
import type { RootStackParamList } from '@/navigation/types';
import type {
  SubMatchSkinsPlayer,
  SubMatchSkinsTeam,
} from '@/components/skins/SubMatchSkinsConfigSheet';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'SubMatchDetail'>;

export default function SubMatchDetailScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<Route>();
  const { user } = useAuth();

  const { subMatchId, roundId, competitionId } = route.params;

  const { data: subMatches, isLoading: subMatchesLoading } = useSubMatches(roundId);
  const { data: round } = useRoundDetails(roundId);
  const { data: roundPlayers } = useRoundPlayers(roundId);
  const { data: competitionInfo } = useCompetitionInfo(competitionId);
  const { data: competitionTeams } = useTeams(competitionId ?? '');

  const subMatch = useMemo(
    () => subMatches?.find((sm) => sm.id === subMatchId) ?? null,
    [subMatches, subMatchId]
  );

  const permissions = useSubMatchPermissions(
    subMatch,
    competitionInfo?.organizer_id ?? null
  );

  // Tee-time editor state. Mirrors the flow on `SubMatchesTab` so the user
  // gets the exact same picker sheet here. Edits are organiser-only — the
  // sub-match RLS policy doesn't allow members to update tee_time.
  const { mutateAsync: updateSubMatchTeeTime } = useUpdateSubMatchTeeTime(roundId);
  const [teeTimeEditorOpen, setTeeTimeEditorOpen] = useState(false);

  const canEditTeeTime =
    !!subMatch &&
    permissions.isOrganizer &&
    subMatch.status === 'upcoming';

  const handleOpenTeeTimeEditor = useCallback(() => {
    setTeeTimeEditorOpen(true);
  }, []);

  const handleTeeTimeCommit = useCallback(
    async (selectedDate: Date) => {
      const sm = subMatch;
      setTeeTimeEditorOpen(false);
      if (!sm) return;
      try {
        await updateSubMatchTeeTime({
          subMatchId: sm.id,
          teeTime: formatDateToTeeTime(selectedDate),
        });
      } catch (err) {
        Alert.alert(
          'Unable to update tee time',
          err instanceof Error ? err.message : 'Please try again.'
        );
      }
    },
    [subMatch, updateSubMatchTeeTime]
  );

  const playerNames = useMemo(() => {
    const map = new Map<string, string>();
    (roundPlayers ?? []).forEach((p) => {
      if (p.name) map.set(p.id, p.name);
    });
    return map;
  }, [roundPlayers]);

  const skinsPlayers: SubMatchSkinsPlayer[] = useMemo(() => {
    if (!subMatch) return [];
    const a: SubMatchSkinsPlayer[] = subMatch.team_a_player_ids.map((id) => ({
      id,
      name: playerNames.get(id) ?? id.slice(0, 8),
      side: 'a',
    }));
    const b: SubMatchSkinsPlayer[] = subMatch.team_b_player_ids.map((id) => ({
      id,
      name: playerNames.get(id) ?? id.slice(0, 8),
      side: 'b',
    }));
    return [...a, ...b];
  }, [subMatch, playerNames]);

  // Team-vs-team mode is offered when (a) the round has real team records
  // and (b) every player on team A belongs to one team and every player on
  // team B belongs to a different team. If those don't line up cleanly,
  // we fall back to individual-only.
  const skinsTeams: { teamA: SubMatchSkinsTeam; teamB: SubMatchSkinsTeam } | null = useMemo(() => {
    if (!round?.is_team_round || !subMatch || !competitionTeams?.length) return null;

    const teamForPlayer = new Map<string, { id: string; name: string }>();
    competitionTeams.forEach((team) => {
      team.members.forEach((m) => {
        teamForPlayer.set(m.player_id, { id: team.id, name: team.name });
      });
    });

    const aTeams = new Set(subMatch.team_a_player_ids.map((id) => teamForPlayer.get(id)?.id));
    const bTeams = new Set(subMatch.team_b_player_ids.map((id) => teamForPlayer.get(id)?.id));

    if (aTeams.size !== 1 || bTeams.size !== 1) return null;
    const aId = [...aTeams][0];
    const bId = [...bTeams][0];
    if (!aId || !bId || aId === bId) return null;

    const teamA = competitionTeams.find((t) => t.id === aId);
    const teamB = competitionTeams.find((t) => t.id === bId);
    if (!teamA || !teamB) return null;

    return {
      teamA: { id: teamA.id, name: teamA.name },
      teamB: { id: teamB.id, name: teamB.name },
    };
  }, [round?.is_team_round, subMatch, competitionTeams]);

  if (subMatchesLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader
          title="Sub-match"
          variant="centered"
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.center}>
          <LoadingSpinner />
        </View>
      </View>
    );
  }

  if (!subMatch) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader
          title="Sub-match"
          variant="centered"
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.center}>
          <ErrorState error="Sub-match not found." />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title={`Sub-match ${subMatch.sort_order + 1}`}
        variant="centered"
        showBack
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <SubMatchInfoCard
          subMatch={subMatch}
          playerNames={playerNames}
          onEditTeeTime={canEditTeeTime ? handleOpenTeeTimeEditor : null}
        />

        <SubMatchSkinsCard
          subMatch={subMatch}
          roundId={roundId}
          players={skinsPlayers}
          teams={skinsTeams}
          currentUserId={user?.id ?? null}
          canManageSkins={permissions.canManageSkins}
        />

        {!permissions.canManageSkins ? (
          <Text
            style={[
              typography.caption,
              { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
            ]}
          >
            Only the competition organiser or a player in this sub-match can manage skins.
          </Text>
        ) : null}
      </ScrollView>

      <SubMatchTeeTimePicker
        visible={teeTimeEditorOpen}
        initialTime={parseTeeTimeToDate(subMatch.tee_time ?? null)}
        onCommit={handleTeeTimeCommit}
        onCancel={() => setTeeTimeEditorOpen(false)}
        testID="sub-match-detail-tee-time-picker"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
});
