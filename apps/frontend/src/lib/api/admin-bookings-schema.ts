import { z } from "zod";

/** Mirrors `App\Enums\BookingStatus` — keep aligned with backend. */
export const BOOKING_STATUS_VALUES = [
  "requested",
  "confirmed",
  "assigned_to_route",
  "collected",
  "in_sharpening",
  "quality_checked",
  "returned",
  "completed",
  "converted_to_order",
  "cancelled",
  "no_show",
] as const;

export type BookingStatus = (typeof BOOKING_STATUS_VALUES)[number];

export const BookingRowSchema = z.object({
  id: z.string(),
  reference: z.string().optional(),
  company_id: z.string(),
  location_id: z.string(),
  contact_id: z.string().nullable(),
  assigned_route_id: z.string().nullable().optional(),
  status: z.string(),
  requested_date: z.string().nullable(),
  /** Resolved collection date for ops (requested vs scheduled legacy). */
  requested_collection_date: z.string().nullable().optional(),
  requested_time_window_start: z.string().nullable().optional(),
  requested_time_window_end: z.string().nullable().optional(),
  confirmed_collection_date: z.string().nullable().optional(),
  confirmed_time_window_start: z.string().nullable().optional(),
  confirmed_time_window_end: z.string().nullable().optional(),
  time_window_start: z.string().nullable(),
  time_window_end: z.string().nullable(),
  service_type: z.string(),
  estimated_knife_count: z.number().nullable().optional(),
  actual_knife_count: z.number().nullable().optional(),
  customer_notes: z.string().nullable().optional(),
  internal_notes: z.string().nullable().optional(),
  price_estimate: z.number().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  company: z
    .object({
      id: z.string().nullable(),
      name: z.string().nullable(),
      city: z.string().nullable(),
    })
    .optional(),
  venue_city: z.string().nullable().optional(),
  orders_count: z.number().nullable().optional(),
  assigned_route: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      scheduled_date: z.string().nullable().optional(),
      route_status: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export type BookingRow = z.infer<typeof BookingRowSchema>;

export const PaginatedBookingsResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      items: z.array(BookingRowSchema),
    }),
    meta: z.object({
      pagination: z.object({
        page: z.number(),
        per_page: z.number(),
        total: z.number().optional(),
        total_pages: z.number().optional(),
        has_more_pages: z.boolean().optional(),
      }),
    }),
  })
  .passthrough();

export const BookingTimelineItemSchema = z
  .object({
    id: z.string(),
    at: z.string().nullable().optional(),
    action: z.string(),
  })
  .passthrough();

export const BookingDetailSchema = z.object({
  id: z.string(),
  reference: z.string().optional(),
  company_id: z.string(),
  location_id: z.string(),
  contact_id: z.string().nullable(),
  assigned_route_id: z.string().nullable(),
  status: z.string(),
  requested_date: z.string().nullable(),
  /** Resolved collection date for ops (requested vs scheduled legacy). */
  requested_collection_date: z.string().nullable().optional(),
  requested_time_window_start: z.string().nullable().optional(),
  requested_time_window_end: z.string().nullable().optional(),
  confirmed_collection_date: z.string().nullable().optional(),
  confirmed_time_window_start: z.string().nullable().optional(),
  confirmed_time_window_end: z.string().nullable().optional(),
  time_window_start: z.string().nullable(),
  time_window_end: z.string().nullable(),
  service_type: z.string(),
  estimated_knife_count: z.number().nullable().optional(),
  actual_knife_count: z.number().nullable().optional(),
  customer_notes: z.string().nullable().optional(),
  internal_notes: z.string().nullable().optional(),
  price_estimate: z.number().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  company: z
    .object({
      id: z.string(),
      name: z.string(),
      slug: z.string().nullable().optional(),
      city: z.string().nullable(),
      phone: z.string().nullable().optional(),
      billing_email: z.string().nullable().optional(),
    })
    .nullable(),
  location: z
    .object({
      id: z.string(),
      label: z.string(),
      line_one: z.string().nullable(),
      line_two: z.string().nullable(),
      city: z.string().nullable(),
      postcode: z.string().nullable(),
      country: z.string().nullable(),
    })
    .nullable(),
  contact: z
    .object({
      id: z.string(),
      first_name: z.string(),
      last_name: z.string(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
    })
    .nullable(),
  assigned_route: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      route_status: z.string().nullable(),
      scheduled_date: z.string().nullable(),
    })
    .nullable(),
  route_stop: z
    .object({
      id: z.string(),
      sequence: z.number().nullable().optional(),
      route_stop_status: z.string().nullable().optional(),
    })
    .nullable(),
  orders: z.array(
    z.object({
      id: z.string(),
      order_status: z.string().nullable(),
      total_pence: z.number(),
      currency: z.string().nullable(),
    }),
  ),
  status_timeline: z.array(BookingTimelineItemSchema),
  audit_timeline: z.array(BookingTimelineItemSchema).optional(),
});

export const BookingDetailResponseSchema = z
  .object({
    success: z.literal(true),
    data: BookingDetailSchema,
  })
  .passthrough();
