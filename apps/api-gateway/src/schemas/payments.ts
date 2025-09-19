import { z } from 'zod';
import { apiErrorSchema } from './common';

export const pricingPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  currency: z.string(),
  interval: z.enum(['month', 'year']),
  features: z.array(z.string()),
  role: z.string(),
});

export const pricingPlansResponseSchema = z.array(pricingPlanSchema);

export const checkoutRequestSchema = z.object({
  priceId: z.string(),
});

export const checkoutResponseSchema = z.object({
  id: z.string(),
  url: z.string(),
});

export const billingPortalResponseSchema = z.object({
  url: z.string(),
});

export const paymentsErrorResponseSchema = apiErrorSchema;
