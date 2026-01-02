/**
 * Scoring Orchestrator
 *
 * Factory and coordinator for scoring engines.
 * Provides a unified API for all scoring calculations.
 */

import type { GameType } from '@/types/database';
import type {
  ScoringResult,
  LeaderboardEntry,
  ScorecardWithHandicap,
  CourseHoleData,
  EngineConfig,
  TeamScoringResult,
} from './types';
import { DEFAULT_ENGINE_CONFIG } from './types';
import type { IScoringEngine } from './engines/IScoringEngine';
import {
  StablefordEngine,
  StrokePlayEngine,
  MatchPlayEngine,
  TeamScoringEngine,
  type TeamFormat,
} from './engines';

/**
 * Cache entry for scoring results
 */
interface CacheEntry {
  result: ScoringResult | LeaderboardEntry[];
  timestamp: number;
}

/**
 * Orchestrator for coordinating scoring calculations across game types.
 *
 * Provides:
 * - Factory for creating appropriate scoring engine
 * - Unified API for score calculations
 * - Optional result caching
 */
export class ScoringOrchestrator {
  private engines: Map<string, IScoringEngine> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private readonly cacheTTL: number;

  /**
   * Create a new orchestrator
   *
   * @param cacheTTL - Cache time-to-live in milliseconds (0 to disable)
   */
  constructor(cacheTTL = 0) {
    this.cacheTTL = cacheTTL;
  }

  /**
   * Get or create the appropriate engine for a game type
   */
  getEngine(gameType: GameType): IScoringEngine {
    const key = this.getEngineKey(gameType);

    if (!this.engines.has(key)) {
      this.engines.set(key, this.createEngine(gameType));
    }

    return this.engines.get(key)!;
  }

  /**
   * Calculate score for a single scorecard
   */
  calculateScore(
    gameType: GameType,
    scorecard: ScorecardWithHandicap,
    courseData: CourseHoleData,
    config: EngineConfig = DEFAULT_ENGINE_CONFIG
  ): ScoringResult {
    const cacheKey = this.getCacheKey('score', gameType, scorecard.scorecard.id);

    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached as ScoringResult;
    }

    // Calculate
    const engine = this.getEngine(gameType);
    const result = engine.calculateScore(scorecard, courseData, config);

    // Cache result
    this.setCache(cacheKey, result);

    return result;
  }

  /**
   * Calculate leaderboard for multiple scorecards
   */
  calculateLeaderboard(
    gameType: GameType,
    scorecards: ScorecardWithHandicap[],
    courseData: CourseHoleData,
    config: EngineConfig = DEFAULT_ENGINE_CONFIG
  ): LeaderboardEntry[] {
    if (scorecards.length === 0) {
      return [];
    }

    const engine = this.getEngine(gameType);
    return engine.calculateLeaderboard(scorecards, courseData, config);
  }

  /**
   * Calculate team score for a team format
   */
  calculateTeamScore(
    format: TeamFormat,
    teamScores: ScorecardWithHandicap[],
    courseData: CourseHoleData,
    config: EngineConfig = DEFAULT_ENGINE_CONFIG
  ): TeamScoringResult {
    const engine = new TeamScoringEngine(format);

    switch (format) {
      case 'best-ball':
        return engine.calculateBestBall(teamScores, courseData, config);
      case 'ambrose':
        return engine.calculateAmbrose(teamScores, courseData, config);
      case 'aggregate':
        return engine.calculateAggregate(teamScores, courseData, config);
      default:
        return engine.calculateBestBall(teamScores, courseData, config);
    }
  }

  /**
   * Calculate team leaderboard
   */
  calculateTeamLeaderboard(
    format: TeamFormat,
    teams: { teamId: string; scores: ScorecardWithHandicap[] }[],
    courseData: CourseHoleData,
    config: EngineConfig = DEFAULT_ENGINE_CONFIG
  ): LeaderboardEntry[] {
    const teamResults: TeamScoringResult[] = teams.map((team) =>
      this.calculateTeamScore(format, team.scores, courseData, config)
    );

    // Convert to leaderboard entries
    const entries: LeaderboardEntry[] = teamResults.map((result) => ({
      participantId: result.teamId,
      teamId: result.teamId,
      rawScore: result.rawScore,
      position: 0,
      tied: false,
      competitionPoints: 0,
      resultData: result.resultData,
      isTeamResult: true,
    }));

    // Sort based on format
    const higherIsBetter = format === 'best-ball';
    entries.sort((a, b) =>
      higherIsBetter ? b.rawScore - a.rawScore : a.rawScore - b.rawScore
    );

    // Assign positions
    let currentPosition = 1;
    let i = 0;

    while (i < entries.length) {
      const currentScore = entries[i].rawScore;
      const tiedEntries: LeaderboardEntry[] = [];

      while (i < entries.length && entries[i].rawScore === currentScore) {
        tiedEntries.push(entries[i]);
        i++;
      }

      const isTied = tiedEntries.length > 1;
      for (const entry of tiedEntries) {
        entry.position = currentPosition;
        entry.tied = isTied;
      }

      currentPosition += tiedEntries.length;
    }

    return entries;
  }

  /**
   * Clear the result cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear cache for a specific scorecard
   */
  clearCacheForScorecard(scorecardId: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(scorecardId)) {
        this.cache.delete(key);
      }
    }
  }

  // Private methods

  private createEngine(gameType: GameType): IScoringEngine {
    switch (gameType) {
      case 'stableford':
        return new StablefordEngine();
      case 'stroke':
        return new StrokePlayEngine();
      case 'match-play':
        return new MatchPlayEngine();
      case 'best-ball':
        return new TeamScoringEngine('best-ball');
      case 'ambrose':
        return new TeamScoringEngine('ambrose');
      default:
        // Default to Stableford
        return new StablefordEngine();
    }
  }

  private getEngineKey(gameType: GameType): string {
    return gameType;
  }

  private getCacheKey(type: string, gameType: GameType, id: string): string {
    return `${type}:${gameType}:${id}`;
  }

  private getFromCache(key: string): ScoringResult | LeaderboardEntry[] | null {
    if (this.cacheTTL <= 0) {
      return null;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.result;
  }

  private setCache(
    key: string,
    result: ScoringResult | LeaderboardEntry[]
  ): void {
    if (this.cacheTTL <= 0) {
      return;
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }
}

/**
 * Create a new scoring orchestrator instance
 */
export function createScoringOrchestrator(cacheTTL = 0): ScoringOrchestrator {
  return new ScoringOrchestrator(cacheTTL);
}

/**
 * Default orchestrator instance (no caching)
 */
export const scoringOrchestrator = new ScoringOrchestrator();
