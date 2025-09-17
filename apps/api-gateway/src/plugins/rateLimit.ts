import { FastifyPluginAsync } from 'fastify';
import { createLogger } from '@ap/shared/logger';
import { RateLimitConfigs, createRateLimitMiddleware } from '@ap/shared/rateLimit';

const logger = createLogger('ratelimit-plugin');

const getRequestIp = (req: unknown): string => {
  if (typeof req === 'object' && req !== null && 'ip' in req) {
    const ip = (req as { ip?: unknown }).ip;
    if (typeof ip === 'string' && ip.length > 0) {
      return ip;
    }
  }
  return 'unknown';
};

/**
 * Rate limiting plugin with different limits for different endpoints
 */
export const rateLimitPlugin: FastifyPluginAsync = async fastify => {
  logger.info('Registering rate limiting plugin');

  // Global rate limiting using shared infrastructure
  const globalRateLimit = createRateLimitMiddleware(RateLimitConfigs.MODERATE, getRequestIp);

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

      return reply.status(429).send({
        error: {
          message: 'Too Many Requests',
          statusCode: 429,
          limit: RateLimitConfigs.MODERATE.maxRequests,
        },
      });
    }
  });

  // Specific rate limiting for coach endpoint (more restrictive)
  const coachRateLimit = createRateLimitMiddleware(
    RateLimitConfigs.STRICT,
    req => `coach:${getRequestIp(req)}`
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

        return reply.status(429).send({
          error: {
            message: 'Too Many Requests - Coach endpoint has stricter limits',
            statusCode: 429,
            limit: RateLimitConfigs.STRICT.maxRequests,
          },
        });
      }
    }
  });

  // Specific rate limiting for webhook endpoints (very permissive)
  const webhookRateLimit = createRateLimitMiddleware(
    RateLimitConfigs.LOOSE,
    req => `webhook:${getRequestIp(req)}`
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

        return reply.status(429).send({
          error: {
            message: 'Too Many Requests - Webhook endpoint',
            statusCode: 429,
            limit: RateLimitConfigs.LOOSE.maxRequests,
          },
        });
      }
    }
  });

  // Specific rate limiting for KB search endpoint (moderate)
  const kbRateLimit = createRateLimitMiddleware(
    RateLimitConfigs.API,
    req => `kb:${getRequestIp(req)}`
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

        return reply.status(429).send({
          error: {
            message: 'Too Many Requests - KB search endpoint',
            statusCode: 429,
            limit: RateLimitConfigs.API.maxRequests,
          },
        });
      }
    }
  });

  // Specific rate limiting for review endpoints (teacher only, moderate)
  const reviewRateLimit = createRateLimitMiddleware(
    {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30, // 30 requests per minute for review endpoints
    },
    req => `review:${getRequestIp(req)}`
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

        return reply.status(429).send({
          error: {
            message: 'Too Many Requests - Review endpoint',
            statusCode: 429,
            limit: 30,
          },
        });
      }
    }
  });

  logger.info('Rate limiting plugin registered successfully');
  await Promise.resolve();
};
