import { z } from "zod";

export const ForecastScenarioRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  scenario_type: z.string(),
  preset_key: z.string().nullable(),
  updated_at: z.string().nullable().optional(),
});

export const ForecastScenarioListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    scenarios: z.array(ForecastScenarioRowSchema),
  }),
});

/** Detail payload is nested; validate envelope + scenario row only. */
export const ForecastScenarioDetailResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    scenario: ForecastScenarioRowSchema,
    disclaimer: z.string(),
    catalogue_monthly_fixed_core_pence_used: z.number(),
    forecast: z.record(z.unknown()),
    roi_payback: z.record(z.unknown()),
  }),
});
