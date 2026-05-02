import { z } from "zod";

export const OrderFeedbackAdminRowSchema = z.object({
  id: z.string(),
  order_id: z.string(),
  order_reference: z.string().nullable().optional(),
  booking_id: z.string().nullable().optional(),
  route: z
    .object({
      id: z.string(),
      name: z.string().nullable().optional(),
      scheduled_date: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  contact: z
    .object({
      name: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  invitation_sent_at: z.string().nullable().optional(),
  submitted_at: z.string().nullable().optional(),
  rating: z.number().nullable().optional(),
  comment: z.string().nullable().optional(),
  testimonial_interested: z.boolean().optional(),
  staff_reviewed_at: z.string().nullable().optional(),
  testimonial_marketing_approved_at: z.string().nullable().optional(),
});

export const OrderFeedbackListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(OrderFeedbackAdminRowSchema),
  }),
  meta: z
    .object({
      pagination: z
        .object({
          page: z.number(),
          per_page: z.number(),
          total: z.number(),
          total_pages: z.number(),
          has_more_pages: z.boolean(),
        })
        .optional(),
    })
    .passthrough(),
});
