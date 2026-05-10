import { z } from "zod";

/** Wraps `/api/admin/reports/route-profitability` JSON (Sprint 24.4). */
export const RouteProfitabilityReportResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    definitions: z.record(z.string()),
    filters_applied: z.record(z.unknown()),
    sales_route: z.record(z.unknown()),
    kpis: z.record(z.unknown()),
    drivers: z.array(z.record(z.unknown())),
    routes: z.object({
      columns: z.array(z.object({ key: z.string(), label: z.string() })),
      rows: z.array(z.record(z.unknown())),
      meta: z.record(z.unknown()).optional(),
    }),
    disclaimer: z.string(),
  }),
});
