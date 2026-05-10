import { z } from "zod";

/** Wraps `/api/admin/reports/subscription-profitability` JSON (Sprint 24.3). */
export const SubscriptionProfitabilityReportResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    definitions: z.record(z.string()),
    filters_applied: z.object({
      date_from: z.string(),
      date_to: z.string(),
      company_id: z.string().nullable(),
      subscription_plan_id: z.string().nullable(),
    }),
    kpis: z.record(z.unknown()),
    recurring_revenue_context: z.record(z.unknown()),
    split_for_rules: z.record(z.unknown()),
    companies: z.array(z.record(z.unknown())),
    flags: z.object({
      high_usage_customers: z.array(z.record(z.unknown())),
      low_margin_subscription_customers: z.array(z.record(z.unknown())),
    }),
    disclaimer: z.string(),
  }),
});
