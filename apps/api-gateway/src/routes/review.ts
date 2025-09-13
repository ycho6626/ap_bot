import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createLogger } from '@ap/shared/logger';
import { withSpan } from '@ap/shared/tracing';
import { supabaseService } from '@ap/shared/supabase';

const logger = createLogger('review-routes');

/**
 * Review case schema
 */
/*
const reviewCaseSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  examVariant: z.enum(['calc_ab', 'calc_bc']),
  trustScore: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  sources: z.array(z.object({
    type: z.enum(['canonical', 'retrieval', 'generated']),
    id: z.string(),
    title: z.string().optional(),
    snippet: z.string().optional(),
    score: z.number().optional(),
  })),
  metadata: z.object({
    examVariant: z.string(),
    topic: z.string().optional(),
    subtopic: z.string().optional(),
    difficulty: z.string().optional(),
    processingTime: z.number(),
    retryCount: z.number(),
  }),
  status: z.enum(['pending', 'approved', 'rejected', 'needs_revision']),
  created_at: z.string(),
  updated_at: z.string(),
});
*/

/**
 * Review action schema
 */
const reviewActionSchema = z.object({
  caseId: z.string(),
  action: z.enum(['approve', 'reject', 'request_revision']),
  feedback: z.string().optional(),
  correctedAnswer: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Review routes for HiTL (Human-in-the-Loop) functionality
 */
export const reviewRoutes: FastifyPluginAsync = async fastify => {
  // Submit a case for review
  fastify.post(
    '/',
    {
      schema: {
        description: 'Submit a case for human review',
        tags: ['review'],
        body: {
          type: 'object',
          properties: {
            question: {
              type: 'string',
              minLength: 1,
              maxLength: 2000,
              description: 'Student question',
            },
            answer: {
              type: 'string',
              minLength: 1,
              maxLength: 10000,
              description: 'Generated answer',
            },
            examVariant: {
              type: 'string',
              enum: ['calc_ab', 'calc_bc'],
              description: 'Exam variant',
            },
            trustScore: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Trust score of the answer',
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Confidence score of the answer',
            },
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
              description: 'Sources used for the answer',
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
              description: 'Additional metadata',
            },
          },
          required: ['question', 'answer', 'examVariant', 'trustScore', 'confidence'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              status: { type: 'string' },
              message: { type: 'string' },
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
      try {
        const requestData = z
          .object({
            question: z.string().min(1).max(2000),
            answer: z.string().min(1).max(10000),
            examVariant: z.enum(['calc_ab', 'calc_bc']),
            trustScore: z.number().min(0).max(1),
            confidence: z.number().min(0).max(1),
            sources: z
              .array(
                z.object({
                  type: z.enum(['canonical', 'retrieval', 'generated']),
                  id: z.string(),
                  title: z.string().optional(),
                  snippet: z.string().optional(),
                  score: z.number().optional(),
                })
              )
              .optional(),
            metadata: z
              .object({
                examVariant: z.string(),
                topic: z.string().optional(),
                subtopic: z.string().optional(),
                difficulty: z.string().optional(),
                processingTime: z.number(),
                retryCount: z.number(),
              })
              .optional(),
          })
          .parse(request.body);

        logger.info(
          {
            question: requestData.question,
            examVariant: requestData.examVariant,
            trustScore: requestData.trustScore,
            requestId: (request as any).requestId,
          },
          'Submitting case for review'
        );

        // Create review case in database
        const reviewCase = await withSpan(
          'review_create_case',
          async () => {
            const { data, error } = await supabaseService
              .from('review_case')
              .insert({
                question: requestData.question,
                answer: requestData.answer,
                exam_variant: requestData.examVariant,
                trust_score: requestData.trustScore,
                confidence: requestData.confidence,
                sources: requestData.sources || [],
                metadata: requestData.metadata || {},
                status: 'pending',
              })
              .select()
              .single();

            if (error) {
              throw new Error(`Failed to create review case: ${error.message}`);
            }

            return data;
          },
          {
            attributes: {
              'review.exam_variant': requestData.examVariant,
              'review.trust_score': requestData.trustScore,
            },
          }
        );

        logger.info(
          {
            caseId: reviewCase.id,
            question: requestData.question,
            requestId: (request as any).requestId,
          },
          'Review case created successfully'
        );

        reply.status(201);
        return {
          id: reviewCase.id,
          status: 'pending',
          message: 'Case submitted for review',
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.warn(
            {
              error: error.errors,
              body: request.body,
              requestId: (request as any).requestId,
            },
            'Review case validation failed'
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
            requestId: (request as any).requestId,
          },
          'Failed to create review case'
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

  // Get pending review cases
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get pending review cases (teacher only)',
        tags: ['review'],
        querystring: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['pending', 'approved', 'rejected', 'needs_revision'],
              default: 'pending',
              description: 'Filter by status',
            },
            examVariant: {
              type: 'string',
              enum: ['calc_ab', 'calc_bc'],
              description: 'Filter by exam variant',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20,
              description: 'Maximum number of cases to return',
            },
            offset: {
              type: 'integer',
              minimum: 0,
              default: 0,
              description: 'Number of cases to skip',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              cases: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    question: { type: 'string' },
                    answer: { type: 'string' },
                    examVariant: { type: 'string' },
                    trustScore: { type: 'number' },
                    confidence: { type: 'number' },
                    sources: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          type: { type: 'string' },
                          id: { type: 'string' },
                          title: { type: 'string' },
                          snippet: { type: 'string' },
                          score: { type: 'number' },
                        },
                      },
                    },
                    metadata: { type: 'object' },
                    status: { type: 'string' },
                    created_at: { type: 'string' },
                    updated_at: { type: 'string' },
                  },
                },
              },
              pagination: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  limit: { type: 'number' },
                  offset: { type: 'number' },
                  hasMore: { type: 'boolean' },
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
      try {
        const queryParams = z
          .object({
            status: z
              .enum(['pending', 'approved', 'rejected', 'needs_revision'])
              .default('pending'),
            examVariant: z.enum(['calc_ab', 'calc_bc']).optional(),
            limit: z.number().int().min(1).max(100).default(20),
            offset: z.number().int().min(0).default(0),
          })
          .parse(request.query);

        logger.info(
          {
            status: queryParams.status,
            examVariant: queryParams.examVariant,
            limit: queryParams.limit,
            offset: queryParams.offset,
            requestId: (request as any).requestId,
          },
          'Fetching review cases'
        );

        // Build query
        let query = supabaseService
          .from('review_case')
          .select('*', { count: 'exact' })
          .eq('status', queryParams.status)
          .order('created_at', { ascending: false })
          .range(queryParams.offset, queryParams.offset + queryParams.limit - 1);

        if (queryParams.examVariant) {
          query = query.eq('exam_variant', queryParams.examVariant);
        }

        const { data, error, count } = await query;

        if (error) {
          throw new Error(`Failed to fetch review cases: ${error.message}`);
        }

        const cases = (data || []).map(case_ => ({
          id: case_.id,
          question: case_.question,
          answer: case_.answer,
          examVariant: case_.exam_variant,
          trustScore: case_.trust_score,
          confidence: case_.confidence,
          sources: case_.sources || [],
          metadata: case_.metadata || {},
          status: case_.status,
          created_at: case_.created_at,
          updated_at: case_.updated_at,
        }));

        const total = count || 0;
        const hasMore = queryParams.offset + queryParams.limit < total;

        logger.info(
          {
            totalCases: total,
            returnedCases: cases.length,
            hasMore,
            requestId: (request as any).requestId,
          },
          'Review cases fetched successfully'
        );

        return {
          cases,
          pagination: {
            total,
            limit: queryParams.limit,
            offset: queryParams.offset,
            hasMore,
          },
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.warn(
            {
              error: error.errors,
              query: request.query,
              requestId: (request as any).requestId,
            },
            'Review cases query validation failed'
          );

          reply.status(400);
          return {
            error: {
              message: 'Invalid query parameters',
              statusCode: 400,
              validation: error.errors,
            },
          };
        }

        logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            query: request.query,
            requestId: (request as any).requestId,
          },
          'Failed to fetch review cases'
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

  // Resolve a review case
  fastify.post(
    '/resolve',
    {
      schema: {
        description: 'Resolve a review case (teacher only)',
        tags: ['review'],
        body: {
          type: 'object',
          properties: {
            caseId: {
              type: 'string',
              description: 'Review case ID',
            },
            action: {
              type: 'string',
              enum: ['approve', 'reject', 'request_revision'],
              description: 'Action to take',
            },
            feedback: {
              type: 'string',
              maxLength: 1000,
              description: 'Feedback for the case',
            },
            correctedAnswer: {
              type: 'string',
              maxLength: 10000,
              description: 'Corrected answer (for request_revision)',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags for categorization',
            },
          },
          required: ['caseId', 'action'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              status: { type: 'string' },
              message: { type: 'string' },
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
          404: {
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
      try {
        const requestData = reviewActionSchema.parse(request.body);

        logger.info(
          {
            caseId: requestData.caseId,
            action: requestData.action,
            requestId: (request as any).requestId,
          },
          'Resolving review case'
        );

        // Update review case status
        const updatedCase = await withSpan(
          'review_resolve_case',
          async () => {
            const updateData: any = {
              status:
                requestData.action === 'approve'
                  ? 'approved'
                  : requestData.action === 'reject'
                    ? 'rejected'
                    : 'needs_revision',
              updated_at: new Date().toISOString(),
            };

            if (requestData.feedback) {
              updateData.feedback = requestData.feedback;
            }

            if (requestData.correctedAnswer) {
              updateData.corrected_answer = requestData.correctedAnswer;
            }

            if (requestData.tags) {
              updateData.tags = requestData.tags;
            }

            const { data, error } = await supabaseService
              .from('review_case')
              .update(updateData)
              .eq('id', requestData.caseId)
              .select()
              .single();

            if (error) {
              throw new Error(`Failed to update review case: ${error.message}`);
            }

            if (!data) {
              throw new Error('Review case not found');
            }

            return data;
          },
          {
            attributes: {
              'review.case_id': requestData.caseId,
              'review.action': requestData.action,
            },
          }
        );

        // Create review action record
        await withSpan(
          'review_create_action',
          async () => {
            const { error } = await supabaseService.from('review_action').insert({
              case_id: requestData.caseId,
              action: requestData.action,
              feedback: requestData.feedback,
              corrected_answer: requestData.correctedAnswer,
              tags: requestData.tags || [],
              created_at: new Date().toISOString(),
            });

            if (error) {
              throw new Error(`Failed to create review action: ${error.message}`);
            }
          },
          {
            attributes: {
              'review.case_id': requestData.caseId,
              'review.action': requestData.action,
            },
          }
        );

        logger.info(
          {
            caseId: requestData.caseId,
            action: requestData.action,
            newStatus: updatedCase.status,
            requestId: (request as any).requestId,
          },
          'Review case resolved successfully'
        );

        return {
          id: updatedCase.id,
          status: updatedCase.status,
          message: `Case ${requestData.action}d successfully`,
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.warn(
            {
              error: error.errors,
              body: request.body,
              requestId: (request as any).requestId,
            },
            'Review action validation failed'
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

        if (error instanceof Error && error.message.includes('not found')) {
          logger.warn(
            {
              caseId: (request.body as any)?.caseId,
              requestId: (request as any).requestId,
            },
            'Review case not found'
          );

          reply.status(404);
          return {
            error: {
              message: 'Review case not found',
              statusCode: 404,
            },
          };
        }

        logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            body: request.body,
            requestId: (request as any).requestId,
          },
          'Failed to resolve review case'
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

  logger.info('Review routes registered');
};
