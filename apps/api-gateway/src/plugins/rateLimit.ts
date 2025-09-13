import { FastifyPluginAsync } from 'fastify';
import { createLogger } from '@ap/shared/logger';
import { RateLimitConfigs, createRateLimitMiddleware } from '@ap/shared/rateLimit';

const logger = createLogger('ratelimit-plugin');

/**
 * Rate limiting plugin with different limits for different endpoints
 */
export const rateLimitPlugin: FastifyPluginAsync = async fastify => {
  logger.info('Registering rate limiting plugin');

  // Global rate limiting using shared infrastructure
  const globalRateLimit = createRateLimitMiddleware(
    RateLimitConfigs.MODERATE,
    (request: any) => request.ip || 'unknown'
  );

  // Apply global rate limiting to all routes
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      await globalRateLimit(request);
    } catch (error) {
      logger.warn(
        {
          ip: request.ip,
          url: request.url,
          method: request.method,
        },
        'Global rate limit exceeded'
      );

      reply.status(429).send({
        error: {
          message: 'Too Many Requests',
          statusCode: 429,
          limit: RateLimitConfigs.MODERATE.maxRequests,
        },
      });
      return;
    }
  });

  // Specific rate limiting for coach endpoint (more restrictive)
  const coachRateLimit = createRateLimitMiddleware(
    RateLimitConfigs.STRICT,
    (request: any) => `coach:${request.ip || 'unknown'}`
  );

  fastify.addHook('preHandler', async (request, reply) => {
    if (request.url === '/coach' && request.method === 'POST') {
      try {
        await coachRateLimit(request);
      } catch (error) {
        logger.warn(
          {
            ip: request.ip,
            url: request.url,
            method: request.method,
          },
          'Coach endpoint rate limit exceeded'
        );

        reply.status(429).send({
          error: {
            message: 'Too Many Requests - Coach endpoint has stricter limits',
            statusCode: 429,
            limit: RateLimitConfigs.STRICT.maxRequests,
          },
        });
        return;
      }
    }
  });

  // Specific rate limiting for webhook endpoints (very permissive)
  const webhookRateLimit = createRateLimitMiddleware(
    RateLimitConfigs.LOOSE,
    (request: any) => `webhook:${request.ip || 'unknown'}`
  );

  fastify.addHook('preHandler', async (request, reply) => {
    if (request.url?.startsWith('/webhooks/')) {
      try {
        await webhookRateLimit(request);
      } catch (error) {
        logger.warn(
          {
            ip: request.ip,
            url: request.url,
            method: request.method,
          },
          'Webhook rate limit exceeded'
        );

        reply.status(429).send({
          error: {
            message: 'Too Many Requests - Webhook endpoint',
            statusCode: 429,
            limit: RateLimitConfigs.LOOSE.maxRequests,
          },
        });
        return;
      }
    }
  });

  // Specific rate limiting for KB search endpoint (moderate)
  const kbRateLimit = createRateLimitMiddleware(
    RateLimitConfigs.API,
    (request: any) => `kb:${request.ip || 'unknown'}`
  );

  fastify.addHook('preHandler', async (request, reply) => {
    if (request.url === '/kb/search' && request.method === 'GET') {
      try {
        await kbRateLimit(request);
      } catch (error) {
        logger.warn(
          {
            ip: request.ip,
            url: request.url,
            method: request.method,
          },
          'KB search rate limit exceeded'
        );

        reply.status(429).send({
          error: {
            message: 'Too Many Requests - KB search endpoint',
            statusCode: 429,
            limit: RateLimitConfigs.API.maxRequests,
          },
        });
        return;
      }
    }
  });

  // Specific rate limiting for review endpoints (teacher only, moderate)
  const reviewRateLimit = createRateLimitMiddleware(
    {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30, // 30 requests per minute for review endpoints
    },
    (request: any) => `review:${request.ip || 'unknown'}`
  );

  fastify.addHook('preHandler', async (request, reply) => {
    if (request.url?.startsWith('/review/')) {
      try {
        await reviewRateLimit(request);
      } catch (error) {
        logger.warn(
          {
            ip: request.ip,
            url: request.url,
            method: request.method,
          },
          'Review endpoint rate limit exceeded'
        );

        reply.status(429).send({
          error: {
            message: 'Too Many Requests - Review endpoint',
            statusCode: 429,
            limit: 30,
          },
        });
        return;
      }
    }
  });

  logger.info('Rate limiting plugin registered successfully');
};
