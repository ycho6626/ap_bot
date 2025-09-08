import { FastifyPluginAsync } from 'fastify';
import { config } from '@ap/shared/config';
import { createLogger } from '@ap/shared/logger';

const logger = createLogger('ratelimit-plugin');

/**
 * Rate limiting plugin with different limits for different endpoints
 */
export const rateLimitPlugin: FastifyPluginAsync = async (fastify) => {
  // Global rate limiting
  await fastify.register(import('@fastify/rate-limit'), {
    max: 100, // Maximum number of requests
    timeWindow: '1 minute', // Time window
    keyGenerator: (request) => {
      // Use IP address as the key, with fallback to user ID if available
      return request.ip || 'unknown';
    },
    errorResponseBuilder: (request, context) => {
      logger.warn(
        {
          ip: request.ip,
          url: request.url,
          method: request.method,
          limit: context.max,
          remaining: context.remaining,
        },
        'Rate limit exceeded',
      );

      return {
        error: {
          message: 'Too Many Requests',
          statusCode: 429,
          limit: context.max,
          remaining: context.remaining,
          resetTime: context.resetTime,
        },
      };
    },
    onBanReach: (request, key, totalHits, maxHits, timeWindow) => {
      logger.warn(
        {
          ip: request.ip,
          key,
          totalHits,
          maxHits,
          timeWindow,
          url: request.url,
          method: request.method,
        },
        'Rate limit ban reached',
      );
    },
  });

  // Specific rate limiting for coach endpoint (more restrictive)
  fastify.addHook('onRoute', (routeOptions) => {
    if (routeOptions.path === '/coach' && routeOptions.method === 'POST') {
      fastify.register(import('@fastify/rate-limit'), {
        max: 10, // 10 requests per minute for coach endpoint
        timeWindow: '1 minute',
        keyGenerator: (request) => {
          // Use IP address as the key
          return request.ip || 'unknown';
        },
        errorResponseBuilder: (request, context) => {
          logger.warn(
            {
              ip: request.ip,
              url: request.url,
              method: request.method,
              limit: context.max,
              remaining: context.remaining,
            },
            'Coach endpoint rate limit exceeded',
          );

          return {
            error: {
              message: 'Too Many Requests - Coach endpoint has stricter limits',
              statusCode: 429,
              limit: context.max,
              remaining: context.remaining,
              resetTime: context.resetTime,
            },
          };
        },
      });
    }
  });

  // Specific rate limiting for webhook endpoints (very permissive)
  fastify.addHook('onRoute', (routeOptions) => {
    if (routeOptions.path?.startsWith('/webhooks/')) {
      fastify.register(import('@fastify/rate-limit'), {
        max: 1000, // 1000 requests per minute for webhooks
        timeWindow: '1 minute',
        keyGenerator: (request) => {
          // Use IP address as the key
          return request.ip || 'unknown';
        },
        errorResponseBuilder: (request, context) => {
          logger.warn(
            {
              ip: request.ip,
              url: request.url,
              method: request.method,
              limit: context.max,
              remaining: context.remaining,
            },
            'Webhook rate limit exceeded',
          );

          return {
            error: {
              message: 'Too Many Requests - Webhook endpoint limit exceeded',
              statusCode: 429,
              limit: context.max,
              remaining: context.remaining,
              resetTime: context.resetTime,
            },
          };
        },
      });
    }
  });

  // Specific rate limiting for review endpoints (moderate)
  fastify.addHook('onRoute', (routeOptions) => {
    if (routeOptions.path?.startsWith('/review/')) {
      fastify.register(import('@fastify/rate-limit'), {
        max: 50, // 50 requests per minute for review endpoints
        timeWindow: '1 minute',
        keyGenerator: (request) => {
          // Use IP address as the key
          return request.ip || 'unknown';
        },
        errorResponseBuilder: (request, context) => {
          logger.warn(
            {
              ip: request.ip,
              url: request.url,
              method: request.method,
              limit: context.max,
              remaining: context.remaining,
            },
            'Review endpoint rate limit exceeded',
          );

          return {
            error: {
              message: 'Too Many Requests - Review endpoint limit exceeded',
              statusCode: 429,
              limit: context.max,
              remaining: context.remaining,
              resetTime: context.resetTime,
            },
          };
        },
      });
    }
  });

  logger.info('Rate limiting plugin registered');
};
