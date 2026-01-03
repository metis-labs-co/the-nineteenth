/**
 * Supabase Edge Function: generate-competition
 *
 * Generates a golf competition configuration from a natural language prompt
 * using Claude AI.
 *
 * COMBINED FILE - Paste this entire file into Supabase Dashboard > Edge Functions > generate-competition
 *
 * Before deploying, set the secret:
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxx
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.27.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// ============================================================================
// TYPES
// ============================================================================

// Game type enum matching the app's database enums
type GameType =
  | 'stroke'
  | 'stableford'
  | 'match-play'
  | 'ambrose'
  | 'best-ball'
  | 'scramble';

// Team mode enum
type TeamMode = 'none' | 'fixed' | 'per-round';

// Handicap system enum
type HandicapSystem = 'honor' | 'golf-australia' | 'gross-only';

// Competition type enum
type CompetitionType = 'league' | 'event';

/**
 * Friend data passed from mobile app
 */
interface FriendInput {
  id: string;
  name: string;
  handicap: number | null;
}

/**
 * Existing placeholder player data passed from mobile app
 */
interface PlaceholderInput {
  id: string;
  name: string;
  handicap: number | null;
}

/**
 * Tier limits passed from mobile app
 */
interface TierLimitsInput {
  maxRounds: number;
  maxPlayers: number;
  allowedGameTypes: GameType[];
}

/**
 * Favorite course passed from mobile app
 */
interface FavoriteCourseInput {
  id: string;
  name: string;
  venue_id: string;
  venue_name: string;
  state: string;
  city: string | null;
}

/**
 * Request body from mobile app
 */
interface GenerateCompetitionRequest {
  prompt: string;
  friends: FriendInput[];
  tierLimits: TierLimitsInput;
  favoriteCourses?: FavoriteCourseInput[];
  placeholderPlayers?: PlaceholderInput[];
}

/**
 * Course search result from database
 */
interface CourseSearchResult {
  id: string;
  name: string;
  venue_id: string;
  venue_name: string;
  state: string;
  city: string | null;
}

/**
 * Generated round from Claude
 */
interface GeneratedRound {
  roundNumber: number;
  courseId: string | null;
  courseName: string;
  venueName: string;
  date: string; // DD/MM/YYYY format
  teeTime: string | null; // HH:MM format
  gameType: GameType;
  courseNotFound?: boolean;
}

/**
 * Generated player selection from Claude
 */
interface GeneratedPlayer {
  id: string;
  name: string;
  handicap: number | null;
  isPlaceholder?: boolean; // True if this is a new placeholder to be created
}

/**
 * Generated team from Claude
 */
interface GeneratedTeam {
  name: string;
  playerIds: string[];
}

/**
 * Complete generated competition from Claude
 */
interface GeneratedCompetition {
  name: string;
  description: string | null;
  competitionType: CompetitionType;
  startDate: string; // DD/MM/YYYY format
  endDate: string | null; // DD/MM/YYYY format
  handicapSystem: HandicapSystem;
  teamMode: TeamMode;
  teamSize: number | null;
  rounds: GeneratedRound[];
  players: GeneratedPlayer[];
  teams?: GeneratedTeam[];
  assumptions?: string[];
  validationErrors?: string[];
}

/**
 * Success response to mobile app
 */
interface GenerateCompetitionSuccessResponse {
  success: true;
  competition: GeneratedCompetition;
}

/**
 * Error response to mobile app
 */
interface GenerateCompetitionErrorResponse {
  success: false;
  error: string;
  code:
    | 'INVALID_REQUEST'
    | 'AUTH_ERROR'
    | 'CLAUDE_ERROR'
    | 'PARSE_ERROR'
    | 'VALIDATION_ERROR'
    | 'INTERNAL_ERROR';
  details?: string;
}

type GenerateCompetitionResponse =
  | GenerateCompetitionSuccessResponse
  | GenerateCompetitionErrorResponse;

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// Enum schemas matching the app's types
const gameTypeSchema = z.enum([
  'stroke',
  'stableford',
  'match-play',
  'ambrose',
  'best-ball',
  'scramble',
]);

const teamModeSchema = z.enum(['none', 'fixed', 'per-round']);

const handicapSystemSchema = z.enum(['honor', 'golf-australia', 'gross-only']);

const competitionTypeSchema = z.enum(['league', 'event']);

// Date format: DD/MM/YYYY
const dateFormatRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;

// Time format: HH:MM (24-hour)
const timeFormatRegex = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Schema for a generated round
 */
