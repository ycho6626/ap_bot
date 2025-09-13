import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createLogger } from '@ap/shared/logger';
import { withSpan } from '@ap/shared/tracing';
import { vamCoach, type CoachContext } from '@ap/tutor/coach';

const logger = createLogger('coach-routes');

/**
 * Coach request schema
 */
const coachRequestSchema = z.object({
  subject: z.literal('calc').default('calc'),
  examVariant: z.enum(['calc_ab', 'calc_bc']).default('calc_ab'),
  mode: z.enum(['vam', 'standard']).default('vam'),
  question: z.string().min(1, 'Question is required').max(2000, 'Question too long'),
  context: z
    .object({
      topic: z.string().optional(),
      subtopic: z.string().optional(),
      difficulty: z.string().optional(),
      studentLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
      previousQuestions: z.array(z.string()).optional(),
      sessionId: z.string().optional(),
    })
    .optional(),
});

/**
 * Coach routes for VAM (Verified Answer Mode) orchestration
 */
export const coachRoutes: FastifyPluginAsync = async fastify => {
  // Main coach endpoint
  fastify.post(
    '/',
    {
      schema: {
        description: 'Process a student question using VAM (Verified Answer Mode)',
        tags: ['coach'],
        body: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              enum: ['calc'],
              default: 'calc',
              description: 'Subject (currently only calc supported)',
            },
            examVariant: {
              type: 'string',
              enum: ['calc_ab', 'calc_bc'],
              default: 'calc_ab',
              description: 'Exam variant',
            },
            mode: {
              type: 'string',
              enum: ['vam', 'standard'],
              default: 'vam',
              description: 'Processing mode',
            },
            question: {
              type: 'string',
              minLength: 1,
              maxLength: 2000,
              description: 'Student question',
            },
            context: {
              type: 'object',
              properties: {
                topic: {
                  type: 'string',
                  description: 'Topic context',
                },
                subtopic: {
                  type: 'string',
                  description: 'Subtopic context',
                },
                difficulty: {
                  type: 'string',
                  description: 'Difficulty level',
                },
                studentLevel: {
                  type: 'string',
                  enum: ['beginner', 'intermediate', 'advanced'],
                  description: 'Student level',
                },
                previousQuestions: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Previous questions in session',
                },
                sessionId: {
                  type: 'string',
                  description: 'Session identifier',
                },
              },
              description: 'Additional context for the question',
            },
          },
          required: ['question'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              answer: { type: 'string' },
              verified: { type: 'boolean' },
              trustScore: { type: 'number' },
              confidence: { type: 'number' },
              sources: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['canonical', 'retrieval', 'generated'],
                    },
                    id: { type: 'string' },
                    title: { type: 'string' },
                    snippet: { type: 'string' },
                    score: { type: 'number' },
                  },
                },
              },
              suggestions: {
                type: 'array',
                items: { type: 'string' },
              },
              metadata: {
                type: 'object',
                properties: {
                  examVariant: { type: 'string' },
                  topic: { type: 'string' },
                  subtopic: { type: 'string' },
                  difficulty: { type: 'string' },
                  processingTime: { type: 'number' },
                  retryCount: { type: 'number' },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  statusCode: { type: 'number' },
                  validation: { type: 'object' },
                },
              },
            },
          },
          500: {
            type: 'object',
            properties: {
              error: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  statusCode: { type: 'number' },
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
        // Parse and validate request body
        const requestData = coachRequestSchema.parse(request.body);

        logger.info(
          {
            question: requestData.question,
            examVariant: requestData.examVariant,
            mode: requestData.mode,
            sessionId: requestData.context?.sessionId,
            requestId: (request as any).requestId,
          },
          'Processing coach request'
        );

        // Create coach context
        const context: CoachContext = {
          examVariant: requestData.examVariant,
          ...(requestData.context?.topic && { topic: requestData.context.topic }),
          ...(requestData.context?.subtopic && { subtopic: requestData.context.subtopic }),
          ...(requestData.context?.difficulty && { difficulty: requestData.context.difficulty }),
          ...(requestData.context?.studentLevel && {
            studentLevel: requestData.context.studentLevel,
          }),
          ...(requestData.context?.previousQuestions && {
            previousQuestions: requestData.context.previousQuestions,
          }),
          ...(requestData.context?.sessionId && { sessionId: requestData.context.sessionId }),
        };

        // Process question with VAM
        const response = await withSpan(
          'coach_process_question',
          async () => {
            return vamCoach.processQuestion(requestData.question, context);
          },
          {
            attributes: {
              'coach.exam_variant': requestData.examVariant,
              'coach.mode': requestData.mode,
              'coach.question_length': requestData.question.length,
              'coach.has_context': !!requestData.context,
            },
          }
        );

        const processingTime = Date.now() - startTime;

        // Set custom headers for answer verification status
        reply.header('X-Answer-Verified', response.verified.toString());
        reply.header('X-Answer-Trust', response.trustScore.toString());

        // Update metadata with actual processing time
        response.metadata.processingTime = processingTime;

        logger.info(
          {
            question: requestData.question,
            examVariant: requestData.examVariant,
            verified: response.verified,
            trustScore: response.trustScore,
            processingTime,
            requestId: (request as any).requestId,
          },
          'Coach request completed'
        );

        return response;
      } catch (error) {
        const processingTime = Date.now() - startTime;

        if (error instanceof z.ZodError) {
          logger.warn(
            {
              error: error.errors,
              body: request.body,
              processingTime,
              requestId: (request as any).requestId,
            },
            'Coach request validation failed'
          );

          reply.status(400);
          return {
            error: {
              message: 'Invalid request parameters',
              statusCode: 400,
              validation: error.errors,
            },
          };
        }

        logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            body: request.body,
            processingTime,
            requestId: (request as any).requestId,
          },
          'Coach request failed'
        );

        reply.status(500);
        return {
          error: {
            message: 'Internal server error',
            statusCode: 500,
          },
        };
      }
    }
  );

  // Health check for coach service
  fastify.get(
    '/health',
    {
      schema: {
        description: 'Health check for coach service',
        tags: ['coach'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
              services: {
                type: 'object',
                properties: {
                  vam: { type: 'string' },
                  retrieval: { type: 'string' },
                  verification: { type: 'string' },
                  llm: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // TODO: Add actual health checks for dependencies
        const healthData = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            vam: 'healthy',
            retrieval: 'healthy',
            verification: 'healthy',
            llm: 'healthy',
          },
        };

        logger.debug(
          {
            requestId: (request as any).requestId,
          },
          'Coach health check completed'
        );

        return healthData;
      } catch (error) {
        logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId: (request as any).requestId,
          },
          'Coach health check failed'
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

  // Get coach configuration
  fastify.get(
    '/config',
    {
      schema: {
        description: 'Get coach configuration',
        tags: ['coach'],
        response: {
          200: {
            type: 'object',
            properties: {
              vam: {
                type: 'object',
                properties: {
                  minTrustThreshold: { type: 'number' },
                  maxRetries: { type: 'number' },
                  enableCanonicalFirst: { type: 'boolean' },
                  enableRetrieval: { type: 'boolean' },
                  enableVerification: { type: 'boolean' },
                  enablePostprocessing: { type: 'boolean' },
                  cacheVerifiedOnly: { type: 'boolean' },
                  suggestionsCount: { type: 'number' },
                },
              },
              supportedSubjects: {
                type: 'array',
                items: { type: 'string' },
              },
              supportedVariants: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const configData = {
          vam: {
            minTrustThreshold: 0.92,
            maxRetries: 1,
            enableCanonicalFirst: true,
            enableRetrieval: true,
            enableVerification: true,
            enablePostprocessing: true,
            cacheVerifiedOnly: true,
            suggestionsCount: 3,
          },
          supportedSubjects: ['calc'],
          supportedVariants: ['calc_ab', 'calc_bc'],
        };

        logger.debug(
          {
            requestId: (request as any).requestId,
          },
          'Coach config requested'
        );

        return configData;
      } catch (error) {
        logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId: (request as any).requestId,
          },
          'Failed to get coach config'
        );

        reply.status(500);
        return {
          error: {
            message: 'Internal server error',
            statusCode: 500,
          },
        };
      }
    }
  );

  logger.info('Coach routes registered');
};
