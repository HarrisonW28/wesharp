import { z } from "zod";

export const CompanyStatusEnum = z.enum([
  "lead",
  "trial_booked",
  "trial_completed",
  "active",
  "at_risk",
  "lost",
  "do_not_contact",
]);

export type CompanyStatus = z.infer<typeof CompanyStatusEnum>;

export const CompanyRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  company_status: CompanyStatusEnum,
  phone: z.string().nullable(),
  billing_email: z.string().nullable(),
  city: z.string().nullable(),
  total_spend_pence: z.number(),
  last_booking_date: z.string().nullable(),
  contacts_count: z.number().nullable().optional(),
  locations_count: z.number().nullable().optional(),
  subscription_status: z.string().nullable().optional(),
  has_unpaid_invoices: z.boolean().optional(),
  has_active_bookings: z.boolean().optional(),
});

export const PaginatedCompaniesResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(CompanyRowSchema),
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
});

export type CompanyRow = z.infer<typeof CompanyRowSchema>;

export const ContactSchema = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  billing_contact: z.boolean(),
  notes: z.string().nullable().optional(),
  archived_at: z.string().nullable().optional(),
  is_archived: z.boolean().optional(),
  status_label: z.string().optional(),
});

export const LocationSchema = z.object({
  id: z.string(),
  label: z.string(),
  is_default: z.boolean().optional(),
  line_one: z.string().nullable(),
  line_two: z.string().nullable(),
  city: z.string().nullable(),
  postcode: z.string().nullable(),
  country: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  notes: z.string().nullable().optional(),
  archived_at: z.string().nullable().optional(),
  is_archived: z.boolean().optional(),
  status_label: z.string().optional(),
});

export const NoteSchema = z.object({
  id: z.string(),
  body: z.string(),
  created_at: z.string().nullable().optional(),
  author_name: z.string().nullable().optional(),
});

export const BookingPreviewSchema = z.object({
  id: z.string(),
  booking_status: z.string().nullable().optional(),
  booking_status_label: z.string().nullable().optional(),
  service_type: z.string().nullable().optional(),
  service_type_label: z.string().nullable().optional(),
  scheduled_date: z.string().nullable().optional(),
  internal_notes: z.string().nullable().optional(),
  company_location_id: z.string().nullable().optional(),
  site_summary: z.string().nullable().optional(),
  site_label: z.string().nullable().optional(),
  contact_id: z.string().nullable().optional(),
  contact_display: z.string().nullable().optional(),
});

export const OrderPreviewSchema = z.object({
  id: z.string(),
  order_status: z.string().nullable().optional(),
  order_status_label: z.string().nullable().optional(),
  total_pence: z.number(),
  currency: z.string().nullable().optional(),
});

export const KnifePreviewSchema = z.object({
  id: z.string(),
  tag_id: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
  knife_status: z.string().nullable().optional(),
  knife_status_label: z.string().nullable().optional(),
  position: z.union([z.string(), z.number()]).nullable().optional(),
  order_id: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const InvoicePreviewSchema = z.object({
  id: z.string(),
  invoice_number: z.string().nullable().optional(),
  invoice_status: z.string().nullable().optional(),
  invoice_status_label: z.string().nullable().optional(),
  total_pence: z.number(),
  currency: z.string().nullable().optional(),
  issued_on: z.string().nullable().optional(),
});

export const CompanyOverviewSnapshotSchema = z.object({
  default_location: z
    .object({
      id: z.string(),
      label: z.string(),
      is_default: z.boolean().optional(),
      summary: z.string().optional(),
      city: z.string().nullable().optional(),
      postcode: z.string().nullable().optional(),
    })
    .nullable(),
  primary_contact: z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      billing_contact: z.boolean().optional(),
    })
    .nullable(),
  latest_booking: z
    .object({
      id: z.string(),
      scheduled_date: z.string().nullable().optional(),
      booking_status: z.string().nullable().optional(),
      booking_status_label: z.string().nullable().optional(),
      service_type_label: z.string().nullable().optional(),
    })
    .nullable(),
  active_order: z
    .object({
      id: z.string(),
      order_status: z.string().nullable().optional(),
      order_status_label: z.string().nullable().optional(),
      total_pence: z.number(),
      currency: z.string().nullable().optional(),
    })
    .nullable(),
  unpaid_balance_pence: z.number(),
  subscription: z
    .object({
      id: z.string(),
      plan_name: z.string(),
      status: z.string(),
      status_label: z.string(),
      current_period_end: z.string().nullable().optional(),
    })
    .nullable(),
  recent_activity: z.array(
    z.object({
      type: z.enum(["audit", "note"]),
      id: z.union([z.string(), z.number()]),
      at: z.string().nullable().optional(),
      summary: z.string().optional(),
      action: z.string().optional(),
      actor_name: z.string().nullable().optional(),
      body_preview: z.string().optional(),
    }),
  ),
});

export const CompanyUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  role_label: z.string(),
  status: z.string().nullable().optional(),
  status_label: z.string().nullable().optional(),
});

const CrmSubscriptionActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  available: z.boolean(),
  hint: z.string(),
});

