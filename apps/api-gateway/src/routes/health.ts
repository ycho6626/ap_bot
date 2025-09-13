import { FastifyPluginAsync } from 'fastify';
import { createLogger } from '@ap/shared/logger';
import { config } from '@ap/shared/config';

const logger = createLogger('health-routes');

/**
 * Health check routes
 */
export const healthRoutes: FastifyPluginAsync = async fastify => {
  // Basic health check
  fastify.get(
    '/',
    {
      schema: {
        description: 'Basic health check endpoint',
        tags: ['health'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
              uptime: { type: 'number' },
              environment: { type: 'string' },
              version: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const startTime = Date.now();

      try {
        const healthData = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: config().NODE_ENV,
          version: '0.1.0',
        };

        logger.debug(
          {
            responseTime: Date.now() - startTime,
            requestId: (request as any).requestId,
          },
          'Health check completed'
        );

        return healthData;
      } catch (error) {
        logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId: (request as any).requestId,
          },
          'Health check failed'
        );

        reply.status(503);
        return {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  // Detailed health check with dependencies
  fastify.get(
    '/detailed',
    {
      schema: {
        description: 'Detailed health check with dependency status',
        tags: ['health'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
              uptime: { type: 'number' },
              environment: { type: 'string' },
              version: { type: 'string' },
              dependencies: {
                type: 'object',
                properties: {
                  supabase: { type: 'string' },
                  openai: { type: 'string' },
                  verifier: { type: 'string' },
                  stripe: { type: 'string' },
                },
              },
            },
          },
          503: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
              error: { type: 'string' },
              dependencies: {
                type: 'object',
                properties: {
                  supabase: { type: 'string' },
                  openai: { type: 'string' },
                  verifier: { type: 'string' },
                  stripe: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const startTime = Date.now();

      try {
        // Check dependencies
        const dependencies = {
          supabase: 'healthy',
          openai: 'healthy',
          verifier: 'healthy',
          stripe: 'healthy',
        };

        // TODO: Add actual dependency checks
        // For now, we'll assume all dependencies are healthy
        // In a real implementation, you would:
        // - Check Supabase connection
        // - Check OpenAI API availability
        // - Check verifier service health
        // - Check Stripe API availability

        const healthData = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: config().NODE_ENV,
          version: '0.1.0',
          dependencies,
        };

        logger.debug(
          {
            responseTime: Date.now() - startTime,
            requestId: (request as any).requestId,
            dependencies,
          },
          'Detailed health check completed'
        );

        return healthData;
      } catch (error) {
        logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId: (request as any).requestId,
          },
          'Detailed health check failed'
        );

        reply.status(503);
        return {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
          dependencies: {
            supabase: 'unknown',
            openai: 'unknown',
            verifier: 'unknown',
            stripe: 'unknown',
          },
        };
      }
    }
  );

  // Readiness check
  fastify.get(
    '/ready',
    {
      schema: {
        description: 'Readiness check for Kubernetes',
        tags: ['health'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
          503: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // Check if the service is ready to accept traffic
        // This would include checking database connections, external services, etc.

        const readyData = {
          status: 'ready',
          timestamp: new Date().toISOString(),
        };

        logger.debug(
          {
            requestId: (request as any).requestId,
          },
          'Readiness check completed'
        );

        return readyData;
      } catch (error) {
        logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId: (request as any).requestId,
          },
          'Readiness check failed'
        );

        reply.status(503);
        return {
          status: 'not ready',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  // Liveness check
  fastify.get(
    '/live',
    {
      schema: {
        description: 'Liveness check for Kubernetes',
        tags: ['health'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, _reply) => {
      // Simple liveness check - if we can respond, we're alive
      return {
        status: 'alive',
        timestamp: new Date().toISOString(),
      };
    }
  );

  logger.info('Health routes registered');
};
