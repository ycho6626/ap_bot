import { z } from 'zod';
import { apiErrorSchema, verificationSourceSchema } from './common';

export const coachContextSchema = z
  .object({
    topic: z.string().optional(),
    subtopic: z.string().optional(),
    difficulty: z.string().optional(),
    studentLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    previousQuestions: z.array(z.string()).optional(),
    sessionId: z.string().optional(),
  })
  .optional();

export const coachRequestSchema = z.object({
  subject: z.literal('calc').default('calc'),
  examVariant: z.enum(['calc_ab', 'calc_bc']).default('calc_ab'),
  mode: z.enum(['vam', 'standard']).default('vam'),
  question: z.string().min(1).max(2000),
  context: coachContextSchema,
});

export const coachMetadataSchema = z.object({
  examVariant: z.string().optional(),
  topic: z.string().optional(),
  subtopic: z.string().optional(),
  difficulty: z.string().optional(),
  processingTime: z.number().optional(),
  retryCount: z.number().optional(),
});

export const coachResponseSchema = z.object({
  answer: z.string(),
  verified: z.boolean(),
  trustScore: z.number(),
  confidence: z.number(),
  sources: z.array(verificationSourceSchema).default([]),
  suggestions: z.array(z.string()).default([]),
  metadata: coachMetadataSchema.optional(),
});

export const coachHealthSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  services: z.object({
    vam: z.string(),
    retrieval: z.string(),
    verification: z.string(),
    llm: z.string(),
  }),
});

export const coachConfigSchema = z.object({
  vam: z.object({
    minTrustThreshold: z.number(),
    maxRetries: z.number(),
    enableCanonicalFirst: z.boolean(),
    enableRetrieval: z.boolean(),
    enableVerification: z.boolean(),
    enablePostprocessing: z.boolean(),
    cacheVerifiedOnly: z.boolean(),
    suggestionsCount: z.number(),
  }),
  supportedSubjects: z.array(z.string()),
  supportedVariants: z.array(z.string()),
});

export const coachErrorResponseSchema = apiErrorSchema;
