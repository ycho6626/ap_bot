import { z } from 'zod';
import { apiErrorSchema, verificationSourceSchema, paginationSchema } from './common';

export const reviewStatusSchema = z.enum(['pending', 'approved', 'rejected', 'needs_revision']);

export const reviewMetadataSchema = z.object({
  examVariant: z.string().optional(),
  topic: z.string().optional(),
  subtopic: z.string().optional(),
  difficulty: z.string().optional(),
  processingTime: z.number().optional(),
  retryCount: z.number().optional(),
});

export const reviewSubmitRequestSchema = z.object({
  question: z.string().min(1).max(2000),
  answer: z.string().min(1).max(10000),
  examVariant: z.enum(['calc_ab', 'calc_bc']),
  trustScore: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  sources: z.array(verificationSourceSchema).optional(),
  metadata: reviewMetadataSchema.optional(),
});

export const reviewSubmitResponseSchema = z.object({
  id: z.string(),
  status: reviewStatusSchema,
  message: z.string(),
});

export const reviewCaseSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  examVariant: z.string(),
  trustScore: z.number(),
  confidence: z.number().nullable().optional(),
  sources: z.array(verificationSourceSchema).default([]),
  metadata: reviewMetadataSchema.optional(),
  status: reviewStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

export const reviewQuerySchema = z.object({
  status: reviewStatusSchema.default('pending'),
  examVariant: z.enum(['calc_ab', 'calc_bc']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const reviewCasesResponseSchema = z.object({
  cases: z.array(reviewCaseSchema),
  pagination: paginationSchema,
});

export const reviewResolveRequestSchema = z.object({
  caseId: z.string(),
  action: z.enum(['approve', 'reject', 'request_revision']),
  feedback: z.string().max(1000).optional(),
  correctedAnswer: z.string().max(10000).optional(),
  tags: z.array(z.string()).optional(),
});

export const reviewResolveResponseSchema = z.object({
  id: z.string(),
  status: reviewStatusSchema,
  message: z.string(),
});

export const reviewNotFoundResponseSchema = apiErrorSchema;
export const reviewErrorResponseSchema = apiErrorSchema;
