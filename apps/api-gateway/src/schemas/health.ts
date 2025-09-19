import { z } from 'zod';
import { healthServiceErrorSchema } from './common';

export const basicHealthSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  uptime: z.number(),
  environment: z.string(),
  version: z.string(),
});

export const detailedHealthSchema = basicHealthSchema.extend({
  dependencies: z.object({
    supabase: z.string(),
    openai: z.string(),
    verifier: z.string(),
    stripe: z.string(),
  }),
});

export const readinessSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
});

export const healthUnhealthySchema = healthServiceErrorSchema;
