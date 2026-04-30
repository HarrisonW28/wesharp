import { z } from "zod";

export const KnifeRowSchema = z
  .object({
    id: z.string(),
    tag_id: z.string().nullable().optional(),
    knife_type: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    company_id: z.string().nullable().optional(),
    company_name: z.string().nullable().optional(),
    order_id: z.string().nullable().optional(),
    booking_id: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
  })
  .passthrough();

export const KnifeDetailSchema = z
  .object({
    id: z.string(),
    company: z
      .object({
        id: z.string(),
        name: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    tag_id: z.string().nullable().optional(),
    knife_type: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    condition_before: z.string().nullable().optional(),
    damage_notes: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    label: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    position: z.number().nullable().optional(),
    order_id: z.string().nullable().optional(),
    order_summary: z
      .object({
        id: z.string(),
        status: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    sharpened_by: z
      .object({ id: z.string().nullable(), name: z.string().nullable().optional() })
      .nullable()
      .optional(),
    quality_checked_by: z
      .object({ id: z.string().nullable(), name: z.string().nullable().optional() })
      .nullable()
      .optional(),
    returned_by: z
      .object({ id: z.string().nullable(), name: z.string().nullable().optional() })
      .nullable()
      .optional(),
    damage_reports: z.array(z.record(z.string(), z.unknown())).optional(),
    photos: z
      .array(
        z.object({
          id: z.string(),
          caption: z.string().nullable().optional(),
          sort_order: z.number().optional(),
          file: z
            .object({
              original_filename: z.string().nullable().optional(),
              byte_size: z.number().optional(),
              mime_type: z.string().nullable().optional(),
            })
            .nullable()
            .optional(),
        }),
      )
      .optional(),
    timeline: z.array(z.record(z.string(), z.unknown())).optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
  })
  .passthrough();

export const KnifeDetailResponseSchema = z.object({
  success: z.literal(true),
  data: KnifeDetailSchema,
});

export const PaginatedKnivesResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(KnifeRowSchema),
  }),
  meta: z.object({ pagination: z.record(z.string(), z.unknown()) }).passthrough().optional(),
});
