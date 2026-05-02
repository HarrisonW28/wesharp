import { z } from "zod";

export const NotificationDeliveryRowSchema = z.object({
  id: z.string(),
  company_id: z.string().nullable().optional(),
  channel: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  recipient_email: z.string().nullable().optional(),
  source_type: z.string().nullable().optional(),
  source_id: z.string().nullable().optional(),
  queued_at: z.string().nullable().optional(),
  sent_at: z.string().nullable().optional(),
  failed_at: z.string().nullable().optional(),
  failure_reason: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
});

export const NotificationDeliveryIndexResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(NotificationDeliveryRowSchema),
  }),
});

export const PaginatedNotificationDeliveriesResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      items: z.array(NotificationDeliveryRowSchema),
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
  })
  .passthrough();

export const NotificationEmailPreviewResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    subject: z.string(),
    html: z.string(),
  }),
});

export const NotificationAdminSettingsResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    respect_booking_notification_opt_out: z.boolean(),
    respect_order_notification_opt_out: z.boolean(),
    respect_subscription_digest_opt_out: z.boolean(),
  }),
});

