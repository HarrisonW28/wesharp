import { z } from "zod";

export const OrderBookingLinkSchema = z.object({
  id: z.string(),
  reference: z.string(),
  scheduled_date: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
});

export const OrderInvoiceLineSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unit_amount_pence: z.number(),
  line_total_pence: z.number(),
  formatted_unit_amount: z.string().optional(),
  formatted_line_total: z.string().optional(),
});

export const OrderInvoiceSummarySchema = z.object({
  id: z.string(),
  invoice_number: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  subtotal_pence: z.number(),
  tax_pence: z.number(),
  total_pence: z.number(),
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
  risky: z.boolean(),
});

export const OrderRowSchema = z.object({
  id: z.string(),
  reference: z.string().optional(),
  company_id: z.string(),
  booking_id: z.string(),
  route_id: z.string().nullable().optional(),
  status: z.string().nullable(),
  status_label: z.string().optional(),
  knife_count: z.number().nullable().optional(),
  billable_lines_count: z.number().nullable().optional(),
  knives_registered_count: z.number().nullable().optional(),
  price_per_knife_pence: z.number().nullable().optional(),
  discount_pence: z.number().nullable().optional(),
  subtotal_pence: z.number().nullable().optional(),
  tax_pence: z.number().nullable().optional(),
  total_pence: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  payment_status: z.string().nullable().optional(),
  company: z
    .object({
      name: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
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

export const OrderItemRowSchema = z.object({
  id: z.string(),
  knife_id: z.string().nullable().optional(),
  description: z.string(),
  quantity: z.number(),
  unit_amount_pence: z.number(),
  line_total_pence: z.number().optional(),
  formatted_unit_amount: z.string().optional(),
  formatted_line_total: z.string().optional(),
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
      name: z.string(),
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

export const OrderDetailSchema = OrderRowSchema.extend({
  knives: z.array(KnifeSummarySchema).optional(),
  items: z.array(OrderItemRowSchema).optional(),
  created_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  invoice: OrderInvoiceSummarySchema.nullable().optional(),
  booking_detail: OrderBookingDetailSchema.nullable().optional(),
  audit_timeline: z.array(OrderAuditEntrySchema).optional(),
  status_timeline: z.array(OrderStatusMilestoneSchema).optional(),
  allowed_next_statuses: z.array(OrderAllowedNextStatusSchema).optional(),
});

export const OrderDetailResponseSchema = z.object({
  success: z.literal(true),
  data: OrderDetailSchema,
});
