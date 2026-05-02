import { z } from "zod";

import { PublicSubscriptionPlanSchema } from "@/lib/site-content/public-subscription-plans";

export const PublicPricingEstimateResponseSchema = z.object({
  programme_mode: z.enum(["pay_as_you_go", "subscription"]),
  estimate_title: z.string(),
  amount_pence: z.number().int().nullable(),
  currency: z.string(),
  suggested_package_label: z.string().nullable(),
  pricing_rule_name: z.string().nullable(),
  rule_kind: z.string().nullable(),
  subscription_plan: PublicSubscriptionPlanSchema.nullable(),
  overage_note: z.string().nullable(),
  visit_note: z.string().nullable(),
  disclaimer: z.string(),
  visit_pattern: z.enum(["single", "regular"]),
  customer_kind: z.enum(["home", "business"]),
});

export type PublicPricingEstimateResponse = z.infer<typeof PublicPricingEstimateResponseSchema>;
