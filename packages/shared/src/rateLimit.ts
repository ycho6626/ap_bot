import { Redis } from 'ioredis';
import { createLogger } from './logger';
import { config } from './config';
import type { RateLimitConfig } from './types';
import { RateLimitError } from './types';

/**
 * In-memory token bucket implementation
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number; // tokens per second

  constructor(capacity: number, refillRate: number, _windowMs: number) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  /**
   * Try to consume tokens from the bucket
   * @param tokens - Number of tokens to consume
   * @returns True if tokens were consumed, false if not enough tokens
   */
  tryConsume(tokens = 1): boolean {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  /**
   * Get the current number of tokens available
   * @returns Number of tokens available
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Refill the bucket based on time elapsed
   */
  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;

    if (timePassed > 0) {
      const tokensToAdd = (timePassed / 1000) * this.refillRate;
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }
}

/**
 * Redis-based rate limiter
 */
class RedisRateLimiter {
  private redis: Redis;
  private logger = createLogger('redis-rate-limiter');

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
    });

    this.redis.on('error', error => {
      this.logger.error({ error: error.message }, 'Redis connection error');
    });
  }

  /**
   * Check if request is allowed and consume tokens
   * @param key - Rate limit key
   * @param config - Rate limit configuration
   * @returns True if request is allowed
   */
  async isAllowed(key: string, config: RateLimitConfig): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();

      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart);

      // Count current requests
      pipeline.zcard(key);

      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);

      // Set expiration
      pipeline.expire(key, Math.ceil(config.windowMs / 1000));

      const results = await pipeline.exec();

      if (!results || results.length < 2) {
        throw new Error('Redis pipeline execution failed');
      }

      const currentCount = results[1]?.[1] as number;

      return currentCount < config.maxRequests;
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Redis rate limit check failed'
      );
      // Fail open - allow request if Redis is down
      return true;
    }
  }

  /**
   * Get current request count for a key
   * @param key - Rate limit key
   * @param config - Rate limit configuration
   * @returns Current request count
   */
  async getCurrentCount(key: string, config: RateLimitConfig): Promise<number> {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      await this.redis.zremrangebyscore(key, 0, windowStart);
      const count = await this.redis.zcard(key);
      return count;
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Redis rate limit count check failed'
      );
      return 0;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

/**
 * In-memory rate limiter
 */
class MemoryRateLimiter {
  private buckets = new Map<string, TokenBucket>();

  /**
   * Check if request is allowed and consume tokens
   * @param key - Rate limit key
   * @param config - Rate limit configuration
   * @returns True if request is allowed
   */
  isAllowed(key: string, config: RateLimitConfig): boolean {
    const bucket = this.getBucket(key, config);
    return bucket.tryConsume();
  }

  /**
   * Get current request count for a key
   * @param key - Rate limit key
   * @param config - Rate limit configuration
   * @returns Current request count (approximate)
   */
  getCurrentCount(key: string, config: RateLimitConfig): number {
    const bucket = this.getBucket(key, config);
    return Math.floor(bucket.getTokens());
  }

  /**
   * Get or create token bucket for a key
   * @param key - Rate limit key
   * @param config - Rate limit configuration
   * @returns Token bucket
   */
  private getBucket(key: string, config: RateLimitConfig): TokenBucket {
    if (!this.buckets.has(key)) {
      const refillRate = config.maxRequests / (config.windowMs / 1000);
      this.buckets.set(key, new TokenBucket(config.maxRequests, refillRate, config.windowMs));
    }

    return this.buckets.get(key)!;
  }

  /**
   * Clean up expired buckets
   */
  cleanup(): void {
    // Simple cleanup - remove buckets that haven't been used recently
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket['lastRefill'] > maxAge) {
        this.buckets.delete(key);
      }
    }
  }
}

/**
 * Rate limiter implementation
 */
export class RateLimiter {
  private memoryLimiter: MemoryRateLimiter;
  private redisLimiter?: RedisRateLimiter;
  private logger = createLogger('rate-limiter');
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    this.memoryLimiter = new MemoryRateLimiter();

    // Initialize Redis limiter if URL is provided
    const redisUrl = config().REDIS_URL;
    if (redisUrl) {
      this.redisLimiter = new RedisRateLimiter(redisUrl);
    }

    // Set up cleanup interval for memory limiter
    this.cleanupInterval = setInterval(() => {
      this.memoryLimiter.cleanup();
    }, 60000); // Clean up every minute
  }

  /**
   * Check if request is allowed
   * @param key - Rate limit key
   * @param config - Rate limit configuration
   * @returns True if request is allowed
   */
  async isAllowed(key: string, config: RateLimitConfig): Promise<boolean> {
    try {
      // Use Redis if available, otherwise fall back to memory
      if (this.redisLimiter) {
        return await this.redisLimiter.isAllowed(key, config);
      } else {
        return this.memoryLimiter.isAllowed(key, config);
      }
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Rate limit check failed'
      );
      // Fail open - allow request if rate limiting fails
      return true;
    }
  }

  /**
   * Get current request count for a key
   * @param key - Rate limit key
   * @param config - Rate limit configuration
   * @returns Current request count
   */
  async getCurrentCount(key: string, config: RateLimitConfig): Promise<number> {
    try {
      if (this.redisLimiter) {
        return await this.redisLimiter.getCurrentCount(key, config);
      } else {
        return this.memoryLimiter.getCurrentCount(key, config);
      }
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Rate limit count check failed'
      );
      return 0;
    }
  }

  /**
   * Check if request is allowed and throw error if not
   * @param key - Rate limit key
   * @param config - Rate limit configuration
   * @throws RateLimitError if request is not allowed
   */
  async checkRateLimit(key: string, config: RateLimitConfig): Promise<void> {
    const isAllowed = await this.isAllowed(key, config);

    if (!isAllowed) {
      const currentCount = await this.getCurrentCount(key, config);
      throw new RateLimitError(
        `Rate limit exceeded for key: ${key}. Current count: ${currentCount}/${config.maxRequests}`
      );
    }
  }

  /**
   * Close the rate limiter and cleanup resources
   */
  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.redisLimiter) {
      await this.redisLimiter.close();
    }
  }
}

/**
 * Default rate limiter instance
 */
export const rateLimiter = new RateLimiter();

/**
 * Rate limit middleware factory
 * @param config - Rate limit configuration
 * @param keyGenerator - Function to generate rate limit key from request
 * @returns Rate limit middleware function
 */
export function createRateLimitMiddleware(
  config: RateLimitConfig,
  keyGenerator: (req: unknown) => string = () => 'default'
) {
  return async (req: unknown): Promise<void> => {
    const key = keyGenerator(req);
    await rateLimiter.checkRateLimit(key, config);
  };
}

/**
 * Common rate limit configurations
 */
export const RateLimitConfigs = {
  /**
   * Strict rate limit: 10 requests per minute
   */
  STRICT: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  },

  /**
   * Moderate rate limit: 100 requests per minute
   */
  MODERATE: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },

  /**
   * Loose rate limit: 1000 requests per minute
   */
  LOOSE: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1000,
  },

  /**
   * API rate limit: 60 requests per minute
   */
  API: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
  },

  /**
   * Webhook rate limit: 5 requests per minute
   */
  WEBHOOK: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
  },
} as const;
