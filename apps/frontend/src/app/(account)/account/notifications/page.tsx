"use client";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { InAppNotificationsFullList } from "@/components/notifications/InAppNotificationsFullList";

export default function AccountNotificationsPage() {
  return (
    <div className="space-y-8">
      <Breadcrumbs homeHref="/account/dashboard" items={[{ label: "Notifications" }]} />
      <PageHeader title="Notifications" description="Updates about your bookings, orders, and invoices." />
      <InAppNotificationsFullList
        variant="account"
        description="Messages from your WeSharp account team — the same alerts we email about when possible."
      />
    </div>
  );
}
