"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

import type { CompanySubscriptionCrm } from "@/lib/api/admin-crm-schema";
import {
  ContactSchema,
  SubscriptionInvoiceDraftResponseSchema,
  SubscriptionHistoryRowSchema,
  SubscriptionPlansListResponseSchema,
} from "@/lib/api/admin-crm-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { formatGBP } from "@/lib/format/money";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/tables/DataTable";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { z } from "zod";

type ContactRow = z.infer<typeof ContactSchema>;
type HistoryRow = z.infer<typeof SubscriptionHistoryRowSchema>;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type Props = {
  companyId: string;
  subscription: CompanySubscriptionCrm;
  contacts: ContactRow[];
  canManageSubs: boolean;
  canViewSubs: boolean;
  canViewInvoices: boolean;
  onRefresh: () => Promise<void>;
};

export function CompanySubscriptionPanel({
  companyId,
  subscription: sub,
  contacts,
  canManageSubs,
  canViewSubs,
  canViewInvoices,
  onRefresh,
}: Props) {
  const admin = useAdminApi();
  const [assignOpen, setAssignOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);

  const [assignPlanId, setAssignPlanId] = useState("");
  const [assignStarts, setAssignStarts] = useState(isoDate(new Date()));
  const [assignRenews, setAssignRenews] = useState("");
  const [assignContactId, setAssignContactId] = useState<string>("");
  const [assignPrice, setAssignPrice] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [assignAllowInactive, setAssignAllowInactive] = useState(false);

  const [changePlanId, setChangePlanId] = useState("");
  const [changeEffective, setChangeEffective] = useState(isoDate(new Date()));
  const [changeRenews, setChangeRenews] = useState("");
  const [changeContactId, setChangeContactId] = useState<string>("");
  const [changePrice, setChangePrice] = useState("");
  const [changeNotes, setChangeNotes] = useState("");
  const [changeAllowInactive, setChangeAllowInactive] = useState(false);

  const [reactPlanId, setReactPlanId] = useState("");
  const [reactStarts, setReactStarts] = useState(isoDate(new Date()));
  const [reactRenews, setReactRenews] = useState("");
  const [reactNotes, setReactNotes] = useState("");
  const [reactAllowInactive, setReactAllowInactive] = useState(false);

  const [cancelNotes, setCancelNotes] = useState("");

  const [billingPick, setBillingPick] = useState("");

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invPeriodStart, setInvPeriodStart] = useState("");
  const [invPeriodEnd, setInvPeriodEnd] = useState("");

  const activeContacts = useMemo(
    () => contacts.filter((c) => !c.archived_at && !c.is_archived),
    [contacts],
  );

  const plansQuery = useQuery({
    enabled: canViewSubs && canManageSubs,
    queryKey: ["admin-subscription-plans"],
    queryFn: async () => {
      const res = await admin.json<unknown>("/api/admin/subscription-plans");
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = SubscriptionPlansListResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected subscription plans payload.");
      }
      return parsed.data.data.items;
    },
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        subscription_plan_id: assignPlanId,
        starts_at: assignStarts,
        notes: assignNotes.trim() || null,
        allow_inactive_plan: assignAllowInactive,
      };
      if (assignRenews.trim()) {
        body.renews_at = assignRenews.trim();
      }
      if (assignContactId) {
        body.billing_contact_id = assignContactId;
      }
      if (assignPrice.trim() !== "") {
        body.price_amount_minor_snapshot = Number.parseInt(assignPrice, 10);
      }
      const res = await admin.json(`/api/admin/companies/${companyId}/subscriptions`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Subscription assigned.");
      setAssignOpen(false);
      await onRefresh();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Assign failed.");
    },
  });

  const changeMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        subscription_plan_id: changePlanId,
        effective_starts_at: changeEffective,
        notes: changeNotes.trim() || null,
        allow_inactive_plan: changeAllowInactive,
      };
      if (changeRenews.trim()) {
        body.renews_at = changeRenews.trim();
      }
      if (changeContactId) {
        body.billing_contact_id = changeContactId;
      }
      if (changePrice.trim() !== "") {
        body.price_amount_minor_snapshot = Number.parseInt(changePrice, 10);
      }
      const res = await admin.json(`/api/admin/companies/${companyId}/subscriptions/change-plan`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Plan changed.");
      setChangeOpen(false);
      await onRefresh();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Change plan failed.");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await admin.json(`/api/admin/companies/${companyId}/subscriptions/cancel`, {
        method: "POST",
        body: JSON.stringify({
          cancellation_notes: cancelNotes.trim() || null,
        }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Subscription cancelled.");
      setCancelOpen(false);
      setCancelNotes("");
      await onRefresh();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Cancel failed.");
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        starts_at: reactStarts,
        notes: reactNotes.trim() || null,
        allow_inactive_plan: reactAllowInactive,
      };
      if (reactRenews.trim()) {
        body.renews_at = reactRenews.trim();
      }
      if (reactPlanId.trim()) {
        body.subscription_plan_id = reactPlanId.trim();
      }
      const res = await admin.json(`/api/admin/companies/${companyId}/subscriptions/reactivate`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Subscription reactivated.");
      setReactivateOpen(false);
      await onRefresh();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Reactivate failed.");
    },
  });

  const billingMutation = useMutation({
    mutationFn: async (billing_contact_id: string) => {
      if (sub.state !== "record") {
        throw new Error("No active subscription.");
      }
      const res = await admin.json(
        `/api/admin/companies/${companyId}/subscriptions/${sub.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ billing_contact_id }),
        },
      );
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Billing contact updated.");
      setBillingOpen(false);
      await onRefresh();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Update failed.");
    },
  });

  const invoiceDraftMutation = useMutation({
    mutationFn: async () => {
      if (sub.state !== "record") {
        throw new Error("No active subscription.");
      }
      if (!invPeriodStart || !invPeriodEnd) {
        throw new Error("Select a billing period start and end.");
      }

      const res = await admin.json<unknown>(
        `/api/admin/companies/${companyId}/subscriptions/${sub.id}/invoice-draft`,
        {
          method: "POST",
          body: JSON.stringify({
            billing_period_start: invPeriodStart,
            billing_period_end: invPeriodEnd,
          }),
        },
      );
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = SubscriptionInvoiceDraftResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected invoice draft response.");
      }
      return parsed.data.data;
    },
    onSuccess: async (data) => {
      const id = String((data.invoice as Record<string, unknown>)["id"] ?? "");
      toast.success(data.already_existed ? "Invoice already existed for this period." : "Invoice draft generated.");
      setInvoiceOpen(false);
      await onRefresh();
      if (id) {
        window.open(`/admin/invoices/${id}`, "_blank", "noopener,noreferrer");
      }
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Could not generate invoice.");
    },
  });

  const renewBillingPeriodMutation = useMutation({
    mutationFn: async (force: boolean) => {
      if (sub.state !== "record") {
        throw new Error("No active subscription.");
      }
      const res = await admin.json(
        `/api/admin/companies/${companyId}/subscriptions/${sub.id}/renew-billing-period`,
        {
          method: "POST",
          body: JSON.stringify({ force }),
        },
      );
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Billing period rolled forward.");
      await onRefresh();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Renewal failed.");
    },
  });

  const historyCols: ColumnDef<HistoryRow>[] = useMemo(
    () => [
      { accessorKey: "plan_name", header: "Plan" },
      { accessorKey: "status_label", header: "Status" },
      { accessorKey: "starts_at", header: "Starts" },
      { accessorKey: "renews_at", header: "Renews" },
      { accessorKey: "cancelled_at", header: "Cancelled" },
      {
        id: "price",
        header: "Snapshot",
        cell: ({ row }) =>
          row.original.formatted_price_snapshot_gbp ??
          (row.original.price_amount_minor_snapshot != null
            ? formatGBP(row.original.price_amount_minor_snapshot)
            : "—"),
      },
    ],
    [],
  );

  const history = sub.subscription_history ?? [];

  const openAssign = () => {
    setAssignPlanId("");
    setAssignStarts(isoDate(new Date()));
    setAssignRenews("");
    setAssignContactId("");
    setAssignPrice("");
    setAssignNotes("");
    setAssignAllowInactive(false);
    setAssignOpen(true);
  };

  const openChange = () => {
    if (sub.state !== "record") {
      return;
    }
    setChangePlanId("");
    setChangeEffective(isoDate(new Date()));
    setChangeRenews("");
    setChangeContactId(sub.billing_contact_id ?? "");
    setChangePrice("");
    setChangeNotes("");
    setChangeAllowInactive(false);
    setChangeOpen(true);
  };

  const openReactivate = () => {
    setReactPlanId("");
    setReactStarts(isoDate(new Date()));
    setReactRenews("");
    setReactNotes("");
    setReactAllowInactive(false);
    setReactivateOpen(true);
  };

  const openBilling = () => {
    if (sub.state !== "record") {
      return;
    }
    setBillingPick(sub.billing_contact_id ?? "");
    setBillingOpen(true);
  };

  const openInvoiceDraft = () => {
    if (sub.state !== "record") return;
    setInvPeriodStart(sub.starts_at ?? "");
    setInvPeriodEnd(sub.renews_at ?? "");
    setInvoiceOpen(true);
  };

  const planSelectItems = (includeInactive: boolean) => {
    const items = plansQuery.data ?? [];
    return includeInactive ? items : items.filter((p) => p.is_active);
  };

  const handleAction = (id: string) => {
    if (id === "assign_plan") {
      openAssign();
    } else if (id === "change_plan") {
      openChange();
    } else if (id === "cancel_subscription") {
      setCancelOpen(true);
    } else if (id === "reactivate_subscription") {
      openReactivate();
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {sub.state === "none" ? (
              <div className="space-y-3">
                <div>
                  <p className="text-base font-semibold">{sub.headline}</p>
                  <p className="mt-2 text-muted-foreground">{sub.subheadline}</p>
                </div>
                <p className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  {sub.recurring_amount_note}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-base font-semibold">{sub.plan_name}</p>
                  <p className="text-muted-foreground">
                    Status · <span className="text-foreground">{sub.status_label}</span>
                  </p>
                  {sub.starts_at ? (
                    <p className="text-muted-foreground">
                      Started · <span className="text-foreground">{sub.starts_at}</span>
                    </p>
                  ) : null}
                  {sub.current_period_end ? (
                    <p className="text-muted-foreground">
                      Renewal / period end ·{" "}
                      <span className="text-foreground">{sub.current_period_end}</span>
                    </p>
                  ) : null}
                  {sub.cancelled_at ? (
                    <p className="text-muted-foreground">
                      Cancelled · <span className="text-foreground">{sub.cancelled_at}</span>
                    </p>
                  ) : null}
                </div>
                {sub.notes ? (
                  <div className="rounded-md border bg-muted/30 px-3 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                    <p className="mt-1 whitespace-pre-wrap text-foreground">{sub.notes}</p>
                  </div>
                ) : null}
                <div className="rounded-md border bg-muted/30 px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Contract value (recurring)
                  </p>
                  <p className="mt-1 text-muted-foreground">{sub.recurring_amount_note}</p>
                  {sub.formatted_price_snapshot_gbp ? (
                    <p className="mt-1 font-medium tabular-nums">{sub.formatted_price_snapshot_gbp}</p>
                  ) : null}
                </div>
                {sub.allowance_summary ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Allowance</p>
                    <p className="whitespace-pre-wrap">{sub.allowance_summary}</p>
                  </div>
                ) : null}
                {sub.included_services ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Included services / plan notes
                    </p>
                    <p className="whitespace-pre-wrap">{sub.included_services}</p>
                  </div>
                ) : null}
                {sub.billing_visibility === "route_manager_limited" ? (
                  <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
                    {sub.billing_restricted_message ??
                      "Billing details are limited for route managers."}
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-md border px-3 py-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Billing contact
                      </p>
                      {sub.billing_contact ? (
                        <div className="mt-2 space-y-1">
                          {sub.billing_contact.name ? (
                            <p className="font-medium">{sub.billing_contact.name}</p>
                          ) : null}
                          {sub.billing_contact.email ? (
                            <p className="text-muted-foreground">{sub.billing_contact.email}</p>
                          ) : null}
                          {sub.billing_contact.phone ? (
                            <p className="text-muted-foreground">{sub.billing_contact.phone}</p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-2 text-muted-foreground">No billing contact on file.</p>
                      )}
                      {canManageSubs && sub.state === "record" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={openBilling}
                        >
                          Update billing contact
                        </Button>
                      ) : null}
                    </div>
                    <div className="rounded-md border px-3 py-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Latest subscription invoice
                      </p>
                      {sub.latest_subscription_invoice ? (
                        <div className="mt-2 space-y-1">
                          {canViewInvoices ? (
                            <Link
                              className="font-medium text-primary hover:underline"
                              href={`/admin/invoices/${sub.latest_subscription_invoice.id}`}
                            >
                              {sub.latest_subscription_invoice.invoice_number ?? "View invoice"}
                            </Link>
                          ) : (
                            <p className="font-medium">
                              {sub.latest_subscription_invoice.invoice_number ?? "Invoice"}
                            </p>
                          )}
                          <p className="text-muted-foreground">
                            {sub.latest_subscription_invoice.invoice_status_label ??
                              sub.latest_subscription_invoice.invoice_status ??
                              "—"}
                            {sub.latest_subscription_invoice.issued_on
                              ? ` · ${sub.latest_subscription_invoice.issued_on}`
                              : null}
                          </p>
                          {canViewInvoices ? (
                            <p className="tabular-nums text-muted-foreground">
                              {sub.latest_subscription_invoice.formatted_total}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Amount hidden — add <span className="font-mono">invoices.view</span> to see totals here.
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="mt-2 text-muted-foreground">No subscription-flagged invoice yet.</p>
                      )}
                    </div>
                    {typeof sub.outstanding_subscription_invoices_pence === "number" ? (
                      <div className="rounded-md border px-3 py-2 sm:col-span-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Outstanding on subscription invoices
                        </p>
                        <p className="mt-2 text-base font-semibold tabular-nums">
                          {canViewInvoices
                            ? (sub.formatted_outstanding_subscription ?? "—")
                            : "—"}
                        </p>
                        {!canViewInvoices ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Requires invoice permission to display balance.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Actions</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {canManageSubs && sub.state === "record" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={renewBillingPeriodMutation.isPending}
                    onClick={() => renewBillingPeriodMutation.mutate(false)}
                  >
                    Roll billing period
                  </Button>
                ) : null}
                {canManageSubs && sub.state === "record" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    disabled={renewBillingPeriodMutation.isPending}
                    title="Use when finance needs to advance the period before the renewal date"
                    onClick={() => renewBillingPeriodMutation.mutate(true)}
                  >
                    Roll period (force)
                  </Button>
                ) : null}
                {canViewInvoices && sub.state === "record" ? (
                  <Button type="button" size="sm" variant="outline" onClick={openInvoiceDraft}>
                    Generate subscription invoice draft
                  </Button>
                ) : null}
                {sub.crm_actions.map((action) =>
                  action.id === "view_subscription_invoices" ? (
                    <Button key={action.id} type="button" size="sm" variant="outline" asChild>
                      <Link href={`/admin/audit?company_id=${companyId}`}>Subscription audit trail</Link>
                    </Button>
                  ) : (
                    <Button
                      key={action.id}
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!action.available}
                      title={action.hint || undefined}
                      onClick={() => {
                        if (action.available) {
                          handleAction(action.id);
                        }
                      }}
                    >
                      {action.label}
                    </Button>
                  ),
                )}
              </div>
              {plansQuery.isError ? (
                <p className="mt-2 text-xs text-destructive">
                  {plansQuery.error instanceof Error ? plansQuery.error.message : "Could not load plans."}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Billing audit trail</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Subscription lifecycle events are written to the audit log. View filtered history for this company in the{" "}
              <Link
                className="font-medium text-primary underline underline-offset-2"
                href={`/admin/audit?company_id=${companyId}`}
              >
                global audit log
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>

      {canViewSubs && sub.state === "record" && Array.isArray(sub.billing_periods) && sub.billing_periods.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Billing period ledger</h2>
          <p className="text-sm text-muted-foreground">
            Usage totals are based on completed orders in each window. Current period rows are open; older rows are closed after a
            renewal.
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[640px] text-sm" summary="Billing periods">
              <thead className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Period</th>
                  <th className="px-3 py-2">State</th>
                  <th className="px-3 py-2 text-right">Collections</th>
                  <th className="px-3 py-2 text-right">Knives</th>
                  <th className="px-3 py-2 text-right">Overage (est.)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sub.billing_periods.map((row: Record<string, unknown>, i: number) => {
                  const usage = row.usage as Record<string, unknown> | undefined;
                  const ov = usage?.estimated_overage_pence;
                  const ovNum = typeof ov === "number" ? ov : 0;
                  return (
                    <tr key={String(row.period_id ?? i)}>
                      <td className="px-3 py-2 tabular-nums">
                        {String(row.starts_on ?? "")} – {String(row.ends_on ?? "")}
                      </td>
                      <td className="px-3 py-2">{row.is_closed ? "Closed" : "Open"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{String(usage?.collections_used ?? "0")}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{String(usage?.knives_used ?? "0")}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatGBP(ovNum)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {canViewSubs && history.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Subscription history</h2>
          <DataTable columns={historyCols} data={history} emptyLabel="No history." />
        </section>
      ) : null}

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Plan</Label>
              <Select value={assignPlanId || undefined} onValueChange={setAssignPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {planSelectItems(assignAllowInactive).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {!p.is_active ? " (inactive)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="assign-starts">Start date</Label>
              <Input
                id="assign-starts"
                type="date"
                value={assignStarts}
                onChange={(e) => setAssignStarts(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="assign-renews">Renewal date (optional)</Label>
              <Input
                id="assign-renews"
                type="date"
                value={assignRenews}
                onChange={(e) => setAssignRenews(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Billing contact</Label>
              <Select
                value={assignContactId || "__none__"}
                onValueChange={(v) => setAssignContactId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {activeContacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {[c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || c.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="assign-price">Price snapshot (minor units, optional)</Label>
              <Input
                id="assign-price"
                inputMode="numeric"
                placeholder="e.g. 9900"
                value={assignPrice}
                onChange={(e) => setAssignPrice(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="assign-notes">Notes</Label>
              <Textarea id="assign-notes" value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={assignAllowInactive}
                onChange={(e) => setAssignAllowInactive(e.target.checked)}
                className="rounded border"
              />
              Allow inactive / archived catalogue plans
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!assignPlanId || assignMutation.isPending}
              onClick={() => assignMutation.mutate()}
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={changeOpen} onOpenChange={setChangeOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>New plan</Label>
              <Select value={changePlanId || undefined} onValueChange={setChangePlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {planSelectItems(changeAllowInactive).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {!p.is_active ? " (inactive)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="change-effective">Effective start</Label>
              <Input
                id="change-effective"
                type="date"
                value={changeEffective}
                onChange={(e) => setChangeEffective(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="change-renews">Next renewal (optional)</Label>
              <Input
                id="change-renews"
                type="date"
                value={changeRenews}
                onChange={(e) => setChangeRenews(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Billing contact</Label>
              <Select
                value={changeContactId || "__none__"}
                onValueChange={(v) => setChangeContactId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Keep / optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Keep existing</SelectItem>
                  {activeContacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {[c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || c.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="change-price">Price snapshot (minor units, optional)</Label>
              <Input
                id="change-price"
                inputMode="numeric"
                value={changePrice}
                onChange={(e) => setChangePrice(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="change-notes">Notes</Label>
              <Textarea id="change-notes" value={changeNotes} onChange={(e) => setChangeNotes(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={changeAllowInactive}
                onChange={(e) => setChangeAllowInactive(e.target.checked)}
                className="rounded border"
              />
              Allow inactive / archived catalogue plans
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setChangeOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!changePlanId || changeMutation.isPending}
              onClick={() => changeMutation.mutate()}
            >
              Change plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reactivateOpen} onOpenChange={setReactivateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reactivate subscription</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Creates a new active subscription row. Leave plan empty to reuse the most recent subscription&apos;s plan.
          </p>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Plan (optional)</Label>
              <Select
                value={reactPlanId || "__prior__"}
                onValueChange={(v) => setReactPlanId(v === "__prior__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Prior plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__prior__">Use prior plan</SelectItem>
                  {planSelectItems(reactAllowInactive).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {!p.is_active ? " (inactive)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="react-starts">Start date</Label>
              <Input
                id="react-starts"
                type="date"
                value={reactStarts}
                onChange={(e) => setReactStarts(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="react-renews">Renewal (optional)</Label>
              <Input
                id="react-renews"
                type="date"
                value={reactRenews}
                onChange={(e) => setReactRenews(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="react-notes">Notes</Label>
              <Textarea id="react-notes" value={reactNotes} onChange={(e) => setReactNotes(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={reactAllowInactive}
                onChange={(e) => setReactAllowInactive(e.target.checked)}
                className="rounded border"
              />
              Allow inactive / archived catalogue plans
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReactivateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={reactivateMutation.isPending} onClick={() => reactivateMutation.mutate()}>
              Reactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              This sets the active subscription to cancelled and preserves history. You can reactivate later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1">
            <Label htmlFor="cancel-notes">Notes (optional)</Label>
            <Textarea
              id="cancel-notes"
              value={cancelNotes}
              onChange={(e) => setCancelNotes(e.target.value)}
              placeholder="Reason for cancellation"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Back</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              Cancel subscription
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={billingOpen} onOpenChange={setBillingOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Billing contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Contact</Label>
            <Select value={billingPick || "__none__"} onValueChange={setBillingPick}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {activeContacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {[c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || c.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBillingOpen(false)}>
              Close
            </Button>
            <Button
              type="button"
              disabled={billingMutation.isPending || !billingPick || billingPick === "__none__"}
              onClick={() => billingMutation.mutate(billingPick)}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Generate subscription invoice draft</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Creates a <span className="font-mono">draft</span> invoice for the selected subscription billing period. If
              one already exists, it will be returned instead.
            </p>
            <div className="space-y-1">
              <Label htmlFor="inv-start">Billing period start</Label>
              <Input
                id="inv-start"
                type="date"
                value={invPeriodStart}
                onChange={(e) => setInvPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-end">Billing period end</Label>
              <Input
                id="inv-end"
                type="date"
                value={invPeriodEnd}
                onChange={(e) => setInvPeriodEnd(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setInvoiceOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={invoiceDraftMutation.isPending || !invPeriodStart || !invPeriodEnd}
              onClick={() => invoiceDraftMutation.mutate()}
            >
              Generate draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