const generatedRoundSchema = z.object({
  roundNumber: z.number().int().min(1),
  courseId: z.string().uuid().nullable(),
  courseName: z.string().min(1),
  venueName: z.string().min(1),
  date: z.string().regex(dateFormatRegex, 'Date must be in DD/MM/YYYY format'),
  teeTime: z
    .string()
    .regex(timeFormatRegex, 'Time must be in HH:MM format')
    .nullable(),
  gameType: gameTypeSchema,
  courseNotFound: z.boolean().optional(),
});

/**
 * Schema for a generated player
 */
const generatedPlayerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  handicap: z.number().min(-5).max(54).nullable(),
  isPlaceholder: z.boolean().optional(), // True if this is a new placeholder to be created
});

/**
 * Schema for a generated team
 */
const generatedTeamSchema = z.object({
  name: z.string().min(1).max(50),
  playerIds: z.array(z.string().uuid()).min(2),
});

/**
 * Complete schema for generated competition from Claude
 */
const generatedCompetitionSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).nullable(),
  competitionType: competitionTypeSchema,
  startDate: z
    .string()
    .regex(dateFormatRegex, 'Start date must be in DD/MM/YYYY format'),
  endDate: z
    .string()
    .regex(dateFormatRegex, 'End date must be in DD/MM/YYYY format')
    .nullable(),
  handicapSystem: handicapSystemSchema,
  teamMode: teamModeSchema,
  teamSize: z.number().int().min(2).max(4).nullable(),
  rounds: z.array(generatedRoundSchema).min(1),
  players: z.array(generatedPlayerSchema).min(2),
  teams: z.array(generatedTeamSchema).optional(),
  assumptions: z.array(z.string()).optional(),
  validationErrors: z.array(z.string()).optional(),
});

/**
 * Schema for a favorite course from mobile app
 */
const favoriteCourseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  venue_id: z.string().uuid(),
  venue_name: z.string().min(1),
  state: z.string().min(1),
  city: z.string().nullable(),
});

/**
 * Schema for a placeholder player from mobile app
 */
const placeholderPlayerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  handicap: z.number().nullable(),
});

/**
 * Schema for request body from mobile app
 */
const requestBodySchema = z.object({
  prompt: z.string().min(10).max(2000),
  friends: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
      handicap: z.number().nullable(),
    })
  ),
  tierLimits: z.object({
    maxRounds: z.number().int().min(1),
    maxPlayers: z.number().int().min(2),
    allowedGameTypes: z.array(gameTypeSchema),
  }),
  favoriteCourses: z.array(favoriteCourseSchema).optional(),
  placeholderPlayers: z.array(placeholderPlayerSchema).optional(),
});

// ============================================================================
// CLAUDE PROMPTS
// ============================================================================

/**
 * Build the system prompt for Claude
 */
