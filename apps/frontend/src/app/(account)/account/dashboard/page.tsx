"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  Loader2,
  Package,
  WalletCards,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import {
  DashboardResponseSchema,
  PaginatedBookingsResponseSchema,
  PaginatedTenantInvoicesSchema,
  PaginatedTenantOrdersSchema,
} from "@/lib/api/account-schema";
import { useAccountApi } from "@/lib/api/use-account-api";
import { formatGBP } from "@/lib/format/money";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status/StatusBadge";

function isActiveOrderStatus(status: string | null | undefined): boolean {
  const s = (status ?? "").toLowerCase();
  return s !== "completed" && s !== "cancelled" && s !== "";
}

function isUnpaidInvoiceStatus(status: string | null | undefined): boolean {
  const s = (status ?? "").toLowerCase();
  return s !== "paid" && s !== "void" && s !== "";
}

export default function AccountDashboardPage() {
  const api = useAccountApi();

  const dashQuery = useQuery({
    queryKey: ["account-dashboard"],
    queryFn: async () => {
      const res = await api.json<unknown>("/api/account/dashboard");
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = DashboardResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected dashboard payload.");
      }
      return parsed.data.data.dashboard;
    },
  });

  const bookingsPreview = useQuery({
    queryKey: ["account-bookings-preview"],
    queryFn: async () => {
      const res = await api.json<unknown>("/api/account/bookings?per_page=5");
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = PaginatedBookingsResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected bookings payload.");
      }
      return parsed.data.data.items;
    },
  });

  const ordersPreview = useQuery({
    queryKey: ["account-orders-preview"],
    queryFn: async () => {
      const res = await api.json<unknown>("/api/account/orders?per_page=15");
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = PaginatedTenantOrdersSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected orders payload.");
      }
      return parsed.data.data.items;
    },
  });

  const invoicesPreview = useQuery({
    queryKey: ["account-invoices-preview"],
    queryFn: async () => {
      const res = await api.json<unknown>("/api/account/invoices?per_page=10");
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = PaginatedTenantInvoicesSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected invoices payload.");
      }
      return parsed.data.data.items;
    },
  });

  if (dashQuery.status === "pending") {
    return (
      <div className="space-y-8">
        <Breadcrumbs homeHref="/account/dashboard" items={[{ label: "Overview" }]} />
        <div className="space-y-2">
          <Skeleton className="h-10 w-64 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-9 w-36" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (dashQuery.isError || !dashQuery.data) {
    return (
      <div className="space-y-6">
        <Breadcrumbs homeHref="/account/dashboard" items={[{ label: "Overview" }]} />
        <PageHeader title="Overview" description="We could not load your dashboard just now." />
        <p className="text-sm text-destructive">
          {dashQuery.error instanceof Error ? dashQuery.error.message : "Something went wrong."}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => void dashQuery.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const d = dashQuery.data;
  const nb = d.next_booking;
  const activeOrders = (ordersPreview.data ?? []).filter((o) => isActiveOrderStatus(o.status));
  const unpaidInvoices = (invoicesPreview.data ?? []).filter((inv) => isUnpaidInvoiceStatus(inv.status));

  return (
    <div className="space-y-8">
      <Breadcrumbs homeHref="/account/dashboard" items={[{ label: "Overview" }]} />
      <PageHeader
        title={`Hello, ${d.company.name}`}
        description="Your collections, knife orders, and invoices in one clear view."
        actions={
          <>
            <Button type="button" size="sm" asChild>
              <Link href="/account/bookings/new">Book a collection</Link>
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/pricing">View pricing</Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" asChild>
          <Link href="/account/bookings">
            Check my bookings
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
        <Button type="button" variant="secondary" size="sm" asChild>
          <Link href="/account/orders">
            View my orders
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
        <Button type="button" variant="secondary" size="sm" asChild>
          <Link href="/account/invoices">
            View invoices
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/account/settings">Manage account</Link>
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/account/locations">Add or edit locations</Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-primary" aria-hidden />
              Next collection
            </CardTitle>
            <CardDescription>Your upcoming scheduled pickup with us.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {nb ? (
              <div className="space-y-2">
                <div className="font-medium">
                  {nb.scheduled_date ?? "Date to be confirmed"}
                  {nb.time_window_start || nb.time_window_end
                    ? ` · ${[nb.time_window_start, nb.time_window_end].filter(Boolean).join(" – ")}`
                    : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {nb.status ? <StatusBadge kind="booking" status={nb.status} /> : null}
                  {nb.service_type ? (
                    <span className="text-muted-foreground capitalize">{nb.service_type.replace(/_/g, " ")}</span>
                  ) : null}
                </div>
                {nb.location_label ? (
                  <p className="text-muted-foreground">{nb.location_label}</p>
                ) : null}
                <Button type="button" variant="link" className="h-auto px-0" asChild>
                  <Link href="/account/bookings">See all bookings</Link>
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-6 text-center">
                <p className="text-muted-foreground">No collection booked yet.</p>
                <Button type="button" className="mt-4" size="sm" asChild>
                  <Link href="/account/bookings/new">Request a collection</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4 text-primary" aria-hidden />
              Active orders
            </CardTitle>
            <CardDescription>Knife orders we are still working on for you.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {ordersPreview.status === "pending" ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading orders…
              </div>
            ) : ordersPreview.isError ? (
              <p className="text-destructive">{(ordersPreview.error as Error).message}</p>
            ) : activeOrders.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-6 text-center text-muted-foreground">
                No open orders — completed work shows in order history.
                <Button type="button" className="mt-4" variant="secondary" size="sm" asChild>
                  <Link href="/account/orders">View my orders</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {activeOrders.slice(0, 5).map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge kind="order" status={o.status ?? ""} />
                      <span className="tabular-nums font-medium">{formatGBP(o.total_pence ?? null)}</span>
                    </div>
                    <Link className="text-primary text-sm font-medium underline underline-offset-2" href={`/account/orders/${o.id}`}>
                      View order
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <WalletCards className="h-4 w-4 text-primary" aria-hidden />
              Unpaid invoices
            </CardTitle>
            <CardDescription>
              Balance we show as outstanding:{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {formatGBP(d.kpis.outstanding_balance_pence)}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {invoicesPreview.status === "pending" ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading invoices…
              </div>
            ) : invoicesPreview.isError ? (
              <p className="text-destructive">{(invoicesPreview.error as Error).message}</p>
            ) : unpaidInvoices.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-6 text-center text-muted-foreground">
                {d.kpis.outstanding_balance_pence > 0
                  ? "You have a balance on file — details will appear here once invoices are issued."
                  : "You are all caught up — nothing unpaid right now."}
                <Button type="button" className="mt-4" variant="secondary" size="sm" asChild>
                  <Link href="/account/invoices">View invoices</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {unpaidInvoices.slice(0, 5).map((inv) => (
                  <li
                    key={inv.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                  >
                    <div>
                      <div className="font-medium tabular-nums">{inv.invoice_number ?? "Invoice"}</div>
                      <div className="text-xs text-muted-foreground">Due {inv.due_date ?? "—"}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tabular-nums">{formatGBP(inv.total ?? null)}</span>
                      {inv.status ? <StatusBadge kind="invoice" status={inv.status} /> : null}
                    </div>
                  </li>
                ))}
                <Button type="button" variant="link" className="h-auto px-0" asChild>
                  <Link href="/account/invoices">View all invoices</Link>
                </Button>
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-primary" aria-hidden />
              Recent bookings
            </CardTitle>
            <CardDescription>Latest collection requests on your account.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {bookingsPreview.status === "pending" ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading bookings…
              </div>
            ) : bookingsPreview.isError ? (
              <p className="text-destructive">{(bookingsPreview.error as Error).message}</p>
            ) : (bookingsPreview.data ?? []).length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-6 text-center text-muted-foreground">
                No bookings yet.
                <Button type="button" className="mt-4" size="sm" asChild>
                  <Link href="/account/bookings/new">Request a collection</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {(bookingsPreview.data ?? []).map((b) => (
                  <li
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{b.requested_date ?? "—"}</span>
                      <StatusBadge kind="booking" status={b.status ?? ""} />
                    </div>
                    <Link className="text-primary text-sm font-medium underline underline-offset-2" href={`/account/bookings/${b.id}`}>
                      View booking
                    </Link>
                  </li>
                ))}
                <Button type="button" variant="link" className="h-auto px-0" asChild>
                  <Link href="/account/bookings">Check my bookings</Link>
                </Button>
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border bg-muted/20 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Summary</CardTitle>
          <CardDescription>Figures from your account activity.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <div className="text-xs text-muted-foreground">Spend this month</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{formatGBP(d.kpis.monthly_spend_pence)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Knives returned to date</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{d.kpis.total_knives_sharpened}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Last order total</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">
              {d.last_order ? formatGBP(d.last_order.total_pence) : "—"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
