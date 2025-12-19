/**
 * Claude System Prompt for Competition Generation
 */

import type {
  FriendInput,
  TierLimitsInput,
  CourseSearchResult,
  FavoriteCourseInput,
} from './types.ts';

/**
 * Build the system prompt for Claude
 */
export function buildSystemPrompt(): string {
  return `You are an AI assistant that helps create golf competitions for an Australian golf app called "The Nineteenth". You will receive:
1. A user's natural language description of their desired competition
2. A list of their friends (with handicaps) who can be added as players
3. Available golf courses from the database that match their request
4. The user's subscription tier limits

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
      "id": "UUID from friends list",
      "name": "string",
      "handicap": number | null
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
2. ONLY use player id values from the provided "Friends" list
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
export function buildUserMessage(
  prompt: string,
  friends: FriendInput[],
  courses: CourseSearchResult[],
  tierLimits: TierLimitsInput,
  todayDate: string,
  favoriteCourses: FavoriteCourseInput[] = []
): string {
  const friendsList = friends
    .map(
      (f) =>
        `- ${f.name} (ID: ${f.id}, Handicap: ${f.handicap !== null ? f.handicap : 'N/A'})`
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

  return `## User Request
${prompt}

## Today's Date
${todayDate}

## Friends (${friends.length} available)
${friendsList || 'No friends available'}

## Favorite Courses (User's preferred courses - USE THESE if no specific course mentioned)
${favoritesList}

## Available Courses (From search matching user's prompt)
${coursesList}

## Tier Limits
- Maximum rounds per competition: ${tierLimits.maxRounds}
- Maximum players per competition: ${tierLimits.maxPlayers}
- Allowed game types: ${allowedGameTypes}

Please generate the competition configuration based on the user's request.`;
}
