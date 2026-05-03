"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Loader2, Pencil, Printer } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { InvoiceDetailResponseSchema } from "@/lib/api/admin-invoices-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { formatGBP, parseGbpInputToMinorUnits } from "@/lib/format/money";
import { humanizeUnderscored, invoiceStatusLabel } from "@/lib/helpers/status-helpers";
import { useBackendMe } from "@/hooks/use-backend-me";
import { InvoiceDocument } from "@/components/invoices/InvoiceDocument";

import { AuditTimeline, type AuditTimelineRow } from "@/components/admin/AuditTimeline";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { NotificationHistoryPlaceholder } from "@/components/notifications/NotificationHistoryPlaceholder";
import { StatusBadge, StatusBadgeGroup } from "@/components/status/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type DraftLine = { key: string; description: string; quantity: number; unitGbp: string };

const PAYMENT_METHOD_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card (manual)" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "invoice_later", label: "Invoice later / trade credit" },
  { value: "manual", label: "Manual (adjustment)" },
  { value: "other", label: "Other" },
];

function lineToDraft(l: { description: string; quantity: number; unit_amount: number }): DraftLine {
  return {
    key: crypto.randomUUID(),
    description: l.description,
    quantity: l.quantity,
    unitGbp: (l.unit_amount / 100).toFixed(2),
  };
}

