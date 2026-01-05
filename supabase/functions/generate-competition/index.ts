/**
 * Supabase Edge Function: generate-competition
 *
 * Generates a golf competition configuration from a natural language prompt
 * using Claude AI.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.27.0';

import type {
  GenerateCompetitionRequest,
  GenerateCompetitionResponse,
  CourseSearchResult,
} from './types.ts';
import { requestBodySchema, generatedCompetitionSchema } from './validation.ts';
import { buildSystemPrompt, buildUserMessage } from './prompt.ts';

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

/**
 * Main handler
 */
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

    const { prompt, friends, tierLimits, favoriteCourses = [], placeholderPlayers = [], organizer } =
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
      placeholderPlayers,
      organizer
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

    // Fix placeholder player UUIDs - Claude can't reliably generate valid UUIDs
    // So we replace any placeholder player IDs with properly generated UUIDs
    if (parsedResponse.players && Array.isArray(parsedResponse.players)) {
      const placeholderIdMap = new Map<string, string>();

      for (const player of parsedResponse.players) {
        if (player.isPlaceholder === true) {
          // Store old ID -> new UUID mapping for team updates
          const oldId = player.id;
          const newUuid = crypto.randomUUID();
          placeholderIdMap.set(oldId, newUuid);
          player.id = newUuid;
          console.log(`Replaced placeholder ID "${oldId}" with valid UUID "${newUuid}"`);
        }
      }

      // Update team playerIds if any placeholders were replaced
      if (placeholderIdMap.size > 0 && parsedResponse.teams && Array.isArray(parsedResponse.teams)) {
        for (const team of parsedResponse.teams) {
          if (team.playerIds && Array.isArray(team.playerIds)) {
            team.playerIds = team.playerIds.map((id: string) =>
              placeholderIdMap.get(id) || id
            );
          }
        }
      }
    }

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
