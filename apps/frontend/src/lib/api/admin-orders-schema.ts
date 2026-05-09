import { z } from "zod";

import { CompanySoftDeleteEmbedSchema } from "./admin-crm-schema";
import { AdminDamageReportSchema } from "./admin-knives-schema";
import { EvidencePhotoAdminRowSchema, EvidenceSettingsSchema } from "./admin-routes-schema";

/** MySQL / JSON may ship integers as strings; empty/null → null. */
function looseOptionalInt() {
  return z.preprocess((v: unknown) => {
    if (v === null || v === undefined || v === "") {
      return null;
    }
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  }, z.number().nullable().optional());
}

function looseInt(defaultZero = false) {
  return z.preprocess((v: unknown) => {
    if ((v === null || v === undefined || v === "") && defaultZero) {
      return 0;
    }
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  }, z.number());
}

const looseBool = z.union([z.boolean(), z.literal(0), z.literal(1)]).transform((v) => v === true || v === 1);

export const OrderBookingLinkSchema = z.object({
  id: z.string(),
  reference: z.string(),
  scheduled_date: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
});

export const OrderInvoiceLineSchema = z.object({
  description: z.union([z.string(), z.null()]).transform((v) => (v == null ? "" : v)),
  quantity: looseInt(true),
  unit_amount_pence: looseInt(true),
  line_total_pence: looseInt(true),
  formatted_unit_amount: z.string().optional(),
  formatted_line_total: z.string().optional(),
});

export const OrderInvoiceSummarySchema = z.object({
  id: z.string(),
  invoice_number: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  subtotal_pence: looseInt(true),
  tax_pence: looseInt(true),
  total_pence: looseInt(true),
  formatted_amount: z.string().optional(),
  formatted_subtotal: z.string().optional(),
  formatted_tax: z.string().optional(),
  formatted_total: z.string().optional(),
  line_items: z.array(OrderInvoiceLineSchema).optional(),
});

export const OrderInvoiceDraftResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    invoice: OrderInvoiceSummarySchema,
    already_existed: z.boolean(),
  }),
});

export const OrderAllowedNextStatusSchema = z.object({
  value: z.string(),
  label: z.string(),
  risky: looseBool,
});

export const OrderRowSchema = z.object({
  id: z.string(),
  reference: z.string().optional(),
  company_id: z.string(),
  booking_id: z.union([z.string(), z.null()]).transform((v) => (v == null ? "" : v)),
  route_id: z.string().nullable().optional(),
  status: z.string().nullable(),
  status_label: z.string().optional(),
  knife_count: looseOptionalInt(),
  billable_lines_count: looseOptionalInt(),
  knives_registered_count: looseOptionalInt(),
  price_per_knife_pence: looseOptionalInt(),
  discount_pence: looseOptionalInt(),
  subtotal_pence: looseOptionalInt(),
  tax_pence: looseOptionalInt(),
  total_pence: looseOptionalInt(),
  currency: z.string().nullable().optional(),
  payment_status: z.string().nullable().optional(),
  company: CompanySoftDeleteEmbedSchema.nullable().optional(),
  booking: OrderBookingLinkSchema.nullable().optional(),
  scheduled_date: z.string().nullable().optional(),
  route_name: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const KnifeSummarySchema = z
  .object({
    id: z.string(),
    tag_id: z.string().nullable().optional(),
    label: z.string().nullable().optional(),
    knife_type: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
  })
  .passthrough();

export const KnifeAllowedNextSchema = z.object({
  value: z.string(),
  label: z.string(),
  risky: looseBool,
});

export const WorkshopProgressSchema = z.object({
  knife_count: looseInt(true),
  line_only_units: looseInt(true),
  work_units: looseInt(true),
  by_status: z.record(z.string(), looseInt(true)).optional(),
  knives_returned_or_cancelled: looseInt(true),
  all_knives_complete: looseBool,
});

export const OrderItemRowSchema = z.object({
  id: z.string(),
  knife_id: z.string().nullable().optional(),
  description: z.union([z.string(), z.null()]).transform((v) => (v == null ? "" : v)),
  quantity: looseInt(true),
  unit_amount_pence: looseInt(true),
  line_total_pence: looseInt(true).optional(),
  formatted_unit_amount: z.string().optional(),
  formatted_line_total: z.string().optional(),
  service_status: z.string().nullable().optional(),
  effective_status: z.string().nullable().optional(),
  status_label: z.string().nullable().optional(),
  allowed_next_service_statuses: z.array(KnifeAllowedNextSchema).optional(),
});

export const OrderAuditEntrySchema = z
  .object({
    id: z.string(),
    at: z.string().nullable().optional(),
    action: z.string(),
  })
  .passthrough();

export const OrderStatusMilestoneSchema = z.object({
  key: z.string(),
  label: z.string(),
  at: z.string().nullable().optional(),
});

export const OrderBookingDetailSchema = z.object({
  id: z.string(),
  reference: z.string(),
  scheduled_date: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  contact: z
    .object({
      name: z.union([z.string(), z.null()]).transform((v) => (v == null ? "" : v)),
      email: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
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
});

export const PaginatedOrdersResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(OrderRowSchema),
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
        .passthrough(),
    })
    .passthrough()
    .optional(),
});