function buildSystemPrompt(): string {
  return `You are an AI assistant that helps create golf competitions for an Australian golf app called "The Nineteenth". You will receive:
1. A user's natural language description of their desired competition
2. A list of their friends (with handicaps) who can be added as players
3. A list of existing placeholder/guest players they've previously created
4. Available golf courses from the database that match their request
5. The user's subscription tier limits

Your task is to generate a complete competition configuration in JSON format.

## Output Schema
You MUST return valid JSON matching this exact schema:
{
  "name": "string - Competition name (inferred or explicitly stated, max 100 chars)",
  "description": "string | null - Brief description (max 500 chars)",
  "competitionType": "event" | "league",
  "startDate": "DD/MM/YYYY - First round date (Australian format)",
  "endDate": "DD/MM/YYYY | null - Last round date (for events only)",
  "handicapSystem": "honor" | "golf-australia" | "gross-only",
  "teamMode": "none" | "fixed" | "per-round",
  "teamSize": number | null (2-4 when teams enabled, null otherwise),
  "rounds": [
    {
      "roundNumber": number (1, 2, 3...),
      "courseId": "UUID from available courses" | null,
      "courseName": "string",
      "venueName": "string",
      "date": "DD/MM/YYYY",
      "teeTime": "HH:MM (24hr format)" | null,
      "gameType": "stableford" | "stroke" | "match-play" | "ambrose" | "best-ball" | "scramble",
      "courseNotFound": true (only if course wasn't in available list)
    }
  ],
  "players": [
    {
      "id": "UUID from friends/placeholders list OR generated UUID for new placeholders",
      "name": "string",
      "handicap": number | null,
      "isPlaceholder": boolean (true if this is a NEW placeholder to be created, false/omit for existing friends/placeholders)
    }
  ],
  "teams": [
    {
      "name": "string (e.g., 'Team A', 'The Eagles')",
      "playerIds": ["UUID", "UUID", ...]
    }
  ],
  "assumptions": ["string - any assumptions you made about unclear requirements"],
  "validationErrors": ["string - any issues that prevent creating the competition"]
}

## Critical Rules
1. ONLY use courseId values from the provided "Available Courses" list
2. For players, use this priority order:
   a. FIRST use player IDs from the "Friends" list (real users)
   b. THEN use player IDs from the "Existing Placeholder Players" list
   c. FINALLY, if more players are needed, CREATE new placeholder players with generated UUIDs and isPlaceholder: true
3. Dates MUST be in Australian format DD/MM/YYYY
4. Start dates should be today or in the future (you'll be given today's date)
5. If multiple courses at the same venue, use their different courseId values for each round
6. Team sizes must evenly divide total player count
7. Game types must be from the allowed list based on user's tier
8. Number of rounds must not exceed the tier limit
9. Number of players must not exceed the tier limit
10. Default to "honor" handicap system unless user specifies otherwise
11. Default to "stableford" game type unless user specifies otherwise
12. Default to competitionType "event" for finite competitions, "league" for ongoing ones

## Placeholder Player Rules
- When the user specifies a number of players (e.g., "8 players") and doesn't have enough friends, fill the remaining spots with placeholder players
- For NEW placeholder players (not from existing list), set isPlaceholder: true and generate a valid UUID v4 for their id
- Name new placeholders as "Player 2", "Player 3", etc. (starting from 2, assuming Player 1 is the organizer)
- ALWAYS prioritize using existing friends first, then existing placeholders, then create new placeholders
- New placeholder players should have handicap: null (they can set it later)
- If user says "for 4 players" and has 1 friend, use the friend and create 2 new placeholders (total 4 including organizer)

## Course Selection Priority
1. If the user mentions a specific course/venue name, use that course if found in "Available Courses"
2. If no specific course is mentioned AND "Favorite Courses" are available, use a favorite course
3. If multiple rounds are needed, rotate through favorite courses if available
4. If no favorites and no match, set courseId to null and courseNotFound to true

## Handling Missing Information
- If venue/course not found in available list: Set courseId to null and include "courseNotFound": true
- If not enough friends for requested teams: Add to "validationErrors" array
- If game type not allowed for user's tier: Substitute with allowed type and note in "assumptions"
- If ambiguous request: Make reasonable assumptions and document them in "assumptions" array

## Team Formation
When forming teams:
- CRITICAL: Each team MUST have EXACTLY teamSize players (e.g., if teamSize is 2, every team must have exactly 2 playerIds)
- Total players MUST be evenly divisible by teamSize. If not, reduce the number of players to make it evenly divisible
- Try to balance teams by handicap (sum of handicaps should be similar)
- Give teams descriptive names if not specified (e.g., "Team 1", "Team 2" or creative names)
- Ensure all selected players are assigned to exactly one team
- Example: If teamSize=2 and you have 5 players, you must either use 4 players (2 teams of 2) or add to validationErrors

## Date Handling
- If user says "next Saturday", calculate from today's date
- If user says "this weekend", use the coming Saturday
- If no dates specified, start from the next Saturday and space rounds appropriately
- For multi-round events, space rounds 1 week apart unless specified otherwise

## Response Format
Return ONLY valid JSON. No markdown code blocks, no explanations, no additional text.
The response must be parseable by JSON.parse() directly.`;
}

/**
 * Build the user message with context
 */
