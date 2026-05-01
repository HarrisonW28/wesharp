import { z } from "zod";

export const AdminAuditActorSchema = z.object({
  id: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
});

/** Single audit row as returned from Laravel (sanitised payload, labels). */
export const AdminAuditEntrySchema = z
  .object({
    id: z.string(),
    at: z.string().nullable().optional(),
    action: z.string(),
    action_label: z.string().optional(),
    actor: AdminAuditActorSchema.optional(),
    subject_type: z.string().optional(),
    subject_id: z.string().optional(),
    payload: z.unknown().optional(),
    changed_fields: z.array(z.string()).nullable().optional(),
    ip_address: z.string().nullable().optional(),
    request_id: z.string().nullable().optional(),
    company: z
      .object({
        id: z.string(),
        name: z.string(),
      })
      .nullable()
      .optional(),
  })
  .passthrough();

export type AdminAuditEntry = z.infer<typeof AdminAuditEntrySchema>;

export const PaginatedAuditLogsResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      items: z.array(AdminAuditEntrySchema),
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
