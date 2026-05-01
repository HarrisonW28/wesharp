import { z } from "zod";

export const PaymentRowSchema = z
  .object({
    id: z.string(),
    company_id: z.string(),
    order_id: z.string().nullable().optional(),
    invoice_id: z.string().nullable().optional(),
    amount: z.number(),
    method: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    paid_at: z.string().nullable().optional(),
    reference: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    recorded_by: z
      .object({
        id: z.string(),
        name: z.string(),
        email: z.string().optional(),
      })
      .nullable()
      .optional(),
    currency: z.string().nullable().optional(),
    invoice: z
      .object({
        id: z.string(),
        invoice_number: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
  })
  .passthrough();

export const PaginatedPaymentsResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ items: z.array(PaymentRowSchema) }),
  meta: z.object({ pagination: z.record(z.string(), z.unknown()) }).passthrough().optional(),
});
