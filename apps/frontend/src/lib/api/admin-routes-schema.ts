import { z } from "zod";

export const RouteMetricsSchema = z.object({
  total_stops: z.number(),
  completed_stops: z.number(),
  estimated_knives: z.number(),
  estimated_revenue_pence: z.number(),
});

export const RouteAssignedStaffSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
  })
  .nullable();

export const RouteStopSummarySchema = z
  .object({
    id: z.string(),
    sequence: z.number(),
    route_stop_status: z.string().nullable(),
    expected_arrival_at: z.string().nullable().optional(),
    arrived_at: z.string().nullable().optional(),
    departed_at: z.string().nullable().optional(),
    actual_knife_count: z.number().nullable().optional(),
    damage_notes: z.string().nullable().optional(),
    company_name: z.string().nullable().optional(),
    booking_status: z.string().nullable().optional(),
    service_type: z.string().nullable().optional(),
    estimated_knife_count: z.number().nullable().optional(),
    address_line: z.string().nullable().optional(),
  })
  .passthrough();

export const RouteProgressSchema = z.object({
  completed: z.number(),
  total: z.number(),
});

export const RouteDetailDataSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    route_status: z.string().nullable().optional(),
    scheduled_date: z.string().nullable().optional(),
    coverage_city: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    meta: z.unknown().optional(),
    assigned_staff: RouteAssignedStaffSchema.optional(),
    stops: z.array(RouteStopSummarySchema),
    progress: RouteProgressSchema,
  })
  .passthrough();

export const TodayResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    date: z.string(),
    primary_route: RouteDetailDataSchema.nullable(),
    routes: z.array(
      z
        .object({
          id: z.string(),
          name: z.string(),
          route_status: z.string().nullable().optional(),
          scheduled_date: z.string().nullable().optional(),
          coverage_city: z.string().nullable().optional(),
          driver_name: z.string().nullable().optional(),
          stops_count: z.number().optional(),
          completed_stops: z.number().optional(),
        })
        .passthrough(),
    ),
    metrics: RouteMetricsSchema,
  }),
});

export const RouteDetailResponseSchema = z.object({
  success: z.literal(true),
  data: RouteDetailDataSchema,
});

export const RouteRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  route_status: z.string().nullable().optional(),
  scheduled_date: z.string().nullable().optional(),
  coverage_city: z.string().nullable().optional(),
  driver_name: z.string().nullable().optional(),
});

export const RoutesListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(RouteRowSchema),
  }),
  meta: z
    .object({
      pagination: z
        .object({
          page: z.number(),
          per_page: z.number(),
          total: z.number().optional(),
          total_pages: z.number().optional(),
          has_more_pages: z.boolean().optional(),
        })
        .optional(),
    })
    .passthrough()
    .optional(),
});

export const StopDetailDataSchema = z
  .object({
    id: z.string(),
    sequence: z.number(),
    route_stop_status: z.string().nullable(),
    expected_arrival_at: z.string().nullable().optional(),
    arrived_at: z.string().nullable().optional(),
    departed_at: z.string().nullable().optional(),
    actual_knife_count: z.number().nullable().optional(),
    damage_notes: z.string().nullable().optional(),
    route_id: z.string(),
    route: z
      .object({
        name: z.string().optional(),
        notes: z.string().nullable().optional(),
        driver: z
          .object({
            id: z.string().nullable().optional(),
            name: z.string().nullable().optional(),
          })
          .optional(),
      })
      .nullable()
      .optional(),
    booking: z
      .object({
        id: z.string(),
        status: z.string().nullable().optional(),
        requested_date: z.string().nullable().optional(),
        time_window_start: z.string().nullable().optional(),
        time_window_end: z.string().nullable().optional(),
        service_type: z.string().nullable().optional(),
        estimated_knife_count: z.number().nullable().optional(),
        actual_knife_count: z.number().nullable().optional(),
        customer_notes: z.string().nullable().optional(),
        internal_notes: z.string().nullable().optional(),
        payment_status_hint: z.string().optional(),
      })
      .nullable()
      .optional(),
    company: z
      .object({
        id: z.string(),
        name: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
        billing_email: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    location: z
      .object({
        label: z.string().nullable().optional(),
        line_one: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
        postcode: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    contact: z
      .object({
        first_name: z.string().nullable().optional(),
        last_name: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
  })
  .passthrough();

export const StopDetailResponseSchema = z.object({
  success: z.literal(true),
  data: StopDetailDataSchema,
});
