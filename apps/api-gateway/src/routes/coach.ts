import { FastifyPluginAsync } from 'fastify';
import { createLogger } from '@ap/shared/logger';
import { withSpan } from '@ap/shared/tracing';
import { vamCoach, type CoachContext } from '@ap/tutor/coach';
import { evaluateQuestion } from '../services/questionGuard';
import {
  coachConfigSchema,
  coachHealthSchema,
  coachRequestSchema,
  coachResponseSchema,
  coachErrorResponseSchema,
  healthUnhealthySchema,
  makeErrorResponse,
} from '../schemas';
import { z } from 'zod';
import { ensureErrorHandling } from '../utils/errorHandling';

const logger = createLogger('coach-routes');

/**
 * Coach routes for VAM (Verified Answer Mode) orchestration
 */
export const coachRoutes: FastifyPluginAsync = async fastify => {
  ensureErrorHandling(fastify);

  // Main coach endpoint
  fastify.post(
    '/',
    {
      schema: {
        description: 'Process a student question using VAM (Verified Answer Mode)',
        tags: ['coach'],
        body: coachRequestSchema,
        response: {
          200: coachResponseSchema,
          400: coachErrorResponseSchema,
          500: coachErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const startTime = Date.now();
      const requestId = request.requestId ?? request.id;

      try {
        // Parse and validate request body
        const requestData = coachRequestSchema.parse(request.body);

        logger.info(
          {
            question: requestData.question,
            examVariant: requestData.examVariant,
            mode: requestData.mode,
            sessionId: requestData.context?.sessionId,
            requestId,
          },
          'Processing coach request'
        );

        const guardEvaluation = evaluateQuestion(requestData.question);

        if (guardEvaluation.safety.status === 'unsafe') {
          logger.warn(
            {
              requestId,
              category: guardEvaluation.safety.category,
            },
            'Blocked unsafe coach request'
          );

          void reply.status(403);
          return makeErrorResponse(
            403,
            "I'm sorry, but I can't help with that request. Please reach out to a trusted adult or professional for support.",
            { code: 'UNSAFE_CONTENT', details: guardEvaluation.safety }
          );
        }

        if (guardEvaluation.classification.label !== 'in_scope') {
          logger.info(
            {
              requestId,
              classification: guardEvaluation.classification,
            },
            'Declined non-calculus coach request'
          );

          void reply.status(422);
          return makeErrorResponse(
            422,
            'The AP Calculus Coach can only answer AP Calculus AB/BC questions. Try rephrasing with calculus-specific details.',
            { code: 'OUT_OF_SCOPE', details: guardEvaluation.classification }
          );
        }

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
              'coach.guard.label': guardEvaluation.classification.label,
              'coach.guard.score': guardEvaluation.classification.score,
            },
          }
        );

        const processingTime = Date.now() - startTime;

        // Set custom headers for answer verification status
        void reply.header('X-Answer-Verified', response.verified.toString());
        void reply.header('X-Answer-Trust', response.trustScore.toString());

        // Update metadata with actual processing time
        response.metadata.processingTime = processingTime;

        logger.info(
          {
            question: requestData.question,
            examVariant: requestData.examVariant,
            verified: response.verified,
            trustScore: response.trustScore,
            processingTime,
            requestId,
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
              requestId,
            },
            'Coach request validation failed'
          );

          void reply.status(400);
          return makeErrorResponse(400, 'Invalid request parameters', {
            validation: error.errors,
          });
        }

        logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            body: request.body,
            processingTime,
            requestId,
          },
          'Coach request failed'
        );

        void reply.status(500);
        return makeErrorResponse(500, 'Internal server error');
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
          200: coachHealthSchema,
          503: healthUnhealthySchema,
        },
      },
    },
    async (request, reply) => {
      const requestId = request.requestId ?? request.id;

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

        logger.debug({ requestId }, 'Coach health check completed');

        return healthData;
      } catch (error) {
        logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId,
          },
          'Coach health check failed'
        );

        void reply.status(503);
        return makeErrorResponse(503, error instanceof Error ? error.message : 'Unknown error');
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
          200: coachConfigSchema,
          500: coachErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const requestId = request.requestId ?? request.id;

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

        logger.debug({ requestId }, 'Coach config requested');

        return configData;
      } catch (error) {
        logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId,
          },
          'Failed to get coach config'
        );

        void reply.status(500);
        return makeErrorResponse(500, 'Internal server error');
      }
    }
  );

  logger.info('Coach routes registered');

  await Promise.resolve();
};
