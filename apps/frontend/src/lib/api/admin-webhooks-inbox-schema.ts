import { z } from "zod";

/** Metadata-only row from `GET /api/admin/webhooks/inbox`. */
export const WebhookInboxItemSchema = z.object({
  id: z.number(),
  provider: z.string(),
  external_id: z.string(),
  event_type: z.string(),
  processing_state: z.string(),
  last_error: z.string().nullable(),
  received_at: z.string().nullable(),
  processed_at: z.string().nullable(),
  created_at: z.string().nullable(),
});

export type WebhookInboxItem = z.infer<typeof WebhookInboxItemSchema>;

export const WebhookInboxListResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      items: z.array(WebhookInboxItemSchema),
    }),
  })
  .passthrough();

export type WebhookInboxListResponse = z.infer<typeof WebhookInboxListResponseSchema>;
