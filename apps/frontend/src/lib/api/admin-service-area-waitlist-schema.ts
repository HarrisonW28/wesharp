import { z } from "zod";

export const ServiceAreaWaitlistRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string(),
  postcode: z.string(),
  customer_type: z.string(),
  estimated_knife_count: z.number().nullable(),
  notes: z.string().nullable(),
  source: z.string().nullable(),
  contact_consent: z.boolean().nullable(),
  created_at: z.string(),
});

export const ServiceAreaWaitlistApiResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(ServiceAreaWaitlistRowSchema),
  }),
  meta: z.unknown().optional(),
});
