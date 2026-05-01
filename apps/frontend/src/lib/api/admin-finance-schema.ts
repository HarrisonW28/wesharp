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
