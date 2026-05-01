import { z } from "zod";

const TableBlockSchema = z.object({
  columns: z.array(z.object({ key: z.string(), label: z.string() })),
  rows: z.array(z.record(z.unknown())),
  meta: z.record(z.unknown()).optional(),
});

export const BookingsReportPayloadSchema = z.object({
  report: z.literal("bookings"),
  filters: z.record(z.unknown()),
  kpis: z.object({
    bookings_created_count: z.number(),
    bookings_confirmed_activity_count: z.number(),
    bookings_confirmed_audit_count: z.number(),
    bookings_cancelled_count: z.number(),
    bookings_converted_to_order_count: z.number(),
    bookings_completed_count: z.number(),
    pending_bookings_pipeline_count: z.number(),
    average_hours_to_confirm: z.number().nullable(),
  }),
  series: z.object({
    bookings_by_day: z.array(
      z.object({
        date: z.string(),
        count: z.number(),
      }),
    ),
    booking_status_breakdown: z.array(
      z.object({
        status: z.string(),
        count: z.number(),
        price_estimate_pence_sum: z.number(),
      }),
    ),
  }),
  table: TableBlockSchema.nullable(),
  definitions: z.record(z.string()),
  export: z.record(z.unknown()),
  recent_activity: TableBlockSchema,
});

export const BookingsReportResponseSchema = z.object({
  success: z.literal(true),
  data: BookingsReportPayloadSchema,
  meta: z.record(z.unknown()).optional(),
});

export const OrdersReportPayloadSchema = z.object({
  report: z.literal("orders"),
  filters: z.record(z.unknown()),
  kpis: z.object({
    orders_created_count: z.number(),
    active_workshop_orders_count: z.number(),
    completed_orders_count: z.number(),
    cancelled_orders_count: z.number(),
    total_pence_created_cohort: z.number(),
    average_order_value_pence: z.number(),
    average_completion_hours: z.number().nullable(),
  }),
  series: z.object({
    orders_by_day: z.array(
      z.object({
        date: z.string(),
        count: z.number(),
      }),
    ),
    order_status_breakdown: z.array(
      z.object({
        status: z.string(),
        count: z.number(),
        total_pence: z.number(),
      }),
    ),
  }),
  table: TableBlockSchema.nullable(),
  definitions: z.record(z.string()),
  export: z.record(z.unknown()),
  recent_activity: TableBlockSchema,
});

export const OrdersReportResponseSchema = z.object({
  success: z.literal(true),
  data: OrdersReportPayloadSchema,
  meta: z.record(z.unknown()).optional(),
});

export type BookingsReportPayload = z.infer<typeof BookingsReportPayloadSchema>;
export type OrdersReportPayload = z.infer<typeof OrdersReportPayloadSchema>;
