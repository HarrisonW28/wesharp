import { z } from "zod";

const WorkQueueItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  count: z.number(),
  href: z.string(),
  action_label: z.string(),
});

const WorkQueueSectionSchema = z.object({
  key: z.string(),
  label: z.string(),
  items: z.array(WorkQueueItemSchema),
});

export const WorkQueueApiResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    sections: z.array(WorkQueueSectionSchema),
  }),
  meta: z.unknown().optional(),
});

export type WorkQueueItem = z.infer<typeof WorkQueueItemSchema>;
export type WorkQueueSection = z.infer<typeof WorkQueueSectionSchema>;

export function flattenWorkQueueItems(sections: WorkQueueSection[]): WorkQueueItem[] {
  return sections.flatMap((s) => s.items);
}
