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

/** Present only when the backend has a real subscription / programme record (never fabricated). */
export const TenantSubscriptionSummarySchema = z.object({
  plan_name: z.string(),
  status: z.string().nullable().optional(),
  current_period_end: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
});

export const TenantSubscriptionInvoiceRowSchema = z.object({
  id: z.string(),
  invoice_number: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  issue_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  total_pence: z.number(),
  formatted_total: z.string(),
});

/** Full portal subscription payload (dashboard, settings, subscription page). */
export const TenantSubscriptionDetailSchema = TenantSubscriptionSummarySchema.extend({
  included_services: z.string().nullable().optional(),
  allowance_summary: z.string().nullable().optional(),
  recent_invoices: z.array(TenantSubscriptionInvoiceRowSchema).optional(),
}).passthrough();

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
      subscription: TenantSubscriptionDetailSchema.nullable().optional(),
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

export const AccountFulfilmentTimelineStepSchema = z.object({
  step_key: z.string(),
  label: z.string(),
  description: z.string().optional(),
  at: z.string().optional(),
  state: z.string(),
});

export const AccountFulfilmentRouteSchema = z
  .object({
    collection_date: z.string().nullable().optional(),
    collection_window_start: z.string().nullable().optional(),
    collection_window_end: z.string().nullable().optional(),
    collected_at: z.string().nullable().optional(),
    returned_at: z.string().nullable().optional(),
  })
  .passthrough();

export const AccountFulfilmentSchema = z.object({
  timeline: z.array(AccountFulfilmentTimelineStepSchema),
  route: AccountFulfilmentRouteSchema.nullable().optional(),
});

export const AccountCustomerMessageSchema = z.object({
  body: z.string(),
  posted_at: z.string().nullable().optional(),
  posted_at_label: z.string().nullable().optional(),
});

export const BookingDetailEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.record(z.string(), z.unknown()),
});

