import { z } from "zod";

export const CostAllocationLedgerRowSchema = z
  .object({
    id: z.string(),
    cost_item_id: z.string().nullable().optional(),
    cost_item_name: z.string().nullable().optional(),
    consumable_usage_id: z.string().nullable().optional(),
    target_type: z.string(),
    target_id: z.string(),
    amount_pence: z.number(),
    formatted_amount: z.string(),
    currency: z.string(),
    allocation_method: z.string(),
    notes: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    created_by_user_id: z.string().nullable().optional(),
    created_by_name: z.string().nullable().optional(),
  })
  .passthrough();

export const CostAllocationsListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(CostAllocationLedgerRowSchema),
    meta: z.object({
      current_page: z.number(),
      last_page: z.number(),
      per_page: z.number(),
      total: z.number(),
    }),
  }),
});

export const CostAllocationCreateResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ item: CostAllocationLedgerRowSchema }),
});
