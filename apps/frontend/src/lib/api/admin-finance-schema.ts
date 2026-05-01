import { z } from "zod";

import { InvoiceRowSchema } from "@/lib/api/admin-invoices-schema";
import { PaymentRowSchema } from "@/lib/api/admin-payments-schema";

export const FinanceKpisSchema = z.object({
  unpaid_invoice_count: z.number(),
  overdue_invoice_count: z.number(),
  draft_invoice_count: z.number(),
  void_invoice_count_period: z.number(),
  outstanding_pence: z.number(),
  formatted_outstanding: z.string(),
  paid_in_period_pence: z.number(),
  formatted_paid_in_period: z.string(),
  payment_count_in_period: z.number(),
  subscription_tagged_payments_in_period_pence: z.number(),
  formatted_subscription_tagged_payments_in_period: z.string(),
});

export const FinanceRenewalSchema = z.object({
  company_id: z.string(),
  company_name: z.string().nullable().optional(),
  plan_name: z.string().nullable().optional(),
  renews_on: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
});

const MoneyMetricUnavailableSchema = z.object({
  value_pence: z.number().nullable(),
  formatted_gbp: z.string().nullable(),
  computable: z.boolean(),
  reason: z.string(),
});

export const RecurringRevenueBlockSchema = z.object({
  has_subscription_rows: z.boolean(),
  placeholder_message: z.string(),
  reporting_surface_ready: z.boolean(),
  mrr: MoneyMetricUnavailableSchema,
  arr: MoneyMetricUnavailableSchema,
  subscription_counts: z.object({
    active: z.number(),
    cancelled_snapshot: z.number(),
    new_in_period: z.number(),
    cancelled_in_period: z.number(),
  }),
  revenue_invoiced_period_pence: z.object({
    subscription_tagged: z.number(),
    one_off: z.number(),
    total: z.number(),
    formatted_subscription_tagged: z.string(),
    formatted_one_off: z.string(),
    recurring_share_of_invoiced: z.number().nullable(),
  }),
  revenue_payments_period_pence: z.object({
    subscription_tagged: z.number(),
    one_off: z.number(),
    total: z.number(),
    formatted_subscription_tagged: z.string(),
    formatted_one_off: z.string(),
  }),
  split: z.object({
    invoiced_recurring_pence: z.number(),
    invoiced_one_off_pence: z.number(),
    payments_recurring_pence: z.number(),
    payments_one_off_pence: z.number(),
  }),
  overdue_subscription_invoices_count: z.number(),
  upcoming_renewals: z.array(FinanceRenewalSchema),
  top_subscription_customers: z.array(
    z.object({
      company_id: z.string(),
      company_name: z.string().nullable().optional(),
      subscription_invoiced_pence: z.number(),
      formatted: z.string(),
    }),
  ),
  definitions: z.record(z.string()),
  meta: z
    .object({
      timezone: z.string().optional(),
      period_end_date_for_overdue: z.string().optional(),
    })
    .passthrough(),
});

export const FinanceCompanyOutstandingSchema = z.object({
  company_id: z.string(),
  company_name: z.string().nullable().optional(),
  outstanding_pence: z.number(),
  formatted_outstanding: z.string(),
});

export const FinanceDashboardDataSchema = z.object({
  period: z.object({
    date_from: z.string(),
    date_to: z.string(),
    timezone: z.string(),
  }),
  filters_applied: z.object({
    company_id: z.string().nullable().optional(),
    invoice_status: z.string().nullable().optional(),
  }),
  kpis: FinanceKpisSchema,
  kpis_note: z.string().optional(),
  subscription: z.object({
    upcoming_renewals: z.array(FinanceRenewalSchema),
    has_subscription_rows: z.boolean().optional(),
  }),
  recurring_revenue: RecurringRevenueBlockSchema,
  integrations: z
    .object({
      xero: z.object({ configured: z.boolean(), issues: z.array(z.unknown()), message: z.string().optional() }).passthrough(),
      stripe: z.object({ issues: z.array(z.unknown()), message: z.string().optional() }).passthrough(),
    })
    .passthrough(),
  overdue_invoices: z.array(InvoiceRowSchema.passthrough()),
  draft_invoices: z.array(InvoiceRowSchema.passthrough()),
  recent_payments: z.array(PaymentRowSchema.passthrough()),
  top_outstanding_companies: z.array(FinanceCompanyOutstandingSchema),
});

export const FinanceDashboardResponseSchema = z.object({
  success: z.literal(true),
  data: FinanceDashboardDataSchema,
});
