import { z } from "zod";

export const InvoiceRowSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  order_id: z.string(),
  invoice_number: z.string(),
  issue_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  subtotal: z.number().nullable().optional(),
  tax_total: z.number().nullable().optional(),
  total: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  payment_status: z.string().nullable().optional(),
  overdue: z.boolean().optional(),
  company_name: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const InvoiceLineSchema = z.object({
  id: z.string(),
  description: z.string(),
  quantity: z.number(),
  unit_amount: z.number(),
  line_total: z.number(),
});

const PaymentTinySchema = z
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
    currency: z.string().nullable().optional(),
  })
  .passthrough();

export const InvoiceDetailSchema = InvoiceRowSchema.extend({
  items: z.array(InvoiceLineSchema),
  payments: z.array(PaymentTinySchema),
});

export const InvoiceDetailResponseSchema = z.object({
  success: z.literal(true),
  data: InvoiceDetailSchema,
});

export const PaginatedInvoicesResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ items: z.array(InvoiceRowSchema) }),
  meta: z.object({ pagination: z.record(z.string(), z.unknown()) }).passthrough().optional(),
});
