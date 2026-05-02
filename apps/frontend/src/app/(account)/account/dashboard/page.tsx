"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  Info,
  Loader2,
  MapPin,
  Package,
  Repeat,
  Sparkles,
  Utensils,
  WalletCards,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import {
  DashboardResponseSchema,
  LocationsResponseSchema,
  PaginatedBookingsResponseSchema,
  PaginatedTenantInvoicesSchema,
  PaginatedTenantKnivesSchema,
  PaginatedTenantOrdersSchema,
  SettingsResponseSchema,
} from "@/lib/api/account-schema";
import { useAccountApi } from "@/lib/api/use-account-api";
import { customerKnifeListLabel } from "@/lib/helpers/customer-display";
import { formatGBP } from "@/lib/format/money";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerInvoiceStatusBadge } from "@/components/invoices/CustomerInvoiceStatusBadge";
import { CustomerOrderStatusBadge } from "@/components/orders/CustomerOrderStatusBadge";
import { StatusBadge } from "@/components/status/StatusBadge";

function isActiveOrderStatus(status: string | null | undefined): boolean {
  const s = (status ?? "").toLowerCase();
  if (s === "") {
    return false;
  }
  /** Closed-out orders — hide from the “active” strip (history still in full list). */
  return s !== "completed" && s !== "returned" && s !== "cancelled";
}

function isUnpaidInvoiceStatus(status: string | null | undefined): boolean {
  const s = (status ?? "").toLowerCase();
  return s !== "paid" && s !== "void" && s !== "";
}

