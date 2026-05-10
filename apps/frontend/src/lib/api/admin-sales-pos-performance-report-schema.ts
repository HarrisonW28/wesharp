import { z } from "zod";

/** Wraps `/api/admin/reports/sales-performance` JSON (Sprint 24.5). */
export const SalesPosPerformanceReportResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    definitions: z.record(z.string()),
    filters_applied: z.object({
      date_from: z.string(),
      date_to: z.string(),
      sales_user_id: z.string().nullable(),
      viewer_scope: z.string(),
    }),
    kpis: z.record(z.unknown()),
    checkout: z.record(z.unknown()),
    pos_payments: z.record(z.unknown()),
    discounts: z.record(z.unknown()),
    quotes_and_estimates: z.record(z.unknown()),
    allocated_costs: z.record(z.unknown()),
    customer_acquisition: z.record(z.unknown()),
    sales_follow_ups: z.record(z.unknown()),
    sales_user_performance: z.array(z.record(z.unknown())),
    sales_user_performance_scope_note: z.string().nullable(),
    disclaimer: z.string(),
  }),
});
