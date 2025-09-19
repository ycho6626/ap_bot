import { z } from 'zod';

export const apiErrorSchema = z.object({
  error: z.object({
    message: z.string().describe('Human readable error message'),
    statusCode: z.number().describe('HTTP status code associated with the error'),
    code: z.string().optional().describe('Application-specific error code'),
    validation: z.any().optional().describe('Validation errors when applicable'),
    details: z.any().optional().describe('Additional error context'),
  }),
});

export type ApiErrorResponse = z.infer<typeof apiErrorSchema>;

export function makeErrorResponse(
  statusCode: number,
  message: string,
  options: {
    code?: string;
    validation?: unknown;
    details?: unknown;
  } = {}
): ApiErrorResponse {
  return {
    error: {
      message,
      statusCode,
      ...(options.code ? { code: options.code } : {}),
      ...(options.validation ? { validation: options.validation } : {}),
      ...(options.details ? { details: options.details } : {}),
    },
  };
}

export const healthServiceErrorSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  error: z.string(),
  dependencies: z
    .object({
      supabase: z.string(),
      openai: z.string(),
      verifier: z.string(),
      stripe: z.string(),
    })
    .partial()
    .optional(),
});

export const paginationSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  hasMore: z.boolean(),
});

export const verificationSourceSchema = z.object({
  type: z.enum(['canonical', 'retrieval', 'generated']),
  id: z.string(),
  title: z.string().optional(),
  snippet: z.string().optional(),
  score: z.number().optional(),
});

export type ErrorResponse = ApiErrorResponse;
