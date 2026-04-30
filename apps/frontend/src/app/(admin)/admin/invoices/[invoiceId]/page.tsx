"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { InvoiceDetailResponseSchema } from "@/lib/api/admin-invoices-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { formatGbpFromPence } from "@/lib/format/money";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/status/StatusBadge";
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
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/tables/DataTable";
import type { ColumnDef } from "@tanstack/react-table";

type InvoiceLine = {
  id: string;
  description: string;
  quantity: number;
  unit_amount: number;
  line_total: number;
};

export default function AdminInvoiceDetailPage() {
  const params = useParams<{ invoiceId: string }>();
  const invoiceId = params.invoiceId;
  const admin = useAdminApi();
  const queryClient = useQueryClient();
  const [manualOpen, setManualOpen] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [amountPence, setAmountPence] = useState("");
  const [reference, setReference] = useState("");

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

  const sendMut = useMutation({
    mutationFn: async () => {
      const res = await admin.json(`/api/admin/invoices/${invoiceId}/send`, { method: "POST", body: "{}" });
      if (!res.ok) throw new Error(res.message);
      return InvoiceDetailResponseSchema.parse(res.data).data;
    },
    onSuccess: () => {
      toast.success("Send queued (placeholder).");
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
      const res = await admin.json(`/api/admin/invoices/${invoiceId}/void`, { method: "POST", body: "{}" });
      if (!res.ok) throw new Error(res.message);
      return InvoiceDetailResponseSchema.parse(res.data).data;
    },
    onSuccess: () => {
      toast.success("Invoice voided.");
      setVoidOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const manualMut = useMutation({
    mutationFn: async () => {
      const n = Number.parseInt(amountPence, 10);
      if (!Number.isFinite(n) || n < 1) throw new Error("Enter amount as whole pence (integer).");

      const res = await admin.json(`/api/admin/payments/manual`, {
        method: "POST",
        body: JSON.stringify({
          invoice_id: invoiceId,
          amount_pence: n,
          payment_method: "bank_transfer",
          reference: reference.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Manual payment recorded.");
      setManualOpen(false);
      setAmountPence("");
      setReference("");
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
          <Button className="mt-3" type="button" variant="outline" size="sm" onClick={() => void invQuery.refetch()}>
            Retry
          </Button>
        </div>
      </>
    );
  }

  const inv = invQuery.data;
  if (!inv) return null;

  const lineColumns: ColumnDef<InvoiceLine>[] = [
    { accessorKey: "description", header: "Description" },
    { accessorKey: "quantity", header: "Qty" },
    {
      accessorKey: "unit_amount",
      header: "Unit",
      cell: ({ row }) => formatGbpFromPence(row.original.unit_amount ?? 0),
    },
    {
      accessorKey: "line_total",
      header: "Line",
      cell: ({ row }) => formatGbpFromPence(row.original.line_total ?? 0),
    },
  ];

  const st = inv.status ?? "";
  const payable = !["paid", "void"].includes(st);

  return (
    <>
      <Breadcrumbs crumbs={[{ label: "Invoices", href: "/admin/invoices" }, { label: inv.invoice_number ?? invoiceId }]} />
      <PageHeader
        title={inv.invoice_number ?? "Invoice"}
        description={`${(st ?? "").replace(/_/g, " ")} · settlement ${inv.payment_status ?? "—"}${inv.overdue ? " · overdue" : ""}`}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {payable ? (
          <Button type="button" variant="secondary" disabled={sendMut.isPending || st !== "draft"} onClick={() => sendMut.mutate()}>
            {sendMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Send (placeholder)
          </Button>
        ) : null}
        {payable ? (
          <Button type="button" disabled={markPaidMut.isPending} onClick={() => setMarkPaidOpen(true)}>
            {markPaidMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Mark paid
          </Button>
        ) : null}
        {payable ? (
          <Button type="button" variant="destructive" disabled={voidMut.isPending} onClick={() => setVoidOpen(true)}>
            Void
          </Button>
        ) : null}
        {payable ? (
          <Dialog open={manualOpen} onOpenChange={setManualOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline">
                Manual bank payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record FPS / transfer</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="pence">Amount (pence)</Label>
                <Input id="pence" inputMode="numeric" value={amountPence} onChange={(e) => setAmountPence(e.target.value)} />
                <Label htmlFor="ref">Reference</Label>
                <Input id="ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" type="button" onClick={() => setManualOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" disabled={manualMut.isPending} onClick={() => manualMut.mutate()}>
                  Record
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-4">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Totals</div>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{formatGbpFromPence(inv.subtotal ?? 0)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Tax</dt>
              <dd className="tabular-nums">{formatGbpFromPence(inv.tax_total ?? 0)}</dd>
            </div>
            <div className="flex justify-between gap-4 font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatGbpFromPence(inv.total ?? 0)}</dd>
            </div>
          </dl>
          <Separator className="my-4" />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <StatusBadge kind="payment" status={inv.payment_status ?? ""} />
            {inv.overdue ? <Badge variant="destructive">Overdue</Badge> : null}
            <span className="text-muted-foreground">Due {inv.due_date ?? "—"}</span>
          </div>
          {inv.order_id ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Linked order{" "}
              <Link href={`/admin/orders/${inv.order_id}`} className="text-primary underline">
                {inv.order_id.slice(0, 8)}…
              </Link>
            </p>
          ) : null}
        </Card>
        <Card className="p-4">
          <div className="text-sm font-semibold">Payments</div>
          <ul className="mt-3 space-y-3 text-sm">
            {(inv.payments ?? []).map((p) => (
              <li key={p.id} className="rounded-md border border-border px-3 py-2">
                <div className="tabular-nums font-medium">{formatGbpFromPence(p.amount ?? 0)}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {(p.method ?? "").replace(/_/g, " ")} · {(p.status ?? "").replace(/_/g, " ")}
                </div>
                {p.reference ? <div className="font-mono text-xs">{p.reference}</div> : null}
              </li>
            ))}
          </ul>
          {(inv.payments ?? []).length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No payments yet.</p> : null}
        </Card>
      </div>

      <Separator className="my-8" />

      <div className="text-sm font-semibold">Line items</div>
      <div className="mt-4">
        <DataTable<InvoiceLine> columns={lineColumns} data={(inv.items ?? []) as InvoiceLine[]} />
      </div>

      <AlertDialog open={markPaidOpen} onOpenChange={setMarkPaidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this invoice paid?</AlertDialogTitle>
            <AlertDialogDescription>
              This posts a settlement state in SharpFlow. Use only when cash or card capture already cleared outside the
              automated PSP flow.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <Button
              type="button"
              disabled={markPaidMut.isPending}
              onClick={() => {
                markPaidMut.mutate();
              }}
            >
              {markPaidMut.isPending ? "Saving…" : "Confirm mark paid"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={voidOpen} onOpenChange={setVoidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              Voiding is irreversible in the MVP UI. Finance should ensure no payments remain attached or plan a
              compensating credit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={voidMut.isPending}
              onClick={() => {
                voidMut.mutate();
              }}
            >
              {voidMut.isPending ? "Voiding…" : "Confirm void"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