export default function AdminInvoiceDetailPage() {
  const params = useParams<{ invoiceId: string }>();
  const invoiceId = params.invoiceId;
  const admin = useAdminApi();
  const queryClient = useQueryClient();
  const { data: mePayload } = useBackendMe();
  const permissions = useMemo(() => new Set(mePayload?.data?.permissions ?? []), [mePayload?.data?.permissions]);
  const canInvoice = permissions.has("invoices.update");
  const canPay = permissions.has("payments.manage");

  const [manualOpen, setManualOpen] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [amountGbp, setAmountGbp] = useState("");
  const [reference, setReference] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payMethod, setPayMethod] = useState("bank_transfer");
  const [paidAt, setPaidAt] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [draftCustomerNotes, setDraftCustomerNotes] = useState("");
  const [draftInternalNotes, setDraftInternalNotes] = useState("");
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);

  const invQuery = useQuery({
    queryKey: ["admin-invoice", invoiceId],
    enabled: Boolean(invoiceId),
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/invoices/${invoiceId}`);
      if (!res.ok) throw new Error(res.message);
      const parsed = InvoiceDetailResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected invoice payload.");
      return parsed.data.data;
    },
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-invoice", invoiceId] });
    void queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
  };

  const openEditDraft = () => {
    const inv = invQuery.data;
    if (!inv) return;
    setIssueDate(inv.issue_date ?? "");
    setDueDate(inv.due_date ?? "");
    setDraftCustomerNotes(inv.customer_notes ?? "");
    setDraftInternalNotes(inv.internal_notes ?? "");
    const lines = inv.items ?? [];
    setDraftLines(
      lines.length > 0
        ? lines.map((l) => lineToDraft(l))
        : [{ key: crypto.randomUUID(), description: "", quantity: 1, unitGbp: "0.00" }],
    );
    setEditOpen(true);
  };

  const sendMut = useMutation({
    mutationFn: async () => {
      const res = await admin.json(`/api/admin/invoices/${invoiceId}/send`, { method: "POST", body: "{}" });
      if (!res.ok) throw new Error(res.message);
      return InvoiceDetailResponseSchema.parse(res.data).data;
    },
    onSuccess: () => {
      toast.success("Marked sent (email integration pending).");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markPaidMut = useMutation({
    mutationFn: async () => {
      const res = await admin.json(`/api/admin/invoices/${invoiceId}/mark-paid`, { method: "POST", body: "{}" });
      if (!res.ok) throw new Error(res.message);
      return InvoiceDetailResponseSchema.parse(res.data).data;
    },
    onSuccess: () => {
      toast.success("Marked paid.");
      setMarkPaidOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const voidMut = useMutation({
    mutationFn: async () => {
      const trimmed = voidReason.trim();
      const res = await admin.json(`/api/admin/invoices/${invoiceId}/void`, {
        method: "POST",
        body: JSON.stringify(trimmed === "" ? {} : { reason: trimmed }),
      });
      if (!res.ok) throw new Error(res.message);
      return InvoiceDetailResponseSchema.parse(res.data).data;
    },
    onSuccess: () => {
      toast.success("Invoice voided.");
      setVoidOpen(false);
      setVoidReason("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reopenDraftMut = useMutation({
    mutationFn: async () => {
      const res = await admin.json(`/api/admin/invoices/${invoiceId}/reopen-draft`, {
        method: "POST",
        body: "{}",
      });
      if (!res.ok) throw new Error(res.message);
      return InvoiceDetailResponseSchema.parse(res.data).data;
    },
    onSuccess: () => {
      toast.success("Invoice moved back to draft.");
      setReopenOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const manualMut = useMutation({
    mutationFn: async () => {
      let n: number;
      try {
        const pence = parseGbpInputToMinorUnits(amountGbp);
        if (pence === undefined || pence < 1) {
          throw new Error("Enter an amount of at least £0.01.");
        }
        n = pence;
      } catch (e) {
        throw new Error(e instanceof Error ? e.message : "Invalid amount.");
      }

      const body: Record<string, unknown> = {
        invoice_id: invoiceId,
        amount_pence: n,
        payment_method: payMethod,
        reference: reference.trim() || undefined,
      };
      if (payNotes.trim() !== "") {
        body.notes = payNotes.trim();
      }
      if (paidAt.trim() !== "") {
        body.paid_at = paidAt;
      }

      const res = await admin.json(`/api/admin/payments/manual`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Payment recorded.");
      setManualOpen(false);
      setAmountGbp("");
      setReference("");
      setPayNotes("");
      setPaidAt("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateDraftMut = useMutation({
    mutationFn: async () => {
      const items: { description: string; quantity: number; unit_amount_pence: number }[] = [];
      for (const row of draftLines) {
        if (!row.description.trim()) continue;
        let unitPence: number;
        try {
          const p = parseGbpInputToMinorUnits(row.unitGbp);
          unitPence = p ?? 0;
        } catch {
          throw new Error("Each line needs a valid unit price in £.");
        }
        if (unitPence < 0) throw new Error("Unit price cannot be negative.");
        items.push({
          description: row.description.trim(),
          quantity: Math.max(1, row.quantity),
          unit_amount_pence: unitPence,
        });
      }
      if (items.length === 0) {
        throw new Error("Add at least one line with a description.");
      }
      const res = await admin.json<unknown>(`/api/admin/invoices/${invoiceId}`, {
        method: "PUT",
        body: JSON.stringify({
          issue_date: issueDate || undefined,
          due_date: dueDate || undefined,
          items,
          customer_notes: draftCustomerNotes.trim() === "" ? null : draftCustomerNotes.trim(),
          internal_notes: draftInternalNotes.trim() === "" ? null : draftInternalNotes.trim(),
        }),
      });
      if (!res.ok) throw new Error(res.message);
      return InvoiceDetailResponseSchema.parse(res.data).data;
    },
    onSuccess: () => {
      toast.success("Draft invoice updated.");
      setEditOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (invQuery.isPending) {
    return (
      <>
        <Breadcrumbs crumbs={[{ label: "Invoices", href: "/admin/invoices" }, { label: "…" }]} />
        <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      </>
    );
  }

  if (invQuery.isError) {
    return (
      <>
        <Breadcrumbs crumbs={[{ label: "Invoices", href: "/admin/invoices" }, { label: "Error" }]} />
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          <p className="font-medium text-destructive">{(invQuery.error as Error).message}</p>
          <Button className="mt-3" type="button" variant="outline" size="default" onClick={() => void invQuery.refetch()}>
            Retry
          </Button>
        </div>
      </>
    );
  }

  const inv = invQuery.data;
  if (!inv) return null;

  const st = inv.status ?? "";
  const payable = !["paid", "void"].includes(st);
  const isDraft = st === "draft";
  const aa = inv.allowed_actions;
  const showSend = canInvoice && (aa?.send ?? st === "draft");
  const showMarkPaid = canInvoice && canPay && (aa?.mark_paid ?? payable);
  const showVoid = canInvoice && (aa?.void ?? payable);
  const showRecordPayment = canInvoice && canPay && (aa?.record_payment ?? (payable && st !== "draft"));
  const showReopenDraft = canInvoice && Boolean(aa?.reopen_draft);
  const showEditDraft = canInvoice && (aa?.edit_draft_lines ?? isDraft);
  const title = inv.display_reference ?? inv.invoice_number ?? "Invoice";
  const paid = inv.paid_pence ?? 0;
  const outstanding = inv.outstanding_pence ?? Math.max(0, (inv.total ?? 0) - paid);

  const issuer = inv.issuer ?? { legal_name: "WeSharp", address_lines: [] as string[] };
  const billTo = inv.company
    ? {
        name: inv.company.name ?? "—",
        city: inv.company.city,
        billing_email: inv.company.billing_email,
        phone: inv.company.phone,
      }
    : null;

  return (
    <>
      <div className="print:hidden">
        <Breadcrumbs crumbs={[{ label: "Invoices", href: "/admin/invoices" }, { label: title }]} />
        <PageHeader
          title={title}
          description={`${inv.company?.name ?? "Account"}${inv.company?.city ? ` · ${inv.company.city}` : ""}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link href={`/admin/invoices/${invoiceId}/print`} target="_blank" rel="noopener noreferrer">
                  <Printer className="h-4 w-4" aria-hidden />
                  Print view
                </Link>
              </Button>
              {showEditDraft ? (
                <Button type="button" variant="outline" size="lg" className="gap-2" onClick={openEditDraft}>
                  <Pencil className="h-4 w-4" aria-hidden />
                  Edit draft
                </Button>
              ) : null}
            </div>
          }
        />
      </div>

      <div className="print:hidden">
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit draft invoice</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Replace all lines and VAT is recalculated at 20% on the net. Issue and due dates can be adjusted here.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="iss">Issue date</Label>
              <Input id="iss" type="date" className="h-11" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="due">Due date</Label>
              <Input id="due" type="date" className="h-11" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-3">
            {draftLines.map((row, idx) => (
              <div key={row.key} className="rounded-lg border p-3">
                <div className="mb-2 text-xs font-medium text-muted-foreground">Line {idx + 1}</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Description</Label>
                    <Input
                      className="h-11"
                      value={row.description}
                      onChange={(e) =>
                        setDraftLines((lines) =>
                          lines.map((l) => (l.key === row.key ? { ...l, description: e.target.value } : l)),
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      className="h-11"
                      value={row.quantity}
                      onChange={(e) =>
                        setDraftLines((lines) =>
                          lines.map((l) =>
                            l.key === row.key ? { ...l, quantity: Number.parseInt(e.target.value, 10) || 1 } : l,
                          ),
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Unit £ (ex VAT)</Label>
                    <Input
                      inputMode="decimal"
                      className="h-11"
                      value={row.unitGbp}
                      onChange={(e) =>
                        setDraftLines((lines) =>
                          lines.map((l) => (l.key === row.key ? { ...l, unitGbp: e.target.value } : l)),
                        )
                      }
                    />
                  </div>
                </div>
                {draftLines.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-destructive"
                    onClick={() => setDraftLines((lines) => lines.filter((l) => l.key !== row.key))}
                  >
                    Remove line
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="cust-notes">Customer notes (print on invoice)</Label>
              <Textarea
                id="cust-notes"
                rows={3}
                value={draftCustomerNotes}
                onChange={(e) => setDraftCustomerNotes(e.target.value)}
                placeholder="Thank you, payment terms, reference to quote…"
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="int-notes">Internal notes (admin only, never sent to customer)</Label>
              <Textarea
                id="int-notes"
                rows={3}
                value={draftInternalNotes}
                onChange={(e) => setDraftInternalNotes(e.target.value)}
                placeholder="Chase rules, account manager, CRM hints…"
                className="min-h-[80px]"
              />
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setDraftLines((l) => [...l, { key: crypto.randomUUID(), description: "", quantity: 1, unitGbp: "0.00" }])}>
            + Add line
          </Button>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="lg" disabled={updateDraftMut.isPending} onClick={() => updateDraftMut.mutate()}>
              {updateDraftMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Save draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>

      {canInvoice ? (
        <div className="mb-6 flex flex-col gap-3 print:hidden sm:flex-row sm:flex-wrap">
          {showSend ? (
            <Button type="button" variant="secondary" size="lg" disabled={sendMut.isPending} onClick={() => sendMut.mutate()}>
              {sendMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Mark sent
            </Button>
          ) : null}
          {showMarkPaid ? (
            <Button type="button" size="lg" disabled={markPaidMut.isPending} onClick={() => setMarkPaidOpen(true)}>
              {markPaidMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Mark paid (write-off balance)
            </Button>
          ) : null}
          {showReopenDraft ? (
            <Button type="button" variant="outline" size="lg" onClick={() => setReopenOpen(true)}>
              Reopen as draft
            </Button>
          ) : null}
          {showVoid ? (
            <Button type="button" variant="destructive" size="lg" disabled={voidMut.isPending} onClick={() => setVoidOpen(true)}>
              Void invoice
            </Button>
          ) : null}
          {showRecordPayment ? (
            <Dialog open={manualOpen} onOpenChange={setManualOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="lg">
                  Record payment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record manual payment</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  No card processing or Stripe capture here — log what was received. Partial payments are allowed. Amounts
                  above the outstanding balance are blocked unless an operator with <span className="font-mono">payments.override</span>{" "}
                  (super admin / admin) posts them.
                </p>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Method</Label>
                    <Select value={payMethod} onValueChange={setPayMethod}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHOD_OPTIONS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="amount-gbp">Amount (£)</Label>
                    <Input
                      id="amount-gbp"
                      inputMode="decimal"
                      className="h-11"
                      value={amountGbp}
                      onChange={(e) => setAmountGbp(e.target.value)}
                      placeholder="e.g. 150.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="paid-at">Payment date</Label>
                    <Input id="paid-at" type="datetime-local" className="h-11" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ref">Reference / note</Label>
                    <Input id="ref" className="h-11" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. FPS ref" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="pay-notes">Internal payment notes (optional)</Label>
                    <Textarea
                      id="pay-notes"
                      rows={2}
                      className="min-h-[72px]"
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                      placeholder="Till, batch, reconciliation hint — not shown on customer invoice"
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" type="button" onClick={() => setManualOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" size="lg" disabled={manualMut.isPending} onClick={() => manualMut.mutate()}>
                    {manualMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                    Record
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      ) : (
        <p className="mb-4 print:hidden text-sm text-muted-foreground">
          You can view this invoice but your role cannot change finance fields.
        </p>
      )}

      {inv.stripe ? (
        <Card className="mb-6 p-4 print:hidden">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Stripe (foundation)</div>
          <p className="mt-2 text-sm text-muted-foreground">
            {inv.stripe.hosted_checkout_disabled_reason ??
              "Online checkout is not enabled yet. Manual payment below remains the supported flow."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {inv.stripe.webhook_secret_configured ? (
              <Badge variant="secondary">Webhook secret configured</Badge>
            ) : (
              <Badge variant="outline">Webhook secret not set</Badge>
            )}
            {inv.stripe.publishable_key_configured ? (
              <Badge variant="secondary">Publishable key set</Badge>
            ) : (
              <Badge variant="outline">Publishable key not set</Badge>
            )}
            {inv.stripe.checkout_redirect_urls_configured ? (
              <Badge variant="secondary">Checkout redirect URLs set</Badge>
            ) : (
              <Badge variant="outline">Checkout redirect URLs not set</Badge>
            )}
            {inv.stripe.live_mode_blocked ? <Badge variant="destructive">Live keys blocked by policy</Badge> : null}
          </div>
          <div className="mt-4">
            <Button type="button" variant="secondary" size="lg" disabled className="w-full sm:w-auto">
              Pay with Stripe — not enabled yet
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Card capture and Checkout URLs are deferred. Invoices are not marked paid from the browser.
            </p>
          </div>
        </Card>
      ) : null}

      <InvoiceDocument
        className="mb-8 rounded-xl border bg-card p-5 shadow-sm md:p-8 print:mb-0 print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none"
        documentTitle={title}
        invoiceNumber={inv.invoice_number}
        issueDate={inv.issue_date}
        dueDate={inv.due_date}
        statusLabel={invoiceStatusLabel(st)}
        paymentStatusLabel={inv.payment_status ? humanizeUnderscored(inv.payment_status) : undefined}
        issuer={issuer}
        billTo={billTo}
        lines={(inv.items ?? []).map((line) => ({
          description: line.description,
          quantity: line.quantity,
          unitFormatted: line.unit_formatted ?? formatGBP(line.unit_amount),
          lineFormatted: line.line_formatted ?? formatGBP(line.line_total),
          kind: line.line_item_type ?? line.kind,
        }))}
        showLineKinds
        subtotalPence={inv.subtotal ?? 0}
        taxPence={inv.tax_total ?? 0}
        totalPence={inv.total ?? 0}
        paidPence={paid}
        outstandingPence={outstanding}
        customerNotes={inv.customer_notes}
        defaultPaymentFooter={inv.default_payment_footer}
        internalNotes={inv.internal_notes}
      />

      <div className="space-y-8 print:hidden">
        <Card className="p-4">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Operations</div>
          <StatusBadgeGroup className="mt-3 w-full max-w-xl">
            <StatusBadge kind="invoice" status={st} />
            <StatusBadge kind="payment" status={inv.payment_status ?? ""} />
            {inv.overdue ? <Badge variant="destructive">Overdue</Badge> : null}
          </StatusBadgeGroup>
          {(inv.status_timeline ?? []).length > 0 ? (
            <div className="mt-4 border-t pt-4">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Status history</div>
              <ol className="mt-2 space-y-2 text-sm">
                {(inv.status_timeline ?? []).map((row) => (
                  <li key={row.id} className="flex flex-wrap gap-x-2 gap-y-0.5">
                    <span className="text-muted-foreground tabular-nums">
                      {row.at ? new Date(row.at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }) : "—"}
                    </span>
                    <span className="font-medium">{row.label ?? row.action}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
          {inv.order?.id ? (
            <p className="mt-4 text-sm">
              <span className="text-muted-foreground">Linked order </span>
              <Link className="font-semibold text-primary underline" href={`/admin/orders/${inv.order.id}`}>
                {inv.order.reference ?? inv.order.display_reference ?? "Open order"}
              </Link>
              {inv.order.booking?.reference ? (
                <span className="text-muted-foreground"> · Booking {inv.order.booking.reference}</span>
              ) : null}
            </p>
          ) : null}
          {inv.is_subscription_billing ? (
            <p className="mt-3 text-sm text-muted-foreground">{inv.subscription_summary}</p>
          ) : null}
          {inv.source_type === "company_subscription" && (inv.billing_period_start || inv.billing_period_end) ? (
            <p className="mt-3 text-sm">
              <span className="text-muted-foreground">Billing period </span>
              <span className="font-medium tabular-nums">
                {inv.billing_period_start ?? "—"} → {inv.billing_period_end ?? "—"}
              </span>
            </p>
          ) : null}
        </Card>

        <Separator />

        <div className="text-base font-semibold">Payment history</div>
      <ul className="mt-3 space-y-2">
        {(inv.payments ?? []).length === 0 ? (
          <li className="text-sm text-muted-foreground">No payments recorded.</li>
        ) : (
          (inv.payments ?? []).map((p) => (
            <li key={p.id} className="rounded-lg border bg-card px-4 py-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-lg font-semibold tabular-nums">{p.formatted_amount ?? formatGBP(p.amount)}</span>
                <span className="text-xs capitalize text-muted-foreground">
                  {(p.method ?? "").replace(/_/g, " ")} · {(p.status ?? "").replace(/_/g, " ")}
                </span>
              </div>
              {p.paid_at ? <div className="text-xs text-muted-foreground">{new Date(p.paid_at).toLocaleString("en-GB")}</div> : null}
              {p.reference ? <div className="mt-1 font-mono text-xs">{p.reference}</div> : null}
              {p.notes?.trim() ? (
                <div className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{p.notes}</div>
              ) : null}
              {p.recorded_by?.name ? (
                <div className="mt-1 text-xs text-muted-foreground">Recorded by {p.recorded_by.name}</div>
              ) : null}
            </li>
          ))
        )}
      </ul>

        <Separator />

        <div className="text-base font-semibold">Activity &amp; audit</div>
        <div className="mt-2">
          <AuditTimeline items={(inv.audit_timeline ?? []) as AuditTimelineRow[]} showPayload />
        </div>

        <Separator />

        <NotificationHistoryPlaceholder scopeLabel="this invoice" />
      </div>

      <AlertDialog open={markPaidOpen} onOpenChange={setMarkPaidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this invoice paid?</AlertDialogTitle>
            <AlertDialogDescription>
              Posts any remaining balance as a manual settlement line, then closes the invoice. Use when funds already
              cleared outside automated card capture.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <Button type="button" size="lg" disabled={markPaidMut.isPending} onClick={() => markPaidMut.mutate()}>
              {markPaidMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Confirm
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={voidOpen} onOpenChange={setVoidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              The document is retained but marked void. Paid invoices cannot be voided from the API.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="void-reason">Reason (optional)</Label>
            <Textarea
              id="void-reason"
              rows={3}
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="e.g. Issued in error — replaced by INV-…"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <Button type="button" variant="destructive" size="lg" disabled={voidMut.isPending} onClick={() => voidMut.mutate()}>
              {voidMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Confirm void
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reopenOpen} onOpenChange={setReopenOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reopen this invoice as draft?</AlertDialogTitle>
            <AlertDialogDescription>
              Only available when no payments are recorded. The invoice returns to draft so you can edit lines and dates again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <Button type="button" size="lg" disabled={reopenDraftMut.isPending} onClick={() => reopenDraftMut.mutate()}>
              {reopenDraftMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Reopen draft
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