function buildUserMessage(
  prompt: string,
  friends: FriendInput[],
  courses: CourseSearchResult[],
  tierLimits: TierLimitsInput,
  todayDate: string,
  favoriteCourses: FavoriteCourseInput[] = [],
  placeholderPlayers: PlaceholderInput[] = []
): string {
  const friendsList = friends
    .map(
      (f) =>
        `- ${f.name} (ID: ${f.id}, Handicap: ${f.handicap !== null ? f.handicap : 'N/A'})`
    )
    .join('\n');

  const placeholdersList = placeholderPlayers
    .map(
      (p) =>
        `- ${p.name} (ID: ${p.id}, Handicap: ${p.handicap !== null ? p.handicap : 'N/A'})`
    )
    .join('\n');

  const coursesList =
    courses.length > 0
      ? courses
          .map(
            (c) =>
              `- ${c.venue_name} - ${c.name} (ID: ${c.id}, Location: ${c.city || 'Unknown'}, ${c.state})`
          )
          .join('\n')
      : 'No matching courses found in database.';

  const favoritesList =
    favoriteCourses.length > 0
      ? favoriteCourses
          .map(
            (c) =>
              `- ${c.venue_name} - ${c.name} (ID: ${c.id}, Location: ${c.city || 'Unknown'}, ${c.state})`
          )
          .join('\n')
      : 'No favorite courses saved.';

  const allowedGameTypes = tierLimits.allowedGameTypes.join(', ');

  // Calculate total available players (friends + existing placeholders)
  const totalAvailable = friends.length + placeholderPlayers.length;

  return `## User Request
${prompt}

## Today's Date
${todayDate}

## Friends (${friends.length} available)
${friendsList || 'No friends available - you may need to create placeholder players'}

## Existing Placeholder Players (${placeholderPlayers.length} available - USE THESE before creating new placeholders)
${placeholdersList || 'No existing placeholder players'}

## Total Available Players
${totalAvailable} (friends + existing placeholders). If more players are needed based on user request, create NEW placeholder players with isPlaceholder: true.

## Favorite Courses (User's preferred courses - USE THESE if no specific course mentioned)
${favoritesList}

## Available Courses (From search matching user's prompt)
${coursesList}

## Tier Limits
- Maximum rounds per competition: ${tierLimits.maxRounds}
- Maximum players per competition: ${tierLimits.maxPlayers}
- Allowed game types: ${allowedGameTypes}

Please generate the competition configuration based on the user's request. If the user requests more players than available friends/placeholders, create new placeholder players to fill the spots.`;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// CORS headers for mobile app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

/**
 * Extract potential venue/course keywords from the prompt
 */
function extractCourseKeywords(prompt: string): string[] {
  // Common words to filter out
  const stopWords = new Set([
    'at',
    'the',
    'a',
    'an',
    'in',
    'on',
    'for',
    'with',
    'and',
    'or',
    'of',
    'to',
    'create',
    'competition',
    'round',
    'rounds',
    'golf',
    'course',
    'club',
    'my',
    'friends',
    'team',
    'teams',
    'player',
    'players',
    'should',
    'this',
    'that',
    'which',
    'need',
    'want',
    'like',
    'split',
    'between',
    'mixture',
    'mix',
    'stableford',
    'stroke',
    'match',
    'play',
    'best',
    'ball',
    'scramble',
    'ambrose',
  ]);

  // Look for capitalized words (likely proper nouns/place names)
  const capitalizedPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g;
  const matches = prompt.match(capitalizedPattern) || [];

  // Also look for words after "at" which often indicate venue
  const atPattern = /\bat\s+([A-Za-z]+(?:\s+[A-Za-z]+)*)/gi;
  let atMatch;
  while ((atMatch = atPattern.exec(prompt)) !== null) {
    matches.push(atMatch[1]);
  }

  // Filter and deduplicate
  const keywords = [
    ...new Set(
      matches
        .map((m) => m.trim())
        .filter((m) => m.length >= 3)
        .filter((m) => !stopWords.has(m.toLowerCase()))
    ),
  ];

  return keywords;
}

/**
 * Search for courses matching keywords in the database
 */
async function searchCourses(
  supabase: ReturnType<typeof createClient>,
  keywords: string[]
): Promise<CourseSearchResult[]> {
  if (keywords.length === 0) {
    return [];
  }

  const results: CourseSearchResult[] = [];

  for (const keyword of keywords) {
    // Search venues by name (case-insensitive)
    const { data: venues, error: venueError } = await supabase
      .from('venues')
      .select(
        `
        id,
        name,
        state,
        city,
        courses (
          id,
          name
        )
      `
      )
      .ilike('name', `%${keyword}%`)
      .limit(5);

    if (venueError) {
      console.error('Error searching venues:', venueError);
      continue;
    }

    // Flatten venues with their courses
    for (const venue of venues || []) {
      for (const course of venue.courses || []) {
        // Avoid duplicates
        if (!results.find((r) => r.id === course.id)) {
          results.push({
            id: course.id,
            name: course.name,
            venue_id: venue.id,
            venue_name: venue.name,
            state: venue.state,
            city: venue.city,
          });
        }
      }
    }

    // Also search courses directly by name
    const { data: courses, error: courseError } = await supabase
      .from('courses')
      .select(
        `
        id,
        name,
        venue_id,
        venues!inner (
          id,
          name,
          state,
          city
        )
      `
      )
      .ilike('name', `%${keyword}%`)
      .limit(5);

    if (courseError) {
      console.error('Error searching courses:', courseError);
      continue;
    }

    for (const course of courses || []) {
      if (!results.find((r) => r.id === course.id)) {
        results.push({
          id: course.id,
          name: course.name,
          venue_id: course.venue_id,
          venue_name: course.venues.name,
          state: course.venues.state,
          city: course.venues.city,
        });
      }
    }
  }

  return results;
}

/**
 * Get today's date in DD/MM/YYYY format (Australian)
 */
function getTodayDateString(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Parse and validate request body
    const body = await req.json();
    const parseResult = requestBodySchema.safeParse(body);

    if (!parseResult.success) {
      const response: GenerateCompetitionResponse = {
        success: false,
        error: 'Invalid request body',
        code: 'INVALID_REQUEST',
        details: parseResult.error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', '),
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { prompt, friends, tierLimits, favoriteCourses = [], placeholderPlayers = [] } =
      parseResult.data as GenerateCompetitionRequest;

    // 2. Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      const response: GenerateCompetitionResponse = {
        success: false,
        error: 'Missing authorization header',
        code: 'AUTH_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Initialize Supabase client with user's auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Extract course keywords and search database
    const keywords = extractCourseKeywords(prompt);
    console.log('Extracted course keywords:', keywords);

    const courses = await searchCourses(supabase, keywords);
    console.log('Found courses:', courses.length);

    // 5. Initialize Anthropic client
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      const response: GenerateCompetitionResponse = {
        success: false,
        error: 'Anthropic API key not configured',
        code: 'INTERNAL_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    // 6. Build prompt and call Claude
    const systemPrompt = buildSystemPrompt();
    const userMessage = buildUserMessage(
      prompt,
      friends,
      courses,
      tierLimits,
      getTodayDateString(),
      favoriteCourses,
      placeholderPlayers
    );

    console.log('Calling Claude API...');
    const claudeResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    // 7. Extract text content from Claude's response
    const textContent = claudeResponse.content.find(
      (block) => block.type === 'text'
    );
    if (!textContent || textContent.type !== 'text') {
      const response: GenerateCompetitionResponse = {
        success: false,
        error: 'Claude did not return text content',
        code: 'CLAUDE_ERROR',
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 8. Parse Claude's JSON response
    let parsedResponse;
    try {
      // Clean up response - remove any markdown code blocks if present
      let jsonText = textContent.text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7);
      }
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3);
      }
      jsonText = jsonText.trim();

      parsedResponse = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', textContent.text);
      const response: GenerateCompetitionResponse = {
        success: false,
        error: 'Failed to parse AI response as JSON',
        code: 'PARSE_ERROR',
        details:
          parseError instanceof Error ? parseError.message : 'Unknown error',
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 9. Pre-process to fix common AI errors before validation
    if (parsedResponse.teams && Array.isArray(parsedResponse.teams)) {
      const teamSize = parsedResponse.teamSize || 2;

      // Filter out teams that don't have enough players
      const validTeams = parsedResponse.teams.filter(
        (team: { playerIds?: unknown[] }) =>
          team.playerIds && Array.isArray(team.playerIds) && team.playerIds.length >= teamSize
      );

      // If we had to remove teams, log it and update the response
      if (validTeams.length !== parsedResponse.teams.length) {
        console.log(
          `Filtered out ${parsedResponse.teams.length - validTeams.length} invalid teams (required ${teamSize} players each)`
        );
        parsedResponse.teams = validTeams;

        // If no valid teams remain but teamMode requires teams, add a validation error
        if (validTeams.length === 0 && parsedResponse.teamMode !== 'none') {
          parsedResponse.validationErrors = parsedResponse.validationErrors || [];
          parsedResponse.validationErrors.push(
            `Could not form valid teams of ${teamSize} players. Please adjust player count or team size.`
          );
          // Switch to no teams to allow validation to pass
          parsedResponse.teamMode = 'none';
          parsedResponse.teamSize = null;
          delete parsedResponse.teams;
        }
      }
    }

    // 10. Validate with Zod schema
    const validationResult = generatedCompetitionSchema.safeParse(parsedResponse);

    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.errors);
      const response: GenerateCompetitionResponse = {
        success: false,
        error: 'AI response did not match expected schema',
        code: 'VALIDATION_ERROR',
        details: validationResult.error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', '),
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 11. Return successful response
    const response: GenerateCompetitionResponse = {
      success: true,
      competition: validationResult.data,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    const response: GenerateCompetitionResponse = {
      success: false,
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
