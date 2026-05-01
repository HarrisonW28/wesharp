import { z } from "zod";

export const SalesReportKpisSchema = z.object({
  total_revenue_pence: z.number(),
  paid_revenue_pence: z.number(),
  unpaid_revenue_pence: z.number(),
  average_invoice_value_pence: z.number(),
  invoices_sent_count: z.number(),
  payments_received_count: z.number(),
  outstanding_balance_pence: z.number(),
});

const TableBlockSchema = z.object({
  columns: z.array(z.object({ key: z.string(), label: z.string() })),
  rows: z.array(z.record(z.unknown())),
  meta: z.record(z.unknown()).optional(),
});

export const SalesReportPayloadSchema = z.object({
  report: z.literal("sales"),
  filters: z.record(z.unknown()),
  kpis: SalesReportKpisSchema,
  series: z.object({
    revenue_by_day: z.array(
      z.object({
        date: z.string(),
        revenue_pence: z.number(),
      }),
    ),
    paid_vs_unpaid: z.object({
      collected_on_period_invoices_pence: z.number(),
      unpaid_residual_on_period_invoices_pence: z.number(),
    }),
    invoice_status_breakdown: z.array(
      z.object({
        status: z.string(),
        count: z.number(),
        total_pence: z.number(),
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
  recent_invoices: TableBlockSchema,
  recent_payments: TableBlockSchema,
});

export const SalesReportResponseSchema = z.object({
  success: z.literal(true),
  data: SalesReportPayloadSchema,
  meta: z.record(z.unknown()).optional(),
});

export type SalesReportPayload = z.infer<typeof SalesReportPayloadSchema>;
