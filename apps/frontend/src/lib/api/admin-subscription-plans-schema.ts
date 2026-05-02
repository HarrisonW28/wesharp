import { z } from "zod";

export const SubscriptionPlanRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  billing_interval: z.string(),
  price_amount_minor: z.number().int(),
  currency: z.string(),
  included_collections: z.number().int().nullable().optional(),
  included_knife_allowance: z.number().int().nullable().optional(),
  overage_price_amount_minor: z.number().int().nullable().optional(),
  is_active: z.boolean(),
  /** Newer API; default false for older deploys. */
  show_on_public_site: z.boolean().optional().default(false),
  sort_order: z.number().int(),
  /** Marketing card bullets and CTA — present after Sprint 14.2b migration. */
  public_highlights: z.array(z.string()).optional(),
  public_cta_label: z.string().nullable().optional(),
  recommended: z.boolean().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const AdminSubscriptionPlanIndexResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    items: z.array(SubscriptionPlanRowSchema),
  }),
});

export type SubscriptionPlanRow = z.infer<typeof SubscriptionPlanRowSchema>;