export const SubscriptionHistoryRowSchema = z.object({
  id: z.string(),
  plan_name: z.string(),
  status: z.string(),
  status_label: z.string(),
  starts_at: z.string().nullable().optional(),
  renews_at: z.string().nullable().optional(),
  cancelled_at: z.string().nullable().optional(),
  price_amount_minor_snapshot: z.number().optional(),
  formatted_price_snapshot_gbp: z.string().nullable().optional(),
  currency: z.string().optional(),
  billing_contact: z
    .object({
      id: z.string().optional(),
      name: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export const SubscriptionPlanRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  billing_interval: z.string().nullable().optional(),
  price_amount_minor: z.number(),
  currency: z.string(),
  is_active: z.boolean(),
  sort_order: z.number().optional(),
});

export const SubscriptionPlansListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(SubscriptionPlanRowSchema),
  }),
});

export const SubscriptionInvoiceDraftResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    invoice: z.record(z.string(), z.unknown()),
    already_existed: z.boolean(),
  }),
});

/** Admin company detail subscription panel — `state: none` until a `company_subscriptions` row exists. */
export const CompanySubscriptionCrmSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("none"),
    headline: z.string(),
    subheadline: z.string(),
    plan_management_available: z.boolean(),
    recurring_amount_pence: z.number().nullable(),
    recurring_amount_note: z.string(),
    crm_actions: z.array(CrmSubscriptionActionSchema),
    subscription_history: z.array(SubscriptionHistoryRowSchema).optional(),
    billing_visibility: z.enum(["full", "route_manager_limited"]).optional(),
    billing_restricted_message: z.string().nullable().optional(),
  }),
  z.object({
    state: z.literal("record"),
    headline: z.string(),
    id: z.string(),
    subscription_plan_id: z.string().optional(),
    plan_name: z.string(),
    status: z.string(),
    status_label: z.string(),
    starts_at: z.string().nullable().optional(),
    renews_at: z.string().nullable().optional(),
    cancelled_at: z.string().nullable().optional(),
    current_period_end: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    allowance_summary: z.string().nullable().optional(),
    included_services: z.string().nullable().optional(),
    price_amount_minor_snapshot: z.number().optional(),
    formatted_price_snapshot_gbp: z.string().nullable().optional(),
    currency: z.string().optional(),
    plan_management_available: z.boolean(),
    recurring_amount_pence: z.number().nullable(),
    recurring_amount_note: z.string(),
    crm_actions: z.array(CrmSubscriptionActionSchema),
    subscription_history: z.array(SubscriptionHistoryRowSchema).optional(),
    billing_visibility: z.enum(["full", "route_manager_limited"]),
    billing_restricted_message: z.string().optional(),
    billing_contact: z
      .object({
        name: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    billing_contact_id: z.string().nullable().optional(),
    latest_subscription_invoice: z
      .object({
        id: z.string(),
        invoice_number: z.string().nullable().optional(),
        invoice_status: z.string().nullable().optional(),
        invoice_status_label: z.string().nullable().optional(),
        issued_on: z.string().nullable().optional(),
        total_pence: z.number(),
        formatted_total: z.string(),
      })
      .nullable()
      .optional(),
    outstanding_subscription_invoices_pence: z.number().optional(),
    formatted_outstanding_subscription: z.string().optional(),
  }),
]);

export type CompanySubscriptionCrm = z.infer<typeof CompanySubscriptionCrmSchema>;

export const CompanyDetailResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    company_status: CompanyStatusEnum,
    phone: z.string().nullable(),
    billing_email: z.string().nullable(),
    city: z.string().nullable(),
    overview: CompanyOverviewSnapshotSchema,
    subscription: CompanySubscriptionCrmSchema,
    users: z.array(CompanyUserSchema),
    contacts: z.array(ContactSchema),
    locations: z.array(LocationSchema),
    notes: z.array(NoteSchema),
    bookings: z.array(BookingPreviewSchema),
    orders: z.array(OrderPreviewSchema),
    knives: z.array(KnifePreviewSchema),
    invoices: z.array(InvoicePreviewSchema),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  }),
});

export type CompanyDetail = z.infer<(typeof CompanyDetailResponseSchema)["shape"]["data"]>;

export const CompanySummarySchema = z.object({
  success: z.literal(true),
  data: z.object({
    orders_total_pence: z.number(),
    bookings_pipeline_count: z.number(),
    bookings_total_count: z.number(),
    contacts_count: z.number(),
    locations_count: z.number(),
    knives_count: z.number(),
    invoices_open_count: z.number(),
    invoices_open_total_pence: z.number(),
    overview: CompanyOverviewSnapshotSchema,
  }),
});

/** Combined audit rows + threaded notes from GET /api/admin/companies/:id/activity */
export const CompanyActivityResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(
      z
        .object({
          type: z.enum(["audit", "note"]),
          id: z.union([z.string(), z.number()]),
          at: z.string().nullable().optional(),
          action: z.string().optional(),
          actor_name: z.string().nullable().optional(),
          body: z.string().optional(),
          payload: z.unknown().optional(),
        })
        .passthrough(),
    ),
  }),
});

export type CompanyActivityItem = z.infer<
  typeof CompanyActivityResponseSchema
>["data"]["items"][number];
