import { z } from "zod";

export const AdminSubscriptionDashboardResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    kpis: z.object({
      active_subscriptions: z.number(),
      past_due_subscriptions: z.number(),
      operational_subscriptions: z.number(),
    }),
    items: z.array(
      z.object({
        subscription_id: z.string(),
        company_id: z.string(),
        company_name: z.string().nullable().optional(),
        plan_name: z.string(),
        status: z.string(),
        status_label: z.string(),
        starts_at: z.string().nullable().optional(),
        renews_at: z.string().nullable().optional(),
        price_amount_minor_snapshot: z.number(),
        formatted_price_snapshot_gbp: z.string().nullable().optional(),
        crm_path_hint: z.string(),
      }),
    ),
  }),
});
