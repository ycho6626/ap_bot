import { z } from 'zod';

export const authProfileResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.string(),
  examVariant: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
