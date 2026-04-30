import { z } from "zod";

const MetaSchema = z
  .object({
    pagination: z
      .object({
        page: z.number(),
        per_page: z.number(),
        total: z.number().optional(),
        total_pages: z.number().optional(),
        has_more_pages: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const DashboardResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    dashboard: z.object({
      company: z.object({
        id: z.string(),
        name: z.string(),
        city: z.string().nullable().optional(),
      }),
      kpis: z.object({
        outstanding_balance_pence: z.number(),
        monthly_spend_pence: z.number(),
        total_knives_sharpened: z.number(),
      }),
      next_booking: z
        .object({
          id: z.string(),
          status: z.string().nullable().optional(),
          scheduled_date: z.string().nullable().optional(),
          time_window_start: z.string().nullable().optional(),
          time_window_end: z.string().nullable().optional(),
          service_type: z.string().nullable().optional(),
          location_label: z.string().nullable().optional(),
          venue_city: z.string().nullable().optional(),
          route_name: z.string().nullable().optional(),
        })
        .nullable(),
      last_order: z
        .object({
          id: z.string(),
          status: z.string().nullable(),
          total_pence: z.number(),
          currency: z.string().nullable(),
          scheduled_date: z.string().nullable().optional(),
          updated_at: z.string().nullable(),
        })
        .nullable(),
    }),
    basis: z.record(z.string(), z.string()).optional(),
  }),
  meta: MetaSchema.optional(),
});

export const BookingRowSchema = z
  .object({
    id: z.string(),
    status: z.string().nullable(),
    requested_date: z.string().nullable().optional(),
    time_window_start: z.string().nullable().optional(),
    time_window_end: z.string().nullable().optional(),
    service_type: z.string().nullable().optional(),
  })
  .passthrough();

export const PaginatedBookingsResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ items: z.array(BookingRowSchema) }),
  meta: MetaSchema.optional(),
});

export const BookingDetailEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.record(z.string(), z.unknown()),
});

export const OrderRowTenantSchema = z
  .object({
    id: z.string(),
    status: z.string().nullable().optional(),
    total_pence: z.number().nullable().optional(),
    currency: z.string().nullable().optional(),
    knife_count: z.number().nullable().optional(),
    scheduled_date: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
  })
  .passthrough();

export const PaginatedTenantOrdersSchema = z.object({
  success: z.literal(true),
  data: z.object({ items: z.array(OrderRowTenantSchema) }),
  meta: MetaSchema.optional(),
});

export const KnifeRowTenantSchema = z
  .object({
    id: z.string(),
    tag_id: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
  })
  .passthrough();

export const PaginatedTenantKnivesSchema = z.object({
  success: z.literal(true),
  data: z.object({ items: z.array(KnifeRowTenantSchema) }),
  meta: MetaSchema.optional(),
});

export const InvoiceRowTenantSchema = z
  .object({
    id: z.string(),
    invoice_number: z.string().nullable().optional(),
    total: z.number().nullable().optional(),
    status: z.string().nullable().optional(),
    issue_date: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
  })
  .passthrough();

export const PaginatedTenantInvoicesSchema = z.object({
  success: z.literal(true),
  data: z.object({ items: z.array(InvoiceRowTenantSchema) }),
  meta: MetaSchema.optional(),
});

export const LocationsResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        line_one: z.string().nullable(),
        line_two: z.string().nullable().optional(),
        city: z.string().nullable(),
        postcode: z.string().nullable().optional(),
        country: z.string().nullable().optional(),
      }),
    ),
  }),
});

export const SettingsResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    user: z.object({
      id: z.string(),
      name: z.string().nullable(),
      email: z.string().nullable(),
    }),
    company: z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string().nullable(),
      city: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      billing_email: z.string().nullable().optional(),
      company_status: z.string().nullable().optional(),
    }),
  }),
});
