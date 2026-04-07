/**
 * Debug Logger for Score Sync Operations
 *
 * Centralized logging for tracking score entry, submission, and sync operations.
 * Helps diagnose sync errors and data flow issues.
 *
 * Usage:
 *   import { syncLogger } from '@/utils/debugLogger';
 *   syncLogger.info('Starting sync', { roundId, playerId });
 *   syncLogger.error('Sync failed', error, { context });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
}

// In-memory log buffer for recent entries (useful for debugging)
const LOG_BUFFER_SIZE = 100;
const logBuffer: LogEntry[] = [];

// Enable verbose logging (can be toggled for debugging)
let verboseLogging = __DEV__;

/**
 * Format timestamp for logs
 */
function formatTimestamp(): string {
  const now = new Date();
  return now.toISOString();
}

/**
 * Format error object for logging
 */
function formatError(error: unknown): LogEntry['error'] | undefined {
  if (!error) return undefined;

  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }

  return {
    message: String(error),
  };
}

/**
 * Add entry to buffer
 */
function addToBuffer(entry: LogEntry): void {
  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_SIZE) {
    logBuffer.shift();
  }
}

/**
 * Create a logger for a specific module
 *
 * @example
 * ```ts
 * import { createModuleLogger } from '@/utils/debugLogger';
 * const logger = createModuleLogger('TeesService');
 * logger.info('Fetching tees', { courseId });
 * logger.error('Fetch failed', error);
 * ```
 */
export function createModuleLogger(module: string) {
  const log = (
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: unknown
  ): void => {
    const entry: LogEntry = {
      timestamp: formatTimestamp(),
      level,
      module,
      message,
      data,
      error: formatError(error),
    };

    addToBuffer(entry);

    // Format console output
    const prefix = `[${module}]`;
    const dataStr = data ? ` ${JSON.stringify(data, null, 0)}` : '';

    switch (level) {
      case 'debug':
        if (verboseLogging) {
          console.log(`${prefix} ${message}${dataStr}`);
        }
        break;
      case 'info':
        console.log(`${prefix} ${message}${dataStr}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}${dataStr}`);
        break;
      case 'error':
        console.error(`${prefix} ${message}${dataStr}`, error || '');
        break;
    }
  };

  return {
    debug: (message: string, data?: Record<string, unknown>) =>
      log('debug', message, data),
    info: (message: string, data?: Record<string, unknown>) =>
      log('info', message, data),
    warn: (message: string, data?: Record<string, unknown>) =>
      log('warn', message, data),
    error: (message: string, error?: unknown, data?: Record<string, unknown>) =>
      log('error', message, data, error),
  };
}

// Pre-configured loggers for different modules
export const syncLogger = createModuleLogger('Sync');
export const dbLogger = createModuleLogger('SQLite');
export const storeLogger = createModuleLogger('ScorecardStore');
export const submitLogger = createModuleLogger('Submit');

// Scoring-specific loggers for debugging score entry flows
export const scoringLogger = createModuleLogger('Scoring');
export const roundDataLogger = createModuleLogger('RoundData');
export const teamScoringLogger = createModuleLogger('TeamScoring');
export const matchPlayLogger = createModuleLogger('MatchPlay');
export const teamMatchPlayLogger = createModuleLogger('TeamMatchPlay');
export const roundListLogger = createModuleLogger('RoundList');

/**
 * Get recent log entries (for debugging UI or export)
 */
export function getRecentLogs(): LogEntry[] {
  return [...logBuffer];
}

/**
 * Clear log buffer
 */
export function clearLogs(): void {
  logBuffer.length = 0;
}

/**
 * Enable/disable verbose logging
 */
export function setVerboseLogging(enabled: boolean): void {
  verboseLogging = enabled;
}

/**
 * Export logs as formatted string (for sharing/debugging)
 */
export function exportLogs(): string {
  return logBuffer
    .map((entry) => {
      let line = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.module}] ${entry.message}`;
      if (entry.data) {
        line += `\n  Data: ${JSON.stringify(entry.data, null, 2)}`;
      }
      if (entry.error) {
        line += `\n  Error: ${entry.error.message}`;
        if (entry.error.stack) {
          line += `\n  Stack: ${entry.error.stack}`;
        }
      }
      return line;
    })
    .join('\n\n');
}

/**
 * Log scorecard data summary (sanitized for logging)
 */
export function logScorecardSummary(scorecard: {
  id: string;
  roundId: string;
  playerId: string;
  status: string;
  totalGross: number;
  totalNet: number;
  scores: Record<string, unknown>;
  isStandalone?: boolean;
}): Record<string, unknown> {
  const holesWithScores = Object.keys(scorecard.scores).length;
  return {
    id: scorecard.id.substring(0, 20) + '...',
    roundId: scorecard.roundId.substring(0, 8) + '...',
    playerId: scorecard.playerId.substring(0, 8) + '...',
    status: scorecard.status,
    totalGross: scorecard.totalGross,
    totalNet: scorecard.totalNet,
    holesScored: holesWithScores,
    isStandalone: scorecard.isStandalone ?? false,
  };
}
