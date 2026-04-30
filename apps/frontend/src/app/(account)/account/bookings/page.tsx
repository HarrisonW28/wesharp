"use client";

import { CalendarClock } from "lucide-react";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/feedback/EmptyState";

export default function AccountBookingsPage() {
  return (
    <div className="space-y-8">
      <Breadcrumbs homeHref="/account/dashboard" items={[{ label: "Bookings" }]} />
      <PageHeader title="Bookings" description="Venue pickup scheduling — TanStack Query wiring arrives with Laravel bookings API." />
      <EmptyState
        icon={CalendarClock}
        title="Coming online shortly"
        description="Mock dashboards ship first — booking CRUD hooks land once JWT-backed endpoints stabilise."
      />
    </div>
  );
}
