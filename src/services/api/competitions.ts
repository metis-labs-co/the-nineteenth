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
import type {
  Competition as DBCompetition,
  Round as DBRound,
  Course as DBCourse,
} from '@/types/database.types';
import type { RoundCreateInput } from './types';
import { generateInviteCode, formatDateForDB, formatTimeForDB, isValidUUID } from './helpers';
import { mapTeamModeToDb, mapTeamModeFromDb, convertPointSystemToConfig, convertPointSystemFromConfig, DEFAULT_POINT_SYSTEM } from './mappers';
import { checkCompetitionCreationPermission } from './permissions';

/**
 * Create a new competition with rounds and players
 * Supports team settings: team_mode, team_size, point_system
 */
export async function createCompetition(
  input: CompetitionCreateInput & {
    rounds?: RoundCreateInput[];
    round?: { courseName: string; date: Date; teeTime?: string };
    players: PlayerCreateInput[];
  }
): Promise<{ competition: Competition; rounds: Round[]; inviteCode: string }> {
  console.log('[API] Creating competition:', input);

  // Check tier-based permission before creating
  const permissionCheck = await checkCompetitionCreationPermission();
  if (!permissionCheck.allowed) {
    throw new Error(permissionCheck.error || 'You cannot create more competitions with your current plan');
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

  // Create competition in Supabase
  const { data: competition, error: compError } = await supabase
    .from('competitions')
    .insert({
      name: input.name,
      description: input.description || null,
      start_date: formatDateForDB(input.startDate),
      end_date: input.endDate ? formatDateForDB(input.endDate) : null,
      handicap_system: input.handicapSystem as HandicapSystem,
      visibility: (input.visibility || 'private') as CompetitionVisibility,
      invite_code: inviteCode,
      organizer_id: user.id,
      status: 'upcoming',
      // Team settings
      team_mode: dbTeamMode,
      team_size: teamSize,
      point_system: pointSystemConfig,
    } as unknown as never)
    .select()
    .single();

  if (compError) {
    console.error('[API] Error creating competition:', compError);
    throw new Error(`Failed to create competition: ${compError.message}`);
  }

  const comp = competition as DBCompetition;
  console.log('[API] Competition created:', comp);

  // Normalize rounds input
  const roundsInput = input.rounds || (input.round ? [input.round] : []);
  const createdRounds: Round[] = [];

  // Create rounds
  for (let i = 0; i < roundsInput.length; i++) {
    const roundInput = roundsInput[i];

    // Ensure course exists - if courseId is provided, use it; otherwise create a placeholder
    let courseId = (roundInput as { courseId?: string }).courseId;

    if (!courseId || !isValidUUID(courseId)) {
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
        console.error('[API] Error creating course:', courseError);
        throw new Error(`Failed to create course: ${courseError.message}`);
      }
      courseId = (course as DBCourse).id;
    }

    // Determine game type: use gameType if provided, otherwise matchType, fallback to 'stableford'
    const gameType = (roundInput as RoundCreateInput).gameType
      || ((roundInput as { matchType?: string }).matchType as GameType)
      || 'stableford';

    // Determine team settings for the round
    const isTeamRound = (roundInput as RoundCreateInput).isTeamRound ?? false;
    const teamFormat = (roundInput as RoundCreateInput).teamFormat ?? null;
    const scoringPairsRequired = (roundInput as RoundCreateInput).scoringPairsRequired ?? false;

    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .insert({
        competition_id: comp.id,
        round_number: i + 1,
        course_id: courseId,
        date: formatDateForDB(roundInput.date),
        tee_time: formatTimeForDB(roundInput.teeTime || ''),
        game_type: gameType as GameType,
        is_team_round: isTeamRound,
        team_format: teamFormat,
        scoring_pairs_required: scoringPairsRequired,
        status: 'upcoming' as RoundStatus,
      } as unknown as never)
      .select()
      .single();

    if (roundError) {
      console.error('[API] Error creating round:', roundError);
      throw new Error(`Failed to create round: ${roundError.message}`);
    }

    const dbRound = round as DBRound;
    createdRounds.push({
      id: dbRound.id,
      competitionId: dbRound.competition_id ?? '',
      roundNumber: dbRound.round_number,
      courseId: dbRound.course_id,
      date: dbRound.date ? new Date(dbRound.date) : undefined,
      teeTime: dbRound.tee_time ?? undefined,
      gameType: dbRound.game_type,
      status: dbRound.status,
      createdAt: new Date(dbRound.created_at),
      updatedAt: new Date(dbRound.updated_at),
    });
  }

  // Add the organizer as a player in the competition
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

  // Note: For MVP, we're not creating player records for other players
  // since they need to have auth accounts first. Instead, they'll join via invite code.
  // The player list from the wizard is informational for the organizer.
  console.log('[API] Players to invite:', input.players);

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
      createdAt: new Date(comp.created_at),
      updatedAt: new Date(comp.updated_at),
    },
    rounds: createdRounds,
    inviteCode: comp.invite_code,
  };

  console.log('[API] Competition created successfully:', result);
  return result;
}

/**
 * Get all competitions for the current user
 */
export async function getCompetitions(): Promise<Competition[]> {
  console.log('[API] Fetching competitions');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  // Get competitions where user is organizer or player
  // Filter out soft-deleted competitions (deleted_at IS NULL)
  const { data: competitions, error } = await supabase
    .from('competitions')
    .select('*')
    .or(`organizer_id.eq.${user.id}`)
    .is('deleted_at', null);

  if (error) {
    console.error('[API] Error fetching competitions:', error);
    throw new Error(`Failed to fetch competitions: ${error.message}`);
  }

  return ((competitions || []) as DBCompetition[]).map((c) => ({
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
    createdAt: new Date(c.created_at),
    updatedAt: new Date(c.updated_at),
  }));
}

/**
 * Get a single competition by ID
 */
export async function getCompetition(id: string): Promise<Competition | null> {
  console.log('[API] Fetching competition:', id);

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
    createdAt: new Date(c.created_at),
    updatedAt: new Date(c.updated_at),
  };
}
