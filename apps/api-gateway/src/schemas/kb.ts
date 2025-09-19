import { z } from 'zod';
import { apiErrorSchema } from './common';

export const knowledgeSearchRequestSchema = z.object({
  subject: z.literal('calc').default('calc'),
  examVariant: z.enum(['calc_ab', 'calc_bc']).default('calc_ab'),
  query: z.string().min(1).max(500),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  minScore: z.coerce.number().min(0).max(1).default(0.1),
  includePartitions: z.array(z.string()).optional(),
  excludePartitions: z.array(z.string()).optional(),
});

export const knowledgeDocumentParamsSchema = z.object({
  id: z.string(),
});

export const knowledgeDocumentSchema = z.object({
  id: z.string(),
  content: z.string(),
  subject: z.string(),
  exam_variant: z.string().nullable(),
  partition: z.string(),
  topic: z.string().nullable(),
  subtopic: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const knowledgeSearchResultSchema = z.object({
  document: knowledgeDocumentSchema,
  score: z.number(),
  snippet: z.string().optional(),
  provenance: z
    .object({
      source: z.string(),
      partition: z.string(),
      topic: z.string().nullable().optional(),
      subtopic: z.string().nullable().optional(),
    })
    .optional(),
});

export const knowledgeSearchResponseSchema = z.object({
  results: z.array(knowledgeSearchResultSchema),
  metadata: z.object({
    query: z.string(),
    examVariant: z.string(),
    totalResults: z.number(),
    maxScore: z.number().optional(),
    searchTime: z.number().optional(),
  }),
});

export const knowledgeDocumentResponseSchema = z.object({
  document: knowledgeDocumentSchema,
});

export const knowledgeErrorResponseSchema = apiErrorSchema;