function orderSubtitle(o: {
  display_reference?: string | null;
  formatted_amount?: string | null;
  total_pence?: number | null;
  scheduled_date?: string | null;
  updated_at?: string | null;
}): string {
  const amt = o.formatted_amount?.trim() || formatGBP(o.total_pence ?? null);
  const when = o.scheduled_date
    ? new Date(o.scheduled_date + "T12:00:00").toLocaleDateString("en-GB")
    : o.updated_at
      ? new Date(o.updated_at).toLocaleDateString("en-GB")
      : null;
  const ref = o.display_reference?.trim();
  if (ref && when) {
    return `${ref} · ${amt} · ${when}`;
  }
  return when ? `${amt} · ${when}` : amt;
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

  const settingsQuery = useQuery({
    queryKey: ["account-settings"],
    queryFn: async () => {
      const res = await api.json<unknown>("/api/account/settings");
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = SettingsResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected settings payload.");
      }
      return parsed.data.data;
    },
  });

  const locationsQuery = useQuery({
    queryKey: ["account-locations-manage"],
    queryFn: async () => {
      const res = await api.json<unknown>("/api/account/locations");
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = LocationsResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected locations payload.");
      }
      return parsed.data.data.items;
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
      const res = await api.json<unknown>("/api/account/orders?per_page=20");
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

  const knivesPreview = useQuery({
    queryKey: ["account-knives-preview"],
    queryFn: async () => {
      const res = await api.json<unknown>("/api/account/knives?per_page=5");
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = PaginatedTenantKnivesSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected knives payload.");
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
        <Skeleton className="h-24 w-full max-w-2xl rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (dashQuery.isError || !dashQuery.data) {
    const errMsg =
      dashQuery.error instanceof Error ? dashQuery.error.message : "Something went wrong on our side.";
    return (
      <div className="space-y-6">
        <Breadcrumbs homeHref="/account/dashboard" items={[{ label: "Overview" }]} />
        <PageHeader title="Overview" description="Your bookings, orders and account activity in one place." />
        <Alert variant="destructive" className="max-w-xl">
          <AlertTitle>We couldn’t load your overview</AlertTitle>
          <AlertDescription>
            {errMsg} If it keeps happening, wait a moment and try again — or contact us and we’ll help.
          </AlertDescription>
        </Alert>
        <Button type="button" variant="outline" size="sm" onClick={() => void dashQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const d = dashQuery.data;
  const nb = d.next_booking;
  const orderRows = ordersPreview.data ?? [];
  const activeOrders = orderRows.filter((o) => isActiveOrderStatus(o.status));
  const recentOrders = [...orderRows].sort((a, b) => {
    const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return tb - ta;
  });
  const unpaidInvoices = (invoicesPreview.data ?? []).filter((inv) => isUnpaidInvoiceStatus(inv.status));

  const company = settingsQuery.data?.company;
  const locationCount = locationsQuery.data?.length ?? null;
  const setupLoading = settingsQuery.isPending || locationsQuery.isPending;
  const setupError = settingsQuery.isError || locationsQuery.isError;

  const setupGaps: string[] = [];
  if (!setupLoading && !setupError && company) {
    if (!company.phone?.trim()) {
      setupGaps.push("Add a contact phone number for your business.");
    }
    if (!company.billing_email?.trim()) {
      setupGaps.push("Add a billing email for invoices.");
    }
    if (locationCount === 0) {
      setupGaps.push("Add at least one address where we collect from.");
    }
  }

  const greetingName = settingsQuery.data?.user?.name?.trim().split(/\s+/)[0] ?? null;

  return (
    <div className="space-y-8">
      <Breadcrumbs homeHref="/account/dashboard" items={[{ label: "Overview" }]} />
      <PageHeader
        title={greetingName ? `Hello, ${greetingName}` : "Welcome back"}
        description={
          <>
            <span className="font-medium text-foreground">{d.company.name}</span>
            <span className="text-muted-foreground"> — collections, orders, and invoices in one place.</span>
          </>
        }
        actions={
          <>
            <Button type="button" size="sm" className="rounded-lg" asChild>
              <Link href="/account/bookings/new">
                Book a collection
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button type="button" variant="outline" size="sm" className="rounded-lg" asChild>
              <Link href="/pricing">Pricing</Link>
            </Button>
          </>
        }
      />

      {setupLoading ? (
        <Skeleton className="h-20 w-full max-w-3xl rounded-lg" />
      ) : setupError ? null : setupGaps.length > 0 ? (
        <Alert className="max-w-3xl border-primary/25 bg-primary/5">
          <Info className="h-4 w-4" aria-hidden />
          <AlertTitle>Finish setting up your account</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
              {setupGaps.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" asChild>
                <Link href="/account/settings">Account details</Link>
              </Button>
              <Button type="button" size="sm" variant="outline" asChild>
                <Link href="/account/locations">Locations</Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-primary/20 bg-primary/5 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <CalendarClock className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <div className="font-medium">Book your next collection</div>
              <p className="text-sm text-muted-foreground">Choose a date and site — we&apos;ll confirm by email.</p>
            </div>
          </div>
          <Button type="button" size="sm" className="w-full shrink-0 rounded-lg md:w-auto" asChild>
            <Link href="/account/bookings/new">Book a collection</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-2 md:flex md:flex-wrap">
        <Button type="button" variant="secondary" size="sm" className="rounded-lg justify-center" asChild>
          <Link href="/account/bookings">My bookings</Link>
        </Button>
        <Button type="button" variant="secondary" size="sm" className="rounded-lg justify-center" asChild>
          <Link href="/account/orders">My orders</Link>
        </Button>
        <Button type="button" variant="secondary" size="sm" className="rounded-lg justify-center" asChild>
          <Link href="/account/invoices">Invoices</Link>
        </Button>
        <Button type="button" variant="outline" size="sm" className="rounded-lg justify-center" asChild>
          <Link href="/account/knives">Knives</Link>
        </Button>
        <Button type="button" variant="outline" size="sm" className="rounded-lg justify-center" asChild>
          <Link href="/account/settings">Settings</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-primary" aria-hidden />
              Next collection
            </CardTitle>
            <CardDescription>Your next scheduled pickup with us.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {nb ? (
              <div className="space-y-3">
                <div className="font-medium leading-snug">
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
                {nb.location_label ? <p className="text-muted-foreground">{nb.location_label}</p> : null}
                {nb.venue_city ? (
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                    {nb.venue_city}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button type="button" variant="secondary" size="sm" className="rounded-lg" asChild>
                    <Link href={`/account/bookings/${nb.id}`}>View booking</Link>
                  </Button>
                  <Button type="button" variant="link" className="h-auto px-0" asChild>
                    <Link href="/account/bookings">All bookings</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-6 text-center">
                <p className="text-muted-foreground">No upcoming collection yet.</p>
                <Button type="button" className="mt-4 rounded-lg" size="sm" asChild>
                  <Link href="/account/bookings/new">Book a collection</Link>
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
            <CardDescription>Orders we&apos;re still working on for you.</CardDescription>
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
                No open orders right now.
                <Button type="button" className="mt-4 rounded-lg" variant="secondary" size="sm" asChild>
                  <Link href="/account/orders">Order history</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {activeOrders.slice(0, 5).map((o) => (
                  <li
                    key={o.id}
                    className="flex flex-col gap-2 border-b border-border/60 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {o.status ? <CustomerOrderStatusBadge status={o.status} /> : null}
                        <span className="text-xs text-muted-foreground">{orderSubtitle(o)}</span>
                      </div>
                      {o.knife_count != null ? (
                        <span className="text-xs text-muted-foreground">{o.knife_count} knives</span>
                      ) : null}
                    </div>
                    <Button type="button" variant="link" className="h-auto shrink-0 self-start px-0 sm:self-center" asChild>
                      <Link href={`/account/orders/${o.id}`}>View</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {!ordersPreview.isPending && !ordersPreview.isError && activeOrders.length > 0 ? (
              <Button type="button" variant="link" className="mt-3 h-auto px-0" asChild>
                <Link href="/account/orders">All orders</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border shadow-sm sm:col-span-2 xl:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <WalletCards className="h-4 w-4 text-primary" aria-hidden />
              Unpaid invoices
            </CardTitle>
            <CardDescription>
              Outstanding balance:{" "}
              <span className="font-semibold text-foreground tabular-nums">{formatGBP(d.kpis.outstanding_balance_pence)}</span>
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
                  ? "There may be a balance updating — check the invoices list for the latest."
                  : "You are up to date — nothing unpaid showing here."}
                <Button type="button" className="mt-4 rounded-lg" variant="secondary" size="sm" asChild>
                  <Link href="/account/invoices">View invoices</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {unpaidInvoices.slice(0, 5).map((inv) => (
                  <li
                    key={inv.id}
                    className="flex flex-col gap-1 border-b border-border/60 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-medium tabular-nums">{inv.invoice_number ?? "Invoice"}</div>
                      <div className="text-xs text-muted-foreground">Due {inv.due_date ?? "—"}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tabular-nums">{formatGBP(inv.total ?? null)}</span>
                      {inv.status ? (
                        <CustomerInvoiceStatusBadge
                          status={inv.status}
                          customerLabel={inv.customer_status_label}
                          hint={inv.customer_status_hint}
                        />
                      ) : null}
                      <Button type="button" variant="link" className="h-auto px-0" asChild>
                        <Link href={`/account/invoices/${inv.id}`}>View</Link>
                      </Button>
                    </div>
                  </li>
                ))}
                <Button type="button" variant="link" className="h-auto px-0" asChild>
                  <Link href="/account/invoices">Open invoices</Link>
                </Button>
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm sm:col-span-2 xl:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-primary" aria-hidden />
              Recent bookings
            </CardTitle>
            <CardDescription>Latest collection requests.</CardDescription>
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
                <Button type="button" className="mt-4 rounded-lg" size="sm" asChild>
                  <Link href="/account/bookings/new">Book a collection</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {(bookingsPreview.data ?? []).map((b) => (
                  <li
                    key={b.id}
                    className="flex flex-col gap-2 border-b border-border/60 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{b.requested_date ?? "—"}</span>
                      <StatusBadge kind="booking" status={b.status ?? ""} />
                    </div>
                    <Button type="button" variant="link" className="h-auto self-start px-0 sm:self-center" asChild>
                      <Link href={`/account/bookings/${b.id}`}>View</Link>
                    </Button>
                  </li>
                ))}
                <Button type="button" variant="link" className="h-auto px-0" asChild>
                  <Link href="/account/bookings">All bookings</Link>
                </Button>
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm sm:col-span-2 xl:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden />
              Recent orders
            </CardTitle>
            <CardDescription>Latest activity on your orders.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {ordersPreview.status === "pending" ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading orders…
              </div>
            ) : ordersPreview.isError ? (
              <p className="text-destructive">{(ordersPreview.error as Error).message}</p>
            ) : recentOrders.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-6 text-center text-muted-foreground">
                No orders yet — they appear after we process a collection.
                <Button type="button" className="mt-4 rounded-lg" size="sm" asChild>
                  <Link href="/account/bookings/new">Book a collection</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentOrders.slice(0, 5).map((o) => (
                  <li
                    key={o.id}
                    className="flex flex-col gap-2 border-b border-border/60 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {o.status ? <CustomerOrderStatusBadge status={o.status} /> : null}
                      <span className="text-xs text-muted-foreground">{orderSubtitle(o)}</span>
                    </div>
                    <Button type="button" variant="link" className="h-auto self-start px-0 sm:self-center" asChild>
                      <Link href={`/account/orders/${o.id}`}>View</Link>
                    </Button>
                  </li>
                ))}
                <Button type="button" variant="link" className="h-auto px-0" asChild>
                  <Link href="/account/orders">All orders</Link>
                </Button>
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm sm:col-span-2 xl:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Utensils className="h-4 w-4 text-primary" aria-hidden />
              Knives on file
            </CardTitle>
            <CardDescription>Blades we currently track for your business.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {knivesPreview.status === "pending" ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading knives…
              </div>
            ) : knivesPreview.isError ? (
              <p className="text-destructive">{(knivesPreview.error as Error).message}</p>
            ) : (knivesPreview.data ?? []).length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-6 text-center text-muted-foreground">
                No knives on file yet — book a collection to register blades with us.
                <Button type="button" className="mt-4 rounded-lg" size="sm" asChild>
                  <Link href="/account/bookings/new">Book a collection</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {(knivesPreview.data ?? []).map((k, i) => (
                  <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0">
                    <Link className="font-medium text-primary underline underline-offset-2" href={`/account/knives/${k.id}`}>
                      {customerKnifeListLabel(k.tag_id, i)}
                    </Link>
                    {k.status ? <StatusBadge kind="knife" status={k.status} /> : null}
                  </li>
                ))}
                <Button type="button" variant="link" className="h-auto px-0" asChild>
                  <Link href="/account/knives">All knives</Link>
                </Button>
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm sm:col-span-2 xl:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Repeat className="h-4 w-4 text-primary" aria-hidden />
              Your plan
            </CardTitle>
            <CardDescription>Your WeSharp programme, allowance, and usage at a glance.</CardDescription>
          </CardHeader>
          <CardContent className="text-base">
            {d.subscription ? (
              <div className="space-y-3">
                <div className="text-lg font-semibold leading-snug">{d.subscription.plan_name}</div>
                {d.subscription.status_label || d.subscription.status ? (
                  <Badge variant="secondary" className="w-fit text-sm capitalize">
                    {(d.subscription.status_label ?? d.subscription.status ?? "")
                      .replace(/_/g, " ")
                      .trim() || "Active"}
                  </Badge>
                ) : null}
                {d.subscription.current_period_end ? (
                  <p className="leading-relaxed text-muted-foreground">
                    Renews on{" "}
                    {new Date(d.subscription.current_period_end + "T12:00:00").toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                ) : null}
                {d.subscription.usage_summary_line ? (
                  <p className="leading-relaxed text-foreground">{d.subscription.usage_summary_line}</p>
                ) : d.subscription.period_usage?.has_activity === false ? (
                  <p className="leading-relaxed text-muted-foreground">No completed usage recorded this period yet.</p>
                ) : null}
                {d.subscription.allowance_summary ? (
                  <p className="leading-relaxed text-muted-foreground">{d.subscription.allowance_summary}</p>
                ) : d.subscription.summary ? (
                  <p className="leading-relaxed text-muted-foreground">{d.subscription.summary}</p>
                ) : null}
                {d.subscription.overage_warning ? (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm leading-relaxed text-muted-foreground">
                    {d.subscription.overage_warning}
                  </p>
                ) : null}
                {d.subscription.recent_invoices && d.subscription.recent_invoices.length > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {d.subscription.recent_invoices.length} programme invoice
                    {d.subscription.recent_invoices.length === 1 ? "" : "s"} — open your plan page for the full list.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No programme invoices showing yet.</p>
                )}
                <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
                  <Button type="button" variant="default" size="default" className="h-11 w-full rounded-lg sm:w-auto" asChild>
                    <Link href="/account/subscription">View plan &amp; usage</Link>
                  </Button>
                  <Button type="button" variant="outline" size="default" className="h-11 w-full rounded-lg sm:w-auto" asChild>
                    <Link href="/account/invoices">View invoices</Link>
                  </Button>
                  <Button type="button" variant="link" className="h-auto px-0 text-base" asChild>
                    <Link href="/pricing">Pricing</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-8 text-center">
                <p className="text-muted-foreground">No active plan on this account yet.</p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button type="button" className="h-11 rounded-lg" variant="secondary" asChild>
                    <Link href="/pricing">View pricing</Link>
                  </Button>
                  <Button type="button" className="h-11 rounded-lg" variant="outline" asChild>
                    <Link href="/account/invoices">Invoices</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border bg-muted/20 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">At a glance</CardTitle>
          <CardDescription>Figures from your activity with us.</CardDescription>
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
            <div className="text-xs text-muted-foreground">Last completed order</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">
              {d.last_order ? formatGBP(d.last_order.total_pence) : "—"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
