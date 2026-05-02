import { z } from "zod";

export const InAppNotificationRowSchema = z.object({
  id: z.string(),
  kind: z.string(),
  title: z.string(),
  body: z.string().nullable().optional(),
  path: z.string().nullable().optional(),
  read_at: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
});

export const InAppNotificationsIndexResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(InAppNotificationRowSchema),
    unread_count: z.number(),
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
