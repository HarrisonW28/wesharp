import { z } from "zod";

/** Wraps `/api/admin/reports/cash-position` JSON (Sprint 24.1). */
export const CashPositionReportResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    definitions: z.record(z.string()),
    filters_applied: z.object({
      date_from: z.string(),
      date_to: z.string(),
      company_id: z.string().nullable(),
    }),
    assumptions: z.record(z.unknown()),
    cash_position: z.record(z.unknown()),
    warnings: z.array(z.object({ code: z.string(), message: z.string() })),
    profitability_context: z.record(z.unknown()),
  }),
});
