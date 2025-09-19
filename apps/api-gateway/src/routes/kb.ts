import { FastifyPluginAsync } from 'fastify';
import { createLogger } from '@ap/shared/logger';
import { withSpan } from '@ap/shared/tracing';
import { hybridRetrieval } from '@ap/tutor/retrieval';
import type { HybridSearchOptions } from '@ap/tutor/retrieval';
import {
  knowledgeSearchRequestSchema,
  knowledgeSearchResponseSchema,
  knowledgeErrorResponseSchema,
  knowledgeDocumentParamsSchema,
  knowledgeDocumentResponseSchema,
  makeErrorResponse,
} from '../schemas';
import { z } from 'zod';
import { ensureErrorHandling } from '../utils/errorHandling';

const logger = createLogger('kb-routes');

/**
 * Knowledge base search routes
 */
export const kbRoutes: FastifyPluginAsync = async fastify => {
  ensureErrorHandling(fastify);

  // Search knowledge base
  fastify.get(
    '/search',
    {
      schema: {
        description: 'Search the knowledge base for relevant content',
        tags: ['knowledge-base'],
        querystring: knowledgeSearchRequestSchema,
        response: {
          200: knowledgeSearchResponseSchema,
          400: knowledgeErrorResponseSchema,
          500: knowledgeErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const startTime = Date.now();
      const requestId = request.requestId ?? request.id;
      type RawSearchQuerystring = {
        subject?: string;
        examVariant?: 'calc_ab' | 'calc_bc';
        query?: string;
        limit?: string | number;
        minScore?: string | number;
        includePartitions?: string | string[];
        excludePartitions?: string | string[];
      };

      const rawQuery = request.query as RawSearchQuerystring;
      const toArray = (value?: string | string[]) => {
        if (Array.isArray(value)) return value.filter(Boolean);
        if (typeof value === 'string') {
          return value
            .split(',')
            .map(partition => partition.trim())
            .filter(Boolean);
        }
        return undefined;
      };

      try {
        // Parse and validate query parameters
        const queryParams = knowledgeSearchRequestSchema.parse({
          subject: rawQuery.subject,
          examVariant: rawQuery.examVariant,
          query: rawQuery.query,
          limit:
            typeof rawQuery.limit === 'string'
              ? Number.parseInt(rawQuery.limit, 10)
              : rawQuery.limit,
          minScore:
            typeof rawQuery.minScore === 'string'
              ? Number.parseFloat(rawQuery.minScore)
              : rawQuery.minScore,
          includePartitions: toArray(rawQuery.includePartitions),
          excludePartitions: toArray(rawQuery.excludePartitions),
        });

        logger.info(
          {
            query: queryParams.query,
            examVariant: queryParams.examVariant,
            limit: queryParams.limit,
            requestId,
          },
          'Starting knowledge base search'
        );

        // Perform search with tracing
        const results = await withSpan(
          'kb_search',
          async () => {
            const searchOptions: HybridSearchOptions = {
              examVariant: queryParams.examVariant,
            };

            if (queryParams.limit !== undefined) searchOptions.limit = queryParams.limit;
            if (queryParams.minScore !== undefined) searchOptions.minScore = queryParams.minScore;
            if (queryParams.includePartitions !== undefined)
              searchOptions.includePartitions = queryParams.includePartitions;
            if (queryParams.excludePartitions !== undefined)
              searchOptions.excludePartitions = queryParams.excludePartitions;

            return hybridRetrieval.search(queryParams.query, searchOptions);
          },
          {
            attributes: {
              'kb.query': queryParams.query,
              'kb.exam_variant': queryParams.examVariant,
              'kb.limit': queryParams.limit,
            },
          }
        );

        const searchTime = Date.now() - startTime;
        const maxScore = results.length > 0 ? (results[0]?.score ?? 0) : 0;

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
            requestId,
          },
          'Knowledge base search completed'
        );

        return response;
      } catch (error) {
        const searchTime = Date.now() - startTime;

        if (error instanceof z.ZodError) {
          logger.warn(
            {
              error: error.errors,
              query: rawQuery,
              searchTime,
              requestId,
            },
            'Knowledge base search validation failed'
          );

          void reply.status(400);
          return makeErrorResponse(400, 'Invalid request parameters', {
            validation: error.errors,
          });
        }

        logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            query: rawQuery,
            searchTime,
            requestId,
          },
          'Knowledge base search failed'
        );

        void reply.status(500);
        return makeErrorResponse(500, 'Internal server error');
      }
    }
  );

  // Get document by ID
  fastify.get(
    '/document/:id',
    {
      schema: {
        description: 'Get a specific knowledge base document by ID',
        tags: ['knowledge-base'],
        params: knowledgeDocumentParamsSchema,
        response: {
          200: knowledgeDocumentResponseSchema,
          404: knowledgeErrorResponseSchema,
          500: knowledgeErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const requestId = request.requestId ?? request.id;
      let documentId: string | undefined;

      try {
        const { id } = knowledgeDocumentParamsSchema.parse(request.params);
        documentId = id;

        logger.info(
          {
            documentId: id,
            requestId,
          },
          'Fetching knowledge base document'
        );

        // TODO: Implement document fetching from Supabase
        // For now, return a 404
        void reply.status(404);
        return makeErrorResponse(404, 'Document not found', { code: 'DOCUMENT_NOT_FOUND' });
      } catch (error) {
        logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            documentId,
            requestId,
          },
          'Failed to fetch knowledge base document'
        );

        void reply.status(500);
        return makeErrorResponse(500, 'Internal server error');
      }
    }
  );

  logger.info('Knowledge base routes registered');

  await Promise.resolve();
};
