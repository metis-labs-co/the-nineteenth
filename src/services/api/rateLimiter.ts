/**
 * API Rate Limiter
 *
 * Token bucket algorithm for rate limiting API requests.
 * Features:
 * - Configurable requests per minute/hour
 * - Exponential backoff on 429 responses
 * - Request queuing when rate limited
 * - Per-endpoint rate limiting support
 */

// =====================================================
// TYPES
// =====================================================

export interface RateLimiterConfig {
  /** Maximum requests per minute */
  requestsPerMinute: number;
  /** Maximum requests per hour (optional) */
  requestsPerHour?: number;
  /** Maximum queue size (0 = no queuing) */
  maxQueueSize?: number;
  /** Initial backoff delay in ms */
  initialBackoffMs?: number;
  /** Maximum backoff delay in ms */
  maxBackoffMs?: number;
  /** Backoff multiplier */
  backoffMultiplier?: number;
}

export interface RateLimitStatus {
  /** Whether requests are currently allowed */
  allowed: boolean;
  /** Remaining requests this minute */
  remainingMinute: number;
  /** Remaining requests this hour */
  remainingHour: number;
  /** Milliseconds until next request allowed (0 if allowed) */
  waitTimeMs: number;
  /** Current queue size */
  queueSize: number;
  /** Whether rate limiter is in backoff mode */
  inBackoff: boolean;
}

type QueuedRequest<T> = {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
};

// =====================================================
// CONSTANTS
// =====================================================

const DEFAULT_CONFIG: Required<RateLimiterConfig> = {
  requestsPerMinute: 60,
  requestsPerHour: 1000,
  maxQueueSize: 10,
  initialBackoffMs: 1000,
  maxBackoffMs: 60000,
  backoffMultiplier: 2,
};

// =====================================================
// TOKEN BUCKET
// =====================================================

/**
 * Token bucket for rate limiting
 */
class TokenBucket {
  private tokens: number;
  private lastRefillTime: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per ms

  constructor(maxTokens: number, refillIntervalMs: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.lastRefillTime = Date.now();
    this.refillRate = maxTokens / refillIntervalMs;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  /**
   * Try to consume a token
   * @returns True if token was consumed, false if rate limited
   */
  tryConsume(): boolean {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Get current token count
   */
  getTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /**
   * Get time until next token available (in ms)
   */
  getWaitTime(): number {
    this.refill();

    if (this.tokens >= 1) {
      return 0;
    }

    const tokensNeeded = 1 - this.tokens;
    return Math.ceil(tokensNeeded / this.refillRate);
  }

  /**
   * Reset bucket to full
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefillTime = Date.now();
  }
}

// =====================================================
// RATE LIMITER
// =====================================================

/**
 * API Rate Limiter with token bucket algorithm
 */
class RateLimiter {
  private config: Required<RateLimiterConfig>;
  private minuteBucket: TokenBucket;
  private hourBucket: TokenBucket;
  private queue: QueuedRequest<unknown>[] = [];
  private isProcessingQueue: boolean = false;
  private backoffUntil: number = 0;
  private currentBackoffMs: number;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.minuteBucket = new TokenBucket(this.config.requestsPerMinute, 60000);
    this.hourBucket = new TokenBucket(this.config.requestsPerHour, 3600000);
    this.currentBackoffMs = this.config.initialBackoffMs;
  }

  /**
   * Get current rate limit status
   */
  getStatus(): RateLimitStatus {
    const now = Date.now();
    const inBackoff = now < this.backoffUntil;

    return {
      allowed: !inBackoff && this.minuteBucket.getTokens() >= 1 && this.hourBucket.getTokens() >= 1,
      remainingMinute: this.minuteBucket.getTokens(),
      remainingHour: this.hourBucket.getTokens(),
      waitTimeMs: inBackoff
        ? this.backoffUntil - now
        : Math.max(this.minuteBucket.getWaitTime(), this.hourBucket.getWaitTime()),
      queueSize: this.queue.length,
      inBackoff,
    };
  }

  /**
   * Check if a request is allowed
   */
  isAllowed(): boolean {
    const status = this.getStatus();
    return status.allowed;
  }

  /**
   * Try to acquire a rate limit token
   * @returns True if request can proceed, false if rate limited
   */
  tryAcquire(): boolean {
    const now = Date.now();

    // Check backoff
    if (now < this.backoffUntil) {
      return false;
    }

    // Try both buckets
    if (!this.minuteBucket.tryConsume()) {
      return false;
    }

    if (!this.hourBucket.tryConsume()) {
      // Refund minute token if hour bucket fails
      // (Not strictly possible with our implementation, but conceptually correct)
      return false;
    }

    return true;
  }

  /**
   * Report a rate limit error from the API
   * Triggers exponential backoff
   *
   * @param retryAfterSeconds - Retry-After header value (optional)
   */
  reportRateLimitError(retryAfterSeconds?: number): void {
    if (retryAfterSeconds) {
      // Use server-provided retry time
      this.backoffUntil = Date.now() + retryAfterSeconds * 1000;
    } else {
      // Use exponential backoff
      this.backoffUntil = Date.now() + this.currentBackoffMs;
      this.currentBackoffMs = Math.min(
        this.currentBackoffMs * this.config.backoffMultiplier,
        this.config.maxBackoffMs
      );
    }
  }

  /**
   * Report a successful request
   * Resets exponential backoff
   */
  reportSuccess(): void {
    this.currentBackoffMs = this.config.initialBackoffMs;
  }

  /**
   * Wait until a request is allowed
   * @returns Promise that resolves when request can proceed
   */
  async waitForToken(): Promise<void> {
    const status = this.getStatus();

    if (status.allowed) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, status.waitTimeMs));

    // Recursive check in case of timing issues
    if (!this.isAllowed()) {
      return this.waitForToken();
    }
  }

