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
});

export const LocationSchema = z.object({
  id: z.string(),
  label: z.string(),
  line_one: z.string().nullable(),
  line_two: z.string().nullable(),
  city: z.string().nullable(),
  postcode: z.string().nullable(),
  country: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
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
  service_type: z.string().nullable().optional(),
  scheduled_date: z.string().nullable().optional(),
  internal_notes: z.string().nullable().optional(),
  company_location_id: z.string().nullable().optional(),
});

export const OrderPreviewSchema = z.object({
  id: z.string(),
  order_status: z.string().nullable().optional(),
  total_pence: z.number(),
  currency: z.string().nullable().optional(),
});

export const KnifePreviewSchema = z.object({
  id: z.string(),
  label: z.string().nullable().optional(),
  knife_status: z.string().nullable().optional(),
  position: z.union([z.string(), z.number()]).nullable().optional(),
});

export const InvoicePreviewSchema = z.object({
  id: z.string(),
  invoice_number: z.string().nullable().optional(),
  invoice_status: z.string().nullable().optional(),
  total_pence: z.number(),
  currency: z.string().nullable().optional(),
  issued_on: z.string().nullable().optional(),
});

export const CompanyDetailResponseSchema = z.object({
  success: z.literal(true),
  data: z
    .object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      company_status: CompanyStatusEnum,
      phone: z.string().nullable(),
      billing_email: z.string().nullable(),
      city: z.string().nullable(),
      contacts: z.array(ContactSchema),
      locations: z.array(LocationSchema),
      notes: z.array(NoteSchema),
      bookings: z.array(BookingPreviewSchema),
      orders: z.array(OrderPreviewSchema),
      knives: z.array(KnifePreviewSchema),
      invoices: z.array(InvoicePreviewSchema),
      created_at: z.string().optional(),
      updated_at: z.string().optional(),
    })
    .passthrough(),
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
