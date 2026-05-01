import { z } from "zod";

const MetaSchema = z
  .object({
    pagination: z
      .object({
        page: z.number(),
        per_page: z.number(),
        total: z.number().optional(),
        total_pages: z.number().optional(),
        has_more_pages: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const RecurringRevenueUpcomingRenewalRowSchema = z.object({
  company_id: z.string().nullable().optional(),
  company_name: z.string().nullable().optional(),
  plan_name: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  renews_on: z.string().nullable().optional(),
});

export const RecurringRevenueActiveByPlanRowSchema = z.object({
  plan_id: z.string(),
  plan_name: z.string(),
  active_subscriptions_count: z.number(),
  mrr_pence: z.number(),
  formatted_mrr: z.string(),
});

export const RecurringRevenueCompanyRevenueRowSchema = z.object({
  company_id: z.string(),
  company_name: z.string().nullable().optional(),
  formatted: z.string(),
});

export const RecurringRevenueSubscriptionRevenueRowSchema = RecurringRevenueCompanyRevenueRowSchema.extend({
  subscription_revenue_pence: z.number(),
});

export const RecurringRevenueOverageRevenueRowSchema = RecurringRevenueCompanyRevenueRowSchema.extend({
  overage_revenue_pence: z.number(),
});

export const RecurringRevenueTrendRowSchema = z.object({
  month: z.string(), // YYYY-MM
  mrr_pence: z.number().optional(),
  arr_pence: z.number().optional(),
});

export const RecurringRevenueReportResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    report: z.string().optional(),
    filters: z.record(z.string(), z.unknown()).optional(),
    kpis: z
      .object({
        active_subscriptions_count: z.number(),
        cancelled_subscriptions_snapshot_count: z.number(),
        new_subscriptions_in_period_count: z.number(),
        cancelled_subscriptions_in_period_count: z.number(),
        subscription_invoiced_period_pence: z.number(),
        one_off_invoiced_period_pence: z.number(),
        subscription_payments_period_pence: z.number(),
        one_off_payments_period_pence: z.number(),
        overdue_subscription_invoices_count: z.number(),
        mrr_computable: z.boolean().optional(),
        arr_computable: z.boolean().optional(),
      })
      .passthrough(),
    series: z
      .object({
        invoiced_split: z.array(z.object({ bucket: z.string(), amount_pence: z.number() })).optional(),
        payments_split: z.array(z.object({ bucket: z.string(), amount_pence: z.number() })).optional(),
      })
      .passthrough()
      .optional(),
    table: z
      .object({
        columns: z.array(z.object({ key: z.string(), label: z.string() })).optional(),
        rows: z.array(RecurringRevenueUpcomingRenewalRowSchema).optional(),
        meta: z.record(z.string(), z.unknown()).optional(),
      })
      .passthrough()
      .optional(),
    definitions: z.record(z.string(), z.string()).optional(),

    recurring_revenue_detail: z
      .object({
        reporting_surface_ready: z.boolean().optional(),
        placeholder_message: z.string().optional(),
        mrr: z
          .object({
            value_pence: z.number().nullable().optional(),
            formatted_gbp: z.string().nullable().optional(),
            computable: z.boolean().optional(),
            reason: z.string().nullable().optional(),
          })
          .passthrough()
          .optional(),
        arr: z
          .object({
            value_pence: z.number().nullable().optional(),
            formatted_gbp: z.string().nullable().optional(),
            computable: z.boolean().optional(),
            reason: z.string().nullable().optional(),
          })
          .passthrough()
          .optional(),
        upcoming_renewals: z.array(RecurringRevenueUpcomingRenewalRowSchema).optional(),
        top_subscription_customers: z
          .array(
            z.object({
              company_id: z.string(),
              company_name: z.string().nullable().optional(),
              subscription_invoiced_pence: z.number(),
              formatted: z.string(),
            }),
          )
          .optional(),
        active_subscriptions_by_plan: z.array(RecurringRevenueActiveByPlanRowSchema).optional(),
        revenue_subscription_lines_by_company: z.array(RecurringRevenueSubscriptionRevenueRowSchema).optional(),
        revenue_overage_lines_by_company: z.array(RecurringRevenueOverageRevenueRowSchema).optional(),
        mrr_trend: z.array(z.object({ month: z.string(), mrr_pence: z.number() })).optional(),
        arr_trend: z.array(z.object({ month: z.string(), arr_pence: z.number() })).optional(),
      })
      .passthrough()
      .optional(),
    top_subscription_customers: z
      .object({
        columns: z.array(z.object({ key: z.string(), label: z.string() })).optional(),
        rows: z
          .array(
            z.object({
              company_id: z.string(),
              company_name: z.string().nullable().optional(),
              subscription_invoiced_pence: z.number(),
              formatted: z.string(),
            }),
          )
          .optional(),
      })
      .passthrough()
      .optional(),
  }),
  meta: MetaSchema.optional(),
});

