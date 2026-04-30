import { z } from "zod";

const FiltersSchema = z.object({
  city: z.string().nullable(),
  date_from: z.string(),
  date_to: z.string(),
});

/** Envelope `{ success: true; data?: T }` from Laravel */
export function analyticsEnvelope<M extends z.ZodTypeAny>(inner: M) {
  return z.object({
    success: z.literal(true),
    meta: z.unknown(),
    data: inner,
  });
}

export const AnalyticsOverviewResponseSchema = analyticsEnvelope(
  z.object({
    kpis: z.object({
      revenue_this_month_pence: z.number(),
      revenue_this_week_pence: z.number(),
      knives_sharpened_this_week: z.number(),
      average_price_per_knife_pence: z.number(),
      active_customers: z.number(),
      outstanding_invoice_count: z.number(),
      outstanding_invoice_amount_pence: z.number(),
      overdue_amount_pence: z.number(),
      new_bookings_this_week: z.number(),
    }),
    distinct_cities: z.array(z.string()),
    filters: FiltersSchema,
    basis: z.record(z.string(), z.string()).optional(),
  }),
);

export const AnalyticsSalesResponseSchema = analyticsEnvelope(
  z.object({
    revenue_daily: z.array(z.object({ date: z.string(), revenue_pence: z.number() })),
    revenue_by_city: z.array(z.object({ city: z.string(), revenue_pence: z.number() })),
    top_customers_by_spend: z.array(
      z.object({
        company_id: z.string(),
        company_name: z.string(),
        city: z.string().nullable(),
        revenue_pence: z.number(),
      }),
    ),
    paid_vs_open_invoices: z.object({
      paid_full: z.object({
        invoice_count: z.number(),
        billed_amount_pence: z.number(),
      }),
      open_residual: z.object({
        invoice_count: z.number(),
        balance_pence: z.number(),
      }),
    }),
    filters: FiltersSchema,
  }),
);

export const AnalyticsRoutesResponseSchema = analyticsEnvelope(
  z.object({
    route_value_by_city: z.array(z.object({ city: z.string(), revenue_pence: z.number() })),
    filters: FiltersSchema,
    basis: z.record(z.string(), z.string()).optional(),
  }),
);

export const AnalyticsOperationsResponseSchema = analyticsEnvelope(
  z.object({
    knives_sharpened_by_week: z.array(z.object({ week: z.string(), knife_count: z.number() })),
    bookings_by_status: z.array(z.object({ status: z.string(), count: z.number() })),
    filters: FiltersSchema,
  }),
);
