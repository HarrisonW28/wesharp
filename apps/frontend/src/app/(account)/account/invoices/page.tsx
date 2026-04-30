"use client";

import { Boxes } from "lucide-react";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/feedback/EmptyState";

export default function AccountInvoicesPage() {
  return (
    <div className="space-y-8">
      <Breadcrumbs homeHref="/account/dashboard" items={[{ label: "Invoices" }]} />
      <PageHeader title="Invoices" description="Stripe-aligned invoices — portal downloads unlock once billing APIs expose signed PDF URLs." />
      <EmptyState icon={Boxes} title="No invoices surfaced yet" description="Placeholder surface until invoice Resources mirror Stripe reconciliation jobs." />
    </div>
  );
}
