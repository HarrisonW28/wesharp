"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Mail, RefreshCw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

import type { CompanyDetail } from "@/lib/api/admin-crm-schema";
import {
  BookingPreviewSchema,
  CompanyActivityResponseSchema,
  CompanyDetailResponseSchema,
  CompanySummarySchema,
  InvoicePreviewSchema,
  KnifePreviewSchema,
  OrderPreviewSchema,
} from "@/lib/api/admin-crm-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { OrderFeedbackListResponseSchema } from "@/lib/api/admin-order-feedback-schema";
import { formatGBP } from "@/lib/format/money";

import { AuditTimeline, type AuditTimelineRow } from "@/components/admin/AuditTimeline";
import { LocationLookup } from "@/components/admin/lookups/AsyncEntityLookup";
import { CompanyContactsManager } from "@/components/crm/CompanyContactsManager";
import { CompanyLocationsManager } from "@/components/crm/CompanyLocationsManager";
import { CompanySubscriptionPanel } from "@/components/crm/CompanySubscriptionPanel";
import { CompanyStatusBadge } from "@/components/crm/CompanyStatusBadge";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBackendMe } from "@/hooks/use-backend-me";

type BookingRow = z.infer<typeof BookingPreviewSchema>;
type OrderRow = z.infer<typeof OrderPreviewSchema>;
type KnifeRow = z.infer<typeof KnifePreviewSchema>;
type InvoiceRow = z.infer<typeof InvoicePreviewSchema>;

const CRM_TABS = [
  "overview",
  "contacts",
  "locations",
  "users",
  "bookings",
  "orders",
  "knives",
  "invoices",
  "subscription",
  "notes",
  "activity",
] as const;

type CrmTab = (typeof CRM_TABS)[number];

const noteFormSchema = z.object({
  body: z.string().min(1, "Enter note text."),
  visibility: z.enum(["internal", "customer", "route", "finance"]),
});

const bookingFormSchema = z.object({
  company_location_id: z.string().uuid(),
  scheduled_date: z.string().min(1),
  service_type: z.enum(["collection", "onsite"]),
  internal_notes: z.string().optional(),
});

