"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import {
  DashboardResponseSchema,
} from "@/lib/api/account-schema";
import { useAccountApi } from "@/lib/api/use-account-api";
import { formatGbpFromPence } from "@/lib/format/money";

import { StatCard } from "@/components/cards/StatCard";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  CalendarClock,
  ClipboardList,
  Hammer,
  Package,
  Receipt,
  WalletCards,
  Utensils,
} from "lucide-react";

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

  if (dashQuery.status === "pending") {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      </div>
    );
  }

  if (dashQuery.isError || !dashQuery.data) {
    return (
      <div className="space-y-8">
        <Breadcrumbs homeHref="/account/dashboard" items={[{ label: "Dashboard" }]} />
        <PageHeader title="Dashboard" description="We could not load your venue pulse." />
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

  return (
    <div className="space-y-8">
      <Breadcrumbs homeHref="/account/dashboard" items={[{ label: "Dashboard" }]} />
      <PageHeader
        title="Venue pulse"
        description={`Numbers are calculated on WeSharp servers for ${d.company.name}.`}
        actions={
          <>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/account/bookings/new">Book a collection</Link>
            </Button>
            <Button type="button" variant="secondary" size="sm" asChild>
              <a href="mailto:support@wesharp.invalid">Contact ops</a>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Next booking"
          value={
            nb
              ? nb.scheduled_date
                ? `${nb.scheduled_date}${nb.route_name ? ` · ${nb.route_name}` : ""}`
                : "Scheduled soon"
              : "Nothing planned"
          }
          hint={
            nb
              ? nb.status?.replace(/_/g, " ") ?? "Status tracking"
              : "Request pickup when you’re ready."
          }
          icon={CalendarClock}
        />
        <StatCard
          title="Last completed order"
          value={
            d.last_order?.updated_at ? formatGbpFromPence(d.last_order.total_pence) : "—"
          }
          hint={
            d.last_order?.scheduled_date
              ? `Booking day ${d.last_order.scheduled_date}`
              : d.last_order
                ? `Updated ${new Date(d.last_order.updated_at ?? "").toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}`
                : "No completed orders yet."
          }
          icon={Package}
        />
        <StatCard
          title="Spend this calendar month"
          value={formatGbpFromPence(d.kpis.monthly_spend_pence)}
          hint="Sum of completed fulfilment totals posted this UTC month."
          icon={Hammer}
        />
        <StatCard
          title="Outstanding invoices"
          value={formatGbpFromPence(d.kpis.outstanding_balance_pence)}
          hint="Unpaid totals minus receipts we have recorded."
          icon={WalletCards}
        />
        <StatCard
          title="Knives returned"
          value={String(d.kpis.total_knives_sharpened)}
          hint="Lifetime tally through sharpening and return."
          icon={Utensils}
        />
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="text-sm font-semibold">Operational snapshot</div>
        <dl className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <div>
            <dt className="font-medium text-foreground">Next window</dt>
            <dd>
              {nb
                ? [nb.scheduled_date, nb.time_window_start, nb.time_window_end].filter(Boolean).join(" · ") ||
                  "Booking reference created — timings follow shortly."
                : "Nothing upcoming — tap “Book a collection” whenever you’re ready."}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">City</dt>
            <dd>{d.company.city ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Quick links</dt>
            <dd className="flex flex-wrap gap-2 pt-1">
              <Link className="text-primary underline" href="/account/orders">
                Orders <ClipboardList className="inline h-3 w-3" aria-hidden />
              </Link>
              <Link className="text-primary underline" href="/account/invoices">
                Invoices <Receipt className="inline h-3 w-3" aria-hidden />
              </Link>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
