import { z } from "zod";

export const LinkedOrderListSchema = z.object({
  reference: z.string().optional(),
  display_reference: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
});

export const InvoiceRowSchema = z.object({
  id: z.string(),
  display_reference: z.string().optional(),
  company_id: z.string(),
  order_id: z.string().nullable().optional(),
  source_type: z.string().nullable().optional(),
  source_id: z.string().nullable().optional(),
  billing_period_start: z.string().nullable().optional(),
  billing_period_end: z.string().nullable().optional(),
  invoice_number: z.string().nullable().optional(),
  issue_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  subtotal: z.number().nullable().optional(),
  tax_total: z.number().nullable().optional(),
  total: z.number().nullable().optional(),
  paid_pence: z.number().optional(),
  outstanding_pence: z.number().optional(),
  currency: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  payment_status: z.string().nullable().optional(),
  overdue: z.boolean().optional(),
  company_name: z.string().nullable().optional(),
  formatted_paid: z.string().optional(),
  formatted_outstanding: z.string().optional(),
  formatted_amount: z.string().optional(),
  linked_order: LinkedOrderListSchema.nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const InvoiceLineSchema = z.object({
  id: z.string(),
  kind: z.string().optional(),
  line_item_type: z.string().nullable().optional(),
  description: z.string(),
  quantity: z.number(),
  unit_amount: z.number(),
  line_total: z.number(),
  unit_formatted: z.string().optional(),
  line_formatted: z.string().optional(),
});

const PaymentTinySchema = z
  .object({
    id: z.string(),
    company_id: z.string().optional(),
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
    formatted_amount: z.string().optional(),
  })
  .passthrough();

export const InvoiceAuditEntrySchema = z
  .object({
    id: z.string(),
    at: z.string().nullable().optional(),
    action: z.string(),
  })
  .passthrough();

export const InvoiceCompanySchema = z.object({
  name: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  billing_email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});

export const InvoiceIssuerSchema = z.object({
  legal_name: z.string(),
  address_lines: z.array(z.string()),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  vat_number: z.string().nullable().optional(),
});

export const InvoiceOrderDetailSchema = z.object({
  id: z.string(),
  reference: z.string().optional(),
  display_reference: z.string().optional(),
  status: z.string().nullable().optional(),
  booking: z
    .object({
      reference: z.string(),
      scheduled_date: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export const InvoiceAllowedActionsSchema = z.object({
  send: z.boolean().optional(),
  mark_paid: z.boolean().optional(),
  void: z.boolean().optional(),
  reopen_draft: z.boolean().optional(),
  record_payment: z.boolean().optional(),
  edit_draft_lines: z.boolean().optional(),
  edit_draft_meta: z.boolean().optional(),
});

export const InvoiceStripePanelSchema = z
  .object({
    driver: z.string().optional(),
    hosted_checkout_available: z.boolean().optional(),
    hosted_checkout_disabled_reason: z.string().nullable().optional(),
    checkout_url: z.string().nullable().optional(),
    publishable_key_configured: z.boolean().optional(),
    webhook_secret_configured: z.boolean().optional(),
    live_mode_blocked: z.boolean().optional(),
  })
  .passthrough();

export const InvoiceStatusTimelineItemSchema = z.object({
  id: z.string(),
  at: z.string().nullable().optional(),
  action: z.string(),
  label: z.string().optional(),
});

export const InvoiceDetailSchema = InvoiceRowSchema.extend({
  items: z.array(InvoiceLineSchema),
  payments: z.array(PaymentTinySchema),
  company: InvoiceCompanySchema.nullable().optional(),
  order: InvoiceOrderDetailSchema.nullable().optional(),
  is_subscription_billing: z.boolean().optional(),
  subscription_summary: z.string().nullable().optional(),
  audit_timeline: z.array(InvoiceAuditEntrySchema).optional(),
  status_timeline: z.array(InvoiceStatusTimelineItemSchema).optional(),
  allowed_actions: InvoiceAllowedActionsSchema.optional(),
  issuer: InvoiceIssuerSchema.optional(),
  default_payment_footer: z.string().nullable().optional(),
  customer_notes: z.string().nullable().optional(),
  internal_notes: z.string().nullable().optional(),
  stripe: InvoiceStripePanelSchema.optional(),
});

export const InvoiceDetailResponseSchema = z.object({
  success: z.literal(true),
  data: InvoiceDetailSchema,
});

export const PaginatedInvoicesResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ items: z.array(InvoiceRowSchema) }),
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
});
