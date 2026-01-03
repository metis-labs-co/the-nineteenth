/**
 * useGenerateAICompetition - Hook for AI-powered competition creation
 *
 * Calls the Supabase Edge Function to generate a competition configuration
 * from a natural language prompt using Claude AI.
 *
 * @example
 * ```tsx
 * function AICompetitionScreen() {
 *   const generateAI = useGenerateAICompetition();
 *
 *   const handleGenerate = async (prompt: string) => {
 *     try {
 *       const result = await generateAI.mutateAsync(prompt);
 *       if (result.success) {
 *         // Show preview of result.competition
 *       }
 *     } catch (error) {
 *       // Handle error
 *     }
 *   };
 *
 *   return (
 *     <View>
 *       <TextInput onSubmitEditing={(e) => handleGenerate(e.nativeEvent.text)} />
 *       {generateAI.isPending && <ActivityIndicator />}
 *     </View>
 *   );
 * }
 * ```
 */

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { useFriends } from './useFriends';
import { usePlaceholderPlayers } from './usePlaceholderPlayers';
import { useFavoriteCoursesWithVenues } from './useVenues';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { aiKeys } from './queryKeys';
import type { GameType } from '@/types/database.types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Generated round from AI
 */
export interface GeneratedRound {
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
 * Generated player selection from AI
 */
export interface GeneratedPlayer {
  id: string;
  name: string;
  handicap: number | null;
  isPlaceholder?: boolean; // True if this is a NEW placeholder to be created
}

/**
 * Generated team from AI
 */
export interface GeneratedTeam {
  name: string;
  playerIds: string[];
}

/**
 * Complete generated competition from AI
 */
export interface GeneratedCompetition {
  name: string;
  description: string | null;
  competitionType: 'league' | 'event';
  startDate: string; // DD/MM/YYYY format
  endDate: string | null; // DD/MM/YYYY format
  handicapSystem: 'honor' | 'golf-australia' | 'gross-only';
  teamMode: 'none' | 'fixed' | 'per-round';
  teamSize: number | null;
  rounds: GeneratedRound[];
  players: GeneratedPlayer[];
  teams?: GeneratedTeam[];
  assumptions?: string[];
  validationErrors?: string[];
}

/**
 * Success response from Edge Function
 */
export interface AICompetitionSuccessResponse {
  success: true;
  competition: GeneratedCompetition;
}

/**
 * Error response from Edge Function
 */
export interface AICompetitionErrorResponse {
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

export type AICompetitionResponse =
  | AICompetitionSuccessResponse
  | AICompetitionErrorResponse;

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for generating a competition configuration from a natural language prompt
 *
 * Uses the user's friends list, placeholder players, and subscription tier limits as context
 * for the AI to generate an appropriate competition.
 */
export function useGenerateAICompetition() {
  const { data: friends = [] } = useFriends();
  const { data: placeholderPlayers = [] } = usePlaceholderPlayers();
  const { data: favoriteCourses = [] } = useFavoriteCoursesWithVenues();
  const { limits } = useSubscriptionContext();

  return useMutation({
    mutationKey: aiKeys.generation(),
    mutationFn: async (prompt: string): Promise<AICompetitionResponse> => {
      // Validate prompt
      if (!prompt || prompt.trim().length < 10) {
        return {
          success: false,
          error: 'Prompt must be at least 10 characters',
          code: 'INVALID_REQUEST',
        };
      }

      // Prepare friends data for Edge Function
      const friendsPayload = friends.map((f) => ({
        id: f.id,
        name: f.name,
        handicap: f.handicap,
      }));

      // Prepare existing placeholder players for Edge Function
      const placeholderPlayersPayload = placeholderPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        handicap: p.handicap,
      }));

      // Prepare tier limits
      // Note: -1 = UNLIMITED, -2 = NO_LIMIT (super_admin) - these need to be converted to reasonable defaults
      const rawMaxRounds = limits?.maxRoundsPerCompetition;
      const rawMaxPlayers = limits?.maxPlayersPerCompetition;

      const tierLimitsPayload = {
        // If unlimited (-1 or -2) or falsy, use sensible defaults for AI
        maxRounds: (rawMaxRounds && rawMaxRounds > 0) ? rawMaxRounds : 10,
        maxPlayers: (rawMaxPlayers && rawMaxPlayers > 0) ? rawMaxPlayers : 40,
        allowedGameTypes: (limits?.allowedGameTypes?.length ? limits.allowedGameTypes : ['stableford']) as GameType[],
      };

      // Prepare favorite courses for Edge Function
      const favoriteCoursesPayload = favoriteCourses.map((c) => ({
        id: c.id,
        name: c.name,
        venue_id: c.venue_id,
        venue_name: c.venue?.name || 'Unknown Venue',
        state: c.venue?.state || 'Unknown',
        city: c.venue?.city || null,
      }));

      // Debug logging
      if (__DEV__) {
        console.log('[useGenerateAICompetition] raw limits:', { rawMaxRounds, rawMaxPlayers });
        console.log('[useGenerateAICompetition] tierLimitsPayload:', tierLimitsPayload);
        console.log('[useGenerateAICompetition] friends count:', friendsPayload.length);
        console.log('[useGenerateAICompetition] placeholder players count:', placeholderPlayersPayload.length);
        console.log('[useGenerateAICompetition] favorite courses count:', favoriteCoursesPayload.length);
      }

      // Call Edge Function
      const { data, error } = await supabase.functions.invoke<AICompetitionResponse>(
        'generate-competition',
        {
          body: {
            prompt: prompt.trim(),
            friends: friendsPayload,
            tierLimits: tierLimitsPayload,
            favoriteCourses: favoriteCoursesPayload,
            placeholderPlayers: placeholderPlayersPayload,
          },
        }
      );

      // Handle Supabase function error
      if (error) {
        console.error('[useGenerateAICompetition] Edge function error:', error);

        // Try to extract more details from the error
        let errorDetails = error.message;
        let errorCode: 'INTERNAL_ERROR' | 'AUTH_ERROR' | 'INVALID_REQUEST' = 'INTERNAL_ERROR';

        // FunctionsHttpError contains the response context
        if (error.context) {
          try {
            // The response body may contain our structured error
            const responseText = await error.context.text?.() || '';
            console.error('[useGenerateAICompetition] Error response body:', responseText);
            if (responseText) {
              const parsed = JSON.parse(responseText);
              if (parsed.error) {
                errorDetails = parsed.details || parsed.error;
                errorCode = parsed.code || 'INTERNAL_ERROR';
              }
            }
          } catch (parseErr) {
            console.error('[useGenerateAICompetition] Could not parse error response:', parseErr);
          }
        }

        return {
          success: false,
          error: errorDetails || 'Failed to call AI service',
          code: errorCode,
          details: errorDetails,
        };
      }

      // Return response (success or error from Edge Function)
      if (!data) {
        return {
          success: false,
          error: 'No response from AI service',
          code: 'INTERNAL_ERROR',
        };
      }

      return data;
    },
    onError: (error) => {
      console.error('[useGenerateAICompetition] Mutation error:', error);
    },
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse a DD/MM/YYYY date string to a Date object
 */
export function parseAIDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a Date object to DD/MM/YYYY string
 */
export function formatToAIDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Get user-friendly error message from AI response
 */
export function getAIErrorMessage(response: AICompetitionErrorResponse): string {
  switch (response.code) {
    case 'INVALID_REQUEST':
      return response.details || 'Please provide more details about your competition.';
    case 'AUTH_ERROR':
      return 'Please sign in to use this feature.';
    case 'CLAUDE_ERROR':
      return 'AI service is temporarily unavailable. Please try again.';
    case 'PARSE_ERROR':
      return 'Could not understand the response. Please try rephrasing your request.';
    case 'VALIDATION_ERROR':
      return response.details || 'The generated competition has invalid data. Please try again.';
    case 'INTERNAL_ERROR':
    default:
      return 'Something went wrong. Please try again later.';
  }
}
