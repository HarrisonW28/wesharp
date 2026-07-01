"use client";

import { NavBreadcrumbs } from "@/components/layout/NavBreadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { InAppNotificationsFullList } from "@/components/notifications/InAppNotificationsFullList";

export default function AccountNotificationsPage() {
  return (
    <div className="space-y-8">
      <NavBreadcrumbs />
      <PageHeader title="Notifications" description="Updates about your bookings, orders, and invoices." />
      <InAppNotificationsFullList
        variant="account"
        description="Messages from your WeSharp account team — the same alerts we email about when possible."
      />
    </div>
  );
}
