import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createLogger } from '@ap/shared/logger';
import { withSpan } from '@ap/shared/tracing';
import { hybridRetrieval } from '@ap/tutor/retrieval';

const logger = createLogger('kb-routes');

/**
 * Knowledge base search request schema
 */
const searchRequestSchema = z.object({
  subject: z.literal('calc').default('calc'),
  examVariant: z.enum(['calc_ab', 'calc_bc']).default('calc_ab'),
  query: z.string().min(1, 'Query is required').max(500, 'Query too long'),
  limit: z.number().int().min(1).max(50).default(10),
  minScore: z.number().min(0).max(1).default(0.1),
  includePartitions: z.array(z.string()).optional(),
  excludePartitions: z.array(z.string()).optional(),
});

/**
 * Knowledge base search routes
 */
export const kbRoutes: FastifyPluginAsync = async (fastify) => {
  // Search knowledge base
  fastify.get('/search', {
    schema: {
      description: 'Search the knowledge base for relevant content',
      tags: ['knowledge-base'],
      querystring: {
        type: 'object',
        properties: {
          subject: {
            type: 'string',
            enum: ['calc'],
            default: 'calc',
            description: 'Subject to search (currently only calc supported)',
          },
          examVariant: {
            type: 'string',
            enum: ['calc_ab', 'calc_bc'],
            default: 'calc_ab',
            description: 'Exam variant to search for',
          },
          query: {
            type: 'string',
            minLength: 1,
            maxLength: 500,
            description: 'Search query',
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 50,
            default: 10,
            description: 'Maximum number of results to return',
          },
          minScore: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            default: 0.1,
            description: 'Minimum relevance score for results',
          },
          includePartitions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Partitions to include in search (public_kb, paraphrased_kb, private_kb)',
          },
          excludePartitions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Partitions to exclude from search',
          },
        },
        required: ['query'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  document: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      content: { type: 'string' },
                      subject: { type: 'string' },
                      exam_variant: { type: ['string', 'null'] },
                      partition: { type: 'string' },
                      topic: { type: ['string', 'null'] },
                      subtopic: { type: ['string', 'null'] },
                      created_at: { type: 'string' },
                      updated_at: { type: 'string' },
                    },
                  },
                  score: { type: 'number' },
                  snippet: { type: 'string' },
                  provenance: {
                    type: 'object',
                    properties: {
                      source: { type: 'string' },
                      partition: { type: 'string' },
                      topic: { type: ['string', 'null'] },
                      subtopic: { type: ['string', 'null'] },
                    },
                  },
                },
              },
            },
            metadata: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                examVariant: { type: 'string' },
                totalResults: { type: 'number' },
                maxScore: { type: 'number' },
                searchTime: { type: 'number' },
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
  }, async (request, reply) => {
    const startTime = Date.now();
    
    try {
      // Parse and validate query parameters
      const queryParams = searchRequestSchema.parse({
        subject: request.query.subject,
        examVariant: request.query.examVariant,
        query: request.query.query,
        limit: request.query.limit ? parseInt(request.query.limit as string, 10) : undefined,
        minScore: request.query.minScore ? parseFloat(request.query.minScore as string) : undefined,
        includePartitions: request.query.includePartitions 
          ? (request.query.includePartitions as string).split(',').map(p => p.trim())
          : undefined,
        excludePartitions: request.query.excludePartitions
          ? (request.query.excludePartitions as string).split(',').map(p => p.trim())
          : undefined,
      });

      logger.info(
        {
          query: queryParams.query,
          examVariant: queryParams.examVariant,
          limit: queryParams.limit,
          requestId: (request as any).requestId,
        },
        'Starting knowledge base search',
      );

      // Perform search with tracing
      const results = await withSpan(
        'kb_search',
        async () => {
          return hybridRetrieval.search(queryParams.query, {
            examVariant: queryParams.examVariant,
            limit: queryParams.limit,
            minScore: queryParams.minScore,
            includePartitions: queryParams.includePartitions,
            excludePartitions: queryParams.excludePartitions,
          });
        },
        {
          attributes: {
            'kb.query': queryParams.query,
            'kb.exam_variant': queryParams.examVariant,
            'kb.limit': queryParams.limit,
          },
        },
      );

      const searchTime = Date.now() - startTime;
      const maxScore = results.length > 0 ? results[0].score : 0;

      const response = {
        results: results.map(result => ({
          document: {
            id: result.document.id,
            content: result.document.content,
            subject: result.document.subject,
            exam_variant: result.document.exam_variant,
            partition: result.document.partition,
            topic: result.document.topic,
            subtopic: result.document.subtopic,
            created_at: result.document.created_at,
            updated_at: result.document.updated_at,
          },
          score: result.score,
          snippet: result.snippet,
          provenance: result.provenance,
        })),
        metadata: {
          query: queryParams.query,
          examVariant: queryParams.examVariant,
          totalResults: results.length,
          maxScore,
          searchTime,
        },
      };

      logger.info(
        {
          query: queryParams.query,
          examVariant: queryParams.examVariant,
          totalResults: results.length,
          maxScore,
          searchTime,
          requestId: (request as any).requestId,
        },
        'Knowledge base search completed',
      );

      return response;
    } catch (error) {
      const searchTime = Date.now() - startTime;
      
      if (error instanceof z.ZodError) {
        logger.warn(
          {
            error: error.errors,
            query: request.query,
            searchTime,
            requestId: (request as any).requestId,
          },
          'Knowledge base search validation failed',
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
          query: request.query,
          searchTime,
          requestId: (request as any).requestId,
        },
        'Knowledge base search failed',
      );

      reply.status(500);
      return {
        error: {
          message: 'Internal server error',
          statusCode: 500,
        },
      };
    }
  });

  // Get document by ID
  fastify.get('/document/:id', {
    schema: {
      description: 'Get a specific knowledge base document by ID',
      tags: ['knowledge-base'],
      params: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Document ID',
          },
        },
        required: ['id'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            document: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                content: { type: 'string' },
                subject: { type: 'string' },
                exam_variant: { type: ['string', 'null'] },
                partition: { type: 'string' },
                topic: { type: ['string', 'null'] },
                subtopic: { type: ['string', 'null'] },
                created_at: { type: 'string' },
                updated_at: { type: 'string' },
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
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      logger.info(
        {
          documentId: id,
          requestId: (request as any).requestId,
        },
        'Fetching knowledge base document',
      );

      // TODO: Implement document fetching from Supabase
      // For now, return a 404
      reply.status(404);
      return {
        error: {
          message: 'Document not found',
          statusCode: 404,
        },
      };
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          documentId: (request.params as any)?.id,
          requestId: (request as any).requestId,
        },
        'Failed to fetch knowledge base document',
      );

      reply.status(500);
      return {
        error: {
          message: 'Internal server error',
          statusCode: 500,
        },
      };
    }
  });

  logger.info('Knowledge base routes registered');
};