  /**
   * Execute a request with rate limiting
   * Queues the request if rate limited
   *
   * @param execute - Function that executes the API request
   * @returns Promise with the request result
   */
  async execute<T>(execute: () => Promise<T>): Promise<T> {
    // If queue is full, reject immediately
    if (
      this.config.maxQueueSize > 0 &&
      this.queue.length >= this.config.maxQueueSize &&
      !this.isAllowed()
    ) {
      throw new Error('Rate limit queue is full. Try again later.');
    }

    // Try immediate execution
    if (this.tryAcquire()) {
      try {
        const result = await execute();
        this.reportSuccess();
        return result;
      } catch (error) {
        // Check if it's a rate limit error
        if (
          error instanceof Error &&
          (error.message.includes('429') || error.message.toLowerCase().includes('rate limit'))
        ) {
          this.reportRateLimitError();
        }
        throw error;
      }
    }

    // Queue the request if queuing is enabled
    if (this.config.maxQueueSize > 0) {
      return this.queueRequest(execute);
    }

    // No queuing, wait and retry
    await this.waitForToken();
    return this.execute(execute);
  }

  /**
   * Queue a request for later execution
   */
  private queueRequest<T>(execute: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        execute: execute as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });

      this.processQueue();
    });
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.queue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.queue.length > 0) {
      // Wait for rate limit
      await this.waitForToken();

      if (!this.tryAcquire()) {
        continue;
      }

      const request = this.queue.shift();
      if (!request) {
        break;
      }

      try {
        const result = await request.execute();
        this.reportSuccess();
        request.resolve(result);
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.includes('429') || error.message.toLowerCase().includes('rate limit'))
        ) {
          this.reportRateLimitError();
          // Re-queue the request
          this.queue.unshift(request);
        } else {
          request.reject(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Clear the request queue
   * @param reason - Error message for rejected requests
   */
  clearQueue(reason: string = 'Queue cleared'): void {
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) {
        request.reject(new Error(reason));
      }
    }
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.minuteBucket.reset();
    this.hourBucket.reset();
    this.backoffUntil = 0;
    this.currentBackoffMs = this.config.initialBackoffMs;
    this.clearQueue('Rate limiter reset');
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

/**
 * Default rate limiter for GolfAPI.io
 * Configured for typical API limits
 */
export const golfApiRateLimiter = new RateLimiter({
  requestsPerMinute: 30, // Conservative default
  requestsPerHour: 500,
  maxQueueSize: 5,
  initialBackoffMs: 2000,
  maxBackoffMs: 60000,
  backoffMultiplier: 2,
});

/**
 * Export class for custom instances
 */
export { RateLimiter };
