import { z } from "zod";

export const ConsumableInventoryRowSchema = z
  .object({
    id: z.string(),
    cost_item_id: z.string(),
    name: z.string().optional(),
    category_slug: z.string().nullable().optional(),
    unit_cost_pence: z.number(),
    formatted_unit_cost: z.string(),
    stock_quantity: z.string(),
    stock_unit: z.string().nullable().optional(),
    reorder_threshold: z.string().nullable().optional(),
    reorder_note: z.string().nullable().optional(),
    last_reorder_date: z.string().nullable().optional(),
    estimated_uses_per_unit: z.string().nullable().optional(),
    cost_per_use_pence: z.number().nullable().optional(),
    formatted_cost_per_use: z.string().nullable().optional(),
    cost_per_knife_estimate_pence: z.number().nullable().optional(),
    formatted_cost_per_knife_estimate: z.string().nullable().optional(),
    status: z.string(),
    notes: z.string().nullable().optional(),
    supplier_name: z.string().nullable().optional(),
    is_low_stock: z.boolean(),
    restock_quantity: z.number(),
    projected_reorder_cost_pence: z.number(),
    formatted_projected_reorder_cost: z.string(),
  })
  .passthrough();

export const ConsumablesListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ items: z.array(ConsumableInventoryRowSchema) }),
});

export const ConsumableMutationResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ item: ConsumableInventoryRowSchema }),
});
