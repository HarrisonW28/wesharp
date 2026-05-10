import { z } from "zod";

export const CostCategoryRowSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable().optional(),
    display_order: z.number(),
    is_active: z.boolean(),
  })
  .passthrough();

export const CostCategoriesResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ items: z.array(CostCategoryRowSchema) }),
});

export const CostItemRowSchema = z
  .object({
    id: z.string(),
    category_id: z.string(),
    tier_label: z.string().nullable().optional(),
    name: z.string(),
    description: z.string().nullable().optional(),
    amount_pence: z.number(),
    formatted_amount: z.string(),
    currency: z.string(),
    frequency: z.string(),
    frequency_label: z.string(),
    status: z.string(),
    status_label: z.string(),
    supplier_name: z.string().nullable().optional(),
    supplier_url: z.string().nullable().optional(),
    priority: z.number(),
    notes: z.string().nullable().optional(),
    is_recurring: z.boolean(),
    is_consumable: z.boolean(),
    is_seeded: z.boolean(),
    source: z.string(),
    source_sheet: z.string().nullable().optional(),
    source_row: z.number().nullable().optional(),
    seed_key: z.string().nullable().optional(),
    starts_on: z.string().nullable().optional(),
    ends_on: z.string().nullable().optional(),
    next_due_on: z.string().nullable().optional(),
    category: CostCategoryRowSchema.nullable().optional(),
  })
  .passthrough();

export const PaginatedCostItemsResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ items: z.array(CostItemRowSchema) }),
  meta: z.object({ pagination: z.record(z.string(), z.unknown()) }).passthrough().optional(),
});

export const CostItemMutationResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ item: CostItemRowSchema }),
});
