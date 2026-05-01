import { z } from "zod";

export const NotificationDeliveryRowSchema = z.object({
  id: z.string(),
  channel: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  recipient_email: z.string().nullable().optional(),
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