export default function AdminCrmCompanyPage() {
  const params = useParams();
  const router = useRouter();
  const companyId =
    typeof params.companyId === "string" ? params.companyId : Array.isArray(params.companyId)
      ? params.companyId[0]
      : "";
  const admin = useAdminApi();
  const qc = useQueryClient();
  const { data: me } = useBackendMe();
  const perms = useMemo(() => new Set(me?.data?.permissions ?? []), [me?.data?.permissions]);
  const canUpdate = perms.has("companies.update");
  const canCreateBooking = perms.has("bookings.create");
  const canViewOrders = perms.has("orders.view");
  const canViewInvoices = perms.has("invoices.view");
  const canViewPayments = perms.has("payments.view");
  const canManageSubs = perms.has("subscriptions.manage");
  const canViewSubs = perms.has("subscriptions.view");
  const canDeleteCompany = perms.has("companies.delete");
  const canUseRouteNoteVisibility =
    perms.has("routes.view") || perms.has("routes.manage") || perms.has("route_stops.update");
  const canUseFinanceNoteVisibility =
    perms.has("invoices.view") ||
    perms.has("reports.finance") ||
    perms.has("payments.view") ||
    perms.has("subscriptions.view") ||
    perms.has("subscriptions.manage");

  const [tab, setTab] = useState<CrmTab>("overview");
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  const invalidateCompany = async () => {
    await qc.invalidateQueries({ queryKey: ["admin-company", companyId] });
    await qc.invalidateQueries({ queryKey: ["admin-company-summary", companyId] });
    await qc.invalidateQueries({ queryKey: ["admin-company-activity", companyId] });
    await qc.invalidateQueries({ queryKey: ["admin-companies"] });
  };

  const companyQuery = useQuery({
    enabled: Boolean(companyId),
    queryKey: ["admin-company", companyId],
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/companies/${companyId}`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = CompanyDetailResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected company payload.");
      }
      return parsed.data.data;
    },
  });

  const summaryQuery = useQuery({
    enabled: Boolean(companyId),
    queryKey: ["admin-company-summary", companyId],
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/companies/${companyId}/summary`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = CompanySummarySchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected summary payload.");
      }
      return parsed.data.data;
    },
  });

  const activityQuery = useQuery({
    enabled: Boolean(companyId),
    queryKey: ["admin-company-activity", companyId],
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/companies/${companyId}/activity`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = CompanyActivityResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected activity payload.");
      }
      return parsed.data.data.items;
    },
  });

  const orderFeedbackQuery = useQuery({
    enabled: Boolean(companyId) && canViewOrders,
    queryKey: ["admin-company-order-feedback", companyId],
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/companies/${companyId}/order-feedback?per_page=15`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = OrderFeedbackListResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected order feedback payload.");
      }
      return parsed.data;
    },
  });

  const orderFeedbackReviewMutation = useMutation({
    mutationFn: async (payload: { feedbackId: string; staff_reviewed?: boolean; testimonial_marketing_approved?: boolean }) => {
      const body: Record<string, boolean> = {};
      if (payload.staff_reviewed !== undefined) {
        body.staff_reviewed = payload.staff_reviewed;
      }
      if (payload.testimonial_marketing_approved !== undefined) {
        body.testimonial_marketing_approved = payload.testimonial_marketing_approved;
      }
      const res = await admin.json<unknown>(`/api/admin/companies/${companyId}/order-feedback/${payload.feedbackId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
    },
    onSuccess: async () => {
      toast.success("Feedback updated.");
      await orderFeedbackQuery.refetch();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Update failed.");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (company_status: CompanyDetail["company_status"]) => {
      const res = await admin.json(`/api/admin/companies/${companyId}/status`, {
        method: "PUT",
        body: JSON.stringify({ company_status }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Status updated.");
      await invalidateCompany();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Status update failed.");
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/companies/${companyId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
    },
    onSuccess: async () => {
      toast.success("Account removed from the list.");
      setDeleteAccountOpen(false);
      await qc.invalidateQueries({ queryKey: ["admin-companies"] });
      router.replace("/admin/crm");
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Could not remove account.");
    },
  });

  const noteForm = useForm<z.infer<typeof noteFormSchema>>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: { body: "", visibility: "internal" },
  });

  const noteMutation = useMutation({
    mutationFn: async (payload: z.infer<typeof noteFormSchema>) => {
      const res = await admin.json(`/api/admin/companies/${companyId}/notes`, {
        method: "POST",
        body: JSON.stringify({
          body: payload.body.trim(),
          visibility: payload.visibility,
        }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Note added.");
      noteForm.reset({ body: "", visibility: "internal" });
      await invalidateCompany();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Could not save note.");
    },
  });

  const [bookingOpen, setBookingOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const bookingForm = useForm<z.infer<typeof bookingFormSchema>>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      company_location_id: "",
      scheduled_date: "",
      service_type: "collection",
      internal_notes: "",
    },
  });

  const bookingMutation = useMutation({
    mutationFn: async (payload: z.infer<typeof bookingFormSchema>) => {
      const res = await admin.json(`/api/admin/companies/${companyId}/bookings`, {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          internal_notes: payload.internal_notes || null,
        }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Booking requested.");
      bookingForm.reset();
      setBookingOpen(false);
      await invalidateCompany();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Booking failed.");
    },
  });

  const sendPortalInvite = useMutation({
    mutationFn: async (email: string) => {
      const res = await admin.json<unknown>(`/api/admin/companies/${companyId}/portal-invites`, {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Portal invitation sent.");
      setInviteEmail("");
      await invalidateCompany();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Invite failed.");
    },
  });

  const resendPortalInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const res = await admin.json<unknown>(
        `/api/admin/companies/${companyId}/portal-invites/${inviteId}/resend`,
        { method: "POST", body: JSON.stringify({}) },
      );
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Invitation resent.");
      await invalidateCompany();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Resend failed.");
    },
  });

  const c = companyQuery.data;

  const bookingCols: ColumnDef<BookingRow>[] = useMemo(
    () => [
      {
        accessorKey: "scheduled_date",
        header: "Date",
        cell: ({ row }) => (
          <Link className="font-medium text-primary hover:underline" href={`/admin/bookings/${row.original.id}`}>
            {row.original.scheduled_date ?? "—"}
          </Link>
        ),
      },
      {
        id: "site",
        header: "Site",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.site_summary ?? row.original.site_label ?? "—"}
          </span>
        ),
      },
      {
        id: "contact_col",
        header: "Contact",
        cell: ({ row }) => <span className="text-sm">{row.original.contact_display ?? "—"}</span>,
      },
      {
        accessorKey: "service_type_label",
        header: "Service",
        cell: ({ row }) => row.original.service_type_label ?? row.original.service_type ?? "—",
      },
      {
        accessorKey: "booking_status_label",
        header: "Status",
        cell: ({ row }) => row.original.booking_status_label ?? row.original.booking_status ?? "—",
      },
      { accessorKey: "internal_notes", header: "Notes", cell: ({ getValue }) => String(getValue() ?? "") || "—" },
    ],
    [],
  );

  const orderCols: ColumnDef<OrderRow>[] = useMemo(
    () => [
      {
        id: "order_ref",
        header: "Order",
        cell: ({ row }) => (
          <Link className="font-medium text-primary hover:underline" href={`/admin/orders/${row.original.id}`}>
            {row.original.order_status_label ?? row.original.order_status ?? "View"}
          </Link>
        ),
      },
      {
        accessorKey: "total_pence",
        header: "Total",
        cell: ({ row }) =>
          row.original.company_subscription_id ? (
            <Link className="font-medium text-primary hover:underline" href={`/admin/crm/${companyId}?tab=subscription`}>
              Subscription
            </Link>
          ) : (
            formatGBP(row.original.total_pence)
          ),
      },
      { accessorKey: "currency", header: "CCY" },
    ],
    [],
  );

  const knifeCols: ColumnDef<KnifeRow>[] = useMemo(
    () => [
      {
        accessorKey: "tag_id",
        header: "Tag",
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums">{row.original.tag_id ?? "—"}</span>
        ),
      },
      {
        accessorKey: "label",
        header: "Label",
        cell: ({ row }) => (
          <Link className="text-primary hover:underline" href={`/admin/knives/${row.original.id}`}>
            {row.original.label ?? "Knife"}
          </Link>
        ),
      },
      {
        accessorKey: "knife_status_label",
        header: "Status",
        cell: ({ row }) => row.original.knife_status_label ?? row.original.knife_status ?? "—",
      },
      {
        id: "order_col",
        header: "Order",
        cell: ({ row }) =>
          row.original.order_id ? (
            <Link className="text-primary hover:underline" href={`/admin/orders/${row.original.order_id}`}>
              Open
            </Link>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      { accessorKey: "position", header: "Pos." },
    ],
    [],
  );

  const invoiceCols: ColumnDef<InvoiceRow>[] = useMemo(
    () => [
      {
        accessorKey: "invoice_number",
        header: "Invoice",
        cell: ({ row }) => (
          <Link className="font-medium text-primary hover:underline" href={`/admin/invoices/${row.original.id}`}>
            {row.original.invoice_number?.trim() ? row.original.invoice_number : "View"}
          </Link>
        ),
      },
      {
        accessorKey: "total_pence",
        header: "Amount",
        cell: ({ row }) => formatGBP(row.original.total_pence),
      },
      {
        accessorKey: "invoice_status_label",
        header: "Status",
        cell: ({ row }) => row.original.invoice_status_label ?? row.original.invoice_status ?? "—",
      },
      { accessorKey: "issued_on", header: "Issued" },
    ],
    [],
  );

  if (!companyId) {
    return <div className="text-sm text-muted-foreground">Invalid company.</div>;
  }

  if (companyQuery.isLoading || summaryQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading account…
      </div>
    );
  }

  if (companyQuery.isError || !c) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {companyQuery.error instanceof Error ? companyQuery.error.message : "Unable to load company."}
      </div>
    );
  }

  const summary = summaryQuery.data;
  const ov = c.overview;

  const tabLabels: Record<CrmTab, string> = {
    overview: "Overview",
    contacts: "Contacts",
    locations: "Locations",
    users: "Users",
    bookings: "Bookings",
    orders: "Orders",
    knives: "Knives",
    invoices: "Invoices",
    subscription: "Subscription",
    notes: "Notes",
    activity: "Activity",
  };

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "CRM", href: "/admin/crm" }, { label: c.name }]} />
      <PageHeader
        title={c.name}
        description={`Slug · ${c.slug}`}
        titleRowEnd={
          <>
            <CompanyStatusBadge status={c.company_status} />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!canUpdate || statusMutation.isPending || c.company_status === "active"}
              onClick={() => statusMutation.mutate("active")}
            >
              Mark active
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!canUpdate || statusMutation.isPending || c.company_status === "at_risk"}
              onClick={() => statusMutation.mutate("at_risk")}
            >
              Mark at risk
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canUpdate || statusMutation.isPending || c.company_status === "lost"}
              onClick={() => statusMutation.mutate("lost")}
            >
              Mark lost
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                toast.message("Review request", {
                  description: "Outbound review workflows are not wired yet — this route is reserved.",
                })
              }
            >
              Request review
            </Button>
          </>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canDeleteCompany ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="gap-1.5"
                onClick={() => setDeleteAccountOpen(true)}
              >
                <Trash2 className="size-4" aria-hidden />
                Remove from CRM
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/admin/crm">Back to list</Link>
            </Button>
          </div>
        }
      />

      <AlertDialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this account from the CRM list?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  The account is archived: it no longer appears in CRM search or lists. Existing orders, invoices, payments,
                  and bookings stay linked with the same name so finance and operations history remain intact.
                </p>
                <p className="text-foreground">There is no undo from this screen.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={deleteCompanyMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteCompanyMutation.isPending}
              onClick={() => deleteCompanyMutation.mutate()}
            >
              {deleteCompanyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Removing…
                </>
              ) : (
                "Remove from CRM"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <nav className="flex flex-wrap gap-1 border-b border-border pb-2" aria-label="Account sections">
        {CRM_TABS.map((id) => (
          <button
            key={id}
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            onClick={() => setTab(id)}
          >
            {tabLabels[id]}
          </button>
        ))}
      </nav>

      <div className="space-y-6">
        {tab === "overview" ? (
          <div className="space-y-6">
            {summaryQuery.isError ? (
              <p className="text-sm text-destructive">Could not load summary KPIs.</p>
            ) : summary ? (
              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Order revenue</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold tabular-nums">
                    {formatGBP(summary.orders_total_pence)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Open pipeline bookings</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold tabular-nums">
                    {summary.bookings_pipeline_count}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Contacts / locations</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold tabular-nums">
                    {summary.contacts_count} / {summary.locations_count}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding invoices</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold tabular-nums">{summary.invoices_open_count}</div>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatGBP(summary.invoices_open_total_pence)} exposure
                    </p>
                  </CardContent>
                </Card>
                {canViewPayments ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Payment history</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p className="text-muted-foreground">Manual and recorded settlements for this account.</p>
                      <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                        <Link href={`/admin/payments?company_id=${companyId}&page=1&per_page=30`}>View payments</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ) : null}
              </section>
            ) : null}

            {canViewOrders ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Customer order feedback</CardTitle>
                  <CardDescription>Post-completion ratings and optional testimonial interest.</CardDescription>
                </CardHeader>
                <CardContent>
                  {orderFeedbackQuery.isPending ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
                    </div>
                  ) : orderFeedbackQuery.isError ? (
                    <p className="text-sm text-destructive">{(orderFeedbackQuery.error as Error).message}</p>
                  ) : (orderFeedbackQuery.data?.data.items.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground">No feedback rows for this company yet.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-md border">
                      <table className="w-full min-w-[640px] text-left text-sm">
                        <thead className="border-b bg-muted/40">
                          <tr>
                            <th className="px-3 py-2 font-medium">Order</th>
                            <th className="px-3 py-2 font-medium">Rating</th>
                            <th className="px-3 py-2 font-medium">Submitted</th>
                            <th className="px-3 py-2 font-medium">Testimonial interest</th>
                            <th className="px-3 py-2 font-medium">Reviewed</th>
                            <th className="px-3 py-2 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderFeedbackQuery.data?.data.items.map((row) => (
                            <tr key={row.id} className="border-b last:border-0">
                              <td className="px-3 py-2 align-top">
                                {row.order_reference ? (
                                  <Link
                                    href={`/admin/orders/${row.order_id}`}
                                    className="font-mono text-xs hover:underline"
                                  >
                                    {row.order_reference}
                                  </Link>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2 align-top">{row.rating ?? "—"}</td>
                              <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                                {row.submitted_at?.replace("T", " ").slice(0, 16) ?? "—"}
                              </td>
                              <td className="px-3 py-2 align-top">{row.testimonial_interested ? "Yes" : "—"}</td>
                              <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                                {row.staff_reviewed_at ? "Yes" : "—"}
                              </td>
                              <td className="px-3 py-2 align-top">
                                <div className="flex flex-wrap gap-2">
                                  {row.submitted_at && !row.staff_reviewed_at ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      disabled={orderFeedbackReviewMutation.isPending}
                                      onClick={() =>
                                        void orderFeedbackReviewMutation.mutateAsync({
                                          feedbackId: row.id,
                                          staff_reviewed: true,
                                        })
                                      }
                                    >
                                      Mark reviewed
                                    </Button>
                                  ) : null}
                                  {row.testimonial_interested && !row.testimonial_marketing_approved_at ? (
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      disabled={orderFeedbackReviewMutation.isPending}
                                      onClick={() =>
                                        void orderFeedbackReviewMutation.mutateAsync({
                                          feedbackId: row.id,
                                          testimonial_marketing_approved: true,
                                        })
                                      }
                                    >
                                      Approve marketing
                                    </Button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}

            <section className="grid gap-3 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Account details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Phone · </span>
                    {c.phone ?? "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Billing email · </span>
                    {c.billing_email ?? "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">City · </span>
                    {c.city ?? "—"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Default location</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {ov.default_location ? (
                    <div>
                      <p className="font-medium">{ov.default_location.label}</p>
                      <p className="text-muted-foreground">{ov.default_location.summary ?? "—"}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No locations on file.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Primary billing contact</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {ov.primary_contact ? (
                    <div>
                      <p className="font-medium">
                        {ov.primary_contact.name}
                        {ov.primary_contact.billing_contact ? (
                          <span className="ml-1 text-xs font-normal text-muted-foreground">(primary billing)</span>
                        ) : null}
                      </p>
                      <p className="text-muted-foreground">{ov.primary_contact.email ?? "—"}</p>
                      <p className="text-muted-foreground">{ov.primary_contact.phone ?? "—"}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No contacts on file.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Latest booking</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {ov.latest_booking ? (
                    <div className="space-y-1">
                      <Link className="font-medium text-primary hover:underline" href={`/admin/bookings/${ov.latest_booking.id}`}>
                        {ov.latest_booking.scheduled_date ?? "Open booking"}
                      </Link>
                      <p className="text-muted-foreground">
                        {ov.latest_booking.booking_status_label ?? ov.latest_booking.booking_status ?? "—"}
                        {ov.latest_booking.service_type_label ? ` · ${ov.latest_booking.service_type_label}` : null}
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No bookings yet.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active order</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {ov.active_order ? (
                    <div className="space-y-1">
                      <Link className="font-medium text-primary hover:underline" href={`/admin/orders/${ov.active_order.id}`}>
                        {ov.active_order.order_status_label ?? ov.active_order.order_status ?? "View order"}
                      </Link>
                      <p className="tabular-nums text-muted-foreground">{formatGBP(ov.active_order.total_pence)}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No draft or active order.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Unpaid balance</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold tabular-nums">{formatGBP(ov.unpaid_balance_pence)}</CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Subscription</CardTitle>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setTab("subscription")}>
                    Panel
                  </Button>
                </CardHeader>
                <CardContent className="text-sm">
                  {ov.subscription ? (
                    <div>
                      <p className="font-medium">{ov.subscription.plan_name}</p>
                      <p className="text-muted-foreground">
                        {ov.subscription.status_label}
                        {ov.subscription.current_period_end ? ` · renews ${ov.subscription.current_period_end}` : null}
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No active subscription on file.</p>
                  )}
                </CardContent>
              </Card>
            </section>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base">Recent activity</CardTitle>
                <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setTab("activity")}>
                  View all
                </Button>
              </CardHeader>
              <CardContent>
                {ov.recent_activity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent audit or note entries.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {ov.recent_activity.map((row) => (
                      <li key={`${row.type}-${row.id}`} className="rounded-md border px-3 py-2">
                        <span className="text-xs text-muted-foreground">{row.at ?? ""}</span>{" "}
                        <span className="font-medium">{row.summary ?? row.action ?? row.type}</span>
                        {row.type === "note" && row.visibility_label ? (
                          <span className="ml-2 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            {row.visibility_label}
                          </span>
                        ) : null}
                        <span className="text-muted-foreground"> · {row.actor_name ?? "—"}</span>
                        {row.type === "note" && row.body_preview ? (
                          <p className="mt-1 text-muted-foreground">{row.body_preview}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {tab === "contacts" ? (
          <CompanyContactsManager
            companyId={companyId}
            contacts={c.contacts}
            canManage={canUpdate}
            onInvalidate={invalidateCompany}
          />
        ) : null}

        {tab === "locations" ? (
          <CompanyLocationsManager
            companyId={companyId}
            locations={c.locations}
            canManage={canUpdate}
            onInvalidate={invalidateCompany}
          />
        ) : null}

        {tab === "users" ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Portal users</CardTitle>
              </CardHeader>
              <CardContent>
                {c.users.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No users linked to this company.</p>
                ) : (
                  <ul className="space-y-3 text-sm">
                    {c.users.map((u) => (
                      <li key={u.id} className="rounded-lg border px-3 py-2">
                        <div className="font-medium">{u.name}</div>
                        <div className="text-muted-foreground">{u.email}</div>
                        <div className="text-xs text-muted-foreground">
                          {u.role_label}
                          {u.status_label ? ` · ${u.status_label}` : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {canUpdate ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Portal invitations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Sends a Clerk invitation when API keys are configured. Customers who sign in with the invited email
                    are linked to this account automatically (customer roles only).
                  </p>
                  <form
                    className="flex flex-col gap-2 sm:flex-row sm:items-end"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const t = inviteEmail.trim();
                      if (t === "" || sendPortalInvite.isPending) return;
                      sendPortalInvite.mutate(t);
                    }}
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Label htmlFor="portal-invite-email">Email</Label>
                      <Input
                        id="portal-invite-email"
                        type="email"
                        autoComplete="off"
                        placeholder="name@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        disabled={sendPortalInvite.isPending}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={sendPortalInvite.isPending || inviteEmail.trim() === "" || !admin.origin}
                      className="sm:shrink-0"
                    >
                      <Mail className="mr-2 h-4 w-4" aria-hidden />
                      Send invite
                    </Button>
                  </form>

                  {c.portal_invites.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No invitations recorded yet.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {c.portal_invites.map((inv) => (
                        <li key={inv.id} className="flex flex-col gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="font-medium">{inv.email}</div>
                            <div className="text-xs text-muted-foreground">
                              {inv.display_status}
                              {inv.last_sent_at ? ` · last sent ${new Date(inv.last_sent_at).toLocaleString()}` : null}
                              {inv.last_clerk_error ? ` · Clerk: ${inv.last_clerk_error}` : null}
                            </div>
                          </div>
                          {inv.display_status !== "accepted" ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={resendPortalInvite.isPending}
                              className="shrink-0"
                              onClick={() => resendPortalInvite.mutate(inv.id)}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                              Resend
                            </Button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}

        {tab === "bookings" ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Bookings</h2>
              <Button
                type="button"
                size="sm"
                className="min-h-10"
                disabled={!canCreateBooking || c.locations.filter((l) => !l.is_archived).length === 0}
                onClick={() => setBookingOpen(true)}
              >
                Create booking
              </Button>
            </div>
            <DataTable columns={bookingCols} data={c.bookings} emptyLabel="No bookings." />
          </section>
        ) : null}

        {tab === "orders" ? (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Orders</h2>
            <DataTable columns={orderCols} data={c.orders} emptyLabel="No orders." />
          </section>
        ) : null}

        {tab === "knives" ? (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Knives</h2>
            <DataTable columns={knifeCols} data={c.knives} emptyLabel="No knives recorded." />
          </section>
        ) : null}

        {tab === "invoices" ? (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Invoices</h2>
            <DataTable columns={invoiceCols} data={c.invoices} emptyLabel="No invoices." />
          </section>
        ) : null}

        {tab === "subscription" ? (
          <CompanySubscriptionPanel
            companyId={companyId}
            subscription={c.subscription}
            contacts={c.contacts}
            canManageSubs={canManageSubs}
            canViewSubs={canViewSubs}
            canViewInvoices={canViewInvoices}
            onRefresh={invalidateCompany}
          />
        ) : null}

        {tab === "notes" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {canUpdate ? (
                <form
                  className="space-y-3"
                  onSubmit={noteForm.handleSubmit((v) => {
                    noteMutation.mutate({
                      body: v.body.trim(),
                      visibility: v.visibility,
                    });
                  })}
                >
                  <div className="space-y-2">
                    <Label htmlFor="crm-note-visibility">Who can see this note</Label>
                    <Select
                      value={noteForm.watch("visibility")}
                      onValueChange={(val) =>
                        noteForm.setValue("visibility", val as z.infer<typeof noteFormSchema>["visibility"], {
                          shouldValidate: true,
                        })
                      }
                    >
                      <SelectTrigger id="crm-note-visibility" className="max-w-xl">
                        <SelectValue placeholder="Visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal">Internal — staff CRM only (default)</SelectItem>
                        <SelectItem value="customer">Customer-visible — shown on portal & tracking</SelectItem>
                        {canUseRouteNoteVisibility ? (
                          <SelectItem value="route">Route / field — staff with route access</SelectItem>
                        ) : null}
                        {canUseFinanceNoteVisibility ? (
                          <SelectItem value="finance">Finance / billing — staff with finance access</SelectItem>
                        ) : null}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Customer-visible notes are intentionally shared; internal notes never leave the CRM.
                    </p>
                  </div>
                  <Textarea rows={4} placeholder="Note text…" {...noteForm.register("body")} />
                  {noteForm.formState.errors.body ? (
                    <p className="text-xs text-destructive">{noteForm.formState.errors.body.message}</p>
                  ) : null}
                  {noteForm.formState.errors.visibility ? (
                    <p className="text-xs text-destructive">{noteForm.formState.errors.visibility.message}</p>
                  ) : null}
                  <Button type="submit" size="sm" disabled={noteMutation.isPending}>
                    {noteMutation.isPending ? "Saving…" : "Add note"}
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">You do not have permission to add notes.</p>
              )}
              <Separator />
              {c.notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {c.notes.map((n) => (
                    <li key={n.id} className="rounded-lg border px-3 py-2">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          {n.created_at ?? "—"} · {n.author_name ?? "Unknown"}
                        </span>
                        {n.visibility_label ? (
                          <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                            {n.visibility_label}
                          </span>
                        ) : null}
                      </div>
                      <p className="whitespace-pre-wrap pt-1">{n.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ) : null}

        {tab === "activity" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activityQuery.isLoading ? (
                <div className="flex gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </div>
              ) : activityQuery.isError ? (
                <p className="text-sm text-destructive">Unable to load activity.</p>
              ) : activityQuery.data?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No audit or note timeline entries yet.</p>
              ) : (
                <div className="max-h-[520px] space-y-2 overflow-auto text-sm">
                  {activityQuery.data?.map((row) =>
                    row.type === "audit" ? (
                      <AuditTimeline key={`${row.type}-${row.id}`} items={[row as unknown as AuditTimelineRow]} showPayload />
                    ) : (
                      <div key={`${row.type}-${row.id}`} className="rounded-md border px-3 py-2">
                        <span className="text-xs text-muted-foreground">{row.at ?? ""}</span>{" "}
                        <span className="font-medium">Note</span>
                        {"visibility_label" in row && row.visibility_label ? (
                          <span className="ml-2 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            {String(row.visibility_label)}
                          </span>
                        ) : null}
                        <span className="text-muted-foreground"> · {(row as { actor_name?: string }).actor_name ?? "—"}</span>
                        {row.body ? <p className="mt-1 text-muted-foreground">{row.body}</p> : null}
                      </div>
                    ),
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create booking</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={bookingForm.handleSubmit((v) => bookingMutation.mutate(v))}
          >
            <div className="space-y-2">
              <LocationLookup
                label="Location"
                value={
                  bookingForm.watch("company_location_id") === ""
                    ? null
                    : bookingForm.watch("company_location_id")
                }
                onChange={(id) => bookingForm.setValue("company_location_id", id ?? "")}
                extraParams={{ company_id: companyId }}
                placeholder="Search site…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sched">Scheduled date</Label>
              <Input id="sched" type="date" {...bookingForm.register("scheduled_date")} />
            </div>
            <div className="space-y-2">
              <Label>Service</Label>
              <Select
                value={bookingForm.watch("service_type")}
                onValueChange={(v) => bookingForm.setValue("service_type", v as "collection" | "onsite")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="collection">Collection</SelectItem>
                  <SelectItem value="onsite">Onsite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Internal notes</Label>
              <Textarea rows={3} {...bookingForm.register("internal_notes")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setBookingOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={bookingMutation.isPending}>
                {bookingMutation.isPending ? "Saving…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
