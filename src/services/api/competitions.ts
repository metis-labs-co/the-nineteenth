/**
 * API Competition Functions
 * Functions for competition CRUD operations
 */

import { supabase } from '@/services/supabase/client';
import type {
  Competition,
  CompetitionCreateInput,
  Round,
  PlayerCreateInput,
  HandicapSystem,
  CompetitionVisibility,
  GameType,
  RoundStatus,
} from '@/types';
import type { HandicapSource } from '@/types/database/enums';
import type {
  Competition as DBCompetition,
  Round as DBRound,
  Course as DBCourse,
} from '@/types/database.types';
import type { RoundCreateInput } from './types';
import { generateInviteCode, formatDateForDB, formatTimeForDB, isValidUUID } from './helpers';
import { mapTeamModeToDb, mapTeamModeFromDb, convertPointSystemToConfig, convertPointSystemFromConfig, DEFAULT_POINT_SYSTEM } from './mappers';
import { checkCompetitionCreationPermission, checkMaxPlayersWithinTier } from './permissions';

/**
 * Create a new competition with rounds and players
 * Supports team settings: team_mode, team_size, point_system
 */
export async function createCompetition(
  input: CompetitionCreateInput & {
    rounds?: RoundCreateInput[];
    round?: { courseName?: string; date: Date; teeTime?: string };
    players: PlayerCreateInput[];
  }
): Promise<{ competition: Competition; rounds: Round[]; inviteCode: string }> {
  // Check tier-based permission before creating
  const permissionCheck = await checkCompetitionCreationPermission();
  if (!permissionCheck.allowed) {
    throw new Error(permissionCheck.error || 'You cannot create more competitions with your current plan');
  }

  // Validate organizer-chosen slot capacity against tier limit
  const capacityCheck = checkMaxPlayersWithinTier(input.maxPlayers);
  if (!capacityCheck.allowed) {
    throw new Error(capacityCheck.error || 'Player limit exceeds your plan');
  }

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('You must be logged in to create a competition');
  }

  // Use custom invite code or generate one
  const inviteCode = input.inviteCode || generateInviteCode();

  // Convert app TeamMode to DB TeamMode
  const dbTeamMode = mapTeamModeToDb(input.teamMode);

  // Convert app PointSystemEntry[] to DB PointSystemConfig
  const pointSystemConfig = input.pointSystem
    ? convertPointSystemToConfig(input.pointSystem)
    : DEFAULT_POINT_SYSTEM;

  // team_size must be null when team_mode is 'none' (database constraint)
  const teamSize = dbTeamMode === 'none' ? null : (input.teamSize || null);

  // Slot capacity + organizer-not-playing settings
  const maxPlayers = input.maxPlayers != null && input.maxPlayers > 0 ? input.maxPlayers : null;
  const lockAtCapacity = input.lockAtCapacity !== false;
  const organizerIsPlayer = input.organizerIsPlayer !== false;

  // Create competition in Supabase
  const { data: competition, error: compError } = await supabase
    .from('competitions')
    .insert({
      name: input.name,
      description: input.description || null,
      competition_type: input.competitionType || 'event',
      start_date: formatDateForDB(input.startDate),
      end_date: input.endDate ? formatDateForDB(input.endDate) : null,
      handicap_system: input.handicapSystem as HandicapSystem,
      handicap_source: (input.handicapSource || 'profile') as HandicapSource,
      visibility: (input.visibility || 'private') as CompetitionVisibility,
      invite_code: inviteCode,
      organizer_id: user.id,
      status: 'upcoming',
      // Team settings
      team_mode: dbTeamMode,
      team_size: teamSize,
      point_system: pointSystemConfig,
      // Slot capacity + organizer-not-playing
      max_players: maxPlayers,
      lock_at_capacity: lockAtCapacity,
      organizer_is_player: organizerIsPlayer,
    } as unknown as never)
    .select()
    .single();

  if (compError) {
    throw new Error(`Failed to create competition: ${compError.message}`);
  }

  const comp = competition as DBCompetition;

  // Normalize rounds input
  const roundsInput = input.rounds || (input.round ? [input.round] : []);
  const createdRounds: Round[] = [];

  // Create rounds
  for (let i = 0; i < roundsInput.length; i++) {
    const roundInput = roundsInput[i];

    // Handle course_id - can now be null for "blank" placeholder rounds
    let courseId: string | null = (roundInput as { courseId?: string }).courseId || null;

    // Only create/lookup course if we have a courseName but no valid courseId
    if (roundInput.courseName && (!courseId || !isValidUUID(courseId))) {
      // Create a new course entry for this round
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .insert({
          name: roundInput.courseName,
          source: 'manual',
        } as unknown as never)
        .select()
        .single();

      if (courseError) {
        throw new Error(`Failed to create course: ${courseError.message}`);
      }
      courseId = (course as DBCourse).id;
    }
    // If no courseName and no courseId, courseId stays null (blank round)

    // Determine game type: use gameType if provided, otherwise matchType, fallback to 'stableford'
    const gameType = (roundInput as RoundCreateInput).gameType
      || ((roundInput as { matchType?: string }).matchType as GameType)
      || 'stableford';

    // Determine team settings for the round
    const isTeamRound = (roundInput as RoundCreateInput).isTeamRound ?? false;
    const teamFormat = (roundInput as RoundCreateInput).teamFormat ?? null;
    const scoringPairsRequired = (roundInput as RoundCreateInput).scoringPairsRequired ?? false;

    const roundInsertPayload = {
      competition_id: comp.id,
      round_number: i + 1,
      course_id: courseId,
      date: formatDateForDB(roundInput.date),
      tee_time: formatTimeForDB(roundInput.teeTime || ''),
      game_type: gameType as GameType,
      is_team_round: isTeamRound,
      team_format: teamFormat,
      scoring_pairs_required: scoringPairsRequired,
      selected_tee: (roundInput as RoundCreateInput).selectedTee || null,
      status: 'upcoming' as RoundStatus,
    };
    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .insert(roundInsertPayload as unknown as never)
      .select()
      .single();

    if (roundError) {
      throw new Error(`Failed to create round: ${roundError.message}`);
    }

    const dbRound = round as DBRound;
    createdRounds.push({
      id: dbRound.id,
      competitionId: dbRound.competition_id ?? '',
      roundNumber: dbRound.round_number,
      courseId: dbRound.course_id ?? undefined, // Can be null for blank rounds
      date: dbRound.date ? new Date(dbRound.date) : undefined,
      teeTime: dbRound.tee_time ?? undefined,
      gameType: dbRound.game_type,
      status: dbRound.status,
      createdAt: new Date(dbRound.created_at),
      updatedAt: new Date(dbRound.updated_at),
    });
  }

  // Add the organizer as a player only when they're playing in this competition.
  if (organizerIsPlayer) {
    const { error: orgPlayerError } = await supabase
      .from('competition_players')
      .insert({
        competition_id: comp.id,
        player_id: user.id,
        status: 'accepted',
        invited_at: new Date().toISOString(),
      } as unknown as never);

    if (orgPlayerError) {
      console.warn('[API] Could not add organizer as player:', orgPlayerError.message);
      // Don't fail the whole operation if this fails
    }
  }

  // Add existing players (those with valid IDs) to competition_players
  // These are friends who already have accounts and were selected in the wizard
  const existingPlayers = input.players.filter((p) => p.id);

  if (existingPlayers.length > 0) {
    const competitionPlayersData = existingPlayers
      .filter((p) => !organizerIsPlayer || p.id !== user.id) // Avoid duplicating organizer when they're already added above
      .map((player) => ({
        competition_id: comp.id,
        player_id: player.id,
        status: 'accepted' as const,
        invited_at: new Date().toISOString(),
        responded_at: new Date().toISOString(), // Auto-accepted since they were pre-selected
      }));

    if (competitionPlayersData.length > 0) {
      const { error: playersError } = await supabase
        .from('competition_players')
        .insert(competitionPlayersData as unknown as never);

      // playersError is non-fatal - players can still join via invite code
    }
  }

  // Auto-fill remaining slots with placeholder players when a capacity is set.
  // This lets the organizer configure teams, pairings, and 2v2 round types
  // before any real players join — real players replace placeholders on join
  // via the claim_competition_placeholder RPC.
  if (maxPlayers != null && maxPlayers > 0) {
    const { count: currentCount, error: countError } = await supabase
      .from('competition_players')
      .select('*', { count: 'exact', head: true })
      .eq('competition_id', comp.id)
      .eq('status', 'accepted');

    if (!countError) {
      const slotsToFill = Math.max(0, maxPlayers - (currentCount ?? 0));
      for (let i = 0; i < slotsToFill; i++) {
        const slotNumber = (currentCount ?? 0) + i + 1;
        const { data: placeholderId, error: createError } = await supabase.rpc(
          'create_placeholder_player' as never,
          {
            p_name: `Player ${slotNumber}`,
            p_handicap: null,
          } as never
        );

        if (createError || !placeholderId) {
          console.warn(
            '[API] Could not create placeholder slot',
            slotNumber,
            createError?.message
          );
          break;
        }

        const { error: joinError } = await supabase
          .from('competition_players')
          .insert({
            competition_id: comp.id,
            player_id: placeholderId as unknown as string,
            status: 'accepted' as const,
            invited_at: new Date().toISOString(),
            responded_at: new Date().toISOString(),
          } as unknown as never);

        if (joinError) {
          console.warn(
            '[API] Could not attach placeholder slot',
            slotNumber,
            joinError.message
          );
          // Stop trying — the placeholder row remains in players but un-attached;
          // it won't affect the competition.
          break;
        }
      }
    }
  }

  const result = {
    competition: {
      id: comp.id,
      name: comp.name,
      description: comp.description ?? undefined,
      competitionType: input.competitionType || 'event',
      startDate: new Date(comp.start_date),
      endDate: comp.end_date ? new Date(comp.end_date) : undefined,
      handicapSystem: comp.handicap_system,
      visibility: comp.visibility,
      inviteCode: comp.invite_code,
      organizerId: comp.organizer_id,
      status: comp.status,
      // Team settings
      teamMode: mapTeamModeFromDb(comp.team_mode),
      teamSize: comp.team_size ?? undefined,
      pointSystem: convertPointSystemFromConfig(comp.point_system),
      // Slot capacity + organizer-not-playing
      maxPlayers: comp.max_players ?? null,
      lockAtCapacity: comp.lock_at_capacity ?? true,
      organizerIsPlayer: comp.organizer_is_player ?? true,
      createdAt: new Date(comp.created_at),
      updatedAt: new Date(comp.updated_at),
    },
    rounds: createdRounds,
    inviteCode: comp.invite_code,
  };

  return result;
}

