import { z } from "zod";

export const PublicSubscriptionPlanSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  billing_interval: z.string(),
  price_amount_minor: z.number().int(),
  currency: z.string(),
  included_collections: z.number().int().nullable().optional(),
  included_knife_allowance: z.number().int().nullable().optional(),
  overage_price_amount_minor: z.number().int().nullable().optional(),
});

export type PublicSubscriptionPlan = z.infer<typeof PublicSubscriptionPlanSchema>;

const BILLING_LABEL: Record<string, string> = {
  weekly: "per week",
  monthly: "per month",
  quarterly: "per quarter",
  yearly: "per year",
};

/** Human-readable cadence for programme pricing (e.g. "per month"). */
export function publicBillingCadence(interval: string): string {
  return BILLING_LABEL[interval] ?? interval;
}
