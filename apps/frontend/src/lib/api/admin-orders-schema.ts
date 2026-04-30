import { z } from "zod";

export const OrderRowSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  booking_id: z.string(),
  route_id: z.string().nullable().optional(),
  status: z.string().nullable(),
  knife_count: z.number().nullable().optional(),
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
  scheduled_date: z.string().nullable().optional(),
  route_name: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const KnifeSummarySchema = z
  .object({
    id: z.string(),
    tag_id: z.string().nullable().optional(),
    knife_type: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
  })
  .passthrough();

export const PaginatedOrdersResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(OrderRowSchema),
  }),
  meta: z.object({ pagination: z.record(z.string(), z.unknown()) }).passthrough().optional(),
});

export const OrderDetailSchema = OrderRowSchema.extend({
  knives: z.array(KnifeSummarySchema).optional(),
  created_at: z.string().nullable().optional(),
  draft_invoice: z
    .object({
      id: z.string(),
      invoice_number: z.string().nullable().optional(),
      already_existed: z.boolean().optional(),
    })
    .nullable()
    .optional(),
});

export const OrderDetailResponseSchema = z.object({
  success: z.literal(true),
  data: OrderDetailSchema,
});