/** Map a DB competition row to the domain Competition shape. */
function mapDbCompetitionToCompetition(c: DBCompetition): Competition {
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? undefined,
    competitionType: 'event' as const, // Default for existing competitions
    startDate: new Date(c.start_date),
    endDate: c.end_date ? new Date(c.end_date) : undefined,
    handicapSystem: c.handicap_system,
    visibility: c.visibility,
    inviteCode: c.invite_code,
    organizerId: c.organizer_id,
    status: c.status,
    // Team settings
    teamMode: mapTeamModeFromDb(c.team_mode),
    teamSize: c.team_size ?? undefined,
    pointSystem: convertPointSystemFromConfig(c.point_system),
    // Slot capacity + organizer-not-playing
    maxPlayers: c.max_players ?? null,
    lockAtCapacity: c.lock_at_capacity ?? true,
    organizerIsPlayer: c.organizer_is_player ?? true,
    createdAt: new Date(c.created_at),
    updatedAt: new Date(c.updated_at),
  };
}

/**
 * Get all competitions the current user can see: ones they **organize** OR ones
 * they've **joined as an accepted player**.
 *
 * Participant membership lives in `competition_players`, so this requires two
 * queries unioned. The previous single `.or('organizer_id.eq...')` returned
 * organizer competitions only — joined competitions never appeared on the Home
 * screen and join-only users were misclassified as new. Soft-deleted rows
 * (`deleted_at`) are filtered from both.
 */
