import { z } from "zod";

/** `/api/admin/reports/executive-dashboard` (Sprint 24.6). */
export const ExecutiveFinanceDashboardResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    definitions: z.record(z.string()),
    filters_applied: z.record(z.unknown()),
    periods: z.record(z.record(z.string())),
    sections: z.record(
      z.object({
        bookings_created: z.number(),
        orders_created: z.number(),
        invoices_issued: z.number(),
      }),
    ),
    kpis: z.record(z.unknown()),
    forecast_links: z.array(z.record(z.unknown())),
    alerts: z.array(
      z.object({
        severity: z.string(),
        code: z.string(),
        message: z.string(),
        href: z.string().nullable(),
        cta: z.string().nullable(),
      }),
    ),
    disclaimer: z.string(),
  }),
});
