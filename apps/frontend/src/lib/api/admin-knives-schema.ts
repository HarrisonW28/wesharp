import { z } from "zod";

import { EvidencePhotoAdminRowSchema, EvidenceSettingsSchema } from "./admin-routes-schema";

export const AdminDamageReportSchema = z
  .object({
    id: z.string(),
    order_id: z.string().nullable().optional(),
    knife_id: z.string().optional(),
    description: z.string().nullable().optional(),
    details: z.string().nullable().optional(),
    internal_notes: z.string().nullable().optional(),
    customer_visible: z.boolean().optional(),
    customer_description: z.string().nullable().optional(),
    severity: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    resolved_at: z.string().nullable().optional(),
    archived_at: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    created_by: z
      .object({ id: z.string().nullable().optional(), name: z.string().nullable().optional() })
      .nullable()
      .optional(),
  })
  .passthrough();

export const KnifeRowSchema = z
  .object({
    id: z.string(),
    tag_id: z.string().nullable().optional(),
    label: z.string().nullable().optional(),
    knife_type: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    company_id: z.string().nullable().optional(),
    company_name: z.string().nullable().optional(),
    order_id: z.string().nullable().optional(),
    booking_id: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
  })
  .passthrough();

export const KnifeServiceHistoryEntrySchema = z
  .object({
    id: z.string(),
    order_id: z.string(),
    order_status: z.string().nullable().optional(),
    order_status_label: z.string().nullable().optional(),
    service_kind: z.string().nullable().optional(),
    service_kind_label: z.string().nullable().optional(),
    service_date: z.string().nullable().optional(),
    order_completed_at: z.string().nullable().optional(),
    linked_at: z.string().nullable().optional(),
    unlinked_at: z.string().nullable().optional(),
    is_current: z.boolean().optional(),
    condition_summary: z.string().nullable().optional(),
    damage_reports: z.array(AdminDamageReportSchema).optional(),
    invoices: z
      .array(
        z.object({
          id: z.string(),
          invoice_number: z.string().nullable().optional(),
          invoice_status: z.string().nullable().optional(),
          admin_path: z.string().optional(),
        }),
      )
      .optional(),
    workshop_evidence_photos: z.array(EvidencePhotoAdminRowSchema).optional(),
  })
  .passthrough();

export const KnifePastOrderRowSchema = z
  .object({
    order_id: z.string(),
    order_status: z.string().nullable().optional(),
    order_status_label: z.string().nullable().optional(),
    linked_at: z.string().nullable().optional(),
    unlinked_at: z.string().nullable().optional(),
    is_current: z.boolean().optional(),
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
    brand: z.string().nullable().optional(),
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
    inspection: z
      .object({
        condition: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        internal_notes: z.string().nullable().optional(),
        customer_visible: z.boolean().optional(),
        inspected_at: z.string().nullable().optional(),
        inspected_by: z
          .object({ id: z.string().nullable().optional(), name: z.string().nullable().optional() })
          .nullable()
          .optional(),
      })
      .optional(),
    damage_reports: z.array(AdminDamageReportSchema).optional(),
    workshop_evidence_photos: z.array(EvidencePhotoAdminRowSchema).optional(),
    evidence_settings: EvidenceSettingsSchema.optional(),
    photos: z
      .array(
        z.object({
          id: z.string(),
          caption: z.string().nullable().optional(),
          photo_kind: z.string().optional(),
          content_api_path: z.string().optional(),
          order_id: z.string().nullable().optional(),
          created_at: z.string().nullable().optional(),
          sort_order: z.number().optional(),
          uploaded_by: z
            .object({ id: z.string(), name: z.string().nullable().optional() })
            .nullable()
            .optional(),
          file: z
            .object({
              id: z.string().optional(),
              original_filename: z.string().nullable().optional(),
              byte_size: z.number().optional(),
              mime_type: z.string().nullable().optional(),
              created_at: z.string().nullable().optional(),
            })
            .nullable()
            .optional(),
        }),
      )
      .optional(),
    timeline: z.array(z.record(z.string(), z.unknown())).optional(),
    past_orders: z.array(KnifePastOrderRowSchema).optional(),
    service_history: z.array(KnifeServiceHistoryEntrySchema).optional(),
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