/** Tenant booking detail (`GET /api/account/bookings/{id}`) — customer-safe fields only from the API. */
export const AccountBookingDetailDataSchema = BookingRowSchema.extend({
  customer_cancellable: z.boolean().optional(),
  customer_notes: z.string().nullable().optional(),
  requested_collection_date: z.string().nullable().optional(),
  requested_time_window_start: z.string().nullable().optional(),
  requested_time_window_end: z.string().nullable().optional(),
  confirmed_collection_date: z.string().nullable().optional(),
  confirmed_time_window_start: z.string().nullable().optional(),
  confirmed_time_window_end: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  company: z
    .object({
      id: z.string(),
      name: z.string(),
      city: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      billing_email: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  location: z
    .object({
      id: z.string(),
      label: z.string().nullable().optional(),
      line_one: z.string().nullable().optional(),
      line_two: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      postcode: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  contact: z
    .object({
      id: z.string(),
      first_name: z.string().nullable().optional(),
      last_name: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  orders: z
    .array(
      z.object({
        id: z.string(),
        status: z.string().nullable().optional(),
        knife_count: z.number().nullable().optional(),
        total_pence: z.number().optional(),
        currency: z.string().nullable().optional(),
      }),
    )
    .optional(),
  fulfilment: AccountFulfilmentSchema.optional(),
  customer_messages: z.array(AccountCustomerMessageSchema).optional(),
}).passthrough();

export const AccountBookingDetailResponseSchema = z.object({
  success: z.literal(true),
  data: AccountBookingDetailDataSchema,
});

export const AccountPortalBookingSummarySchema = z.object({
  id: z.string(),
  scheduled_date: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
});

export const OrderRowTenantSchema = z
  .object({
    id: z.string(),
    display_reference: z.string().optional(),
    status: z.string().nullable().optional(),
    payment_status: z.string().nullable().optional(),
    total_pence: z.number().nullable().optional(),
    subtotal_pence: z.number().nullable().optional(),
    tax_pence: z.number().nullable().optional(),
    formatted_amount: z.string().nullable().optional(),
    formatted_total: z.string().nullable().optional(),
    formatted_subtotal: z.string().nullable().optional(),
    formatted_tax: z.string().nullable().optional(),
    currency: z.string().nullable().optional(),
    knife_count: z.number().nullable().optional(),
    scheduled_date: z.string().nullable().optional(),
    booking: AccountPortalBookingSummarySchema.nullable().optional(),
    company: z
      .object({
        name: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
  })
  .passthrough();

export const PaginatedTenantOrdersSchema = z.object({
  success: z.literal(true),
  data: z.object({ items: z.array(OrderRowTenantSchema) }),
  meta: MetaSchema.optional(),
});

export const AccountPortalOrderKnifeSchema = z.object({
  tag_id: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
  knife_type: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
});

export const AccountPortalOrderItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unit_amount_pence: z.number(),
  line_total_pence: z.number(),
  formatted_unit_amount: z.string(),
  formatted_line_total: z.string(),
});

export const AccountPortalOrderInvoiceSchema = z.object({
  id: z.string(),
  invoice_number: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  subtotal_pence: z.number(),
  tax_pence: z.number(),
  total_pence: z.number(),
  formatted_subtotal: z.string(),
  formatted_tax: z.string(),
  formatted_total: z.string(),
});

export const AccountPortalOrderPhotoSchema = z
  .object({
    id: z.string(),
    captured_at: z.string().nullable().optional(),
    captured_at_label: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    category_label: z.string().nullable().optional(),
    caption: z.string().nullable().optional(),
    status_line: z.string().nullable().optional(),
    file_fetch_path: z.string().nullable().optional(),
  })
  .passthrough();

/** Tenant order detail (`GET /api/account/orders/{id}`) — customer-safe payload. */
export const AccountOrderDetailDataSchema = OrderRowTenantSchema.extend({
  completed_at: z.string().nullable().optional(),
  knives: z.array(AccountPortalOrderKnifeSchema).optional(),
  items: z.array(AccountPortalOrderItemSchema).optional(),
  invoice: AccountPortalOrderInvoiceSchema.nullable().optional(),
  photos: z.array(AccountPortalOrderPhotoSchema).optional(),
  fulfilment: AccountFulfilmentSchema.optional(),
  customer_messages: z.array(AccountCustomerMessageSchema).optional(),
}).passthrough();

export const AccountOrderDetailResponseSchema = z.object({
  success: z.literal(true),
  data: AccountOrderDetailDataSchema,
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

export const AccountPortalInvoiceOrderSummarySchema = z.object({
  id: z.string(),
  display_reference: z.string().optional(),
  status: z.string().nullable().optional(),
});

export const InvoiceRowTenantSchema = z
  .object({
    id: z.string(),
    display_reference: z.string().optional(),
    invoice_number: z.string().nullable().optional(),
    total: z.number().nullable().optional(),
    subtotal_pence: z.number().nullable().optional(),
    tax_pence: z.number().nullable().optional(),
    total_pence: z.number().nullable().optional(),
    formatted_subtotal: z.string().nullable().optional(),
    formatted_tax: z.string().nullable().optional(),
    formatted_total: z.string().nullable().optional(),
    formatted_amount: z.string().nullable().optional(),
    formatted_amount_due: z.string().nullable().optional(),
    amount_due_pence: z.number().nullable().optional(),
    status: z.string().nullable().optional(),
    payment_status: z.string().nullable().optional(),
    overdue: z.boolean().optional(),
    issue_date: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    company_name: z.string().nullable().optional(),
    order: AccountPortalInvoiceOrderSummarySchema.nullable().optional(),
    updated_at: z.string().nullable().optional(),
  })
  .passthrough();

export const PaginatedTenantInvoicesSchema = z.object({
  success: z.literal(true),
  data: z.object({ items: z.array(InvoiceRowTenantSchema) }),
  meta: MetaSchema.optional(),
});

export const AccountPortalInvoiceLineSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unit_amount_pence: z.number(),
  line_total_pence: z.number(),
  formatted_unit_amount: z.string(),
  formatted_line_total: z.string(),
});

export const AccountPortalInvoicePaymentSchema = z.object({
  formatted_amount: z.string(),
  amount_pence: z.number(),
  status: z.string().nullable().optional(),
  method: z.string().nullable().optional(),
  paid_at: z.string().nullable().optional(),
});

export const AccountInvoiceDetailDataSchema = InvoiceRowTenantSchema.extend({
  items: z.array(AccountPortalInvoiceLineSchema).optional(),
  payments: z.array(AccountPortalInvoicePaymentSchema).optional(),
  payment: z
    .object({
      online_checkout_available: z.boolean().optional(),
      cta_label: z.string().optional(),
      cta_hint: z.string().optional(),
    })
    .optional(),
  documents: z
    .object({
      pdf_download_available: z.boolean().optional(),
      print_available: z.boolean().optional(),
    })
    .optional(),
}).passthrough();

export const AccountInvoiceDetailResponseSchema = z.object({
  success: z.literal(true),
  data: AccountInvoiceDetailDataSchema,
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
    primary_contact: z
      .object({
        first_name: z.string().nullable().optional(),
        last_name: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        billing_contact: z.boolean().optional(),
      })
      .nullable()
      .optional(),
    subscription: TenantSubscriptionDetailSchema.nullable().optional(),
  }),
});

export const AccountSubscriptionResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    subscription: TenantSubscriptionDetailSchema.nullable(),
  }),
});
