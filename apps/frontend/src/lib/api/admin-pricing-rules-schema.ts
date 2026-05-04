import { z } from "zod";

export const PricingRuleRowSchema = z.object({
  id: z.string().uuid(),
  service_area_id: z.string().uuid().nullable(),
  name: z.string(),
  service_type: z.string().nullable(),
  rule_kind: z.string(),
  priority: z.number(),
  amount_pence: z.number().nullable(),
  constraints: z.record(z.string(), z.any()).nullable(),
  active: z.boolean(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type PricingRuleRow = z.infer<typeof PricingRuleRowSchema>;

export const AdminPricingRulesIndexResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(PricingRuleRowSchema),
  }),
});

export const AdminPricingRuleMutationResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    rule: PricingRuleRowSchema,
  }),
});