/** Present on `POST .../bulk-workshop` responses; omitted on normal order fetches. */
export const BulkWorkshopSummarySchema = z
  .object({
    mode: z.string(),
    any_applied: z.boolean().optional(),
    selected_knife_count: z.number().optional(),
    selected_line_count: z.number().optional(),
    applied_knives: z.array(z.record(z.string(), z.unknown())).optional(),
    skipped_knives: z.array(z.record(z.string(), z.unknown())).optional(),
    applied_line_items: z.array(z.record(z.string(), z.unknown())).optional(),
    skipped_line_items: z.array(z.record(z.string(), z.unknown())).optional(),
    updated_line_prices: z.number().optional(),
    updated_knife_types: z.number().optional(),
    updated_inspection_visibility: z.number().optional(),
    notes_appended: z.number().optional(),
  })
  .passthrough();

export const OrderDetailSchema = OrderRowSchema.extend({
  order_damage_reports: z
    .array(
      AdminDamageReportSchema.extend({
        knife_label: z.string().nullable().optional(),
        knife_tag_id: z.string().nullable().optional(),
      }),
    )
    .optional(),
  knives: z.array(KnifeSummarySchema).optional(),
  items: z.array(OrderItemRowSchema).optional(),
  created_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  invoice: OrderInvoiceSummarySchema.nullable().optional(),
  booking_detail: OrderBookingDetailSchema.nullable().optional(),
  audit_timeline: z.array(OrderAuditEntrySchema).optional(),
  status_timeline: z.array(OrderStatusMilestoneSchema).optional(),
  allowed_next_statuses: z.array(OrderAllowedNextStatusSchema).optional(),
  workshop_progress: WorkshopProgressSchema.optional(),
  evidence_photos: z.array(EvidencePhotoAdminRowSchema).optional(),
  evidence_settings: EvidenceSettingsSchema.optional(),
  bulk_workshop_summary: BulkWorkshopSummarySchema.optional(),
  staff_next_actions: z.array(z.string()).optional(),
}).passthrough();

export const OrderDetailResponseSchema = z.object({
  success: z.literal(true),
  data: OrderDetailSchema,
});

/** When validation lags the API, still unwrap a successful envelope. */
export function unwrapAdminOrderDetailPayload(body: unknown): z.infer<typeof OrderDetailSchema> | null {
  if (body === null || body === undefined || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }
  const b = body as Record<string, unknown>;
  if (b.success === true && b.data !== null && b.data !== undefined && typeof b.data === "object" && !Array.isArray(b.data)) {
    return b.data as z.infer<typeof OrderDetailSchema>;
  }
  return null;
}

export function parseAdminOrderDetailEnvelope(
  body: unknown,
  errorMessage = "Unexpected order payload.",
): z.infer<typeof OrderDetailSchema> {
  const parsed = OrderDetailResponseSchema.safeParse(body);
  if (parsed.success) {
    return parsed.data.data;
  }
  const fallback = unwrapAdminOrderDetailPayload(body);
  if (fallback !== null) {
    return fallback;
  }
  throw new Error(errorMessage);
}
