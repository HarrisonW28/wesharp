import { z } from "zod";

export const CostImportUploadedBySchema = z
  .object({
    id: z.string(),
    email: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
  })
  .passthrough();

export const CostImportBatchSummarySchema = z
  .object({
    id: z.string(),
    type: z.string(),
    filename: z.string(),
    status: z.string(),
    rows_detected: z.number(),
    rows_created: z.number(),
    rows_updated: z.number(),
    rows_skipped: z.number(),
    warnings: z.array(z.unknown()).nullable().optional(),
    errors: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
    cash_snapshot: z.record(z.string(), z.unknown()).nullable().optional(),
    auxiliary_sheets: z.record(z.string(), z.unknown()).nullable().optional(),
    started_at: z.string().nullable().optional(),
    completed_at: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    uploaded_by: CostImportUploadedBySchema.nullable().optional(),
  })
  .passthrough();

export const CostImportRowPreviewSchema = z
  .object({
    id: z.string(),
    sheet_name: z.string(),
    row_number: z.number(),
    raw_data: z.record(z.string(), z.unknown()).nullable().optional(),
    mapped_data: z.record(z.string(), z.unknown()).nullable().optional(),
    preview_action: z.string(),
    applied_action: z.string().nullable().optional(),
    error_message: z.string().nullable().optional(),
  })
  .passthrough();

export const CostImportStoreResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ batch: CostImportBatchSummarySchema }),
});

export const CostImportShowResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    batch: CostImportBatchSummarySchema,
    rows: z.array(CostImportRowPreviewSchema),
  }),
  meta: z
    .object({
      rows_pagination: z.record(z.string(), z.unknown()).optional(),
    })
    .passthrough(),
});

export const PaginatedCostImportsResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ batches: z.array(CostImportBatchSummarySchema) }),
  meta: z.object({ pagination: z.record(z.string(), z.unknown()) }).passthrough().optional(),
});

export const CostImportCommitResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ batch: CostImportBatchSummarySchema }),
});