export async function getCompetitions(): Promise<Competition[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  const [organizedResult, joinedResult] = await Promise.all([
    supabase
      .from('competitions')
      .select('*')
      .eq('organizer_id', user.id)
      .is('deleted_at', null),
    supabase
      .from('competition_players')
      .select('competition:competitions!inner(*)')
      .eq('player_id', user.id)
      .eq('status', 'accepted')
      .is('competition.deleted_at', null),
  ]);

  if (organizedResult.error) {
    console.error('[API] Error fetching organized competitions:', organizedResult.error);
    throw new Error(`Failed to fetch competitions: ${organizedResult.error.message}`);
  }
  if (joinedResult.error) {
    console.error('[API] Error fetching joined competitions:', joinedResult.error);
    throw new Error(`Failed to fetch competitions: ${joinedResult.error.message}`);
  }

  // Merge, de-duplicating by id (an organizer may also have a player row).
  const byId = new Map<string, DBCompetition>();
  for (const c of (organizedResult.data ?? []) as DBCompetition[]) {
    byId.set(c.id, c);
  }
  const joinedRows = (joinedResult.data ?? []) as unknown as {
    competition: DBCompetition | null;
  }[];
  for (const row of joinedRows) {
    if (row.competition) byId.set(row.competition.id, row.competition);
  }

  return Array.from(byId.values()).map(mapDbCompetitionToCompetition);
}

/**
 * Get a single competition by ID
 */
export async function getCompetition(id: string): Promise<Competition | null> {

  // Filter out soft-deleted competitions
  const { data: competition, error } = await supabase
    .from('competitions')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('[API] Error fetching competition:', error);
    throw new Error(`Failed to fetch competition: ${error.message}`);
  }

  const c = competition as DBCompetition;
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? undefined,
    competitionType: 'event' as const, // Default for existing competitions
    startDate: new Date(c.start_date),
    endDate: c.end_date ? new Date(c.end_date) : undefined,
    handicapSystem: c.handicap_system,
    visibility: c.visibility,
    inviteCode: c.invite_code,
    organizerId: c.organizer_id,
    status: c.status,
    // Team settings
    teamMode: mapTeamModeFromDb(c.team_mode),
    teamSize: c.team_size ?? undefined,
    pointSystem: convertPointSystemFromConfig(c.point_system),
    // Slot capacity + organizer-not-playing
    maxPlayers: c.max_players ?? null,
    lockAtCapacity: c.lock_at_capacity ?? true,
    organizerIsPlayer: c.organizer_is_player ?? true,
    createdAt: new Date(c.created_at),
    updatedAt: new Date(c.updated_at),
  };
}
