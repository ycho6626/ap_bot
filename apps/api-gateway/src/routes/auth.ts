import { FastifyPluginAsync } from 'fastify';
import { createLogger } from '@ap/shared/logger';
import type { UserRole } from '@ap/shared/types';

const logger = createLogger('auth-routes');

/**
 * Auth routes
 */
export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Get user profile
  fastify.get('/profile', {
    schema: {
      description: 'Get user profile information',
      tags: ['auth'],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' },
            examVariant: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      // Get user ID from auth (for now, use a placeholder)
      const userId = 'demo-user'; // TODO: Extract from auth token

      // For demo purposes, return mock user data
      // In a real implementation, you'd fetch from the database
      const userProfile = {
        id: userId,
        email: 'demo@example.com',
        role: 'public' as UserRole,
        examVariant: 'calc_ab' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      logger.info({ userId }, 'Retrieved user profile');

      return userProfile;
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to get user profile');
      reply.status(500);
      return {
        error: {
          message: 'Failed to get user profile',
          statusCode: 500,
        },
      };
    }
  });

  logger.info('Auth routes registered');
};
