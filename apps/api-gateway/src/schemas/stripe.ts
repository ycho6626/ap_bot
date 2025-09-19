import { z } from 'zod';
import { apiErrorSchema } from './common';

export const stripeWebhookHeadersSchema = z.object({
  'stripe-signature': z.string(),
});

export const stripeWebhookSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});

export const stripeWebhookErrorSchema = apiErrorSchema;

export const stripeWebhookHealthSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  provider: z.string(),
});

export const stripeWebhookConfigSchema = z.object({
  provider: z.string(),
  supportedEvents: z.array(z.string()),
  signatureVerification: z.boolean(),
  idempotency: z.boolean(),
});
