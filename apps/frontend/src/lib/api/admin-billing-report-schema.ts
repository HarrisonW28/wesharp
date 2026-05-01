import { z } from "zod";

const TableBlockSchema = z.object({
  columns: z.array(z.object({ key: z.string(), label: z.string() })),
  rows: z.array(z.record(z.unknown())),
  meta: z.record(z.unknown()).optional(),
});

export const BillingReportKpisSchema = z.object({
  invoices_sent_count: z.number(),
  invoices_paid_count: z.number(),
  overdue_invoices_period_count: z.number(),
  unpaid_invoices_snapshot_count: z.number(),
  total_outstanding_pence: z.number(),
  total_paid_pence: z.number(),
  payments_received_count: z.number(),
  average_days_to_pay: z.number().nullable(),
});

export const BillingReportPayloadSchema = z.object({
  report: z.literal("billing"),
  filters: z.record(z.unknown()),
  kpis: BillingReportKpisSchema,
  series: z.object({
    ageing: z.array(
      z.object({
        bucket: z.string(),
        invoice_count: z.number(),
        outstanding_pence: z.number(),
      }),
    ),
    payment_method_breakdown: z.array(
      z.object({
        payment_method: z.string(),
        count: z.number(),
        amount_pence: z.number(),
      }),
    ),
    payments_by_day: z.array(
      z.object({
        date: z.string(),
        amount_pence: z.number(),
        count: z.number(),
      }),
    ),
    outstanding_by_customer: z.array(
      z.object({
        company_id: z.string(),
        company_name: z.string(),
        outstanding_pence: z.number(),
      }),
    ),
  }),
  table: TableBlockSchema.nullable(),
  definitions: z.record(z.string()),
  export: z
    .object({
      available: z.boolean().optional(),
      formats: z.array(z.string()).optional(),
      message: z.string().optional(),
    })
    .optional(),
  unpaid_invoices: TableBlockSchema,
  overdue_invoices: TableBlockSchema,
});

export const BillingReportResponseSchema = z.object({
  success: z.literal(true),
  data: BillingReportPayloadSchema,
  meta: z.record(z.unknown()).optional(),
});

export type BillingReportPayload = z.infer<typeof BillingReportPayloadSchema>;
